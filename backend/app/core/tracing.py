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
from app.core.config import get_settings

logger = logging.getLogger(__name__)


class WorkflowTracer:
    """Enhanced tracer for KAI Fusion workflows with LangSmith integration."""
    
    def __init__(self, session_id: Optional[str] = None, user_id: Optional[str] = None):
        self.settings = get_settings()
        self.session_id = session_id
        self.user_id = user_id
        self.workflow_start_time: Optional[float] = None
        self.node_timings: Dict[str, float] = {}
        self.memory_operations: List[Dict[str, Any]] = []
        
    def start_workflow(self, workflow_id: Optional[str] = None, flow_data: Optional[Dict[str, Any]] = None):
        """Start tracking a workflow execution."""
        self.workflow_start_time = time.time()
        
        if self.settings.LANGCHAIN_TRACING_V2:
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
        
        if self.settings.TRACE_AGENT_REASONING and node_type == "ReactAgent":
            logger.info(f"🤖 Agent reasoning started: {node_id}")
            logger.info(f"📝 Agent inputs: {list(inputs.keys())}")
    
    def end_node_execution(self, node_id: str, node_type: str, outputs: Dict[str, Any]):
        """End tracking a node execution."""
        if node_id in self.node_timings:
            duration = time.time() - self.node_timings[node_id]
            
            if self.settings.TRACE_AGENT_REASONING and node_type == "ReactAgent":
                logger.info(f"🤖 Agent reasoning completed: {node_id} ({duration:.2f}s)")
                logger.info(f"📤 Agent outputs: {list(outputs.keys())}")
            
            logger.info(f"⏱️ Node {node_id} executed in {duration:.2f}s")
    
    def track_memory_operation(self, operation: str, node_id: str, content: str, session_id: str):
        """Track memory operations for debugging."""
        if self.settings.TRACE_MEMORY_OPERATIONS:
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
                for op in self.memory_operations[-5:]:  # Show last 5 operations
                    logger.info(f"  {op['operation']}: {op['node_id']} ({op['content_length']} chars)")
    
    def get_callback_manager(self) -> Optional[CallbackManager]:
        """Get callback manager for LangSmith integration."""
        if self.settings.LANGCHAIN_TRACING_V2 and self.settings.LANGCHAIN_API_KEY:
            tracer = LangChainTracer(
                project_name=self.settings.LANGCHAIN_PROJECT,
                session_id=self.session_id
            )
            return CallbackManager([tracer])
        return None


def trace_workflow(func):
    """Decorator to trace workflow execution."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        settings = get_settings()
        if not settings.ENABLE_WORKFLOW_TRACING:
            return func(*args, **kwargs)
        
        # Extract session and user info from kwargs
        session_id = kwargs.get('session_id')
        user_id = kwargs.get('user_id')
        workflow_id = kwargs.get('workflow_id')
        
        tracer = WorkflowTracer(session_id=session_id, user_id=user_id)
        
        try:
            # Start workflow tracing
            flow_data = kwargs.get('flow_data')
            tracer.start_workflow(workflow_id=workflow_id, flow_data=flow_data)
            
            # Execute function
            result = func(*args, **kwargs)
            
            # End workflow tracing
            tracer.end_workflow(success=True)
            
            return result
            
        except Exception as e:
            tracer.end_workflow(success=False, error=str(e))
            raise
    
    return wrapper


def trace_node_execution(func):
    """Decorator to trace individual node execution."""
    @wraps(func)
    def wrapper(self, *args, **kwargs):
        settings = get_settings()
        if not settings.ENABLE_WORKFLOW_TRACING:
            return func(self, *args, **kwargs)
        
        node_id = getattr(self, 'node_id', 'unknown')
        node_type = getattr(self, 'metadata', {}).get('name', 'unknown')
        
        tracer = WorkflowTracer()
        
        try:
            # Start node tracing
            inputs = kwargs.get('inputs', {})
            tracer.start_node_execution(node_id, node_type, inputs)
            
            # Execute function
            result = func(self, *args, **kwargs)
            
            # End node tracing
            outputs = {'output': result} if result else {}
            tracer.end_node_execution(node_id, node_type, outputs)
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Node {node_id} failed: {str(e)}")
            raise
    
    return wrapper


def trace_memory_operation(operation: str):
    """Decorator to trace memory operations."""
    def decorator(func):
        @wraps(func)
        def wrapper(self, *args, **kwargs):
            settings = get_settings()
            if not settings.TRACE_MEMORY_OPERATIONS:
                return func(self, *args, **kwargs)
            
            node_id = getattr(self, 'node_id', 'unknown')
            session_id = getattr(self, 'session_id', 'unknown')
            
            tracer = WorkflowTracer()
            
            try:
                # Execute function
                result = func(self, *args, **kwargs)
                
                # Track memory operation
                content = str(result) if result else ""
                tracer.track_memory_operation(operation, node_id, content, session_id)
                
                return result
                
            except Exception as e:
                logger.error(f"❌ Memory operation {operation} failed: {str(e)}")
                raise
        
        return wrapper
    return decorator


def get_workflow_tracer(session_id: Optional[str] = None, user_id: Optional[str] = None) -> WorkflowTracer:
    """Get a workflow tracer instance."""
    return WorkflowTracer(session_id=session_id, user_id=user_id)


def setup_tracing():
    """Initialize tracing configuration."""
    settings = get_settings()
    
    if settings.LANGCHAIN_TRACING_V2:
        from app.core.config import setup_langsmith
        setup_langsmith(settings)
        logger.info("🔍 Workflow tracing initialized")
    else:
        logger.info("ℹ️ Workflow tracing disabled")