# File: app/api/admin.py

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, date
import os

from app.core import security, schemas, models
from app.database import get_db
from app.core.models import User, Player, Session as DBSession, Analysis

router = APIRouter()

def get_dir_size(path: str) -> float:
    """Calculate directory size in MB"""
    total_size = 0
    if not os.path.exists(path):
        return 0.0
    for dirpath, dirnames, filenames in os.walk(path):
        for f in filenames:
            fp = os.path.join(dirpath, f)
            total_size += os.path.getsize(fp)
    return total_size / (1024 * 1024)

@router.get("/stats")
async def get_admin_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_active_user)
):
    """Get system-wide statistics (Admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    total_users = db.query(User).count()
    total_players = db.query(Player).count()
    total_sessions = db.query(DBSession).count()
    total_analyses = db.query(Analysis).count()
    
    sessions_today = db.query(DBSession).filter(
        func.date(DBSession.created_at) == date.today()
    ).count()
    
    # Calculate storage
    raw_size = get_dir_size("data/raw_videos")
    processed_size = get_dir_size("data/processed")
    
    return {
        "total_users": total_users,
        "total_players": total_players,
        "total_sessions": total_sessions,
        "total_analyses": total_analyses,
        "sessions_today": sessions_today,
        "storage_used_mb": round(raw_size + processed_size, 2)
    }

@router.get("/users")
async def get_admin_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_active_user)
):
    """Get all users with their player and session counts"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = db.query(User).all()
    results = []
    for u in users:
        player_count = db.query(Player).filter(Player.coach_id == u.id).count()
        session_count = db.query(DBSession).filter(DBSession.coach_id == u.id).count()
        results.append({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "role": u.role,
            "is_active": u.is_active,
            "player_count": player_count,
            "session_count": session_count,
            "created_at": u.created_at
        })
    return results

@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_active_user)
):
    """Delete a session and all its associated files and data (Admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
        
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    import redis
    import json
    from app.workers.tasks import celery_app
    from app.core.models import Video, Analysis, Feedback, Delivery, BallTrackingAnalysis
    from sqlalchemy import text
    
    try:
        # 1. Cancel any running Celery tasks
        r = redis.Redis.from_url(os.getenv('REDIS_URL', 'redis://localhost:6379/0'))
        task_keys = r.keys("task_progress:*")
        for key in task_keys:
            data = r.get(key)
            if data:
                try:
                    progress = json.loads(data)
                    task_id = key.decode('utf-8').split(':')[-1]
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
                except: continue

        # 2. Delete physical files
        videos = db.query(Video).filter(Video.session_id == session_id).all()
        for video in videos:
            if os.path.exists(video.file_path):
                try: os.remove(video.file_path)
                except: pass

        if session.video_path and os.path.exists(session.video_path):
            try: os.remove(session.video_path)
            except: pass
        
        annotated_path = f"data/processed/annotated_{session_id}.mp4"
        if os.path.exists(annotated_path):
            try: os.remove(annotated_path)
            except: pass
            
        if session.thumbnail_path and os.path.exists(session.thumbnail_path):
            try: os.remove(session.thumbnail_path)
            except: pass
            
        # 3. Delete DB records
        try:
            db.execute(text("DELETE FROM metrics WHERE delivery_id IN (SELECT id FROM deliveries WHERE session_id = :sid)"), {"sid": session_id})
            db.execute(text("DELETE FROM metrics WHERE shot_id IN (SELECT id FROM shots WHERE session_id = :sid)"), {"sid": session_id})
        except: pass

        db.query(Delivery).filter(Delivery.session_id == session_id).delete()
        try: db.execute(text("DELETE FROM shots WHERE session_id = :sid"), {"sid": session_id})
        except: pass
        db.query(Feedback).filter(Feedback.session_id == session_id).delete()
        try: db.execute(text("DELETE FROM pose_data WHERE video_id IN (SELECT id FROM videos WHERE session_id = :sid)"), {"sid": session_id})
        except: pass
        db.query(BallTrackingAnalysis).filter(BallTrackingAnalysis.session_id == session_id).delete()
        db.query(Analysis).filter(Analysis.session_id == session_id).delete()
        db.query(Video).filter(Video.session_id == session_id).delete()
        
        db.delete(session)
        db.commit()
        return {"message": "Session and all associated data deleted successfully"}

    except Exception as e:
        db.rollback()
        print(f"Admin delete failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete session.")

@router.get("/sessions")
async def get_admin_sessions(
    status: Optional[str] = None,
    session_type: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_active_user)
):
    """Retrieve all sessions with advanced filtering"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
        
    query = db.query(DBSession)
    if status:
        query = query.filter(DBSession.status == status)
    if session_type:
        query = query.filter(DBSession.session_type == session_type)
    if date_from:
        query = query.filter(DBSession.created_at >= date_from)
    if date_to:
        query = query.filter(DBSession.created_at <= date_to)
        
    sessions = query.order_by(DBSession.created_at.desc()).all()
    
    results = []
    for s in sessions:
        player = db.query(Player).filter(Player.id == s.player_id).first()
        coach = db.query(User).filter(User.id == s.coach_id).first()
        results.append({
            "id": s.id,
            "session_type": s.session_type,
            "status": s.status,
            "created_at": s.created_at,
            "player_name": player.full_name if player else "Unknown",
            "coach_name": coach.username if coach else "Unknown"
        })
    return results