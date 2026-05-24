# fix_schema.py
from app.database import engine
from sqlalchemy import text

def add_missing_columns():
    with engine.connect() as conn:
        # Check if column exists and add it if it doesn't
        try:
            conn.execute(text("ALTER TABLE sessions ADD COLUMN annotated_video_path VARCHAR"))
            conn.commit()
            print("✓ Added annotated_video_path column to sessions table")
        except Exception as e:
            if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                print("Column already exists")
            else:
                print(f"Error: {e}")

if __name__ == "__main__":
    add_missing_columns()
