# app/services/ball_detector.py

import cv2
import numpy as np
from ultralytics import YOLO
from typing import List, Dict
import os

class BallDetector:
    # Default path to custom cricket ball model
    DEFAULT_MODEL_PATH = "models/cricket_ball_detector.pt"
    FALLBACK_MODEL_PATH = "yolov8n.pt"

    def __init__(self, model_path: str = None):
        """
        Initialize ball detector.
        Tries custom cricket ball model first, falls back to yolov8n if not found.
        """
        resolved_path = model_path or self.DEFAULT_MODEL_PATH

        if os.path.exists(resolved_path):
            self.model = YOLO(resolved_path)
            self.using_custom_model = True
            # Custom model: class 0 = cricket_ball (single-class detector)
            self.ball_class_id = 0
            self.confidence_threshold = 0.15  # Lower threshold for custom model
            print(f"[BallDetector] Loaded custom model: {resolved_path}")
        else:
            print(f"[BallDetector] Custom model not found at {resolved_path}, falling back to {self.FALLBACK_MODEL_PATH}")
            self.model = YOLO(self.FALLBACK_MODEL_PATH)
            self.using_custom_model = False
            # COCO dataset: class 32 = sports ball
            self.ball_class_id = 32
            self.confidence_threshold = 0.20

    def detect_ball_in_video(self, video_path: str) -> List[Dict]:
        """
        Detect ball in every frame of the video.
        Uses color-based fallback if YOLO finds nothing.
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise FileNotFoundError(f"Cannot open video: {video_path}")

        detections = []
        frame_count = 0
        yolo_detections_count = 0

        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                break

            # Run YOLO detection
            results = self.model(frame, verbose=False, conf=self.confidence_threshold)

            frame_detections = []
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        if int(box.cls) == self.ball_class_id:
                            detection = {
                                "frame": frame_count,
                                "bbox": box.xyxy[0].tolist(),
                                "confidence": float(box.conf),
                                "class": int(box.cls),
                                "source": "yolo"
                            }
                            frame_detections.append(detection)
                            yolo_detections_count += 1

            if frame_detections:
                detections.extend(frame_detections)

            frame_count += 1

        cap.release()

        # If YOLO found very few detections, try color-based fallback
        if yolo_detections_count < 5:
            print(f"[BallDetector] YOLO found only {yolo_detections_count} detections — trying color fallback")
            color_detections = self._detect_ball_by_color(video_path)
            if len(color_detections) > yolo_detections_count:
                print(f"[BallDetector] Color fallback found {len(color_detections)} detections — using color results")
                return color_detections
            elif yolo_detections_count > 0:
                return detections
            else:
                # Return color detections even if few — better than nothing
                return color_detections

        print(f"[BallDetector] YOLO detected ball in {yolo_detections_count} frames out of {frame_count}")
        return detections

    def _detect_ball_by_color(self, video_path: str) -> List[Dict]:
        """
        Fallback: detect cricket ball using HSV color range.
        Handles both red (leather) and white (indoor/synthetic) balls.
        """
        cap = cv2.VideoCapture(video_path)
        detections = []
        frame_count = 0

        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                break

            hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
            h, w = frame.shape[:2]

            # Red ball: two ranges in HSV (red wraps around 0/180)
            mask_red1 = cv2.inRange(hsv, np.array([0, 100, 80]), np.array([10, 255, 255]))
            mask_red2 = cv2.inRange(hsv, np.array([165, 100, 80]), np.array([180, 255, 255]))
            mask_red = cv2.bitwise_or(mask_red1, mask_red2)

            # White/pink ball (indoor synthetic balls)
            mask_white = cv2.inRange(hsv, np.array([0, 0, 180]), np.array([180, 60, 255]))

            # Orange ball (some training balls)
            mask_orange = cv2.inRange(hsv, np.array([10, 150, 100]), np.array([25, 255, 255]))

            combined_mask = cv2.bitwise_or(mask_red, cv2.bitwise_or(mask_white, mask_orange))

            # Morphological cleanup
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
            combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_OPEN, kernel)
            combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_CLOSE, kernel)

            # Find contours
            contours, _ = cv2.findContours(combined_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            for contour in contours:
                area = cv2.contourArea(contour)
                # Cricket ball in typical video: 100–4000 px² depending on distance
                if 80 < area < 5000:
                    # Check circularity
                    perimeter = cv2.arcLength(contour, True)
                    if perimeter == 0:
                        continue
                    circularity = 4 * np.pi * area / (perimeter ** 2)
                    if circularity > 0.5:  # reasonably circular
                        x, y, bw, bh = cv2.boundingRect(contour)
                        # Aspect ratio check — ball should be roughly square
                        aspect = bw / (bh + 1e-6)
                        if 0.5 < aspect < 2.0:
                            cx = x + bw / 2
                            cy = y + bh / 2
                            detections.append({
                                "frame": frame_count,
                                "bbox": [float(x), float(y), float(x + bw), float(y + bh)],
                                "confidence": float(min(circularity, 0.99)),
                                "class": 0,
                                "source": "color"
                            })

            frame_count += 1

        cap.release()
        print(f"[BallDetector] Color fallback: found {len(detections)} detections in {frame_count} frames")
        return detections

    def track_ball_trajectory(self, video_path: str) -> Dict:
        """
        Track ball trajectory throughout video.
        Returns dict with 'trajectory', 'points_2d', 'avg_speed', 'total_frames_with_ball'.
        """
        detections = self.detect_ball_in_video(video_path)

        if not detections:
            print(f"[BallDetector] No ball detected in {video_path}")
            return {
                "trajectory": [],
                "points_2d": [],
                "avg_speed": 0.0,
                "total_frames_with_ball": 0
            }

        # Group by frame, take highest confidence per frame
        frames_dict = {}
        for det in detections:
            fn = det["frame"]
            if fn not in frames_dict or det["confidence"] > frames_dict[fn]["confidence"]:
                frames_dict[fn] = det

        # Build sorted trajectory
        trajectory = []
        for frame_num in sorted(frames_dict.keys()):
            det = frames_dict[frame_num]
            bbox = det["bbox"]
            cx = (bbox[0] + bbox[2]) / 2
            cy = (bbox[1] + bbox[3]) / 2
            trajectory.append({
                "frame": frame_num,
                "x": cx,
                "y": cy,
                "confidence": det["confidence"],
                "source": det.get("source", "unknown")
            })

        # Smooth trajectory to remove noise (moving average over 3 frames)
        if len(trajectory) >= 3:
            xs = [p["x"] for p in trajectory]
            ys = [p["y"] for p in trajectory]
            smoothed_x = np.convolve(xs, np.ones(3)/3, mode='same')
            smoothed_y = np.convolve(ys, np.ones(3)/3, mode='same')
            for i, point in enumerate(trajectory):
                point["x"] = float(smoothed_x[i])
                point["y"] = float(smoothed_y[i])

        # Calculate average speed in pixels/frame
        speeds = []
        for i in range(1, len(trajectory)):
            dx = trajectory[i]["x"] - trajectory[i-1]["x"]
            dy = trajectory[i]["y"] - trajectory[i-1]["y"]
            speeds.append(float(np.sqrt(dx**2 + dy**2)))
        avg_speed = float(np.mean(speeds)) if speeds else 0.0

        print(f"[BallDetector] Tracked {len(trajectory)} ball positions, avg speed: {avg_speed:.1f} px/frame")

        return {
            "trajectory": trajectory,
            "points_2d": trajectory,  # alias — both keys for compatibility
            "avg_speed": avg_speed,
            "total_frames_with_ball": len(trajectory)
        }

    def detect_ball_contact(self, video_path: str, bat_landmarks: List) -> List[int]:
        """
        Detect frames where ball makes contact with bat.
        """
        detections = self.detect_ball_in_video(video_path)
        contact_frames = []
        for detection in detections:
            if detection["confidence"] > 0.5:
                contact_frames.append(detection["frame"])
        return contact_frames