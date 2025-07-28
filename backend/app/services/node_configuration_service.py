from typing import List, Optional, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, desc, func, delete
from sqlalchemy.future import select
from ..models.node_configuration import NodeConfiguration
from ..schemas.node_configuration import NodeConfigurationCreate, NodeConfigurationUpdate



class NodeConfigurationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_node_configuration(self, node_config_data: NodeConfigurationCreate) -> NodeConfiguration:
        db_node_config = NodeConfiguration(
            workflow_id=node_config_data.workflow_id,
            node_id=node_config_data.node_id,
            node_type=node_config_data.node_type,
            configuration=node_config_data.configuration,
            position=node_config_data.position
        )
        self.db.add(db_node_config)
        await self.db.commit()
        await self.db.refresh(db_node_config)
        return db_node_config

    async def get_node_configuration(self, node_config_id: UUID) -> Optional[NodeConfiguration]:
        result = await self.db.execute(
            select(NodeConfiguration).where(NodeConfiguration.id == node_config_id)
        )
        return result.scalar_one_or_none()

    async def get_node_configuration_by_node_id(self, workflow_id: UUID, node_id: str) -> Optional[NodeConfiguration]:
        result = await self.db.execute(
            select(NodeConfiguration).where(
                and_(
                    NodeConfiguration.workflow_id == workflow_id,
                    NodeConfiguration.node_id == node_id
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_workflow_node_configurations(
        self, 
        workflow_id: UUID, 
        skip: int = 0, 
        limit: int = 100,
        node_type: Optional[str] = None
    ) -> tuple[List[NodeConfiguration], int]:
        query = select(NodeConfiguration).where(NodeConfiguration.workflow_id == workflow_id)
        
        if node_type:
            query = query.where(NodeConfiguration.node_type == node_type)
        
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()
        
        query = query.offset(skip).limit(limit).order_by(desc(NodeConfiguration.created_at))
        result = await self.db.execute(query)
        node_configs = result.scalars().all()
        
        return node_configs, total

    async def update_node_configuration(
        self, 
        node_config_id: UUID, 
        node_config_update: NodeConfigurationUpdate
    ) -> Optional[NodeConfiguration]:
        db_node_config = await self.get_node_configuration(node_config_id)
        if not db_node_config:
            return None
        
        update_data = node_config_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_node_config, field, value)
        
        await self.db.commit()
        await self.db.refresh(db_node_config)
        return db_node_config

    async def update_node_configuration_by_node_id(
        self, 
        workflow_id: UUID, 
        node_id: str, 
        node_config_update: NodeConfigurationUpdate
    ) -> Optional[NodeConfiguration]:
        db_node_config = await self.get_node_configuration_by_node_id(workflow_id, node_id)
        if not db_node_config:
            return None
        
        update_data = node_config_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_node_config, field, value)
        
        await self.db.commit()
        await self.db.refresh(db_node_config)
        return db_node_config

    async def delete_node_configuration(self, node_config_id: UUID) -> bool:
        db_node_config = await self.get_node_configuration(node_config_id)
        if not db_node_config:
            return False
        
        await self.db.delete(db_node_config)
        await self.db.commit()
        return True

    async def delete_node_configuration_by_node_id(self, workflow_id: UUID, node_id: str) -> bool:
        db_node_config = await self.get_node_configuration_by_node_id(workflow_id, node_id)
        if not db_node_config:
            return False
        
        await self.db.delete(db_node_config)
        await self.db.commit()
        return True

    async def delete_workflow_node_configurations(self, workflow_id: UUID) -> int:
        result = await self.db.execute(
            delete(NodeConfiguration).where(NodeConfiguration.workflow_id == workflow_id)
        )
        await self.db.commit()
        return result.rowcount

    async def get_node_configurations_by_type(self, node_type: str, skip: int = 0, limit: int = 100) -> tuple[List[NodeConfiguration], int]:
        query = select(NodeConfiguration).where(NodeConfiguration.node_type == node_type)
        
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()
        
        query = query.offset(skip).limit(limit).order_by(desc(NodeConfiguration.created_at))
        result = await self.db.execute(query)
        node_configs = result.scalars().all()
        
        return node_configs, total 