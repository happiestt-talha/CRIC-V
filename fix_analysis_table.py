import sqlite3
import os

def fix_table():
    db_path = "cricv.db"
    if not os.path.exists(db_path):
        print(f"Database {db_path} not found.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # List of columns to add to 'analyses' table if they don't exist
    columns_to_add = [
        ("bowling_arm", "TEXT"),
        ("bowling_style", "TEXT"),
        ("release_height", "REAL"),
        ("release_speed", "REAL"),
        ("accuracy_score", "REAL"),
        ("violations", "JSON"),
        ("head_stillness", "REAL"),
        ("shot_selection", "TEXT"),
        ("pose_data", "JSON")
    ]

    for col_name, col_type in columns_to_add:
        try:
            cursor.execute(f"ALTER TABLE analyses ADD COLUMN {col_name} {col_type}")
            print(f"Added column {col_name} to analyses table.")
        except sqlite3.OperationalError:
            # Column likely already exists
            print(f"Column {col_name} already exists or error occurred.")

    conn.commit()
    conn.close()
    print("Database fix completed.")

if __name__ == "__main__":
    fix_table()
