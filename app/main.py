from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import os
import shutil
import uuid
from datetime import datetime

from app.core import models, security
from app.database import engine, SessionLocal, get_db
from app.api import auth, users, sessions, analysis
from app.workers.tasks import process_video_task

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CRIC-V API",
    version="1.0.0",
    description="AI-powered Cricket Coaching Assistant",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(sessions.router, prefix="/sessions", tags=["Sessions"])
app.include_router(analysis.router, prefix="/analysis", tags=["Analysis"])

@app.post("/upload")
async def upload_video_endpoint(
    video: UploadFile = File(...),
    session_type: str = "bowling",
    player_id: int = None,
    background_tasks: BackgroundTasks = None,
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
    
    # Validate file type
    allowed_extensions = ['.mp4', '.avi', '.mov', '.mkv']
    file_extension = os.path.splitext(video.filename)[1].lower()
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}"
        )
    
    # Create unique filename
    filename = f"{uuid.uuid4()}{file_extension}"
    video_path = f"data/raw_videos/{filename}"
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(video_path), exist_ok=True)
    
    # Save uploaded file
    with open(video_path, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)
    
    # Create session record
    db_session = models.Session(
        session_type=session_type,
        player_id=player_id,
        coach_id=current_user.id,
        video_path=video_path,
        status="uploaded",
        created_at=datetime.utcnow()
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    
    # Start background processing
    if background_tasks:
        # Use Celery task for async processing
        process_video_task.delay(db_session.id, video_path, session_type)
    
    return {
        "message": "Video uploaded successfully",
        "session_id": db_session.id,
        "status": "processing_started",
        "video_path": video_path
    }

@app.get("/")
async def root():
    return {
        "message": "Welcome to CRIC-V API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "auth": "/auth",
            "users": "/users",
            "sessions": "/sessions",
            "analysis": "/analysis",
            "upload": "/upload"
        }
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "CRIC-V API"
    }

# Error handlers
@app.exception_handler(404)
async def not_found_exception_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={"message": "Resource not found"}
    )

@app.exception_handler(500)
async def internal_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"message": "Internal server error"}
    )