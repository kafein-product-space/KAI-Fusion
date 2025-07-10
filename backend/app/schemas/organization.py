import uuid
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# --- Role Schemas ---
class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None
    permissions: Optional[str] = None

class RoleCreate(RoleBase):
    pass

class RoleResponse(RoleBase):
    id: uuid.UUID
    class Config:
        from_attributes = True

# --- Organization Schemas ---
class OrganizationBase(BaseModel):
    name: str
    organization_type: Optional[str] = None

class OrganizationCreate(OrganizationBase):
    admin_user_id: uuid.UUID

class OrganizationResponse(OrganizationBase):
    id: uuid.UUID
    admin_user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

# --- OrganizationUser Schemas ---
class OrganizationUserBase(BaseModel):
    organization_id: uuid.UUID
    user_id: uuid.UUID
    role_id: uuid.UUID
    status: str = 'ACTIVE'

class OrganizationUserCreate(OrganizationUserBase):
    created_by: uuid.UUID

class OrganizationUserUpdate(BaseModel):
    role_id: Optional[uuid.UUID] = None
    status: Optional[str] = None
    updated_by: uuid.UUID

class OrganizationUserResponse(OrganizationUserBase):
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True 