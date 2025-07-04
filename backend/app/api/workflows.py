from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import List, Optional, cast, Dict, Any
from app.models.workflow import (
    WorkflowCreate,
    WorkflowUpdate,
    WorkflowExecute,
    WorkflowResponse,
    ExecutionResult,
)
from app.auth.dependencies import get_current_user, get_optional_user
from app.database import get_database
from app.core.workflow_engine import workflow_engine
from app.core.workflow_runner import WorkflowRunner
import json
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
from app.core.session_manager import session_manager  # type: ignore

router = APIRouter()


@router.post("/", response_model=WorkflowResponse)
async def create_workflow(
    workflow: WorkflowCreate, current_user: dict = Depends(get_current_user)
):
    """Create a new workflow"""
    result = await get_database().create_workflow(current_user["id"], workflow.dict())
    result["flow_data"] = json.loads(result["flow_data"])
    return result


@router.get("/", response_model=List[WorkflowResponse])
async def list_workflows(current_user: dict | None = Depends(get_optional_user)):
    """List workflows.

    This endpoint **requires** authentication. If the caller is not authenticated we
    return a 401 status so that the frontend knows to prompt for login (matching
    expectations of the test-suite).
    """

    if not current_user:
        # Explicitly reject unauthenticated access
        raise HTTPException(status_code=401, detail="Authentication required")

    db = get_database()
    workflows = await db.get_workflows(current_user["id"])

    for wf in workflows:
        wf["flow_data"] = json.loads(wf["flow_data"])

    return workflows


@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: str, current_user: dict | None = Depends(get_optional_user)
):
    """Get workflow details.

    • Authenticated users can access their own workflows.
    • Anyone (auth or not) can access public workflows.
    """

    db = get_database()

    workflow = await db.get_workflow(
        workflow_id,
        current_user["id"] if current_user else None,
    )

    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Non-owners cannot access private workflows
    if not workflow["is_public"] and (
        not current_user or workflow["user_id"] != current_user["id"]
    ):
        raise HTTPException(status_code=403, detail="Forbidden")

    workflow["flow_data"] = json.loads(workflow["flow_data"])
    return workflow


