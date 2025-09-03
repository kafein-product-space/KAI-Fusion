"""
Minimal Integration Enhancement for execute_adhoc_workflow
=========================================================

This module provides a drop-in enhancement for the existing execute_adhoc_workflow
function with minimal code changes required.
"""

import logging
from typing import Any, Dict, Optional, Union, AsyncGenerator
from .dynamic_workflow_engine import DynamicWorkflowEngine, DynamicWorkflowContext

logger = logging.getLogger(__name__)

class WorkflowExecutionEnhancer:
    """
    Minimal enhancement wrapper for execute_adhoc_workflow
    
    Usage:
    1. Create instance: enhancer = WorkflowExecutionEnhancer()
    2. Replace engine.build() with: enhancer.enhanced_build()
    3. Replace engine.execute() with: enhancer.enhanced_execute()
    
    This provides full dynamic capabilities with minimal code changes.
    """
    
    def __init__(self):
        self.dynamic_engine = DynamicWorkflowEngine()
        self._current_context: Optional[DynamicWorkflowContext] = None
        self._compiled_graph = None
    
    def create_context_from_request(self, req: Any, current_user: Any = None, 
                                   is_webhook: bool = False) -> DynamicWorkflowContext:
        """Create dynamic context from request parameters"""
        
        # Generate session_id with fallback logic
        session_id = req.session_id or req.chatflow_id or f"session_{req.__hash__()}"
        if isinstance(session_id, int):
            session_id = str(session_id)
        
        # Handle user context
        user_id = None
        if not is_webhook and current_user:
            user_id = str(current_user.id)
        elif is_webhook:
            user_id = "webhook_system"
        
        context = self.dynamic_engine.create_dynamic_context(
            session_id=session_id,
            user_id=user_id,
            workflow_id=req.workflow_id,
            metadata={
                "chatflow_id": getattr(req, 'chatflow_id', None),
                "input_text": getattr(req, 'input_text', ''),
                "is_webhook": is_webhook,
                "request_timestamp": str(__import__('datetime').datetime.utcnow())
            }
        )
        
        self._current_context = context
        return context
    
    def enhanced_build(self, flow_data: Dict[str, Any], user_context: Dict[str, Any] = None):
        """Enhanced build with dynamic capabilities - drop-in replacement for engine.build()"""
        
        if not self._current_context:
            # Create context from user_context if available
            session_id = user_context.get('session_id') if user_context else f"build_{id(flow_data)}"
            self._current_context = self.dynamic_engine.create_dynamic_context(
                session_id=session_id,
                user_id=user_context.get('user_id') if user_context else None,
                workflow_id=user_context.get('workflow_id') if user_context else None
            )
        
        try:
            logger.info(f"🔄 Enhanced build starting (session: {self._current_context.session_id})")
            
            # Use dynamic engine to build workflow
            self._compiled_graph = self.dynamic_engine.build_dynamic_workflow(
                flow_data, self._current_context
            )
            
            logger.info(f"✅ Enhanced build completed successfully")
            
        except Exception as e:
            logger.error(f"❌ Enhanced build failed: {e}")
            # Fallback: Let the original engine handle it
            raise
    
    async def enhanced_execute(self, inputs: Dict[str, Any] = None, *, stream: bool = False, 
                             user_context: Dict[str, Any] = None) -> Union[Dict[str, Any], AsyncGenerator]:
        """Enhanced execute with dynamic capabilities - drop-in replacement for engine.execute()"""
        
        if not self._current_context or not self._compiled_graph:
            raise RuntimeError("Must call enhanced_build() before enhanced_execute()")
        
        try:
            logger.info(f"🚀 Enhanced execute starting (session: {self._current_context.session_id})")
            
            # Use dynamic engine to execute
            result = await self.dynamic_engine.execute_dynamic_workflow(
                inputs or {}, self._current_context, stream
            )
            
            logger.info(f"✅ Enhanced execute completed successfully")
            return result
            
        except Exception as e:
            logger.error(f"❌ Enhanced execute failed: {e}")
            raise
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get execution metrics"""
        if not self._current_context:
            return {"error": "No active context"}
        
        return self.dynamic_engine.get_runtime_metrics(self._current_context.session_id)
    
    def cleanup(self):
        """Cleanup resources"""
        if self._current_context:
            self.dynamic_engine.cleanup_session(self._current_context.session_id)
            self._current_context = None
        self._compiled_graph = None


# Global instance for easy use
_workflow_enhancer = WorkflowExecutionEnhancer()

def get_workflow_enhancer() -> WorkflowExecutionEnhancer:
    """Get the global workflow enhancer instance"""
    return _workflow_enhancer

def create_workflow_enhancer() -> WorkflowExecutionEnhancer:
    """Create a new workflow enhancer instance"""
    return WorkflowExecutionEnhancer()