from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Boolean,
    ForeignKey, JSON, Text
)
from sqlalchemy.orm import relationship
from app.database import Base
from sqlalchemy.sql import func
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String(20), default="player", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    refresh_token_hash = Column(String, nullable=True)

    # Relationships
    player = relationship(
        "Player",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
        foreign_keys="Player.user_id",
    )

    coached_sessions = relationship(
        "Session",
        back_populates="coach",
        foreign_keys="Session.coach_id",
    )

    coached_players = relationship(
        "Player",
        back_populates="coach",
        foreign_keys="Player.coach_id",
    )

    def __repr__(self):
        return f"<User id={self.id} username={self.username!r}>"


class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )

    coach_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    full_name = Column(String(255))
    age = Column(Integer)
    batting_hand = Column(String(20))
    bowling_style = Column(String(50))
    bio = Column(Text, nullable=True)
    profile_picture = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user = relationship(
        "User",
        back_populates="player",
        foreign_keys=[user_id],
    )

    coach = relationship(
        "User",
        back_populates="coached_players",
        foreign_keys=[coach_id],
    )

    sessions = relationship(
        "Session",
        back_populates="player",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<Player id={self.id} user_id={self.user_id} name={self.full_name!r}>"


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)

    player_id = Column(
        Integer,
        ForeignKey("players.id", ondelete="SET NULL"),
        nullable=True,
    )

    coach_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    session_type = Column(String(50), nullable=False)  # bowling, batting
    video_path = Column(String, nullable=True)
    status = Column(String(30), nullable=False)  # uploaded, processing, completed, failed

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    player = relationship("Player", back_populates="sessions")
    coach = relationship(
        "User",
        back_populates="coached_sessions",
        foreign_keys=[coach_id],
    )

    analysis = relationship(
        "Analysis",
        back_populates="session",
        uselist=False,
        cascade="all, delete-orphan",
    )

    @property
    def player_user(self):
        return self.player.user if self.player else None

    def __repr__(self):
        return f"<Session id={self.id} type={self.session_type!r} status={self.status!r}>"


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)

    session_id = Column(
        Integer,
        ForeignKey("sessions.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    analysis_type = Column(String(50), nullable=False)

    # Bowling metrics
    elbow_extension = Column(Float)
    arm_type = Column(String(50))
    release_point = Column(JSON)
    swing_type = Column(String(50))
    front_foot_landing = Column(JSON)
    icc_compliant = Column(Boolean)

    # Batting metrics
    stance_type = Column(String(50))
    weight_distribution = Column(JSON)
    bat_angle = Column(Float)
    head_position = Column(JSON)
    
    recommendations = Column(JSON, default=list)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    session = relationship("Session", back_populates="analysis")

    @property
    def bowling_metrics(self):
        if self.analysis_type != "bowling":
            return None
        return {
            "elbow_extension": self.elbow_extension,
            "arm_type": self.arm_type,
            "release_point": self.release_point,
            "swing_type": self.swing_type,
            "front_foot_landing": self.front_foot_landing,
            "icc_compliant": self.icc_compliant,
            "recommendations": self.recommendations or []
        }

    @property
    def batting_metrics(self):
        if self.analysis_type != "batting":
            return None
        return {
            "stance_type": self.stance_type,
            "weight_distribution": self.weight_distribution,
            "bat_angle": self.bat_angle,
            "head_position": self.head_position,
            "recommendations": self.recommendations or []
        }
        
    @property
    def pose_data(self):
        # We don't store raw pose data in the analysis table currently
        # It might be in session.processed_data or a separate file
        return None

    def __repr__(self):
        return f"<Analysis id={self.id} session_id={self.session_id} type={self.analysis_type!r}>"
