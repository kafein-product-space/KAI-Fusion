"""SQLModel database models for Agent-Flow V2.

Defines all database tables using SQLModel (SQLAlchemy + Pydantic).
Models are organized by domain: Users, Workflows, Executions, Credentials, Tasks, etc.
"""

import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from sqlmodel import Field, Relationship, SQLModel, Column, JSON, Text


# Enums
class UserRole(str, Enum):
    """User roles for RBAC"""
    ADMIN = "admin"
    USER = "user"
    VIEWER = "viewer"


class TaskStatus(str, Enum):
    """Task execution status"""
    PENDING = "pending"
    STARTED = "started"
    PROGRESS = "progress"
    SUCCESS = "success"
    FAILURE = "failure"
    RETRY = "retry"
    REVOKED = "revoked"


class ExecutionStatus(str, Enum):
    """Workflow execution status"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class NodeCategory(str, Enum):
    """Custom node categories"""
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


# Base Models
class UserBase(SQLModel):
    """Base user fields"""
    email: str = Field(unique=True, index=True, max_length=255)
    full_name: Optional[str] = Field(default=None, max_length=255)
    is_active: bool = Field(default=True)
    role: UserRole = Field(default=UserRole.USER)


class WorkflowBase(SQLModel):
    """Base workflow fields"""
    name: str = Field(max_length=255, index=True)
    description: Optional[str] = Field(default="")
    is_public: bool = Field(default=False, index=True)
    flow_data: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))


class ExecutionBase(SQLModel):
    """Base execution fields"""
    inputs: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    outputs: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    error: Optional[str] = Field(default=None, sa_column=Column(Text))
    status: ExecutionStatus = Field(default=ExecutionStatus.PENDING, index=True)


class CredentialBase(SQLModel):
    """Base credential fields"""
    name: str = Field(max_length=255, index=True)
    description: Optional[str] = Field(default=None)
    service_type: str = Field(max_length=100, index=True)
    is_active: bool = Field(default=True)


class TaskBase(SQLModel):
    """Base task fields"""
    task_type: str = Field(max_length=100, index=True)
    status: TaskStatus = Field(default=TaskStatus.PENDING, index=True)
    priority: int = Field(default=5, ge=1, le=10)
    progress: int = Field(default=0, ge=0, le=100)
    current_step: Optional[str] = Field(default=None, max_length=255)
    inputs: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    result: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    error: Optional[str] = Field(default=None, sa_column=Column(Text))
    retry_count: int = Field(default=0)
    max_retries: int = Field(default=3)


class CustomNodeBase(SQLModel):
    """Base custom node fields"""
    name: str = Field(max_length=255, index=True)
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    category: NodeCategory = Field(default=NodeCategory.CUSTOM, index=True)
    is_public: bool = Field(default=False, index=True)
    version: str = Field(default="1.0.0", max_length=50)
    config: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    code: str = Field(sa_column=Column(Text))


# Table Models
class User(UserBase, table=True):
    """User table model"""
    __tablename__ = "users"  # type: ignore
    
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    hashed_password: str = Field(max_length=128)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = Field(default=None)
    
    # Relationships
    workflows: List["Workflow"] = Relationship(back_populates="user")
    executions: List["Execution"] = Relationship(back_populates="user")
    credentials: List["Credential"] = Relationship(back_populates="user")
    tasks: List["Task"] = Relationship(back_populates="user")
    custom_nodes: List["CustomNode"] = Relationship(back_populates="user")


class Workflow(WorkflowBase, table=True):
    """Workflow table model"""
    __tablename__ = "workflows"  # type: ignore
    
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    version: int = Field(default=1)
    
    # Relationships
    user: Optional[User] = Relationship(back_populates="workflows")
    executions: List["Execution"] = Relationship(back_populates="workflow")


class Execution(ExecutionBase, table=True):
    """Execution table model"""
    __tablename__ = "executions"  # type: ignore
    
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    workflow_id: str = Field(foreign_key="workflows.id", index=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    celery_task_id: Optional[str] = Field(default=None, index=True, max_length=255)
    started_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    execution_time: Optional[float] = Field(default=None)  # seconds
    
    # Relationships
    workflow: Optional[Workflow] = Relationship(back_populates="executions")
    user: Optional[User] = Relationship(back_populates="executions")


class Credential(CredentialBase, table=True):
    """Credential table model"""
    __tablename__ = "credentials"  # type: ignore
    
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    encrypted_data: str = Field()  # Base64 encoded encrypted data
    encryption_key_id: Optional[str] = Field(default=None, max_length=255)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user: Optional[User] = Relationship(back_populates="credentials")


class Task(TaskBase, table=True):
    """Task table model"""
    __tablename__ = "tasks"  # type: ignore
    
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    celery_task_id: str = Field(unique=True, index=True, max_length=255)
    user_id: str = Field(foreign_key="users.id", index=True)
    workflow_id: Optional[str] = Field(default=None, foreign_key="workflows.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    started_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)
    estimated_duration: Optional[float] = Field(default=None)  # seconds
    
    # Relationships
    user: Optional[User] = Relationship(back_populates="tasks")
    logs: List["TaskLog"] = Relationship(back_populates="task")


class TaskLog(SQLModel, table=True):
    """Task log table model"""
    __tablename__ = "task_logs"  # type: ignore
    
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    task_id: str = Field(foreign_key="tasks.id", index=True)
    level: str = Field(max_length=50, index=True)  # INFO, ERROR, WARNING, DEBUG
    message: str = Field(sa_column=Column(Text))
    details: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    node_id: Optional[str] = Field(default=None, max_length=255)
    step_number: Optional[int] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    
    # Relationships
    task: Optional[Task] = Relationship(back_populates="logs")


class CustomNode(CustomNodeBase, table=True):
    """Custom node table model"""
    __tablename__ = "custom_nodes"  # type: ignore
    
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user: Optional[User] = Relationship(back_populates="custom_nodes")


# Create/Read/Update schemas
class UserCreate(UserBase):
    """User creation schema"""
    password: str = Field(min_length=8, max_length=128)


class UserRead(UserBase):
    """User read schema"""
    id: str
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None


class UserUpdate(SQLModel):
    """User update schema"""
    email: Optional[str] = Field(default=None, max_length=255)
    full_name: Optional[str] = Field(default=None, max_length=255)
    is_active: Optional[bool] = None
    role: Optional[UserRole] = None
    password: Optional[str] = Field(default=None, min_length=8, max_length=128)


class WorkflowCreate(WorkflowBase):
    """Workflow creation schema"""
    pass


class WorkflowRead(WorkflowBase):
    """Workflow read schema"""
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    version: int


class WorkflowUpdate(SQLModel):
    """Workflow update schema"""
    name: Optional[str] = Field(default=None, max_length=255)
    description: Optional[str] = None
    is_public: Optional[bool] = None
    flow_data: Optional[Dict[str, Any]] = None


class ExecutionCreate(ExecutionBase):
    """Execution creation schema"""
    workflow_id: str


class ExecutionRead(ExecutionBase):
    """Execution read schema"""
    id: str
    workflow_id: str
    user_id: str
    celery_task_id: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    execution_time: Optional[float] = None


class ExecutionUpdate(SQLModel):
    """Execution update schema"""
    outputs: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    status: Optional[ExecutionStatus] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    execution_time: Optional[float] = None


class CredentialCreate(CredentialBase):
    """Credential creation schema"""
    credential_data: Dict[str, Any]  # Raw data to be encrypted


class CredentialRead(CredentialBase):
    """Credential read schema (without sensitive data)"""
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime


class CredentialUpdate(SQLModel):
    """Credential update schema"""
    name: Optional[str] = Field(default=None, max_length=255)
    description: Optional[str] = None
    credential_data: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class TaskCreate(TaskBase):
    """Task creation schema"""
    celery_task_id: str
    workflow_id: Optional[str] = None


class TaskRead(TaskBase):
    """Task read schema"""
    id: str
    celery_task_id: str
    user_id: str
    workflow_id: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    estimated_duration: Optional[float] = None


class TaskUpdate(SQLModel):
    """Task update schema"""
    status: Optional[TaskStatus] = None
    progress: Optional[int] = Field(default=None, ge=0, le=100)
    current_step: Optional[str] = Field(default=None, max_length=255)
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    retry_count: Optional[int] = None


class CustomNodeCreate(CustomNodeBase):
    """Custom node creation schema"""
    pass


class CustomNodeRead(CustomNodeBase):
    """Custom node read schema"""
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime


class CustomNodeUpdate(SQLModel):
    """Custom node update schema"""
    name: Optional[str] = Field(default=None, max_length=255)
    description: Optional[str] = None
    category: Optional[NodeCategory] = None
    is_public: Optional[bool] = None
    version: Optional[str] = Field(default=None, max_length=50)
    config: Optional[Dict[str, Any]] = None
    code: Optional[str] = None 