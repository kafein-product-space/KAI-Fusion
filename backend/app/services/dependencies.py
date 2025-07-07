"""Dependency Injection for Service Layer.

Provides service factory functions and dependency injection patterns
for the Agent-Flow V2 service layer.
"""

from functools import lru_cache
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.engine import get_session, RepositoryFactory
from app.db.repositories import (
    UserRepository, WorkflowRepository, ExecutionRepository,
    CredentialRepository, TaskRepository, CustomNodeRepository
)
from .user_service import UserService
from .workflow_service import WorkflowService
from .execution_service import ExecutionService
from .credential_service import CredentialService
from .task_service import TaskService


# Repository Dependencies

def get_user_repository() -> UserRepository:
    """Get UserRepository instance."""
    return UserRepository()

def get_workflow_repository() -> WorkflowRepository:
    """Get WorkflowRepository instance."""
    return WorkflowRepository()

def get_execution_repository() -> ExecutionRepository:
    """Get ExecutionRepository instance."""
    return ExecutionRepository()

def get_credential_repository() -> CredentialRepository:
    """Get CredentialRepository instance."""
    return CredentialRepository()

def get_task_repository() -> TaskRepository:
    """Get TaskRepository instance."""
    return TaskRepository()

def get_custom_node_repository() -> CustomNodeRepository:
    """Get CustomNodeRepository instance."""
    return CustomNodeRepository()


# Service Dependencies

@lru_cache()
def get_user_service() -> UserService:
    """Get UserService instance with dependencies."""
    return UserService(get_user_repository())

@lru_cache()
def get_workflow_service() -> WorkflowService:
    """Get WorkflowService instance with dependencies."""
    return WorkflowService(
        get_workflow_repository(),
        get_execution_repository()
    )

@lru_cache()
def get_execution_service() -> ExecutionService:
    """Get ExecutionService instance with dependencies."""
    return ExecutionService(
        get_execution_repository(),
        get_workflow_repository()
    )

@lru_cache()
def get_credential_service() -> CredentialService:
    """Get CredentialService instance with dependencies."""
    return CredentialService(get_credential_repository())

@lru_cache()
def get_task_service() -> TaskService:
    """Get TaskService instance with dependencies."""
    return TaskService(get_task_repository())


# Service Factory for Advanced DI

class ServiceFactory:
    """Factory for creating service instances with proper dependency injection."""
    
    def __init__(self):
        self._repositories = RepositoryFactory()
        self._services = {}
    
    def get_user_service(self) -> UserService:
        """Get or create UserService."""
        if 'user' not in self._services:
            self._services['user'] = UserService(
                self._repositories.get_user_repository()
            )
        return self._services['user']
    
    def get_workflow_service(self) -> WorkflowService:
        """Get or create WorkflowService."""
        if 'workflow' not in self._services:
            self._services['workflow'] = WorkflowService(
                self._repositories.get_workflow_repository(),
                self._repositories.get_execution_repository()
            )
        return self._services['workflow']
    
    def get_execution_service(self) -> ExecutionService:
        """Get or create ExecutionService."""
        if 'execution' not in self._services:
            self._services['execution'] = ExecutionService(
                self._repositories.get_execution_repository(),
                self._repositories.get_workflow_repository()
            )
        return self._services['execution']
    
    def get_credential_service(self) -> CredentialService:
        """Get or create CredentialService."""
        if 'credential' not in self._services:
            self._services['credential'] = CredentialService(
                self._repositories.get_credential_repository()
            )
        return self._services['credential']
    
    def get_task_service(self) -> TaskService:
        """Get or create TaskService."""
        if 'task' not in self._services:
            self._services['task'] = TaskService(
                self._repositories.get_task_repository()
            )
        return self._services['task']
    
    def clear_cache(self):
        """Clear service cache."""
        self._services.clear()


# Global service factory instance
service_factory = ServiceFactory()


# FastAPI Dependencies

async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for database session."""
    async for session in get_session():
        yield session


# Service dependencies for FastAPI endpoints

def get_user_service_dep() -> UserService:
    """FastAPI dependency for UserService."""
    return service_factory.get_user_service()

def get_workflow_service_dep() -> WorkflowService:
    """FastAPI dependency for WorkflowService."""
    return service_factory.get_workflow_service()

def get_execution_service_dep() -> ExecutionService:
    """FastAPI dependency for ExecutionService."""
    return service_factory.get_execution_service()

def get_credential_service_dep() -> CredentialService:
    """FastAPI dependency for CredentialService."""
    return service_factory.get_credential_service()

def get_task_service_dep() -> TaskService:
    """FastAPI dependency for TaskService."""
    return service_factory.get_task_service() 