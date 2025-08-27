"""Workflow Executions API endpoints"""

import uuid
from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.core.database import get_db_session
from app.models.user import User
from app.schemas.execution import (
    WorkflowExecutionCreate,
    WorkflowExecutionResponse,
)
from app.services.execution_service import ExecutionService

router = APIRouter()


@router.post(
    "",
    response_model=WorkflowExecutionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_workflow_execution(
    workflow_id: uuid.UUID,
    inputs: dict[str, Any],
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    execution_service: ExecutionService = Depends(),
):
    """
    Trigger a new workflow execution.
    """
    execution_in = WorkflowExecutionCreate(
        workflow_id=workflow_id, user_id=current_user.id, inputs=inputs
    )
    execution = await execution_service.create_execution(db, execution_in=execution_in)
    # Here you would typically trigger an async task to run the workflow
    # from app.tasks.workflow_tasks import run_workflow
    # run_workflow.delay(execution.id)
    return execution


@router.get("", response_model=List[WorkflowExecutionResponse])
async def list_executions(
    workflow_id: uuid.UUID = None,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    execution_service: ExecutionService = Depends(),
    skip: int = 0,
    limit: int = 100,
):
    """
    List executions. If workflow_id is provided, list executions for that workflow only.
    If workflow_id is not provided, list all executions for the current user.
    """
    if workflow_id:
        executions = await execution_service.get_workflow_executions(
            db, workflow_id=workflow_id, user_id=current_user.id, skip=skip, limit=limit
        )
    else:
        executions = await execution_service.get_all_user_executions(
            db, user_id=current_user.id, skip=skip, limit=limit
        )
    return executions


@router.get("/{execution_id}", response_model=WorkflowExecutionResponse)
async def get_workflow_execution(
    execution_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    execution_service: ExecutionService = Depends(),
):
    """
    Get a specific workflow execution by its ID.
    """
    execution = await execution_service.get_execution(
        db, execution_id=execution_id, user_id=current_user.id
    )
    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Execution not found"
        )
    return execution


@router.delete("/{execution_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow_execution(
    execution_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    execution_service: ExecutionService = Depends(),
):
    """
    Delete a specific workflow execution by its ID.
    """
    execution = await execution_service.get_execution(
        db, execution_id=execution_id, user_id=current_user.id
    )
    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Execution not found"
        )
    
    await execution_service.delete_execution(db, execution_id=execution_id, user_id=current_user.id)
    return None