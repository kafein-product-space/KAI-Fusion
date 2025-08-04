from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.orm import selectinload
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import pytz
from croniter import croniter

from ..models.scheduled_job import ScheduledJob, JobExecution
from ..models.workflow import Workflow
from ..core.exceptions import NotFoundError as NotFoundException, ValidationError


class ScheduledJobService:
    def __init__(self, db_session: AsyncSession):
        self.db = db_session

    async def create_scheduled_job(self, job_data: Dict[str, Any], user_id: uuid.UUID) -> ScheduledJob:
        workflow_id = job_data.get("workflow_id")
        
        workflow_query = select(Workflow).where(
            Workflow.id == workflow_id,
            Workflow.user_id == user_id
        )
        workflow_result = await self.db.execute(workflow_query)
        workflow = workflow_result.scalar_one_or_none()
        
        if not workflow:
            raise NotFoundException(f"Workflow {workflow_id} not found or access denied")

        scheduled_job = ScheduledJob(
            workflow_id=workflow_id,
            node_id=job_data["node_id"],
            job_name=job_data["job_name"],
            timer_type=job_data["timer_type"],
            cron_expression=job_data.get("cron_expression"),
            interval_seconds=job_data.get("interval_seconds"),
            delay_seconds=job_data.get("delay_seconds"),
            timezone=job_data.get("timezone", "UTC"),
            max_executions=job_data.get("max_executions", 0),
            is_enabled=job_data.get("is_enabled", True)
        )

        await self._calculate_next_run(scheduled_job)
        
        self.db.add(scheduled_job)
        await self.db.commit()
        await self.db.refresh(scheduled_job)
        
        return scheduled_job

    async def get_scheduled_jobs(
        self, 
        user_id: uuid.UUID, 
        workflow_id: Optional[uuid.UUID] = None,
        enabled: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[ScheduledJob]:
        query = select(ScheduledJob).join(Workflow).where(Workflow.user_id == user_id)
        
        if workflow_id:
            query = query.where(ScheduledJob.workflow_id == workflow_id)
        
        if enabled is not None:
            query = query.where(ScheduledJob.is_enabled == enabled)
        
        query = query.offset(skip).limit(limit)
        
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_scheduled_job(self, job_id: uuid.UUID, user_id: uuid.UUID) -> ScheduledJob:
        query = select(ScheduledJob).join(Workflow).where(
            ScheduledJob.id == job_id,
            Workflow.user_id == user_id
        )
        
        result = await self.db.execute(query)
        job = result.scalar_one_or_none()
        
        if not job:
            raise NotFoundException(f"Scheduled job {job_id} not found or access denied")
        
        return job

    async def update_scheduled_job(
        self, 
        job_id: uuid.UUID, 
        job_data: Dict[str, Any], 
        user_id: uuid.UUID
    ) -> ScheduledJob:
        job = await self.get_scheduled_job(job_id, user_id)
        
        update_data = {}
        for field, value in job_data.items():
            if value is not None and hasattr(job, field):
                update_data[field] = value
        
        if update_data:
            for field, value in update_data.items():
                setattr(job, field, value)
            
            await self._calculate_next_run(job)
            await self.db.commit()
            await self.db.refresh(job)
        
        return job

    async def delete_scheduled_job(self, job_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        job = await self.get_scheduled_job(job_id, user_id)
        
        await self.db.delete(job)
        await self.db.commit()
        
        return True

    async def trigger_scheduled_job(self, job_id: uuid.UUID, user_id: uuid.UUID) -> Dict[str, Any]:
        job = await self.get_scheduled_job(job_id, user_id)
        
        if not job.is_enabled:
            return {
                "success": False,
                "execution_id": None,
                "message": "Cannot trigger disabled scheduled job. Please enable the job first."
            }
        
        execution = JobExecution(
            job_id=job.id,
            status="running",
            started_at=datetime.now(timezone.utc)
        )
        
        self.db.add(execution)
        await self.db.commit()
        await self.db.refresh(execution)
        
        try:
            execution_id = uuid.uuid4()
            execution.execution_id = execution_id
            
            execution.completed_at = datetime.now(timezone.utc)
            execution.status = "completed"
            execution.result = {"message": "Job triggered successfully"}
            
            job.current_executions += 1
            job.last_run_at = execution.completed_at
            
            if job.max_executions > 0 and job.current_executions >= job.max_executions:
                job.is_enabled = False
            
            await self._calculate_next_run(job)
            
            await self.db.commit()
            await self.db.refresh(execution)
            
            return {
                "success": True,
                "execution_id": execution_id,
                "message": "Job triggered successfully"
            }
            
        except Exception as e:
            execution.status = "failed"
            execution.error_message = str(e)
            execution.completed_at = datetime.now(timezone.utc)
            await self.db.commit()
            
            return {
                "success": False,
                "execution_id": None,
                "message": f"Job execution failed: {str(e)}"
            }

    async def get_job_executions(
        self, 
        job_id: uuid.UUID, 
        user_id: uuid.UUID,
        status: Optional[str] = None,
        limit: int = 50
    ) -> List[JobExecution]:
        job = await self.get_scheduled_job(job_id, user_id)
        
        query = select(JobExecution).where(JobExecution.job_id == job_id)
        
        if status:
            query = query.where(JobExecution.status == status)
        
        query = query.order_by(JobExecution.started_at.desc()).limit(limit)
        
        result = await self.db.execute(query)
        return result.scalars().all()

    async def _calculate_next_run(self, job: ScheduledJob) -> None:
        if not job.is_enabled:
            job.next_run_at = None
            return
        
        now = datetime.now(timezone.utc)
        tz = pytz.timezone(job.timezone)
        
        if job.timer_type == "cron":
            if job.cron_expression:
                cron = croniter(job.cron_expression, now)
                job.next_run_at = cron.get_next(datetime)
            else:
                job.next_run_at = None
                
        elif job.timer_type == "interval":
            if job.interval_seconds:
                if job.last_run_at:
                    job.next_run_at = job.last_run_at + timedelta(seconds=job.interval_seconds)
                else:
                    job.next_run_at = now + timedelta(seconds=job.interval_seconds)
            else:
                job.next_run_at = None
                
        elif job.timer_type == "once":
            if job.delay_seconds:
                job.next_run_at = now + timedelta(seconds=job.delay_seconds)
            else:
                job.next_run_at = None
        else:
            job.next_run_at = None

    async def get_jobs_due_for_execution(self) -> List[ScheduledJob]:
        now = datetime.now(timezone.utc)
        
        query = select(ScheduledJob).where(
            ScheduledJob.is_enabled == True,
            ScheduledJob.next_run_at <= now
        )
        
        result = await self.db.execute(query)
        return result.scalars().all() 