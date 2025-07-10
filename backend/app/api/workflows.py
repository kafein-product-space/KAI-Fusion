"""Workflow API endpoints for Agent-Flow V2.

Provides workflow CRUD operations, execution management, and validation
using the new service layer architecture.
"""

from __future__ import annotations
import json
import logging
import uuid
from typing import Any, Dict, List, Optional, Type
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse, ORJSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, get_optional_user
from app.core.graph_builder import GraphBuilder
from app.core.node_registry import node_registry
from app.services.dependencies import get_db_session, get_workflow_service_dep, get_execution_service_dep
from app.services.workflow_service import WorkflowService
from app.services.execution_service import ExecutionService
from app.nodes.base import BaseNode
from app.schemas.workflow import Workflow, WorkflowCreate, WorkflowUpdate, WorkflowExecution, WorkflowExecutionCreate

User = Dict[str, Any]

import os

# Core engine imports
from app.core.engine_v2 import get_engine
from app.core.node_registry import node_registry
from app.core.graph_builder import GraphBuilder

logger = logging.getLogger(__name__)
router = APIRouter()

# Check if database is disabled
DISABLE_DATABASE = os.getenv("DISABLE_DATABASE", "false").lower() == "true"

# Conditional imports based on database availability
if not DISABLE_DATABASE:
    try:
        from sqlalchemy.ext.asyncio import AsyncSession
        from app.services.dependencies import get_workflow_service_dep, get_execution_service_dep, get_db_session
        from app.services.workflow_service import WorkflowService
        from app.services.execution_service import ExecutionService
        from app.auth.middleware import get_optional_user
        from app.db.models import User, WorkflowCreate, WorkflowUpdate, ExecutionCreate
        DB_AVAILABLE = True
    except ImportError as e:
        logger.warning(f"Database imports failed: {e}")
        DB_AVAILABLE = False
        DISABLE_DATABASE = True
else:
    DB_AVAILABLE = False

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

