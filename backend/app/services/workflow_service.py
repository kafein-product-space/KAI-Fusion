from app.models.workflow import Workflow
from app.services.base import BaseService
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional
import uuid


class WorkflowService(BaseService[Workflow]):
    def __init__(self):
        super().__init__(Workflow)

    async def get_by_id(
        self, db: AsyncSession, workflow_id: uuid.UUID, user_id: Optional[uuid.UUID] = None
    ) -> Optional[Workflow]:
        """
        Get a workflow by its ID.
        If user_id is provided, it also filters by user.
        """
        query = select(self.model).filter_by(id=workflow_id)
        if user_id:
            query = query.filter_by(user_id=user_id)
        
        result = await db.execute(query)
        return result.scalars().first() 