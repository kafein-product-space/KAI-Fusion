"""Task repository for task-related database operations."""

from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Task, TaskCreate, TaskUpdate, TaskStatus
from ..base import BaseRepository


class TaskRepository(BaseRepository[Task, TaskCreate, TaskUpdate]):
    """Repository for task operations."""

    def __init__(self):
        super().__init__(Task)

    async def get_by_status(
        self, 
        session: AsyncSession, 
        status: TaskStatus,
        limit: int = 50
    ) -> List[Task]:
        """Get tasks by status."""
        return await self.get_multi(
            session,
            filters={"status": status},
            limit=limit,
            order_by="created_at",
            order_desc=True
        )

    async def get_by_user(
        self, 
        session: AsyncSession, 
        user_id: str,
        limit: int = 50
    ) -> List[Task]:
        """Get tasks for a specific user."""
        return await self.get_multi(
            session,
            filters={"user_id": user_id},
            limit=limit,
            order_by="created_at",
            order_desc=True
        )

    async def get_by_celery_id(
        self,
        session: AsyncSession,
        celery_task_id: str
    ) -> Optional[Task]:
        """Get task by Celery task ID."""
        return await self.get_by_field(
            session,
            field="celery_task_id",
            value=celery_task_id
        ) 