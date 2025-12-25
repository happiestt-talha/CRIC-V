from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="player")  # "admin", "coach", "player"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    sessions = relationship("Session", back_populates="owner")
    players = relationship("Player", back_populates="coach")  # if coach

class Player(Base):
    __tablename__ = "players"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    age = Column(Integer)
    batting_hand = Column(String)  # "right", "left"
    bowling_style = Column(String)  # "right_arm_fast", "left_arm_spin", etc.
    coach_id = Column(Integer, ForeignKey("users.id"))
    
    coach = relationship("User", back_populates="players")
    sessions = relationship("Session", back_populates="player")

class Session(Base):
    __tablename__ = "sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    session_type = Column(String)  # "batting", "bowling", "fielding"
    player_id = Column(Integer, ForeignKey("players.id"))
    coach_id = Column(Integer, ForeignKey("users.id"))
    video_path = Column(String)
    processed_data = Column(JSON)  # Store pose keypoints, metrics
    status = Column(String, default="uploaded")  # "uploaded", "processing", "completed", "failed"
    created_at = Column(DateTime, default=datetime.utcnow)
    
    player = relationship("Player", back_populates="sessions")
    owner = relationship("User", back_populates="sessions")
    analysis = relationship("Analysis", back_populates="session")

class Analysis(Base):
    __tablename__ = "analyses"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"))
    analysis_type = Column(String)  # "bowling", "batting"
    
    # Bowling Metrics
    elbow_extension = Column(Float)
    arm_type = Column(String)
    release_point = Column(JSON)  # {"x": 0.5, "y": 0.5, "z": 0.5}
    swing_type = Column(String)
    front_foot_landing = Column(JSON)
    icc_compliant = Column(Boolean)
    
    # Batting Metrics
    stance_type = Column(String)
    weight_distribution = Column(JSON)
    bat_angle = Column(Float)
    head_position = Column(JSON)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    session = relationship("Session", back_populates="analysis")