# create_test_videos.py
import cv2
import numpy as np
import os

def create_bowling_test_video(output_path="test_bowling.mp4", frames=100):
    """
    Create a simple test video simulating bowling action
    """
    height, width = 480, 640
    fps = 30
    
    # Create VideoWriter
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    
    # Simulate bowling action
    for frame_num in range(frames):
        # Create blank frame
        frame = np.zeros((height, width, 3), dtype=np.uint8)
        frame.fill(255)  # White background
        
        # Draw cricket pitch
        cv2.rectangle(frame, (50, 50), (width-50, height-50), (0, 100, 0), -1)
        cv2.line(frame, (width//2, 50), (width//2, height-50), (255, 255, 255), 2)
        
        # Simulate bowler movement
        progress = frame_num / frames
        
        # Draw bowler (simple circles for joints)
        shoulder_y = int(100 + progress * 200)
        elbow_y = int(150 + progress * 200)
        wrist_y = int(200 + progress * 200)
        
        # Arm
        cv2.line(frame, (width//2, shoulder_y), (width//2 - 50, elbow_y), (0, 0, 255), 3)
        cv2.line(frame, (width//2 - 50, elbow_y), (width//2 - 100, wrist_y), (0, 0, 255), 3)
        
        # Joints
        cv2.circle(frame, (width//2, shoulder_y), 5, (255, 0, 0), -1)
        cv2.circle(frame, (width//2 - 50, elbow_y), 5, (0, 255, 0), -1)
        cv2.circle(frame, (width//2 - 100, wrist_y), 5, (0, 0, 255), -1)
        
        # Add frame number
        cv2.putText(frame, f"Frame: {frame_num}", (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
        
        out.write(frame)
    
    out.release()
    print(f"✅ Test video created: {output_path}")

if __name__ == "__main__":
    os.makedirs("test_videos", exist_ok=True)
    create_bowling_test_video("test_videos/bowling_test.mp4")
    create_bowling_test_video("test_videos/bowling_test2.mp4", frames=150)