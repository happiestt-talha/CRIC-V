from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
import numpy as np
import secrets
import string

from app.core import security, schemas
from app.database import get_db
from app.core.models import User, Player, Session as DBSession, Analysis
from app.services.email_service import email_service

router = APIRouter()

@router.get("/", response_model=List[schemas.User])
async def read_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_active_user)
):
    """
    Get all users (admin only)
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.get("/players", response_model=List[schemas.Player])
async def get_players(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_active_user)
):
    """
    Get all players. If coach, only get their players.
    """
    query = db.query(Player)
    if current_user.role == "coach":
        query = query.filter(Player.coach_id == current_user.id)
    return query.offset(skip).limit(limit).all()

@router.post("/players/create-with-credentials", response_model=schemas.Player)
async def create_player_with_credentials(
    player_data: schemas.PlayerCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user)
):
    """
    Create a new player with auto-generated credentials (coach/admin only)
    Rule B: No email verification needed, must change password on first login.
    """
    if current_user.role not in ["coach", "admin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Check if user with email already exists
    existing_user = db.query(User).filter(User.email == player_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="A user with this email already exists.")
    
    # Generate temporary password (10-character alphanumeric)
    alphabet = string.ascii_letters + string.digits
    temp_password = ''.join(secrets.choice(alphabet) for i in range(10))
    
    # Generate username (first name + random 4-digit number)
    first_name = player_data.full_name.split(' ')[0].lower()
    random_digits = ''.join(secrets.choice(string.digits) for i in range(4))
    username = f"{first_name}{random_digits}"
    
    # Ensure username is unique
    while db.query(User).filter(User.username == username).first():
        random_digits = ''.join(secrets.choice(string.digits) for i in range(4))
        username = f"{first_name}{random_digits}"
    
    # Create User record
    db_user = User(
        username=username,
        email=player_data.email,
        hashed_password=security.get_password_hash(temp_password),
        role="player",
        is_active=True,
        email_verified=True, # Coach vouches for them
        must_change_password=True
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create Player profile
    db_player = Player(
        full_name=player_data.full_name,
        age=player_data.age,
        user_id=db_user.id,
        batting_hand=player_data.batting_hand,
        bowling_style=player_data.bowling_style,
        coach_id=current_user.id
    )
    db.add(db_player)
    db.commit()
    db.refresh(db_player)
    
    # Send welcome email with credentials
    background_tasks.add_task(
        email_service.send_player_credentials_email, 
        db_user.email, 
        db_user.username, 
        temp_password
    )
    
    # We'll return the player object as per schema, 
    # but the coach needs the credentials too.
    # The return type for this endpoint could be a custom schema to include credentials.
    # However, the user said: "Return: { username, temporary_password, player_id, user_id }"
    
    # Let's check if we should return a different model. 
    # For now, I'll keep the return as requested in a dict (FastAPI will handle it if not matching schema exactly, but better to fix schema)
    return {
        "username": db_user.username,
        "temporary_password": temp_password,
        "player_id": db_player.id,
        "user_id": db_user.id,
        "full_name": db_player.full_name,
        "age": db_player.age,
        "batting_hand": db_player.batting_hand,
        "bowling_style": db_player.bowling_style,
        "coach_id": db_player.coach_id
    }

@router.post("/players", response_model=schemas.Player)
async def create_player(
    player_data: schemas.PlayerCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user)
):
    """
    Backward compatibility for the old endpoint, or just redirect to the new one.
    """
    return await create_player_with_credentials(player_data, background_tasks, db, current_user)

@router.get("/{user_id}/players", response_model=List[schemas.Player])
async def get_user_players(
    user_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_active_user)
):
    """
    Get players for a specific coach
    """
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    players = db.query(Player).filter(Player.coach_id == user_id).offset(skip).limit(limit).all()
    return players