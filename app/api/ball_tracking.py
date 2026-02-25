from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional, List
import os
import uuid
import json

from app.database import get_db, SessionLocal
from app.core import security
from app.core.models import User, Session as DBSession, BallTrackingAnalysis
from app.services.advanced_ball_detector import AdvancedBallDetector
from app.services.video_processor import extract_video_metadata

router = APIRouter(prefix="/ball-tracking", tags=["Ball Tracking"])

# Initialize detector – falls back to yolov8n.pt if custom model not found
_model_path = "models/cricket_ball_detector.pt"
detector = AdvancedBallDetector(
    model_path=_model_path if os.path.exists(_model_path) else None
)


@router.post("/analyze")
async def analyze_ball_tracking(
    video: UploadFile = File(...),
    session_id: Optional[int] = None,
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user)
):
    """
    Upload a video for ball tracking analysis (speed, trajectory, spin, etc.)
    """
    if current_user.role not in ["coach", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Save video
    file_ext = os.path.splitext(video.filename)[1].lower()
    filename = f"ball_track_{uuid.uuid4()}{file_ext}"
    video_path = os.path.join("data", "raw_videos", filename)
    os.makedirs(os.path.dirname(video_path), exist_ok=True)

    with open(video_path, "wb") as buffer:
        content = await video.read()
        buffer.write(content)

    # Process in background to avoid timeout
    if background_tasks:
        background_tasks.add_task(
            process_ball_tracking,
            video_path=video_path,
            session_id=session_id,
            user_id=current_user.id,
            db_session_factory=SessionLocal
        )
        return {"message": "Ball tracking started", "video_path": video_path}
    else:
        # Process synchronously (for testing)
        result = await process_ball_tracking_sync(video_path, session_id, db)
        return result


def process_ball_tracking(video_path: str, session_id: int, user_id: int, db_session_factory):
    """
    Background task: run ball tracking and persist results.
    """
    db = db_session_factory()
    try:
        import asyncio
        result = asyncio.run(process_ball_tracking_sync(video_path, session_id, db))
        return result
    except Exception as exc:
        # Log but don't crash the worker
        print(f"[ball_tracking] Background task error: {exc}")
    finally:
        db.close()


async def process_ball_tracking_sync(video_path: str, session_id: int, db: Session):
    """
    Synchronous processing (for immediate response).
    """
    # Get video metadata
    metadata = extract_video_metadata(video_path)

    # Detect ball in video
    detections = detector.detect_ball_in_video(video_path)

    if not detections:
        raise HTTPException(status_code=400, detail="No ball detected in video")

    # Track trajectory
    trajectory = detector.track_ball_trajectory(video_path)

    # Calculate speed
    speed = detector.calculate_ball_speed(trajectory)

    # Calculate spin (if enough frames)
    spin = detector.calculate_spin_rate(detections)

    # Estimate swing (lateral movement)
    swing = estimate_swing(trajectory)

    # Determine ball type (yorker, bouncer, etc.)
    ball_type = classify_ball_type(trajectory, speed)

    # Save to database if session_id provided
    if session_id:
        ball_analysis = BallTrackingAnalysis(
            session_id=session_id,
            delivery_number=1,
            trajectory_3d=_get_points(trajectory),
            release_point_3d=trajectory.get("release_point"),
            pitch_landing_3d=trajectory.get("pitch_landing"),
            speed_kmh=speed,
            spin_rpm=spin,
            swing_angle=swing,
            accuracy_score=calculate_accuracy(trajectory),
            **ball_type
        )
        db.add(ball_analysis)
        db.commit()
        db.refresh(ball_analysis)
        analysis_id = ball_analysis.id
    else:
        analysis_id = None

    points = _get_points(trajectory)

    return {
        "analysis_id": analysis_id,
        "speed_kmh": speed,
        "spin_rpm": spin,
        "swing_angle": swing,
        "trajectory_summary": {
            "frames": len(points),
            "release_point": trajectory.get("release_point") or (points[0] if points else None),
            "pitch_landing": trajectory.get("pitch_landing"),
            "final_point": trajectory.get("final_point") or (points[-1] if points else None),
        },
        "ball_classification": ball_type
    }


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _get_points(trajectory: dict) -> list:
    """Return the list of trajectory points regardless of which key name is used."""
    return trajectory.get("points_2d") or trajectory.get("trajectory") or []


def estimate_swing(trajectory: dict) -> float:
    """Calculate lateral movement (degrees approximation)."""
    points = _get_points(trajectory)
    if len(points) < 10:
        return 0.0
    release_x = points[0]["x"]
    pitch_x = points[min(len(points) - 1, int(len(points) * 0.6))]["x"]
    delta_x = abs(pitch_x - release_x)
    # Placeholder conversion (needs real camera calibration)
    return round(delta_x * 0.1, 2)


def classify_ball_type(trajectory: dict, speed: float) -> dict:
    """Classify as yorker, bouncer, full toss, etc."""
    points = _get_points(trajectory)
    if len(points) < 10:
        return {"is_yorker": False, "is_bouncer": False, "is_full_toss": False}

    # Find minimum y (height) after release
    heights = [p["y"] for p in points[5:]]
    min_height = min(heights) if heights else 1.0

    # Rough classification (normalized coords: y=1 top, y=0 bottom)
    if min_height < 0.2:
        return {"is_yorker": True,  "is_bouncer": False, "is_full_toss": False}
    elif min_height > 0.8:
        return {"is_yorker": False, "is_bouncer": True,  "is_full_toss": False}
    elif min_height > 0.4:
        return {"is_yorker": False, "is_bouncer": False, "is_full_toss": True}
    else:
        return {"is_yorker": False, "is_bouncer": False, "is_full_toss": False}


def calculate_accuracy(trajectory: dict) -> float:
    """Score based on proximity to target (stumps). Placeholder."""
    return 75.0