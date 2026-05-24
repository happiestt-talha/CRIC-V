import numpy as np
from typing import List, Dict, Optional

class ShotClassifier:
    def __init__(self):
        # MediaPipe landmark indices
        self.L_SHOULDER = 11
        self.R_SHOULDER = 12
        self.L_ELBOW = 13
        self.R_ELBOW = 14
        self.L_WRIST = 15
        self.R_WRIST = 16
        self.L_HIP = 23
        self.R_HIP = 24
        self.L_KNEE = 25
        self.R_KNEE = 26
        self.L_ANKLE = 27
        self.R_ANKLE = 28
        self.NOSE = 0

    def calculate_angle(self, a: Dict, b: Dict, c: Dict) -> float:
        """Calculate angle at point_b formed by a-b-c"""
        a = np.array([a['x'], a['y']])
        b = np.array([b['x'], b['y']])
        c = np.array([c['x'], c['y']])

        ba = a - b
        bc = c - b

        cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
        angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
        return float(np.degrees(angle))

    def calculate_bat_angle(self, wrist_left: Dict, wrist_right: Dict, shoulder: Dict) -> float:
        """Estimate bat angle from wrist positions relative to vertical"""
        # Average wrist position
        wrist_avg_x = (wrist_left['x'] + wrist_right['x']) / 2
        wrist_avg_y = (wrist_left['y'] + wrist_right['y']) / 2
        
        # Bat vector (from shoulder to wrist)
        # This is high-level: in reality, bat is held by wrists
        # Let's assume bat direction is dictated by wrists relative to each other or to shoulder
        dx = wrist_left['x'] - wrist_right['x']
        dy = wrist_left['y'] - wrist_right['y']
        
        # Angle with vertical (y-axis)
        angle = np.degrees(np.arctan2(abs(dx), abs(dy)))
        return float(angle)

    def classify_shot(self, keypoints_sequence: list[dict]) -> dict:
        """
        Input: list of frame keypoints (each frame = dict of landmark_id: {x,y,z})
        Output: Shot analysis result
        """
        if not keypoints_sequence:
            return {"shot_type": "unknown", "confidence": 0}

        # Analyze representative frame (usually middle of sequence or point of impact)
        # For simplicity, we'll look for the frame with maximum bat angle or most forward stride
        
        best_frame = keypoints_sequence[len(keypoints_sequence) // 2] # middle frame
        
        # Extract features from best frame
        landmarks = best_frame
        
        # Helper to get landmark safely
        def get_lm(idx): return landmarks.get(idx, {"x": 0, "y": 0, "z": 0})

        l_ankle = get_lm(self.L_ANKLE)
        r_ankle = get_lm(self.R_ANKLE)
        l_knee = get_lm(self.L_KNEE)
        r_knee = get_lm(self.R_KNEE)
        l_hip = get_lm(self.L_HIP)
        r_hip = get_lm(self.R_HIP)
        l_wrist = get_lm(self.L_WRIST)
        r_wrist = get_lm(self.R_WRIST)
        l_shoulder = get_lm(self.L_SHOULDER)
        r_shoulder = get_lm(self.R_SHOULDER)
        nose = get_lm(self.NOSE)

        # 1. Stride length (normalized x difference)
        stride_length = abs(l_ankle['x'] - r_ankle['x'])
        
        # 2. Bat angle
        bat_angle = self.calculate_bat_angle(l_wrist, r_wrist, r_shoulder)
        
        # 3. Weight distribution
        # If hips are closer to front foot ankle
        # (Assuming right-handed batter: front foot is left foot)
        weight_distribution = "front_foot" if abs(l_hip['x'] - l_ankle['x']) < abs(r_hip['x'] - r_ankle['x']) else "back_foot"
        
        # 4. Vertical positions
        wrist_y_avg = (l_wrist['y'] + r_wrist['y']) / 2
        shoulder_y_avg = (l_shoulder['y'] + r_shoulder['y']) / 2
        knee_y_avg = (l_knee['y'] + r_knee['y']) / 2

        # 5. Knee angles
        l_knee_angle = self.calculate_angle(get_lm(self.L_HIP), get_lm(self.L_KNEE), get_lm(self.L_ANKLE))

        # Shot classification logic
        shot_type = "unknown"
        confidence = 0.5
        quality_score = 70
        footwork_score = 70
        timing_score = 70
        recommendations = []

        # Logic based on thresholds
        if l_knee_angle < 120 and bat_angle > 70 and wrist_y_avg > knee_y_avg:
            shot_type = "sweep_shot"
            confidence = 0.85
            recommendations.append("Good low center of gravity")
        elif weight_distribution == "back_foot" and wrist_y_avg < shoulder_y_avg and bat_angle > 70:
            shot_type = "pull_shot"
            confidence = 0.8
            recommendations.append("Strong backfoot movement")
        elif weight_distribution == "back_foot" and bat_angle > 70:
            shot_type = "cut_shot"
            confidence = 0.75
            recommendations.append("Keep arms extended")
        elif stride_length > 0.2 and weight_distribution == "front_foot":
            if bat_angle > 30 and bat_angle < 60:
                shot_type = "cover_drive"
                confidence = 0.82
            elif bat_angle <= 30:
                shot_type = "straight_drive"
                confidence = 0.8
                # Check head position
                if abs(nose['x'] - l_ankle['x']) < 0.05:
                    recommendations.append("Excellent head position over the ball")
                    quality_score += 10
        elif stride_length < 0.15 and bat_angle < 20:
            shot_type = "defensive"
            confidence = 0.7
            recommendations.append("Solid defense")

        if not recommendations:
            recommendations = self.get_shot_recommendations({"shot_type": shot_type, "quality_score": quality_score})

        return {
            "shot_type": shot_type,
            "confidence": round(confidence, 2),
            "quality_score": quality_score,
            "bat_angle": round(bat_angle, 1),
            "stride_length": round(stride_length, 2),
            "head_position": "stable" if abs(nose['x'] - l_ankle['x']) < 0.1 else "unstable",
            "weight_distribution": weight_distribution,
            "footwork_score": footwork_score,
            "timing_score": timing_score,
            "recommendations": recommendations[:3]
        }

    def get_shot_recommendations(self, shot_result: dict) -> list[str]:
        """Generate coaching recommendations based on shot analysis"""
        recs = []
        shot_type = shot_result.get("shot_type")
        quality = shot_result.get("quality_score", 0)

        if shot_type == "cover_drive":
            recs.append("Lead with your front shoulder")
            recs.append("Transfer weight fully to front foot")
        elif shot_type == "straight_drive":
            recs.append("Keep your head over the ball")
            recs.append("Follow through straight down the ground")
        elif shot_type == "pull_shot":
            recs.append("Get inside the line of the ball")
            recs.append("Roll your wrists over to keep the ball down")
        elif shot_type == "unknown":
            recs.append("Focus on clear foot movement")
            recs.append("Complete the follow-through")
        
        if quality < 60:
            recs.append("Work on your balance during the shot")
        
        return recs
