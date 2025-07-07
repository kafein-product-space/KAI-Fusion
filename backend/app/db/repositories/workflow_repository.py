"""Workflow repository for workflow-related database operations."""

from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from uuid import UUID

from ..models import Workflow, WorkflowCreate, WorkflowUpdate, User
from ..base import BaseRepository


class WorkflowRepository(BaseRepository[Workflow, WorkflowCreate, WorkflowUpdate]):
    """Repository for workflow operations."""

    def __init__(self):
        super().__init__(Workflow)

    async def get_by_user(
        self, 
        session: AsyncSession, 
        user_id: str,
        include_private: bool = True
    ) -> List[Workflow]:
        """Get workflows by user ID."""
        filters: Dict[str, Any] = {"user_id": user_id}
        if not include_private:
            filters["is_public"] = True
            
        return await self.get_multi(
            session,
            filters=filters,
            order_by="updated_at",
            order_desc=True
        )

    async def get_public_workflows(
        self,
        session: AsyncSession,
        skip: int = 0,
        limit: int = 20
    ) -> List[Workflow]:
        """Get public workflows with pagination."""
        return await self.get_multi(
            session,
            filters={"is_public": True},
            skip=skip,
            limit=limit,
            order_by="updated_at",
            order_desc=True
        )

    async def search_workflows(
        self,
        session: AsyncSession,
        query: str,
        user_id: Optional[str] = None,
        public_only: bool = False,
        limit: int = 20
    ) -> List[Workflow]:
        """Search workflows by name or description."""
        filters: Dict[str, Any] = {
            "name": {"like": f"%{query}%"}
        }
        
        if user_id:
            filters["user_id"] = user_id
        
        if public_only:
            filters["is_public"] = True
            
        return await self.get_multi(
            session,
            filters=filters,
            limit=limit,
            order_by="updated_at",
            order_desc=True
        )

    async def get_with_user(
        self,
        session: AsyncSession,
        workflow_id: str
    ) -> Optional[Workflow]:
        """Get workflow with user information loaded."""
        # Use the base repository's get method which handles UUID conversion properly
        return await self.get(session, workflow_id)

    async def increment_version(
        self,
        session: AsyncSession,
        workflow_id: str
    ) -> Optional[Workflow]:
        """Increment workflow version and update timestamp."""
        workflow = await self.get(session, workflow_id)
        if workflow:
            workflow.version += 1
            workflow.updated_at = datetime.utcnow()
            await session.commit()
            return workflow
        return None

    async def clone_workflow(
        self,
        session: AsyncSession,
        source_workflow_id: str,
        new_name: str,
        user_id: str,
        is_public: bool = False
    ) -> Optional[Workflow]:
        """Clone an existing workflow for a user."""
        source = await self.get(session, source_workflow_id)
        if not source:
            return None
            
        # Create new workflow with copied data
        new_workflow_data = {
            "name": new_name,
            "description": f"Cloned from: {source.name}",
            "flow_data": source.flow_data.copy() if source.flow_data else {},
            "is_public": is_public,
            "user_id": user_id
        }
        
        workflow_create = WorkflowCreate(**new_workflow_data)
        return await self.create(session, obj_in=workflow_create)

    async def get_user_workflow_count(
        self,
        session: AsyncSession,
        user_id: str
    ) -> int:
        """Get total number of workflows for a user."""
        return await self.count(
            session,
            filters={"user_id": user_id}
        )

    async def get_recent_workflows(
        self,
        session: AsyncSession,
        user_id: str,
        days: int = 7,
        limit: int = 10
    ) -> List[Workflow]:
        """Get recently updated workflows for a user."""
        from datetime import datetime, timedelta
        
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # For now, use the base filters - could be enhanced with date filtering
        return await self.get_multi(
            session,
            filters={"user_id": user_id},
            limit=limit,
            order_by="updated_at",
            order_desc=True
        ) 