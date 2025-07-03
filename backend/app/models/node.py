from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from enum import Enum
from datetime import datetime

class NodeCategory(str, Enum):
    LLM = "llm"
    TOOL = "tool"
    AGENT = "agent"
    CHAIN = "chain"
    MEMORY = "memory"
    VECTOR_STORE = "vector_store"
    DOCUMENT_LOADER = "document_loader"
    TEXT_SPLITTER = "text_splitter"
    EMBEDDING = "embedding"
    UTILITY = "utility"
    INTEGRATION = "integration"
    CUSTOM = "custom"

class InputType(str, Enum):
    TEXT = "text"
    NUMBER = "number"
    BOOLEAN = "boolean"
    SELECT = "select"
    PASSWORD = "password"
    JSON = "json"
    FILE = "file"
    CONNECTION = "connection"

class NodeInput(BaseModel):
    name: str
    type: InputType
    description: str = ""
    required: bool = True
    default: Any = None
    options: Optional[List[str]] = None  # For select type
    accept: Optional[str] = None  # For file type
    connection_types: Optional[List[str]] = None  # For connection type

class NodeOutput(BaseModel):
    name: str
    type: str
    description: str = ""

class NodeConfig(BaseModel):
    name: str
    description: str
    category: NodeCategory
    inputs: List[NodeInput] = []
    outputs: List[NodeOutput] = []
    icon: str = "📦"
    color: str = "#6B7280"
    version: str = "1.0.0"
    author: str = "System"

class NodeCreate(BaseModel):
    name: str
    description: str
    category: NodeCategory
    config: Dict[str, Any]
    code: str
    is_public: bool = False

class NodeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[NodeCategory] = None
    config: Optional[Dict[str, Any]] = None
    code: Optional[str] = None
    is_public: Optional[bool] = None

class NodeResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: str
    category: NodeCategory
    config: Dict[str, Any]
    code: str
    is_public: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

class NodeExecutionRequest(BaseModel):
    node_type: str
    inputs: Dict[str, Any]
    context: Optional[Dict[str, Any]] = None

class NodeExecutionResponse(BaseModel):
    success: bool
    outputs: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    execution_time: float
