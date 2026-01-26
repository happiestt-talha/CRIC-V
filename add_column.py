from sqlalchemy import create_engine, text
import json

DATABASE_URL = "sqlite:///./cricv.db"
engine = create_engine(DATABASE_URL)

with engine.connect() as connection:
    try:
        connection.execute(text("ALTER TABLE analyses ADD COLUMN recommendations JSON"))
        print("Column 'recommendations' added successfully.")
    except Exception as e:
        print(f"Error (column might already exist): {e}")
