"""Database package for Agent-Flow V2.

This package contains:
- SQLModel table models (models.py)
- Database engine and session management (engine.py)
- Repository pattern implementations (repositories/)
- Base classes and utilities (base.py)
"""

from .engine import engine, get_session, init_db
from .base import BaseRepository
from .models import (
    # User management
    User,
    UserCreate,
    UserRead,
    UserUpdate,
    
    # Workflow management
    Workflow,
    WorkflowCreate,
    WorkflowRead,
    WorkflowUpdate,
    
    # Execution tracking
    Execution,
    ExecutionCreate,
    ExecutionRead,
    ExecutionUpdate,
    
    # Credential management
    Credential,
    CredentialCreate,
    CredentialRead,
    CredentialUpdate,
    
    # Task management
    Task,
    TaskCreate,
    TaskRead,
    TaskUpdate,
    TaskLog,
    
    # Node management
    CustomNode,
    CustomNodeCreate,
    CustomNodeRead,
    CustomNodeUpdate,
)

__all__ = [
    # Engine
    "engine",
    "get_session",
    "init_db",
    
    # Base
    "BaseRepository",
    
    # User models
    "User",
    "UserCreate",
    "UserRead", 
    "UserUpdate",
    
    # Workflow models
    "Workflow",
    "WorkflowCreate",
    "WorkflowRead",
    "WorkflowUpdate",
    
    # Execution models
    "Execution",
    "ExecutionCreate",
    "ExecutionRead",
    "ExecutionUpdate",
    
    # Credential models
    "Credential",
    "CredentialCreate",
    "CredentialRead",
    "CredentialUpdate",
    
    # Task models
    "Task",
    "TaskCreate",
    "TaskRead",
    "TaskUpdate",
    "TaskLog",
    
    # Node models
    "CustomNode",
    "CustomNodeCreate",
    "CustomNodeRead",
    "CustomNodeUpdate",
] 