from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, JSON, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
from sqlalchemy.sql import func

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="player")  # player, coach, admin
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    refresh_token_hash = Column(String, nullable=True)
    
    # Relationships
    player = relationship("Player", back_populates="user", uselist=False, cascade="all, delete-orphan")
    # Coach can have many sessions they coached
    coached_sessions = relationship("Session", back_populates="coach", foreign_keys="Session.coach_id")
    
    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}')>"

class Player(Base):
    __tablename__ = "players"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, index=True)
    full_name = Column(String)
    age = Column(Integer)
    batting_style = Column(String)
    bowling_style = Column(String)
    bio = Column(Text, nullable=True)
    profile_picture = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="player")
    # Player can have many sessions
    sessions = relationship("Session", back_populates="player")
    
    def __repr__(self):
        return f"<Player(id={self.id}, user_id={self.user_id}, name='{self.full_name}')>"

class Session(Base):
    __tablename__ = "sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=True)
    coach_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    session_type = Column(String)  # bowling, batting
    video_path = Column(String)
    status = Column(String)  # uploaded, processing, completed, failed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    player = relationship("Player", back_populates="sessions")
    coach = relationship("User", back_populates="coached_sessions", foreign_keys=[coach_id])
    
    # For backward compatibility, you can add a property to get user through player
    @property
    def player_user(self):
        return self.player.user if self.player else None
    
    def __repr__(self):
        return f"<Session(id={self.id}, type='{self.session_type}', status='{self.status}')>"

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
    
    session = relationship("Session", backref="analysis")
    
    def __repr__(self):
        return f"<Analysis(id={self.id}, session_id={self.session_id}, type='{self.analysis_type}')>"