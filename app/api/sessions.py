# File: app/api/sessions.py

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
import os

from app.core import security, schemas
from app.database import get_db
from app.core.models import User, Session as DBSession, Player, Video, Analysis
from app.services.video_processor import process_video_background

router = APIRouter()

@router.post("/", response_model=schemas.Session)
async def create_session(
    session: schemas.SessionCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user)
):
    """
    Create a new training session
    """
    # Verify player belongs to coach
    if current_user.role == "coach":
        player = db.query(Player).filter(
            Player.id == session.player_id,
            Player.coach_id == current_user.id
        ).first()
        if not player:
            raise HTTPException(status_code=404, detail="Player not found or not authorized")
    
    db_session = DBSession(
        session_type=session.session_type,
        player_id=session.player_id,
        coach_id=current_user.id,
        status="pending"
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    
    return db_session

@router.get("/", response_model=List[schemas.Session])
async def read_sessions(
    skip: int = 0,
    limit: int = 100,
    player_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user)
):
    """
    Retrieve sessions with optional filtering
    """
    query = db.query(DBSession)
    
    # Filter by player if specified
    if player_id:
        query = query.filter(DBSession.player_id == player_id)
    
    # Coach can only see their sessions
    if current_user.role == "coach":
        query = query.filter(DBSession.coach_id == current_user.id)
    # Player can only see their own sessions
    elif current_user.role == "player":
        query = query.filter(DBSession.player_id == current_user.id)
    
    sessions = query.offset(skip).limit(limit).all()
    return sessions

@router.get("/{session_id}", response_model=schemas.Session)
async def read_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user)
):
    """
    Get a specific session by ID
    """
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check permissions
    if current_user.role == "coach" and session.coach_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user.role == "player" and session.player_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return session

@router.post("/{session_id}/upload")
async def upload_session_video(
    session_id: int,
    video_file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user)
):
    """
    Upload video for an existing session
    """
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check permissions
    if current_user.role == "coach" and session.coach_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Save video file
    video_dir = f"data/raw_videos/session_{session_id}"
    os.makedirs(video_dir, exist_ok=True)
    video_path = os.path.join(video_dir, video_file.filename)
    
    # Check for existing file to avoid name collision or just overwrite
    # For now, let's just write
    content = await video_file.read()
    file_size_mb = len(content) / (1024 * 1024)
    
    with open(video_path, "wb") as buffer:
        buffer.write(content)
    
    # Create Video record
    db_video = Video(
        session_id=session_id,
        file_path=video_path,
        original_filename=video_file.filename,
        file_size_mb=round(file_size_mb, 2),
        status="uploaded"
    )
    db.add(db_video)
    
    # Update session status
    session.status = "uploaded"
    # For backward compatibility, update session.video_path to the latest upload
    session.video_path = video_path
    
    db.commit()
    db.refresh(db_video)
    
    return {
        "message": "Video uploaded successfully",
        "video_id": db_video.id,
        "session_id": session_id,
        "filename": db_video.original_filename,
        "status": db_video.status
    }

@router.get("/{session_id}/videos", response_model=List[schemas.Video])
async def get_session_videos(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user)
):
    """
    Get all videos for a session
    """
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check permissions
    if current_user.role == "coach" and session.coach_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user.role == "player" and session.player_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return session.videos

@router.delete("/{session_id}/videos/{video_id}")
async def delete_session_video(
    session_id: int,
    video_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user)
):
    """
    Delete a specific video from a session
    """
    video = db.query(Video).filter(Video.id == video_id, Video.session_id == session_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Check permissions
    session = video.session
    if current_user.role == "coach" and session.coach_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if analysis has been run
    analysis_exists = db.query(Analysis).filter(Analysis.video_id == video_id).first()
    if analysis_exists:
        raise HTTPException(status_code=400, detail="Cannot delete video: Analysis already exists")
    
    # Delete file from disk
    if os.path.exists(video.file_path):
        os.remove(video.file_path)
    
    # Delete record
    db.delete(video)
    db.commit()
    
    return {"message": "Video deleted successfully"}

@router.get("/{session_id}/annotated-video")
async def get_annotated_video(
    session_id: int,
    db: Session = Depends(get_db)
    # Auth intentionally removed — video files must be publicly streamable
    # because browser <video> elements cannot send Authorization headers
):
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if not session.annotated_video_path:
        raise HTTPException(status_code=404, detail="Annotated video not ready. Run analysis first.")
    
    # Normalize path separators for cross-platform compatibility
    video_path = session.annotated_video_path.replace('\\', os.sep).replace('/', os.sep)
    
    if not os.path.exists(video_path):
        raise HTTPException(
            status_code=404,
            detail=f"Annotated video file missing from disk. Re-run analysis to regenerate."
        )
    
    return FileResponse(
        path=video_path,
        media_type="video/mp4",
        headers={
            "Accept-Ranges": "bytes",
            "Cache-Control": "no-cache",
        }
    )

@router.get("/{session_id}/videos/{video_id}/stream")
async def stream_original_video(
    session_id: int,
    video_id: int,
    db: Session = Depends(get_db)
):
    from app.core.models import Video as VideoModel
    video = db.query(VideoModel).filter(
        VideoModel.id == video_id,
        VideoModel.session_id == session_id
    ).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    video_path = video.file_path.replace('\\', os.sep).replace('/', os.sep)
    
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video file missing from disk")
    
    return FileResponse(
        path=video_path,
        media_type="video/mp4",
        headers={
            "Accept-Ranges": "bytes",
            "Cache-Control": "no-cache",
        }
    )
@router.get("/{session_id}/delete-preview")
async def get_session_delete_preview(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user)
):
    """
    Get a summary of what will be deleted for a session
    """
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check permissions
    if current_user.role == "coach" and session.coach_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    from sqlalchemy import func
    from app.core.models import Feedback, Video, Analysis
    
    has_analysis = db.query(Analysis).filter(Analysis.session_id == session_id).first() is not None
    has_feedback = db.query(Feedback).filter(Feedback.session_id == session_id).first() is not None
    video_count = db.query(Video).filter(Video.session_id == session_id).count()
    total_size_mb = db.query(func.sum(Video.file_size_mb)).filter(Video.session_id == session_id).scalar() or 0.0
    
    # Check for active celery tasks
    is_currently_processing = session.status in ["processing", "analyzing"]
    
    return {
        "session_id": session_id,
        "has_analysis": has_analysis,
        "has_feedback": has_feedback,
        "video_count": video_count,
        "total_size_mb": round(float(total_size_mb), 2),
        "is_currently_processing": is_currently_processing
    }

