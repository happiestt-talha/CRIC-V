# File: app/api/analysis.py

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
from typing import List

from app.core import models, schemas, security
from app.database import get_db
from app.core.models import User, Session as DBSession, Analysis, Player
from app.services.video_processor import process_video_background
from app.workers.tasks import analyze_video_task, analyze_session_all_task
from app.analytics.bowling_insights import BowlingInsights
import redis
import json
import asyncio
from fastapi.responses import StreamingResponse
import os
from app.analytics.batting_insights import BattingInsights

bowling_insights = BowlingInsights()
batting_insights = BattingInsights()

router = APIRouter()

@router.get("/session/{session_id}", response_model=schemas.Analysis)
async def get_session_analysis(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user)
):
    """
    Get analysis results for a specific session
    """
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check permissions
    if current_user.role == "coach" and session.coach_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user.role == "player" and session.player_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    analysis = db.query(Analysis).filter(Analysis.session_id == session_id).first()
    if not analysis:
        # If session is completed but analysis is missing, it might be a DB sync issue
        if session.status == "completed":
             raise HTTPException(status_code=404, detail="Analysis result not found in database")
        elif session.status == "failed":
             raise HTTPException(status_code=500, detail="Analysis failed during processing")
        else:
             raise HTTPException(status_code=202, detail="Analysis is still in progress")
    
    # Add delivery_count
    delivery_count = db.query(models.Delivery).filter(models.Delivery.session_id == session_id).count()
    
    # Return as dict to include delivery_count (which is in schema but not in DB model)
    analysis_dict = {
        "id": analysis.id,
        "session_id": analysis.session_id,
        "analysis_type": analysis.analysis_type,
        "bowling_metrics": analysis.bowling_metrics,
        "batting_metrics": analysis.batting_metrics,
        "pose_data": analysis.pose_data,
        "delivery_count": delivery_count,
        "created_at": analysis.created_at
    }
    
    return analysis_dict

@router.get("/player/{player_id}/bowling", response_model=List[schemas.Analysis])
async def get_player_bowling_analysis(
    player_id: int,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user)
):
    """
    Get bowling analysis history for a player
    """
    # Check permissions
    if current_user.role == "coach":
        player = db.query(Player).filter(
            Player.id == player_id,
            Player.coach_id == current_user.id
        ).first()
        if not player:
            raise HTTPException(status_code=403, detail="Not authorized to view this player")
    
    analyses = db.query(Analysis).join(DBSession).filter(
        DBSession.player_id == player_id,
        Analysis.analysis_type == "bowling"
    ).order_by(Analysis.created_at.desc()).limit(limit).all()
    
    return analyses

@router.get("/player/{player_id}/batting", response_model=List[schemas.Analysis])
async def get_player_batting_analysis(
    player_id: int,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user)
):
    """
    Get batting analysis history for a player
    """
    # Check permissions
    if current_user.role == "coach":
        player = db.query(Player).filter(
            Player.id == player_id,
            Player.coach_id == current_user.id
        ).first()
        if not player:
            raise HTTPException(status_code=403, detail="Not authorized to view this player")
    
    analyses = db.query(Analysis).join(DBSession).filter(
        DBSession.player_id == player_id,
        Analysis.analysis_type == "batting"
    ).order_by(Analysis.created_at.desc()).limit(limit).all()
    
    return analyses

@router.post("/analyze/{session_id}")
async def trigger_manual_analysis(
    session_id: int,
    analysis_type: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user)
):
    """
    Manually trigger analysis for a session
    """
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if not session.video_path:
        raise HTTPException(status_code=400, detail="No video uploaded for this session")
    
    # Check permissions
    if current_user.role == "coach" and session.coach_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Start analysis in background
    background_tasks.add_task(
        process_video_background,
        session_id=session.id,
        video_path=session.video_path,
        session_type=analysis_type
    )
    
    return {"message": "Analysis triggered", "session_id": session_id}

@router.post("/analyze/video/{video_id}")
async def trigger_video_analysis(
    video_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user)
):
    """
    Trigger analysis for a specific video
    """
    video = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Check permissions
    if current_user.role == "coach" and video.session.coach_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    task = analyze_video_task.delay(video_id)
    return {"task_id": task.id, "video_id": video_id}

