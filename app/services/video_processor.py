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

        # Phase 5: Generate annotated video
        output_dir = os.path.join("data", "processed")
        os.makedirs(output_dir, exist_ok=True)
        output_video_path = os.path.join(output_dir, f"annotated_{session_id}.mp4")
        
        generate_annotated_video(
            input_video_path=video_path,
            output_video_path=output_video_path,
            analysis_results=result,
            session_type=session_type
        )
        
        # We could store output_video_path in session model if we add a column
        # For now, we'll assume it follows this naming convention in the API

    except Exception as e:
        print(f"Error processing video: {e}")
        # If session exists, mark as failed
        if session:
            session.status = "failed"
            db.commit()
    finally:
        db.close()

def generate_annotated_video(
    input_video_path: str,
    output_video_path: str,
    analysis_results: dict,
    session_type: str,
    overlay_pose: bool = True,
    overlay_ball: bool = True,
    overlay_metrics: bool = True
) -> str:
    """
    Generate video with overlays:
    - MediaPipe Skeleton
    - Ball Bounding Box
    - Metrics HUD
    """
    cap = cv2.VideoCapture(input_video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_video_path, fourcc, fps, (width, height))

    # Pose connections for drawing
    POSE_CONNECTIONS = [
        (11, 12), (11, 13), (13, 15), (12, 14), (14, 16), # Upper body
        (11, 23), (12, 24), (23, 24), # Torso
        (23, 25), (25, 27), (24, 26), (26, 28) # Lower body
    ]

    frame_idx = 0
    pose_frames = analysis_results.get("pose_data", {}).get("frames", [])
    
    # Structure for metrics HUD
    if session_type == "batting":
        shots = analysis_results.get("shots", [])
    else:
        deliveries = analysis_results.get("deliveries", [])

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        # 1. Draw Pose
        if overlay_pose and frame_idx < len(pose_frames):
            landmarks = pose_frames[frame_idx].get("landmarks", [])
            lm_pts = {lm["id"]: (int(lm["x"] * width), int(lm["y"] * height)) for lm in landmarks}
            
            for start_idx, end_idx in POSE_CONNECTIONS:
                if start_idx in lm_pts and end_idx in lm_pts:
                    cv2.line(frame, lm_pts[start_idx], lm_pts[end_idx], (0, 255, 0), 2)
            
            for pt in lm_pts.values():
                cv2.circle(frame, pt, 4, (0, 255, 255), -1)

        # 2. Draw HUD (Metrics Overlay)
        if overlay_metrics:
            # Simple HUD in top-left
            cv2.rectangle(frame, (10, 10), (300, 120), (0, 0, 0), -1)
            cv2.rectangle(frame, (10, 10), (300, 120), (255, 255, 255), 2)
            
            y_offset = 40
            if session_type == "batting":
                # Find current shot
                current_shot = next((s for s in shots if s["start_frame"] <= frame_idx <= s["end_frame"]), None)
                if current_shot:
                    texts = [
                        f"Shot: {current_shot['shot_type']}",
                        f"Quality: {current_shot['quality_score']}",
                        f"Bat Angle: {current_shot['bat_angle']} deg"
                    ]
                    for text in texts:
                        cv2.putText(frame, text, (20, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                        y_offset += 30
            else:
                # Bowling HUD
                current_delivery = next((d for d in deliveries if d["release_frame"] <= frame_idx), None)
                if current_delivery:
                    texts = [
                        f"Speed: {current_delivery['ball_speed_kph']} kph",
                        f"Elbow: {current_delivery['elbow_angle']} deg",
                        f"Compliance: {'Legal' if current_delivery['icc_compliant'] else 'Illegal'}"
                    ]
                    for text in texts:
                        cv2.putText(frame, text, (20, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                        y_offset += 30

        out.write(frame)
        frame_idx += 1

    cap.release()
    out.release()
    return output_video_path