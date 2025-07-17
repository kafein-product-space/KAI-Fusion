import uuid
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

# --- Workflow Schemas ---

# Base schema for workflow fields
class WorkflowBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_public: bool = False
    flow_data: Dict[str, Any] = Field(default_factory=dict)

# Schema for creating a workflow
class WorkflowCreate(WorkflowBase):
    pass

# Schema for updating a workflow
class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None
    flow_data: Optional[Dict[str, Any]] = None

# Schema for API responses
class WorkflowResponse(WorkflowBase):
    id: uuid.UUID
    user_id: uuid.UUID
    version: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Workflow Template Schemas ---

# Base schema for workflow template fields
class WorkflowTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: str = 'General'
    flow_data: Dict[str, Any] = Field(default_factory=dict)

# Schema for creating a template
class WorkflowTemplateCreate(WorkflowTemplateBase):
    pass

# Schema for API responses for templates
class WorkflowTemplateResponse(WorkflowTemplateBase):
    id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True
