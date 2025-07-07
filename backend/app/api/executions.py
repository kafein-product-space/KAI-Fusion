"""Execution API endpoints for Agent-Flow V2.

Provides workflow execution tracking, status monitoring, and result management
using the new service layer architecture.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status as http_status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any
from uuid import UUID
from pydantic import BaseModel

# Service imports
from app.services.dependencies import get_execution_service_dep, get_db_session
from app.services.execution_service import ExecutionService
from app.auth.middleware import get_current_user, get_admin_user
from app.db.models import User, ExecutionStatus

import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# Request/Response Models

class ExecutionResponse(BaseModel):
    id: str
    workflow_id: str
    user_id: str
    status: str
    inputs: Dict[str, Any]
    outputs: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    created_at: str
    execution_time: Optional[float] = None

    class Config:
        from_attributes = True

class ExecutionUpdateRequest(BaseModel):
    status: Optional[ExecutionStatus] = None
    outputs: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    progress: Optional[float] = None

class ExecutionStatsResponse(BaseModel):
    total_executions: int
    completed_executions: int
    failed_executions: int
    running_executions: int
    success_rate: float
    average_execution_time: Optional[float] = None

# Execution Management Endpoints

@router.get(
    "/{execution_id}",
    response_model=ExecutionResponse,
    summary="🔍 Get Execution",
    description="Get execution details with access control."
)
async def get_execution(
    execution_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
    execution_service: ExecutionService = Depends(get_execution_service_dep)
):
    """Get execution details."""
    try:
        execution = await execution_service.get_execution_details(
            session, UUID(execution_id), UUID(current_user.id)
        )
        
        return ExecutionResponse(
            id=str(execution.id),
            workflow_id=str(execution.workflow_id),
            user_id=str(execution.user_id),
            status=execution.status.value,
            inputs=execution.inputs,
            outputs=execution.outputs,
            error=execution.error,
            started_at=execution.started_at.isoformat() if execution.started_at else None,
            completed_at=execution.completed_at.isoformat() if execution.completed_at else None,
            created_at=execution.created_at.isoformat(),
            execution_time=execution.execution_time
        )
        
    except ValueError:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="Invalid execution ID format"
        )
    except Exception as e:
        logger.error(f"Failed to get execution {execution_id}: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Execution not found or access denied"
        )

@router.put(
    "/{execution_id}",
    response_model=ExecutionResponse,
    summary="✏️ Update Execution",
    description="Update execution status and results."
)
async def update_execution(
    execution_id: str,
    update_data: ExecutionUpdateRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
    execution_service: ExecutionService = Depends(get_execution_service_dep)
):
    """Update execution status and results."""
    try:
        if update_data.status is None:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Status is required for execution update"
            )
            
        execution = await execution_service.update_execution_status(
            session,
            UUID(execution_id),
            update_data.status,
            update_data.outputs,
            update_data.error,
            update_data.progress
        )
        
        return ExecutionResponse(
            id=str(execution.id),
            workflow_id=str(execution.workflow_id),
            user_id=str(execution.user_id),
            status=execution.status.value,
            inputs=execution.inputs,
            outputs=execution.outputs,
            error=execution.error,
            started_at=execution.started_at.isoformat() if execution.started_at else None,
            completed_at=execution.completed_at.isoformat() if execution.completed_at else None,
            created_at=execution.created_at.isoformat(),
            execution_time=execution.execution_time
        )
        
    except ValueError:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="Invalid execution ID format or update data"
        )
    except Exception as e:
        logger.error(f"Failed to update execution {execution_id}: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update execution"
        )

@router.post(
    "/{execution_id}/cancel",
    response_model=ExecutionResponse,
    summary="🛑 Cancel Execution",
    description="Cancel a running execution."
)
async def cancel_execution(
    execution_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
    execution_service: ExecutionService = Depends(get_execution_service_dep)
):
    """Cancel a running execution."""
    try:
        execution = await execution_service.cancel_execution(
            session, UUID(execution_id), UUID(current_user.id)
        )
        
        return ExecutionResponse(
            id=str(execution.id),
            workflow_id=str(execution.workflow_id),
            user_id=str(execution.user_id),
            status=execution.status.value,
            inputs=execution.inputs,
            outputs=execution.outputs,
            error=execution.error,
            started_at=execution.started_at.isoformat() if execution.started_at else None,
            completed_at=execution.completed_at.isoformat() if execution.completed_at else None,
            created_at=execution.created_at.isoformat(),
            execution_time=execution.execution_time
        )
        
    except ValueError:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="Invalid execution ID format"
        )
    except Exception as e:
        logger.error(f"Failed to cancel execution {execution_id}: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel execution in current state"
        )

@router.post(
    "/{execution_id}/retry",
    response_model=ExecutionResponse,
    summary="🔄 Retry Execution",
    description="Retry a failed execution with optional new inputs."
)
async def retry_execution(
    execution_id: str,
    new_inputs: Optional[Dict[str, Any]] = None,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
    execution_service: ExecutionService = Depends(get_execution_service_dep)
):
    """Retry a failed execution."""
    try:
        execution = await execution_service.retry_execution(
            session, UUID(execution_id), UUID(current_user.id), new_inputs
        )
        
        return ExecutionResponse(
            id=str(execution.id),
            workflow_id=str(execution.workflow_id),
            user_id=str(execution.user_id),
            status=execution.status.value,
            inputs=execution.inputs,
            outputs=execution.outputs,
            error=execution.error,
            started_at=execution.started_at.isoformat() if execution.started_at else None,
            completed_at=execution.completed_at.isoformat() if execution.completed_at else None,
            created_at=execution.created_at.isoformat(),
            execution_time=execution.execution_time
        )
        
    except ValueError:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="Invalid execution ID format"
        )
    except Exception as e:
        logger.error(f"Failed to retry execution {execution_id}: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="Cannot retry execution in current state"
        )

# Execution Listing and Statistics

@router.get(
    "/",
    response_model=List[ExecutionResponse],
    summary="📋 List Executions",
    description="List executions for the current user with filtering."
)
async def list_user_executions(
    workflow_id: Optional[str] = None,
    status: Optional[ExecutionStatus] = None,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Maximum records to return"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
    execution_service: ExecutionService = Depends(get_execution_service_dep)
):
    """List executions for the current user."""
    try:
        workflow_uuid = UUID(workflow_id) if workflow_id else None
        
        executions = await execution_service.get_user_executions(
            session,
            UUID(current_user.id),
            status=status,
            workflow_id=workflow_uuid,
            skip=skip,
            limit=limit
        )
        
        return [
            ExecutionResponse(
                id=str(execution.id),
                workflow_id=str(execution.workflow_id),
                user_id=str(execution.user_id),
                status=execution.status.value,
                inputs=execution.inputs,
                outputs=execution.outputs,
                error=execution.error,
                started_at=execution.started_at.isoformat() if execution.started_at else None,
                completed_at=execution.completed_at.isoformat() if execution.completed_at else None,
                created_at=execution.created_at.isoformat(),
                execution_time=execution.execution_time
            )
            for execution in executions
        ]
        
    except ValueError:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="Invalid workflow ID format"
        )
    except Exception as e:
        logger.error(f"Failed to list executions: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve executions"
        )

@router.get(
    "/statistics",
    response_model=ExecutionStatsResponse,
    summary="📊 Execution Statistics",
    description="Get execution statistics for the current user."
)
async def get_execution_statistics(
    workflow_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
    execution_service: ExecutionService = Depends(get_execution_service_dep)
):
    """Get execution statistics."""
    try:
        workflow_uuid = UUID(workflow_id) if workflow_id else None
        
        stats = await execution_service.get_execution_statistics(
            session, UUID(current_user.id), workflow_uuid
        )
        
        return ExecutionStatsResponse(
            total_executions=stats.get("total_executions", 0),
            completed_executions=stats.get("completed_executions", 0),
            failed_executions=stats.get("failed_executions", 0),
            running_executions=stats.get("running_executions", 0),
            success_rate=stats.get("success_rate", 0.0),
            average_execution_time=stats.get("average_execution_time")
        )
        
    except ValueError:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="Invalid workflow ID format"
        )
    except Exception as e:
        logger.error(f"Failed to get execution statistics: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve execution statistics"
        )

# Admin Endpoints

@router.get(
    "/admin/all",
    response_model=List[ExecutionResponse],
    summary="👑 List All Executions (Admin)",
    description="List all executions in the system (admin only)."
)
async def list_all_executions(
    status: Optional[ExecutionStatus] = None,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum records to return"),
    admin_user: User = Depends(get_admin_user),
    session: AsyncSession = Depends(get_db_session),
    execution_service: ExecutionService = Depends(get_execution_service_dep)
):
    """List all executions (admin only)."""
    try:
        # Use base repository to get all executions
        filters = {"status": status.value} if status else {}
        
        executions = await execution_service.repository.get_multi(
            session, skip=skip, limit=limit, filters=filters
        )
        
        return [
            ExecutionResponse(
                id=str(execution.id),
                workflow_id=str(execution.workflow_id),
                user_id=str(execution.user_id),
                status=execution.status.value,
                inputs=execution.inputs,
                outputs=execution.outputs,
                error=execution.error,
                started_at=execution.started_at.isoformat() if execution.started_at else None,
                completed_at=execution.completed_at.isoformat() if execution.completed_at else None,
                created_at=execution.created_at.isoformat(),
                execution_time=execution.execution_time
            )
            for execution in executions
        ]
        
    except Exception as e:
        logger.error(f"Failed to list all executions: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve executions"
        )

# Health and Status Endpoints

@router.get(
    "/health",
    summary="🩺 Execution Service Health",
    description="Check execution service health status."
)
async def execution_health():
    """Check execution service health."""
    return {
        "service": "execution",
        "status": "healthy",
        "version": "2.0",
        "features": [
            "Execution tracking",
            "Status management",
            "Result processing",
            "Statistics",
            "Admin monitoring"
        ]
    } 