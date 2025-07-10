import uuid
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# Schemas from the old app/api/auth.py moved here for consistency

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None

class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: Optional[str] = None
    
    class Config:
        from_attributes = True

# --- LoginMethod Schemas ---
class LoginMethodBase(BaseModel):
    name: str
    config: str
    status: str = 'ENABLE'

class LoginMethodCreate(LoginMethodBase):
    organization_id: uuid.UUID
    created_by: uuid.UUID

class LoginMethodUpdate(BaseModel):
    name: Optional[str] = None
    config: Optional[str] = None
    status: Optional[str] = None
    updated_by: uuid.UUID

class LoginMethodResponse(LoginMethodBase):
    id: uuid.UUID
    organization_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

# --- LoginActivity Schemas ---
class LoginActivityBase(BaseModel):
    username: str
    activity_code: int
    message: str

class LoginActivityCreate(LoginActivityBase):
    pass

class LoginActivityResponse(LoginActivityBase):
    id: uuid.UUID
    attempted_at: datetime
    class Config:
        from_attributes = True 