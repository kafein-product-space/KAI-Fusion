"""Users API endpoints"""

import logging
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter()

# Mock users data
MOCK_USERS = {
    "1": {
        "id": "1",
        "email": "admin@example.com",
        "full_name": "Admin User",
        "is_active": True,
        "is_verified": True,
        "role": "admin",
        "created_at": "2025-01-01T00:00:00Z",
        "last_login": "2025-01-14T10:00:00Z",
        "workflow_count": 5,
        "execution_count": 23
    },
    "2": {
        "id": "2",
        "email": "user@example.com", 
        "full_name": "Regular User",
        "is_active": True,
        "is_verified": True,
        "role": "user",
        "created_at": "2025-01-10T00:00:00Z",
        "last_login": "2025-01-13T15:30:00Z",
        "workflow_count": 2,
        "execution_count": 8
    }
}

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    is_active: bool
    is_verified: bool
    role: str
    created_at: str
    last_login: str
    workflow_count: int
    execution_count: int

class UserUpdate(BaseModel):
    full_name: str = None
    is_active: bool = None
    role: str = None

class UserProfile(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    is_verified: bool
    role: str
    created_at: str
    last_login: str
    preferences: Dict[str, Any]
    statistics: Dict[str, Any]

@router.get("/", response_model=List[UserResponse])
async def get_all_users():
    """Get all users (admin only)"""
    return [UserResponse(**user) for user in MOCK_USERS.values()]

@router.get("/me", response_model=UserProfile)
async def get_current_user_profile():
    """Get current user's detailed profile"""
    # Mock current user data
    user = MOCK_USERS["1"]  # Assume admin user for demo
    
    return UserProfile(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        is_verified=user["is_verified"],
        role=user["role"],
        created_at=user["created_at"],
        last_login=user["last_login"],
        preferences={
            "theme": "dark",
            "language": "en",
            "notifications": True,
            "auto_save": True
        },
        statistics={
            "total_workflows": user["workflow_count"],
            "total_executions": user["execution_count"],
            "successful_executions": 20,
            "failed_executions": 3,
            "avg_execution_time": 2.5
        }
    )

@router.put("/me", response_model=UserProfile)
async def update_current_user_profile(profile_data: Dict[str, Any]):
    """Update current user's profile"""
    user = MOCK_USERS["1"]  # Mock current user
    
    # Update allowed fields
    if "full_name" in profile_data:
        user["full_name"] = profile_data["full_name"]
    
    return await get_current_user_profile()

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    """Get specific user by ID (admin only)"""
    user = MOCK_USERS.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(**user)

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, update_data: UserUpdate):
    """Update user (admin only)"""
    user = MOCK_USERS.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update fields if provided
    if update_data.full_name is not None:
        user["full_name"] = update_data.full_name
    if update_data.is_active is not None:
        user["is_active"] = update_data.is_active
    if update_data.role is not None:
        user["role"] = update_data.role
    
    return UserResponse(**user)

@router.delete("/{user_id}")
async def delete_user(user_id: str):
    """Delete user (admin only)"""
    if user_id not in MOCK_USERS:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_id == "1":  # Prevent deleting admin
        raise HTTPException(status_code=400, detail="Cannot delete admin user")
    
    del MOCK_USERS[user_id]
    return {"message": "User deleted successfully"}

@router.get("/statistics/overview")
async def get_user_statistics():
    """Get user statistics overview (admin only)"""
    users = list(MOCK_USERS.values())
    
    return {
        "total_users": len(users),
        "active_users": len([u for u in users if u["is_active"]]),
        "verified_users": len([u for u in users if u["is_verified"]]),
        "admin_users": len([u for u in users if u["role"] == "admin"]),
        "total_workflows": sum(u["workflow_count"] for u in users),
        "total_executions": sum(u["execution_count"] for u in users)
    }