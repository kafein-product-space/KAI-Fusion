"""Base repository pattern implementation for Agent-Flow V2.

Provides generic CRUD operations and common database patterns
using async SQLAlchemy with proper typing and error handling.
"""

import logging
from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func, and_, or_
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlmodel import SQLModel

logger = logging.getLogger(__name__)

# Generic type variables
ModelType = TypeVar("ModelType", bound=SQLModel)
CreateSchemaType = TypeVar("CreateSchemaType", bound=SQLModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=SQLModel)


class RepositoryException(Exception):
    """Base exception for repository operations."""
    pass


class NotFoundError(RepositoryException):
    """Raised when a requested resource is not found."""
    pass


class ConflictError(RepositoryException):
    """Raised when an operation conflicts with existing data."""
    pass


class BaseRepository(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """Base repository with common CRUD operations.
    
    Provides standard database operations that can be inherited
    by specific repository implementations.
    """

    def __init__(self, model: Type[ModelType]):
        """Initialize repository with model class.
        
        Args:
            model: SQLModel table class
        """
        self.model = model

    async def get(
        self, 
        session: AsyncSession, 
        id: Union[UUID, str]
    ) -> Optional[ModelType]:
        """Get a single record by ID.
        
        Args:
            session: Database session
            id: Record ID
            
        Returns:
            Model instance or None if not found
        """
        try:
            statement = select(self.model).where(self.model.id == id)
            result = await session.execute(statement)
            return result.scalar_one_or_none()
        except SQLAlchemyError as e:
            logger.error(f"Failed to get {self.model.__name__} {id}: {e}")
            raise RepositoryException(f"Database error: {e}")

    async def get_multi(
        self,
        session: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None,
        order_by: Optional[str] = None,
        order_desc: bool = False
    ) -> List[ModelType]:
        """Get multiple records with pagination and filtering.
        
        Args:
            session: Database session
            skip: Number of records to skip (offset)
            limit: Maximum number of records to return
            filters: Dictionary of field:value filters
            order_by: Field name to order by
            order_desc: Whether to order in descending order
            
        Returns:
            List of model instances
        """
        try:
            statement = select(self.model)
            
            # Apply filters
            if filters:
                conditions = []
                for field, value in filters.items():
                    if hasattr(self.model, field):
                        if isinstance(value, list):
                            # IN clause for list values
                            conditions.append(getattr(self.model, field).in_(value))
                        elif isinstance(value, dict) and 'like' in value:
                            # LIKE clause for text search
                            conditions.append(getattr(self.model, field).like(f"%{value['like']}%"))
                        else:
                            # Equality
                            conditions.append(getattr(self.model, field) == value)
                if conditions:
                    statement = statement.where(and_(*conditions))
            
            # Apply ordering
            if order_by and hasattr(self.model, order_by):
                order_column = getattr(self.model, order_by)
                if order_desc:
                    statement = statement.order_by(order_column.desc())
                else:
                    statement = statement.order_by(order_column)
            
            # Apply pagination
            statement = statement.offset(skip).limit(limit)
            
            result = await session.execute(statement)
            return list(result.scalars().all())
            
        except SQLAlchemyError as e:
            logger.error(f"Failed to get multiple {self.model.__name__}: {e}")
            raise RepositoryException(f"Database error: {e}")

    async def create(
        self, 
        session: AsyncSession, 
        *, 
        obj_in: CreateSchemaType
    ) -> ModelType:
        """Create a new record.
        
        Args:
            session: Database session
            obj_in: Creation schema with data
            
        Returns:
            Created model instance
            
        Raises:
            ConflictError: If record conflicts with existing data
        """
        try:
            # Convert Pydantic model to dict
            obj_data = obj_in.model_dump(exclude_unset=True)
            db_obj = self.model(**obj_data)
            
            session.add(db_obj)
            await session.commit()
            await session.refresh(db_obj)
            
            logger.debug(f"Created {self.model.__name__}: {db_obj.id}")
            return db_obj
            
        except IntegrityError as e:
            await session.rollback()
            logger.warning(f"Integrity constraint violation creating {self.model.__name__}: {e}")
            raise ConflictError(f"Record conflicts with existing data: {e}")
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error(f"Failed to create {self.model.__name__}: {e}")
            raise RepositoryException(f"Database error: {e}")

    async def update(
        self,
        session: AsyncSession,
        *,
        db_obj: ModelType,
        obj_in: Union[UpdateSchemaType, Dict[str, Any]]
    ) -> ModelType:
        """Update an existing record.
        
        Args:
            session: Database session
            db_obj: Existing model instance
            obj_in: Update schema or dict with new data
            
        Returns:
            Updated model instance
        """
        try:
            # Convert to dict if Pydantic model
            if isinstance(obj_in, dict):
                update_data = obj_in
            else:
                # Assume it's a Pydantic model with model_dump method
                update_data = obj_in.model_dump(exclude_unset=True)
            
            # Update fields
            for field, value in update_data.items():
                if hasattr(db_obj, field):
                    setattr(db_obj, field, value)
            
            session.add(db_obj)
            await session.commit()
            await session.refresh(db_obj)
            
            logger.debug(f"Updated {self.model.__name__}: {db_obj.id}")
            return db_obj
            
        except IntegrityError as e:
            await session.rollback()
            logger.warning(f"Integrity constraint violation updating {self.model.__name__}: {e}")
            raise ConflictError(f"Update conflicts with existing data: {e}")
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error(f"Failed to update {self.model.__name__}: {e}")
            raise RepositoryException(f"Database error: {e}")

    async def delete(
        self, 
        session: AsyncSession, 
        *, 
        id: Union[UUID, str]
    ) -> bool:
        """Delete a record by ID.
        
        Args:
            session: Database session
            id: Record ID to delete
            
        Returns:
            True if deleted, False if not found
        """
        try:
            statement = delete(self.model).where(self.model.id == id)
            result = await session.execute(statement)
            await session.commit()
            
            deleted = result.rowcount > 0
            if deleted:
                logger.debug(f"Deleted {self.model.__name__}: {id}")
            else:
                logger.warning(f"No {self.model.__name__} found to delete: {id}")
                
            return deleted
            
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error(f"Failed to delete {self.model.__name__} {id}: {e}")
            raise RepositoryException(f"Database error: {e}")

    async def count(
        self,
        session: AsyncSession,
        *,
        filters: Optional[Dict[str, Any]] = None
    ) -> int:
        """Count records with optional filtering.
        
        Args:
            session: Database session
            filters: Dictionary of field:value filters
            
        Returns:
            Number of matching records
        """
        try:
            statement = select(func.count(self.model.id))
            
            # Apply filters
            if filters:
                conditions = []
                for field, value in filters.items():
                    if hasattr(self.model, field):
                        if isinstance(value, list):
                            conditions.append(getattr(self.model, field).in_(value))
                        else:
                            conditions.append(getattr(self.model, field) == value)
                if conditions:
                    statement = statement.where(and_(*conditions))
            
            result = await session.execute(statement)
            return result.scalar() or 0
            
        except SQLAlchemyError as e:
            logger.error(f"Failed to count {self.model.__name__}: {e}")
            raise RepositoryException(f"Database error: {e}")

    async def exists(
        self,
        session: AsyncSession,
        *,
        filters: Dict[str, Any]
    ) -> bool:
        """Check if a record exists with given filters.
        
        Args:
            session: Database session
            filters: Dictionary of field:value filters
            
        Returns:
            True if record exists, False otherwise
        """
        try:
            statement = select(self.model.id)
            
            conditions = []
            for field, value in filters.items():
                if hasattr(self.model, field):
                    conditions.append(getattr(self.model, field) == value)
            
            if conditions:
                statement = statement.where(and_(*conditions)).limit(1)
            
            result = await session.execute(statement)
            return result.scalar() is not None
            
        except SQLAlchemyError as e:
            logger.error(f"Failed to check existence for {self.model.__name__}: {e}")
            raise RepositoryException(f"Database error: {e}")

    async def get_by_field(
        self,
        session: AsyncSession,
        *,
        field: str,
        value: Any
    ) -> Optional[ModelType]:
        """Get a record by a specific field value.
        
        Args:
            session: Database session
            field: Field name to search by
            value: Value to search for
            
        Returns:
            Model instance or None if not found
        """
        if not hasattr(self.model, field):
            raise ValueError(f"Model {self.model.__name__} has no field '{field}'")
        
        try:
            statement = select(self.model).where(getattr(self.model, field) == value)
            result = await session.execute(statement)
            return result.scalar_one_or_none()
            
        except SQLAlchemyError as e:
            logger.error(f"Failed to get {self.model.__name__} by {field}={value}: {e}")
            raise RepositoryException(f"Database error: {e}")

    async def bulk_create(
        self,
        session: AsyncSession,
        *,
        objects: List[CreateSchemaType]
    ) -> List[ModelType]:
        """Create multiple records in a single transaction.
        
        Args:
            session: Database session
            objects: List of creation schemas
            
        Returns:
            List of created model instances
        """
        try:
            db_objects = []
            for obj_in in objects:
                obj_data = obj_in.model_dump(exclude_unset=True)
                db_obj = self.model(**obj_data)
                db_objects.append(db_obj)
            
            session.add_all(db_objects)
            await session.commit()
            
            # Refresh all objects to get generated IDs
            for db_obj in db_objects:
                await session.refresh(db_obj)
            
            logger.debug(f"Bulk created {len(db_objects)} {self.model.__name__} records")
            return db_objects
            
        except IntegrityError as e:
            await session.rollback()
            logger.warning(f"Integrity constraint violation in bulk create {self.model.__name__}: {e}")
            raise ConflictError(f"Bulk create conflicts with existing data: {e}")
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error(f"Failed to bulk create {self.model.__name__}: {e}")
            raise RepositoryException(f"Database error: {e}")

    async def bulk_update(
        self,
        session: AsyncSession,
        *,
        filters: Dict[str, Any],
        values: Dict[str, Any]
    ) -> int:
        """Update multiple records matching filters.
        
        Args:
            session: Database session
            filters: Dictionary of field:value filters
            values: Dictionary of field:value updates
            
        Returns:
            Number of updated records
        """
        try:
            statement = update(self.model)
            
            # Apply filters
            conditions = []
            for field, value in filters.items():
                if hasattr(self.model, field):
                    conditions.append(getattr(self.model, field) == value)
            
            if conditions:
                statement = statement.where(and_(*conditions))
            
            statement = statement.values(**values)
            
            result = await session.execute(statement)
            await session.commit()
            
            updated_count = result.rowcount
            logger.debug(f"Bulk updated {updated_count} {self.model.__name__} records")
            return updated_count
            
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error(f"Failed to bulk update {self.model.__name__}: {e}")
            raise RepositoryException(f"Database error: {e}")


# Utility functions for common patterns
async def get_or_404(
    repository: BaseRepository,
    session: AsyncSession,
    id: Union[UUID, str]
) -> Any:
    """Get a record or raise NotFoundError.
    
    Args:
        repository: Repository instance
        session: Database session
        id: Record ID
        
    Returns:
        Model instance
        
    Raises:
        NotFoundError: If record not found
    """
    obj = await repository.get(session, id)
    if not obj:
        raise NotFoundError(f"{repository.model.__name__} with id {id} not found")
    return obj


async def paginate(
    repository: BaseRepository,
    session: AsyncSession,
    page: int = 1,
    per_page: int = 20,
    **kwargs
) -> Dict[str, Any]:
    """Paginate repository results.
    
    Args:
        repository: Repository instance
        session: Database session
        page: Page number (1-based)
        per_page: Items per page
        **kwargs: Additional arguments for get_multi
        
    Returns:
        Dictionary with pagination info and items
    """
    skip = (page - 1) * per_page
    
    # Get items and total count in parallel
    items = await repository.get_multi(
        session, 
        skip=skip, 
        limit=per_page, 
        **kwargs
    )
    total = await repository.count(session, filters=kwargs.get('filters'))
    
    total_pages = (total + per_page - 1) // per_page
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1,
    } 