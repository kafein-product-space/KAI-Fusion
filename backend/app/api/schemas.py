import uuid
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class WorkflowNode(BaseModel):
    id: str = Field(description="Unique identifier for the node")
    type: str = Field(description="Node type from available registry")
    data: Dict[str, Any] = Field(description="Node configuration parameters")
    position: Dict[str, float] = Field(description="Node position on canvas")

class WorkflowEdge(BaseModel):
    id: str = Field(description="Unique identifier for the edge")
    source: str = Field(description="Source node ID")
    target: str = Field(description="Target node ID")
    sourceHandle: Optional[str] = Field(default="output", description="Source node output handle")
    targetHandle: Optional[str] = Field(default="input", description="Target node input handle")

class Workflow(BaseModel):
    id: Optional[str] = Field(default=None, description="Workflow UUID")
    name: str = Field(description="Workflow display name")
    nodes: List[WorkflowNode] = Field(description="List of nodes in the workflow")
    edges: List[WorkflowEdge] = Field(description="List of connections between nodes")

class WorkflowCreate(BaseModel):
    name: str = Field(description="Workflow name")
    description: Optional[str] = Field(default=None, description="Workflow description")
    flow_data: Dict[str, Any] = Field(description="React Flow data structure")
    is_public: bool = Field(default=False, description="Whether workflow is publicly visible")

class WorkflowExecutionRequest(BaseModel):
    workflow: Workflow = Field(description="Complete workflow definition")
    input: str = Field(default="Hello", description="Input message for the workflow")
    session_id: Optional[str] = Field(default=None, description="Session ID for conversation memory")
    stream: bool = Field(default=False, description="Whether to stream the response")

class WorkflowExecutionResponse(BaseModel):
    success: bool = Field(description="Whether execution was successful")
    result: Optional[Any] = Field(default=None, description="Execution result")
    error: Optional[str] = Field(default=None, description="Error message if execution failed")
    execution_order: Optional[List[str]] = Field(default=None, description="Order of node execution")
    session_id: Optional[str] = Field(default=None, description="Session ID used")
    execution_time: Optional[float] = Field(default=None, description="Execution time in seconds")

class NodeInfo(BaseModel):
    name: str = Field(description="Display name of the node")
    type: str = Field(description="Node type identifier")
    category: str = Field(description="Node category")
    description: str = Field(description="Node description")
    inputs: List[Dict[str, Any]] = Field(description="Node input configuration")

class UserSignUp(BaseModel):
    email: str = Field(description="User email address")
    password: str = Field(description="User password (min 8 characters)")
    full_name: Optional[str] = Field(default=None, description="User's full name")

class UserSignIn(BaseModel):
    email: str = Field(description="User email address")
    password: str = Field(description="User password")

class AuthResponse(BaseModel):
    access_token: str = Field(description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(description="Token expiration time in seconds")
    user: Dict[str, Any] = Field(description="User information")

class ErrorResponse(BaseModel):
    detail: str = Field(description="Error description")
    error_code: Optional[str] = Field(default=None, description="Machine-readable error code")
