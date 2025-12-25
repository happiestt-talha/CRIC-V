import numpy as np
from typing import Dict, List, Tuple
import cv2
from .pose_service import PoseDetector

class BowlingAnalyzer:
    def __init__(self):
        self.pose_detector = PoseDetector()
        self.ICC_ELBOW_LIMIT = 15  # degrees
        self.ICC_FRONT_FOOT_LIMIT = 0  # meters behind popping crease
        
    def analyze_video(self, video_path: str) -> Dict:
        """
        Main function to analyze bowling video
        """
        # Get pose data
        pose_report = self.pose_detector.process_video(video_path)
        
        # Detect bowling phases
        phases = self.detect_bowling_phases(pose_report["frames"])
        
        # Calculate metrics
        metrics = self.calculate_bowling_metrics(pose_report["frames"], phases)
        
        # Check ICC compliance
        violations = self.check_icc_compliance(metrics)
        
        # Generate recommendations
        recommendations = self.generate_recommendations(metrics, violations)
        
        return {
            "bowling_metrics": {
                "elbow_extension": metrics["elbow_extension"],
                "arm_type": metrics["arm_type"],
                "release_point": metrics["release_point"],
                "swing_type": metrics.get("swing_type"),
                "front_foot_landing": metrics.get("front_foot_landing"),
                "icc_compliant": len(violations) == 0,
                "violations": violations,
                "recommendations": recommendations
            },
            "pose_data": pose_report
        }
    
    def detect_bowling_phases(self, frames: List[Dict]) -> Dict:
        """
        Detect different phases of bowling action
        """
        phases = {
            "run_up": [],
            "bound": [],
            "delivery_stride": [],
            "release": [],
            "follow_through": []
        }
        
        # Simple detection based on arm angles and movement
        for i, frame in enumerate(frames):
            if "metrics" not in frame:
                continue
                
            elbow_angle = frame["metrics"].get("right_elbow_angle", 0)
            
            # Detect release point (minimum elbow angle)
            if elbow_angle < 30:  # Approximate release angle
                phases["release"].append(i)
            
            # Detect front foot landing (can be extended with foot landmarks)
            # This is a simplified version
        
        return phases
    
    def calculate_bowling_metrics(self, frames: List[Dict], phases: Dict) -> Dict:
        """
        Calculate bowling-specific metrics
        """
        metrics = {}
        
        # Calculate elbow extension (max - min elbow angle)
        elbow_angles = []
        for frame in frames:
            if "metrics" in frame:
                elbow_angles.append(frame["metrics"].get("right_elbow_angle", 0))
        
        if elbow_angles:
            metrics["elbow_extension"] = max(elbow_angles) - min(elbow_angles)
        else:
            metrics["elbow_extension"] = 0
        
        # Determine arm type (right/left, fast/medium/spin)
        metrics["arm_type"] = self.classify_arm_type(frames)
        
        # Calculate release point (simplified)
        if phases["release"]:
            release_frame_idx = phases["release"][0]
            if release_frame_idx < len(frames):
                release_frame = frames[release_frame_idx]
                metrics["release_point"] = self.calculate_release_point(release_frame)
        
        # Calculate swing type
        metrics["swing_type"] = self.detect_swing_type(frames)
        
        # Calculate front foot landing
        metrics["front_foot_landing"] = self.calculate_front_foot_landing(frames)
        
        return metrics
    
    def classify_arm_type(self, frames: List[Dict]) -> str:
        """
        Classify bowling arm type
        """
        # Simplified classification
        # In reality, you'd use more sophisticated analysis
        
        # Check which arm is used for bowling
        # For simplicity, assume right-arm
        avg_speed = self.estimate_bowling_speed(frames)
        
        if avg_speed > 130:  # km/h
            return "right_arm_fast"
        elif avg_speed > 110:
            return "right_arm_medium"
        else:
            return "right_arm_spin"
    
    def estimate_bowling_speed(self, frames: List[Dict]) -> float:
        """
        Estimate bowling speed from video
        This is a simplified version - in reality, you need calibration
        """
        if len(frames) < 2:
            return 0
        
        # Calculate distance traveled by hand between frames
        # This requires camera calibration and scale
        return 120.0  # Placeholder
    
    def calculate_release_point(self, frame: Dict) -> Dict[str, float]:
        """
        Calculate release point coordinates
        """
        landmarks = frame.get("landmarks", [])
        if len(landmarks) > 16:  # Right wrist index
            wrist = landmarks[16]
            return {"x": wrist["x"], "y": wrist["y"], "z": wrist["z"]}
        
        return {"x": 0.5, "y": 0.5, "z": 0.5}
    
    def detect_swing_type(self, frames: List[Dict]) -> str:
        """
        Detect swing type (in-swing, out-swing, straight)
        """
        # Simplified detection based on seam position
        # In reality, you need ball detection and seam recognition
        return "out_swing"  # Placeholder
    
    def calculate_front_foot_landing(self, frames: List[Dict]) -> Dict[str, float]:
        """
        Calculate front foot landing position
        """
        # Simplified - would need foot landmark detection
        return {"distance_from_crease": 0.1, "is_no_ball": False}
    
    def check_icc_compliance(self, metrics: Dict) -> List[str]:
        """
        Check ICC bowling regulations
        """
        violations = []
        
        # Check elbow extension
        if metrics.get("elbow_extension", 0) > self.ICC_ELBOW_LIMIT:
            violations.append(f"Elbow extension exceeds ICC limit: {metrics['elbow_extension']:.1f}° > {self.ICC_ELBOW_LIMIT}°")
        
        # Check front foot landing
        front_foot = metrics.get("front_foot_landing", {})
        if front_foot.get("is_no_ball", False):
            violations.append("Front foot landing beyond popping crease (No-ball)")
        
        return violations
    
    def generate_recommendations(self, metrics: Dict, violations: List[str]) -> List[str]:
        """
        Generate coaching recommendations
        """
        recommendations = []
        
        # Elbow extension recommendations
        elbow_ext = metrics.get("elbow_extension", 0)
        if elbow_ext > 12:  # Close to limit
            recommendations.append("Work on maintaining a straight arm to avoid throwing")
        
        if elbow_ext < 5:
            recommendations.append("Good elbow extension within legal limits")
        
        # Release point recommendations
        release_point = metrics.get("release_point", {})
        if release_point.get("y", 0.5) < 0.4:
            recommendations.append("Try to release the ball from a higher point")
        
        # General recommendations
        if not violations:
            recommendations.append("Action is ICC compliant - good work!")
        else:
            recommendations.append("Focus on correcting the violations mentioned above")
        
        return recommendations