from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from app.models.task import (
    TaskCreate, TaskResponse, TaskListResponse, TaskStatsResponse,
    TaskType, TaskStatus, TaskProgressUpdate
)
from app.auth.dependencies import get_current_user
from app.database import db
from app.core.celery_app import celery_app
from app.tasks.workflow_tasks import execute_workflow_task, bulk_execute_workflows_task, validate_workflow_task
from app.tasks.monitoring_tasks import test_credential_task
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/workflow/{workflow_id}/execute", response_model=TaskResponse)
async def execute_workflow_async(
    workflow_id: str,
    inputs: dict = {},
    priority: int = 5,
    current_user: dict = Depends(get_current_user)
):
    """Start async workflow execution"""
    if not db:
        raise HTTPException(status_code=503, detail="Database not available")
    
    try:
        # Create task record in database first
        task_data = {
            'inputs': inputs,
            'priority': priority,
            'workflow_id': workflow_id
        }
        
        # Start Celery task (this will generate the Celery task ID)
        celery_task = execute_workflow_task.delay(
            workflow_id=workflow_id,
            user_id=current_user["id"],
            inputs=inputs,
            task_record_id=""  # Will be updated after task creation
        )
        
        # Create database record with Celery task ID
        task_record = await db.create_task(
            user_id=current_user["id"],
            celery_task_id=celery_task.id,
            task_type=TaskType.WORKFLOW_EXECUTION.value,
            data=task_data
        )
        
        # Update the Celery task with the correct task record ID
        # Note: This is a limitation - we need the task record ID for tracking
        # but we need to start the task to get the Celery ID
        # In a real implementation, you might want to refactor this
        
        return TaskResponse(
            id=task_record['id'],
            celery_task_id=celery_task.id,
            user_id=current_user["id"],
            task_type=TaskType.WORKFLOW_EXECUTION,
            workflow_id=workflow_id,
            status=TaskStatus.PENDING,
            priority=priority,
            inputs=inputs,
            created_at=task_record['created_at']
        )
        
    except Exception as e:
        logger.error(f"Failed to start workflow execution: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/workflows/bulk-execute", response_model=TaskResponse)
async def bulk_execute_workflows_async(
    workflow_configs: List[dict],
    priority: int = 5,
    current_user: dict = Depends(get_current_user)
):
    """Execute multiple workflows asynchronously"""
    if not db:
        raise HTTPException(status_code=503, detail="Database not available")
    
    try:
        task_data = {
            'inputs': {'workflow_configs': workflow_configs},
            'priority': priority
        }
        
        celery_task = bulk_execute_workflows_task.delay(
            workflow_configs=workflow_configs,
            user_id=current_user["id"],
            task_record_id=""
        )
        
        task_record = await db.create_task(
            user_id=current_user["id"],
            celery_task_id=celery_task.id,
            task_type=TaskType.BULK_WORKFLOW_EXECUTION.value,
            data=task_data
        )
        
        return TaskResponse(
            id=task_record['id'],
            celery_task_id=celery_task.id,
            user_id=current_user["id"],
            task_type=TaskType.BULK_WORKFLOW_EXECUTION,
            status=TaskStatus.PENDING,
            priority=priority,
            inputs=task_data['inputs'],
            created_at=task_record['created_at']
        )
        
    except Exception as e:
        logger.error(f"Failed to start bulk execution: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/workflow/{workflow_id}/validate", response_model=TaskResponse)
