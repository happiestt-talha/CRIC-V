import numpy as np
from typing import Dict, List
from .pose_service import PoseDetector

class BattingAnalyzer:
    def __init__(self):
        self.pose_detector = PoseDetector()
        
    def analyze_video(self, video_path: str) -> Dict:
        """
        Main function to analyze batting video
        """
        # Get pose data
        pose_report = self.pose_detector.process_video(video_path)
        
        # Detect batting phases
        phases = self.detect_batting_phases(pose_report["frames"])
        
        # Calculate metrics
        metrics = self.calculate_batting_metrics(pose_report["frames"], phases)
        
        # Generate recommendations
        recommendations = self.generate_batting_recommendations(metrics)
        
        return {
            "batting_metrics": {
                "stance_type": metrics["stance_type"],
                "weight_distribution": metrics["weight_distribution"],
                "bat_angle": metrics["bat_angle"],
                "head_position": metrics["head_position"],
                "recommendations": recommendations
            },
            "pose_data": pose_report
        }
    
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