from typing import Dict, Any, List, Optional, Callable, Type
from dataclasses import dataclass
from enum import Enum
import uuid

from langgraph.graph import StateGraph, START, END
from langgraph.graph.state import CompiledStateGraph
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.runnables import Runnable

from app.core.state import FlowState
from app.nodes.base import BaseNode
from app.core.checkpointer import postgres_checkpointer


@dataclass
class NodeConnection:
    """Represents a connection between nodes"""
    source_node_id: str
    source_handle: str
    target_node_id: str
    target_handle: str
    data_type: str = "any"


@dataclass 
class GraphNodeInstance:
    """Represents an instantiated node in the graph"""
    id: str
    type: str
    node_instance: BaseNode
    metadata: Dict[str, Any]
    user_data: Dict[str, Any]  # Data provided by user in the frontend


class GraphBuilder:
    """
    Builds executable LangGraph objects from frontend workflow definitions
    This replaces the old DynamicChainBuilder with modern LangGraph capabilities
    """
    
    def __init__(self, node_registry: Dict[str, Type[BaseNode]], checkpointer=None):
        self.node_registry = node_registry
        self.checkpointer = checkpointer or postgres_checkpointer
        self.nodes: Dict[str, GraphNodeInstance] = {}
        self.connections: List[NodeConnection] = []
        self.graph: Optional[StateGraph] = None
        
    def build_from_flow(self, flow_data: Dict[str, Any]) -> StateGraph:
        """
        Main entry point: converts ReactFlow data to executable LangGraph
        """
        nodes = flow_data.get("nodes", [])
        edges = flow_data.get("edges", [])
        
        # Reset state
        self.nodes.clear()
        self.connections.clear()
        
        # Phase 1: Parse connections
        self._parse_connections(edges)
        
        # Phase 2: Instantiate nodes
        self._instantiate_nodes(nodes)
        
        # Phase 3: Build LangGraph
        graph = self._build_langgraph()
        
        self.graph = graph
        return graph
    
    def _parse_connections(self, edges: List[Dict[str, Any]]):
        """Parse ReactFlow edges into NodeConnection objects"""
        for edge in edges:
            connection = NodeConnection(
                source_node_id=edge["source"],
                source_handle=edge.get("sourceHandle", "output"),
                target_node_id=edge["target"],
                target_handle=edge.get("targetHandle", "input")
            )
            self.connections.append(connection)
    
    def _instantiate_nodes(self, nodes: List[Dict[str, Any]]):
        """Instantiate all nodes from the flow definition"""
        for node_data in nodes:
            node_id = node_data["id"]
            node_type = node_data["type"]
            user_data = node_data.get("data", {})
            
            # Get node class from registry
            node_class = self.node_registry.get(node_type)
            if not node_class:
                raise ValueError(f"Unknown node type: {node_type}")
            
            # Create instance
            node_instance = node_class()
            
            # Set node_id attribute for graph function identification
            node_instance.node_id = node_id
            
            # Store node instance
            self.nodes[node_id] = GraphNodeInstance(
                id=node_id,
                type=node_type,
                node_instance=node_instance,
                metadata=node_instance.metadata.model_dump(),
                user_data=user_data
            )
            
            print(f"✅ Instantiated node: {node_id} ({node_type})")
    
    def _build_langgraph(self) -> StateGraph:
        """Build the actual LangGraph from instantiated nodes"""
        # Create graph with FlowState
        graph = StateGraph(FlowState)
        
        # Add nodes to graph
        for node_id, graph_node in self.nodes.items():
            node_function = graph_node.node_instance.to_graph_node()
            
            # Create a wrapper function that includes user data setup
            def create_node_wrapper(node_id: str, user_data: Dict[str, Any], node_func: Callable):
                def wrapper_function(state: FlowState) -> FlowState:
                    # Set user-provided variables in state before executing node
                    for key, value in user_data.items():
                        state.set_variable(key, value)
                    
                    # Execute the actual node function
                    return node_func(state)
                return wrapper_function
            
            wrapped_function = create_node_wrapper(node_id, graph_node.user_data, node_function)
            graph.add_node(node_id, wrapped_function)
        
        # Add edges between nodes
        self._add_graph_edges(graph)
        
        # Add START and END connections
        self._add_start_end_connections(graph)
        
        # Compile the graph with checkpointer
        compiled_graph = graph.compile(checkpointer=self.checkpointer)
        
        return compiled_graph
    
    def _add_graph_edges(self, graph: StateGraph):
        """Add edges between nodes in the graph"""
        for connection in self.connections:
            source_id = connection.source_node_id
            target_id = connection.target_node_id
            
            # Simple edge - can be enhanced later for conditional routing
            graph.add_edge(source_id, target_id)
    
    def _add_start_end_connections(self, graph: StateGraph):
        """Add START and END connections to the graph"""
        # Find start nodes (nodes with no incoming connections)
        target_nodes = {conn.target_node_id for conn in self.connections}
        start_nodes = []
        
        for node_id in self.nodes.keys():
            if node_id not in target_nodes:
                start_nodes.append(node_id)
        
        # If no clear start nodes, use the first node
        if not start_nodes and self.nodes:
            start_nodes = [list(self.nodes.keys())[0]]
        
        # Connect START to start nodes
        for start_node in start_nodes:
            graph.add_edge(START, start_node)
        
        # Find end nodes (nodes with no outgoing connections)
        source_nodes = {conn.source_node_id for conn in self.connections}
        end_nodes = []
        
        for node_id in self.nodes.keys():
            if node_id not in source_nodes:
                end_nodes.append(node_id)
        
        # If no clear end nodes, use the last node
        if not end_nodes and self.nodes:
            end_nodes = [list(self.nodes.keys())[-1]]
        
        # Connect end nodes to END
        for end_node in end_nodes:
            graph.add_edge(end_node, END)
    
    def add_conditional_edge(
        self, 
        source_node: str, 
        condition_func: Callable[[FlowState], str],
        condition_map: Dict[str, str]
    ):
        """
        Add conditional edge for advanced control flow
        This enables if/else logic and routing based on state
        """
        if self.graph:
            self.graph.add_conditional_edges(
                source_node,
                condition_func,
                condition_map
            )
    
    def validate_graph(self) -> Dict[str, Any]:
        """Validate the built graph for common issues"""
        errors = []
        warnings = []
        
        # Check for orphaned nodes
        connected_nodes = set()
        for conn in self.connections:
            connected_nodes.add(conn.source_node_id)
            connected_nodes.add(conn.target_node_id)
        
        orphaned = set(self.nodes.keys()) - connected_nodes
        if orphaned:
            warnings.append(f"Orphaned nodes found: {list(orphaned)}")
        
        # Check for missing node references in connections
        for conn in self.connections:
            if conn.source_node_id not in self.nodes:
                errors.append(f"Source node '{conn.source_node_id}' not found")
            if conn.target_node_id not in self.nodes:
                errors.append(f"Target node '{conn.target_node_id}' not found")
        
        # Check for circular dependencies (basic check)
        if self._has_circular_dependency():
            errors.append("Circular dependency detected in graph")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "node_count": len(self.nodes),
            "edge_count": len(self.connections)
        }
    
    def _has_circular_dependency(self) -> bool:
        """Simple circular dependency check using DFS"""
        # Build adjacency list
        adj_list = {}
        for node_id in self.nodes.keys():
            adj_list[node_id] = []
        
        for conn in self.connections:
            if conn.source_node_id in adj_list:
                adj_list[conn.source_node_id].append(conn.target_node_id)
        
        # DFS to detect cycles
        visited = set()
        rec_stack = set()
        
        def has_cycle(node):
            visited.add(node)
            rec_stack.add(node)
            
            for neighbor in adj_list.get(node, []):
                if neighbor not in visited:
                    if has_cycle(neighbor):
                        return True
                elif neighbor in rec_stack:
                    return True
            
            rec_stack.remove(node)
            return False
        
        for node_id in self.nodes.keys():
            if node_id not in visited:
                if has_cycle(node_id):
                    return True
        
        return False
    
    async def execute(
        self, 
        inputs: Dict[str, Any],
        session_id: Optional[str] = None,
        user_id: Optional[str] = None,
        workflow_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Execute the built graph with given inputs
        """
        if not self.graph:
            raise ValueError("No graph built. Call build_from_flow first.")
        
        # Create initial state
        initial_state = FlowState(
            current_input=inputs.get("input", ""),
            session_id=session_id or str(uuid.uuid4()),
            user_id=user_id,
            workflow_id=workflow_id,
            variables=inputs
        )
        
        try:
            # Execute graph
            config = {"thread_id": initial_state.session_id}
            result = await self.graph.ainvoke(initial_state, config=config)
            
            return {
                "success": True,
                "result": result.last_output,
                "state": result.to_dict(),
                "executed_nodes": result.executed_nodes,
                "session_id": result.session_id
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "error_type": type(e).__name__,
                "session_id": initial_state.session_id
            }
    
    async def continue_execution(
        self,
        session_id: str,
        additional_inputs: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Continue execution from a saved state (useful for human-in-the-loop scenarios)
        """
        if not self.graph:
            raise ValueError("No graph built.")
        
        try:
            config = {"thread_id": session_id}
            
            # Get current state
            current_state = await self.graph.aget_state(config)
            
            if additional_inputs:
                # Update state with new inputs
                for key, value in additional_inputs.items():
                    current_state.values.set_variable(key, value)
            
            # Continue execution
            result = await self.graph.ainvoke(current_state.values, config=config)
            
            return {
                "success": True,
                "result": result.last_output,
                "state": result.to_dict(),
                "session_id": session_id
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "error_type": type(e).__name__,
                "session_id": session_id
            } 