@router.put("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: str,
    workflow: WorkflowUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update workflow"""
    result = await get_database().update_workflow(
        workflow_id, current_user["id"], workflow.dict(exclude_unset=True)
    )
    if not result:
        raise HTTPException(status_code=404, detail="Workflow not found")
    result["flow_data"] = json.loads(result["flow_data"])
    return result


@router.delete("/{workflow_id}")
async def delete_workflow(
    workflow_id: str, current_user: dict = Depends(get_current_user)
):
    """Delete workflow"""
    await get_database().delete_workflow(workflow_id, current_user["id"])
    return {"success": True, "message": "Workflow deleted successfully"}


@router.post("/{workflow_id}/execute", response_model=ExecutionResult)
async def execute_workflow(
    workflow_id: str,
    data: WorkflowExecute,
    current_user: dict = Depends(get_current_user),
):
    """Execute workflow"""
    # For async execution using Celery
    if data.async_execution:
        from app.tasks.workflow_tasks import execute_workflow_task
        from app.database import get_database
        from app.models.task import TaskType

        db = get_database()

        try:
            # Start Celery task
            celery_task = execute_workflow_task.delay(
                workflow_id=workflow_id,
                user_id=current_user["id"],
                inputs=data.inputs,
                task_record_id="",
            )

            # Create database record
            task_data = {
                "inputs": data.inputs,
                "priority": 5,
                "workflow_id": workflow_id,
            }

            task_record = await db.create_task(
                user_id=current_user["id"],
                celery_task_id=celery_task.id,
                task_type=TaskType.WORKFLOW_EXECUTION.value,
                data=task_data,
            )

            return ExecutionResult(
                success=True,
                workflow_id=workflow_id,
                results={
                    "message": "Workflow execution started in background",
                    "task_id": task_record["id"],
                    "celery_task_id": celery_task.id,
                    "status_url": f"/api/v1/tasks/{task_record['id']}",
                },
            )
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Failed to start async execution: {e}"
            )

    # Sync execution (unchanged)
    try:
        result_raw = await workflow_engine.execute_workflow(
            workflow_id=workflow_id,
            user_id=current_user["id"],
            inputs=data.inputs,
            stream=False,
        )

        result_dict = cast(Dict[str, Any], result_raw)

        # Construct pydantic model explicitly for static typing
        return ExecutionResult(
            success=result_dict.get("success", True),
            workflow_id=result_dict.get("workflow_id", workflow_id),
            execution_id=result_dict.get("execution_id"),
            results=result_dict.get("results", {}),
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{workflow_id}/executions")
async def list_executions(
    workflow_id: str,
    limit: int = 10,
    offset: int = 0,
    current_user: dict = Depends(get_current_user),
):
    """List workflow executions"""
    # TODO: Implement pagination and filtering
    executions = await get_database().get_workflow_executions(
        workflow_id, current_user["id"], limit, offset
    )
    return executions


# ----------------------------
# Validation endpoint (no auth)
# ----------------------------


class FlowValidationRequest(BaseModel):
    flow_data: dict


@router.post("/validate")
async def validate_workflow_schema(payload: FlowValidationRequest):
    """Lightweight validation of workflow `flow_data` sent from the frontend.

    Currently performs a very simple check – ensures the JSON contains
    `nodes` (list) and `edges` (list) keys.  Returns `{valid: bool,
    errors: list[str]}` shape expected by the frontend.
    """

    data = payload.flow_data or {}
    errors: list[str] = []

    if not isinstance(data, dict):
        errors.append("flow_data should be an object")
    else:
        if "nodes" not in data or not isinstance(data["nodes"], list):
            errors.append("Missing or invalid 'nodes' array")
        if "edges" not in data or not isinstance(data["edges"], list):
            errors.append("Missing or invalid 'edges' array")

    return {"valid": len(errors) == 0, "errors": errors or None}


class AdhocExecuteRequest(BaseModel):
    workflow_id: Optional[str] = None
    flow_data: Optional[dict] = None
    input_text: str = "Hello"
    session_context: Optional[dict] = None
    stream: bool = False

@router.post("/execute", response_model=ExecutionResult)
async def execute_adhoc_workflow(
    req: AdhocExecuteRequest,
    current_user: Optional[dict] = Depends(get_optional_user)
):
    """Execute a workflow.

    * Eğer `workflow_id` verilirse kayıtlı workflow çalıştırılır (public veya sahibi).
    * Eğer `flow_data` verilirse ad-hoc (henüz kaydedilmemiş) workflow çalıştırılır.
    """

    # Workflow by ID ---------------------------------------------
    if req.workflow_id:
        db = get_database()
        workflow = await db.get_workflow(
            req.workflow_id,
            current_user["id"] if current_user else None,
        )
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")
        if not workflow["is_public"] and (
            not current_user or workflow["user_id"] != current_user["id"]
        ):
            raise HTTPException(status_code=403, detail="Forbidden")
        flow_data = json.loads(workflow["flow_data"])
    # Ad-hoc flow data -------------------------------------------
    elif req.flow_data:
        flow_data = req.flow_data
    else:
        raise HTTPException(status_code=400, detail="workflow_id veya flow_data zorunlu")

    # Choose runner (sync for now)
    runner = WorkflowRunner()  # Uses node registry internally

    if req.stream:
        # Streaming not yet supported for this endpoint
        raise HTTPException(status_code=400, detail="Streaming not supported at this endpoint")

    result = await runner.execute_workflow(
        workflow_data=flow_data,
        input_text=req.input_text,
        session_context=req.session_context,
    )

    return ExecutionResult(
        success=result.get("status") == "completed",
        workflow_id=req.workflow_id or "ad-hoc",
        results=result,
    )

# ----------------------------
# Streaming execute endpoint
# ----------------------------

@router.post("/{workflow_id}/execute/stream")
async def execute_workflow_stream(
    workflow_id: str,
    data: WorkflowExecute,
    current_user: dict = Depends(get_current_user),
):
    """Execute workflow and stream events as Server-Sent Events (SSE)."""

    async def event_generator():
        gen = await workflow_engine.execute_workflow(
            workflow_id=workflow_id,
            user_id=current_user["id"],
            inputs=data.inputs,
            save_execution=True,
            stream=True,
        )

        async for evt in gen:  # type: ignore[async-iterable]
            yield f"data: {json.dumps(evt)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

# ----------------------------
# Connection suggestions
# ----------------------------

class ConnectionSuggestionRequest(BaseModel):
    nodes: List[dict]
    existing_edges: Optional[List[dict]] = []

@router.post("/connections/suggest")
async def suggest_connections(
    request: ConnectionSuggestionRequest,
    current_user: Optional[dict] = Depends(get_optional_user),
):
    from app.core.auto_connector import AutoConnector
    from app.core.node_registry import node_registry

    connector = AutoConnector(node_registry.nodes)
    suggestions = connector.suggest_connections(request.nodes, request.existing_edges)

    return {
        "suggestions": [
            {
                "source_id": s.source_id,
                "source_handle": s.source_handle,
                "target_id": s.target_id,
                "target_handle": s.target_handle,
                "confidence": s.confidence,
                "reason": s.reason,
            }
            for s in suggestions[:20]
        ]
    }

# ----------------------------
# Session management endpoints
# ----------------------------

class SessionCreateRequest(BaseModel):
    workflow_id: Optional[str] = None

@router.post("/sessions")
async def create_session(request: SessionCreateRequest, current_user: dict = Depends(get_current_user)):
    session_id = await session_manager.create_session(
        workflow_id=request.workflow_id or "default", user_id=current_user["id"]
    )
    return {"session_id": session_id, "created": True}

@router.get("/sessions/{session_id}")
async def get_session(session_id: str, current_user: dict = Depends(get_current_user)):
    session = await session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    return session.to_dict()

@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, current_user: dict = Depends(get_current_user)):
    s = await session_manager.get_session(session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    if s.user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    deleted = await session_manager.delete_session(session_id)
    return {"deleted": deleted}

@router.get("/sessions")
async def get_session_stats(current_user: dict = Depends(get_current_user)):
    stats = session_manager.get_stats()
    return {
        "total_sessions": stats.get("sessions_by_user", {}).get(current_user["id"], 0),
        "ttl_minutes": stats.get("ttl_minutes"),
        "active": True,
    }
