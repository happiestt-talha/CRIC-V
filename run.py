# # run.py
# import uvicorn

# if __name__ == "__main__":
#     uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)


# ! NEW FILE

#!/usr/bin/env python
"""
CRIC-V Backend Startup Script (Windows-safe)
"""

import subprocess
import sys
import os
import shutil
from pathlib import Path


# -------------------------
# Dependency Checks
# -------------------------
def check_database():
    try:
        subprocess.run(
            [
                sys.executable,
                "-c",
                (
                    "from app.database import SessionLocal;"
                    "from sqlalchemy import text;"
                    "db = SessionLocal();"
                    "db.execute(text('SELECT 1'));"
                    "print('Database OK')"
                )
            ],
            check=True,
            capture_output=True,
            text=True
        )
        print("   [OK] Database: Connected")
        return True
    except Exception as e:
        print(f"   [FAIL] Database error: {e}")
        return False



def check_redis():
    if not shutil.which("redis-cli"):
        print("   WARN: Redis CLI not found (skipping Redis check)")
        return False

    try:
        subprocess.run(
            ["redis-cli", "ping"],
            check=True,
            capture_output=True,
            text=True
        )
        print("   [OK] Redis: Running")
        return True
    except Exception:
        print("   [FAIL] Redis: Not running")
        return False


def check_dependencies():
    print("[*] Checking dependencies...")
    db_ok = check_database()
    redis_ok = check_redis()
    return db_ok


# -------------------------
# Admin User
# -------------------------
def create_admin_user():
    from app.database import SessionLocal
    from app.core.models import User
    from app.core.security import get_password_hash

    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            admin = User(
                username="admin",
                email="admin@cricv.com",
                full_name="System Administrator",
                hashed_password=get_password_hash("admin123"),
                role="admin",
            )
            db.add(admin)
            db.commit()
            print("[OK] Admin user created (admin / admin123)")
        else:
            print(f"INFO: Admin user already exists")
    except Exception as e:
        print(f"WARN: Admin creation failed: {e}")
    finally:
        db.close()


# -------------------------
# Services
# -------------------------
def start_fastapi():
    print("[*] Starting FastAPI server...")
    return subprocess.Popen(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "app.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            "8000",
            "--reload",
        ]
    )


def start_celery():
    if not shutil.which("redis-cli"):
        print("WARN: Skipping Celery (Redis not available)")
        return None

    print("[*] Starting Celery worker...")
    return subprocess.Popen(
        [
            sys.executable,
            "-m",
            "celery",
            "-A",
            "app.workers.tasks.celery_app",
            "worker",
            "--loglevel=info",
            "--pool=solo",  # REQUIRED for Windows
        ]
    )


# -------------------------
# Main
# -------------------------
def main():
    print(
        """
+----------------------------------------------+
|              CRIC-V BACKEND                  |
|     Cricket Coaching Assistant System        |
+----------------------------------------------+
"""
    )

    if not Path("app").exists():
        print("[FAIL] Error: run this from project root")
        sys.exit(1)

    # Create folders
    os.makedirs("data/raw_videos", exist_ok=True)
    os.makedirs("data/thumbnails", exist_ok=True)
    os.makedirs("data/processed", exist_ok=True)

    # Admin
    create_admin_user()

    # Dependencies
    if not check_dependencies():
        print("\n❌ Startup aborted due to dependency failure")
        sys.exit(1)

    # Start services
    celery_proc = start_celery()
    api_proc = start_fastapi()

    print("\n[OK] CRIC-V is running!")
    print("API: http://localhost:8000")
    print("Docs: http://localhost:8000/docs")
    print("\n[!] Press Ctrl+C to stop")

    try:
        api_proc.wait()
    except KeyboardInterrupt:
        print("\n[!] Shutting down...")
        api_proc.terminate()
        if celery_proc:
            celery_proc.terminate()
        print("[OK] Clean shutdown complete")


if __name__ == "__main__":
    main()
