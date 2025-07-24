from __future__ import annotations

"""GraphBuilder: Build LangGraph execution graphs from flow definitions.

This replaces the previous DynamicChainBuilder implementation and brings
full LangGraph features: conditional routing, loop/parallel constructs,
checkpointer support, and streaming execution.
"""

from typing import Dict, Any, List, Optional, Callable, Type, Union, AsyncGenerator
from dataclasses import dataclass
from enum import Enum
import uuid
import asyncio
import os

from langgraph.graph import StateGraph, START, END
from langgraph.graph.state import CompiledStateGraph
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.runnables import Runnable, RunnableConfig

from app.core.state import FlowState
from app.nodes.base import BaseNode

__all__ = ["GraphBuilder", "NodeConnection", "GraphNodeInstance", "ControlFlowType"]


@dataclass
class NodeConnection:
    """Represents a connection (edge) between two nodes in the UI."""

    source_node_id: str
    source_handle: str
    target_node_id: str
    target_handle: str
    data_type: str = "any"


@dataclass
class GraphNodeInstance:
    """A concrete node instance ready to execute inside LangGraph."""

    id: str
    type: str
    node_instance: BaseNode
    metadata: Dict[str, Any]
    user_data: Dict[str, Any]


class ControlFlowType(Enum):
    CONDITIONAL = "conditional"
    LOOP = "loop"
    PARALLEL = "parallel"


