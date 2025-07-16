"""Workflow Executions API endpoints"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter()

# Mock executions data
MOCK_EXECUTIONS = {
    "1": {
        "id": "1",
        "workflow_id": "workflow_1",
        "workflow_name": "Customer Support Agent",
        "status": "completed",
        "input_data": {"message": "Hello, I need help with my order"},
        "output_data": {"response": "I'd be happy to help you with your order. Could you please provide your order number?"},
        "execution_time": 2.5,
        "node_count": 5,
        "created_at": "2025-01-14T10:30:00Z",
        "completed_at": "2025-01-14T10:30:02Z",
        "error_message": None
    },
    "2": {
        "id": "2", 
        "workflow_id": "workflow_2",
        "workflow_name": "Document Summarizer",
        "status": "running",
        "input_data": {"text": "Long document content..."},
        "output_data": None,
        "execution_time": None,
        "node_count": 8,
        "created_at": "2025-01-14T11:00:00Z",
        "completed_at": None,
        "error_message": None
    },
    "3": {
        "id": "3",
        "workflow_id": "workflow_1", 
        "workflow_name": "Customer Support Agent",
        "status": "failed",
        "input_data": {"message": "Test message"},
        "output_data": None,
        "execution_time": 1.2,
        "node_count": 5,
        "created_at": "2025-01-14T09:15:00Z",
        "completed_at": "2025-01-14T09:15:01Z",
        "error_message": "OpenAI API rate limit exceeded"
    }
}

class ExecutionResponse(BaseModel):
    id: str
    workflow_id: str
    workflow_name: str
    status: str  # "running", "completed", "failed", "cancelled"
    input_data: Dict[str, Any]
    output_data: Optional[Dict[str, Any]]
    execution_time: Optional[float]
    node_count: int
    created_at: str
    completed_at: Optional[str]
    error_message: Optional[str]

class ExecutionSummary(BaseModel):
    total_executions: int
    successful_executions: int
    failed_executions: int
    running_executions: int
    average_execution_time: float

@router.get("/", response_model=List[ExecutionResponse])
async def get_executions(
    workflow_id: Optional[str] = Query(None, description="Filter by workflow ID"),
    status: Optional[str] = Query(None, description="Filter by execution status"),
    limit: int = Query(50, description="Maximum number of executions to return"),
    offset: int = Query(0, description="Number of executions to skip")
):
    """Get execution history with optional filtering"""
    executions = list(MOCK_EXECUTIONS.values())
    
    # Apply filters
    if workflow_id:
        executions = [e for e in executions if e["workflow_id"] == workflow_id]
    
    if status:
        executions = [e for e in executions if e["status"] == status]
    
    # Apply pagination
    executions = executions[offset:offset + limit]
    
    return [ExecutionResponse(**execution) for execution in executions]

@router.get("/summary", response_model=ExecutionSummary)
async def get_execution_summary():
    """Get execution statistics summary"""
    executions = list(MOCK_EXECUTIONS.values())
    
    total = len(executions)
    successful = len([e for e in executions if e["status"] == "completed"])
    failed = len([e for e in executions if e["status"] == "failed"]) 
    running = len([e for e in executions if e["status"] == "running"])
    
    # Calculate average execution time for completed executions
    completed_executions = [e for e in executions if e["status"] == "completed" and e["execution_time"]]
    avg_time = sum(e["execution_time"] for e in completed_executions) / len(completed_executions) if completed_executions else 0
    
    return ExecutionSummary(
        total_executions=total,
        successful_executions=successful,
        failed_executions=failed,
        running_executions=running,
        average_execution_time=round(avg_time, 2)
    )

@router.get("/{execution_id}", response_model=ExecutionResponse)
async def get_execution(execution_id: str):
    """Get details of a specific execution"""
    execution = MOCK_EXECUTIONS.get(execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    return ExecutionResponse(**execution)

@router.delete("/{execution_id}")
async def delete_execution(execution_id: str):
    """Delete an execution record"""
    if execution_id not in MOCK_EXECUTIONS:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    del MOCK_EXECUTIONS[execution_id]
    return {"message": "Execution deleted successfully"}

@router.post("/{execution_id}/cancel")
async def cancel_execution(execution_id: str):
    """Cancel a running execution"""
    execution = MOCK_EXECUTIONS.get(execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    if execution["status"] != "running":
        raise HTTPException(status_code=400, detail="Execution is not running")
    
    execution["status"] = "cancelled"
    execution["completed_at"] = datetime.utcnow().isoformat() + "Z"
    
    return {"message": "Execution cancelled successfully"}

@router.get("/{execution_id}/logs")
async def get_execution_logs(execution_id: str):
    """Get detailed logs for an execution"""
    execution = MOCK_EXECUTIONS.get(execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    # Mock logs data
    logs = [
        {
            "timestamp": "2025-01-14T10:30:00.100Z",
            "level": "INFO", 
            "node_id": "start_node",
            "message": "Workflow execution started"
        },
        {
            "timestamp": "2025-01-14T10:30:00.500Z",
            "level": "INFO",
            "node_id": "llm_node", 
            "message": "Processing user input with OpenAI GPT-4"
        },
        {
            "timestamp": "2025-01-14T10:30:02.000Z",
            "level": "INFO",
            "node_id": "end_node",
            "message": "Workflow execution completed successfully"
        }
    ]
    
    return {"execution_id": execution_id, "logs": logs}