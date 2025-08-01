from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from datetime import datetime
from uuid import UUID


class NodeConfigurationBase(BaseModel):
    node_id: str = Field(..., description="Frontend node ID")
    node_type: str = Field(..., description="Node class name")
    configuration: Dict[str, Any] = Field(..., description="Node-specific configuration")
    position: Optional[Dict[str, Any]] = Field(None, description="UI position data")


class NodeConfigurationCreate(NodeConfigurationBase):
    workflow_id: UUID = Field(..., description="Workflow ID")


class NodeConfigurationUpdate(BaseModel):
    node_id: Optional[str] = Field(None, description="Frontend node ID")
    node_type: Optional[str] = Field(None, description="Node class name")
    configuration: Optional[Dict[str, Any]] = Field(None, description="Node-specific configuration")
    position: Optional[Dict[str, Any]] = Field(None, description="UI position data")


class NodeConfigurationResponse(NodeConfigurationBase):
    id: UUID
    workflow_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NodeConfigurationListResponse(BaseModel):
    node_configurations: list[NodeConfigurationResponse]
    total: int
    page: int
    size: int 