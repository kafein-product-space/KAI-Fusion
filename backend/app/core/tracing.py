"""
LangSmith tracing utilities for KAI Fusion workflows.

This module provides enhanced tracing capabilities for workflow execution,
memory operations, and agent reasoning.
"""

import logging
import time
from typing import Dict, Any, Optional, List
from functools import wraps
from langchain_core.tracers import LangChainTracer
from langchain_core.callbacks import CallbackManager
from app.core.constants import LANGCHAIN_TRACING_V2, TRACE_AGENT_REASONING, TRACE_MEMORY_OPERATIONS, LANGCHAIN_ENDPOINT, LANGCHAIN_API_KEY, LANGCHAIN_PROJECT

logger = logging.getLogger(__name__)


class WorkflowTracer:
    """Enhanced tracer for KAI Fusion workflows with LangSmith integration."""
    
    def __init__(self, session_id: Optional[str] = None, user_id: Optional[str] = None):
        self.session_id = session_id
        self.user_id = user_id
        self.workflow_start_time: Optional[float] = None
        self.node_timings: Dict[str, float] = {}
        self.memory_operations: List[Dict[str, Any]] = []
        
    def start_workflow(self, workflow_id: Optional[str] = None, flow_data: Optional[Dict[str, Any]] = None):
        """Start tracking a workflow execution."""
        self.workflow_start_time = time.time()
        
        if LANGCHAIN_TRACING_V2:
            metadata = {
                "workflow_id": workflow_id,
                "session_id": self.session_id,
                "user_id": self.user_id,
                "node_count": len(flow_data.get("nodes", [])) if flow_data else 0,
                "edge_count": len(flow_data.get("edges", [])) if flow_data else 0,
                "platform": "kai-fusion",
                "version": "2.0.0"
            }
            
            logger.info(f"🔍 Starting workflow trace: {workflow_id}")
            logger.info(f"📊 Metadata: {metadata}")
            
    def start_node_execution(self, node_id: str, node_type: str, inputs: Dict[str, Any]):
        """Start tracking a node execution."""
        self.node_timings[node_id] = time.time()
        
        if TRACE_AGENT_REASONING and node_type == "ReactAgent":
            logger.info(f"🤖 Agent reasoning started: {node_id}")
            logger.info(f"📝 Agent inputs: {list(inputs.keys())}")
    
    def end_node_execution(self, node_id: str, node_type: str, outputs: Dict[str, Any]):
        """End tracking a node execution."""
        if node_id in self.node_timings:
            duration = time.time() - self.node_timings[node_id]
            
            if TRACE_AGENT_REASONING and node_type == "ReactAgent":
                logger.info(f"🤖 Agent reasoning completed: {node_id} ({duration:.2f}s)")
                logger.info(f"📤 Agent outputs: {list(outputs.keys())}")
            
            logger.info(f"⏱️ Node {node_id} executed in {duration:.2f}s")
    
    def track_memory_operation(self, operation: str, node_id: str, content: str, session_id: str):
        """Track memory operations for debugging."""
        if TRACE_MEMORY_OPERATIONS:
            memory_op = {
                "timestamp": time.time(),
                "operation": operation,
                "node_id": node_id,
                "content_length": len(content),
                "session_id": session_id
            }
            self.memory_operations.append(memory_op)
            
            logger.info(f"🧠 Memory {operation}: {node_id} ({len(content)} chars)")
    
    def end_workflow(self, success: bool, error: Optional[str] = None):
        """End workflow tracking and log summary."""
        if self.workflow_start_time:
            total_duration = time.time() - self.workflow_start_time
            
            logger.info(f"🏁 Workflow completed in {total_duration:.2f}s")
            logger.info(f"📊 Status: {'✅ Success' if success else '❌ Failed'}")
            
            if error:
                logger.error(f"❌ Error: {error}")
            
            # Log performance summary
            if self.node_timings:
                logger.info(f"⏱️ Node execution summary:")
                for node_id, start_time in self.node_timings.items():
                    duration = time.time() - start_time
                    logger.info(f"  {node_id}: {duration:.2f}s")
            
            # Log memory operations summary
            if self.memory_operations:
                logger.info(f"🧠 Memory operations: {len(self.memory_operations)}")
    
    def get_callback_manager(self) -> Optional[CallbackManager]:
        """Get LangChain callback manager with tracing if enabled."""
        if LANGCHAIN_TRACING_V2 and LANGCHAIN_API_KEY:
            try:
                tracer = LangChainTracer(
                    project_name=LANGCHAIN_PROJECT or "kai-fusion",
                    session_name=self.session_id,
                )
                return CallbackManager([tracer])
            except Exception as e:
                logger.error(f"Failed to create LangChain tracer: {e}")
        return None


