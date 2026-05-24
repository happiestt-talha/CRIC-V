# test_api.py - Place in root directory
import requests
import json
import os
from pathlib import Path

BASE_URL = "http://localhost:8000"

def test_api():
    print("🚀 Testing CRIC-V API")
    
    # 1. Register a user
    print("\n1. Testing user registration...")
    register_data = {
        "username": "test_coach",
        "email": "coach@test.com",
        "password": "testpassword123",
        "role": "coach"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=register_data)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # 2. Login
    print("\n2. Testing login...")
    login_data = {
        "username": "test_coach",
        "password": "testpassword123"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/token",
            data={"username": "test_coach", "password": "testpassword123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        token = response.json().get("access_token")
        print(f"   Token received: {token[:30]}...")
        headers = {"Authorization": f"Bearer {token}"}
    except Exception as e:
        print(f"   Error: {e}")
        headers = {}
    
    # 3. Create a player
    print("\n3. Creating a test player...")
    player_data = {
        "name": "Test Player",
        "age": 25,
        "batting_hand": "right",
        "bowling_style": "right_arm_fast"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/users/players",
            json=player_data,
            headers=headers
        )
        print(f"   Status: {response.status_code}")
        print(f"   Player created: {response.json()}")
        player_id = response.json().get("id")
    except Exception as e:
        print(f"   Error: {e}")
        player_id = 1
    
    # 4. Create a session
    print("\n4. Creating a session...")
    session_data = {
        "session_type": "bowling",
        "player_id": player_id,
        "description": "Test bowling session"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/sessions/",
            json=session_data,
            headers=headers
        )
        session_id = response.json().get("id")
        print(f"   Session created with ID: {session_id}")
    except Exception as e:
        print(f"   Error: {e}")
        session_id = 1
    
    # 5. Check API health
    print("\n5. Checking API health...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"   Health: {response.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    print("\n✅ Basic API tests completed!")
    print(f"\n📋 Test Summary:")
    print(f"   - Token: {'✓' if token else '✗'}")
    print(f"   - Player ID: {player_id}")
    print(f"   - Session ID: {session_id}")
    
    return token, player_id, session_id

if __name__ == "__main__":
    test_api()