import uuid
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

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

# Node Registry Schemas
class NodeRegistryCreate(BaseModel):
    node_type: str = Field(description="Unique identifier for the node type")
    node_class: str = Field(description="Python class name for the node")
    category: str = Field(description="Node category (llm, tool, agent, etc.)")
    version: str = Field(default="1.0.0", description="Node version")
    schema_definition: Dict[str, Any] = Field(description="Input/output schema definition")
    ui_schema: Dict[str, Any] = Field(description="UI configuration schema")
    is_active: bool = Field(default=True, description="Whether the node is active")

class NodeRegistryUpdate(BaseModel):
    node_class: Optional[str] = Field(default=None, description="Python class name for the node")
    category: Optional[str] = Field(default=None, description="Node category")
    version: Optional[str] = Field(default=None, description="Node version")
    schema_definition: Optional[Dict[str, Any]] = Field(default=None, description="Input/output schema definition")
    ui_schema: Optional[Dict[str, Any]] = Field(default=None, description="UI configuration schema")
    is_active: Optional[bool] = Field(default=None, description="Whether the node is active")

class NodeRegistryResponse(BaseModel):
    id: str = Field(description="Node registry entry ID")
    node_type: str = Field(description="Unique identifier for the node type")
    node_class: str = Field(description="Python class name for the node")
    category: str = Field(description="Node category")
    version: str = Field(description="Node version")
    schema_definition: Dict[str, Any] = Field(description="Input/output schema definition")
    ui_schema: Dict[str, Any] = Field(description="UI configuration schema")
    is_active: bool = Field(description="Whether the node is active")
    created_at: str = Field(description="Creation timestamp")

class NodeRegistryListResponse(BaseModel):
    nodes: List[NodeRegistryResponse] = Field(description="List of node registry entries")
    total: int = Field(description="Total number of entries")
    page: int = Field(description="Current page number")
    size: int = Field(description="Page size")

# Scheduled Jobs Schemas
class ScheduledJobCreate(BaseModel):
    workflow_id: uuid.UUID = Field(description="Workflow ID to schedule")
    node_id: str = Field(description="Node ID to execute")
    job_name: str = Field(description="Name of the scheduled job")
    timer_type: str = Field(description="Timer type: cron, interval, or once")
    cron_expression: Optional[str] = Field(default=None, description="Cron expression for cron type")
    interval_seconds: Optional[int] = Field(default=None, description="Interval in seconds for interval type")
    delay_seconds: Optional[int] = Field(default=None, description="Delay in seconds for once type")
    timezone: str = Field(default="UTC", description="Timezone for scheduling")
    max_executions: int = Field(default=0, description="Maximum executions (0 = unlimited)")
    is_enabled: bool = Field(default=True, description="Whether the job is enabled")

class ScheduledJobUpdate(BaseModel):
    job_name: Optional[str] = Field(default=None, description="Name of the scheduled job")
    timer_type: Optional[str] = Field(default=None, description="Timer type: cron, interval, or once")
    cron_expression: Optional[str] = Field(default=None, description="Cron expression for cron type")
    interval_seconds: Optional[int] = Field(default=None, description="Interval in seconds for interval type")
    delay_seconds: Optional[int] = Field(default=None, description="Delay in seconds for once type")
    timezone: Optional[str] = Field(default=None, description="Timezone for scheduling")
    max_executions: Optional[int] = Field(default=None, description="Maximum executions (0 = unlimited)")
    is_enabled: Optional[bool] = Field(default=None, description="Whether the job is enabled")

class ScheduledJobResponse(BaseModel):
    id: uuid.UUID = Field(description="Scheduled job ID")
    workflow_id: uuid.UUID = Field(description="Workflow ID")
    node_id: str = Field(description="Node ID to execute")
    job_name: str = Field(description="Name of the scheduled job")
    timer_type: str = Field(description="Timer type")
    cron_expression: Optional[str] = Field(default=None, description="Cron expression")
    interval_seconds: Optional[int] = Field(default=None, description="Interval in seconds")
    delay_seconds: Optional[int] = Field(default=None, description="Delay in seconds")
    timezone: str = Field(description="Timezone")
    max_executions: int = Field(description="Maximum executions")
    current_executions: int = Field(description="Current execution count")
    is_enabled: bool = Field(description="Whether the job is enabled")
    next_run_at: Optional[datetime] = Field(default=None, description="Next scheduled run")
    last_run_at: Optional[datetime] = Field(default=None, description="Last execution time")
    created_at: datetime = Field(description="Creation timestamp")

class JobExecutionResponse(BaseModel):
    id: uuid.UUID = Field(description="Job execution ID")
    job_id: uuid.UUID = Field(description="Scheduled job ID")
    execution_id: Optional[uuid.UUID] = Field(default=None, description="Workflow execution ID")
    started_at: datetime = Field(description="Execution start time")
    completed_at: Optional[datetime] = Field(default=None, description="Execution completion time")
    status: str = Field(description="Execution status")
    result: Optional[Dict[str, Any]] = Field(default=None, description="Execution result")
    error_message: Optional[str] = Field(default=None, description="Error message if failed")
    execution_time_ms: Optional[int] = Field(default=None, description="Execution time in milliseconds")

