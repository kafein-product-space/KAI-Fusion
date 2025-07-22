"""engine_v2.py – Unified Workflow Engine interface

This module defines the **BaseWorkflowEngine** abstract interface that every
workflow execution engine must implement, along with a temporary
**StubWorkflowEngine** placeholder.  In Sprint 1 we only design the unified
interface; full LangGraph-backed implementation will arrive in Sprint 1.3.

The new engine will eventually replace the legacy *WorkflowRunner*,
*DynamicChainBuilder* and *workflow_engine* modules, providing a single,
cohesive API for building, validating and executing workflows.
"""

from __future__ import annotations

import abc
from typing import Any, AsyncGenerator, Dict, Optional, Union
from app.core.tracing import trace_workflow, get_workflow_tracer


JSONType = Dict[str, Any]
StreamEvent = Dict[str, Any]
ExecutionResult = Union[JSONType, AsyncGenerator[StreamEvent, None]]


class BaseWorkflowEngine(abc.ABC):
    """Abstract interface for all workflow engines.

    Concrete subclasses are expected to handle **three** primary concerns:

    1. *build* – compile a frontend `flow_data` graph into an executable object
       (e.g. LangGraph `CompiledStateGraph`).
    2. *validate* – perform static analysis on `flow_data` and return a report
       indicating validity, errors and warnings.
    3. *execute* – run the compiled graph synchronously or as a streaming async
       generator, optionally persisting execution metadata.
    """

    # ---------------------------------------------------------------------
    # Validation helpers
    # ---------------------------------------------------------------------
    @abc.abstractmethod
    def validate(self, flow_data: JSONType) -> JSONType:
        """Return {valid: bool, errors: list[str], warnings: list[str]}"""

    # ---------------------------------------------------------------------
    # Build helpers
    # ---------------------------------------------------------------------
    @abc.abstractmethod
    def build(self, flow_data: JSONType, *, user_context: Optional[JSONType] = None) -> None:
        """Compile `flow_data` into an internal executable representation."""

    # ---------------------------------------------------------------------
    # Execution helpers
    # ---------------------------------------------------------------------
    @abc.abstractmethod
    async def execute(
        self,
        inputs: Optional[JSONType] = None,
        *,
        stream: bool = False,
        user_context: Optional[JSONType] = None,
    ) -> ExecutionResult:
        """Run the previously *built* workflow.

        Args:
            inputs: Runtime inputs for the workflow (default `{}`).
            stream: If *True*, return an **async generator** yielding streaming
                     events.  If *False*, await the final result and return a
                     JSON-compatible dict.
            user_context: Arbitrary metadata forwarded to downstream nodes –
                           e.g. `user_id`, `workflow_id`, RBAC claims, etc.
        """


class StubWorkflowEngine(BaseWorkflowEngine):
    """Temporary no-op engine used during the migration phase."""

    _BUILT: bool = False

    def validate(self, flow_data: JSONType) -> JSONType:  # noqa: D401
        return {
            "valid": True,
            "errors": [],
            "warnings": [
                "StubWorkflowEngine does not perform real validation yet; "
                "all flows are considered valid by default."
            ],
        }

    def build(self, flow_data: JSONType, *, user_context: Optional[JSONType] = None) -> None:  # noqa: D401
        # In Sprint 1.3 we will compile to a LangGraph StateGraph.  For now we
        # just store the flow.
        self._flow_data: JSONType = flow_data
        self._BUILT = True

    async def execute(
        self,
        inputs: Optional[JSONType] = None,
        *,
        stream: bool = False,
        user_context: Optional[JSONType] = None,
    ) -> ExecutionResult:  # noqa: D401
        if not self._BUILT:
            raise RuntimeError("Workflow must be built before execution. Call build() first.")

        # Placeholder deterministic result – echo the inputs
        result = {
            "success": True,
            "echo": inputs or {},
            "message": "StubWorkflowEngine executed successfully. Replace with real implementation soon.",
        }

        if stream:
            async def gen() -> AsyncGenerator[StreamEvent, None]:
                yield {"type": "status", "message": "stub-start"}
                yield {"type": "result", "result": result}
            return gen()

        return result


