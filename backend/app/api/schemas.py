import uuid
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class WorkflowNode(BaseModel):
    id: str = Field(..., description="Unique identifier for the node", example="node_1")
    type: str = Field(..., description="Node type from available registry", example="openai")
    data: Dict[str, Any] = Field(..., description="Node configuration parameters", example={
        "model": "gpt-3.5-turbo",
        "temperature": 0.7,
        "prompt": "You are a helpful assistant."
    })
    position: Dict[str, float] = Field(..., description="Node position on canvas", example={"x": 100, "y": 200})

class WorkflowEdge(BaseModel):
    id: str = Field(description="Unique identifier for the edge", example="edge_1")
    source: str = Field(description="Source node ID", example="node_1")
    target: str = Field(description="Target node ID", example="node_2")
    sourceHandle: Optional[str] = Field(default="output", description="Source node output handle", example="output")
    targetHandle: Optional[str] = Field(default="input", description="Target node input handle", example="input")

class Workflow(BaseModel):
    id: Optional[str] = Field(default=None, description="Workflow UUID", example="550e8400-e29b-41d4-a716-446655440000")
    name: str = Field(description="Workflow display name", example="Simple Chat Bot")
    nodes: List[WorkflowNode] = Field(description="List of nodes in the workflow", example=[
        {
            "id": "start_1",
            "type": "start", 
            "data": {"input": "user_message"}, 
            "position": {"x": 100, "y": 100}
        },
        {
            "id": "openai_1", 
            "type": "openai",
            "data": {"model": "gpt-3.5-turbo", "temperature": 0.7},
            "position": {"x": 300, "y": 100}
        }
    ])
    edges: List[WorkflowEdge] = Field(description="List of connections between nodes", example=[
        {
            "id": "edge_1",
            "source": "start_1", 
            "target": "openai_1",
            "sourceHandle": "output",
            "targetHandle": "input"
        }
    ])

class WorkflowCreate(BaseModel):
    name: str = Field(description="Workflow name", example="My New Workflow")
    description: Optional[str] = Field(default=None, description="Workflow description", example="A simple workflow that processes user input")
    flow_data: Dict[str, Any] = Field(description="React Flow data structure", example={
        "nodes": [{"id": "1", "type": "start", "data": {}, "position": {"x": 0, "y": 0}}],
        "edges": []
    })
    is_public: bool = Field(default=False, description="Whether workflow is publicly visible", example=False)

class WorkflowExecutionRequest(BaseModel):
    workflow: Workflow = Field(description="Complete workflow definition")
    input: str = Field(default="Hello", description="Input message for the workflow", example="What is the weather like today?")
    session_id: Optional[str] = Field(default=None, description="Session ID for conversation memory", example="session_123")
    stream: bool = Field(default=False, description="Whether to stream the response", example=False)

class WorkflowExecutionResponse(BaseModel):
    success: bool = Field(description="Whether execution was successful", example=True)
    result: Optional[Any] = Field(default=None, description="Execution result", example="The weather is sunny today!")
    error: Optional[str] = Field(default=None, description="Error message if execution failed", example=None)
    execution_order: Optional[List[str]] = Field(default=None, description="Order of node execution", example=["start_1", "openai_1"])
    session_id: Optional[str] = Field(default=None, description="Session ID used", example="session_123")
    execution_time: Optional[float] = Field(default=None, description="Execution time in seconds", example=1.25)

class NodeInfo(BaseModel):
    name: str = Field(description="Display name of the node", example="OpenAI LLM")
    type: str = Field(description="Node type identifier", example="openai")
    category: str = Field(description="Node category", example="LLM")
    description: str = Field(description="Node description", example="OpenAI GPT models for text generation")
    inputs: List[Dict[str, Any]] = Field(description="Node input configuration", example=[
        {"name": "prompt", "type": "str", "required": True, "description": "Input prompt"}
    ])

class UserSignUp(BaseModel):
    email: str = Field(description="User email address", example="user@example.com")
    password: str = Field(description="User password (min 8 characters)", example="securePassword123!")
    full_name: Optional[str] = Field(default=None, description="User's full name", example="John Doe")

class UserSignIn(BaseModel):
    email: str = Field(description="User email address", example="user@example.com")
    password: str = Field(description="User password", example="securePassword123!")

class AuthResponse(BaseModel):
    access_token: str = Field(description="JWT access token", example="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
    token_type: str = Field(default="bearer", description="Token type", example="bearer")
    expires_in: int = Field(description="Token expiration time in seconds", example=3600)
    user: Dict[str, Any] = Field(description="User information", example={
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "user@example.com",
        "full_name": "John Doe"
    })

class ErrorResponse(BaseModel):
    detail: str = Field(description="Error description", example="Invalid credentials")
    error_code: Optional[str] = Field(default=None, description="Machine-readable error code", example="AUTH_FAILED")