async def validate_workflow_async(
    workflow_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Start async workflow validation"""
    if not db:
        raise HTTPException(status_code=503, detail="Database not available")
    
    try:
        task_data = {
            'inputs': {},
            'priority': 3,  # Higher priority for validation
            'workflow_id': workflow_id
        }
        
        celery_task = validate_workflow_task.delay(
            workflow_id=workflow_id,
            user_id=current_user["id"],
            task_record_id=""
        )
        
        task_record = await db.create_task(
            user_id=current_user["id"],
            celery_task_id=celery_task.id,
            task_type=TaskType.WORKFLOW_VALIDATION.value,
            data=task_data
        )
        
        return TaskResponse(
            id=task_record['id'],
            celery_task_id=celery_task.id,
            user_id=current_user["id"],
            task_type=TaskType.WORKFLOW_VALIDATION,
            workflow_id=workflow_id,
            status=TaskStatus.PENDING,
            priority=3,
            inputs={},
            created_at=task_record['created_at']
        )
        
    except Exception as e:
        logger.error(f"Failed to start workflow validation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=TaskListResponse)
async def list_tasks(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[TaskStatus] = None,
    task_type: Optional[TaskType] = None,
    current_user: dict = Depends(get_current_user)
):
    """List user tasks with filtering and pagination"""
    if not db:
        raise HTTPException(status_code=503, detail="Database not available")
    
    try:
        offset = (page - 1) * per_page
        
        result = await db.list_user_tasks(
            user_id=current_user["id"],
            limit=per_page,
            offset=offset,
            status=status.value if status else None,
            task_type=task_type.value if task_type else None
        )
        
        # Convert database records to response models
        tasks = []
        for task_data in result['tasks']:
            tasks.append(TaskResponse(
                id=task_data['id'],
                celery_task_id=task_data['celery_task_id'],
                user_id=task_data['user_id'],
                task_type=TaskType(task_data['task_type']),
                workflow_id=task_data.get('workflow_id'),
                status=TaskStatus(task_data['status']),
                progress=task_data.get('progress', 0),
                current_step=task_data.get('current_step'),
                priority=task_data['priority'],
                inputs=task_data['inputs'],
                result=task_data.get('result'),
                error=task_data.get('error'),
                retry_count=task_data.get('retry_count', 0),
                max_retries=task_data.get('max_retries', 3),
                created_at=task_data['created_at'],
                started_at=task_data.get('started_at'),
                completed_at=task_data.get('completed_at'),
                estimated_duration=task_data.get('estimated_duration')
            ))
        
        return TaskListResponse(
            tasks=tasks,
            total=result['total'],
            page=result['page'],
            per_page=result['per_page'],
            has_next=result['has_next']
        )
        
    except Exception as e:
        logger.error(f"Failed to list tasks: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get task details"""
    if not db:
        raise HTTPException(status_code=503, detail="Database not available")
    
    try:
        task_data = await db.get_task(task_id, current_user["id"])
        if not task_data:
            raise HTTPException(status_code=404, detail="Task not found")
        
        return TaskResponse(
            id=task_data['id'],
            celery_task_id=task_data['celery_task_id'],
            user_id=task_data['user_id'],
            task_type=TaskType(task_data['task_type']),
            workflow_id=task_data.get('workflow_id'),
            status=TaskStatus(task_data['status']),
            progress=task_data.get('progress', 0),
            current_step=task_data.get('current_step'),
            priority=task_data['priority'],
            inputs=task_data['inputs'],
            result=task_data.get('result'),
            error=task_data.get('error'),
            retry_count=task_data.get('retry_count', 0),
            max_retries=task_data.get('max_retries', 3),
            created_at=task_data['created_at'],
            started_at=task_data.get('started_at'),
            completed_at=task_data.get('completed_at'),
            estimated_duration=task_data.get('estimated_duration')
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get task {task_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{task_id}/cancel")
async def cancel_task(
    task_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Cancel a running task"""
    if not db:
        raise HTTPException(status_code=503, detail="Database not available")
    
    try:
        # Get task details
        task_data = await db.get_task(task_id, current_user["id"])
        if not task_data:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Check if task can be cancelled
        if task_data['status'] in [TaskStatus.SUCCESS.value, TaskStatus.FAILURE.value, TaskStatus.REVOKED.value]:
            raise HTTPException(status_code=400, detail="Task cannot be cancelled - already completed")
        
        # Cancel the Celery task
        celery_app.control.revoke(task_data['celery_task_id'], terminate=True)
        
        # Update task status in database
        await db.update_task(task_id, {
            'status': TaskStatus.REVOKED.value,
            'current_step': 'Cancelled by user'
        })
        
        return {"success": True, "message": "Task cancelled successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to cancel task {task_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{task_id}/retry")
async def retry_task(
    task_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Retry a failed task"""
    if not db:
        raise HTTPException(status_code=503, detail="Database not available")
    
    try:
        # Get task details
        task_data = await db.get_task(task_id, current_user["id"])
        if not task_data:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Check if task can be retried
        if task_data['status'] != TaskStatus.FAILURE.value:
            raise HTTPException(status_code=400, detail="Only failed tasks can be retried")
        
        # Create a new task with the same parameters
        if task_data['task_type'] == TaskType.WORKFLOW_EXECUTION.value:
            celery_task = execute_workflow_task.delay(
                workflow_id=task_data['workflow_id'],
                user_id=current_user["id"],
                inputs=task_data['inputs'],
                task_record_id=""
            )
        elif task_data['task_type'] == TaskType.WORKFLOW_VALIDATION.value:
            celery_task = validate_workflow_task.delay(
                workflow_id=task_data['workflow_id'],
                user_id=current_user["id"],
                task_record_id=""
            )
        else:
            raise HTTPException(status_code=400, detail="Task type cannot be retried")
        
        # Create new task record
        retry_task_data = {
            'inputs': task_data['inputs'],
            'priority': task_data['priority'],
            'workflow_id': task_data.get('workflow_id')
        }
        
        new_task_record = await db.create_task(
            user_id=current_user["id"],
            celery_task_id=celery_task.id,
            task_type=task_data['task_type'],
            data=retry_task_data
        )
        
        return {
            "success": True,
            "message": "Task retry started",
            "new_task_id": new_task_record['id'],
            "celery_task_id": celery_task.id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retry task {task_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/statistics/overview", response_model=TaskStatsResponse)
async def get_task_statistics(
    task_type: Optional[TaskType] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get task statistics for the user"""
    if not db:
        raise HTTPException(status_code=503, detail="Database not available")
    
    try:
        stats = await db.get_task_statistics(
            user_id=current_user["id"],
            task_type=task_type.value if task_type else None
        )
        
        return TaskStatsResponse(**stats)
        
    except Exception as e:
        logger.error(f"Failed to get task statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{task_id}/logs")
async def get_task_logs(
    task_id: str,
    limit: int = Query(100, ge=1, le=1000),
    current_user: dict = Depends(get_current_user)
):
    """Get execution logs for a task"""
    if not db:
        raise HTTPException(status_code=503, detail="Database not available")
    
    try:
        logs = await db.get_task_logs(task_id, current_user["id"], limit)
        return {"logs": logs}
        
    except Exception as e:
        logger.error(f"Failed to get task logs for {task_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/celery/status")
async def get_celery_status(
    current_user: dict = Depends(get_current_user)
):
    """Get Celery worker status"""
    try:
        inspect = celery_app.control.inspect()
        
        # Get worker stats
        stats = {
            'workers': {},
            'active_tasks': 0,
            'scheduled_tasks': 0
        }
        
        # Active tasks
        active = inspect.active()
        if active:
            for worker, tasks in active.items():
                stats['workers'][worker] = {
                    'active_tasks': len(tasks),
                    'status': 'online'
                }
                stats['active_tasks'] += len(tasks)
        
        # Scheduled tasks
        scheduled = inspect.scheduled()
        if scheduled:
            for worker, tasks in scheduled.items():
                if worker not in stats['workers']:
                    stats['workers'][worker] = {'active_tasks': 0, 'status': 'online'}
                stats['workers'][worker]['scheduled_tasks'] = len(tasks)
                stats['scheduled_tasks'] += len(tasks)
        
        # Worker ping
        ping = inspect.ping()
        if ping:
            for worker in ping.keys():
                if worker not in stats['workers']:
                    stats['workers'][worker] = {'active_tasks': 0, 'status': 'online'}
                stats['workers'][worker]['ping'] = 'ok'
        
        return stats
        
    except Exception as e:
        logger.error(f"Failed to get Celery status: {e}")
        return {
            'error': str(e),
            'workers': {},
            'active_tasks': 0,
            'scheduled_tasks': 0
        } 