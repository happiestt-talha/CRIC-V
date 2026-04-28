#app/services/batting_analyzer.py
import os
import cv2
import numpy as np
from typing import Dict, List, Any
from app.services.pose_service import PoseDetector
from app.services.shot_classifier import ShotClassifier
from app.core.models import Analysis, Delivery
from app.database import SessionLocal

class BattingAnalyzer:
    def __init__(self):
        self.pose_detector = PoseDetector()
        self.shot_classifier = ShotClassifier()

    def analyze_video(self, video_path: str, session_id: int = None) -> Dict:
        """
        Complete batting analysis:
        1. Extract pose keypoints
        2. Segment into shots
        3. Classify each shot
        4. Aggregate results
        """
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video not found at {video_path}")

        # 1. Extract Pose Keypoints
        pose_report = self.pose_detector.process_video(video_path)
        frames = pose_report.get("frames", [])
        fps = pose_report.get("metadata", {}).get("fps", 30)

        if not frames:
            return {"error": "No pose detected in video"}

        # 2. Segment Video into Shots
        # Heuristic: Detect shots by peaks in wrist movement and bat angle
        shots_metadata = self._segment_shots(frames)
        
        analyzed_shots = []
        shot_distribution = {}

        for i, shot_meta in enumerate(shots_metadata):
            start_f = int(shot_meta["start_frame"])
            end_f = int(shot_meta["end_frame"])
            shot_frames = frames[start_f:end_f+1]
            
            # Prepare keypoints for classifier
            # Classifier expects dict of {landmark_id: {x,y,z}}
            sequence = []
            for f in shot_frames:
                if f.get("landmarks"):
                    sequence.append({lm["id"]: lm for lm in f["landmarks"]})
            
            if not sequence:
                continue

            # 3. Classify Shot
            shot_result = self.shot_classifier.classify_shot(sequence)
            shot_type = shot_result["shot_type"]
            
            # Update distribution
            shot_distribution[shot_type] = shot_distribution.get(shot_type, 0) + 1
            
            # Store detail
            analyzed_shots.append({
                "shot_number": i + 1,
                "shot_type": shot_type,
                "start_frame": start_f,
                "end_frame": end_f,
                "quality_score": shot_result["quality_score"],
                "bat_angle": shot_result["bat_angle"],
                "stride_length": shot_result["stride_length"],
                "head_position": {"stable": shot_result["head_position"] == "stable", "deviation_cm": 1.2}, # placeholder deviation
                "weight_distribution": {"front": 65 if shot_result["weight_distribution"] == "front_foot" else 35, 
                                       "back": 35 if shot_result["weight_distribution"] == "front_foot" else 65},
                "footwork_score": shot_result["footwork_score"],
                "timing_score": shot_result["timing_score"],
                "recommendations": shot_result["recommendations"]
            })

        # 4. Aggregate Session Summary
        total_shots = len(analyzed_shots)
        avg_quality = sum(s["quality_score"] for s in analyzed_shots) / total_shots if total_shots > 0 else 0
        
        # Determine stance type from first few frames
        stance_type = self._detect_stance(frames[:int(fps)])

        report = {
            "session_summary": {
                "total_shots": total_shots,
                "shot_distribution": shot_distribution,
                "average_quality_score": round(avg_quality, 1),
                "stance_type": stance_type,
                "consistency_score": 75 # placeholder
            },
            "shots": analyzed_shots
        }

        # Do NOT call _save_to_db here — integration_service handles all DB writes
        return report

    def _segment_shots(self, frames: List[Dict]) -> List[Dict]:
        """
        Detect shot segments.
        A shot is roughly defined as a period where the wrists move significantly.
        """
        shots = []
        # Simplified: if video is short, assume one shot. 
        # For longer videos, look for wrist vertical velocity peaks.
        
        # Real segmentation logic...
        # For now, let's divide into logical segments where pose is detected
        # In a real scenario, we'd use a rolling window to find movement bursts
        
        if len(frames) < 60: # less than 2 seconds
            return [{"start_frame": 0, "end_frame": len(frames)-1}]
        
        # Simple windowing as placeholder for complex detection
        # We'll split the video into 2-second chunks if it's long
        chunk_size = 60
        for i in range(0, len(frames), chunk_size):
            if i + chunk_size <= len(frames):
                shots.append({"start_frame": i, "end_frame": i + chunk_size - 1})
        
        return shots

    def _detect_stance(self, frames: List[Dict]) -> str:
        """Analyze shoulder orientation to camera to determine stance"""
        for frame in frames:
            landmarks = frame.get("landmarks")
            if not landmarks: continue
            
            # Map indices
            l_shoulder = next((l for l in landmarks if l["id"] == 11), None)
            r_shoulder = next((l for l in landmarks if l["id"] == 12), None)
            
            if l_shoulder and r_shoulder:
                # Shoulder x-distance
                dist = abs(l_shoulder["x"] - r_shoulder["x"])
                if dist < 0.1: return "side-on"
                if dist > 0.2: return "open"
        return "side-on"

    def _save_to_db(self, session_id: int, report: Dict):
        """Persist analysis result to DB"""
        db = SessionLocal()
        try:
            # Update or Create Analysis
            analysis = db.query(Analysis).filter(Analysis.session_id == session_id).first()
            if not analysis:
                analysis = Analysis(session_id=session_id)
                db.add(analysis)

            analysis.analysis_type = "batting"
            
            summary = report["session_summary"]
            shots = report.get("shots", [])
            analysis.bat_angle = (
                sum(s["bat_angle"] for s in shots if s.get("bat_angle") is not None) / len(shots)
                if shots else None
            )
            analysis.head_stillness = (
                sum(s.get("quality_score", 0) for s in shots) / len(shots)
                if shots else None
            )
            analysis.shot_selection = shots[0].get("shot_type") if shots else None
            analysis.stance_type = summary["stance_type"]
            analysis.weight_distribution = shots[0].get("weight_distribution") if shots else None
            analysis.recommendations = shots[0].get("recommendations", []) if shots else []
            
            # Update Session Status
            from app.core.models import Session
            session = db.query(Session).filter(Session.id == session_id).first()
            if session:
                session.status = "completed"
            
            db.commit()
        finally:
            db.close()