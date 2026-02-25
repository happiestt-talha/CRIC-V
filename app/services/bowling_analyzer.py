import numpy as np
from app.services.advanced_ball_detector import AdvancedBallDetector
from typing import Dict, List, Tuple
import cv2
from scipy.spatial.transform import Rotation
from .pose_service import PoseDetector
from app.analytics.pitch_mapping import classify_line, classify_length, get_line_length_score
from app.core.models import Delivery
from sqlalchemy import func
from app.database import SessionLocal

class BowlingAnalyzer:
    def __init__(self, ball_model_path="models/cricket_ball_detector.pt"):
        self.pose_detector = PoseDetector()
        self.ball_detector = AdvancedBallDetector(model_path=ball_model_path)  # NEW
        
        # ICC Regulations
        self.ICC_ELBOW_EXTENSION_LIMIT = 15  # degrees (Law 21.3)
        self.ICC_FRONT_FOOT_LIMIT = 0.0      # Must land behind popping crease
        
        # Bowling action types
        self.BOWLING_ACTIONS = {
            "right_arm_fast": {"elbow_range": (0, 15), "release_height": "high"},
            "right_arm_medium": {"elbow_range": (5, 20), "release_height": "medium"},
            "right_arm_spin": {"elbow_range": (10, 30), "release_height": "variable"},
            "left_arm_fast": {"elbow_range": (0, 15), "release_height": "high"},
            "left_arm_spin": {"elbow_range": (10, 30), "release_height": "variable"},
        }
        
        # Swing detection parameters
        self.SWING_THRESHOLDS = {
            "in_swing": {"seam_angle": (0, 30), "drift": "into_right_hander"},
            "out_swing": {"seam_angle": (150, 180), "drift": "away_right_hander"},
            "reverse_swing": {"condition": "old_ball", "speed": "high"}
        }
    
    def analyze_bowling_action(self, video_path: str, player_info: Dict = None, session_id: int = None) -> Dict:
        """
        Complete bowling action analysis with ICC compliance checks
        """
        print(f"🔍 Analyzing bowling video: {video_path}")
        
        # Step 1: Pose Detection
        pose_data = self.pose_detector.process_video(video_path)
        
        if not pose_data or "frames" not in pose_data:
            return {"error": "No pose data extracted"}
        
        frames = pose_data["frames"]
        
        # Step 2: Detect Bowling Arm
        bowling_arm = self.detect_bowling_arm(frames)
        print(f"   Detected bowling arm: {bowling_arm}")
        
        # Step 3: Extract Key Metrics
        metrics = self.extract_bowling_metrics(frames, bowling_arm)
        
        # Step 4: Detect Swing Type
        swing_type = self.detect_swing_type(frames, bowling_arm)
        metrics["swing_type"] = swing_type
        
        # Step 5: ICC Compliance Check
        violations = self.check_icc_compliance(metrics, bowling_arm)
        
        # Step 6: Generate Coaching Recommendations
        recommendations = self.generate_coaching_recommendations(metrics, violations)
        
        # Step 7: Classify Bowling Style
        bowling_style = self.classify_bowling_style(metrics, bowling_arm)
        
        # Prepare final report
        report = {
            "player_info": player_info,
            "bowling_metrics": {
                "bowling_arm": bowling_arm,
                "bowling_style": bowling_style,
                "elbow_extension": round(metrics.get("elbow_extension", 0), 2),
                "release_point": metrics.get("release_point", {}),
                "front_foot_landing": metrics.get("front_foot_landing", {}),
                "swing_type": swing_type,
                "average_speed_kmh": metrics.get("estimated_speed", 0),
                "accuracy_score": metrics.get("accuracy_score", 0),
            },
            "icc_compliance": {
                "is_compliant": len(violations) == 0,
                "violations": violations,
                "elbow_extension_status": "Legal" if metrics.get("elbow_extension", 0) <= self.ICC_ELBOW_EXTENSION_LIMIT else "Illegal",
                "front_foot_status": "Legal" if not metrics.get("front_foot_landing", {}).get("is_no_ball", False) else "No-ball"
            },
            "coaching_recommendations": recommendations,
            "pose_data_summary": {
                "total_frames": len(frames),
                "frames_with_pose": sum(1 for f in frames if f.get("landmarks")),
                "key_events": self.detect_key_events(frames, bowling_arm)
            }
        }
        # After computing all metrics, save to DB if session_id provided
        if session_id:
            self._save_delivery_to_db(session_id, ball_trajectory, ball_speed, ball_spin, metrics)
        return report
    
    def detect_bowling_arm(self, frames: List[Dict]) -> str:
        """
        Detect which arm is used for bowling (right/left)
        """
        right_arm_angles = []
        left_arm_angles = []
        
        for frame in frames:
            if "metrics" in frame:
                right_arm_angles.append(frame["metrics"].get("right_elbow_angle", 0))
                left_arm_angles.append(frame["metrics"].get("left_elbow_angle", 0))
        
        # Compare arm movement ranges
        if right_arm_angles and left_arm_angles:
            right_range = max(right_arm_angles) - min(right_arm_angles)
            left_range = max(left_arm_angles) - min(left_arm_angles)
            
            # The arm with larger movement range is likely the bowling arm
            if right_range > left_range * 1.5:
                return "right"
            elif left_range > right_range * 1.5:
                return "left"
        
        # Default to right arm (most common)
        return "right"
    
    def extract_bowling_metrics(self, frames: List[Dict], bowling_arm: str) -> Dict:
        """
        Extract detailed bowling metrics
        """
        metrics = {}
        
        # Get arm-specific landmarks
        if bowling_arm == "right":
            shoulder_idx, elbow_idx, wrist_idx = 12, 14, 16  # MediaPipe indices
            hip_idx, knee_idx, ankle_idx = 24, 26, 28  # Right leg
        else:
            shoulder_idx, elbow_idx, wrist_idx = 11, 13, 15  # Left arm
            hip_idx, knee_idx, ankle_idx = 23, 25, 27  # Left leg
        
        # Collect data across frames
        elbow_angles = []
        release_points = []
        front_foot_positions = []
        
        for i, frame in enumerate(frames):
            landmarks = frame.get("landmarks", [])
            if len(landmarks) > max(shoulder_idx, elbow_idx, wrist_idx, hip_idx, knee_idx, ankle_idx):
                # Elbow angle
                shoulder = landmarks[shoulder_idx]
                elbow = landmarks[elbow_idx]
                wrist = landmarks[wrist_idx]
                
                angle = self.calculate_angle(shoulder, elbow, wrist)
                elbow_angles.append((i, angle))
                
                # Release point detection (minimum elbow angle)
                if angle < 30:  # Approximate release angle
                    release_points.append({
                        "frame": i,
                        "position": {"x": wrist["x"], "y": wrist["y"], "z": wrist["z"]},
                        "angle": angle
                    })
                
                # Front foot landing (simplified)
                if i > len(frames) * 0.6:  # Later in action
                    ankle = landmarks[ankle_idx]
                    front_foot_positions.append({
                        "frame": i,
                        "y_position": ankle["y"],  # Vertical position
                        "x_position": ankle["x"]   # Horizontal position
                    })
        
        # Calculate metrics
        if elbow_angles:
            angles = [a[1] for a in elbow_angles]
            metrics["elbow_extension"] = max(angles) - min(angles)
            metrics["max_elbow_angle"] = max(angles)
            metrics["min_elbow_angle"] = min(angles)
        
        # Find optimal release point
        if release_points:
            # Use the point with minimum elbow angle as release
            best_release = min(release_points, key=lambda x: x["angle"])
            metrics["release_point"] = best_release["position"]
            metrics["release_frame"] = best_release["frame"]
        
        # Analyze front foot landing
        if front_foot_positions:
            # Find when foot is at lowest point (landing)
            landing = min(front_foot_positions, key=lambda x: x["y_position"])
            metrics["front_foot_landing"] = {
                "frame": landing["frame"],
                "position": landing,
                "is_no_ball": landing["x_position"] > 0.95  # Simplified - would need calibration
            }
        
        # Estimate bowling speed (simplified - requires calibration)
        metrics["estimated_speed"] = self.estimate_bowling_speed(frames, bowling_arm)
        
        # Calculate accuracy score
        metrics["accuracy_score"] = self.calculate_accuracy_score(frames, bowling_arm)
        
        return metrics
    
    def calculate_angle(self, point1: Dict, point2: Dict, point3: Dict) -> float:
        """
        Calculate angle between three points (point2 is vertex)
        """
        import math
        
        # Convert to vectors
        v1 = np.array([point1["x"] - point2["x"], point1["y"] - point2["y"]])
        v2 = np.array([point3["x"] - point2["x"], point3["y"] - point2["y"]])
        
        # Calculate angle
        dot_product = np.dot(v1, v2)
        norm_product = np.linalg.norm(v1) * np.linalg.norm(v2)
        
        if norm_product == 0:
            return 0
        
        cos_angle = dot_product / norm_product
        cos_angle = np.clip(cos_angle, -1.0, 1.0)
        angle = math.degrees(math.acos(cos_angle))
        
        return angle
    
    def detect_swing_type(self, frames: List[Dict], bowling_arm: str, ball_trajectory=None) -> str:
        """
        Detect swing type based on arm action and ball trajectory
        """
        # If ball trajectory is available and shows lateral movement
        if ball_trajectory and "points_2d" in ball_trajectory and len(ball_trajectory["points_2d"]) > 10:
            points = ball_trajectory["points_2d"]
            # Compute lateral deviation (simplified)
            start_x = points[0]["x"]
            end_x = points[-1]["x"]
            delta = end_x - start_x
            if abs(delta) > 0.1:  # threshold depends on scale
                return "in_swing" if (bowling_arm == "right" and delta < 0) or (bowling_arm == "left" and delta > 0) else "out_swing"
        
        # Fallback to pose-based detection (as before)
        if len(frames) < 10:
            return "unknown"
        
        # Get release frame metrics
        release_frame = None
        for frame in frames:
            if frame.get("metrics", {}).get("right_elbow_angle", 180) < 40:
                release_frame = frame
                break
        
        if not release_frame:
            return "straight"
        
        landmarks = release_frame.get("landmarks", [])
        if len(landmarks) > 12:
            left_shoulder = landmarks[11]
            right_shoulder = landmarks[12]
            shoulder_tilt = right_shoulder["y"] - left_shoulder["y"]
            
            if shoulder_tilt > 0.05:
                return "out_swing" if bowling_arm == "right" else "in_swing"
            elif shoulder_tilt < -0.05:
                return "in_swing" if bowling_arm == "right" else "out_swing"
        
        return "straight"
    
    def check_icc_compliance(self, metrics: Dict, bowling_arm: str) -> List[str]:
        """
        Check ICC bowling regulations
        """
        violations = []
        
        # 1. Elbow Extension Check (Law 21.3)
        elbow_extension = metrics.get("elbow_extension", 0)
        if elbow_extension > self.ICC_ELBOW_EXTENSION_LIMIT:
            violations.append({
                "rule": "Law 21.3 - Illegal Bowling Action",
                "detail": f"Elbow extension of {elbow_extension:.1f}° exceeds ICC limit of {self.ICC_ELBOW_EXTENSION_LIMIT}°",
                "severity": "high"
            })
        elif elbow_extension > self.ICC_ELBOW_EXTENSION_LIMIT * 0.8:
            violations.append({
                "rule": "Law 21.3 - Warning",
                "detail": f"Elbow extension of {elbow_extension:.1f}° is close to ICC limit",
                "severity": "medium"
            })
        
        # 2. Front Foot Landing Check (Law 24.5)
        front_foot = metrics.get("front_foot_landing", {})
        if front_foot.get("is_no_ball", False):
            violations.append({
                "rule": "Law 24.5 - No Ball",
                "detail": "Front foot landing beyond popping crease",
                "severity": "medium"
            })
        
        # 3. Arm Action Consistency
        # (Could add more checks here)
        
        return violations
    
    def generate_coaching_recommendations(self, metrics: Dict, violations: List[Dict]) -> List[str]:
        """
        Generate actionable coaching recommendations
        """
        recommendations = []
        
        # Elbow extension recommendations
        elbow_ext = metrics.get("elbow_extension", 0)
        if elbow_ext > 12:
            recommendations.append("⚠️ Work on maintaining a straighter arm through delivery")
            recommendations.append("💡 Practice with a brace to limit elbow flexion")
        elif elbow_ext < 5:
            recommendations.append("✅ Excellent elbow extension - within legal limits")
        
        # Front foot landing
        front_foot = metrics.get("front_foot_landing", {})
        if front_foot.get("is_no_ball", False):
            recommendations.append("🚫 Front foot landing needs adjustment to avoid no-balls")
            recommendations.append("💡 Practice landing with toe behind the crease line")
        
        # Swing type recommendations
        swing_type = metrics.get("swing_type", "")
        if swing_type == "in_swing":
            recommendations.append("🔄 In-swing detected - maintain upright seam position")
        elif swing_type == "out_swing":
            recommendations.append("🔄 Out-swing detected - work on late swing")
        
        # General recommendations
        if not violations:
            recommendations.append("🎯 Action is ICC compliant - focus on consistency")
        
        # Add speed recommendations if available
        speed = metrics.get("estimated_speed", 0)
        if speed > 0:
            if speed < 120:
                recommendations.append("⚡ Work on generating more pace through hip drive")
            elif speed > 140:
                recommendations.append("⚡ Excellent pace - focus on accuracy")
        
        return recommendations
    
    def classify_bowling_style(self, metrics: Dict, bowling_arm: str) -> str:
        """
        Classify bowling style (fast, medium, spin)
        """
        speed = metrics.get("estimated_speed", 0)
        elbow_ext = metrics.get("elbow_extension", 0)
        
        if speed > 130:  # km/h
            style = "fast"
        elif speed > 110:
            style = "medium"
        else:
            style = "spin"
        
        return f"{bowling_arm}_arm_{style}"
    
    def calculate_accuracy_score(self, frames: List[Dict], bowling_arm: str) -> float:
        """
        Calculate bowling accuracy score (0-100)
        """
        # Simplified accuracy calculation
        # Would need target detection and landing position analysis
        
        # Placeholder logic
        score = 75.0
        
        # Adjust based on consistency of release points
        release_points = []
        for frame in frames:
            if frame.get("metrics", {}).get("right_elbow_angle", 180) < 40:
                landmarks = frame.get("landmarks", [])
                if landmarks:
                    wrist_idx = 16 if bowling_arm == "right" else 15
                    if len(landmarks) > wrist_idx:
                        release_points.append(landmarks[wrist_idx])
        
        if len(release_points) > 2:
            # Calculate consistency of release points
            x_positions = [p["x"] for p in release_points]
            y_positions = [p["y"] for p in release_points]
            
            x_std = np.std(x_positions)
            y_std = np.std(y_positions)
            
            consistency = 100 * (1 - (x_std + y_std) / 2)
            score = max(0, min(100, consistency))
        
        return round(score, 1)
    
    def detect_key_events(self, frames: List[Dict], bowling_arm: str) -> List[Dict]:
        """
        Detect key events in bowling action
        """
        events = []
        
        for i, frame in enumerate(frames):
            metrics = frame.get("metrics", {})
            
            # Detect back foot contact
            if i < len(frames) * 0.3 and metrics.get("right_knee_angle", 180) < 100:
                events.append({"frame": i, "event": "back_foot_contact", "description": "Back foot lands"})
            
            # Detect front foot landing
            if i > len(frames) * 0.6 and metrics.get("left_knee_angle", 180) < 120:
                events.append({"frame": i, "event": "front_foot_landing", "description": "Front foot lands"})
            
            # Detect ball release (minimum elbow angle)
            elbow_key = "right_elbow_angle" if bowling_arm == "right" else "left_elbow_angle"
            if metrics.get(elbow_key, 180) < 35:
                events.append({"frame": i, "event": "ball_release", "description": "Ball released"})
        
        return events
    
    def analyze_bowling_action(self, video_path: str, player_info: Dict = None, session_id: int = None) -> Dict:
        """
        Complete bowling action analysis with ICC compliance checks and ball tracking
        """
        print(f"🔍 Analyzing bowling video: {video_path}")
        
        # Step 1: Pose Detection
        pose_data = self.pose_detector.process_video(video_path)
        
        if not pose_data or "frames" not in pose_data:
            return {"error": "No pose data extracted"}
        
        frames = pose_data["frames"]
        
        # Step 2: Ball Tracking
        print("   Tracking ball...")
        ball_detections = self.ball_detector.detect_ball_in_video(video_path)
        ball_trajectory = self.ball_detector.track_ball_trajectory(video_path)
        
        # Calculate ball metrics
        ball_speed = self.ball_detector.calculate_ball_speed(ball_trajectory)
        ball_spin = self.ball_detector.calculate_spin_rate(ball_detections)
        ball_type = self.classify_ball_type(ball_trajectory, ball_speed)
        
        # Step 3: Detect Bowling Arm
        bowling_arm = self.detect_bowling_arm(frames)
        print(f"   Detected bowling arm: {bowling_arm}")
        
        # Step 4: Extract Key Metrics (pose-based)
        metrics = self.extract_bowling_metrics(frames, bowling_arm)
        
        # Add ball tracking metrics
        metrics["speed_kmh"] = ball_speed
        metrics["spin_rpm"] = ball_spin
        metrics.update(ball_type)
        
        # Step 5: Detect Swing Type (combine pose and ball data)
        swing_type = self.detect_swing_type(frames, bowling_arm, ball_trajectory)
        metrics["swing_type"] = swing_type
        
        # Step 6: ICC Compliance Check
        violations = self.check_icc_compliance(metrics, bowling_arm)
        
        # Step 7: Calculate Performance Score
        performance_score = self.calculate_performance_score(metrics)
        metrics["performance_score"] = performance_score
        
        # Step 8: Generate Coaching Recommendations
        recommendations = self.generate_coaching_recommendations(metrics, violations)
        
        # Step 9: Classify Bowling Style
        bowling_style = self.classify_bowling_style(metrics, bowling_arm)
        
        # Prepare final report
        report = {
            "player_info": player_info,
            "bowling_metrics": {
                "bowling_arm": bowling_arm,
                "bowling_style": bowling_style,
                "elbow_extension": round(metrics.get("elbow_extension", 0), 2),
                "release_point": metrics.get("release_point", {}),
                "front_foot_landing": metrics.get("front_foot_landing", {}),
                "swing_type": swing_type,
                "speed_kmh": ball_speed,
                "spin_rpm": ball_spin,
                "is_yorker": metrics.get("is_yorker", False),
                "is_bouncer": metrics.get("is_bouncer", False),
                "is_full_toss": metrics.get("is_full_toss", False),
                "accuracy_score": metrics.get("accuracy_score", 0),
                "performance_score": performance_score,
            },
            "icc_compliance": {
                "is_compliant": len(violations) == 0,
                "violations": violations,
                "elbow_extension_status": "Legal" if metrics.get("elbow_extension", 0) <= self.ICC_ELBOW_EXTENSION_LIMIT else "Illegal",
                "front_foot_status": "Legal" if not metrics.get("front_foot_landing", {}).get("is_no_ball", False) else "No-ball"
            },
            "coaching_recommendations": recommendations,
            "pose_data_summary": {
                "total_frames": len(frames),
                "frames_with_pose": sum(1 for f in frames if f.get("landmarks")),
                "key_events": self.detect_key_events(frames, bowling_arm)
            },
            "ball_tracking": {
                "detections_count": len(ball_detections),
                "trajectory_summary": ball_trajectory.get("summary", {}),
                "average_speed": ball_speed,
                "max_speed": ball_speed,  # could compute from trajectory
            }
        }
        
        return report
    
    def classify_ball_type(self, trajectory, speed):
        """Classify as yorker, bouncer, full toss, etc."""
        result = {"is_yorker": False, "is_bouncer": False, "is_full_toss": False}
        if not trajectory or "points_2d" not in trajectory:
            return result
        
        points = trajectory.get("points_2d", [])
        if len(points) < 10:
            return result
        
        # Find minimum y (height) after release
        heights = [p["y"] for p in points[5:]]  # skip first few frames
        if not heights:
            return result
        min_height = min(heights)
        
        # Rough classification (assuming normalized coordinates, y=1 top, y=0 bottom)
        # Adjust thresholds based on your camera setup
        if min_height < 0.2:
            result["is_yorker"] = True
        elif min_height > 0.8:
            result["is_bouncer"] = True
        elif min_height > 0.4:
            result["is_full_toss"] = True
        return result
    
    def calculate_performance_score(self, metrics):
        """Overall performance score (0-100) combining speed, accuracy, spin"""
        speed = metrics.get("speed_kmh", 0)
        accuracy = metrics.get("accuracy_score", 50)
        spin = metrics.get("spin_rpm", 0)
        
        # Normalize speed: 150 km/h = 100 points
        speed_score = min(speed / 150 * 40, 40)
        accuracy_score = accuracy * 0.4
        spin_score = min(spin / 1000 * 20, 20)
        
        total = speed_score + accuracy_score + spin_score
        return round(min(total, 100), 1)

    def _save_delivery_to_db(self, session_id: int, ball_trajectory: dict, ball_speed: float, ball_spin: float, metrics: dict):
        """
        Save the analyzed delivery to the database.
        """
        # Get pitch landing point from ball_trajectory
        pitch_point = ball_trajectory.get("pitch_landing")
        if pitch_point:
            line = classify_line(pitch_point["x"])
            length = classify_length(pitch_point["y"])
        else:
            line = length = None

        # Determine if boundary
        is_boundary = False
        boundary_type = None
        runs = 0
        if ball_trajectory and "final_position" in ball_trajectory:
            final = ball_trajectory["final_position"]
            if final["x"] < 0.1 or final["x"] > 0.9 or final["y"] < 0.1:
                is_boundary = True
                if final["y"] < 0.2:  # high trajectory -> six
                    boundary_type = "six"
                    runs = 6
                else:
                    boundary_type = "four"
                    runs = 4

        # Get release point from pose metrics
        release = metrics.get("release_point", {})
        elbow_ext = metrics.get("elbow_extension")

        # Auto-increment delivery_number
        db = SessionLocal()
        try:
            # Get current max delivery number for this session
            max_num = db.query(func.max(Delivery.delivery_number)).filter(Delivery.session_id == session_id).scalar()
            delivery_number = (max_num or 0) + 1

            delivery = Delivery(
                session_id=session_id,
                delivery_number=delivery_number,
                speed_kmh=ball_speed,
                spin_rpm=ball_spin,
                swing_angle=metrics.get("swing_angle", 0),
                pitch_landing_x=pitch_point["x"] if pitch_point else None,
                pitch_landing_y=pitch_point["y"] if pitch_point else None,
                line=line,
                length=length,
                is_boundary=is_boundary,
                boundary_type=boundary_type,
                runs=runs,
                elbow_extension=elbow_ext,
                release_point_x=release.get("x"),
                release_point_y=release.get("y"),
                release_point_z=release.get("z"),
            )
            db.add(delivery)
            db.commit()
        finally:
            db.close()

    
    # For estimate_bowling_speed, you could replace it with:
    def estimate_bowling_speed(self, frames, bowling_arm):
        # This method is now superseded by ball tracking; return 0 or use ball tracker
        return 0.0