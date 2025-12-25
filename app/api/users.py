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
        name=player.name,
        age=player.age,
        batting_hand=player.batting_hand,
        bowling_style=player.bowling_style,
        coach_id=current_user.id
    )
    db.add(db_player)
    db.commit()
    db.refresh(db_player)
    
    return db_player

@router.get("/{user_id}/players", response_model=List[schemas.Player])
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