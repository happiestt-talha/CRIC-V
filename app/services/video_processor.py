"""
Video processing utilities
"""
from app.services.bowling_analyzer import BowlingAnalyzer
from app.services.batting_analyzer import BattingAnalyzer
from app.services.pose_service import PoseDetector
from app.core import models
from app.database import SessionLocal
import os
import cv2
import numpy as np
from typing import Dict, Any    

def extract_video_metadata(video_path: str) -> Dict[str, Any]:
    """
    Extract metadata from video file
    """
    if not os.path.exists(video_path):
        return {"error": f"File not found: {video_path}"}
    
    try:
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            return {"error": "Could not open video file"}
        
        # Get video properties
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        # Calculate duration
        duration = frame_count / fps if fps > 0 else 0
        
        cap.release()
        
        return {
            "frame_count": frame_count,
            "fps": fps,
            "width": width,
            "height": height,
            "duration": duration,
            "file_size": os.path.getsize(video_path),
            "file_format": os.path.splitext(video_path)[1].lower()
        }
    
    except Exception as e:
        return {"error": str(e)}

def extract_frames(video_path: str, interval: int = 1) -> np.ndarray:
    """
    Extract frames from video at specified interval
    """
    frames = []
    cap = cv2.VideoCapture(video_path)
    
    frame_idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        if frame_idx % interval == 0:
            # Convert BGR to RGB
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frames.append(frame_rgb)
        
        frame_idx += 1
    
    cap.release()
    return np.array(frames)

def create_thumbnail(video_path: str, output_path: str = None) -> str:
    """
    Create thumbnail from video
    """
    if output_path is None:
        output_dir = os.path.join("data", "thumbnails")
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(
            output_dir, 
            f"thumb_{os.path.basename(video_path).split('.')[0]}.jpg"
        )
    
    cap = cv2.VideoCapture(video_path)
    
    # Get middle frame
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    middle_frame = total_frames // 2
    
    cap.set(cv2.CAP_PROP_POS_FRAMES, middle_frame)
    ret, frame = cap.read()
    
    if ret:
        cv2.imwrite(output_path, frame)
    
    cap.release()
    return output_path if ret else None

def validate_video_file(file_path: str) -> Dict[str, Any]:
    """
    Validate video file format and properties
    """
    allowed_extensions = ['.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv']
    max_size_mb = 500  # 500MB limit
    
    if not os.path.exists(file_path):
        return {"valid": False, "error": "File does not exist"}
    
    # Check file extension
    file_ext = os.path.splitext(file_path)[1].lower()
    if file_ext not in allowed_extensions:
        return {
            "valid": False, 
            "error": f"File type {file_ext} not allowed. Allowed: {', '.join(allowed_extensions)}"
        }
    
    # Check file size
    file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
    if file_size_mb > max_size_mb:
        return {
            "valid": False,
            "error": f"File size {file_size_mb:.1f}MB exceeds limit of {max_size_mb}MB"
        }
    
    # Try to open with OpenCV
    cap = cv2.VideoCapture(file_path)
    if not cap.isOpened():
        return {"valid": False, "error": "Cannot open video file"}
    
    # Check if video has frames
    ret, frame = cap.read()
    cap.release()
    
    if not ret:
        return {"valid": False, "error": "Video has no readable frames"}
    
    return {"valid": True, "file_size_mb": file_size_mb, "extension": file_ext}

def process_video_background(session_id: int, video_path: str, session_type: str):
    """
    Background task to process video
    """
    db = SessionLocal()
    try:
        # Update session status
        session = db.query(models.Session).filter(models.Session.id == session_id).first()
        if not session:
            print(f"Session {session_id} not found")
            return
        
        session.status = "processing"
        db.commit()

        # Process video based on type
        analysis_data = {}
        if session_type == "bowling":
            analyzer = BowlingAnalyzer()
            result = analyzer.analyze_video(video_path)  # ensure method name matches
            # Map bowling metrics to analysis model
            metrics = result.get("bowling_metrics", {})
            analysis_data = {
                "elbow_extension": metrics.get("elbow_extension"),
                "arm_type": metrics.get("arm_type"),
                "release_point": metrics.get("release_point"),
                "swing_type": metrics.get("swing_type"),
                "front_foot_landing": metrics.get("front_foot_landing"),
                "icc_compliant": metrics.get("icc_compliant"),
                "recommendations": metrics.get("recommendations", []),
            }
        elif session_type == "batting":
            analyzer = BattingAnalyzer()
            result = analyzer.analyze_video(video_path)
            metrics = result.get("batting_metrics", {})
            analysis_data = {
                "stance_type": metrics.get("stance_type"),
                "weight_distribution": metrics.get("weight_distribution"),
                "bat_angle": metrics.get("bat_angle"),
                "head_position": metrics.get("head_position"),
                "recommendations": metrics.get("recommendations", []),
            }
        else:
            # Generic pose analysis
            result = pose_detector.process_video(video_path)
            # No specific metrics to save yet – you could store raw data elsewhere
            analysis_data = {}

        # Save analysis to database
        analysis = models.Analysis(
            session_id=session_id,
            analysis_type=session_type,
            **analysis_data
        )
        db.add(analysis)

        # Update session status to completed
        session.status = "completed"
        db.commit()

    except Exception as e:
        print(f"Error processing video: {e}")
        # If session exists, mark as failed
        if session:
            session.status = "failed"
            db.commit()
    finally:
        db.close()