from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID

from ..core.database import get_db_session
from ..services.node_configuration_service import NodeConfigurationService
from ..schemas.node_configuration import (
    NodeConfigurationCreate,
    NodeConfigurationUpdate,
    NodeConfigurationResponse,
    NodeConfigurationListResponse
)
from ..auth.dependencies import get_current_user
from ..models.user import User

router = APIRouter()

@router.post("", response_model=NodeConfigurationResponse)
async def create_node_configuration(
    node_config_data: NodeConfigurationCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    service = NodeConfigurationService(db)
    node_config = await service.create_node_configuration(node_config_data)
    return NodeConfigurationResponse.model_validate(node_config)


@router.get("/{node_config_id}", response_model=NodeConfigurationResponse)
async def get_node_configuration(
    node_config_id: UUID = Path(..., description="Node configuration ID"),
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    service = NodeConfigurationService(db)
    node_config = await service.get_node_configuration(node_config_id)
    if not node_config:
        raise HTTPException(status_code=404, detail="Node configuration not found")
    return NodeConfigurationResponse.model_validate(node_config)


@router.get("/workflow/{workflow_id}", response_model=NodeConfigurationListResponse)
async def get_workflow_node_configurations(
    workflow_id: UUID = Path(..., description="Workflow ID"),
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    node_type: Optional[str] = Query(None, description="Filter by node type")
):
    service = NodeConfigurationService(db)
    node_configs, total = await service.get_workflow_node_configurations(
        workflow_id=workflow_id,
        skip=skip,
        limit=limit,
        node_type=node_type
    )
    
    return NodeConfigurationListResponse(
        node_configurations=[NodeConfigurationResponse.from_orm(config) for config in node_configs],
        total=total,
        page=skip // limit + 1,
        size=limit
    )


@router.get("/workflow/{workflow_id}/node/{node_id}", response_model=NodeConfigurationResponse)
async def get_node_configuration_by_node_id(
    workflow_id: UUID = Path(..., description="Workflow ID"),
    node_id: str = Path(..., description="Node ID"),
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    service = NodeConfigurationService(db)
    node_config = await service.get_node_configuration_by_node_id(workflow_id, node_id)
    if not node_config:
        raise HTTPException(status_code=404, detail="Node configuration not found")
    return NodeConfigurationResponse.model_validate(node_config)


@router.put("/{node_config_id}", response_model=NodeConfigurationResponse)
async def update_node_configuration(
    node_config_update: NodeConfigurationUpdate,
    node_config_id: UUID = Path(..., description="Node configuration ID"),
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    service = NodeConfigurationService(db)
    node_config = await service.update_node_configuration(node_config_id, node_config_update)
    if not node_config:
        raise HTTPException(status_code=404, detail="Node configuration not found")
    return NodeConfigurationResponse.model_validate(node_config)


@router.put("/workflow/{workflow_id}/node/{node_id}", response_model=NodeConfigurationResponse)
async def update_node_configuration_by_node_id(
    node_config_update: NodeConfigurationUpdate,
    workflow_id: UUID = Path(..., description="Workflow ID"),
    node_id: str = Path(..., description="Node ID"),
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    service = NodeConfigurationService(db)
    node_config = await service.update_node_configuration_by_node_id(workflow_id, node_id, node_config_update)
    if not node_config:
        raise HTTPException(status_code=404, detail="Node configuration not found")
    return NodeConfigurationResponse.model_validate(node_config)


@router.delete("/{node_config_id}")
async def delete_node_configuration(
    node_config_id: UUID = Path(..., description="Node configuration ID"),
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    service = NodeConfigurationService(db)
    success = await service.delete_node_configuration(node_config_id)
    if not success:
        raise HTTPException(status_code=404, detail="Node configuration not found")
    return {"message": "Node configuration deleted successfully"}


@router.delete("/workflow/{workflow_id}/node/{node_id}")
async def delete_node_configuration_by_node_id(
    workflow_id: UUID = Path(..., description="Workflow ID"),
    node_id: str = Path(..., description="Node ID"),
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    service = NodeConfigurationService(db)
    success = await service.delete_node_configuration_by_node_id(workflow_id, node_id)
    if not success:
        raise HTTPException(status_code=404, detail="Node configuration not found")
    return {"message": "Node configuration deleted successfully"}


@router.delete("/workflow/{workflow_id}/all")
async def delete_workflow_node_configurations(
    workflow_id: UUID = Path(..., description="Workflow ID"),
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    service = NodeConfigurationService(db)
    deleted_count = await service.delete_workflow_node_configurations(workflow_id)
    return {"message": f"Deleted {deleted_count} node configurations"}


@router.get("/type/{node_type}", response_model=NodeConfigurationListResponse)
async def get_node_configurations_by_type(
    node_type: str = Path(..., description="Node type"),
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return")
):
    service = NodeConfigurationService(db)
    node_configs, total = await service.get_node_configurations_by_type(
        node_type=node_type,
        skip=skip,
        limit=limit
    )
    
    return NodeConfigurationListResponse(
        node_configurations=[NodeConfigurationResponse.model_validate(config) for config in node_configs],
        total=total,
        page=skip // limit + 1,
        size=limit
    ) 