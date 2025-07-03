from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import List, Optional
from app.models.workflow import (
    WorkflowCreate, WorkflowUpdate, WorkflowExecute,
    WorkflowResponse, ExecutionResult
)
from app.auth.dependencies import get_current_user
from app.database import db
from app.core.workflow_engine import workflow_engine
import json

router = APIRouter()

@router.post("/", response_model=WorkflowResponse)
async def create_workflow(
    workflow: WorkflowCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new workflow"""
    result = await db.create_workflow(current_user["id"], workflow.dict())
    result['flow_data'] = json.loads(result['flow_data'])
    return result

@router.get("/", response_model=List[WorkflowResponse])
async def list_workflows(
    current_user: dict = Depends(get_current_user)
):
    """List user workflows"""
    workflows = await db.get_workflows(current_user["id"])
    for workflow in workflows:
        workflow['flow_data'] = json.loads(workflow['flow_data'])
    return workflows

@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get workflow details"""
    workflow = await db.get_workflow(workflow_id, current_user["id"])
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    workflow['flow_data'] = json.loads(workflow['flow_data'])
    return workflow

@router.put("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: str,
    workflow: WorkflowUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update workflow"""
    result = await db.update_workflow(
        workflow_id, 
        current_user["id"], 
        workflow.dict(exclude_unset=True)
    )
    result['flow_data'] = json.loads(result['flow_data'])
    return result

@router.delete("/{workflow_id}")
async def delete_workflow(
    workflow_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete workflow"""
    await db.delete_workflow(workflow_id, current_user["id"])
    return {"success": True, "message": "Workflow deleted successfully"}

@router.post("/{workflow_id}/execute", response_model=ExecutionResult)
async def execute_workflow(
    workflow_id: str,
    data: WorkflowExecute,
    current_user: dict = Depends(get_current_user)
):
    """Execute workflow"""
    # For async execution using Celery
    if data.async_execution:
        from app.tasks.workflow_tasks import execute_workflow_task
        from app.database import db
        from app.models.task import TaskType
        
        if not db:
            raise HTTPException(status_code=503, detail="Database not available")
        
        try:
            # Start Celery task
            celery_task = execute_workflow_task.delay(
                workflow_id=workflow_id,
                user_id=current_user["id"],
                inputs=data.inputs,
                task_record_id=""
            )
            
            # Create database record
            task_data = {
                'inputs': data.inputs,
                'priority': 5,
                'workflow_id': workflow_id
            }
            
            task_record = await db.create_task(
                user_id=current_user["id"],
                celery_task_id=celery_task.id,
                task_type=TaskType.WORKFLOW_EXECUTION.value,
                data=task_data
            )
            
            return ExecutionResult(
                success=True,
                workflow_id=workflow_id,
                results={
                    "message": "Workflow execution started in background",
                    "task_id": task_record['id'],
                    "celery_task_id": celery_task.id,
                    "status_url": f"/api/v1/tasks/{task_record['id']}"
                }
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to start async execution: {e}")
    
    # Sync execution (unchanged)
    try:
        result = await workflow_engine.execute_workflow(
            workflow_id,
            current_user["id"],
            data.inputs
        )
        return ExecutionResult(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{workflow_id}/executions")
async def list_executions(
    workflow_id: str,
    limit: int = 10,
    offset: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """List workflow executions"""
    # TODO: Implement pagination and filtering
    executions = await db.get_workflow_executions(workflow_id, current_user["id"], limit, offset)
    return executions
