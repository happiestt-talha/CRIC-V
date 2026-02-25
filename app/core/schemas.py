from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

# Enums
class SessionType(str, Enum):
    BOWLING = "bowling"
    BATTING = "batting"
    FIELDING = "fielding"

class UserRole(str, Enum):
    ADMIN = "admin"
    COACH = "coach"
    PLAYER = "player"

class BattingHand(str, Enum):
    RIGHT = "right"
    LEFT = "left"

class BowlingStyle(str, Enum):
    RIGHT_ARM_FAST = "right_arm_fast"
    RIGHT_ARM_MEDIUM = "right_arm_medium"
    RIGHT_ARM_SPIN = "right_arm_spin"
    LEFT_ARM_FAST = "left_arm_fast"
    LEFT_ARM_MEDIUM = "left_arm_medium"
    LEFT_ARM_SPIN = "left_arm_spin"

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str
    role: UserRole = UserRole.PLAYER

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserLogin(BaseModel):
    username: str
    password: str

class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        model_config = ConfigDict(from_attributes=True)

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# Player schemas
class PlayerBase(BaseModel):
    full_name: str
    age: Optional[int] = None
    batting_hand: Optional[BattingHand] = BattingHand.RIGHT
    bowling_style: Optional[BowlingStyle] = None

class PlayerCreate(PlayerBase):
    pass

class Player(PlayerBase):
    id: int
    coach_id: int
    
    class Config:
        model_config = ConfigDict(from_attributes=True)

# Session schemas
class SessionBase(BaseModel):
    session_type: SessionType
    player_id: int
    description: Optional[str] = None

class SessionCreate(SessionBase):
    pass

class Session(SessionBase):
    id: int
    coach_id: int
    video_path: Optional[str] = None
    status: str
    created_at: datetime
    
    class Config:
        model_config = ConfigDict(from_attributes=True)

# Analysis schemas
class AnalysisBase(BaseModel):
    session_id: int
    analysis_type: str

class BowlingMetrics(BaseModel):
    elbow_extension: float
    arm_type: str
    release_point: Dict[str, float]
    swing_type: Optional[str] = None
    front_foot_landing: Optional[Dict[str, float]] = None
    icc_compliant: bool
    recommendations: List[str] = []

class BattingMetrics(BaseModel):
    stance_type: str
    weight_distribution: Dict[str, float]
    bat_angle: float
    head_position: Dict[str, float]
    recommendations: List[str] = []

class AnalysisCreate(AnalysisBase):
    bowling_metrics: Optional[BowlingMetrics] = None
    batting_metrics: Optional[BattingMetrics] = None
    pose_data: Optional[Dict[str, Any]] = None

class Analysis(AnalysisBase):
    id: int
    bowling_metrics: Optional[BowlingMetrics] = None
    batting_metrics: Optional[BattingMetrics] = None
    pose_data: Optional[Dict[str, Any]] = None
    created_at: datetime
    
    class Config:
        model_config = ConfigDict(from_attributes=True)

# Dashboard schemas
class DashboardStats(BaseModel):
    total_sessions: int
    total_players: int
    recent_analyses: List[Analysis]
    upcoming_sessions: List[Session]

# Bowling Insights Schemas
class SpeedConsistency(BaseModel):
    avg_speed: float
    std_dev: float
    consistency_score: float
    total_deliveries: int
    max_speed: float
    min_speed: float

class LineLengthHeatmap(BaseModel):
    heatmap: Dict[str, Dict[str, float]]  # e.g., {"off": {"yorker": 12.5, ...}}
    most_common_line: str
    most_common_length: str

class BowlingInsightsResponse(BaseModel):
    player_id: int
    speed_consistency: SpeedConsistency
    line_length_heatmap: LineLengthHeatmap
    # You can add more fields later (e.g., economy_prediction, wicket_probability)