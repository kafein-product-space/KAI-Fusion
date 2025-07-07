"""Custom node repository for custom node-related database operations."""

from typing import List, Optional, Dict, Any, Union
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import CustomNode, CustomNodeCreate, CustomNodeUpdate, NodeCategory
from ..base import BaseRepository


class CustomNodeRepository(BaseRepository[CustomNode, CustomNodeCreate, CustomNodeUpdate]):
    """Repository for custom node operations."""

    def __init__(self):
        super().__init__(CustomNode)

    async def get_by_user(
        self, 
        session: AsyncSession, 
        user_id: str
    ) -> List[CustomNode]:
        """Get custom nodes by user."""
        return await self.get_multi(
            session,
            filters={"user_id": user_id},
            order_by="updated_at",
            order_desc=True
        )

    async def get_public_nodes(
        self,
        session: AsyncSession,
        category: Optional[NodeCategory] = None,
        limit: int = 50
    ) -> List[CustomNode]:
        """Get public custom nodes."""
        filters: Dict[str, Any] = {"is_public": True}
        if category:
            filters["category"] = category.value if hasattr(category, 'value') else str(category)
            
        return await self.get_multi(
            session,
            filters=filters,
            limit=limit,
            order_by="updated_at",
            order_desc=True
        )

    async def search_nodes(
        self,
        session: AsyncSession,
        query: str,
        user_id: Optional[str] = None,
        public_only: bool = False,
        limit: int = 20
    ) -> List[CustomNode]:
        """Search custom nodes by name."""
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