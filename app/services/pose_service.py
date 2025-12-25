import cv2
import numpy as np
from typing import List, Dict, Tuple, Optional
import json
import os

# For MediaPipe 0.10.31 with Tasks API
try:
    import mediapipe as mp
    from mediapipe.tasks import python
    from mediapipe.tasks.python import vision
    MP_AVAILABLE = True
except ImportError:
    MP_AVAILABLE = False
    print("WARNING: MediaPipe not available. Using mock implementation.")

class PoseDetector:
    def __init__(self, model_path: Optional[str] = None):
        """
        Initialize MediaPipe Pose detector using Tasks API
        """
        self.model_path = model_path or self._get_default_model_path()
        self.detector = None
        
        if not MP_AVAILABLE:
            print("WARNING: MediaPipe not installed. Using mock pose detector.")
            return
            
        try:
            # Create PoseLandmarker options
            base_options = python.BaseOptions(model_asset_path=self.model_path)
            options = vision.PoseLandmarkerOptions(
                base_options=base_options,
                running_mode=vision.RunningMode.VIDEO,
                num_poses=1,
                min_pose_detection_confidence=0.5,
                min_pose_presence_confidence=0.5,
                min_tracking_confidence=0.5,
                output_segmentation_masks=False
            )
            
            # Create the detector
            self.detector = vision.PoseLandmarker.create_from_options(options)
            print(f"Pose detector initialized with model: {self.model_path}")
            
        except Exception as e:
            print(f"WARNING: Failed to initialize MediaPipe Pose detector: {e}")
            print("Using mock implementation instead.")
            self.detector = None
    
    def _get_default_model_path(self):
        """Get the default model path - check multiple locations"""
        # Check multiple possible locations
        possible_paths = [
            "pose_landmarker.task",  # Project root
            "app/services/pose_landmarker.task",  # In services directory
            os.path.join(os.path.dirname(__file__), "pose_landmarker.task")  # Same directory
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                print(f"Found model at: {path}")
                return path
        
        # If not found anywhere
        print(f"WARNING: Model file not found in any of these locations: {possible_paths}")
        print("Please download the pose landmarker model from:")
        print("https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task")
        print("And place it in one of the above locations.")
        
        return possible_paths[0]  # Return first path to trigger error
    
    # ... rest of your methods stay the same as before
    def process_video(self, video_path: str, output_json: bool = True):
        """
        Process video and extract pose landmarks
        Returns: List of frames with landmarks
        """
        # If detector is not available, return mock data
        if self.detector is None:
            return self._create_mock_report()
        
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        frames_data = []
        frame_number = 0
        
        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                break
                
            # Convert BGR to RGB
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Convert to MediaPipe Image
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
            
            # Calculate timestamp in milliseconds
            timestamp_ms = int((frame_number / fps) * 1000) if fps > 0 else frame_number * 33
            
            # Detect pose landmarks
            detection_result = self.detector.detect_for_video(mp_image, timestamp_ms)
            
            frame_data = {
                "frame_number": frame_number,
                "timestamp": frame_number / fps if fps > 0 else 0,
                "landmarks": []
            }
            
            if detection_result.pose_landmarks:
                # Take the first pose (we set num_poses=1)
                landmarks = self._extract_landmarks(detection_result.pose_landmarks[0])
                frame_data["landmarks"] = landmarks
                
                # Calculate key metrics
                if landmarks:
                    frame_data["metrics"] = self._calculate_frame_metrics(landmarks)
            
            frames_data.append(frame_data)
            frame_number += 1
            
            # Print progress every 10 frames
            if frame_number % 10 == 0:
                print(f"Processed {frame_number}/{frame_count} frames...")
        
        cap.release()
        
        if output_json:
            return self._create_pose_report(frames_data, fps, frame_count)
        
        return frames_data
    
    def _extract_landmarks(self, pose_landmarks) -> List[Dict]:
        """Extract landmarks with coordinates and visibility"""
        landmarks = []
        for idx, landmark in enumerate(pose_landmarks):
            landmarks.append({
                "id": idx,
                "x": float(landmark.x),
                "y": float(landmark.y),
                "z": float(landmark.z),
                "visibility": float(landmark.visibility) if hasattr(landmark, 'visibility') else 1.0
            })
        return landmarks
    
    def _calculate_frame_metrics(self, landmarks: List[Dict]) -> Dict:
        """Calculate basic pose metrics for a frame"""
        metrics = {}
        
        # Check if we have enough landmarks
        if len(landmarks) < 17:  # Need at least up to wrist landmarks
            return metrics
        
        # Get key points (MediaPipe landmarks indices)
        left_shoulder = landmarks[11]
        right_shoulder = landmarks[12]
        left_elbow = landmarks[13]
        right_elbow = landmarks[14]
        left_wrist = landmarks[15]
        right_wrist = landmarks[16]
        
        # Calculate elbow angles
        metrics["left_elbow_angle"] = self._calculate_angle(
            left_shoulder, left_elbow, left_wrist
        )
        metrics["right_elbow_angle"] = self._calculate_angle(
            right_shoulder, right_elbow, right_wrist
        )
        
        # Calculate shoulder alignment
        metrics["shoulder_alignment"] = self._calculate_shoulder_alignment(
            left_shoulder, right_shoulder
        )
        
        return metrics
    
    def _calculate_angle(self, a: Dict, b: Dict, c: Dict) -> float:
        """Calculate angle between three points"""
        # Convert to numpy arrays
        a_vec = np.array([a["x"], a["y"]])
        b_vec = np.array([b["x"], b["y"]])
        c_vec = np.array([c["x"], c["y"]])
        
        # Calculate vectors
        ba = a_vec - b_vec
        bc = c_vec - b_vec
        
        # Calculate angle
        cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
        angle = np.degrees(np.arccos(np.clip(cosine_angle, -1.0, 1.0)))
        
        return float(angle)
    
    def _calculate_shoulder_alignment(self, left_shoulder: Dict, right_shoulder: Dict) -> float:
        """Calculate shoulder alignment (tilt)"""
        return abs(left_shoulder["y"] - right_shoulder["y"])
    
    def _create_pose_report(self, frames_data: List, fps: float, frame_count: int) -> Dict:
        """Create comprehensive pose analysis report"""
        report = {
            "metadata": {
                "total_frames": frame_count,
                "fps": fps,
                "duration_seconds": frame_count / fps if fps > 0 else 0
            },
            "frames": frames_data,
            "summary": {
                "average_elbow_angles": self._calculate_average_angles(frames_data),
                "frames_with_landmarks": len([f for f in frames_data if f["landmarks"]]),
                "total_frames_processed": len(frames_data)
            }
        }
        return report
    
    def _create_mock_report(self):
        """Create mock data when MediaPipe is not available"""
        return {
            "metadata": {
                "total_frames": 100,
                "fps": 30,
                "duration_seconds": 3.33
            },
            "frames": [],
            "summary": {
                "average_elbow_angles": {"left_elbow": 90, "right_elbow": 90},
                "frames_with_landmarks": 0,
                "total_frames_processed": 100
            }
        }
    
    def _calculate_average_angles(self, frames_data: List) -> Dict:
        """Calculate average angles across all frames"""
        left_angles = []
        right_angles = []
        
        for frame in frames_data:
            if "metrics" in frame:
                left_angles.append(frame["metrics"].get("left_elbow_angle", 0))
                right_angles.append(frame["metrics"].get("right_elbow_angle", 0))
        
        return {
            "left_elbow": np.mean(left_angles) if left_angles else 0,
            "right_elbow": np.mean(right_angles) if right_angles else 0
        }

# Singleton instance
pose_detector = PoseDetector()