import sqlite3
import os

db_path = 'cricv.db' # Corrected name

if not os.path.exists(db_path):
    print(f"Database {db_path} not found.")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    columns_to_add = [
        ("shoulder_angle", "FLOAT"),
        ("release_frame", "INTEGER"),
        ("pitch_frame", "INTEGER"),
        ("is_no_ball", "BOOLEAN DEFAULT 0")
    ]
    
    for col_name, col_type in columns_to_add:
        try:
            cursor.execute(f"ALTER TABLE deliveries ADD COLUMN {col_name} {col_type}")
            print(f"Added column {col_name} to deliveries table.")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print(f"Column {col_name} already exists.")
            else:
                print(f"Error adding {col_name}: {e}")
                
    conn.commit()
    conn.close()
    print("Database schema update complete.")
