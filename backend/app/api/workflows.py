"""Workflow API endpoints for Agent-Flow V2.

Provides workflow CRUD operations, execution management, and validation
using the new service layer architecture.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any
from uuid import UUID
from pydantic import BaseModel

# New service imports
from app.services.dependencies import get_workflow_service_dep, get_execution_service_dep, get_db_session
from app.services.workflow_service import WorkflowService
from app.services.execution_service import ExecutionService
from app.auth.middleware import get_current_user, get_optional_user
from app.db.models import User, WorkflowCreate, WorkflowUpdate, ExecutionCreate

# Core engine imports
from app.core.engine_v2 import get_engine
from app.core.workflow_runner import WorkflowRunner
from app.core.session_manager import session_manager

import json
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# Request/Response Models

class WorkflowExecuteRequest(BaseModel):
    inputs: Dict[str, Any] = {}
    async_execution: bool = False

class WorkflowResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    is_public: bool
    flow_data: Dict[str, Any]
    user_id: str
    version: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

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

class ExecutionResult(BaseModel):
    success: bool
    workflow_id: str
    execution_id: Optional[str] = None
    results: Dict[str, Any] = {}

class FlowValidationRequest(BaseModel):
    flow_data: Dict[str, Any]

class AdhocExecuteRequest(BaseModel):
    workflow_id: Optional[str] = None
    flow_data: Optional[Dict[str, Any]] = None
    input_text: str = "Hello"
    session_context: Optional[Dict[str, Any]] = None
    stream: bool = False

class ConnectionSuggestionRequest(BaseModel):
    nodes: List[Dict[str, Any]]
    existing_edges: Optional[List[Dict[str, Any]]] = []

class SessionCreateRequest(BaseModel):
    workflow_id: Optional[str] = None

# Workflow CRUD Endpoints

@router.post(
    "/", 
    response_model=WorkflowResponse,
    status_code=status.HTTP_201_CREATED,
    summary="📝 Create Workflow",
    description="Create a new workflow with flow data and metadata."
)
async def create_workflow(
    workflow_data: WorkflowCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
    workflow_service: WorkflowService = Depends(get_workflow_service_dep)
):
    """Create a new workflow."""
    try:
        # Create workflow through service
        workflow = await workflow_service.create_workflow(
            session, workflow_data, UUID(current_user.id)
        )
        
        return WorkflowResponse(
            id=str(workflow.id),
            name=workflow.name,
            description=workflow.description,
            is_public=workflow.is_public,
            flow_data=workflow.flow_data,
            user_id=str(workflow.user_id),
            version=workflow.version,
            created_at=workflow.created_at.isoformat(),
            updated_at=workflow.updated_at.isoformat()
        )
        
    except Exception as e:
        logger.error(f"Failed to create workflow: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create workflow"
        )

@router.get(
    "/", 
    response_model=List[WorkflowResponse],
    summary="📋 List Workflows",
    description="List workflows for the current user with optional public workflows."
)
async def list_workflows(
    include_public: bool = False,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
    workflow_service: WorkflowService = Depends(get_workflow_service_dep)
):
    """List workflows for the current user."""
    try:
        # Get user workflows
        workflows = await workflow_service.get_user_workflows(
            session, UUID(current_user.id), include_public=include_public
        )
        
        return [
            WorkflowResponse(
                id=str(workflow.id),
                name=workflow.name,
                description=workflow.description,
                is_public=workflow.is_public,
                flow_data=workflow.flow_data,
                user_id=str(workflow.user_id),
                version=workflow.version,
                created_at=workflow.created_at.isoformat(),
                updated_at=workflow.updated_at.isoformat()
            )
            for workflow in workflows
        ]
        
    except Exception as e:
        logger.error(f"Failed to list workflows: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve workflows"
        )

@router.get(
    "/{workflow_id}", 
    response_model=WorkflowResponse,
    summary="🔍 Get Workflow",
    description="Get workflow details. Public workflows accessible to everyone, private workflows only to owner."
)
async def get_workflow(
    workflow_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
    session: AsyncSession = Depends(get_db_session),
    workflow_service: WorkflowService = Depends(get_workflow_service_dep)
):
    """Get workflow details with access control."""
    try:
        # Get workflow and check access
        try:
            workflow = await workflow_service.get_by_id(session, UUID(workflow_id))
            # Check if user can access (public or owned)
            if not workflow.is_public and (not current_user or str(workflow.user_id) != current_user.id):
                workflow = None
        except:
            workflow = None
        
        if not workflow:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workflow not found"
            )
        
        return WorkflowResponse(
            id=str(workflow.id),
            name=workflow.name,
            description=workflow.description,
            is_public=workflow.is_public,
            flow_data=workflow.flow_data,
            user_id=str(workflow.user_id),
            version=workflow.version,
            created_at=workflow.created_at.isoformat(),
            updated_at=workflow.updated_at.isoformat()
        )
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid workflow ID format"
        )
    except Exception as e:
        logger.error(f"Failed to get workflow {workflow_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve workflow"
        )

@router.put(
    "/{workflow_id}", 
    response_model=WorkflowResponse,
    summary="✏️ Update Workflow",
    description="Update workflow data and metadata."
)
async def update_workflow(
    workflow_id: str,
    workflow_update: WorkflowUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
    workflow_service: WorkflowService = Depends(get_workflow_service_dep)
):
    """Update workflow."""
    try:
        # Update workflow through service
        workflow = await workflow_service.update_workflow(
            session, UUID(workflow_id), workflow_update, UUID(current_user.id)
        )
        
        if not workflow:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workflow not found or access denied"
            )
        
        return WorkflowResponse(
            id=str(workflow.id),
            name=workflow.name,
            description=workflow.description,
            is_public=workflow.is_public,
            flow_data=workflow.flow_data,
            user_id=str(workflow.user_id),
            version=workflow.version,
            created_at=workflow.created_at.isoformat(),
            updated_at=workflow.updated_at.isoformat()
        )
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid workflow ID format"
        )
    except Exception as e:
        logger.error(f"Failed to update workflow {workflow_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update workflow"
        )

@router.delete(
    "/{workflow_id}",
    summary="🗑️ Delete Workflow",
    description="Delete workflow and all associated executions."
)
async def delete_workflow(
    workflow_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
    workflow_service: WorkflowService = Depends(get_workflow_service_dep)
):
    """Delete workflow."""
    try:
        # Delete workflow through service
        success = await workflow_service.delete_workflow(
            session, UUID(workflow_id), UUID(current_user.id)
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workflow not found or access denied"
            )
        
        return {"success": True, "message": "Workflow deleted successfully"}
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid workflow ID format"
        )
    except Exception as e:
        logger.error(f"Failed to delete workflow {workflow_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete workflow"
        )

# Workflow Execution Endpoints

@router.post(
    "/{workflow_id}/execute", 
    response_model=ExecutionResult,
    summary="▶️ Execute Workflow",
    description="Execute workflow synchronously or asynchronously."
)
async def execute_workflow(
    workflow_id: str,
    execution_data: WorkflowExecuteRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
    workflow_service: WorkflowService = Depends(get_workflow_service_dep),
    execution_service: ExecutionService = Depends(get_execution_service_dep)
):
    """Execute workflow with optional async execution."""
    try:
        workflow_uuid = UUID(workflow_id)
        user_uuid = UUID(current_user.id)
        
        # Check workflow access
        workflow = await workflow_service.get_workflow_with_access(
            session, workflow_uuid, user_uuid
        )
        
        if not workflow:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workflow not found or access denied"
            )
        
        # For async execution
        if execution_data.async_execution:
            from app.tasks.workflow_tasks import execute_workflow_task
            
            try:
                # Start Celery task
                celery_task = execute_workflow_task.delay(
                    workflow_id=workflow_id,
                    user_id=str(user_uuid),
                    inputs=execution_data.inputs,
                    task_record_id=""
                )
                
                # Create execution record
                execution_create = ExecutionCreate(
                    workflow_id=workflow_uuid,
                    inputs=execution_data.inputs
                )
                
                execution = await execution_service.create_execution(
                    session, user_uuid, execution_create
                )
                
                return ExecutionResult(
                    success=True,
                    workflow_id=workflow_id,
                    execution_id=str(execution.id),
                    results={
                        "message": "Workflow execution started in background",
                        "execution_id": str(execution.id),
                        "celery_task_id": celery_task.id,
                        "status_url": f"/api/v1/executions/{execution.id}"
                    }
                )
                
            except Exception as e:
                logger.error(f"Failed to start async execution: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to start async execution"
                )
        
        # Synchronous execution
        try:
            # Create execution record
            execution_create = ExecutionCreate(
                workflow_id=workflow_uuid,
                inputs=execution_data.inputs
            )
            
            execution = await execution_service.create_execution(
                session, user_uuid, execution_create
            )
            
            # Use unified engine for execution
            engine = get_engine()
            engine.build(
                workflow.flow_data,
                user_context={"user_id": str(user_uuid), "workflow_id": workflow_id}
            )
            
            # Execute workflow
            result_raw = await engine.execute(
                execution_data.inputs,
                user_context={"user_id": str(user_uuid), "workflow_id": workflow_id}
            )
            
            # Update execution with results
            if isinstance(result_raw, dict):
                await execution_service.complete_execution(
                    session, UUID(execution.id), result_raw
                )
                
                return ExecutionResult(
                    success=result_raw.get("success", True),
                    workflow_id=workflow_id,
                    execution_id=str(execution.id),
                    results=result_raw.get("results", result_raw)
                )
            else:
                # Handle non-dict results
                result_dict = {"output": result_raw}
                await execution_service.complete_execution(
                    session, UUID(execution.id), result_dict
                )
                
                return ExecutionResult(
                    success=True,
                    workflow_id=workflow_id,
                    execution_id=str(execution.id),
                    results=result_dict
                )
        
        except Exception as e:
            # Update execution with error
            await execution_service.fail_execution(
                session, UUID(execution.id), str(e)
            )
            
            logger.error(f"Workflow execution failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Workflow execution failed: {str(e)}"
            )
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid workflow ID format"
        )
    except Exception as e:
        logger.error(f"Failed to execute workflow {workflow_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to execute workflow"
        )

@router.get(
    "/{workflow_id}/executions",
    response_model=List[ExecutionResponse],
    summary="📊 List Executions",
    description="List executions for a specific workflow."
)
async def list_executions(
    workflow_id: str,
    limit: int = 10,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
    workflow_service: WorkflowService = Depends(get_workflow_service_dep),
    execution_service: ExecutionService = Depends(get_execution_service_dep)
):
    """List executions for a workflow."""
    try:
        workflow_uuid = UUID(workflow_id)
        user_uuid = UUID(current_user.id)
        
        # Check workflow access
        workflow = await workflow_service.get_workflow_with_access(
            session, workflow_uuid, user_uuid
        )
        
        if not workflow:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workflow not found or access denied"
            )
        
        # Get executions through service
        executions = await execution_service.get_workflow_executions(
            session, workflow_uuid, limit=limit, offset=offset
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
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid workflow ID format"
        )
    except Exception as e:
        logger.error(f"Failed to list executions for workflow {workflow_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve executions"
        )

# Workflow Validation and Utilities

@router.post(
    "/validate",
    summary="✅ Validate Workflow",
    description="Validate workflow schema and flow data structure."
)
async def validate_workflow_schema(
    payload: FlowValidationRequest,
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Validate workflow flow data schema."""
    try:
        # Validate flow data structure
        from app.core.graph_builder import GraphBuilder
        
        builder = GraphBuilder()
        is_valid, errors = builder.validate_flow_data(payload.flow_data)
        
        return {
            "valid": is_valid,
            "errors": errors,
            "message": "Flow data is valid" if is_valid else "Flow data has validation errors"
        }
        
    except Exception as e:
        logger.error(f"Flow validation error: {e}")
        return {
            "valid": False,
            "errors": [str(e)],
            "message": "Validation failed due to internal error"
        }

