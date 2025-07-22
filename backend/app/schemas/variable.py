import uuid
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# Base schema with common fields
class VariableBase(BaseModel):
    name: str
    value: str
    type: Optional[str] = None

# Schema for creating a variable
class VariableCreate(VariableBase):
    pass

# Schema for updating a variable
class VariableUpdate(BaseModel):
    name: Optional[str] = None
    value: Optional[str] = None
    type: Optional[str] = None

# Schema for API responses
class VariableResponse(VariableBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True 