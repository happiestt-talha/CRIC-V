# File: app/api/auth.py
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import or_
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from typing import Optional
import secrets

from app.core import security, schemas
from app.database import get_db
from app.core.models import User, Player
from app.services.email_service import email_service

router = APIRouter()

@router.post("/login", response_model=schemas.Token)
async def login(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    OAuth2 compatible token login, get an access token for future requests
    Returns tokens in both response body and HTTP-only cookies
    """
    user = db.query(User).filter(
        or_(User.username == form_data.username, User.email == form_data.username)
    ).first()
    
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if email is verified for self-registered users
    # Rule B users (must_change_password=True) bypass verification
    if not user.email_verified and not user.must_change_password:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in. Check your inbox."
        )
        
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    # Create tokens
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.username, "user_id": user.id, "role": user.role},
        expires_delta=access_token_expires
    )
    refresh_token = security.create_refresh_token(
        data={"sub": user.username, "user_id": user.id}
    )
    
    # Store refresh token hash in database
    user.refresh_token_hash = security.get_password_hash(refresh_token)
    db.commit()
    
    # Set HTTP-only cookies
    security.set_auth_cookies(response, access_token, refresh_token)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": access_token_expires.total_seconds(),
        "must_change_password": user.must_change_password
    }

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    response: Response,
    user_data: schemas.UserCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Register a new user (Self-registration)
    Rule A: Players check if pre-created by coach
    Rule D: Admin removed from public reg (logic check here)
    """
    if user_data.role == "admin":
        raise HTTPException(status_code=403, detail="Admin registration is not allowed.")

    # Rule A: Check if a coach pre-created this player profile
    db_user_by_email = db.query(User).filter(User.email == user_data.email).first()
    if db_user_by_email:
        # If user exists and is a player with a coach, it's a pre-created account
        if user_data.role == "player":
            player_profile = db.query(Player).filter(Player.user_id == db_user_by_email.id).first()
            if player_profile and player_profile.coach_id is not None:
                raise HTTPException(
                    status_code=400, 
                    detail="An account for this email already exists. Please use the credentials provided by your coach."
                )
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check if username exists
    db_user_by_username = db.query(User).filter(User.username == user_data.username).first()
    if db_user_by_username:
        raise HTTPException(status_code=400, detail="Username already registered")
        
    # Create new user - Unverified and Inactive by default for self-reg
    hashed_password = security.get_password_hash(user_data.password)
    db_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        role=user_data.role,
        is_active=False,
        email_verified=False,
        must_change_password=False
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Generate verification token
    verification_token = secrets.token_urlsafe(32)
    db_user.email_verification_token = verification_token
    db_user.verification_sent_at = datetime.utcnow()
    db.commit()
    
    # Send verification email in background
    background_tasks.add_task(email_service.send_verification_email, db_user.email, verification_token)
    
    # If user is a player, create player profile (self-reg, coach_id=NULL)
    if user_data.role == "player":
        player = Player(
            user_id=db_user.id,
            full_name=getattr(user_data, 'full_name', user_data.username),
            age=getattr(user_data, 'age', None),
            batting_hand=getattr(user_data, 'batting_hand', None),
            bowling_style=getattr(user_data, 'bowling_style', None),
            coach_id=None
        )
        db.add(player)
        db.commit()
    
    return {"message": "Registration successful. Please check your email to verify your account."}

@router.post("/change-password")
async def change_password(
    request: schemas.ChangePasswordRequest,
    current_user: User = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Force password change or regular password change
    Sets must_change_password = False
    """
    if not security.verify_password(request.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    
    current_user.hashed_password = security.get_password_hash(request.new_password)
    current_user.must_change_password = False
    db.commit()
    
    return {"message": "Password changed successfully."}

@router.post("/refresh", response_model=schemas.Token)
async def refresh_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Refresh access token using refresh token
    """
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")
    
    payload = security.decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    username = payload.get("sub")
    user = db.query(User).filter(User.username == username).first()
    
    if not user or not user.refresh_token_hash:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    # Verify refresh token hash
    if not security.verify_password(refresh_token, user.refresh_token_hash):
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    # Create new tokens
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.username, "user_id": user.id, "role": user.role},
        expires_delta=access_token_expires
    )
    new_refresh_token = security.create_refresh_token(
        data={"sub": user.username, "user_id": user.id}
    )
    
    # Update refresh token hash
    user.refresh_token_hash = security.get_password_hash(new_refresh_token)
    db.commit()
    
    # Set new cookies
    security.set_auth_cookies(response, access_token, new_refresh_token)
    
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "expires_in": access_token_expires.total_seconds(),
        "must_change_password": user.must_change_password
    }

