"""
Main FastAPI application
"""
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
import os
import shutil
import uuid
from datetime import datetime, timedelta
import json

# Import local modules
from app.database import get_db, SessionLocal
from app.core import models, schemas, security
from app.api import auth, users, sessions, analysis, ball_tracking, admin
from app.core.models import User, Session as DBSession, Player, Analysis, Delivery
from app.services.video_processor import validate_video_file, create_thumbnail
from app.workers.tasks import process_video_task

# Initialize FastAPI app
app = FastAPI(
    title="CRIC-V API",
    version="1.0.0",
    description="AI-powered Cricket Coaching Assistant",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(sessions.router, prefix="/sessions", tags=["Sessions"])
app.include_router(analysis.router, prefix="/analysis", tags=["Analysis"])
app.include_router(ball_tracking.router)
app.include_router(admin.router, prefix="/admin", tags=["Admin"])


# Create data directories
os.makedirs("data/raw_videos", exist_ok=True)
os.makedirs("data/thumbnails", exist_ok=True)
os.makedirs("data/processed", exist_ok=True)

@app.post("/upload", response_model=schemas.Session)
async def upload_video(
    video: UploadFile = File(...),
    session_type: str = Form(...),
    player_id: int = Form(...),
    title: str = Form(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Upload a cricket training video for analysis
    """
    # Check if user is coach or admin
    if current_user.role not in ["coach", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only coaches or admins can upload videos"
        )
    
    # Create unique filename
    file_extension = os.path.splitext(video.filename)[1].lower()
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    video_path = os.path.join("data", "raw_videos", unique_filename)
    
    # Save uploaded file
    with open(video_path, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)
    
    # Validate video file
    validation = validate_video_file(video_path)
    if not validation.get("valid", False):
        os.remove(video_path)  # Clean up invalid file
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=validation.get("error", "Invalid video file")
        )
    
    # Create thumbnail
    thumbnail_path = create_thumbnail(video_path)
    
    # Create session record
    db_session = models.Session(
    title=title or f"{session_type.title()} Session",
    session_type=session_type,
    player_id=player_id,
    coach_id=current_user.id,
    video_path=video_path,
    thumbnail_path=thumbnail_path,
    status="uploaded"
    # created_at will be set automatically by server_default
)
    
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    
    # Start background processing with Celery
    process_video_task.delay(db_session.id)
    
    return db_session

@app.get("/tasks/{task_id}")
async def get_task_status(task_id: str):
    """
    Get status of a Celery task
    """
    from celery.result import AsyncResult
    from app.workers.tasks import celery_app
    
    task_result = AsyncResult(task_id, app=celery_app)
    
    response = {
        "task_id": task_id,
        "status": task_result.status,
    }
    
    if task_result.status == "SUCCESS":
        response["result"] = task_result.result
    elif task_result.status == "FAILURE":
        response["error"] = str(task_result.result)
    
    return response

@app.get("/dashboard/stats")
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_active_user)
):
    """
    Get dashboard statistics
    """
    # Total counts
    total_sessions = db.query(models.Session).count()
    total_players = db.query(models.Player).count()
    total_analyses = db.query(models.Analysis).count()
    total_deliveries = db.query(Delivery).count()
    
    # Recent activity
    last_week = datetime.utcnow() - timedelta(days=7)
    sessions_this_week = db.query(models.Session).filter(
        models.Session.created_at >= last_week
    ).count()
    
    # Speed stats
    avg_speed = db.query(func.avg(Delivery.speed_kmh)).scalar() or 0
    
    # Top bowler
    top_bowler_data = db.query(
        models.Player.full_name,
        func.avg(Delivery.speed_kmh).label("avg_speed")
    ).join(models.Session).join(Delivery).group_by(models.Player.id).order_by(text("avg_speed DESC")).first()
    
    top_bowler = {"name": top_bowler_data[0], "avg_speed": round(top_bowler_data[1], 1)} if top_bowler_data else {"name": "N/A", "avg_speed": 0}

    # Recent sessions (last 5)
    recent_sessions_list = db.query(models.Session).join(models.Player).order_by(models.Session.created_at.desc()).limit(5).all()
    recent_sessions = []
    for s in recent_sessions_list:
        recent_sessions.append({
            "id": s.id,
            "title": s.title,
            "player_name": s.player.full_name if s.player else "Unknown",
            "session_type": s.session_type,
            "status": s.status,
            "created_at": s.created_at.isoformat(),
            "thumbnail_path": s.thumbnail_path
        })
    
    return {
        "total_sessions": total_sessions,
        "total_players": total_players,
        "total_analyses": total_analyses,
        "total_deliveries": total_deliveries,
        "sessions_this_week": sessions_this_week,
        "avg_ball_speed_kph": round(avg_speed, 1),
        "top_bowler": top_bowler,
        "recent_sessions": recent_sessions
    }

@app.get("/")
async def root():
    """
    Root endpoint
    """
    return {
        "message": "Welcome to CRIC-V API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "auth": "/auth",
            "users": "/users",
            "sessions": "/sessions",
            "analysis": "/analysis",
            "upload": "/upload",
            "dashboard": "/dashboard/stats",
            "ball tracking": "/ball-tracking",
        }
    }

@app.get("/health")
async def health_check():
    """
    Health check endpoint
    """
    # Check database connection
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    finally:
        db.close()
    
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "CRIC-V API",
        "database": db_status,
        "version": "1.0.0"
    }

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={"message": "Resource not found", "detail": str(exc)}
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"message": "Internal server error", "detail": str(exc)}
    )