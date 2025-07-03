from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class WorkflowCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    flow_data: Dict[str, Any]
    is_public: bool = False

class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    flow_data: Optional[Dict[str, Any]] = None
    is_public: Optional[bool] = None

class WorkflowExecute(BaseModel):
    inputs: Dict[str, Any] = {}
    async_execution: bool = False

class WorkflowResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: str
    flow_data: Dict[str, Any]
    is_public: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

class ExecutionResponse(BaseModel):
    id: str
    workflow_id: str
    user_id: str
    inputs: Dict[str, Any]
    outputs: Optional[Dict[str, Any]] = None
    status: str
    error: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None

class ExecutionResult(BaseModel):
    success: bool
    workflow_id: str
    execution_id: Optional[str] = None
    results: Dict[str, Any]
