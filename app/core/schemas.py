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

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    expires_in: float
    must_change_password: bool = False

class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[int] = None
    role: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)

class User(UserBase):
    id: int
    is_active: bool
    email_verified: bool
    must_change_password: bool
    created_at: datetime
    avatar_url: Optional[str] = None
    full_name: Optional[str] = None
    
    class Config:
        model_config = ConfigDict(from_attributes=True)

class UserUpdate(BaseModel):
    username: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None

class AvatarResponse(BaseModel):
    avatar_url: str

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
    email: EmailStr

class Player(PlayerBase):
    id: int
    coach_id: int
    
    class Config:
        model_config = ConfigDict(from_attributes=True)

class PlayerWithCredentials(Player):
    username: str
    temporary_password: str
    user_id: int

# Session schemas
class SessionBase(BaseModel):
    session_type: SessionType
    player_id: int
    description: Optional[str] = None

class SessionCreate(SessionBase):
    pass

class VideoBase(BaseModel):
    session_id: int
    file_path: str
    original_filename: Optional[str] = None
    file_size_mb: Optional[float] = None
    status: str
    created_at: datetime

class Video(VideoBase):
    id: int
    
    class Config:
        model_config = ConfigDict(from_attributes=True)

class VideoCreate(BaseModel):
    original_filename: str
    file_size_mb: float

class Session(SessionBase):
    id: int
    coach_id: int
    video_path: Optional[str] = None
    annotated_video_path: Optional[str] = None
    thumbnail_path: Optional[str] = None
    status: str
    created_at: datetime
    videos: List[Video] = []
    
    class Config:
        model_config = ConfigDict(from_attributes=True)

# Analysis schemas
class AnalysisBase(BaseModel):
    session_id: int
    analysis_type: str

class BowlingMetrics(BaseModel):
    elbow_extension: Optional[float] = None
    arm_type: Optional[str] = None
    bowling_style: Optional[str] = None
    release_point: Optional[Dict[str, float]] = None
    release_height: Optional[float] = None
    release_speed: Optional[float] = None
    swing_type: Optional[str] = None
    accuracy_score: Optional[float] = None
    front_foot_landing: Optional[Dict[str, float]] = None
    icc_compliant: Optional[bool] = None
    violations: List[str] = []
    recommendations: List[str] = []

class BattingMetrics(BaseModel):
    stance_type: Optional[str] = None
    weight_distribution: Optional[Dict[str, float]] = None
    bat_angle: Optional[float] = None
    head_stillness: Optional[float] = None
    head_position: Optional[Dict[str, float]] = None
    shot_selection: Optional[str] = None
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
    delivery_count: Optional[int] = 0
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

# Feedback Schemas
class FeedbackBase(BaseModel):
    comments: str
    drill_recommendations: List[str] = []
    rating: int = Field(5, ge=1, le=5)

class FeedbackCreate(FeedbackBase):
    session_id: int

class FeedbackUpdate(BaseModel):
    comments: Optional[str] = None
    drill_recommendations: Optional[List[str]] = None
    rating: Optional[int] = Field(None, ge=1, le=5)

class FeedbackResponse(FeedbackBase):
    id: int
    session_id: int
    coach_id: int
    coach_name: str
    created_at: datetime

    class Config:
        model_config = ConfigDict(from_attributes=True)