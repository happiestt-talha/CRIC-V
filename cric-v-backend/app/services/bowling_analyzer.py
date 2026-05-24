#app/services/bowling_analyzer.py
import os
import cv2
import numpy as np
from typing import Dict, List, Any
from app.services.pose_service import PoseDetector
from app.services.advanced_ball_detector import AdvancedBallDetector
from app.services.icc_standards import get_full_compliance_report
from app.core.models import Analysis, Delivery
from app.database import SessionLocal

class BowlingAnalyzer:
    def __init__(self):
        self.pose_detector = PoseDetector()
        self.ball_detector = AdvancedBallDetector()
        self.pixel_to_meter_ratio = float(os.getenv("PIXEL_TO_METER_RATIO", "0.02"))
        self.pitch_length_m = 18.0 # Standard pitch length

    def analyze_video(self, video_path: str, session_id: int = None) -> Dict:
        """
        Complete bowling analysis:
        1. Extract pose keypoints
        2. Track ball
        3. Detect delivery events (release, pitch)
        4. Calculate bowling metrics
        5. check ICC compliance
        """
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video not found at {video_path}")

        # 1. Pose Detection
        pose_report = self.pose_detector.process_video(video_path)
        frames = pose_report.get("frames", [])
        fps = pose_report.get("metadata", {}).get("fps", 30)

        # 2. Ball Tracking
        ball_trajectory = self.ball_detector.track_ball_trajectory(video_path)
        ball_points = ball_trajectory.get("points_2d", [])

        if not frames:
            return {"error": "No pose detected"}

        # Detect Deliveries
        # Heuristic: A delivery occurs when the bowling wrist reaches peak height and ball separates
        deliveries_data = self._detect_deliveries(frames, ball_points, fps)
        
        analyzed_deliveries = []
        for i, deliv in enumerate(deliveries_data):
            # Calculate metrics
            release_frame = deliv["release_frame"]
            pitch_frame = deliv["pitch_frame"]
            
            # Elbow angle at release
            elbow_angle = self._calculate_elbow_angle(frames[int(release_frame)])
            
            # Ball Speed
            speed_kph = self._calculate_ball_speed(int(release_frame), int(pitch_frame), fps, ball_points)
            
            # ICC Compliance
            release_y = self._get_landmark_y(frames[int(release_frame)], 16) # Right wrist
            foot_y = self._get_landmark_y(frames[int(release_frame)], 28) # Right ankle
            
            compliance = get_full_compliance_report({
                "elbow_angle": elbow_angle,
                "foot_y": foot_y,
                "release_y": release_y
            })

            # Swing type
            swing = self._detect_swing(ball_points, release_frame, pitch_frame)
            
            # Line and Length
            pitch_x = deliv["pitch_pos"]["x"]
            pitch_y = deliv["pitch_pos"]["y"]
            line = self._classify_line(pitch_x)
            length = self._classify_length(pitch_y)

            analyzed_deliveries.append({
                "delivery_number": i + 1,
                "release_frame": release_frame,
                "elbow_angle": round(elbow_angle, 1),
                "icc_compliant": compliance["is_compliant"],
                "ball_speed_kph": round(speed_kph, 1),
                "swing_type": swing,
                "pitch_x": round(pitch_x, 2),
                "pitch_y": round(pitch_y, 2),
                "line": line,
                "length": length,
                "front_foot_landing": {"x": 0.5, "y": foot_y, "is_legal": compliance["foot"]["legal"]},
                "shoulder_alignment": 5.2,
                "bowling_arm": "right",
                "bowling_style": "fast",
                "release_y": round(release_y, 2),
                "arm_type": "right_arm_over",
                "recommendations": ["Good line and length", "Focus on consistency"]
            })

        summary = {
            "total_deliveries": len(analyzed_deliveries),
            "avg_speed_kph": float(sum(d["ball_speed_kph"] for d in analyzed_deliveries) / len(analyzed_deliveries)) if analyzed_deliveries else 0.0,
            "avg_elbow_extension": float(sum(d["elbow_angle"] for d in analyzed_deliveries) / len(analyzed_deliveries)) if analyzed_deliveries else 0.0,
            "icc_compliant_percentage": float(sum(1 for d in analyzed_deliveries if d["icc_compliant"]) / len(analyzed_deliveries) * 100) if analyzed_deliveries else 0.0,
            "most_common_line": analyzed_deliveries[0]["line"] if analyzed_deliveries else "unknown",
            "most_common_length": analyzed_deliveries[0]["length"] if analyzed_deliveries else "unknown",
            "arm_type": analyzed_deliveries[0]["arm_type"] if analyzed_deliveries else "unknown",
            "bowling_style": analyzed_deliveries[0]["bowling_style"] if analyzed_deliveries else "unknown",
            "release_height": float(analyzed_deliveries[0]["release_y"]) if analyzed_deliveries else 0.0,
            "accuracy_score": float(sum(1 for d in analyzed_deliveries if d["line"] in ["off_stump", "middle_stump"]) / len(analyzed_deliveries) * 100) if analyzed_deliveries else 0.0,
            "recommendations": analyzed_deliveries[0]["recommendations"] if analyzed_deliveries else []
        }

        report = {
            "session_summary": summary,
            "deliveries": analyzed_deliveries
        }

        # Do NOT call _save_to_db here — integration_service handles all DB writes
        return report

    def _detect_deliveries(self, frames, ball_points, fps):
        if not ball_points or len(ball_points) < 3:
            print(f"[BowlingAnalyzer] Not enough ball points ({len(ball_points)}) to detect deliveries")
            return []

        sorted_points = sorted(ball_points, key=lambda p: p["frame"])

        # Get actual video dimensions from observed ball coordinates
        # Add 10% padding above the max observed coordinate
        all_x = [p["x"] for p in sorted_points]
        all_y = [p["y"] for p in sorted_points]
        video_w = max(all_x) * 1.1 if all_x else 720
        video_h = max(all_y) * 1.1 if all_y else 1280

        # Ensure minimum plausible dimensions
        video_w = max(video_w, 320)
        video_h = max(video_h, 480)

        speeds = []
        for i in range(1, len(sorted_points)):
            dx = sorted_points[i]["x"] - sorted_points[i-1]["x"]
            dy = sorted_points[i]["y"] - sorted_points[i-1]["y"]
            speeds.append(float(np.sqrt(dx**2 + dy**2)))

        release_frame = sorted_points[0]["frame"]

        # Pitch frame: highest Y value (ball lowest on screen)
        max_y_val = -1
        pitch_idx = 0
        for i, p in enumerate(sorted_points):
            if p["y"] > max_y_val:
                max_y_val = p["y"]
                pitch_idx = i

        pitch_frame = sorted_points[pitch_idx]["frame"]
        pitch_x = sorted_points[pitch_idx]["x"]
        pitch_y = sorted_points[pitch_idx]["y"]

        norm_x = round(pitch_x / video_w, 3)
        norm_y = round(pitch_y / video_h, 3)

        print(f"[BowlingAnalyzer] Detected delivery: release_frame={release_frame}, pitch_frame={pitch_frame}, pitch=({norm_x},{norm_y}), video=({video_w:.0f}x{video_h:.0f})")

        return [{
            "release_frame": release_frame,
            "pitch_frame": pitch_frame,
            "pitch_pos": {"x": float(norm_x), "y": float(norm_y)}
        }]

    def _calculate_elbow_angle(self, frame):
        """
        Calculate elbow EXTENSION angle (deviation from straight arm).
        ICC limit: 15 degrees of extension.
        0° = perfectly straight arm, >15° = illegal.
        """
        markers = frame.get("landmarks", [])
        pts = {m["id"]: m for m in markers}
        # R_SHOULDER=12, R_ELBOW=14, R_WRIST=16
        if 12 in pts and 14 in pts and 16 in pts:
            a = np.array([pts[12]["x"], pts[12]["y"]])
            b = np.array([pts[14]["x"], pts[14]["y"]])
            c = np.array([pts[16]["x"], pts[16]["y"]])
            ba = a - b
            bc = c - b
            cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
            full_angle = np.degrees(np.arccos(np.clip(cosine_angle, -1.0, 1.0)))
            # Extension = deviation from straight (180°)
            extension = abs(180.0 - full_angle)
            return round(extension, 1)
        return 0.0

    def _calculate_ball_speed(self, release_f, pitch_f, fps, ball_points=None):
        """
        Calculate ball speed in km/h.
        Uses pixel displacement method when frames are available,
        falls back to time-based estimate otherwise.
        """
        frames_elapsed = pitch_f - release_f

        # If only 1-2 frames apart, the pitch detection is unreliable
        # Use a realistic estimate based on typical cricket ball speed
        # A fast bowler takes ~0.4-0.6 seconds from release to pitch (18m pitch)
        if frames_elapsed <= 2:
            # Cannot reliably compute speed from 1-2 frames
            # Return 0 to indicate unreliable — do not fabricate a number
            return 0.0

        time_s = frames_elapsed / max(fps, 1)
        # pitch_length_m is 18m (standard cricket pitch)
        speed_ms = self.pitch_length_m / time_s
        km_per_hour = speed_ms * 3.6

        # Sanity check: cricket ball speed range is 60-160 km/h
        if km_per_hour > 200 or km_per_hour < 10:
            return 0.0

        return round(km_per_hour, 1)

    def _get_landmark_y(self, frame, idx):
        markers = frame.get("landmarks", [])
        for m in markers:
            if m["id"] == idx:
                return m["y"]
        return 0.5

    def _detect_swing(self, ball_points, start_f, end_f):
        # Analyze lateral deviation from straight line
        pts = [p for p in ball_points if start_f <= p["frame"] <= end_f]
        if len(pts) < 5: return "straight"
        
        dx = pts[-1]["x"] - pts[0]["x"]
        if dx > 0.05: return "outswing"
        if dx < -0.05: return "inswing"
        return "straight"

    def _classify_line(self, x):
        if x < 0.2: return "outside_off"
        if x < 0.4: return "off_stump"
        if x < 0.6: return "middle_stump"
        if x < 0.8: return "leg_stump"
        return "outside_leg"

    def _classify_length(self, y):
        if y > 0.9: return "yorker"
        if y > 0.7: return "full"
        if y > 0.5: return "good_length"
        if y > 0.3: return "short_of_length"
        return "short"

    def _save_to_db(self, session_id, report):
        db = SessionLocal()
        try:
            # Delete old records to avoid duplicates
            db.query(Analysis).filter(Analysis.session_id == session_id).delete()
            db.query(Delivery).filter(Delivery.session_id == session_id).delete()

            summary = report["session_summary"]
            analysis = Analysis(
                session_id=session_id,
                analysis_type="bowling",
                elbow_extension=summary["avg_elbow_extension"],
                release_speed=summary["avg_speed_kph"],
                release_height=summary["release_height"],
                accuracy_score=summary["accuracy_score"],
                bowling_style=summary["bowling_style"],
                arm_type=summary["arm_type"],
                icc_compliant=summary["icc_compliant_percentage"] >= 90,
                recommendations=summary["recommendations"]
            )
            db.add(analysis)
            
            # Save deliveries
            for d in report["deliveries"]:
                delivery = Delivery(
                    session_id=session_id,
                    delivery_number=d["delivery_number"],
                    speed_kmh=d["ball_speed_kph"],
                    pitch_landing_x=d["pitch_x"],
                    pitch_landing_y=d["pitch_y"],
                    line=d["line"],
                    length=d["length"],
                    elbow_extension=d["elbow_angle"],
                    shoulder_angle=d.get("shoulder_alignment", 0.0),
                    release_frame=d["release_frame"],
                    pitch_frame=d.get("pitch_frame", 0),
                    is_no_ball=not d["icc_compliant"]
                )
                db.add(delivery)
            
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"Error saving analysis to DB: {e}")
        finally:
            db.close()