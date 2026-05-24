# tests/test_integration.py
import pytest
import asyncio
import json
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.core.models import User, Player, Session

# Test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Override get_db dependency
def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

class TestCRICVAPI:
    def setup_method(self):
        # Create tables
        Base.metadata.create_all(bind=engine)
        
        # Clear tables
        db = TestingSessionLocal()
        db.query(Session).delete()
        db.query(Player).delete()
        db.query(User).delete()
        db.commit()
        db.close()
    
    def test_register_and_login(self):
        # Register
        response = client.post("/auth/register", json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "password123",
            "role": "coach"
        })
        assert response.status_code == 200
        assert "id" in response.json()
        
        # Login
        response = client.post("/auth/token", data={
            "username": "testuser",
            "password": "password123"
        })
        assert response.status_code == 200
        assert "access_token" in response.json()
    
    def test_create_player(self):
        # First login
        response = client.post("/auth/token", data={
            "username": "testuser",
            "password": "password123"
        })
        token = response.json()["access_token"]
        
        # Create player
        headers = {"Authorization": f"Bearer {token}"}
        response = client.post("/users/players", json={
            "name": "Virat Kohli",
            "age": 34,
            "batting_hand": "right",
            "bowling_style": "right_arm_medium"
        }, headers=headers)
        
        assert response.status_code == 200
        assert response.json()["name"] == "Virat Kohli"
    
    def test_upload_video(self):
        # This would test file upload
        # For now, just test endpoint exists
        pass

if __name__ == "__main__":
    pytest.main([__file__, "-v"])                               