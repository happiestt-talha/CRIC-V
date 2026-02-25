import cv2
from app.services.ball_detector import BallDetector

detector = BallDetector(model_path="models/cricket_ball_detector.pt")
cap = cv2.VideoCapture("data/raw_videos/sample.mp4")

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break
    detections = detector.detect_ball_in_frame(frame)
    for det in detections:
        x1, y1, x2, y2 = det.bbox
        cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0,255,0), 2)
        cv2.putText(frame, f"{det.confidence:.2f}", (int(x1), int(y1)-10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0,255,0), 2)
    cv2.imshow("Ball Detection", frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()