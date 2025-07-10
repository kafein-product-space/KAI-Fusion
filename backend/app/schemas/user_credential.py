import uuid
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# Base schema with common fields
class UserCredentialBase(BaseModel):
    name: str
    service_type: str

# Schema for creating a credential
class UserCredentialCreate(UserCredentialBase):
    secret: str  # The unencrypted secret, will be encrypted in the service layer

# Schema for updating a credential
class UserCredentialUpdate(BaseModel):
    name: Optional[str] = None

# Schema for API responses
class UserCredentialResponse(UserCredentialBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True 