class LangGraphWorkflowEngine(BaseWorkflowEngine):
    """Production-ready engine that leverages GraphBuilder + LangGraph.

    For Sprint 1.3 we keep implementation minimal: delegate heavy lifting to
    :class:`app.core.graph_builder.GraphBuilder` which already supports
    synchronous and streaming execution with an in-memory checkpointer by
    default.  Future sprints will add advanced features (persistent
    checkpointer, caching, metrics, etc.).
    """

    def __init__(self):
        from app.core.node_registry import node_registry  # local import to avoid cycles
        from app.core.graph_builder import GraphBuilder

        # Single, standardized node discovery
        if not node_registry.nodes:
            print("🔍 Discovering nodes...")
            node_registry.discover_nodes()

        # Ensure we have nodes
        if not node_registry.nodes:
            print("⚠️  No nodes discovered! Creating minimal fallback registry...")
            self._create_minimal_fallback_registry(node_registry)

        print(f"✅ Engine initialized with {len(node_registry.nodes)} nodes")
        
        # Choose MemorySaver automatically (GraphBuilder handles this)
        self._builder = GraphBuilder(node_registry.nodes)
        self._built: bool = False
        self._flow_data: Optional[JSONType] = None  # Store flow_data for tracing

    def _create_minimal_fallback_registry(self, registry):
        """Create a minimal fallback registry with essential nodes."""
        try:
            # Try to import and register core nodes manually
            from app.nodes.test_node import TestHelloNode, TestProcessorNode
            registry.register_node(TestHelloNode)
            registry.register_node(TestProcessorNode)
            print("✅ Registered fallback nodes: TestHello, TestProcessor")
        except Exception as e:
            print(f"⚠️  Could not register fallback nodes: {e}")

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------
    def validate(self, flow_data: JSONType) -> JSONType:  # noqa: D401
        """Enhanced validation with detailed error reporting"""
        errors: list[str] = []
        warnings: list[str] = []

        if not isinstance(flow_data, dict):
            errors.append("flow_data must be a dict")
            return {"valid": False, "errors": errors, "warnings": warnings}

        nodes = flow_data.get("nodes", [])
        edges = flow_data.get("edges", [])
        
        # Basic structure validation
        if not nodes:
            errors.append("Workflow must contain at least one node")
        else:
            # Validate each node
            node_ids = set()
            for i, node in enumerate(nodes):
                if not isinstance(node, dict):
                    errors.append(f"Node {i} must be an object")
                    continue
                
                node_id = node.get("id")
                if not node_id:
                    errors.append(f"Node {i} missing required 'id' field")
                    continue
                
                if node_id in node_ids:
                    errors.append(f"Duplicate node ID: {node_id}")
                else:
                    node_ids.add(node_id)
                
                node_type = node.get("type")
                if not node_type:
                    errors.append(f"Node {node_id} missing required 'type' field")
                    continue
                
                # Validate node type exists in registry
                if node_type not in self._builder.node_registry:
                    errors.append(f"Unknown node type: {node_type}")
                    # Suggest similar node types
                    available_types = list(self._builder.node_registry.keys())
                    similar = [t for t in available_types if node_type.lower() in t.lower()]
                    if similar:
                        warnings.append(f"Did you mean one of: {', '.join(similar[:3])}?")
        
        # Validate edges
        if edges:
            for i, edge in enumerate(edges):
                if not isinstance(edge, dict):
                    errors.append(f"Edge {i} must be an object")
                    continue
                
                source = edge.get("source")
                target = edge.get("target")
                
                if not source:
                    errors.append(f"Edge {i} missing required 'source' field")
                elif source not in node_ids:
                    errors.append(f"Edge {i} references unknown source node: {source}")
                
                if not target:
                    errors.append(f"Edge {i} missing required 'target' field")
                elif target not in node_ids:
                    errors.append(f"Edge {i} references unknown target node: {target}")
        else:
            warnings.append("No edges defined – isolated nodes will run individually")

        # Check for isolated nodes (except StartNode)
        if edges and nodes:
            connected_nodes = set()
            for edge in edges:
                connected_nodes.add(edge.get("source"))
                connected_nodes.add(edge.get("target"))
            
            isolated_nodes = []
            for node in nodes:
                node_id = node.get("id")
                node_type = node.get("type")
                if node_id not in connected_nodes and node_type != "StartNode":
                    isolated_nodes.append(node_id)
            
            if isolated_nodes:
                warnings.append(f"Isolated nodes detected: {', '.join(isolated_nodes)}")

        return {"valid": len(errors) == 0, "errors": errors, "warnings": warnings}

    # ------------------------------------------------------------------
    # Build
    # ------------------------------------------------------------------
    def build(self, flow_data: JSONType, *, user_context: Optional[JSONType] = None) -> None:  # noqa: D401
        """Enhanced build with better error handling and logging"""
        print("🔨 Building workflow...")
        
        # Store flow_data for tracing
        self._flow_data = flow_data
        
        # Enhanced validation before build
        validation_result = self.validate(flow_data)
        if not validation_result["valid"]:
            error_msg = f"Cannot build workflow: {'; '.join(validation_result['errors'])}"
            print(f"❌ Build validation failed: {error_msg}")
            raise ValueError(error_msg)
        
        # Log warnings if any
        if validation_result["warnings"]:
            for warning in validation_result["warnings"]:
                print(f"⚠️  {warning}")

        try:
            # Log build details
            nodes = flow_data.get("nodes", [])
            edges = flow_data.get("edges", [])
            print(f"📊 Building workflow with {len(nodes)} nodes and {len(edges)} edges")
            
            # For now we only pass user_id if available
            user_id = user_context.get("user_id") if user_context else None  # type: ignore[attr-defined]
            if user_id:
                print(f"👤 Building for user: {user_id}")
            
            self._builder.build_from_flow(flow_data, user_id=user_id)
            self._built = True
            print("✅ Workflow build completed successfully")
            
        except Exception as e:
            error_msg = f"Workflow build failed: {str(e)}"
            print(f"❌ {error_msg}")
            raise ValueError(error_msg) from e

    # ------------------------------------------------------------------
    # Execute
    # ------------------------------------------------------------------
    @trace_workflow
    async def execute(
        self,
        inputs: Optional[JSONType] = None,
        *,
        stream: bool = False,
        user_context: Optional[JSONType] = None,
    ) -> ExecutionResult:  # noqa: D401
        """Enhanced execution with better error handling and LangSmith tracing"""
        if not self._built:
            raise RuntimeError("Workflow must be built before execution. Call build() first.")

        inputs = inputs or {}
        user_id = user_context.get("user_id") if user_context else None  # type: ignore[attr-defined]
        workflow_id = user_context.get("workflow_id") if user_context else None  # type: ignore[attr-defined]
        session_id = user_context.get("session_id") if user_context else None  # type: ignore[attr-defined]

        print(f"🚀 Starting workflow execution (stream={stream})")
        if user_id:
            print(f"👤 Executing for user: {user_id}")
        if workflow_id:
            print(f"🔗 Workflow ID: {workflow_id}")
        if session_id:
            print(f"🎯 Session ID: {session_id}")
        print(f"📥 Inputs: {list(inputs.keys()) if isinstance(inputs, dict) else type(inputs)}")

        # Create workflow tracer
        tracer = get_workflow_tracer(session_id=session_id, user_id=user_id)
        tracer.start_workflow(workflow_id=workflow_id, flow_data=self._flow_data)

        try:
            # GraphBuilder.execute manages streaming vs sync
            result = await self._builder.execute(
                inputs,
                user_id=user_id,
                workflow_id=workflow_id,
                session_id=session_id,
                stream=stream,
            )
            
            print("✅ Workflow execution completed successfully")
            tracer.end_workflow(success=True)
            return result
            
        except Exception as e:
            error_msg = f"Workflow execution failed: {str(e)}"
            print(f"❌ {error_msg}")
            tracer.end_workflow(success=False, error=error_msg)
            
            # Return structured error result
            if stream:
                async def error_generator():
                    yield {"type": "error", "error": error_msg, "error_type": type(e).__name__}
                return error_generator()
            else:
                return {
                    "success": False,
                    "error": error_msg,
                    "error_type": type(e).__name__,
                    "user_id": user_id,
                    "workflow_id": workflow_id,
                    "session_id": session_id
                }


# ------------------------------------------------------------------
# Engine factory – switch between stub and real implementation
# ------------------------------------------------------------------

import os
from .constants import AF_USE_STUB_ENGINE


_ENGINE_IMPL_CACHE: Optional[BaseWorkflowEngine] = None


def get_engine() -> BaseWorkflowEngine:  # noqa: D401
    """Return shared engine instance.

    If env var `AF_USE_STUB_ENGINE` is set to a truthy value, returns
    StubWorkflowEngine for local debugging. Otherwise returns
    LangGraphWorkflowEngine (default).
    """

    global _ENGINE_IMPL_CACHE  # noqa: PLW0603
    if _ENGINE_IMPL_CACHE is not None:
        return _ENGINE_IMPL_CACHE

    use_stub = AF_USE_STUB_ENGINE.lower() in {"1", "true", "yes"}
    _ENGINE_IMPL_CACHE = StubWorkflowEngine() if use_stub else LangGraphWorkflowEngine()
    return _ENGINE_IMPL_CACHE 