@router.post("/analyze/session/{session_id}/all")
async def trigger_session_all_analysis(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user)
):
    """
    Trigger analysis for all videos in a session
    """
    session = db.query(models.Session).filter(models.Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check permissions
    if current_user.role == "coach" and session.coach_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if not session.videos:
        raise HTTPException(status_code=400, detail="No videos in this session")
        
    task = analyze_session_all_task.delay(session_id)
    return {"task_id": task.id, "session_id": session_id, "video_count": len(session.videos)}

async def event_generator(task_id: str):
    r = redis.Redis.from_url(os.getenv('REDIS_URL', 'redis://localhost:6379/0'))
    retry_count = 0
    while True:
        data = r.get(f"task_progress:{task_id}")
        if data:
            retry_count = 0
            yield f"data: {data.decode('utf-8')}\n\n"
            parsed = json.loads(data)
            if parsed.get("status") in ("complete", "failed"):
                break
        else:
            retry_count += 1
            if retry_count > 60: # 60 seconds timeout
                yield f"data: {json.dumps({'status': 'failed', 'stage': 'Timeout - no response from worker'})}\n\n"
                break
        await asyncio.sleep(1)

@router.get("/progress/{task_id}")
async def stream_progress(task_id: str):
    return StreamingResponse(
        event_generator(task_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )

@router.get("/insights/batting/{player_id}")
async def get_batting_insights(
    player_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user)
):
    """Get advanced batting insights for a player"""
    # Initialize insights service
    insights_service = BattingInsights()
    
    # Gather data
    insights_data = insights_service.get_batting_insights(player_id, db)
        
    return insights_data


@router.get("/insights/bowling/{player_id}", response_model=schemas.BowlingInsightsResponse)
async def get_bowling_insights(
    player_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_active_user)
):
    """
    Get advanced bowling insights for a player, including speed consistency
    and line/length heatmap.
    """
    # Verify player exists
    player = db.query(models.Player).filter(models.Player.id == player_id).first()
    if not player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player not found"
        )

    # Authorization: coach/admin or the player themselves
    if current_user.role not in ["coach", "admin"] and current_user.id != player.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this player's insights"
        )

    # Initialize insights service
    insights_service = BowlingInsights()

    # Gather data
    insights_data = insights_service.get_bowling_insights(player_id, db)
    
    # Build response (matches schema BowlingInsightsResponse)
    return insights_data


# --- Feedback Endpoints ---

