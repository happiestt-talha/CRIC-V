from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
from typing import List

from app.core import models, schemas, security
from app.database import get_db
from app.core.models import User, Session as DBSession, Analysis, Player
from app.services.video_processor import process_video_background
from app.analytics.bowling_insights import BowlingInsights
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
    print("Request received")
    print("current_user", current_user)
    print("session_id", session_id)
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    print("session", session)
    # if not session:
    #     raise HTTPException(status_code=404, detail="Session not found")
    
    # Check permissions
    if current_user.role == "coach" and session.coach_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user.role == "player" and session.player_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    analysis = db.query(Analysis).filter(Analysis.session_id == session_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found or still processing")
    
    return analysis

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

@router.get("/insights/batting/{player_id}")
async def get_batting_insights(
    player_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user)
):
    """Get advanced batting insights for a player"""
    strike_rate = batting_insights.strike_rate(player_id, db)
    zones = batting_insights.scoring_zones(player_id, db)
    shot_ratio = batting_insights.shot_ratio(player_id, db)
    timing = batting_insights.timing_consistency(player_id, db)
    
    return {
        "player_id": player_id,
        "strike_rate": strike_rate,
        "scoring_zones": zones,
        "shot_ratio": shot_ratio,
        "timing_consistency": timing,
    }

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
    insights = BowlingInsights()

    # Gather data
    speed_stats = insights.speed_consistency(player_id, db)
    heatmap = insights.line_length_heatmap(player_id, db)

    # Build response (matches schema BowlingInsightsResponse)
    return {
        "player_id": player_id,
        "speed_consistency": speed_stats,
        "line_length_heatmap": heatmap,
    }