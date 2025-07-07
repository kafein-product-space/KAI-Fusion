from typing import Dict, Any, List, Optional, AsyncGenerator
import asyncio
from langchain_core.runnables import Runnable
from langchain.callbacks.manager import CallbackManager
from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler
from langchain.callbacks.base import AsyncCallbackHandler

# Migration shim: re-implement WorkflowRunner on top of unified engine
from app.core.engine_v2 import get_engine

class StreamingCallbackHandler(AsyncCallbackHandler):
    """Custom callback for streaming responses"""
    def __init__(self, queue: asyncio.Queue):
        self.queue = queue
        
    async def on_llm_new_token(self, token: str, **kwargs):
        await self.queue.put({
            "type": "token",
            "content": token
        })
    
    async def on_chain_start(self, serialized: Dict[str, Any], inputs: Dict[str, Any], **kwargs):
        await self.queue.put({
            "type": "chain_start",
            "name": serialized.get("name", "Chain")
        })
    
    async def on_chain_end(self, outputs: Dict[str, Any], **kwargs):
        await self.queue.put({
            "type": "chain_end",
            "outputs": outputs
        })

class WorkflowRunner:
    """
    Executes workflows built by DynamicChainBuilder
    """
    
    def __init__(self, registry: Optional[Dict[str, Any]] = None):  # noqa: D401 – legacy signature
        # Keep the parameter for backward-compat; ignored in new engine.
        self._engine = get_engine()
        # Keep reference to registry solely for legacy validation helpers
        self.registry = registry or {}
    
    async def execute_workflow(
        self, 
        workflow_data: Dict[str, Any], 
        input_text: str,
        session_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Execute a workflow with given input"""
        try:
            # Build + execute via unified engine
            self._engine.build(workflow_data)

            chain_input = self._prepare_chain_input(input_text, session_context)

            exec_result = await self._engine.execute(chain_input if isinstance(chain_input, dict) else {"input": chain_input})

            # Ensure we have a mapping for legacy output structure
            if isinstance(exec_result, dict):
                legacy_result = exec_result
            else:
                # Should not occur in non-streaming path; fallback
                legacy_result = {"result": "Streaming result returned in non-streaming path"}

            return {
                "result": (
                    legacy_result.get("echo")
                    or legacy_result.get("result")
                    or legacy_result.get("last_output")
                    or str(legacy_result)
                ),
                "execution_order": [],
                "status": "completed" if legacy_result else "failed",
                "node_count": len(workflow_data.get("nodes", [])),
            }
            
        except Exception as e:
            import traceback
            print(f"❌ Workflow execution failed: {str(e)}")
            print(traceback.format_exc())
            
            return {
                "result": None,
                "error": str(e),
                "error_type": type(e).__name__,
                "status": "failed",
                "execution_order": []
            }
    
    async def execute_workflow_stream(
        self,
        workflow_data: Dict[str, Any],
        input_text: str,
        session_context: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Execute workflow with streaming output"""
        try:
            # Build + execute via unified engine (streaming)
            yield {"type": "status", "message": "Building workflow..."}
            self._engine.build(workflow_data)

            chain_input = self._prepare_chain_input(input_text, session_context)

            yield {"type": "status", "message": "Executing (stream)..."}

            result_gen_any = await self._engine.execute(chain_input if isinstance(chain_input, dict) else {"input": chain_input}, stream=True)

            # Type narrow – we ensured stream=True so generator expected
            assert hasattr(result_gen_any, "__aiter__")
            result_gen = result_gen_any  # type: ignore[assignment]

            async for event in result_gen:  # type: ignore[async-iterable]
                yield event
                
        except Exception as e:
            yield {"type": "error", "error": str(e), "error_type": type(e).__name__}
    
    def _prepare_chain_input(self, input_text: str, session_context: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Prepare input for chain execution"""
        chain_input = {"input": input_text}
        
        # Add session context if available
        if session_context:
            if "messages" in session_context:
                # Format chat history
                chat_history = []
                for msg in session_context["messages"][-10:]:  # Last 10 messages
                    chat_history.append(f"Human: {msg['human']}")
                    chat_history.append(f"AI: {msg['ai']}")
                
                chain_input["chat_history"] = "\n".join(chat_history)
            
            # Add any other context
            chain_input.update(session_context.get("context", {}))
        
        # If workflow sadece TEK bir node içeriyorsa ve bu node bir LLM
        # sağlayıcısıysa (OpenAIChat, AnthropicChat, GoogleGemini vb.) o zaman
        # LLM'e doğrudan string vermek gerekir.  Diğer tek-node senaryolarında
        # (ör. TestHello) sözlük formatını koruruz.

        # NOTE: Single-node optimisation disabled during migration

        # If chain only expects a simple string, return it directly to avoid errors
        if list(chain_input.keys()) == ["input"]:
            return input_text  # type: ignore[return-value]

        return chain_input
    
    def validate_workflow(self, workflow_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate workflow before execution"""
        try:
            errors = []
            warnings = []
            
            nodes = workflow_data.get("nodes", [])
            edges = workflow_data.get("edges", [])
            
            # Basic validation
            if not nodes:
                errors.append("Workflow must have at least one node")
                return {"valid": False, "errors": errors}
            
            # Node validation
            node_ids = set()
            node_types = {}
            
            for node in nodes:
                node_id = node.get("id")
                node_type = node.get("type")
                
                if not node_id:
                    errors.append("Node missing ID")
                    continue
                
                if node_id in node_ids:
                    errors.append(f"Duplicate node ID: {node_id}")
                
                node_ids.add(node_id)
                node_types[node_id] = node_type
                
                # Check if node type exists
                if node_type not in self.registry:
                    errors.append(f"Unknown node type: {node_type}")
            
            # Edge validation
            for edge in edges:
                source = edge.get("source")
                target = edge.get("target")
                
                if source not in node_ids:
                    errors.append(f"Edge source '{source}' not found")
                if target not in node_ids:
                    errors.append(f"Edge target '{target}' not found")
                
                # Type compatibility check
                if source in node_types and target in node_types:
                    compatibility = self._check_connection_compatibility(
                        node_types[source],
                        edge.get("sourceHandle", "output"),
                        node_types[target],
                        edge.get("targetHandle", "input")
                    )
                    
                    if not compatibility["compatible"]:
                        errors.append(compatibility["error"])
            
            # Try to build without executing
            try:
                self._engine.build(workflow_data)
            except Exception as e:
                errors.append(f"Build error: {str(e)}")
            
            return {
                "valid": len(errors) == 0,
                "errors": errors,
                "warnings": warnings,
                "node_count": len(nodes),
                "edge_count": len(edges)
            }
            
        except Exception as e:
            return {"valid": False, "errors": [str(e)]}
    
    def _check_connection_compatibility(
        self, 
        source_type: str, 
        source_handle: str,
        target_type: str, 
        target_handle: str
    ) -> Dict[str, Any]:
        """Check if two nodes can be connected"""
        # This is a simplified version
        # In production, you'd check actual input/output types
        
        compatibility_rules = {
            # LLM outputs can connect to agent/chain inputs
            ("llm", "agent"): ["llm"],
            ("llm", "chain"): ["llm"],
            
            # Tool outputs can connect to agent inputs
            ("tool", "agent"): ["tools"],
            
            # Prompt outputs can connect to LLM/agent inputs
            ("prompt", "llm"): ["prompt"],
            ("prompt", "agent"): ["prompt"],
            
            # Memory can connect to agents/chains
            ("memory", "agent"): ["memory"],
            ("memory", "chain"): ["memory"],
        }
        
        # Get node categories (simplified)
        source_category = self._get_node_category(source_type)
        target_category = self._get_node_category(target_type)
        
        key = (source_category, target_category)
        allowed_handles = compatibility_rules.get(key, [])
        
        if not allowed_handles or target_handle not in allowed_handles:
            return {
                "compatible": True,  # For now, allow all connections
                "warning": f"Connection from {source_type} to {target_type} might not work as expected"
            }
        
        return {"compatible": True}
    
    def _get_node_category(self, node_type: str) -> str:
        """Get category of a node type"""
        # Simplified categorization
        if "llm" in node_type.lower() or "chat" in node_type.lower():
            return "llm"
        elif "tool" in node_type.lower():
            return "tool"
        elif "prompt" in node_type.lower():
            return "prompt"
        elif "memory" in node_type.lower():
            return "memory"
        elif "agent" in node_type.lower():
            return "agent"
        else:
            return "other"
