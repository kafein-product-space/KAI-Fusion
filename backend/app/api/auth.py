"""Authentication API endpoints for Agent-Flow V2.

Provides user authentication, registration, token management,
and profile endpoints using the new service layer architecture.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID

from app.services.dependencies import get_user_service_dep, get_db_session
from app.services.user_service import UserService, AuthenticationError
from app.services.base import ValidationError, NotFoundError, BusinessRuleError
from app.auth.middleware import get_current_user, get_optional_user
from app.db.models import User, UserCreate, UserUpdate

router = APIRouter()

# Request/Response Models

class SignUpRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class SignInRequest(BaseModel):
    email: EmailStr
    password: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str

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
    description="Register a new user account with email and password validation."
)
async def sign_up(
    request: SignUpRequest,
    session: AsyncSession = Depends(get_db_session),
    user_service: UserService = Depends(get_user_service_dep)
):
    """Create a new user account with proper validation."""
    try:
        # Create user creation object
        user_create = UserCreate(
            email=request.email,
            password=request.password,
            full_name=request.full_name
        )
        
        # Register user through service
        user = await user_service.register_user(session, user_create)
        
        # Generate tokens
        access_token = user_service.create_access_token(user)
        refresh_token = user_service.create_refresh_token(user)
        
        # Convert user to response format
        user_response = UserResponse(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            role=user.role.value,
            is_active=user.is_active,
            created_at=user.created_at.isoformat(),
            updated_at=user.updated_at.isoformat() if user.updated_at else None,
            last_login=user.last_login.isoformat() if user.last_login else None
        )
        
        return AuthResponse(
            user=user_response,
            access_token=access_token,
            refresh_token=refresh_token
        )
        
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except BusinessRuleError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user account"
        )

@router.post(
    "/signin", 
    response_model=AuthResponse,
    summary="🔑 User Sign In",
    description="Authenticate user with email and password, returns JWT tokens."
)
async def sign_in(
    request: SignInRequest,
    session: AsyncSession = Depends(get_db_session),
    user_service: UserService = Depends(get_user_service_dep)
):
    """Sign in with email and password."""
    try:
        # Authenticate user
        user = await user_service.authenticate_user(
            session, request.email, request.password
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Generate tokens
        access_token = user_service.create_access_token(user)
        refresh_token = user_service.create_refresh_token(user)
        
        # Convert user to response format
        user_response = UserResponse(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            role=user.role.value,
            is_active=user.is_active,
            created_at=user.created_at.isoformat(),
            updated_at=user.updated_at.isoformat() if user.updated_at else None,
            last_login=user.last_login.isoformat() if user.last_login else None
        )
        
        return AuthResponse(
            user=user_response,
            access_token=access_token,
            refresh_token=refresh_token
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )

@router.post(
    "/refresh", 
    response_model=TokenResponse,
    summary="🔄 Refresh Token",
    description="Refresh access token using refresh token."
)
async def refresh_token(
    request: RefreshTokenRequest,
    session: AsyncSession = Depends(get_db_session),
    user_service: UserService = Depends(get_user_service_dep)
):
    """Refresh access token using refresh token."""
    try:
        tokens = await user_service.refresh_access_token(
            session, request.refresh_token
        )
        
        if not tokens:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token"
            )
        
        return TokenResponse(**tokens)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token refresh failed"
        )

@router.post(
    "/signout",
    summary="👋 Sign Out",
    description="Sign out current user (client should discard tokens)."
)
async def sign_out(current_user: User = Depends(get_current_user)):
    """Sign out current user."""
    # With JWT tokens, signout is handled client-side by discarding tokens
    # This endpoint exists for consistency and potential future token blacklisting
    return {
        "success": True, 
        "message": f"User {current_user.email} signed out successfully"
    }

# User Profile Endpoints

@router.get(
    "/me", 
    response_model=UserResponse,
    summary="👤 Get Profile",
    description="Get current user profile information."
)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user information."""
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role.value,
        is_active=current_user.is_active,
        created_at=current_user.created_at.isoformat(),
        updated_at=current_user.updated_at.isoformat() if current_user.updated_at else None,
        last_login=current_user.last_login.isoformat() if current_user.last_login else None
    )

@router.put(
    "/me", 
    response_model=UserResponse,
    summary="✏️ Update Profile",
    description="Update current user profile information."
)
async def update_profile(
    request: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
    user_service: UserService = Depends(get_user_service_dep)
):
    """Update current user profile."""
    try:
        # Create update object
        user_update = UserUpdate(
            first_name=request.first_name,
            last_name=request.last_name
        )
        
        # Update profile through service
        updated_user = await user_service.update_user_profile(
            session, UUID(current_user.id), user_update
        )
        
        return UserResponse(
            id=str(updated_user.id),
            email=updated_user.email,
            first_name=updated_user.first_name,
            last_name=updated_user.last_name,
            role=updated_user.role.value,
            is_active=updated_user.is_active,
            created_at=updated_user.created_at.isoformat(),
            updated_at=updated_user.updated_at.isoformat() if updated_user.updated_at else None,
            last_login=updated_user.last_login.isoformat() if updated_user.last_login else None
        )
        
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )

# Password Management Endpoints

@router.post(
    "/change-password",
    summary="🔑 Change Password",
    description="Change user password with current password verification."
)
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
    user_service: UserService = Depends(get_user_service_dep)
):
    """Change user password."""
    try:
        await user_service.change_password(
            session,
            UUID(current_user.id),
            request.current_password,
            request.new_password
        )
        
        return {"success": True, "message": "Password changed successfully"}
        
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to change password"
        )

@router.post(
    "/reset-password-request",
    summary="📧 Request Password Reset",
    description="Request password reset email (returns success regardless of email existence)."
)
async def request_password_reset(
    request: ResetPasswordRequest,
    session: AsyncSession = Depends(get_db_session),
    user_service: UserService = Depends(get_user_service_dep)
):
    """Request password reset for email."""
    try:
        # Always return success for security (don't reveal if email exists)
        await user_service.reset_password_request(session, request.email)
        
        return {
            "success": True, 
            "message": "If the email exists, a password reset link has been sent"
        }
        
    except Exception as e:
        # Always return success for security
        return {
            "success": True, 
            "message": "If the email exists, a password reset link has been sent"
        }

@router.post(
    "/reset-password-confirm",
    summary="🔓 Confirm Password Reset",
    description="Confirm password reset with token and new password."
)
async def confirm_password_reset(
    request: ConfirmResetPasswordRequest,
    session: AsyncSession = Depends(get_db_session),
    user_service: UserService = Depends(get_user_service_dep)
):
    """Confirm password reset with token."""
    try:
        success = await user_service.reset_password(
            session,
            request.reset_token,
            request.new_password
        )
        
        if success:
            return {"success": True, "message": "Password reset successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )
        
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset failed"
        )

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
