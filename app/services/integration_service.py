"""
Integration service that connects all components
"""
import os
import json
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime
import cv2
import numpy as np

from app.database import SessionLocal
from app.core.models import Session, Analysis, SessionStatus
from .pose_service import PoseDetector
from .bowling_analyzer import BowlingAnalyzer
from .batting_analyzer import BattingAnalyzer
from .video_processor import extract_video_metadata

class IntegrationService:
    """Orchestrates the complete video analysis pipeline"""
    
    def __init__(self):
        self.pose_detector = PoseDetector()
        self.bowling_analyzer = BowlingAnalyzer()
        self.batting_analyzer = BattingAnalyzer()
        
    def process_session(self, session_id: int) -> Dict[str, Any]:
        """
        Complete pipeline for processing a session
        """
        db = SessionLocal()
        try:
            # Get session from database
            session = db.query(Session).filter(Session.id == session_id).first()
            if not session:
                return {"error": f"Session {session_id} not found"}
            
            # Update status
            session.status = SessionStatus.PROCESSING.value
            db.commit()
            
            print(f"🚀 Starting analysis for session {session_id}: {session.session_type}")
            
            # Step 1: Extract video metadata
            print("   Step 1: Extracting video metadata...")
            video_path = session.video_path
            if not os.path.exists(video_path):
                raise FileNotFoundError(f"Video file not found: {video_path}")
            
            metadata = extract_video_metadata(video_path)
            session.duration = metadata.get("duration")
            session.frame_count = metadata.get("frame_count")
            
            # Step 2: Pose detection
            print("   Step 2: Running pose detection...")
            pose_report = self.pose_detector.process_video(video_path)
            
            if not pose_report or "frames" not in pose_report:
                raise Exception("No pose data extracted from video")
            
            # Step 3: Run specific analysis
            print(f"   Step 3: Running {session.session_type} analysis...")
            if session.session_type == "bowling":
                analysis_result = self.bowling_analyzer.analyze_video(video_path)
                analysis_type = "bowling"
            elif session.session_type == "batting":
                analysis_result = self.batting_analyzer.analyze_video(video_path)
                analysis_type = "batting"
            else:
                raise ValueError(f"Unknown session type: {session.session_type}")
            
            # Step 4: Create analysis record
            print("   Step 4: Saving analysis to database...")
            
            # Extract metrics
            bowling_metrics = analysis_result.get("bowling_metrics", {})
            batting_metrics = analysis_result.get("batting_metrics", {})
            
            # Create or update analysis
            analysis = db.query(Analysis).filter(Analysis.session_id == session_id).first()
            if not analysis:
                analysis = Analysis(session_id=session_id)
                db.add(analysis)
            
            # Update analysis fields
            analysis.analysis_type = analysis_type
            analysis.created_at = datetime.utcnow()
            
            # Set bowling metrics
            if bowling_metrics:
                analysis.bowling_arm = bowling_metrics.get("bowling_arm")
                analysis.bowling_style = bowling_metrics.get("bowling_style")
                analysis.elbow_extension = bowling_metrics.get("elbow_extension")
                analysis.release_height = bowling_metrics.get("release_height")
                analysis.release_speed = bowling_metrics.get("release_speed")
                analysis.swing_type = bowling_metrics.get("swing_type")
                analysis.accuracy_score = bowling_metrics.get("accuracy_score")
                analysis.front_foot_landing = bowling_metrics.get("front_foot_landing")
                analysis.icc_compliant = bowling_metrics.get("icc_compliant", True)
                analysis.violations = bowling_metrics.get("violations", [])
                analysis.recommendations = bowling_metrics.get("recommendations", [])
            
            # Set batting metrics
            if batting_metrics:
                analysis.stance_type = batting_metrics.get("stance_type")
                analysis.weight_distribution = batting_metrics.get("weight_distribution")
                analysis.bat_angle = batting_metrics.get("bat_angle")
                analysis.head_stillness = batting_metrics.get("head_stillness")
                analysis.shot_selection = batting_metrics.get("shot_selection")
                analysis.recommendations = batting_metrics.get("recommendations", [])
            
            # Store pose data summary (not full data to avoid large DB entries)
            analysis.pose_data = {
                "total_frames": len(pose_report.get("frames", [])),
                "key_events": pose_report.get("summary", {}).get("key_events", []),
                "average_metrics": pose_report.get("summary", {}).get("average_metrics", {})
            }
            
            # Generate summary
            analysis.summary = self.generate_summary(analysis_result)
            
            # Update session status
            session.status = SessionStatus.COMPLETED.value
            session.processed_at = datetime.utcnow()
            
            db.commit()
            
            print(f"✅ Analysis completed for session {session_id}")
            
            return {
                "success": True,
                "session_id": session_id,
                "analysis_id": analysis.id,
                "status": "completed",
                "analysis_type": analysis_type,
                "summary": analysis.summary
            }
            
        except Exception as e:
            print(f"❌ Error processing session {session_id}: {e}")
            
            # Update session status to failed
            if session:
                session.status = SessionStatus.FAILED.value
                db.commit()
            
            return {
                "success": False,
                "session_id": session_id,
                "error": str(e),
                "status": "failed"
            }
        
        finally:
            db.close()
    
    def generate_summary(self, analysis_result: Dict) -> str:
        """Generate a human-readable summary of the analysis"""
        
        bowling_metrics = analysis_result.get("bowling_metrics", {})
        batting_metrics = analysis_result.get("batting_metrics", {})
        
        if bowling_metrics:
            return f"""Bowling Analysis Summary:
- Bowling Arm: {bowling_metrics.get('bowling_arm', 'N/A')}
- Style: {bowling_metrics.get('bowling_style', 'N/A')}
- Elbow Extension: {bowling_metrics.get('elbow_extension', 0):.1f}°
- Estimated Speed: {bowling_metrics.get('release_speed', 0):.1f} km/h
- Swing Type: {bowling_metrics.get('swing_type', 'N/A')}
- Accuracy Score: {bowling_metrics.get('accuracy_score', 0):.1f}/100
- ICC Compliant: {'✅ Yes' if bowling_metrics.get('icc_compliant', True) else '❌ No'}
"""
        
        elif batting_metrics:
            return f"""Batting Analysis Summary:
- Stance: {batting_metrics.get('stance_type', 'N/A')}
- Weight Distribution: Front {batting_metrics.get('weight_distribution', {}).get('front', 0)}% / Back {batting_metrics.get('weight_distribution', {}).get('back', 0)}%
- Bat Angle: {batting_metrics.get('bat_angle', 0):.1f}°
- Head Stillness: {batting_metrics.get('head_stillness', 0):.1f}/100
- Shot Selection: {batting_metrics.get('shot_selection', 'N/A')}
"""
        
        return "Analysis completed. View detailed report for metrics."

# Singleton instance
integration_service = IntegrationService()