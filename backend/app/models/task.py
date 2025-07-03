from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum

class TaskStatus(str, Enum):
    """Task execution status"""
    PENDING = "pending"
    STARTED = "started"
    PROGRESS = "progress"
    SUCCESS = "success"
    FAILURE = "failure"
    RETRY = "retry"
    REVOKED = "revoked"

class TaskType(str, Enum):
    """Types of tasks"""
    WORKFLOW_EXECUTION = "workflow_execution"
    BULK_WORKFLOW_EXECUTION = "bulk_workflow_execution"
    WORKFLOW_VALIDATION = "workflow_validation"
    CREDENTIAL_TEST = "credential_test"
    SYSTEM_CLEANUP = "system_cleanup"
    HEALTH_CHECK = "health_check"

class TaskCreate(BaseModel):
    """Create task request"""
    task_type: TaskType
    workflow_id: Optional[str] = None
    inputs: Dict[str, Any] = Field(default_factory=dict)
    priority: int = Field(default=5, ge=1, le=10)  # 1=highest, 10=lowest
    retry_policy: Optional[Dict[str, Any]] = None
    
class TaskUpdate(BaseModel):
    """Update task request"""
    status: Optional[TaskStatus] = None
    progress: Optional[int] = Field(None, ge=0, le=100)
    current_step: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    
class TaskProgressUpdate(BaseModel):
    """Task progress update"""
    progress: int = Field(..., ge=0, le=100)
    current_step: str
    message: Optional[str] = None
    node_results: Optional[Dict[str, Any]] = None

class TaskResult(BaseModel):
    """Task execution result"""
    success: bool
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    error_type: Optional[str] = None
    execution_time: Optional[float] = None
    node_count: Optional[int] = None
    nodes_executed: Optional[List[str]] = None

class TaskResponse(BaseModel):
    """Task response model"""
    id: str
    celery_task_id: str
    user_id: str
    task_type: TaskType
    workflow_id: Optional[str] = None
    status: TaskStatus
    progress: int = 0
    current_step: Optional[str] = None
    priority: int
    inputs: Dict[str, Any]
    result: Optional[TaskResult] = None
    error: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    estimated_duration: Optional[float] = None  # seconds
    
class TaskListResponse(BaseModel):
    """Task list response"""
    tasks: List[TaskResponse]
    total: int
    page: int
    per_page: int
    has_next: bool
    
class TaskStatsResponse(BaseModel):
    """Task statistics response"""
    total_tasks: int
    pending_tasks: int
    running_tasks: int
    completed_tasks: int
    failed_tasks: int
    average_execution_time: Optional[float] = None
    success_rate: Optional[float] = None 