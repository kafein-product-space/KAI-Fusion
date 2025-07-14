"""Authentication API endpoints for Agent-Flow V2.

Provides user authentication, registration, token management,
and profile endpoints using the new service layer architecture.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from types import SimpleNamespace
from datetime import timedelta

from app.services.dependencies import get_user_service_dep, get_db_session
from app.services.user_service import UserService
from app.schemas.auth import (
    SignUpRequest, 
    UserUpdate, 
    RefreshTokenRequest, 
    TokenResponse,
    UserUpdateProfile,
    UserResponse
)
from app.auth.dependencies import get_current_user
from app.core.security import create_access_token, create_refresh_token
from app.core.config import get_settings
from jose import jwt, JWTError
from app.models.user import User

router = APIRouter()

# Request/Response Models

class SignInRequest(BaseModel):
    email: EmailStr
    password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr

class ConfirmResetPasswordRequest(BaseModel):
    reset_token: str
    new_password: str

class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    role: str
    is_active: bool
    created_at: str
    updated_at: Optional[str] = None
    last_login: Optional[str] = None

    class Config:
        from_attributes = True

class AuthResponse(BaseModel):
    user: UserResponse
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

# Authentication Endpoints

@router.post(
    "/signup", 
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="🔐 User Registration",
)
async def sign_up(
    request: SignUpRequest,
    session: AsyncSession = Depends(get_db_session),
    user_service: UserService = Depends(get_user_service_dep)
):
    """Create a new user account."""
    user_data = request.user
    existing_user = await user_service.get_by_email(db=session, email=user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    new_user = await user_service.create_user(db=session, user_data=user_data)
    
    settings = get_settings()
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": new_user.email}, expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(data={"sub": new_user.email})
    
    user_response = UserResponse(
        id=str(new_user.id),
        email=new_user.email,
        full_name=new_user.full_name,
        role=new_user.role or "user",
        is_active=new_user.status == "active",
        created_at=str(new_user.created_at),
        updated_at=str(new_user.updated_at) if new_user.updated_at else None,
        last_login=str(new_user.last_login) if new_user.last_login else None,
    )

    return AuthResponse(
        user=user_response,
        access_token=access_token,
        refresh_token=refresh_token,
    )

@router.post(
    "/signin", 
    response_model=AuthResponse,
    summary="🔑 User Sign In",
)
async def sign_in(
    request: SignInRequest,
    session: AsyncSession = Depends(get_db_session),
    user_service: UserService = Depends(get_user_service_dep)
):
    """Sign in with email and password."""
    user = await user_service.authenticate_user(
        db=session, email=request.email, password=request.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    settings = get_settings()
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(data={"sub": user.email})

    user_response = UserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        role=user.role or "user",
        is_active=user.status == "active",
        created_at=str(user.created_at),
        updated_at=str(user.updated_at) if user.updated_at else None,
        last_login=str(user.last_login) if user.last_login else None,
    )

    return AuthResponse(
        user=user_response,
        access_token=access_token,
        refresh_token=refresh_token,
    )

@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="🔄 Refresh Access Token"
)
async def refresh_token(request: RefreshTokenRequest):
    """
    Get a new access token from a refresh token.
    """
    settings = get_settings()
    try:
        payload = jwt.decode(
            request.refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
                headers={"WWW-Authenticate": "Bearer"},
            )
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    new_access_token = create_access_token(
        data={"sub": email}, expires_delta=access_token_expires
    )
    
    return TokenResponse(
        access_token=new_access_token,
        refresh_token=request.refresh_token,  # Or issue a new one if you want to rotate them
        token_type="bearer"
    )


@router.post(
    "/signout",
    status_code=status.HTTP_200_OK,
    summary="👤 User Sign Out"
)
async def sign_out(current_user: SimpleNamespace = Depends(get_current_user)):
    """
    Sign out the current user. (Client-side token deletion is required)
    """
    # This endpoint confirms the user wishes to sign out.
    # The frontend is responsible for deleting the access and refresh tokens.
    return {"message": "Successfully signed out"}


# User Profile Endpoints

@router.get(
    "/me", 
    response_model=UserResponse,
    summary="👤 Get Profile",
)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information."""
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role or "user",
        is_active=current_user.status == "active",
        created_at=str(current_user.created_at),
        updated_at=str(current_user.updated_at) if current_user.updated_at else None,
        last_login=str(current_user.last_login) if current_user.last_login else None,
    )

@router.put(
    "/me",
    response_model=UserResponse,
    summary="👤 Update Profile"
)
async def update_current_user_info(
    update_data: UserUpdateProfile,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
    user_service: UserService = Depends(get_user_service_dep)
):
    """Update current user's full name and/or password."""
    if not update_data.full_name and not update_data.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one field (full_name or password) must be provided for update."
        )
    
    updated_user = await user_service.update_user(
        db=session, user=current_user, update_data=update_data
    )
    
    return UserResponse(
        id=str(updated_user.id),
        email=updated_user.email,
        full_name=updated_user.full_name,
        role=updated_user.role or "user",
        is_active=updated_user.status == "active",
        created_at=str(updated_user.created_at),
        updated_at=str(updated_user.updated_at) if updated_user.updated_at else None,
        last_login=str(updated_user.last_login) if updated_user.last_login else None,
    )

# Password Management Endpoints

@router.post("/change-password")
async def change_password():
    raise HTTPException(status_code=501, detail="Not Implemented")

@router.post("/reset-password-request")
async def request_password_reset():
    raise HTTPException(status_code=501, detail="Not Implemented")

@router.post("/reset-password-confirm")
async def confirm_password_reset():
    raise HTTPException(status_code=501, detail="Not Implemented")
# Health endpoint for auth service
@router.get(
    "/health",
    summary="🩺 Auth Service Health",
    description="Check authentication service health status."
)
async def auth_health():
    """Check auth service health."""
    return {
        "service": "authentication",
        "status": "healthy",
        "version": "2.0",
        "features": [
            "JWT authentication",
            "User registration",
            "Password management",
            "Token refresh",
            "Profile management"
        ]
    }

