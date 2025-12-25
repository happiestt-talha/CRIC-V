from celery import Celery
import os

# Initialize Celery
celery_app = Celery(
    'cricv_worker',
    broker=os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
    backend=os.getenv('REDIS_URL', 'redis://localhost:6379/0')
)

# Configure Celery
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)

@celery_app.task(name='process_video_task')
def process_video_task(session_id: int, video_path: str, session_type: str):
    """
    Celery task to process video asynchronously
    """
    from app.services.video_processor import process_video_background
    from app.database import SessionLocal
    
    try:
        process_video_background(session_id, video_path, session_type)
        return {"status": "success", "session_id": session_id}
    except Exception as e:
        return {"status": "failed", "session_id": session_id, "error": str(e)}

@celery_app.task(name='analyze_bowling_action')
def analyze_bowling_action(video_path: str, session_id: int):
    """
    Task specifically for bowling analysis
    """
    from app.services.bowling_analyzer import BowlingAnalyzer
    from app.database import SessionLocal
    from app.core.models import Analysis, Session as DBSession
    
    db = SessionLocal()
    try:
        analyzer = BowlingAnalyzer()
        result = analyzer.analyze_video(video_path)
        
        # Save to database
        analysis = Analysis(
            session_id=session_id,
            analysis_type="bowling",
            bowling_metrics=result["bowling_metrics"],
            pose_data=result.get("pose_data")
        )
        db.add(analysis)
        db.commit()
        
        # Update session status
        session = db.query(DBSession).filter(DBSession.id == session_id).first()
        if session:
            session.status = "completed"
            db.commit()
        
        return {"status": "success", "analysis_id": analysis.id}
    except Exception as e:
        # Update session status to failed
        session = db.query(DBSession).filter(DBSession.id == session_id).first()
        if session:
            session.status = "failed"
            db.commit()
        return {"status": "failed", "error": str(e)}
    finally:
        db.close()

@celery_app.task(name='analyze_batting_action')
def analyze_batting_action(video_path: str, session_id: int):
    """
    Task specifically for batting analysis
    """
    from app.services.batting_analyzer import BattingAnalyzer
    from app.database import SessionLocal
    from app.core.models import Analysis, Session as DBSession
    
    db = SessionLocal()
    try:
        analyzer = BattingAnalyzer()
        result = analyzer.analyze_video(video_path)
        
        # Save to database
        analysis = Analysis(
            session_id=session_id,
            analysis_type="batting",
            batting_metrics=result["batting_metrics"],
            pose_data=result.get("pose_data")
        )
        db.add(analysis)
        db.commit()
        
        # Update session status
        session = db.query(DBSession).filter(DBSession.id == session_id).first()
        if session:
            session.status = "completed"
            db.commit()
        
        return {"status": "success", "analysis_id": analysis.id}
    except Exception as e:
        # Update session status to failed
        session = db.query(DBSession).filter(DBSession.id == session_id).first()
        if session:
            session.status = "failed"
            db.commit()
        return {"status": "failed", "error": str(e)}
    finally:
        db.close()