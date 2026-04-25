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
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user)
):
    """
    Returns the processed annotated video file
    """
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Check permissions
    if current_user.role == "coach" and session.coach_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user.role == "player" and session.player_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    video_path = f"data/processed/annotated_{session_id}.mp4"
    
    if not os.path.exists(video_path):
        # We could trigger generation here if not yet generated, 
        # but process_video_background should have handled it.
        # If it's missing, maybe still processing or failed.
        if session.status == "processing":
            raise HTTPException(status_code=202, detail="Video is still being processed")
        else:
            raise HTTPException(status_code=404, detail="Annotated video not found")

    response = FileResponse(video_path, media_type="video/mp4", filename=f"annotated_session_{session_id}.mp4")
    response.headers["Access-Control-Allow-Origin"] = "http://localhost:3000"
    response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Expose-Headers"] = "Content-Range, Accept-Ranges"
    return response
