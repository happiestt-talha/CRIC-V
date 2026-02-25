"""
AdvancedBallDetector - extends BallDetector with speed and spin estimation.
"""
import numpy as np
from app.services.ball_detector import BallDetector
from typing import List, Dict


class AdvancedBallDetector(BallDetector):
    """
    Advanced ball detector that adds speed and spin estimation
    on top of the base BallDetector (YOLO-based detection & tracking).
    """

    def __init__(self, model_path: str = None, fps: float = 30.0, pixels_per_meter: float = 100.0):
        """
        :param model_path: Path to the YOLO model file (optional).
        :param fps: Frames per second of the input video (used for speed calc).
        :param pixels_per_meter: Calibration factor – pixels that correspond to 1 metre.
        """
        super().__init__(model_path=model_path)
        self.fps = fps
        self.pixels_per_meter = pixels_per_meter

    # ------------------------------------------------------------------
    # Speed estimation
    # ------------------------------------------------------------------

    def calculate_ball_speed(self, ball_trajectory: Dict) -> float:
        """
        Estimate average ball speed in km/h from the trajectory dict returned
        by track_ball_trajectory().

        The trajectory dict is expected to contain either:
          - 'trajectory': list of {'frame', 'x', 'y'} dicts  (from BallDetector)
          - 'points_2d' : list of {'x', 'y'} dicts            (alternate schema)

        Returns 0.0 when the trajectory is too short to compute speed.
        """
        if not ball_trajectory:
            return 0.0

        # Support two different trajectory schemas
        points = ball_trajectory.get("trajectory") or ball_trajectory.get("points_2d") or []

        if len(points) < 2:
            return 0.0

        frame_displacements = []
        for i in range(1, len(points)):
            dx = points[i]["x"] - points[i - 1]["x"]
            dy = points[i]["y"] - points[i - 1]["y"]
            dist_pixels = float(np.sqrt(dx ** 2 + dy ** 2))
            frame_displacements.append(dist_pixels)

        if not frame_displacements:
            return 0.0

        avg_pixels_per_frame = float(np.mean(frame_displacements))
        meters_per_second = (avg_pixels_per_frame * self.fps) / self.pixels_per_meter
        km_per_hour = meters_per_second * 3.6

        return round(km_per_hour, 1)

    # ------------------------------------------------------------------
    # Spin rate estimation
    # ------------------------------------------------------------------

    def calculate_spin_rate(self, ball_detections: List[Dict]) -> float:
        """
        Estimate average spin rate in RPM from the list of per-frame detections
        returned by detect_ball_in_video().

        Spin is approximated from the lateral (sideways) jitter of the ball
        centre relative to the overall direction of travel.  This is a rough
        heuristic; a proper implementation would analyse ball seam orientation.

        Returns 0.0 when there are not enough detections.
        """
        if not ball_detections or len(ball_detections) < 5:
            return 0.0

        # Extract (x, y) centres from bbox data
        centres = []
        for det in ball_detections:
            if "bbox" in det:
                bbox = det["bbox"]
                cx = (bbox[0] + bbox[2]) / 2
                cy = (bbox[1] + bbox[3]) / 2
                centres.append((float(cx), float(cy)))

        if len(centres) < 5:
            return 0.0

        xs = np.array([c[0] for c in centres])
        ys = np.array([c[1] for c in centres])

        # Overall direction vector
        direction = np.array([xs[-1] - xs[0], ys[-1] - ys[0]])
        norm = np.linalg.norm(direction)
        if norm == 0:
            return 0.0
        direction = direction / norm

        # Lateral deviations (perpendicular to direction)
        lateral = np.array([
            -(xs[i] - xs[0]) * direction[1] + (ys[i] - ys[0]) * direction[0]
            for i in range(len(centres))
        ])

        # Count zero-crossings as a proxy for spin revolutions
        zero_crossings = int(np.sum(np.diff(np.sign(lateral)) != 0))
        duration_seconds = len(centres) / self.fps
        if duration_seconds == 0:
            return 0.0

        # Each crossing ≈ half a revolution
        revolutions = zero_crossings / 2.0
        rpm = (revolutions / duration_seconds) * 60.0

        return round(max(rpm, 0.0), 1)
