"""Authentication API endpoints"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
import jwt
from passlib.context import CryptContext

from app.core.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter()
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
settings = get_settings()

# Mock user database (replace with real database in production)
MOCK_USERS = {
    "admin@example.com": {
        "id": "1",
        "email": "admin@example.com",
        "full_name": "Admin User",
        "role": "admin",
        "hashed_password": pwd_context.hash("admin123"),
        "is_active": True,
        "created_at": datetime.utcnow().isoformat()
    },
    "user@example.com": {
        "id": "2", 
        "email": "user@example.com",
        "full_name": "Regular User",
        "role": "user",
        "hashed_password": pwd_context.hash("user123"),
        "is_active": True,
        "created_at": datetime.utcnow().isoformat()
    }
}

# Request/Response Models
class SignUpRequest(BaseModel):
    user: Dict[str, Any]  # Flexible format to match frontend

class SignInRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: str

class AuthResponse(BaseModel):
    user: UserResponse
    access_token: str
    refresh_token: str
    token_type: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=30)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
    return encoded_jwt

def create_refresh_token(data: dict):
    """Create JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_user_by_email(email: str) -> Optional[Dict]:
    """Get user by email from mock database"""
    return MOCK_USERS.get(email)

def authenticate_user(email: str, password: str) -> Optional[Dict]:
    """Authenticate user with email and password"""
    user = get_user_by_email(email)
    if not user:
        return None
    if not verify_password(password, user["hashed_password"]):
        return None
    return user

@router.post("/signup", response_model=AuthResponse)
async def signup(request: SignUpRequest):
    """Register a new user"""
    try:
        user_data = request.user
        email = user_data.get("email")
        name = user_data.get("name", "")
        password = user_data.get("credential", "defaultpass")  # Using credential as password
        
        if not email:
            raise HTTPException(status_code=400, detail="Email is required")
        
        # Check if user already exists
        if email in MOCK_USERS:
            raise HTTPException(status_code=400, detail="User already exists")
        
        # Create new user
        user_id = str(len(MOCK_USERS) + 1)
        hashed_password = pwd_context.hash(password)
        
        new_user = {
            "id": user_id,
            "email": email,
            "full_name": name,
            "role": "user",
            "hashed_password": hashed_password,
            "is_active": True,
            "created_at": datetime.utcnow().isoformat()
        }
        
        MOCK_USERS[email] = new_user
        
        # Generate tokens
        access_token = create_access_token({"sub": email, "user_id": user_id})
        refresh_token = create_refresh_token({"sub": email, "user_id": user_id})
        
        user_response = UserResponse(
            id=user_id,
            email=email,
            full_name=name,
            role="user",
            is_active=True,
            created_at=new_user["created_at"]
        )
        
        return AuthResponse(
            user=user_response,
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer"
        )
        
    except Exception as e:
        logger.error(f"Signup error: {e}")
        raise HTTPException(status_code=500, detail="Registration failed")

@router.post("/signin", response_model=AuthResponse)
async def signin(request: SignInRequest):
    """Authenticate user and return tokens"""
    user = authenticate_user(request.email, request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is inactive"
        )
    
    # Generate tokens
    access_token = create_access_token({"sub": user["email"], "user_id": user["id"]})
    refresh_token = create_refresh_token({"sub": user["email"], "user_id": user["id"]})
    
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        role=user["role"],
        is_active=user["is_active"],
        created_at=user["created_at"]
    )
    
    return AuthResponse(
        user=user_response,
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer"
    )

@router.post("/signout")
async def signout():
    """Sign out user (token invalidation would be handled client-side for now)"""
    return {"message": "Successfully signed out"}

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshTokenRequest):
    """Refresh access token using refresh token"""
    try:
        payload = jwt.decode(request.refresh_token, settings.SECRET_KEY, algorithms=["HS256"])
        email: str = payload.get("sub")
        user_id: str = payload.get("user_id")
        
        if email is None or user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Verify user still exists and is active
        user = get_user_by_email(email)
        if not user or not user["is_active"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )
        
        # Generate new tokens
        new_access_token = create_access_token({"sub": email, "user_id": user_id})
        new_refresh_token = create_refresh_token({"sub": email, "user_id": user_id})
        
        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            token_type="bearer"
        )
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired"
        )
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user profile"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        email: str = payload.get("sub")
        
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        user = get_user_by_email(email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        return UserResponse(
            id=user["id"],
            email=user["email"],
            full_name=user["full_name"],
            role=user["role"],
            is_active=user["is_active"],
            created_at=user["created_at"]
        )
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired"
        )
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

# Test endpoints for development
@router.get("/test/users")
async def list_test_users():
    """List all test users (development only)"""
    return {
        "users": [
            {
                "email": email,
                "full_name": user["full_name"],
                "role": user["role"],
                "is_active": user["is_active"]
            }
            for email, user in MOCK_USERS.items()
        ],
        "credentials": {
            "admin": {"email": "admin@example.com", "password": "admin123"},
            "user": {"email": "user@example.com", "password": "user123"}
        }
    }