@router.post("/session/{session_id}/feedback", response_model=schemas.FeedbackResponse)
async def create_feedback(
    session_id: int,
    feedback: schemas.FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Create feedback for a session (Coaches/Admins only)
    """
    if current_user.role not in ["coach", "admin"]:
        raise HTTPException(status_code=403, detail="Only coaches can provide feedback")

    session = db.query(models.Session).filter(models.Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # If coach, verify they are assigned or it's their player
    if current_user.role == "coach" and session.coach_id != current_user.id:
         # Optional: Allow any coach to feedback if it's a public session? 
         # Sticking to assigned coach for now
         raise HTTPException(status_code=403, detail="Not authorized to feedback on this session")

    new_feedback = models.Feedback(
        session_id=session_id,
        coach_id=current_user.id,
        comments=feedback.comments,
        drill_recommendations=feedback.drill_recommendations,
        rating=feedback.rating
    )
    db.add(new_feedback)
    db.commit()
    db.refresh(new_feedback)
    
    # Add coach name for schema
    return {
        **new_feedback.__dict__,
        "coach_name": current_user.username # Or current_user.full_name if available
    }

@router.get("/session/{session_id}/feedback", response_model=List[schemas.FeedbackResponse])
async def get_session_feedback(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Get all feedback for a session
    """
    session = db.query(models.Session).filter(models.Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Permissions: Coach of session, Player of session, or Admin
    if current_user.role == "coach" and session.coach_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if current_user.role == "player" and session.player_id != current_user.id: # Check if current_user is the player
        # Need to check player link. Let's see if player_id in session is linked to current_user.id
        player = db.query(models.Player).filter(models.Player.user_id == current_user.id).first()
        if not player or session.player_id != player.id:
            raise HTTPException(status_code=403, detail="Not authorized")

    feedbacks = db.query(models.Feedback).filter(models.Feedback.session_id == session_id).all()
    
    results = []
    for f in feedbacks:
        coach = db.query(models.User).filter(models.User.id == f.coach_id).first()
        f_dict = f.__dict__
        f_dict["coach_name"] = coach.username if coach else "Unknown Coach"
        results.append(f_dict)
        
    return results

@router.put("/session/{session_id}/feedback/{feedback_id}", response_model=schemas.FeedbackResponse)
async def update_feedback(
    session_id: int,
    feedback_id: int,
    feedback_update: schemas.FeedbackUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Update existing feedback (Only the coach who created it can update)
    """
    db_feedback = db.query(models.Feedback).filter(
        models.Feedback.id == feedback_id,
        models.Feedback.session_id == session_id
    ).first()
    
    if not db_feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
        
    if db_feedback.coach_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to edit this feedback")

    update_data = feedback_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_feedback, key, value)
        
    db.commit()
    db.refresh(db_feedback)
    
    return {
        **db_feedback.__dict__,
        "coach_name": current_user.username
    }

@router.get("/session/{session_id}/deliveries")
def get_session_deliveries(
    session_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user)
):
    """
    Returns all bowling delivery records for a session
    """
    deliveries = db.query(models.Delivery).filter(
        models.Delivery.session_id == session_id
    ).order_by(models.Delivery.id).all()
    
    # Map to include computed fields
    results = []
    for d in deliveries:
        results.append({
            "id": d.id,
            "delivery_number": d.delivery_number,
            "ball_speed_kph": d.speed_kmh,
            "elbow_angle": d.elbow_extension,
            "shoulder_angle": d.shoulder_angle,
            "pitch_location_x": d.pitch_landing_x,
            "pitch_location_y": d.pitch_landing_y,
            "release_frame": d.release_frame or 0,
            "pitch_frame": d.pitch_frame or 0,
            "is_no_ball": d.is_no_ball or False,
            "release_timestamp_seconds": (d.release_frame or 0) / 30.0,
            "created_at": d.created_at
        })
        
    return results

@router.get("/session/{session_id}/deliveries/{delivery_id}/clip")
async def get_delivery_clip(
    session_id: int,
    delivery_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user)
):
    """
    Returns a short video clip (±2 seconds around release_frame)
    """
    import subprocess
    
    delivery = db.query(models.Delivery).filter(
        models.Delivery.id == delivery_id,
        models.Delivery.session_id == session_id
    ).first()
    
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
        
    session = delivery.session
    if not session.video_path or not os.path.exists(session.video_path):
        raise HTTPException(status_code=404, detail="Source video not found")
        
    release_frame = delivery.release_frame
    if release_frame is None:
        raise HTTPException(status_code=400, detail="Release frame data missing for this delivery")
        
    # Cache path
    clip_dir = "data/processed/clips"
    os.makedirs(clip_dir, exist_ok=True)
    clip_path = os.path.join(clip_dir, f"session_{session_id}_delivery_{delivery_id}.mp4")
    
    if os.path.exists(clip_path):
        return FileResponse(clip_path, media_type="video/mp4", headers={"Accept-Ranges": "bytes"})
        
    # Extract using ffmpeg
    fps = 30 # Default or fetch from video
    start_time = max(0, (release_frame / fps) - 2)
    duration = 4
    
    try:
        cmd = [
            'ffmpeg', '-y',
            '-ss', str(start_time),
            '-i', session.video_path,
            '-t', str(duration),
            '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28',
            '-c:a', 'copy',
            clip_path
        ]
        subprocess.run(cmd, check=True, capture_output=True)
    except Exception as e:
        print(f"FFmpeg extraction failed: {e}")
        raise HTTPException(status_code=503, detail="Clip extraction not available")
        
    return FileResponse(clip_path, media_type="video/mp4", headers={"Accept-Ranges": "bytes"})