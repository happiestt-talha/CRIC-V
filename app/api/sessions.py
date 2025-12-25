from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status, UploadFile, File  # Add File here
from sqlalchemy.orm import Session
from typing import List
import os

from app.core import security, schemas
from app.database import get_db
from app.core.models import User, Session as DBSession, Player
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
    video_path = f"data/raw_videos/session_{session_id}_{video_file.filename}"
    os.makedirs(os.path.dirname(video_path), exist_ok=True)
    
    with open(video_path, "wb") as buffer:
        content = await video_file.read()
        buffer.write(content)
    
    # Update session
    session.video_path = video_path
    session.status = "uploaded"
    db.commit()
    
    # Start processing
    if background_tasks:
        background_tasks.add_task(
            process_video_background,
            session_id=session_id,
            video_path=video_path,
            session_type=session.session_type
        )
    
    return {"message": "Video uploaded and processing started", "session_id": session_id}