def trace_workflow(func):
    """Decorator to trace workflow execution."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        workflow_id = kwargs.get("workflow_id")
        flow_data = kwargs.get("flow_data")
        session_id = kwargs.get("session_id")
        user_id = kwargs.get("user_id")
        
        tracer = get_workflow_tracer(session_id, user_id)
        tracer.start_workflow(workflow_id, flow_data)
        
        try:
            result = func(*args, **kwargs)
            tracer.end_workflow(success=True)
            return result
        except Exception as e:
            tracer.end_workflow(success=False, error=str(e))
            raise
    
    return wrapper


def trace_node_execution(func):
    """Decorator to trace node execution."""
    @wraps(func)
    def wrapper(self, *args, **kwargs):
        node_id = getattr(self, "id", None) or getattr(self, "node_id", None)
        node_type = self.__class__.__name__
        inputs = kwargs.get("inputs", {})
        
        # Get session_id from inputs or user_context
        user_context = kwargs.get("user_context", {})
        session_id = user_context.get("session_id", "unknown")
        user_id = user_context.get("user_id", "unknown")
        
        tracer = get_workflow_tracer(session_id, user_id)
        tracer.start_node_execution(node_id, node_type, inputs)
        
        try:
            result = func(self, *args, **kwargs)
            tracer.end_node_execution(node_id, node_type, result if isinstance(result, dict) else {"result": result})
            return result
        except Exception as e:
            tracer.end_node_execution(node_id, node_type, {"error": str(e)})
            raise
    
    return wrapper


def trace_memory_operation(operation: str):
    """Decorator to trace memory operations."""
    def decorator(func):
        @wraps(func)
        def wrapper(self, *args, **kwargs):
            if not TRACE_MEMORY_OPERATIONS:
                return func(self, *args, **kwargs)
            
            node_id = getattr(self, "id", None) or getattr(self, "node_id", None) or "unknown"
            session_id = kwargs.get("session_id", "unknown")
            content = args[0] if args else kwargs.get("content", "")
            
            tracer = get_workflow_tracer(session_id)
            tracer.track_memory_operation(operation, node_id, content, session_id)
            
            return func(self, *args, **kwargs)
        return wrapper
    return decorator


def get_workflow_tracer(session_id: Optional[str] = None, user_id: Optional[str] = None) -> WorkflowTracer:
    """Get a workflow tracer instance."""
    return WorkflowTracer(session_id=session_id, user_id=user_id)


def setup_tracing():
    """Initialize tracing system."""
    if LANGCHAIN_TRACING_V2:
        import os
        os.environ["LANGCHAIN_TRACING_V2"] = "true"
        
        if LANGCHAIN_ENDPOINT:
            os.environ["LANGCHAIN_ENDPOINT"] = LANGCHAIN_ENDPOINT
        
        if LANGCHAIN_API_KEY:
            os.environ["LANGCHAIN_API_KEY"] = LANGCHAIN_API_KEY
        
        if LANGCHAIN_PROJECT:
            os.environ["LANGCHAIN_PROJECT"] = LANGCHAIN_PROJECT
        
        logger.info("✅ LangSmith tracing enabled")
    else:
        logger.info("ℹ️ LangSmith tracing disabled")