from app.database import SessionLocal
from app.core.models import Delivery
db = SessionLocal()
deliveries = db.query(Delivery).filter(Delivery.session_id == 3).all()
print(f"Delivery count: {len(deliveries)}")
for d in deliveries:
    print(f"  ID: {d.id}, speed: {d.speed_kmh}, elbow: {d.elbow_extension}")
db.close()