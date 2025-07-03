from typing import Dict, Any, List, Optional
from collections import defaultdict, deque
import asyncio
import json
from datetime import datetime
from app.core.node_registry import node_registry
from app.core.graph_builder import GraphBuilder
from app.database import db

class WorkflowEngine:
    """Main workflow execution engine using LangGraph"""
    
    def __init__(self):
        self.registry = node_registry
        self.builder = GraphBuilder(self.registry.nodes)
    
    async def execute_workflow(
        self, 
        workflow_id: str, 
        user_id: str,
        inputs: Optional[Dict[str, Any]] = None,
        save_execution: bool = True
    ) -> Dict[str, Any]:
        """Execute a workflow"""
        # Check database availability
        if not db:
            raise ValueError("Database not available")
            
        # Get workflow
        workflow = await db.get_workflow(workflow_id, user_id)
        if not workflow:
            raise ValueError(f"Workflow {workflow_id} not found")
        
        flow_data = workflow['flow_data']  # Already parsed by database
        if not isinstance(flow_data, dict):
            raise ValueError("Invalid workflow data format")
        
        # Create execution record
        execution = None
        if save_execution:
            execution = await db.create_execution(workflow_id, user_id, inputs or {})
        
        try:
            # Execute workflow using DynamicChainBuilder
            results = await self._execute_flow(flow_data, inputs or {})
            
            # Update execution
            if execution:
                await db.update_execution(execution['id'], 'completed', results)
            
            return {
                "success": True,
                "workflow_id": workflow_id,
                "execution_id": execution['id'] if execution else None,
                "results": results
            }
            
        except Exception as e:
            # Update execution with error
            if execution:
                await db.update_execution(execution['id'], 'failed', error=str(e))
            
            raise e
    
    async def _execute_flow(self, flow_data: Dict[str, Any], initial_inputs: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Execute the flow graph using GraphBuilder"""
        try:
            # Build the graph using GraphBuilder
            print(f"🔨 Building workflow from {len(flow_data.get('nodes', []))} nodes...")
            graph = self.builder.build_from_flow(flow_data)
            
            # Prepare input for graph execution
            if initial_inputs:
                graph_input = initial_inputs
            else:
                graph_input = {"input": ""}
            
            print(f"🚀 Executing workflow graph...")
            
            # Execute the graph using GraphBuilder's execute method
            result = await self.builder.execute(
                inputs=graph_input,
                workflow_id=flow_data.get("id"),
                user_id=flow_data.get("user_id")
            )
            
            if result["success"]:
                return {
                    "result": result["result"],
                    "execution_order": result.get("executed_nodes", []),
                    "status": "completed",
                    "node_count": len(self.builder.nodes),
                    "session_id": result.get("session_id")
                }
            else:
                return {
                    "result": None,
                    "error": result["error"],
                    "error_type": result["error_type"],
                    "status": "failed",
                    "execution_order": []
                }
            
        except Exception as e:
            print(f"❌ Workflow execution failed: {str(e)}")
            return {
                "result": None,
                "error": str(e),
                "error_type": type(e).__name__,
                "status": "failed",
                "execution_order": []
            }

workflow_engine = WorkflowEngine()
