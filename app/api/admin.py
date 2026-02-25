# app/api/admin.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import pandas as pd
from datetime import datetime, timedelta

from app.core import security
from app.database import get_db
from app.core.models import User, Player, Session as DBSession, Analysis

router = APIRouter()

@router.get("/dashboard/stats")
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user)
):
    """
    Get dashboard statistics (admin only)
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Basic stats
    total_users = db.query(User).count()
    total_players = db.query(Player).count()
    total_sessions = db.query(DBSession).count()
    total_analyses = db.query(Analysis).count()
    
    # Recent activity
    last_week = datetime.utcnow() - timedelta(days=7)
    recent_sessions = db.query(DBSession).filter(
        DBSession.created_at >= last_week
    ).count()
    
    # Analysis types
    bowling_analyses = db.query(Analysis).filter(
        Analysis.analysis_type == "bowling"
    ).count()
    
    batting_analyses = db.query(Analysis).filter(
        Analysis.analysis_type == "batting"
    ).count()
    
    return {
        "overview": {
            "total_users": total_users,
            "total_players": total_players,
            "total_sessions": total_sessions,
            "total_analyses": total_analyses,
            "recent_sessions_7d": recent_sessions
        },
        "analysis_breakdown": {
            "bowling": bowling_analyses,
            "batting": batting_analyses,
            "other": total_analyses - bowling_analyses - batting_analyses
        }
    }