class JobTriggerResponse(BaseModel):
    success: bool = Field(description="Whether manual trigger was successful")
    execution_id: Optional[uuid.UUID] = Field(default=None, description="Created execution ID")
    message: str = Field(description="Trigger result message")

# Vector Storage Schemas
class VectorCollectionCreate(BaseModel):
    workflow_id: uuid.UUID = Field(description="Workflow ID that owns this collection")
    collection_name: str = Field(description="Name of the vector collection")
    embedding_dimension: int = Field(description="Dimension of embeddings in this collection")
    distance_strategy: str = Field(default="cosine", description="Distance calculation strategy")
    index_type: str = Field(default="ivfflat", description="Vector index type")
    index_params: Optional[Dict[str, Any]] = Field(default=None, description="Index configuration parameters")

class VectorCollectionUpdate(BaseModel):
    collection_name: Optional[str] = Field(default=None, description="Name of the vector collection")
    distance_strategy: Optional[str] = Field(default=None, description="Distance calculation strategy")
    index_type: Optional[str] = Field(default=None, description="Vector index type")
    index_params: Optional[Dict[str, Any]] = Field(default=None, description="Index configuration parameters")

class VectorCollectionResponse(BaseModel):
    id: uuid.UUID = Field(description="Collection ID")
    workflow_id: uuid.UUID = Field(description="Workflow ID that owns this collection")
    collection_name: str = Field(description="Name of the vector collection")
    embedding_dimension: int = Field(description="Dimension of embeddings in this collection")
    distance_strategy: str = Field(description="Distance calculation strategy")
    index_type: str = Field(description="Vector index type")
    index_params: Optional[Dict[str, Any]] = Field(description="Index configuration parameters")
    document_count: int = Field(description="Number of documents in collection")
    created_at: datetime = Field(description="Creation timestamp")
    updated_at: datetime = Field(description="Last update timestamp")

class VectorCollectionStats(BaseModel):
    id: uuid.UUID = Field(description="Collection ID")
    collection_name: str = Field(description="Name of the vector collection")
    document_count: int = Field(description="Number of documents in collection")
    total_size_bytes: int = Field(description="Total size in bytes")
    avg_embedding_dimension: float = Field(description="Average embedding dimension")
    created_at: datetime = Field(description="Creation timestamp")
    last_updated: datetime = Field(description="Last document update")

class VectorDocumentCreate(BaseModel):
    content: str = Field(description="Document content text")
    document_metadata: Optional[Dict[str, Any]] = Field(default={}, description="Document metadata")
    embedding: Optional[List[float]] = Field(default=None, description="Document embedding vector")
    source_url: Optional[str] = Field(default=None, description="Source URL of the document")
    source_type: Optional[str] = Field(default=None, description="Type of source document")
    chunk_index: Optional[int] = Field(default=None, description="Chunk index if document is chunked")

class VectorDocumentResponse(BaseModel):
    id: uuid.UUID = Field(description="Document ID")
    collection_id: uuid.UUID = Field(description="Collection ID")
    content: str = Field(description="Document content text")
    document_metadata: Dict[str, Any] = Field(description="Document metadata")
    embedding: Optional[str] = Field(description="Document embedding vector as string")
    source_url: Optional[str] = Field(description="Source URL of the document")
    source_type: Optional[str] = Field(description="Type of source document")
    chunk_index: Optional[int] = Field(description="Chunk index if document is chunked")
    created_at: datetime = Field(description="Creation timestamp")

class VectorSearchRequest(BaseModel):
    query: Optional[str] = Field(default=None, description="Text query for semantic search")
    embedding: Optional[List[float]] = Field(default=None, description="Query embedding vector")
    k: int = Field(default=5, description="Number of results to return")
    threshold: float = Field(default=0.5, description="Similarity threshold")
    filter_metadata: Optional[Dict[str, Any]] = Field(default=None, description="Metadata filters")

class VectorSearchResult(BaseModel):
    id: uuid.UUID = Field(description="Document ID")
    content: str = Field(description="Document content")
    document_metadata: Dict[str, Any] = Field(description="Document metadata")
    similarity_score: float = Field(description="Similarity score")
    source_url: Optional[str] = Field(description="Source URL")
    source_type: Optional[str] = Field(description="Source type")
    chunk_index: Optional[int] = Field(description="Chunk index")

class VectorSearchResponse(BaseModel):
    results: List[VectorSearchResult] = Field(description="Search results")
    total_found: int = Field(description="Total number of matching documents")
    query_time_ms: float = Field(description="Query execution time in milliseconds")

class VectorDocumentsCreate(BaseModel):
    documents: List[VectorDocumentCreate] = Field(description="List of documents to create")

class VectorDocumentsResponse(BaseModel):
    created_ids: List[uuid.UUID] = Field(description="IDs of created documents")
    total_created: int = Field(description="Total number of documents created")
    failed_count: int = Field(description="Number of documents that failed to create")

class VectorDocumentsDeleteResponse(BaseModel):
    deleted_ids: List[uuid.UUID] = Field(description="IDs of deleted documents")
    deleted_contents: List[str] = Field(description="Contents of deleted documents")
    total_deleted: int = Field(description="Total number of documents deleted")
    collection_id: uuid.UUID = Field(description="Collection ID where documents were deleted")