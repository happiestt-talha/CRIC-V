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

import shutil

def get_ffmpeg_path() -> str:
    """
    Get the path to the ffmpeg executable, checking PATH and common WinGet directories.
    """
    # 1. Check system PATH
    in_path = shutil.which('ffmpeg')
    if in_path:
        return in_path
    
    # 2. Check WinGet installation paths
    try:
        user_profile = os.environ.get("USERPROFILE")
        if user_profile:
            winget_base = os.path.join(user_profile, "AppData", "Local", "Microsoft", "WinGet", "Packages")
            if os.path.exists(winget_base):
                for dir_name in os.listdir(winget_base):
                    if dir_name.startswith("Gyan.FFmpeg"):
                        pkg_dir = os.path.join(winget_base, dir_name)
                        for root, _, files in os.walk(pkg_dir):
                            if "ffmpeg.exe" in files:
                                return os.path.join(root, "ffmpeg.exe")
    except Exception:
        pass
        
    return 'ffmpeg'

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
        result = {}
        
        if session_type == "bowling":
            analyzer = BowlingAnalyzer()
            result = analyzer.analyze_video(video_path, session_id=session_id)
            # BowlingAnalyzer._save_to_db already handles database persistence if session_id is passed
            # But we still want to prepare analysis_data for the local Analysis object if needed
            metrics = result.get("session_summary", {})
            analysis_data = {
                "elbow_extension": result.get("deliveries", [{}])[0].get("elbow_angle") if result.get("deliveries") else 0.0,
                "arm_type": metrics.get("arm_type", "unknown"),
                "icc_compliant": metrics.get("icc_compliant_percentage") == 100,
                "recommendations": metrics.get("recommendations", ["Analysis completed"]),
            }
        elif session_type == "batting":
            analyzer = BattingAnalyzer()
            result = analyzer.analyze_video(video_path, session_id=session_id)
            metrics = result.get("session_summary", {})
            analysis_data = {
                "stance_type": metrics.get("stance_type"),
                "bat_angle": metrics.get("average_quality_score"), # Use avg score as proxy or specific metric
                "recommendations": result.get("shots", [{}])[0].get("recommendations", []) if result.get("shots") else [],
            }
        
        # Ensure analysis record exists (analyzers might have created it, but let's be sure)
        analysis = db.query(models.Analysis).filter(models.Analysis.session_id == session_id).first()
        if not analysis:
            analysis = models.Analysis(
                session_id=session_id,
                analysis_type=session_type,
                **analysis_data
            )
            db.add(analysis)
        else:
            # Update existing
            for key, value in analysis_data.items():
                setattr(analysis, key, value)

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
        
        # Store the output path in the database
        session.annotated_video_path = output_video_path
        db.commit()

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
    
    # Use a temporary file for the initial OpenCV output
    temp_output = output_video_path.replace('.mp4', '_temp.mp4')
    
    # Use mp4v for the temporary file (standard OpenCV on Windows)
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(temp_output, fourcc, fps, (width, height))

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

    # Transcode to H.264 for browser compatibility
    try:
        import subprocess
        subprocess.run([
            get_ffmpeg_path(), '-y', '-i', temp_output, 
            '-vcodec', 'libx264', '-crf', '23', 
            '-pix_fmt', 'yuv420p', 
            output_video_path
        ], check=True, capture_output=True)
        # Clean up temp file
        if os.path.exists(temp_output):
            os.remove(temp_output)
    except Exception as e:
        print(f"FFmpeg transcoding failed: {e}")
        # If transcoding fails, rename temp to output so we at least have a file
        if os.path.exists(temp_output) and not os.path.exists(output_video_path):
            os.rename(temp_output, output_video_path)

    return output_video_path