@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    current_user: User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Logout user and invalidate refresh token
    """
    # Clear refresh token from database
    current_user.refresh_token_hash = None
    db.commit()
    
    # Clear cookies
    security.clear_auth_cookies(response)
    
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=schemas.User)
async def read_users_me(
    current_user: User = Depends(security.get_current_active_user)
):
    """
    Get current user information
    """
    return current_user

@router.get("/verify")
async def verify_token(
    current_user: Optional[User] = Depends(security.get_current_user)
):
    """
    Verify if token is valid
    """
    if current_user:
        return {"valid": True, "user": current_user.username}
    return {"valid": False}

@router.get("/verify-email")
async def verify_email(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Verify user email using token
    """
    user = db.query(User).filter(User.email_verification_token == token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link.")
    
    user.email_verified = True
    user.is_active = True
    user.email_verification_token = None
    db.commit()
    
    return {"message": "Email verified successfully. You can now log in."}

@router.post("/resend-verification")
async def resend_verification(
    request: schemas.ForgotPasswordRequest, # Using same schema for {email}
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Resend verification email with 60s rate limit
    """
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        # Don't reveal user existence
        return {"message": "Verification email resent if account exists and is unverified."}
    
    if user.email_verified:
        return {"message": "Email already verified."}
    
    # Rate limit check (60 seconds)
    if user.verification_sent_at:
        delta = datetime.utcnow() - user.verification_sent_at
        if delta.total_seconds() < 60:
            raise HTTPException(
                status_code=429, 
                detail=f"Please wait {60 - int(delta.total_seconds())} seconds before resending."
            )
    
    verification_token = secrets.token_urlsafe(32)
    user.email_verification_token = verification_token
    user.verification_sent_at = datetime.utcnow()
    db.commit()
    
    background_tasks.add_task(email_service.send_verification_email, user.email, verification_token)
    
    return {"message": "Verification email resent if account exists and is unverified."}

@router.post("/forgot-password")
async def forgot_password(
    request: schemas.ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Send password reset email
    """
    user = db.query(User).filter(User.email == request.email).first()
    
    # Always return 200 with the same message for security
    message = {"message": "If this email is registered, a reset link has been sent."}
    
    if not user:
        return message
    
    reset_token = secrets.token_urlsafe(32)
    user.password_reset_token = reset_token
    user.password_reset_token_expires_at = datetime.utcnow() + timedelta(hours=1)
    db.commit()
    
    background_tasks.add_task(email_service.send_password_reset_email, user.email, reset_token)
    
    return message

@router.post("/reset-password")
async def reset_password(
    request: schemas.ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Reset password using token
    """
    user = db.query(User).filter(User.password_reset_token == request.token).first()
    
    if not user or not user.password_reset_token_expires_at or user.password_reset_token_expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=400, 
            detail="This reset link is invalid or has expired. Please request a new one."
        )
    
    # Password length check is already handled by Pydantic schema (min_length=8)
    user.hashed_password = security.get_password_hash(request.new_password)
    user.password_reset_token = None
    user.password_reset_token_expires_at = None
    user.must_change_password = False
    db.commit()
    
    return {"message": "Password reset successfully. You can now log in."}