# Database-enabled endpoints (only if database is available)
if DB_AVAILABLE and not DISABLE_DATABASE:

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
        current_user: Optional[User] = Depends(get_current_user),
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
            # Use the base service delete method
            success = await workflow_service.delete(
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

# Always-available endpoints (work with or without database)

@router.post(
    "/validate",
    summary="✅ Validate Workflow",
    description="Validate workflow schema and flow data structure."
)
async def validate_workflow_schema(
    payload: FlowValidationRequest,
    current_user: Optional[Any] = None
):
    """Validate workflow flow data schema."""
    try:
        # Basic validation without database dependency
        flow_data = payload.flow_data
        
        if not isinstance(flow_data, dict):
            return {
                "valid": False,
                "errors": ["Flow data must be a valid JSON object"],
                "message": "Flow data validation failed"
            }
        
        # Basic structure validation
        required_fields = ["nodes", "edges"]
        errors = []
        
        for field in required_fields:
            if field not in flow_data:
                errors.append(f"Flow data missing required field: {field}")
        
        # Validate nodes
        nodes = flow_data.get("nodes", [])
        if not isinstance(nodes, list):
            errors.append("Flow data 'nodes' must be a list")
        elif not nodes:
            errors.append("Workflow must have at least one node")
        else:
            # Validate each node
            for i, node in enumerate(nodes):
                if not isinstance(node, dict):
                    errors.append(f"Node {i} must be an object")
                elif "id" not in node:
                    errors.append(f"Node {i} missing required 'id' field")
                elif "type" not in node:
                    errors.append(f"Node {i} missing required 'type' field")
        
        # Validate edges
        edges = flow_data.get("edges", [])
        if not isinstance(edges, list):
            errors.append("Flow data 'edges' must be a list")
        else:
            # Validate each edge
            node_ids = {node.get("id") for node in nodes if isinstance(node, dict) and "id" in node}
            for i, edge in enumerate(edges):
                if not isinstance(edge, dict):
                    errors.append(f"Edge {i} must be an object")
                else:
                    for field in ["source", "target"]:
                        if field not in edge:
                            errors.append(f"Edge {i} missing required '{field}' field")
                        elif edge[field] not in node_ids:
                            errors.append(f"Edge {i} references unknown {field} node: {edge[field]}")
        
        is_valid = len(errors) == 0
        
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

@router.post(
    "/execute", 
    response_model=ExecutionResult,
    summary="⚡ Execute Workflow",
    description="Execute workflow directly with flow data."
)
async def execute_adhoc_workflow(
    req: AdhocExecuteRequest,
    current_user: Optional[Any] = None
):
    """Execute workflow ad-hoc without creating workflow record."""
    try:
        # Use either provided flow_data or fetch from workflow_id (if DB available)
        flow_data = req.flow_data
        
        if req.workflow_id and not flow_data:
            if DB_AVAILABLE and current_user:
                # TODO: Fetch workflow from database
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Database access required to execute by workflow_id"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="flow_data is required for ad-hoc execution when database is disabled"
                )
        
        if not flow_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="flow_data is required for execution"
            )
        
        # Execute using engine
        engine = get_engine()
        
        # Build the workflow graph
        user_context = {
            "user_id": getattr(current_user, 'id', None) if current_user else None,
            "workflow_id": req.workflow_id
        }
        engine.build(flow_data, user_context=user_context)
        
        # Execute the workflow
        inputs = {"input": req.input_text}
        if req.session_context:
            inputs.update(req.session_context)
        
        result = await engine.execute(
            inputs,
            stream=req.stream,
            user_context=user_context
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

# Database-enabled execution endpoints
if DB_AVAILABLE and not DISABLE_DATABASE:
    
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
            
            # Get workflow with access check
            workflow = await workflow_service.get_by_id(session, workflow_uuid)
            
            if not workflow:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Workflow not found"
                )
            
            # Check access (owner or public)
            if str(workflow.user_id) != str(user_uuid) and not workflow.is_public:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to workflow"
                )
            
            # For async execution
            if execution_data.async_execution:
                # Start Celery task if available
                try:
                    from app.tasks.workflow_tasks import execute_workflow_task
                    
                    celery_task = execute_workflow_task.delay(
                        workflow_id=workflow_id,
                        user_id=str(user_uuid),
                        inputs=execution_data.inputs,
                        task_record_id=""
                    )
                    
                    return ExecutionResult(
                        success=True,
                        workflow_id=workflow_id,
                        results={
                            "message": "Workflow execution started in background",
                            "celery_task_id": celery_task.id,
                            "status": "started"
                        }
                    )
                    
                except ImportError:
                    # Fall back to sync execution if Celery not available
                    logger.warning("Celery not available, falling back to sync execution")
            
            # Synchronous execution
            try:
                # Use unified engine for execution
                engine = get_engine()
                
                # Build the workflow graph
                user_context = {
                    "user_id": str(user_uuid),
                    "workflow_id": workflow_id
                }
                engine.build(workflow.flow_data, user_context=user_context)
                
                # Execute workflow
                result_raw = await engine.execute(
                    execution_data.inputs,
                    user_context=user_context
                )
                
                return ExecutionResult(
                    success=True,
                    workflow_id=workflow_id,
                    results=result_raw if isinstance(result_raw, dict) else {"output": result_raw}
                )
                
            except Exception as e:
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
            workflow = await workflow_service.get_by_id(session, workflow_uuid)
            
            if not workflow:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Workflow not found"
                )
            
            if str(workflow.user_id) != str(user_uuid) and not workflow.is_public:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to workflow executions"
                )
            
            # Get executions using the correct method signature
            executions = await execution_service.get_workflow_executions(
                session, workflow_uuid, user_uuid, skip=offset, limit=limit
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

class WorkflowRunRequest(BaseModel):
    input: Dict[str, Any] = Field(default_factory=dict)
    session_id: Optional[str] = None

@router.post(
    "/{workflow_id}/run",
    summary="▶️ Run Workflow and Stream Output",
    description="Executes a saved workflow and streams the output via SSE.",
    response_class=StreamingResponse,
)
async def run_workflow(
    workflow_id: str,
    run_request: WorkflowRunRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    workflow_service: WorkflowService = Depends(get_workflow_service_dep),
):
    """Run a workflow and get a streaming response."""
    try:
        # Use user['id'] which is the standard from Supabase auth
        workflow = await workflow_service.get_by_id(db, workflow_id, user["id"])
        if not workflow:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workflow with id {workflow_id} not found",
            )

        if not workflow.flow_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Workflow has no data to run.",
            )

        engine = GraphBuilder(node_registry=node_registry.nodes)
        engine.build_from_flow(workflow.flow_data, user_id=user["id"])

        session_id = run_request.session_id or str(uuid.uuid4())

        async def event_generator():
            try:
                stream_gen = await engine.execute(
                    inputs=run_request.input,
                    session_id=session_id,
                    user_id=user["id"],
                    workflow_id=workflow_id,
                    stream=True,
                )
                async for chunk in stream_gen:
                    yield f"data: {json.dumps(chunk)}\n\n"
            except Exception as e:
                logger.error(f"Streaming execution error for workflow {workflow_id}: {e}")
                error_data = {"event": "error", "data": str(e)}
                yield f"data: {json.dumps(error_data)}\n\n"

        return StreamingResponse(event_generator(), media_type="text/event-stream")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to run workflow {workflow_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {e}",
        )

# Stub endpoints for database-disabled mode
else:
    @router.get("/", summary="📋 List Workflows (stub)")
    async def list_workflows_stub():
        """Return empty workflow list when database is disabled."""
        return []

    @router.post("/", summary="📝 Create Workflow (stub)")
    async def create_workflow_stub():
        """Stub for workflow creation when database is disabled."""
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED, 
            detail="Database functionality disabled. Use /execute for ad-hoc workflow execution."
        )

# Session endpoints – deprecated
NOT_IMPLEMENTED_MSG = "Ephemeral SessionManager has been removed; use persistent conversation threads (coming soon)."

@router.post(
    "/sessions",
    summary="🔄 Create Session (deprecated)",
    description="Deprecated – returns 501."
)
async def create_session(*_):
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=NOT_IMPLEMENTED_MSG)

@router.get(
    "/sessions/{session_id}",
    summary="📋 Get Session (deprecated)",
    description="Deprecated – returns 501."
)
async def get_session(*_):
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=NOT_IMPLEMENTED_MSG)

@router.delete(
    "/sessions/{session_id}",
    summary="🗑️ Delete Session (deprecated)",
    description="Deprecated – returns 501."
)
async def delete_session(*_):
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=NOT_IMPLEMENTED_MSG)
