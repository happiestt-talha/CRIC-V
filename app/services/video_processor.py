import asyncio
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.services.pose_service import pose_detector
from app.services.bowling_analyzer import BowlingAnalyzer
from app.services.batting_analyzer import BattingAnalyzer
from app.core import models

def process_video_background(session_id: int, video_path: str, session_type: str):
    """
    Background task to process video
    """
    db = SessionLocal()
    try:
        # Update session status
        session = db.query(models.Session).filter(models.Session.id == session_id).first()
        if not session:
            return
        
        session.status = "processing"
        db.commit()
        
        # Process video based on type
        analysis_data = {}
        if session_type == "bowling":
            analyzer = BowlingAnalyzer()
            result = analyzer.analyze_video(video_path)
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
                # We currently don't have a field for pose_data in the model
            }
        elif session_type == "batting":
            analyzer = BattingAnalyzer()
            result = analyzer.analyze_video(video_path)
            # Map batting metrics to analysis model
            metrics = result.get("batting_metrics", {})
            analysis_data = {
                "stance_type": metrics.get("stance_type"),
                "weight_distribution": metrics.get("weight_distribution"),
                "bat_angle": metrics.get("bat_angle"),
                "head_position": metrics.get("head_position"),
                "recommendations": metrics.get("recommendations", []),
                # We currently don't have a field for pose_data in the model
            }
        else:
            # Generic pose analysis
            pose_data = pose_detector.process_video(video_path)
            # No specific metrics to save for generic analysis yet
            analysis_data = {}
        
        # Save analysis to database
        analysis = models.Analysis(
            session_id=session_id,
            analysis_type=session_type,
            **analysis_data
        )
        db.add(analysis)
        
        # Update session status
        session.status = "completed"
        # session.processed_data = result # Field does not exist in Session model
        db.commit()
        
    except Exception as e:
        # Update session status to failed
        session.status = "failed"
        db.commit()
        print(f"Error processing video: {e}")
    finally:
        db.close()