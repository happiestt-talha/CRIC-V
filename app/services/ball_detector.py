import cv2
import numpy as np
from ultralytics import YOLO
from typing import List, Dict, Tuple
import torch

class BallDetector:
    def __init__(self, model_path: str = None):
        """
        Initialize ball detector using YOLOv8
        """
        if model_path:
            self.model = YOLO(model_path)
        else:
            # Load a pre-trained model (you can fine-tune it for cricket balls)
            self.model = YOLO('yolov8n.pt')
        
        # Cricket ball class (you might need to train a custom model)
        self.ball_class_id = 32  # Sports ball class in COCO
        
    def detect_ball_in_video(self, video_path: str) -> List[Dict]:
        """
        Detect ball in video frames
        """
        cap = cv2.VideoCapture(video_path)
        detections = []
        frame_count = 0
        
        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                break
            
            # Run detection
            results = self.model(frame, verbose=False)
            
            frame_detections = []
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        # Check if it's a ball
                        if int(box.cls) == self.ball_class_id:
                            detection = {
                                "frame": frame_count,
                                "bbox": box.xyxy[0].tolist(),
                                "confidence": float(box.conf),
                                "class": int(box.cls)
                            }
                            frame_detections.append(detection)
            
            if frame_detections:
                detections.extend(frame_detections)
            
            frame_count += 1
        
        cap.release()
        return detections
    
    def track_ball_trajectory(self, video_path: str) -> Dict:
        """
        Track ball trajectory throughout video
        """
        detections = self.detect_ball_in_video(video_path)
        
        # Group detections by frame
        frames_dict = {}
        for detection in detections:
            frame_num = detection["frame"]
            if frame_num not in frames_dict:
                frames_dict[frame_num] = []
            frames_dict[frame_num].append(detection)
        
        # Calculate trajectory
        trajectory = []
        for frame_num in sorted(frames_dict.keys()):
            frame_dets = frames_dict[frame_num]
            if frame_dets:
                # Take the most confident detection
                best_det = max(frame_dets, key=lambda x: x["confidence"])
                bbox = best_det["bbox"]
                
                # Calculate center
                x_center = (bbox[0] + bbox[2]) / 2
                y_center = (bbox[1] + bbox[3]) / 2
                
                trajectory.append({
                    "frame": frame_num,
                    "x": x_center,
                    "y": y_center,
                    "confidence": best_det["confidence"]
                })
        
        # Calculate speed and direction (simplified)
        if len(trajectory) > 1:
            # Estimate speed (pixels per frame)
            speeds = []
            for i in range(1, len(trajectory)):
                dx = trajectory[i]["x"] - trajectory[i-1]["x"]
                dy = trajectory[i]["y"] - trajectory[i-1]["y"]
                speed = np.sqrt(dx**2 + dy**2)
                speeds.append(speed)
            
            avg_speed = np.mean(speeds) if speeds else 0
        else:
            avg_speed = 0
        
        return {
            "trajectory": trajectory,
            "avg_speed": float(avg_speed),
            "total_frames_with_ball": len(trajectory)
        }
    
    def detect_ball_contact(self, video_path: str, bat_landmarks: List) -> List[int]:
        """
        Detect frames where ball makes contact with bat
        """
        # This is a simplified version
        # In reality, you need to analyze proximity between ball and bat landmarks
        detections = self.detect_ball_in_video(video_path)
        
        contact_frames = []
        for detection in detections:
            # Check if ball is near bat (simplified)
            # You would need bat position from pose landmarks
            if detection["confidence"] > 0.7:
                contact_frames.append(detection["frame"])
        
        return contact_frames