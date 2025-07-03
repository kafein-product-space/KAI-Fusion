"""WorkflowEngine: Orchestrates building and executing workflows.

The engine relies on GraphBuilder to compile the visual flow into
LangGraph and provides convenient helpers for synchronous and streaming
execution, while persisting execution metadata in the database.
"""

from typing import Dict, Any, Optional, AsyncGenerator, Union
from app.core.node_registry import node_registry
from app.core.graph_builder import GraphBuilder
from app.database import db

__all__ = ["workflow_engine", "WorkflowEngine"]


class WorkflowEngine:
    """Enhanced workflow execution engine with streaming support."""

    def __init__(self):
        self.registry = node_registry
        self.builder: Optional[GraphBuilder] = None

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------
    def _get_builder(self) -> GraphBuilder:
        if not self.builder:
            self.builder = GraphBuilder(self.registry.nodes)
        return self.builder

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    async def execute_workflow(
        self,
        workflow_id: str,
        user_id: str,
        inputs: Optional[Dict[str, Any]] = None,
        save_execution: bool = True,
        stream: bool = False,
    ) -> Union[Dict[str, Any], AsyncGenerator[Dict[str, Any], None]]:
        """High-level method used by API layer to run a stored workflow."""
        if not db:
            raise ValueError("Database not available")

        workflow = await db.get_workflow(workflow_id, user_id)
        if not workflow:
            raise ValueError(f"Workflow {workflow_id} not found")

        flow_data = workflow["flow_data"]
        if not isinstance(flow_data, dict):
            raise ValueError("Invalid workflow data format")

        execution_rec = None
        if save_execution:
            execution_rec = await db.create_execution(workflow_id, user_id, inputs or {})

        try:
            if stream:
                # Streaming returns async generator
                return self._execute_flow_stream(
                    flow_data,
                    inputs or {},
                    user_id,
                    workflow_id,
                    execution_rec["id"] if execution_rec else None,
                )
            else:
                result = await self._execute_flow(flow_data, inputs or {}, user_id, workflow_id)
                if execution_rec:
                    await db.update_execution(execution_rec["id"], "completed", result)
                return {
                    "success": True,
                    "workflow_id": workflow_id,
                    "execution_id": execution_rec["id"] if execution_rec else None,
                    "results": result,
                }
        except Exception as exc:
            if execution_rec:
                await db.update_execution(execution_rec["id"], "failed", error=str(exc))
            raise

    # ------------------------------------------------------------------
    # Internal execution helpers
    # ------------------------------------------------------------------
    async def _execute_flow(
        self,
        flow_data: Dict[str, Any],
        initial_inputs: Dict[str, Any],
        user_id: str,
        workflow_id: str,
    ) -> Dict[str, Any]:
        builder = self._get_builder()
        builder.build_from_flow(flow_data, user_id)
        result = await builder.execute(initial_inputs, user_id=user_id, workflow_id=workflow_id)
        if not isinstance(result, dict):
            raise RuntimeError("Expected dict result from synchronous execution")
        return result

    async def _execute_flow_stream(
        self,
        flow_data: Dict[str, Any],
        initial_inputs: Dict[str, Any],
        user_id: str,
        workflow_id: str,
        execution_id: Optional[str] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        builder = self._get_builder()
        builder.build_from_flow(flow_data, user_id)

        async for event in builder.execute(
            initial_inputs,
            user_id=user_id,
            workflow_id=workflow_id,
            stream=True,
        ):
            yield event
            if execution_id and event.get("type") == "complete":
                await db.update_execution(execution_id, "completed", event.get("result"))


# Singleton
workflow_engine = WorkflowEngine()
