from typing import Dict, Any, AsyncGenerator, Optional
import asyncio
import json

class WorkflowRunner:
    """
    Simplified workflow runner for basic API functionality
    """
    
    def __init__(self, registry: Dict[str, Any] = None):
        self.registry = registry or {}
    
    async def execute_workflow(self, workflow_data: Dict[str, Any], input_text: str, session_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Execute a workflow with the given input - simplified version
        """
        try:
            nodes = workflow_data.get("nodes", [])
            edges = workflow_data.get("edges", [])
            
            result = {
                "result": f"Executed workflow with {len(nodes)} nodes and input: {input_text}",
                "execution_order": [node.get("id", f"node_{i}") for i, node in enumerate(nodes)],
                "status": "completed"
            }
            
            return result
            
        except Exception as e:
            return {
                "result": None,
                "error": str(e),
                "status": "failed"
            }
    
    async def execute_workflow_stream(self, workflow_data: Dict[str, Any], input_text: str, session_context: Optional[Dict[str, Any]] = None) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Execute a workflow with streaming output - simplified version
        """
        try:
            nodes = workflow_data.get("nodes", [])
            
            yield {"type": "start", "message": "Starting workflow execution..."}
            
            for i, node in enumerate(nodes):
                await asyncio.sleep(0.1)
                node_id = node.get("id", f"node_{i}")
                node_type = node.get("type", "unknown")
                
                yield {
                    "type": "node_start", 
                    "node_id": node_id, 
                    "node_type": node_type,
                    "message": f"Executing node {node_id}"
                }
                
                await asyncio.sleep(0.2)
                yield {
                    "type": "node_complete", 
                    "node_id": node_id,
                    "result": f"Node {node_id} completed"
                }
            
            yield {
                "type": "result",
                "result": f"Workflow completed with input: {input_text}",
                "execution_order": [node.get("id", f"node_{i}") for i, node in enumerate(nodes)]
            }
            
        except Exception as e:
            yield {"type": "error", "error": str(e)}
    
    def validate_workflow(self, workflow_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate a workflow definition - simplified version
        """
        try:
            nodes = workflow_data.get("nodes", [])
            edges = workflow_data.get("edges", [])
            
            if not nodes:
                return {"valid": False, "errors": ["Workflow must have at least one node"]}
            
            # Check that all edge references exist
            node_ids = {node.get("id") for node in nodes if node.get("id")}
            
            for edge in edges:
                source = edge.get("source")
                target = edge.get("target")
                
                if source and source not in node_ids:
                    return {"valid": False, "errors": [f"Edge source '{source}' not found"]}
                if target and target not in node_ids:
                    return {"valid": False, "errors": [f"Edge target '{target}' not found"]}
            
            return {"valid": True, "message": "Workflow is valid"}
            
        except Exception as e:
            return {"valid": False, "errors": [str(e)]} 