# Legacy endpoints for compatibility (to be deprecated)

@router.post(
    "/execute", 
    response_model=ExecutionResult,
    summary="⚡ Ad-hoc Execute",
    description="Execute workflow ad-hoc without saving (legacy endpoint)."
)
async def execute_adhoc_workflow(
    req: AdhocExecuteRequest,
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Execute workflow ad-hoc without creating workflow record."""
    try:
        # Use either provided flow_data or fetch from workflow_id
        if req.workflow_id and current_user:
            # Get workflow flow_data
            # This would need workflow service integration
            # For now, return error if workflow_id is provided without flow_data
            if not req.flow_data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Either provide flow_data or ensure workflow_id exists with flow_data"
                )
        
        if not req.flow_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="flow_data is required for ad-hoc execution"
            )
        
        # Execute using engine
        engine = get_engine()
        engine.build(req.flow_data)
        
        result = await engine.execute(
            {"input_text": req.input_text},
            user_context=req.session_context or {}
        )
        
        return ExecutionResult(
            success=True,
            workflow_id=req.workflow_id or "adhoc",
            results=result if isinstance(result, dict) else {"output": result}
        )
        
    except Exception as e:
        logger.error(f"Ad-hoc execution failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Execution failed: {str(e)}"
        )

# Session Management (simplified for V2)

@router.post(
    "/sessions",
    summary="🔄 Create Session",
    description="Create workflow execution session."
)
async def create_session(
    request: SessionCreateRequest,
    current_user: User = Depends(get_current_user)
):
    """Create execution session."""
    try:
        session_id = session_manager.create_session(
            user_id=current_user.id,
            workflow_id=request.workflow_id
        )
        
        return {
            "session_id": session_id,
            "message": "Session created successfully"
        }
        
    except Exception as e:
        logger.error(f"Failed to create session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create session"
        )

@router.get(
    "/sessions/{session_id}",
    summary="📋 Get Session",
    description="Get session information."
)
async def get_session(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get session details."""
    try:
        session_data = session_manager.get_session(session_id)
        
        if not session_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        return session_data
        
    except Exception as e:
        logger.error(f"Failed to get session {session_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve session"
        )

@router.delete(
    "/sessions/{session_id}",
    summary="🗑️ Delete Session",
    description="Delete execution session."
)
async def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete session."""
    try:
        session_manager.cleanup_session(session_id)
        
        return {
            "success": True,
            "message": "Session deleted successfully"
        }
        
    except Exception as e:
        logger.error(f"Failed to delete session {session_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete session"
        )
