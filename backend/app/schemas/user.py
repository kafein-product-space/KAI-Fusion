import uuid
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# Base schema with common fields
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

# Schema for creating a user
class UserCreate(UserBase):
    password: str

# Schema for updating a user
class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None

# Schema for API responses
class UserResponse(UserBase):
    id: uuid.UUID
    status: str
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True 