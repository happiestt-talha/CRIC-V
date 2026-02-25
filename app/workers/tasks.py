"""
Celery tasks for background processing
"""
from celery import Celery
import os
from dotenv import load_dotenv

load_dotenv()

# Initialize Celery
celery_app = Celery(
    'cricv_worker',
    broker=os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
    backend=os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
    include=['app.workers.tasks']
)

# Celery configuration
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=10,
)

@celery_app.task(bind=True, name='process_video_task')
def process_video_task(self, session_id: int):
    """
    Celery task to process video asynchronously
    """
    from app.services.integration_service import integration_service
    from app.database import SessionLocal
    from app.core.models import Session
    
    db = SessionLocal()
    
    try:
        # Log task start
        self.update_state(state='PROCESSING', meta={'session_id': session_id})
        
        # Process the session
        result = integration_service.process_session(session_id)
        
        if result.get("success"):
            return {
                "status": "SUCCESS",
                "session_id": session_id,
                "analysis_id": result.get("analysis_id"),
                "summary": result.get("summary")
            }
        else:
            return {
                "status": "FAILED",
                "session_id": session_id,
                "error": result.get("error")
            }
            
    except Exception as e:
        # Update session status to failed
        session = db.query(Session).filter(Session.id == session_id).first()
        if session:
            session.status = "failed"
            db.commit()
        
        return {
            "status": "FAILED",
            "session_id": session_id,
            "error": str(e)
        }
        
    finally:
        db.close()

@celery_app.task(name='batch_process_sessions')
def batch_process_sessions(session_ids: list):
    """
    Process multiple sessions in batch
    """
    results = []
    for session_id in session_ids:
        result = process_video_task.delay(session_id)
        results.append(result.id)
    
    return {
        "status": "BATCH_STARTED",
        "task_ids": results,
        "total_sessions": len(session_ids)
    }

@celery_app.task(name='cleanup_old_sessions')
def cleanup_old_sessions(days_old: int = 30):
    """
    Clean up old session data
    """
    from app.database import SessionLocal
    from app.core.models import Session
    from datetime import datetime, timedelta
    import os
    
    db = SessionLocal()
    cutoff_date = datetime.utcnow() - timedelta(days=days_old)
    
    try:
        # Find old sessions
        old_sessions = db.query(Session).filter(
            Session.created_at < cutoff_date,
            Session.status == "completed"
        ).all()
        
        deleted_count = 0
        for session in old_sessions:
            # Delete video file
            if session.video_path and os.path.exists(session.video_path):
                os.remove(session.video_path)
            
            # Delete from database
            db.delete(session)
            deleted_count += 1
        
        db.commit()
        
        return {
            "status": "CLEANUP_COMPLETED",
            "deleted_sessions": deleted_count,
            "cutoff_date": cutoff_date.isoformat()
        }
        
    finally:
        db.close()