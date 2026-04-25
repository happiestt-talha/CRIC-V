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
    current_user: User = Depends(security.get_current_user)
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
    current_user: User = Depends(security.get_current_user)
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
    current_user: User = Depends(security.get_current_user)
):
    """Delete a session and all its associated files and data"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
        
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    # Delete physical files
    if session.video_path and os.path.exists(session.video_path):
        os.remove(session.video_path)
    
    annotated_path = f"data/processed/annotated_{session_id}.mp4"
    if os.path.exists(annotated_path):
        os.remove(annotated_path)
        
    if session.thumbnail_path and os.path.exists(session.thumbnail_path):
        os.remove(session.thumbnail_path)
        
    # DB cascade should handle Analysis and Delivery, but let's be safe if needed
    db.delete(session)
    db.commit()
    return {"message": "Session and all associated data deleted successfully"}

@router.get("/sessions")
async def get_admin_sessions(
    status: Optional[str] = None,
    session_type: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user)
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