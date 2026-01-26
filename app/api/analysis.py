from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List

from app.core import security, schemas
from app.database import get_db
from app.core.models import User, Session as DBSession, Analysis, Player
from app.services.video_processor import process_video_background

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