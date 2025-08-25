from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import uuid

from ..core.database import get_db_session
from ..auth.dependencies import get_current_user
from ..models.user import User
from ..services.dependencies import get_scheduled_job_service_dep
from ..services.scheduled_job_service import ScheduledJobService
from .schemas import (
    ScheduledJobCreate,
    ScheduledJobUpdate,
    ScheduledJobResponse,
    JobExecutionResponse,
    JobTriggerResponse
)

router = APIRouter()


@router.get("", response_model=List[ScheduledJobResponse])
async def get_scheduled_jobs(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    scheduled_job_service: ScheduledJobService = Depends(get_scheduled_job_service_dep),
    workflow_id: Optional[uuid.UUID] = Query(None, description="Filter by workflow ID"),
    enabled: Optional[bool] = Query(None, description="Filter by enabled status"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return")
):
    """Get list of scheduled jobs for the current user."""
    try:
        jobs = await scheduled_job_service.get_scheduled_jobs(
            user_id=current_user.id,
            workflow_id=workflow_id,
            enabled=enabled,
            skip=skip,
            limit=limit
        )
        
        return [
            ScheduledJobResponse(
                id=job.id,
                workflow_id=job.workflow_id,
                node_id=job.node_id,
                job_name=job.job_name,
                timer_type=job.timer_type,
                cron_expression=job.cron_expression,
                interval_seconds=job.interval_seconds,
                delay_seconds=job.delay_seconds,
                timezone=job.timezone,
                max_executions=job.max_executions,
                current_executions=job.current_executions,
                is_enabled=job.is_enabled,
                next_run_at=job.next_run_at,
                last_run_at=job.last_run_at,
                created_at=job.created_at
            )
            for job in jobs
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve scheduled jobs: {str(e)}")


@router.post("", response_model=ScheduledJobResponse)
async def create_scheduled_job(
    job_data: ScheduledJobCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    scheduled_job_service: ScheduledJobService = Depends(get_scheduled_job_service_dep)
):
    """Create a new scheduled job."""
    try:
        job = await scheduled_job_service.create_scheduled_job(
            job_data=job_data.dict(),
            user_id=current_user.id
        )
        
        return ScheduledJobResponse(
            id=job.id,
            workflow_id=job.workflow_id,
            node_id=job.node_id,
            job_name=job.job_name,
            timer_type=job.timer_type,
            cron_expression=job.cron_expression,
            interval_seconds=job.interval_seconds,
            delay_seconds=job.delay_seconds,
            timezone=job.timezone,
            max_executions=job.max_executions,
            current_executions=job.current_executions,
            is_enabled=job.is_enabled,
            next_run_at=job.next_run_at,
            last_run_at=job.last_run_at,
            created_at=job.created_at
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create scheduled job: {str(e)}")


@router.get("/{job_id}", response_model=ScheduledJobResponse)
async def get_scheduled_job(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    scheduled_job_service: ScheduledJobService = Depends(get_scheduled_job_service_dep)
):
    """Get a specific scheduled job by ID."""
    try:
        job = await scheduled_job_service.get_scheduled_job(
            job_id=job_id,
            user_id=current_user.id
        )
        
        return ScheduledJobResponse(
            id=job.id,
            workflow_id=job.workflow_id,
            node_id=job.node_id,
            job_name=job.job_name,
            timer_type=job.timer_type,
            cron_expression=job.cron_expression,
            interval_seconds=job.interval_seconds,
            delay_seconds=job.delay_seconds,
            timezone=job.timezone,
            max_executions=job.max_executions,
            current_executions=job.current_executions,
            is_enabled=job.is_enabled,
            next_run_at=job.next_run_at,
            last_run_at=job.last_run_at,
            created_at=job.created_at
        )
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Scheduled job not found: {str(e)}")


@router.put("/{job_id}", response_model=ScheduledJobResponse)
async def update_scheduled_job(
    job_id: uuid.UUID,
    job_data: ScheduledJobUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    scheduled_job_service: ScheduledJobService = Depends(get_scheduled_job_service_dep)
):
    """Update a scheduled job."""
    try:
        update_data = {k: v for k, v in job_data.dict().items() if v is not None}
        
        job = await scheduled_job_service.update_scheduled_job(
            job_id=job_id,
            job_data=update_data,
            user_id=current_user.id
        )
        
        return ScheduledJobResponse(
            id=job.id,
            workflow_id=job.workflow_id,
            node_id=job.node_id,
            job_name=job.job_name,
            timer_type=job.timer_type,
            cron_expression=job.cron_expression,
            interval_seconds=job.interval_seconds,
            delay_seconds=job.delay_seconds,
            timezone=job.timezone,
            max_executions=job.max_executions,
            current_executions=job.current_executions,
            is_enabled=job.is_enabled,
            next_run_at=job.next_run_at,
            last_run_at=job.last_run_at,
            created_at=job.created_at
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to update scheduled job: {str(e)}")


@router.delete("/{job_id}")
async def delete_scheduled_job(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    scheduled_job_service: ScheduledJobService = Depends(get_scheduled_job_service_dep)
):
    """Delete a scheduled job."""
    try:
        await scheduled_job_service.delete_scheduled_job(
            job_id=job_id,
            user_id=current_user.id
        )
        return {"message": "Scheduled job deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to delete scheduled job: {str(e)}")


@router.post("/{job_id}/trigger", response_model=JobTriggerResponse)
async def trigger_scheduled_job(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    scheduled_job_service: ScheduledJobService = Depends(get_scheduled_job_service_dep)
):
    """Manually trigger a scheduled job."""
    try:
        result = await scheduled_job_service.trigger_scheduled_job(
            job_id=job_id,
            user_id=current_user.id
        )
        
        return JobTriggerResponse(
            success=result["success"],
            execution_id=result["execution_id"],
            message=result["message"]
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to trigger scheduled job: {str(e)}")


@router.get("/{job_id}/executions", response_model=List[JobExecutionResponse])
async def get_job_executions(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    scheduled_job_service: ScheduledJobService = Depends(get_scheduled_job_service_dep),
    status: Optional[str] = Query(None, description="Filter by execution status"),
    limit: int = Query(50, ge=1, le=1000, description="Number of executions to return")
):
    """Get execution history for a scheduled job."""
    try:
        executions = await scheduled_job_service.get_job_executions(
            job_id=job_id,
            user_id=current_user.id,
            status=status,
            limit=limit
        )
        
        return [
            JobExecutionResponse(
                id=execution.id,
                job_id=execution.job_id,
                execution_id=execution.execution_id,
                started_at=execution.started_at,
                completed_at=execution.completed_at,
                status=execution.status,
                result=execution.result,
                error_message=execution.error_message,
                execution_time_ms=execution.execution_time_ms
            )
            for execution in executions
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve job executions: {str(e)}") 