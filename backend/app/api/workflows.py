
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

    async def event_generator():
        try:
            if not isinstance(result_stream, AsyncGenerator):
                raise TypeError("Expected an async generator from the engine for streaming.")

            async for chunk in result_stream:
                yield f"data: {json.dumps(chunk)}\\n\\n"
        except Exception as e:
            logger.error(f"Streaming execution error: {e}", exc_info=True)
            error_data = {"event": "error", "data": str(e)}
            yield f"data: {json.dumps(error_data)}\\n\\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")