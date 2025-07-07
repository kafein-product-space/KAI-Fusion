"""Task Service for Agent-Flow V2.

Handles async task management, monitoring, and task-related business logic.
"""

import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories import TaskRepository
from app.db.models import Task, TaskCreate, TaskUpdate, TaskStatus
from .base import BaseService, ValidationError, NotFoundError, BusinessRuleError

logger = logging.getLogger(__name__)


class TaskService(BaseService):
    """Service for async task management."""
    
    def __init__(self, task_repository: TaskRepository):
        super().__init__(task_repository)
        self.model_name = "Task"
    
    # Task Management
    
    async def create_task(
        self,
        session: AsyncSession,
        task_create: TaskCreate,
        user_id: Optional[UUID] = None
    ) -> Task:
        """Create a new task."""
        try:
            task_data = task_create.model_dump()
            task_data.update({
                'status': TaskStatus.PENDING,
                'created_at': datetime.utcnow()
            })
            
            if user_id:
                task_data['user_id'] = str(user_id)
            
            task = await self.repository.create(session, obj_in=TaskCreate(**task_data))
            
            self.logger.info(f"Created task {task.task_type} with ID {task.id}")
            return task
            
        except Exception as e:
            self.logger.error(f"Error creating task: {e}")
            raise ValidationError("Failed to create task")
    
    async def update_task_status(
        self,
        session: AsyncSession,
        task_id: UUID,
        status: TaskStatus,
        result: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None
    ) -> Task:
        """Update task status and result."""
        try:
            task = await self.get_by_id(session, task_id)
            
            update_data = {
                'status': status,
                'updated_at': datetime.utcnow()
            }
            
            if result is not None:
                update_data['result'] = result
                
            if error is not None:
                update_data['error'] = error
            
            if status in [TaskStatus.SUCCESS, TaskStatus.FAILURE]:
                update_data['completed_at'] = datetime.utcnow()
            
            updated_task = await self.repository.update(
                session, db_obj=task, obj_in=TaskUpdate(**update_data)
            )
            
            self.logger.info(f"Updated task {task_id} status to {status.value}")
            return updated_task
            
        except Exception as e:
            self.logger.error(f"Error updating task status: {e}")
            raise ValidationError("Failed to update task status")
    
    async def get_user_tasks(
        self,
        session: AsyncSession,
        user_id: UUID,
        status: Optional[TaskStatus] = None,
        task_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Task]:
        """Get tasks for a user."""
        try:
            filters = {"user_id": str(user_id)}
            
            if status:
                filters["status"] = status.value
                
            if task_type:
                filters["task_type"] = task_type
            
            return await self.repository.get_multi(
                session,
                skip=skip,
                limit=limit,
                filters=filters,
                order_by="created_at",
                order_desc=True
            )
            
        except Exception as e:
            self.logger.error(f"Error getting user tasks: {e}")
            raise ValidationError("Failed to get user tasks")
    
    async def get_pending_tasks(
        self,
        session: AsyncSession,
        task_type: Optional[str] = None,
        limit: int = 100
    ) -> List[Task]:
        """Get pending tasks for processing."""
        try:
            filters = {"status": TaskStatus.PENDING.value}
            
            if task_type:
                filters["task_type"] = task_type
            
            return await self.repository.get_multi(
                session,
                filters=filters,
                limit=limit,
                order_by="created_at"
            )
            
        except Exception as e:
            self.logger.error(f"Error getting pending tasks: {e}")
            raise ValidationError("Failed to get pending tasks")
    
    # Validation hooks implementation
    
    async def _validate_create(
        self, 
        session: AsyncSession, 
        obj_in: Any, 
        user_id: Optional[UUID]
    ) -> None:
        """Validate task creation."""
        if hasattr(obj_in, 'task_type') and not obj_in.task_type:
            raise ValidationError("Task type is required")
    
    async def _validate_update(
        self,
        session: AsyncSession,
        model: Any,
        obj_in: Any,
        user_id: Optional[UUID]
    ) -> None:
        """Validate task update."""
        pass
    
    async def _validate_delete(
        self,
        session: AsyncSession,
        model: Any,
        user_id: Optional[UUID]
    ) -> None:
        """Validate task deletion."""
        if model.status == TaskStatus.STARTED:
            raise BusinessRuleError("Cannot delete running task") 