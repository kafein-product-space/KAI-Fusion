"""Execution repository for execution-related database operations."""

from datetime import datetime
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Execution, ExecutionCreate, ExecutionUpdate, ExecutionStatus
from ..base import BaseRepository


class ExecutionRepository(BaseRepository[Execution, ExecutionCreate, ExecutionUpdate]):
    """Repository for execution operations."""

    def __init__(self):
        super().__init__(Execution)

    async def get_by_workflow(
        self, 
        session: AsyncSession, 
        workflow_id: str,
        limit: int = 50
    ) -> List[Execution]:
        """Get executions for a specific workflow."""
        return await self.get_multi(
            session,
            filters={"workflow_id": workflow_id},
            limit=limit,
            order_by="created_at",
            order_desc=True
        )

    async def get_by_user(
        self, 
        session: AsyncSession, 
        user_id: str,
        limit: int = 50
    ) -> List[Execution]:
        """Get executions for a specific user."""
        return await self.get_multi(
            session,
            filters={"user_id": user_id},
            limit=limit,
            order_by="created_at",
            order_desc=True
        )

    async def get_running_executions(
        self,
        session: AsyncSession
    ) -> List[Execution]:
        """Get all currently running executions."""
        return await self.get_multi(
            session,
            filters={"status": "running"}
        )

    async def mark_completed(
        self,
        session: AsyncSession,
        execution_id: str,
        outputs: dict,
        success: bool = True
    ) -> Optional[Execution]:
        """Mark an execution as completed."""
        execution = await self.get(session, execution_id)
        if execution:
            execution.status = ExecutionStatus.COMPLETED if success else ExecutionStatus.FAILED
            execution.outputs = outputs
            execution.completed_at = datetime.utcnow()
            if execution.started_at:
                execution.execution_time = (
                    execution.completed_at - execution.started_at
                ).total_seconds()
            await session.commit()
            return execution
        return None 