class GraphBuilder:
    """Convert ReactFlow JSON into an executable LangGraph pipeline."""

    def __init__(self, node_registry: Dict[str, Type[BaseNode]], checkpointer=None):
        self.node_registry = node_registry
        # Pick the best available checkpointer
        self.checkpointer = checkpointer or self._get_checkpointer()
        # State that is rebuilt on every `build_from_flow`
        self.nodes: Dict[str, GraphNodeInstance] = {}
        self.connections: List[NodeConnection] = []
        self.control_flow_nodes: Dict[str, Dict[str, Any]] = {}
        self.explicit_start_nodes: set[str] = set()
        self.end_nodes_for_connections: Dict[str, Dict[str, Any]] = {}
        self.graph: Optional[CompiledStateGraph] = None

    # ---------------------------------------------------------------------
    # Public API
    # ---------------------------------------------------------------------
    def build_from_flow(self, flow_data: Dict[str, Any], user_id: Optional[str] = None) -> CompiledStateGraph:
        """Given the JSON sent from the frontend, construct LangGraph."""
        nodes = flow_data.get("nodes", [])
        edges = flow_data.get("edges", [])

        # Reset builder state
        self.nodes.clear()
        self.connections.clear()
        self.control_flow_nodes.clear()
        self.explicit_start_nodes.clear()
        self.end_nodes_for_connections.clear()

        # --- NEW: Enforce StartNode and EndNode ---
        start_nodes = [n for n in nodes if n.get("type") == "StartNode"]
        end_nodes = [n for n in nodes if n.get("type") == "EndNode"]

        if not start_nodes:
            raise ValueError("Workflow must contain at least one StartNode.")
        
        # Create virtual EndNode if none exists for better UX
        if not end_nodes:
            print("⚠️  No EndNode found. Creating virtual EndNode for workflow completion.")
            virtual_end_node = {
                "id": "virtual-end-node",
                "type": "EndNode",
                "position": {"x": 0, "y": 0},
                "data": {
                    "name": "EndNode",
                    "description": "Virtual end node for workflow completion",
                    "metadata": {"name": "EndNode", "node_type": "terminator"}
                }
            }
            nodes.append(virtual_end_node)
            end_nodes = [virtual_end_node]
            
            # Find the last nodes in the workflow to connect to virtual EndNode
            all_targets = {e["target"] for e in edges}
            all_sources = {e["source"] for e in edges}
            last_nodes = all_sources - all_targets - start_node_ids
            
            # Connect last nodes to virtual EndNode
            for node_id in last_nodes:
                virtual_edge = {
                    "id": f"virtual-{node_id}-to-end",
                    "source": node_id,
                    "target": "virtual-end-node",
                    "sourceHandle": "output",
                    "targetHandle": "input"
                }
                edges.append(virtual_edge)
                print(f"🔗 Auto-connected {node_id} -> virtual-end-node")
            
        start_node_ids = {n["id"] for n in start_nodes}
        end_node_ids = {n["id"] for n in end_nodes}

        # Identify nodes connected FROM StartNode
        self.explicit_start_nodes = {e["target"] for e in edges if e.get("source") in start_node_ids}

        # Filter out StartNode for processing, but keep EndNodes for connection tracking
        nodes = [n for n in nodes if n.get("type") != "StartNode"]
        edges = [e for e in edges if e.get("source") not in start_node_ids]
        
        # Separate EndNodes from regular nodes - we need them for connection tracking
        end_nodes_for_processing = [n for n in nodes if n.get("type") == "EndNode"]
        regular_nodes = [n for n in nodes if n.get("type") != "EndNode"]
        
        self._parse_connections(edges)
        self._identify_control_flow_nodes(regular_nodes)
        self._instantiate_nodes(regular_nodes)
        
        # Store EndNodes separately for connection tracking
        self.end_nodes_for_connections = {n["id"]: n for n in end_nodes_for_processing}
        self.graph = self._build_langgraph()
        return self.graph

    async def execute(
        self,
        inputs: Dict[str, Any],
        session_id: Optional[str] = None,
        user_id: Optional[str] = None,
        workflow_id: Optional[str] = None,
        stream: bool = False,
    ) -> Union[Dict[str, Any], AsyncGenerator[Dict[str, Any], None]]:
        """Run the compiled graph (call `build_from_flow` first)."""
        if not self.graph:
            raise ValueError("Graph has not been built. Call build_from_flow().")

        # Prepare initial FlowState
        init_state = FlowState(
            current_input=inputs.get("input", ""),
            session_id=session_id or str(uuid.uuid4()),
            user_id=user_id,
            workflow_id=workflow_id,
            variables=inputs,
        )
        config: RunnableConfig = {"configurable": {"thread_id": init_state.session_id}}

        if stream:
            return self._execute_stream(init_state, config)
        else:
            return await self._execute_sync(init_state, config)

    # ------------------------------------------------------------------
    # Internal helpers – build phase
    # ------------------------------------------------------------------
    def _get_checkpointer(self):
        """Get the appropriate checkpointer for this graph builder."""
        from app.core.checkpointer import get_default_checkpointer
        return get_default_checkpointer()

    def _parse_connections(self, edges: List[Dict[str, Any]]):
        """Parse edges into internal connection format with handle support."""
        for edge in edges:
            source = edge.get("source", "")
            target = edge.get("target", "")
            source_handle = edge.get("sourceHandle", "output")
            target_handle = edge.get("targetHandle", "input")
            data_type = edge.get("type", "any")

            if source and target:
                conn = NodeConnection(
                    source_node_id=source,
                    source_handle=source_handle,
                    target_node_id=target,
                    target_handle=target_handle,
                    data_type=data_type,
                )
                self.connections.append(conn)
                print(f"[DEBUG] Parsed connection: {source}[{source_handle}] -> {target}[{target_handle}]")

    def _identify_control_flow_nodes(self, nodes: List[Dict[str, Any]]):
        """Detect control-flow constructs like conditional, loop, parallel."""
        for node_def in nodes:
            node_type = node_def.get("type", "")
            if node_type in ["ConditionalNode", "LoopNode", "ParallelNode"]:
                flow_type_map = {
                    "ConditionalNode": ControlFlowType.CONDITIONAL,
                    "LoopNode": ControlFlowType.LOOP,
                    "ParallelNode": ControlFlowType.PARALLEL,
                }
                self.control_flow_nodes[node_def["id"]] = {
                    "type": flow_type_map[node_type],
                    "data": node_def.get("data", {}),
                }

    def _instantiate_nodes(self, nodes: List[Dict[str, Any]]):
        """Instantiate nodes and build proper connection mappings with source handle support."""
        for node_def in nodes:
            node_id = node_def["id"]
            node_type = node_def["type"]
            user_data = node_def.get("data", {})

            if node_id in self.control_flow_nodes:
                continue  # Skip – handled separately

            node_cls = self.node_registry.get(node_type)
            if not node_cls:
                print(f"[WARNING] Unknown node type: {node_type}. Available types: {list(self.node_registry.keys())}")
                raise ValueError(f"Unknown node type: {node_type}")

            instance = node_cls()
            instance.node_id = node_id

            # 🔥 ENHANCED: Build comprehensive connection mapping
            input_connections = {}
            output_connections = {}
            
            # Find all connections targeting this node (inputs)
            for conn in self.connections:
                if conn.target_node_id == node_id:
                    input_connections[conn.target_handle] = {
                        "source_node_id": conn.source_node_id,
                        "source_handle": conn.source_handle,
                        "data_type": conn.data_type
                    }
                    print(f"[DEBUG] Input mapping: {node_id}.{conn.target_handle} <- {conn.source_node_id}.{conn.source_handle}")
                
                # Find all connections from this node (outputs)
                if conn.source_node_id == node_id:
                    if conn.source_handle not in output_connections:
                        output_connections[conn.source_handle] = []
                    output_connections[conn.source_handle].append({
                        "target_node_id": conn.target_node_id,
                        "target_handle": conn.target_handle,
                        "data_type": conn.data_type
                    })
                    print(f"[DEBUG] Output mapping: {node_id}.{conn.source_handle} -> {conn.target_node_id}.{conn.target_handle}")

            # 🔥 CRITICAL: Set connection mappings on the node instance
            instance._input_connections = input_connections
            instance._output_connections = output_connections
            
            # Store user configuration from frontend
            instance.user_data = user_data
            
            # Log user data for debugging
            if user_data:
                print(f"[DEBUG] Node {node_id} user data: {list(user_data.keys())}")

            # Create GraphNodeInstance
            self.nodes[node_id] = GraphNodeInstance(
                id=node_id,
                type=node_type,
                node_instance=instance,
                metadata={},
                user_data=user_data,
            )
            
            print(f"[DEBUG] ✅ Instantiated node '{node_id}' ({node_type}) with {len(input_connections)} inputs, {len(output_connections)} outputs")

    # ------------------------------------------------------------------
    # Internal – Graph building
    # ------------------------------------------------------------------
    def _build_langgraph(self) -> CompiledStateGraph:
        graph = StateGraph(FlowState)

        # 1) Regular nodes
        for node_id, n in self.nodes.items():
            graph.add_node(node_id, self._wrap_node(node_id, n))

        # 2) Control-flow constructs
        self._add_control_flow_edges(graph)

        # 3) Regular edges
        self._add_regular_edges(graph)

        # 4) START & END
        self._add_start_end_connections(graph)

        return graph.compile(checkpointer=self.checkpointer)

    def _wrap_node(self, node_id: str, gnode: GraphNodeInstance) -> Callable[[FlowState], Dict[str, Any]]:
        """Wrapper that merges user data and calls the node function"""
        
        def wrapper(state: FlowState) -> Dict[str, Any]:  # noqa: D401
            """Enhanced wrapper that provides better context and error handling."""
            try:
                print(f"[DEBUG] Executing node: {node_id} ({gnode.type})")
                
                # Merge user data into node instance before execution
                gnode.node_instance.user_data.update(gnode.user_data)
                
                # 🔥 ENHANCED: Pass session information to ReAct Agents and Memory nodes
                if gnode.type in ['ReactAgent', 'ToolAgentNode'] and hasattr(gnode.node_instance, 'session_id'):
                    session_id = state.session_id or f"session_{node_id}"
                    gnode.node_instance.session_id = session_id
                    print(f"[DEBUG] Set session_id for {node_id}: {session_id}")
                
                # Set session_id for memory nodes
                if 'Memory' in gnode.type and hasattr(gnode.node_instance, 'session_id'):
                    session_id = state.session_id or f"session_{node_id}"
                    gnode.node_instance.session_id = session_id
                    print(f"[DEBUG] Set session_id for memory node {node_id}: {session_id}")
                
                # Initialize tracer for this node
                try:
                    tracer = get_workflow_tracer(session_id=state.session_id, user_id=state.user_id)
                    inputs_dict = {"input": state.current_input} if hasattr(state, 'current_input') else {}
                    tracer.start_node_execution(node_id, gnode.type, inputs_dict)
                except Exception as trace_error:
                    print(f"[WARNING] Tracing failed: {trace_error}")
                
                # 🔥 SPECIAL HANDLING for ProcessorNodes (ReactAgent)
                print(f"[DEBUG] Node {node_id} type check - node_type: {gnode.node_instance.metadata.node_type.value}")
                print(f"[DEBUG] Node {node_id} has _input_connections: {hasattr(gnode.node_instance, '_input_connections')}")
                if hasattr(gnode.node_instance, '_input_connections'):
                    print(f"[DEBUG] Node {node_id} input connections: {list(gnode.node_instance._input_connections.keys())}")
                if gnode.node_instance.metadata.node_type.value == "processor":
                    # For ProcessorNodes, we need to pass actual node instances, not their outputs
                    try:
                        print(f"[DEBUG] Extracting user inputs for processor {node_id}")
                        user_inputs = self._extract_user_inputs_for_processor(gnode, state)
                        print(f"[DEBUG] User inputs extracted successfully: {list(user_inputs.keys())}")
                    except Exception as e:
                        print(f"[ERROR] Failed to extract user inputs for {node_id}: {e}")
                        raise
                    
                    try:
                        print(f"[DEBUG] Extracting connected node instances for processor {node_id}")
                        connected_nodes = self._extract_connected_node_instances(gnode, state)
                        print(f"[DEBUG] Connected nodes extracted successfully: {list(connected_nodes.keys())}")
                    except Exception as e:
                        print(f"[ERROR] Failed to extract connected nodes for {node_id}: {e}")
                        raise
                    
                    print(f"[DEBUG] Processor {node_id} - User inputs: {list(user_inputs.keys())}")
                    print(f"[DEBUG] Processor {node_id} - Connected nodes: {list(connected_nodes.keys())}")
                    
                    # Call execute directly with connected node instances
                    result = gnode.node_instance.execute(user_inputs, connected_nodes)
                    
                    # Process the result
                    processed_result = self._process_processor_result(result, state, node_id)
                    
                    # Update execution tracking
                    updated_executed_nodes = state.executed_nodes.copy()
                    if node_id not in updated_executed_nodes:
                        updated_executed_nodes.append(node_id)

                    # Extract the actual output for last_output
                    if isinstance(processed_result, dict) and "output" in processed_result:
                        last_output = processed_result["output"]
                    else:
                        last_output = str(processed_result)
                    
                    # Update the state directly
                    state.last_output = last_output
                    state.executed_nodes = updated_executed_nodes
                    
                    result_dict = {
                        f"output_{node_id}": processed_result,
                        "executed_nodes": updated_executed_nodes,
                        "last_output": last_output
                    }
                    print(f"[DEBUG] Node {node_id} returning state update: {result_dict}")
                    print(f"[DEBUG] State after update - last_output: '{state.last_output}'")
                    
                    # End node tracing for processor nodes
                    try:
                        tracer = get_workflow_tracer(session_id=state.session_id, user_id=state.user_id)
                        tracer.end_node_execution(node_id, gnode.type, {"output": processed_result})
                    except Exception as trace_error:
                        print(f"[WARNING] Tracing failed: {trace_error}")
                    
                    return result_dict
                else:
                    # For other node types, use the standard graph node function
                    node_func = gnode.node_instance.to_graph_node()
                    result = node_func(state)
                    print(f"[DEBUG] Node {node_id} completed successfully")
                    
                    # End node tracing
                    try:
                        tracer = get_workflow_tracer(session_id=state.session_id, user_id=state.user_id)
                        tracer.end_node_execution(node_id, gnode.type, result)
                    except Exception as trace_error:
                        print(f"[WARNING] Tracing failed: {trace_error}")
                    
                    return result
                
            except Exception as e:
                error_msg = f"Node {node_id} execution failed: {str(e)}"
                print(f"[ERROR] {error_msg}")
                
                # End node tracing with error
                try:
                    tracer = get_workflow_tracer(session_id=state.session_id, user_id=state.user_id)
                    tracer.end_node_execution(node_id, gnode.type, {"error": error_msg})
                except Exception as trace_error:
                    print(f"[WARNING] Tracing failed: {trace_error}")
                
                if hasattr(state, 'add_error'):
                    state.add_error(error_msg)
                return {
                    "errors": getattr(state, 'errors', [error_msg]),
                    "last_output": f"ERROR in {node_id}: {str(e)}"
                }

        wrapper.__name__ = f"node_{node_id}"
        return wrapper

    def _extract_user_inputs_for_processor(self, gnode: GraphNodeInstance, state: FlowState) -> Dict[str, Any]:
        """Extract user inputs for processor nodes"""
        inputs = {}
        
        for input_spec in gnode.node_instance.metadata.inputs:
            # Skip inputs that have actual connections (they'll be handled separately)
            if input_spec.name in gnode.node_instance._input_connections:
                print(f"[DEBUG] Skipping connected input: {input_spec.name}")
                continue
                
            if not input_spec.is_connection:
                # Check user_data first (from frontend form)
                if input_spec.name in gnode.node_instance.user_data:
                    inputs[input_spec.name] = gnode.node_instance.user_data[input_spec.name]
                    print(f"[DEBUG] Found user input {input_spec.name} in user_data")
                # Then check state variables
                elif input_spec.name in state.variables:
                    inputs[input_spec.name] = state.get_variable(input_spec.name)
                    print(f"[DEBUG] Found user input {input_spec.name} in state variables")
                # Use default if available
                elif input_spec.default is not None:
                    inputs[input_spec.name] = input_spec.default
                    print(f"[DEBUG] Using default for {input_spec.name}: {input_spec.default}")
                # Check if required
                elif input_spec.required:
                    # For special input names, try to get from state
                    if input_spec.name == "input":
                        inputs[input_spec.name] = state.current_input or ""
                        print(f"[DEBUG] Using current_input for {input_spec.name}")
                    else:
                        print(f"[DEBUG] Required input '{input_spec.name}' not found in user_data, state, or defaults")
                        raise ValueError(f"Required input '{input_spec.name}' not found")
        
        return inputs

    def _extract_connected_node_instances(self, gnode: GraphNodeInstance, state: FlowState) -> Dict[str, Any]:
        """Extract connected node instances for processor nodes"""
        connected = {}
        
        # Check all input connections defined for this node
        for input_name, connection_info in gnode.node_instance._input_connections.items():
            source_node_id = connection_info["source_node_id"]
            
            print(f"[DEBUG] Processing connection {input_name} <- {source_node_id}")
            
            # Get the actual node instance from our nodes registry
            if source_node_id in self.nodes:
                source_node_instance = self.nodes[source_node_id].node_instance
                
                # For provider nodes, we need to execute them to get the instance
                if source_node_instance.metadata.node_type.value == "provider":
                    try:
                        # 🔥 CRITICAL FIX: Pass session_id to memory nodes
                        if source_node_instance.metadata.name in ['BufferMemory', 'ConversationMemory']:
                            # Set session_id on memory nodes before execution
                            source_node_instance.session_id = state.session_id
                            print(f"[DEBUG] Set session_id on {source_node_id}: {state.session_id}")
                            
                            # Track memory node execution
                            try:
                                tracer = get_workflow_tracer(session_id=state.session_id, user_id=state.user_id)
                                tracer.track_memory_operation("connect", source_node_id, "memory_node_connection", state.session_id)
                            except Exception as trace_error:
                                print(f"[WARNING] Memory tracing failed: {trace_error}")
                        
                        # Execute the provider node to get the actual instance
                        # For provider nodes, we need to extract ALL inputs (not just user inputs)
                        provider_inputs = {}
                        for input_spec in source_node_instance.metadata.inputs:
                            if input_spec.name in source_node_instance.user_data:
                                provider_inputs[input_spec.name] = source_node_instance.user_data[input_spec.name]
                            elif input_spec.default is not None:
                                provider_inputs[input_spec.name] = input_spec.default
                        
                        node_instance = source_node_instance.execute(**provider_inputs)
                        connected[input_name] = node_instance
                        print(f"[DEBUG] Connected {input_name} -> {source_node_id} instance: {type(node_instance).__name__}")
                    except Exception as e:
                        print(f"[ERROR] Failed to get instance from {source_node_id}: {e}")
                        raise ValueError(f"Required input '{input_name}' not found") from e
                else:
                    connected[input_name] = source_node_instance
                    print(f"[DEBUG] Connected {input_name} -> {source_node_id} instance: {type(source_node_instance).__name__}")
            else:
                print(f"[ERROR] Source node {source_node_id} not found in registry")
                raise ValueError(f"Required input '{input_name}' not found")
        
        return connected

    def _process_processor_result(self, result: Any, state: FlowState, node_id: str) -> Any:
        """Process the result from a processor node"""
        # For processor nodes, if result is a Runnable, execute it with the user input
        if isinstance(result, Runnable):
            try:
                print(f"[DEBUG] Executing Runnable for {node_id} with input: {state.current_input}")
                # Execute the Runnable with the user input
                executed_result = result.invoke(state.current_input)
                print(f"[DEBUG] Runnable execution result: {executed_result}")
                return executed_result
            except Exception as e:
                print(f"[ERROR] Failed to execute Runnable for {node_id}: {e}")
                return {"error": str(e)}
        
        # For other types, ensure JSON-serializable
        try:
            import json
            json.dumps(result)  # type: ignore[arg-type]
            return result  # Already serializable
        except TypeError:
            return str(result)

    # ---------------- Control flow helpers -----------------
    def _add_control_flow_edges(self, graph: StateGraph):
        for node_id, info in self.control_flow_nodes.items():
            ctype: ControlFlowType = info["type"]  # type: ignore[arg-type]
            cdata = info["data"]
            if ctype == ControlFlowType.CONDITIONAL:
                self._add_conditional_routing(graph, node_id, cdata)
            elif ctype == ControlFlowType.LOOP:
                self._add_loop_logic(graph, node_id, cdata)
            elif ctype == ControlFlowType.PARALLEL:
                self._add_parallel_fanout(graph, node_id, cdata)

    def _add_conditional_routing(self, graph: StateGraph, node_id: str, cfg: Dict[str, Any]):
        outgoing = [c for c in self.connections if c.source_node_id == node_id]
        if len(outgoing) < 2:
            return

        cond_field = cfg.get("condition_field", "last_output")
        cond_type = cfg.get("condition_type", "contains")

        def route(state: FlowState) -> str:
            value = state.get_variable(cond_field, state.last_output)
            for conn in outgoing:
                branch_cfg = cfg.get(f"branch_{conn.target_node_id}", {})
                if self._evaluate_condition(value, branch_cfg, cond_type):
                    return conn.target_node_id
            return outgoing[0].target_node_id  # default

        graph.add_node(node_id, lambda s: s)  # dummy pass-through
        graph.add_conditional_edges(
            node_id,
            route,
            {c.target_node_id: c.target_node_id for c in outgoing},
        )

    def _add_loop_logic(self, graph: StateGraph, node_id: str, cfg: Dict[str, Any]):
        """Add a loop construct that repeats until a condition is met."""
        outgoing = [c for c in self.connections if c.source_node_id == node_id]
        if not outgoing:
            return

        max_iterations = cfg.get("max_iterations", 10)
        loop_condition = cfg.get("loop_condition", "continue")

        def should_continue(state: FlowState) -> str:
            iterations = state.get_variable(f"{node_id}_iterations", 0)
            if iterations >= max_iterations:
                return "exit"
            
            # Evaluate loop condition
            if loop_condition == "continue":
                return outgoing[0].target_node_id
            else:
                # Custom condition evaluation
                return "exit" if self._evaluate_condition(
                    state.last_output, cfg, "contains"
                ) else outgoing[0].target_node_id

        graph.add_node(node_id, lambda s: {**s, f"{node_id}_iterations": s.get_variable(f"{node_id}_iterations", 0) + 1})
        graph.add_conditional_edges(
            node_id,
            should_continue,
            {outgoing[0].target_node_id: outgoing[0].target_node_id, "exit": END},
        )

    def _add_parallel_fanout(self, graph: StateGraph, node_id: str, cfg: Dict[str, Any]):
        """Add a fan-out node that duplicates state to multiple branches."""
        outgoing = [c for c in self.connections if c.source_node_id == node_id]
        if not outgoing:
            return

        branch_ids = [c.target_node_id for c in outgoing]

        def fan_out(state: FlowState):  # noqa: D401
            # Return mapping of channel -> state to create parallel branches
            return {bid: state.copy() for bid in branch_ids}

        graph.add_node(node_id, fan_out)
        for bid in branch_ids:
            graph.add_edge(node_id, bid)

    def _evaluate_condition(self, value: Any, branch_cfg: Dict[str, Any], cond_type: str) -> bool:
        try:
            if cond_type == "contains":
                return str(branch_cfg.get("value", "")) in str(value)
            if cond_type == "equals":
                return str(value) == branch_cfg.get("value", "")
            if cond_type == "greater_than":
                return float(value) > float(branch_cfg.get("value", 0))
            if cond_type == "custom":
                return bool(eval(branch_cfg.get("expression", "False"), {"value": value}))
        except Exception:
            return False
        return False

    # ---------------- Regular edges & START/END ------------
    def _add_regular_edges(self, graph: StateGraph):
        print(f"[DEBUG] Adding regular edges:")
        
        # Group connections by target node to handle multi-input nodes properly
        target_groups = {}
        for c in self.connections:
            if c.source_node_id in self.control_flow_nodes:
                continue  # handled by control-flow
            if c.target_node_id not in target_groups:
                target_groups[c.target_node_id] = []
            target_groups[c.target_node_id].append(c.source_node_id)
        
        # Add edges, ensuring proper dependency order
        for target_node, source_nodes in target_groups.items():
            # NEW: Filter out connections to EndNode, as they are handled separately
            if target_node in self.end_nodes_for_connections:
                continue

            print(f"[DEBUG] Target {target_node} depends on: {source_nodes}")
            for source_node in source_nodes:
                print(f"[DEBUG]   {source_node} -> {target_node}")
                graph.add_edge(source_node, target_node)

    def _add_start_end_connections(self, graph: StateGraph):
        """
        Connects START to the nodes linked from StartNode,
        and connects nodes linked to EndNode to END.
        This method replaces the old auto-detection logic.
        """
        print("[DEBUG] Connecting START and END nodes based on explicit connections.")
        
        # 1. Connect START to the nodes that follow StartNode
        if not self.explicit_start_nodes:
            raise ValueError("StartNode is not connected to any other node.")
            
        for start_target_id in self.explicit_start_nodes:
            if start_target_id in self.nodes or start_target_id in self.control_flow_nodes:
                print(f"[DEBUG]   START -> {start_target_id}")
                graph.add_edge(START, start_target_id)
            elif start_target_id in self.end_nodes_for_connections:
                # Special case: StartNode connects directly to EndNode
                print(f"[DEBUG]   START -> END (via {start_target_id})")
                graph.add_edge(START, END)
            else:
                print(f"[WARNING] StartNode is connected to a non-existent node: {start_target_id}")

        # 2. Connect nodes that lead into an EndNode to the graph's END
        end_connections = [c for c in self.connections if c.target_node_id in getattr(self, 'end_nodes_for_connections', {})]
        
        if not end_connections:
            print("⚠️  No nodes connected to EndNode. Connecting all terminal nodes to END.")
            # Find terminal nodes (nodes that don't have outgoing connections to other regular nodes)
            all_targets = {c.target_node_id for c in self.connections if c.target_node_id in self.nodes}
            all_sources = {c.source_node_id for c in self.connections if c.source_node_id in self.nodes}
            terminal_nodes = all_sources - all_targets
            
            for terminal_node in terminal_nodes:
                if terminal_node in self.nodes:
                    print(f"[DEBUG]   {terminal_node} -> END (terminal node)")
                    graph.add_edge(terminal_node, END)
        else:
            end_source_ids = {conn.source_node_id for conn in end_connections}
            for end_source_id in end_source_ids:
                if end_source_id in self.nodes or end_source_id in self.control_flow_nodes:
                    print(f"[DEBUG]   {end_source_id} -> END")
                    graph.add_edge(end_source_id, END)
                else:
                    print(f"[WARNING] A non-existent node is connected to EndNode: {end_source_id}")

    def _connect_orphan_start_nodes(self, graph: StateGraph):
        # This method is now obsolete and will not be called.
        # Kept for reference, can be deleted later.
        pass

    # ------------------------------------------------------------------
    # Internal – Execution helpers
    # ------------------------------------------------------------------
    async def _execute_sync(self, init_state: FlowState, config: RunnableConfig) -> Dict[str, Any]:
        try:
            # Prefer async interface if implemented
            result_state = await self.graph.ainvoke(init_state, config=config)  # type: ignore[arg-type]
            # Convert FlowState to serializable format
            try:
                if hasattr(result_state, 'model_dump'):
                    state_dict = result_state.model_dump()
                else:
                    state_dict = {
                        "last_output": getattr(result_state, "last_output", ""),
                        "executed_nodes": getattr(result_state, "executed_nodes", []),
                        "node_outputs": getattr(result_state, "node_outputs", {}),
                        "session_id": getattr(result_state, "session_id", init_state.session_id)
                    }
            except Exception:
                # Fallback for non-serializable states
                state_dict = {
                    "last_output": str(result_state),
                    "executed_nodes": [],
                    "node_outputs": {},
                    "session_id": init_state.session_id
                }
            
            return {
                "success": True,
                "result": state_dict.get("last_output", ""),
                "state": state_dict,
                "executed_nodes": state_dict.get("executed_nodes", []),
                "session_id": state_dict.get("session_id", init_state.session_id),
            }
        except NotImplementedError:
            # Fallback to sync invoke in thread pool to avoid blocking
            import asyncio, functools
            loop = asyncio.get_event_loop()
            result_state = await loop.run_in_executor(
                None, functools.partial(self.graph.invoke, init_state, config=config)  # type: ignore[arg-type]
            )
            # Convert FlowState to serializable format
            try:
                if hasattr(result_state, 'model_dump'):
                    state_dict = result_state.model_dump()
                else:
                    state_dict = {
                        "last_output": getattr(result_state, "last_output", ""),
                        "executed_nodes": getattr(result_state, "executed_nodes", []),
                        "node_outputs": getattr(result_state, "node_outputs", {}),
                        "session_id": getattr(result_state, "session_id", init_state.session_id)
                    }
            except Exception:
                # Fallback for non-serializable states
                state_dict = {
                    "last_output": str(result_state),
                    "executed_nodes": [],
                    "node_outputs": {},
                    "session_id": init_state.session_id
                }
            
            return {
                "success": True,
                "result": state_dict.get("last_output", ""),
                "state": state_dict,
                "executed_nodes": state_dict.get("executed_nodes", []),
                "session_id": state_dict.get("session_id", init_state.session_id),
            }
        except Exception as e:
            return {"success": False, "error": str(e), "error_type": type(e).__name__, "session_id": init_state.session_id}

    def _make_serializable(self, obj):
        """Convert any object to a JSON-serializable format."""
        from datetime import datetime, date
        import uuid
        
        if obj is None or isinstance(obj, (bool, int, float, str)):
            return obj
        elif isinstance(obj, (datetime, date)):
            return obj.isoformat()
        elif isinstance(obj, uuid.UUID):
            return str(obj)
        elif isinstance(obj, (list, tuple)):
            return [self._make_serializable(item) for item in obj]
        elif isinstance(obj, dict):
            return {k: self._make_serializable(v) for k, v in obj.items()}
        elif hasattr(obj, 'model_dump'):
            try:
                return obj.model_dump()
            except Exception:
                return str(obj)
        else:
            return str(obj)

    async def _execute_stream(self, init_state: FlowState, config: RunnableConfig):
        try:
            yield {"type": "start", "session_id": init_state.session_id, "message": "Starting workflow execution"}
            async for ev in self.graph.astream_events(init_state, config=config):  # type: ignore[arg-type]
                # Make entire event serializable before processing
                ev = self._make_serializable(ev)
                
                ev_type = ev.get("event", "")
                if ev_type == "on_chain_start":
                    metadata = ev.get("data", {})
                    yield {"type": "node_start", "node_id": ev.get("name", "unknown"), "metadata": metadata}
                elif ev_type == "on_chain_end":
                    output_data = ev.get("data", {}).get("output", {})
                    yield {"type": "node_end", "node_id": ev.get("name", "unknown"), "output": output_data}
                elif ev_type == "on_llm_new_token":
                    yield {"type": "token", "content": ev.get("data", {}).get("chunk", "")}
                elif ev_type == "on_chain_error":
                    yield {"type": "error", "error": str(ev.get("data", {}).get("error", "Unknown error"))}
            final_state = await self.graph.aget_state(config)  # type: ignore[arg-type]
            print(f"[DEBUG] Final state: {final_state}")
            print(f"[DEBUG] Final state values: {getattr(final_state, 'values', 'No values')}")
            
            # Convert FlowState to serializable format using helper
            if hasattr(final_state, 'values') and final_state.values:
                state_values = final_state.values
                print(f"[DEBUG] State values type: {type(state_values)}")
                print(f"[DEBUG] State values keys: {list(state_values.keys()) if isinstance(state_values, dict) else 'Not a dict'}")
                
                # Handle both dict and object access patterns
                if isinstance(state_values, dict):
                    last_output = state_values.get("last_output", "")
                    executed_nodes = state_values.get("executed_nodes", [])
                    node_outputs = state_values.get("node_outputs", {})
                    session_id = state_values.get("session_id", init_state.session_id)
                else:
                    last_output = getattr(state_values, "last_output", "")
                    executed_nodes = getattr(state_values, "executed_nodes", [])
                    node_outputs = getattr(state_values, "node_outputs", {})
                    session_id = getattr(state_values, "session_id", init_state.session_id)
                
                print(f"[DEBUG] Extracted last_output: '{last_output}'")
                print(f"[DEBUG] Extracted executed_nodes: {executed_nodes}")
                print(f"[DEBUG] Extracted node_outputs: {node_outputs}")
                
                serializable_result = self._make_serializable({
                    "last_output": last_output,
                    "executed_nodes": executed_nodes,
                    "node_outputs": node_outputs,
                    "session_id": session_id
                })
            else:
                print("[DEBUG] No final state values found")
                serializable_result = {
                    "last_output": "",
                    "executed_nodes": [],
                    "node_outputs": {},
                    "session_id": init_state.session_id
                }
            
            complete_event = {
                "type": "complete",
                "result": serializable_result.get("last_output", ""),
                "executed_nodes": serializable_result.get("executed_nodes", []),
                "node_outputs": serializable_result.get("node_outputs", {}),
                "session_id": serializable_result.get("session_id", init_state.session_id),
            }
            print(f"🎯 Sending complete event: {complete_event}")
            yield complete_event
        except Exception as e:
            yield {"type": "error", "error": str(e), "error_type": type(e).__name__} 