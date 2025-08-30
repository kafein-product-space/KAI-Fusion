import uuid
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.execution import WorkflowExecution
from app.services.base import BaseService
from app.schemas.execution import WorkflowExecutionCreate, WorkflowExecutionUpdate


class ExecutionService(BaseService[WorkflowExecution]):
    def __init__(self):
        super().__init__(WorkflowExecution)

    async def create_execution(
        self,
        db: AsyncSession,
        *,
        execution_in: WorkflowExecutionCreate,
    ) -> WorkflowExecution:
        """
        Create a new workflow execution.
        """
        execution = await self.create(db, obj_in=execution_in)
        return execution

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

    async def get_all_user_executions(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> List[WorkflowExecution]:
        """
        Get all executions for a user across all workflows.
        """
        query = (
            select(self.model)
            .filter_by(user_id=user_id)
            .order_by(self.model.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(query)
        return result.scalars().all()

    async def update_execution(
        self,
        db: AsyncSession,
        execution_id: uuid.UUID,
        execution_in: WorkflowExecutionUpdate,
    ) -> WorkflowExecution:
        """
        Update a workflow execution.
        """
        execution = await self.get(db, execution_id)
        if not execution:
            raise Exception("Execution not found") # Replace with a proper HTTPException

        execution = await self.update(db, db_obj=execution, obj_in=execution_in)
        return execution

    async def get_execution(
        self,
        db: AsyncSession,
        execution_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> WorkflowExecution:
        """
        Get a specific execution by ID.
        """
        query = (
            select(self.model)
            .filter_by(id=execution_id, user_id=user_id)
        )
        result = await db.execute(query)
        return result.scalars().first()

    async def delete_execution(
        self,
        db: AsyncSession,
        execution_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> bool:
        """
        Delete a specific execution by ID.
        """
        execution = await self.get_execution(db, execution_id=execution_id, user_id=user_id)
        if not execution:
            return False
        
        await self.remove(db, id=execution_id)
        return True 