"""Base Service Class for Agent-Flow V2.

Provides common patterns and utilities for all service classes including
dependency injection, error handling, logging, and transaction management.
"""

import logging
from typing import Any, Dict, Optional, Union
from abc import ABC
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError

from app.db.base import BaseRepository

logger = logging.getLogger(__name__)


class ServiceError(Exception):
    """Base exception for service layer errors."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


class ValidationError(ServiceError):
    """Raised when service validation fails."""
    pass


class NotFoundError(ServiceError):
    """Raised when requested resource is not found."""
    pass


class PermissionError(ServiceError):
    """Raised when user lacks permission for operation."""
    pass


class BusinessRuleError(ServiceError):
    """Raised when business rule validation fails."""
    pass


class BaseService(ABC):
    """Base service class with common patterns.
    
    Provides:
    - Repository injection and management
    - Common CRUD operations with ownership checks
    - Error handling and logging
    - Validation patterns
    """
    
    def __init__(self, repository: BaseRepository):
        """Initialize service with repository dependency."""
        self.repository = repository
        self.logger = logging.getLogger(f"{self.__class__.__module__}.{self.__class__.__name__}")
        self.model_name = getattr(self, 'model_name', self.__class__.__name__.replace('Service', ''))
    
    async def get_by_id(
        self, 
        session: AsyncSession,
        id: Union[UUID, str],
        user_id: Optional[UUID] = None
    ) -> Any:
        """Get model by ID with optional user ownership check."""
        try:
            model = await self.repository.get(session, id)
            if not model:
                raise NotFoundError(f"{self.model_name} with ID {id} not found")
            
            # Check ownership if user_id provided
            if user_id and hasattr(model, 'user_id'):
                if getattr(model, 'user_id') != user_id:
                    raise PermissionError(f"Access denied to {self.model_name} {id}")
                
            return model
            
        except SQLAlchemyError as e:
            self.logger.error(f"Database error in get_by_id: {e}")
            raise ServiceError(f"Failed to retrieve {self.model_name}")
    
    async def create(
        self,
        session: AsyncSession,
        obj_in: Any,
        user_id: Optional[UUID] = None
    ) -> Any:
        """Create new model instance."""
        try:
            # Pre-creation validation
            await self._validate_create(session, obj_in, user_id)
            
            # Convert to dict if Pydantic model
            if hasattr(obj_in, 'model_dump'):
                create_data = obj_in.model_dump(exclude_unset=True)
            elif hasattr(obj_in, 'dict'):
                create_data = obj_in.dict(exclude_unset=True)
            else:
                create_data = obj_in
            
            # Set user_id if provided
            if user_id and isinstance(create_data, dict):
                create_data['user_id'] = str(user_id)
            
            # Create model
            model = await self.repository.create(session, obj_in=obj_in)
            
            # Post-creation actions
            await self._post_create_actions(session, model)
            
            self.logger.info(f"Created {self.model_name} {getattr(model, 'id', 'unknown')}")
            return model
            
        except ValidationError:
            raise
        except SQLAlchemyError as e:
            self.logger.error(f"Database error in create: {e}")
            raise ServiceError(f"Failed to create {self.model_name}")
    
    async def update(
        self,
        session: AsyncSession,
        id: Union[UUID, str],
        obj_in: Any,
        user_id: Optional[UUID] = None
    ) -> Any:
        """Update model instance."""
        try:
            # Get existing model with ownership check
            model = await self.get_by_id(session, id, user_id)
            
            # Pre-update validation
            await self._validate_update(session, model, obj_in, user_id)
            
            # Update model
            updated_model = await self.repository.update(session, db_obj=model, obj_in=obj_in)
            
            # Post-update actions
            await self._post_update_actions(session, updated_model)
            
            self.logger.info(f"Updated {self.model_name} {id}")
            return updated_model
            
        except (NotFoundError, PermissionError, ValidationError):
            raise
        except SQLAlchemyError as e:
            self.logger.error(f"Database error in update: {e}")
            raise ServiceError(f"Failed to update {self.model_name}")
    
    async def delete(
        self,
        session: AsyncSession,
        id: Union[UUID, str],
        user_id: Optional[UUID] = None
    ) -> bool:
        """Delete model instance."""
        try:
            # Get existing model with ownership check
            model = await self.get_by_id(session, id, user_id)
            
            # Pre-deletion validation
            await self._validate_delete(session, model, user_id)
            
            # Delete model
            success = await self.repository.delete(session, id=id)
            
            # Post-deletion actions
            if success:
                await self._post_delete_actions(session, model)
                self.logger.info(f"Deleted {self.model_name} {id}")
            
            return success
            
        except (NotFoundError, PermissionError, BusinessRuleError):
            raise
        except SQLAlchemyError as e:
            self.logger.error(f"Database error in delete: {e}")
            raise ServiceError(f"Failed to delete {self.model_name}")
    
    async def get_multi(
        self,
        session: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None,
        user_id: Optional[UUID] = None
    ) -> list:
        """Get multiple records with pagination and optional user filtering."""
        try:
            # Add user filter if provided
            if user_id and filters is None:
                filters = {"user_id": str(user_id)}
            elif user_id and filters is not None:
                filters["user_id"] = str(user_id)
            
            return await self.repository.get_multi(
                session,
                skip=skip,
                limit=limit,
                filters=filters
            )
            
        except SQLAlchemyError as e:
            self.logger.error(f"Database error in get_multi: {e}")
            raise ServiceError(f"Failed to retrieve {self.model_name} records")
    
    # Validation hooks for subclasses
    
    async def _validate_create(
        self, 
        session: AsyncSession, 
        obj_in: Any, 
        user_id: Optional[UUID]
    ) -> None:
        """Validate creation data. Override in subclasses."""
        pass
    
    async def _validate_update(
        self,
        session: AsyncSession,
        model: Any,
        obj_in: Any,
        user_id: Optional[UUID]
    ) -> None:
        """Validate update data. Override in subclasses."""
        pass
    
    async def _validate_delete(
        self,
        session: AsyncSession,
        model: Any,
        user_id: Optional[UUID]
    ) -> None:
        """Validate deletion. Override in subclasses.""" 
        pass
    
    # Optional hooks for subclasses
    
    async def _post_create_actions(self, session: AsyncSession, model: Any) -> None:
        """Post-creation actions. Override in subclasses if needed."""
        pass
    
    async def _post_update_actions(self, session: AsyncSession, model: Any) -> None:
        """Post-update actions. Override in subclasses if needed."""
        pass
    
    async def _post_delete_actions(self, session: AsyncSession, model: Any) -> None:
        """Post-deletion actions. Override in subclasses if needed."""
        pass
    
    # Utility methods
    
    async def _check_permission(
        self,
        session: AsyncSession,
        model: Any,
        user_id: UUID,
        action: str = "access"
    ) -> bool:
        """Check if user has permission for action on model."""
        # Default implementation checks ownership
        if hasattr(model, 'user_id'):
            return getattr(model, 'user_id') == user_id
        
        # Override in subclasses for more complex permission logic
        return True
    
    async def _validate_business_rules(
        self,
        session: AsyncSession,
        model: Any,
        action: str,
        data: Optional[Dict[str, Any]] = None
    ) -> None:
        """Validate business rules for operations."""
        # Override in subclasses for specific business rule validation
        pass


class ServiceRegistry:
    """Registry for service instances with dependency injection."""
    
    def __init__(self):
        self._services: Dict[type, Any] = {}
    
    def register(self, service_class: type, instance: Any) -> None:
        """Register service instance."""
        self._services[service_class] = instance
    
    def get(self, service_class: type) -> Any:
        """Get service instance."""
        if service_class not in self._services:
            raise ServiceError(f"Service {service_class.__name__} not registered")
        return self._services[service_class]
    
    def clear(self) -> None:
        """Clear all registered services."""
        self._services.clear()


# Global service registry instance
service_registry = ServiceRegistry() 