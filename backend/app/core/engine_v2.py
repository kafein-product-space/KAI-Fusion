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

        # Discover nodes once if registry is empty
        if not node_registry.nodes:
            node_registry.discover_nodes()

        # Enhanced fallback: if still empty or missing critical nodes, try legacy discovery
        if not node_registry.nodes or len(node_registry.nodes) < 5:  # Arbitrary threshold
            try:
                from app.core.node_discovery import get_registry as _legacy_get_registry

                print("🔄 Using legacy node discovery as fallback...")
                legacy_nodes = _legacy_get_registry()
                node_registry.nodes.update(legacy_nodes)
                print(f"✅ Added {len(legacy_nodes)} nodes from legacy discovery")
            except Exception as _exc:  # noqa: BLE001
                print(f"⚠️  Legacy node discovery failed: {_exc}")

        # Final fallback: ensure we have at least some basic nodes
        if not node_registry.nodes:
            print("⚠️  No nodes discovered! Creating minimal fallback registry...")
            self._create_minimal_fallback_registry(node_registry)

        # Choose MemorySaver automatically (GraphBuilder handles this)
        self._builder = GraphBuilder(node_registry.nodes)
        self._built: bool = False

    def _create_minimal_fallback_registry(self, registry):
        """Create a minimal fallback registry with essential nodes."""
        try:
            # Try to import and register core nodes manually
            from app.nodes.test_node import TestHelloNode
            registry.register_node(TestHelloNode)
            print("✅ Registered fallback node: TestHello")
        except Exception as e:
            print(f"⚠️  Could not register fallback nodes: {e}")

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------
    def validate(self, flow_data: JSONType) -> JSONType:  # noqa: D401
        errors: list[str] = []
        warnings: list[str] = []

        if not isinstance(flow_data, dict):
            errors.append("flow_data must be a dict")
        else:
            nodes = flow_data.get("nodes", [])
            edges = flow_data.get("edges", [])
            
            if not nodes:
                errors.append("Workflow must contain at least one node")
            else:
                # Validate node types exist in registry
                for node in nodes:
                    node_type = node.get("type")
                    if node_type and node_type not in self._builder.node_registry:
                        errors.append(f"Unknown node type: {node_type}")
                        # Suggest similar node types
                        available_types = list(self._builder.node_registry.keys())
                        similar = [t for t in available_types if node_type.lower() in t.lower()]
                        if similar:
                            warnings.append(f"Did you mean one of: {', '.join(similar[:3])}?")
            
            if not edges:
                warnings.append("No edges defined – isolated nodes will run individually")

        return {"valid": len(errors) == 0, "errors": errors, "warnings": warnings}

    # ------------------------------------------------------------------
    # Build
    # ------------------------------------------------------------------
    def build(self, flow_data: JSONType, *, user_context: Optional[JSONType] = None) -> None:  # noqa: D401
        # Enhanced validation before build
        validation_result = self.validate(flow_data)
        if not validation_result["valid"]:
            error_msg = f"Cannot build workflow: {'; '.join(validation_result['errors'])}"
            raise ValueError(error_msg)

        # For now we only pass user_id if available
        user_id = user_context.get("user_id") if user_context else None  # type: ignore[attr-defined]
        self._builder.build_from_flow(flow_data, user_id=user_id)
        self._built = True

    # ------------------------------------------------------------------
    # Execute
    # ------------------------------------------------------------------
    async def execute(
        self,
        inputs: Optional[JSONType] = None,
        *,
        stream: bool = False,
        user_context: Optional[JSONType] = None,
    ) -> ExecutionResult:  # noqa: D401
        if not self._built:
            raise RuntimeError("Workflow must be built before execution. Call build() first.")

        inputs = inputs or {}
        user_id = user_context.get("user_id") if user_context else None  # type: ignore[attr-defined]
        workflow_id = user_context.get("workflow_id") if user_context else None  # type: ignore[attr-defined]

        # GraphBuilder.execute manages streaming vs sync
        result = await self._builder.execute(
            inputs,
            user_id=user_id,
            workflow_id=workflow_id,
            stream=stream,
        )
        return result


# ------------------------------------------------------------------
# Engine factory – switch between stub and real implementation
# ------------------------------------------------------------------

import os


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

    use_stub = os.getenv("AF_USE_STUB_ENGINE", "false").lower() in {"1", "true", "yes"}
    _ENGINE_IMPL_CACHE = StubWorkflowEngine() if use_stub else LangGraphWorkflowEngine()
    return _ENGINE_IMPL_CACHE 