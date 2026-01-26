# app/api/auth.py
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import Optional

from app.core import security, schemas
from app.database import get_db
from app.core.models import User, Player

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
    user = db.query(User).filter(User.username == form_data.username).first()
    
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    # Create tokens
    # Use constants from security module instead of settings
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
        "expires_in": access_token_expires.total_seconds()
    }

@router.post("/register", response_model=schemas.User)
async def register(
    response: Response,
    user_data: schemas.UserCreate,
    db: Session = Depends(get_db)
):
    """
    Register a new user
    """
    from app.core.models import User, Player
    
    # Check if user exists
    db_user = db.query(User).filter(User.username == user_data.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Check email
    db_user = db.query(User).filter(User.email == user_data.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = security.get_password_hash(user_data.password)
    db_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        role=user_data.role,
        is_active=True
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # If user is a player, create player profile
    if user_data.role == "player":
        player = Player(
            user_id=db_user.id,
            full_name=getattr(user_data, 'full_name', user_data.username),
            age=getattr(user_data, 'age', None),
            batting_hand=getattr(user_data, 'batting_hand', None),
            bowling_style=getattr(user_data, 'bowling_style', None)
        )
        db.add(player)
        db.commit()
    
    # Create tokens
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": db_user.username, "user_id": db_user.id, "role": db_user.role},
        expires_delta=access_token_expires
    )
    refresh_token = security.create_refresh_token(
        data={"sub": db_user.username, "user_id": db_user.id}
    )
    
    # Store refresh token hash
    db_user.refresh_token_hash = security.get_password_hash(refresh_token)
    db.commit()
    
    # Set cookies
    security.set_auth_cookies(response, access_token, refresh_token)
    
    return db_user

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
        "expires_in": access_token_expires.total_seconds()
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