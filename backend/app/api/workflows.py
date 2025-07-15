
import json
import logging
import uuid
from typing import Any, Dict, Optional, AsyncGenerator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.engine_v2 import get_engine

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/")
async def get_workflows():
    """
    Get list of workflows.
    For development, return mock workflows.
    """
    return [
        {
            "id": "workflow_1",
            "name": "Simple Chat Bot",
            "description": "Basic OpenAI chat workflow",
            "node_count": 3,
            "created_at": "2025-01-14T10:00:00Z",
            "last_modified": "2025-01-14T10:30:00Z",
            "status": "active"
        },
        {
            "id": "workflow_2", 
            "name": "Document Q&A",
            "description": "RAG workflow with PDF processing",
            "node_count": 8,
            "created_at": "2025-01-13T15:00:00Z",
            "last_modified": "2025-01-14T09:00:00Z",
            "status": "active"
        }
    ]

@router.post("/")
async def create_workflow(workflow_data: Dict[str, Any]):
    """Create a new workflow"""
    workflow_id = f"workflow_{uuid.uuid4().hex[:8]}"
    
    return {
        "id": workflow_id,
        "name": workflow_data.get("name", "Untitled Workflow"),
        "description": workflow_data.get("description", ""),
        "flow_data": workflow_data.get("flow_data", {"nodes": [], "edges": []}),
        "created_at": "2025-01-14T12:00:00Z",
        "status": "draft"
    }

@router.get("/{workflow_id}")
async def get_workflow(workflow_id: str):
    """Get specific workflow with full flow data"""
    # Mock workflow data
    mock_workflows = {
        "workflow_1": {
            "id": "workflow_1",
            "name": "Simple Chat Bot",
            "description": "Basic OpenAI chat workflow",
            "flow_data": {
                "nodes": [
                    {
                        "id": "start-1",
                        "type": "StartNode",
                        "position": {"x": 100, "y": 100},
                        "data": {"label": "Start"}
                    },
                    {
                        "id": "openai-1", 
                        "type": "OpenAIChat",
                        "position": {"x": 300, "y": 100},
                        "data": {
                            "model": "gpt-3.5-turbo",
                            "temperature": 0.7,
                            "max_tokens": 150
                        }
                    },
                    {
                        "id": "end-1",
                        "type": "EndNode", 
                        "position": {"x": 500, "y": 100},
                        "data": {"label": "End"}
                    }
                ],
                "edges": [
                    {
                        "id": "e1-2",
                        "source": "start-1",
                        "target": "openai-1"
                    },
                    {
                        "id": "e2-3", 
                        "source": "openai-1",
                        "target": "end-1"
                    }
                ]
            },
            "created_at": "2025-01-14T10:00:00Z",
            "last_modified": "2025-01-14T10:30:00Z",
            "status": "active"
        }
    }
    
    workflow = mock_workflows.get(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    return workflow

@router.put("/{workflow_id}")
async def update_workflow(workflow_id: str, workflow_data: Dict[str, Any]):
    """Update an existing workflow"""
    return {
        "id": workflow_id,
        "name": workflow_data.get("name", "Updated Workflow"),
        "description": workflow_data.get("description", ""),
        "flow_data": workflow_data.get("flow_data", {"nodes": [], "edges": []}),
        "last_modified": "2025-01-14T12:00:00Z",
        "status": "active"
    }

@router.delete("/{workflow_id}")
async def delete_workflow(workflow_id: str):
    """Delete a workflow"""
    return {"message": f"Workflow {workflow_id} deleted successfully"}

@router.post("/validate")
async def validate_workflow(request_data: Dict[str, Any]):
    """Validate workflow structure without executing"""
    engine = get_engine()
    
    # Extract flow_data from request
    flow_data = request_data.get("flow_data", request_data)
    
    try:
        validation_result = engine.validate(flow_data)
        return {
            "valid": validation_result["valid"],
            "errors": validation_result["errors"],
            "warnings": validation_result["warnings"],
            "node_count": len(flow_data.get("nodes", [])),
            "edge_count": len(flow_data.get("edges", []))
        }
    except Exception as e:
        logger.error(f"Validation error: {e}")
        return {
            "valid": False,
            "errors": [str(e)],
            "warnings": [],
            "node_count": 0,
            "edge_count": 0
        }


class AdhocExecuteRequest(BaseModel):
    flow_data: Dict[str, Any]
    input_text: str = "Hello"
    session_id: Optional[str] = None


@router.post("/execute")
async def execute_adhoc_workflow(req: AdhocExecuteRequest):
    """
    Execute a workflow directly from flow data and stream the output.
    This is the primary endpoint for running workflows from the frontend.
    """
    engine = get_engine()
    session_id = req.session_id or str(uuid.uuid4())
    user_context = {"session_id": session_id}

    try:
        engine.build(flow_data=req.flow_data, user_context=user_context)
        result_stream = await engine.execute(
            inputs={"input": req.input_text},
            stream=True,
            user_context=user_context,
        )
    except Exception as e:
        logger.error(f"Error during graph build or execution: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Failed to run workflow: {e}")

    def _make_chunk_serializable(obj):
        """Convert any object to a JSON-serializable format."""
        from datetime import datetime, date
        import uuid
        
        if obj is None or isinstance(obj, (bool, int, float, str)):
            return obj
        elif isinstance(obj, (datetime, date)):
            return obj.isoformat()
        elif isinstance(obj, uuid.UUID):
            return str(obj)
        elif isinstance(obj, (list, tuple)):
            return [_make_chunk_serializable(item) for item in obj]
        elif isinstance(obj, dict):
            return {k: _make_chunk_serializable(v) for k, v in obj.items()}
        elif hasattr(obj, 'model_dump'):
            try:
                return obj.model_dump()
            except Exception:
                return str(obj)
        else:
            return str(obj)
    
    async def event_generator():
        try:
            if not isinstance(result_stream, AsyncGenerator):
                raise TypeError("Expected an async generator from the engine for streaming.")

            async for chunk in result_stream:
                # Make chunk serializable before JSON conversion
                try:
                    # Use the same serialization method as the graph builder
                    serialized_chunk = _make_chunk_serializable(chunk)
                    yield f"data: {json.dumps(serialized_chunk)}\n\n"
                except (TypeError, ValueError) as e:
                    # Handle non-serializable objects
                    logger.warning(f"Non-serializable chunk: {e}")
                    safe_chunk = {"type": "error", "error": f"Serialization error: {str(e)}", "original_type": type(chunk).__name__}
                    yield f"data: {json.dumps(safe_chunk)}\n\n"
        except Exception as e:
            logger.error(f"Streaming execution error: {e}", exc_info=True)
            error_data = {"event": "error", "data": str(e)}
            yield f"data: {json.dumps(error_data)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


