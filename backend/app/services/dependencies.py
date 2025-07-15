"""Dependency Injection for Service Layer.

Provides service factory functions and dependency injection patterns
for the Agent-Flow V2 service layer.
"""

from functools import lru_cache
from app.core.database import get_db_session
from app.services.user_service import UserService
from app.services.workflow_service import WorkflowService
from app.services.execution_service import ExecutionService
from app.services.credential_service import CredentialService
from app.services.task_service import TaskService
from app.services.api_key_service import APIKeyService


@lru_cache
def get_user_service_dep() -> UserService:
    return UserService()

@lru_cache
def get_workflow_service_dep() -> WorkflowService:
    return WorkflowService()

@lru_cache
def get_execution_service_dep() -> ExecutionService:
    return ExecutionService()

@lru_cache
def get_credential_service_dep() -> CredentialService:
    return CredentialService()

@lru_cache
def get_task_service_dep() -> TaskService:
    return TaskService()

@lru_cache
def get_api_key_service() -> APIKeyService:
    return APIKeyService() 