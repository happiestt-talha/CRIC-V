from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core import security, schemas
from app.database import get_db
from app.core.models import User, Player

router = APIRouter()

@router.get("/", response_model=List[schemas.User])
async def read_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user)
):
    """
    Retrieve users (admin only)
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.get("/{user_id}", response_model=schemas.User)
async def read_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user)
):
    """
    Get a specific user by ID
    """
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.post("/players", response_model=schemas.Player)
async def create_player(
    player: schemas.PlayerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user)
):
    """
    Create a new player (coach/admin only)
    """
    if current_user.role not in ["coach", "admin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    db_player = Player(
        full_name=player.full_name,
        age=player.age,
        user_id=current_user.id,
        batting_hand=player.batting_hand,
        bowling_style=player.bowling_style,
        coach_id=current_user.id
    )
    db.add(db_player)
    db.commit()
    db.refresh(db_player)
    
    return db_player

@router.get("/{user_id}/players", response_model=List[schemas.Player])

# In users.py or new performance router

@router.get("/performance/player/{player_id}")
async def get_player_performance(
    player_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user)
):
    """
    Get overall performance stats for a player (batting/bowling)
    """
    # Get all sessions for this player
    sessions = db.query(Session).filter(Session.player_id == player_id).all()
    
    bowling_stats = []
    batting_stats = []
    
    for session in sessions:
        # Get analysis for session
        analysis = db.query(Analysis).filter(Analysis.session_id == session.id).first()
        if analysis:
            if analysis.analysis_type == "bowling":
                bowling_stats.append(analysis)
            elif analysis.analysis_type == "batting":
                batting_stats.append(analysis)
    
    # Aggregate bowling
    bowling_avg_speed = np.mean([a.speed_kmh for a in bowling_stats if a.speed_kmh]) if bowling_stats else 0
    bowling_avg_accuracy = np.mean([a.accuracy_score for a in bowling_stats if a.accuracy_score]) if bowling_stats else 0
    # etc.
    
    return {
        "player_id": player_id,
        "bowling": {
            "total_deliveries": len(bowling_stats),
            "avg_speed_kmh": round(bowling_avg_speed, 1),
            "avg_accuracy": round(bowling_avg_accuracy, 1),
            "best_speed": max([a.speed_kmh for a in bowling_stats if a.speed_kmh], default=0),
            "avg_spin_rpm": np.mean([a.spin_rpm for a in bowling_stats if a.spin_rpm]),
            # etc.
        },
        "batting": {
            "total_shots": len(batting_stats),
            "avg_shot_power": np.mean([a.shot_power for a in batting_stats if a.shot_power]),
            "avg_timing": np.mean([a.shot_timing for a in batting_stats if a.shot_timing]),
            "total_runs": sum([a.runs_scored for a in batting_stats if a.runs_scored]),
            # etc.
        }
    }
async def get_user_players(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user)
):
    """
    Get players associated with a user (coach)
    """
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    players = db.query(Player).filter(Player.coach_id == user_id).all()
    return players