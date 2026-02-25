import numpy as np
from typing import Dict, List
from .pose_service import PoseDetector
from .advanced_ball_detector import AdvancedBallDetector  # NEW
class BattingAnalyzer:
    def __init__(self):
        self.pose_detector = PoseDetector()
        self.ball_detector = AdvancedBallDetector(model_path="models/cricket_ball_detector.pt")  # NEW
        
    def analyze_video(self, video_path: str) -> Dict:
        """
        Main function to analyze batting video with ball tracking
        """
        # Get pose data
        pose_report = self.pose_detector.process_video(video_path)
        frames = pose_report.get("frames", [])
        
        # Ball tracking
        ball_detections = self.ball_detector.detect_ball_in_video(video_path)
        ball_trajectory = self.ball_detector.track_ball_trajectory(video_path)
        
        # Detect bat contact (combine pose and ball)
        contact_frame, contact_point = self.detect_bat_contact(frames, ball_trajectory)

        shot_type = self.classify_shot_type(ball_trajectory, contact_point)
        shot_direction = self.classify_shot_direction(ball_trajectory, contact_point)

        if session_id:
            db = SessionLocal()
            try:
                delivery = Delivery(
                    session_id=session_id,
                    delivery_number=1,
                    speed_kmh=metrics.get("ball_speed_faced"),
                    shot_power=metrics.get("shot_power"),
                    shot_timing=metrics.get("shot_timing"),
                    shot_type=shot_type,
                    shot_direction=shot_direction,
                    runs=metrics.get("runs_predicted", 0),
                )
                db.add(delivery)
                db.commit()
            finally:
                db.close()
                
        # Calculate batting metrics
        metrics = self.calculate_batting_metrics(frames)
        
        # Add ball-based metrics
        metrics["ball_speed_faced"] = self.ball_detector.calculate_ball_speed(ball_trajectory)
        metrics["shot_power"] = self.calculate_shot_power(ball_trajectory, contact_frame)
        metrics["shot_timing"] = self.calculate_shot_timing(frames, ball_trajectory, contact_frame)
        metrics["runs_predicted"] = self.predict_runs(ball_trajectory, metrics["shot_power"])
        metrics["contact_point"] = contact_point

        # Save to database if session_id provided
        if session_id:
            self._save_delivery_to_db(session_id, ball_trajectory, metrics.get("ball_speed_faced"), 
                                      metrics, shot_type, shot_direction)
        # Generate recommendations
        recommendations = self.generate_batting_recommendations(metrics)
        
        return {
            "batting_metrics": {
                "stance_type": metrics["stance_type"],
                "weight_distribution": metrics["weight_distribution"],
                "bat_angle": metrics["bat_angle"],
                "head_position": metrics["head_position"],
                "ball_speed_faced": metrics["ball_speed_faced"],
                "shot_power": metrics["shot_power"],
                "shot_timing": metrics["shot_timing"],
                "runs_predicted": metrics["runs_predicted"],
                "contact_point": metrics["contact_point"],
                "recommendations": recommendations
            },
            "pose_data": pose_report,
            "ball_tracking": {
                "detections_count": len(ball_detections),
                "trajectory_summary": ball_trajectory.get("summary", {}),
            }
        }
    
    def detect_bat_contact(self, frames: List[Dict], ball_trajectory: Dict):
        """
        Detect frame where bat contacts ball by combining pose and ball position
        """
        if not ball_trajectory or "points_2d" not in ball_trajectory:
            return None, None
        
        ball_points = ball_trajectory["points_2d"]
        if len(ball_points) < 2:
            return None, None
        
        # Simplified: look for sudden change in ball direction (impact)
        # You can also use bat position from pose if available
        for i in range(1, len(ball_points)):
            dx = ball_points[i]["x"] - ball_points[i-1]["x"]
            dy = ball_points[i]["y"] - ball_points[i-1]["y"]
            speed = np.sqrt(dx**2 + dy**2)
            if speed > 0.1:  # threshold
                # Candidate contact frame
                return ball_points[i]["frame"], {"x": ball_points[i]["x"], "y": ball_points[i]["y"]}
        
        return None, None

    def detect_batting_phases(self, frames: List[Dict]) -> Dict:
        """
        Detect different phases of batting
        """
        phases = {
            "stance": [],
            "backlift": [],
            "shot_execution": [],
            "follow_through": []
        }
        
        # Simplified phase detection
        for i, frame in enumerate(frames):
            if i < len(frames) * 0.3:
                phases["stance"].append(i)
            elif i < len(frames) * 0.6:
                phases["backlift"].append(i)
            elif i < len(frames) * 0.9:
                phases["shot_execution"].append(i)
            else:
                phases["follow_through"].append(i)
        
        return phases
    
    def calculate_batting_metrics(self, frames: List[Dict], phases: Dict) -> Dict:
        """
        Calculate batting-specific metrics
        """
        metrics = {}
        
        # Analyze stance
        stance_frames = [frames[i] for i in phases["stance"] if i < len(frames)]
        metrics.update(self.analyze_stance(stance_frames))
        
        # Analyze weight distribution
        metrics["weight_distribution"] = self.calculate_weight_distribution(frames)
        
        # Analyze bat angle
        metrics["bat_angle"] = self.calculate_bat_angle(frames)
        
        # Analyze head position
        metrics["head_position"] = self.analyze_head_movement(frames)
        
        return metrics
    
    def analyze_stance(self, frames: List[Dict]) -> Dict:
        """
        Analyze batting stance
        """
        if not frames:
            return {"stance_type": "unknown"}
        
        # Get shoulder positions from first frame
        frame = frames[0]
        landmarks = frame.get("landmarks", [])
        
        if len(landmarks) < 13:  # Need shoulder landmarks
            return {"stance_type": "unknown"}
        
        left_shoulder = landmarks[11]
        right_shoulder = landmarks[12]
        
        # Determine stance based on shoulder alignment
        shoulder_diff = left_shoulder["x"] - right_shoulder["x"]
        
        if shoulder_diff > 0.05:
            return {"stance_type": "open_stance"}
        elif shoulder_diff < -0.05:
            return {"stance_type": "closed_stance"}
        else:
            return {"stance_type": "square_stance"}
    
    def calculate_weight_distribution(self, frames: List[Dict]) -> Dict[str, float]:
        """
        Calculate weight distribution between feet
        """
        # Simplified calculation
        # In reality, you'd analyze center of mass
        return {"front_foot": 45, "back_foot": 55, "balance_score": 8.5}
    
    def calculate_bat_angle(self, frames: List[Dict]) -> float:
        """
        Calculate bat angle during stance
        """
        if not frames:
            return 0.0
        
        # Simplified - would need bat detection
        # For now, return a placeholder
        return 25.0  # degrees
    
    def analyze_head_movement(self, frames: List[Dict]) -> Dict[str, float]:
        """
        Analyze head stillness
        """
        head_positions = []
        for frame in frames:
            landmarks = frame.get("landmarks", [])
            if len(landmarks) > 0:  # Nose landmark index 0
                nose = landmarks[0]
                head_positions.append([nose["x"], nose["y"]])
        
        if not head_positions:
            return {"stillness": 0, "movement": 0}
        
        head_positions = np.array(head_positions)
        movement = np.std(head_positions, axis=0).sum()
        stillness = max(0, 10 - movement)  # Higher is better
        
        return {"stillness": float(stillness), "movement": float(movement)}
    
    def generate_batting_recommendations(self, metrics: Dict) -> List[str]:
        """
        Generate batting coaching recommendations
        """
        recommendations = []
        
        # Stance recommendations
        stance = metrics.get("stance_type", "")
        if stance == "open_stance":
            recommendations.append("Open stance detected - ensure you're not exposing off stump")
        elif stance == "closed_stance":
            recommendations.append("Closed stance detected - watch for lbw decisions")
        
        # Weight distribution
        weight_dist = metrics.get("weight_distribution", {})
        front_weight = weight_dist.get("front_foot", 50)
        if front_weight < 40:
            recommendations.append("Consider transferring more weight to front foot during shot")
        
        # Head position
        head_pos = metrics.get("head_position", {})
        if head_pos.get("stillness", 0) < 5:
            recommendations.append("Work on keeping your head still during the shot")
        else:
            recommendations.append("Good head position - keep it up!")
        
        return recommendations
    
    def calculate_shot_power(self, ball_trajectory: Dict, contact_frame) -> float:
        """
        Estimate shot power based on ball speed after contact
        """
        if not ball_trajectory or "points_2d" not in ball_trajectory or contact_frame is None:
            return 50.0  # default
        
        points = ball_trajectory["points_2d"]
        # Find index of contact
        contact_idx = None
        for i, p in enumerate(points):
            if p.get("frame") == contact_frame:
                contact_idx = i
                break
        
        if contact_idx is None or contact_idx >= len(points)-1:
            return 50.0
        
        # Calculate speed after contact (next few frames)
        after = points[contact_idx+1: min(contact_idx+5, len(points))]
        if len(after) < 2:
            return 50.0
        
        dx = after[-1]["x"] - after[0]["x"]
        dy = after[-1]["y"] - after[0]["y"]
        distance = np.sqrt(dx**2 + dy**2)
        # Rough conversion to power scale (0-100)
        power = min(distance * 1000, 100)
        return round(power, 1)
    
    def calculate_shot_timing(self, frames: List[Dict], ball_trajectory: Dict, contact_frame) -> float:
        """
        Calculate timing (0-100) based on how early/late the ball was hit relative to ideal
        """
        # Simplified: return a placeholder
        return 75.0
    
    def predict_runs(self, ball_trajectory: Dict, power: float) -> int:
        """
        Predict runs based on trajectory and power
        """
        if not ball_trajectory or "points_2d" not in ball_trajectory:
            return 0
        
        points = ball_trajectory["points_2d"]
        if len(points) < 2:
            return 0
        
        # Check if ball ends near boundary (simplified)
        last = points[-1]
        # Assuming normalized coordinates, boundary is near edges (x near 0 or 1)
        if last["x"] < 0.1 or last["x"] > 0.9 or last["y"] < 0.1 or last["y"] > 0.9:
            # Check height to differentiate four vs six
            if last["y"] < 0.2:  # high trajectory -> six
                return 6
            else:
                return 4
        elif power > 80:
            return 2
        elif power > 50:
            return 1
        else:
            return 0
    
    def classify_shot_type(trajectory, contact_point):
    # Simplified: based on bat angle and ball trajectory after contact
    # For now, return a placeholder
        return "drive"

    def classify_shot_direction(trajectory, contact_point):
    # Determine direction based on ball's path after contact
        if not trajectory or "points_2d" not in trajectory:
            return "straight"
        points = trajectory["points_2d"]
        if len(points) < 3:
            return "straight"
        # Find point after contact
        contact_idx = None
        for i, p in enumerate(points):
            if p.get("frame") == contact_point.get("frame"):
                contact_idx = i
                break
        if contact_idx is None or contact_idx >= len(points)-1:
            return "straight"
        after = points[contact_idx+1]
        dx = after["x"] - contact_point["x"]
        if dx < -0.1:
            return "cover"  # left side
        elif dx > 0.1:
            return "midwicket"  # right side
        else:
            return "straight"

    def _save_delivery_to_db(self, session_id: int, ball_trajectory: dict, ball_speed: float, 
                            metrics: dict, shot_type: str, shot_direction: str):
        """Save batting delivery to database"""
        from app.database import SessionLocal
        from app.core.models import Delivery

        # Determine runs (from predict_runs)
        runs = metrics.get("runs_predicted", 0)

        db = SessionLocal()
        try:
            # For now, assume one delivery per session (you can increment delivery_number later)
            delivery = Delivery(
                session_id=session_id,
                delivery_number=1,
                speed_kmh=ball_speed,
                shot_power=metrics.get("shot_power"),
                shot_timing=metrics.get("shot_timing"),
                shot_type=shot_type,
                shot_direction=shot_direction,
                runs=runs
            )
            db.add(delivery)
            db.commit()
        finally:
            db.close()