@router.delete("/{session_id}")
async def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user)
):
    """
    Delete a session and all its associated data (files, records, tasks)
    """
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check permissions
    if current_user.role == "coach" and session.coach_id != current_user.id:
        raise HTTPException(status_code=403, detail="You are not authorized to delete this session.")
    
    import redis
    import json
    from app.workers.tasks import celery_app
    from app.core.models import Video, Analysis, Feedback, Delivery, BallTrackingAnalysis
    
    try:
        # 1. Cancel any running Celery tasks
        r = redis.Redis.from_url(os.getenv('REDIS_URL', 'redis://localhost:6379/0'))
        task_keys = r.keys("task_progress:*")
        for key in task_keys:
            data = r.get(key)
            if data:
                try:
                    progress = json.loads(data)
                    # Check if this task is for our session
                    # We need to find the task_id from the key: task_progress:TASK_ID
                    task_id = key.decode('utf-8').split(':')[-1]
                    
                    # We might not have session_id in all progress objects, 
                    # but if we do, check it. Or if it has video_id, check if video belongs to session.
                    is_match = False
                    if progress.get("session_id") == session_id:
                        is_match = True
                    elif progress.get("video_id"):
                        video = db.query(Video).filter(Video.id == progress.get("video_id"), Video.session_id == session_id).first()
                        if video:
                            is_match = True
                    
                    if is_match and progress.get("status") == "processing":
                        celery_app.control.revoke(task_id, terminate=True)
                        r.delete(key)
                except:
                    continue

        # 2. Delete video files from disk
        videos = db.query(Video).filter(Video.session_id == session_id).all()
        for video in videos:
            try:
                if os.path.exists(video.file_path):
                    os.remove(video.file_path)
            except Exception as e:
                print(f"Warning: Failed to delete file {video.file_path}: {e}")

        # Delete session.video_path if it exists and is different from video records
        if session.video_path and os.path.exists(session.video_path):
            try:
                os.remove(session.video_path)
            except: pass

        # 3. Delete annotated/processed video files
        annotated_path = f"data/processed/annotated_{session_id}.mp4"
        if os.path.exists(annotated_path):
            try:
                os.remove(annotated_path)
            except: pass
            
        if session.annotated_video_path and os.path.exists(session.annotated_video_path):
            try:
                os.remove(session.annotated_video_path)
            except: pass

        # 4. Delete thumbnail files
        if session.thumbnail_path and os.path.exists(session.thumbnail_path):
            try:
                os.remove(session.thumbnail_path)
            except: pass
            
        # Also check data/thumbnails/ for any other related thumbs
        thumbnail_dir = "data/thumbnails"
        if os.path.exists(thumbnail_dir):
            for f in os.listdir(thumbnail_dir):
                if f.startswith(f"thumb_session_{session_id}"):
                    try:
                        os.remove(os.path.join(thumbnail_dir, f))
                    except: pass

        # 5. Delete DB records in order (to respect foreign key constraints)
        # Order: Metrics -> Deliveries -> Shots -> Feedback -> PoseData -> Videos -> Session
        
        # metrics (using raw SQL in case table exists but no model)
        from sqlalchemy import text
        try:
            db.execute(text("DELETE FROM metrics WHERE delivery_id IN (SELECT id FROM deliveries WHERE session_id = :sid)"), {"sid": session_id})
            db.execute(text("DELETE FROM metrics WHERE shot_id IN (SELECT id FROM shots WHERE session_id = :sid)"), {"sid": session_id})
        except: pass

        # bowling_deliveries
        db.query(Delivery).filter(Delivery.session_id == session_id).delete()
        
        # shots
        try:
            db.execute(text("DELETE FROM shots WHERE session_id = :sid"), {"sid": session_id})
        except: pass
        
        # feedback
        db.query(Feedback).filter(Feedback.session_id == session_id).delete()
        
        # pose_data (often a column in Analysis, but checking if table exists)
        try:
            # If it's a separate table as hinted by user
            db.execute(text("DELETE FROM pose_data WHERE video_id IN (SELECT id FROM videos WHERE session_id = :sid)"), {"sid": session_id})
        except: pass
        
        # Ball tracking (extra cleanup)
        db.query(BallTrackingAnalysis).filter(BallTrackingAnalysis.session_id == session_id).delete()
        
        # Analysis
        db.query(Analysis).filter(Analysis.session_id == session_id).delete()
        
        # Videos
        db.query(Video).filter(Video.session_id == session_id).delete()
        
        # Session itself
        db.delete(session)
        
        db.commit()
        return { "message": "Session deleted successfully.", "session_id": session_id }

    except Exception as e:
        db.rollback()
        print(f"Error deleting session: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete session. Please try again.")
