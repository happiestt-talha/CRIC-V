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
        if session_type == "bowling":
            analyzer = BowlingAnalyzer()
            analysis_result = analyzer.analyze_video(video_path)
        elif session_type == "batting":
            analyzer = BattingAnalyzer()
            analysis_result = analyzer.analyze_video(video_path)
        else:
            # Generic pose analysis
            pose_data = pose_detector.process_video(video_path)
            analysis_result = {"pose_data": pose_data}
        
        # Save analysis to database
        analysis = models.Analysis(
            session_id=session_id,
            analysis_type=session_type,
            **analysis_result  # Unpack metrics
        )
        db.add(analysis)
        
        # Update session status
        session.status = "completed"
        session.processed_data = analysis_result
        db.commit()
        
    except Exception as e:
        # Update session status to failed
        session.status = "failed"
        db.commit()
        print(f"Error processing video: {e}")
    finally:
        db.close()