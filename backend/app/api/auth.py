from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from app.auth.supabase_client import auth_client
from app.auth.dependencies import get_current_user
from typing import Optional

router = APIRouter()

class SignUpRequest(BaseModel):
    email: EmailStr
    password: str

class SignInRequest(BaseModel):
    email: EmailStr
    password: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class UserResponse(BaseModel):
    id: str
    email: str
    created_at: str
    updated_at: Optional[str] = None

class AuthResponse(BaseModel):
    user: UserResponse
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

@router.post("/signup", response_model=AuthResponse)
async def sign_up(request: SignUpRequest):
    """Create a new user account"""
    try:
        response = await auth_client.sign_up(request.email, request.password)
        
        if not response.user:
            raise HTTPException(status_code=400, detail="Failed to create user")
        
        return AuthResponse(
            user=UserResponse(
                id=response.user.id,
                email=response.user.email,
                created_at=response.user.created_at
            ),
            access_token=response.session.access_token,
            refresh_token=response.session.refresh_token
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/signin", response_model=AuthResponse)
async def sign_in(request: SignInRequest):
    """Sign in with email and password"""
    try:
        response = await auth_client.sign_in(request.email, request.password)
        
        if not response.user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        return AuthResponse(
            user=UserResponse(
                id=response.user.id,
                email=response.user.email,
                created_at=response.user.created_at
            ),
            access_token=response.session.access_token,
            refresh_token=response.session.refresh_token
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid credentials")

@router.post("/refresh", response_model=AuthResponse)
async def refresh_token(request: RefreshTokenRequest):
    """Refresh access token"""
    try:
        response = await auth_client.refresh_token(request.refresh_token)
        
        if not response.user:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        
        return AuthResponse(
            user=UserResponse(
                id=response.user.id,
                email=response.user.email,
                created_at=response.user.created_at
            ),
            access_token=response.session.access_token,
            refresh_token=response.session.refresh_token
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

@router.post("/signout")
async def sign_out(current_user: dict = Depends(get_current_user)):
    """Sign out current user"""
    # Note: With Supabase, signout is typically handled client-side
    # This endpoint is here for consistency
    return {"success": True, "message": "Signed out successfully"}

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        created_at=current_user.get("created_at", ""),
        updated_at=current_user.get("updated_at")
    )
