import uuid
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.execution import WorkflowExecution
from app.services.base import BaseService


class ExecutionService(BaseService[WorkflowExecution]):
    def __init__(self):
        super().__init__(WorkflowExecution)

    async def get_workflow_executions(
        self,
        db: AsyncSession,
        workflow_id: uuid.UUID,
        user_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> List[WorkflowExecution]:
        """
        Get all executions for a specific workflow.
        """
        query = (
            select(self.model)
            .filter_by(workflow_id=workflow_id, user_id=user_id)
            .order_by(self.model.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(query)
        return result.scalars().all() 