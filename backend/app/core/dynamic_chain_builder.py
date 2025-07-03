from typing import Dict, Any, List, Optional, Union, Type
from dataclasses import dataclass
from enum import Enum
import inspect

from langchain_core.runnables import Runnable, RunnablePassthrough, RunnableLambda
from langchain_core.prompts import BasePromptTemplate
from langchain_core.language_models import BaseLanguageModel
from langchain_core.tools import BaseTool
from langchain_core.memory import BaseMemory
from langchain.chains import LLMChain, SequentialChain
from langchain.agents import AgentExecutor

@dataclass
class NodeConnection:
    """Represents a connection between nodes"""
    source_node_id: str
    source_handle: str
    target_node_id: str
    target_handle: str
    data_type: str = "any"

@dataclass
class NodeInstance:
    """Represents an instantiated node"""
    id: str
    type: str
    instance: Any
    metadata: Dict[str, Any]
    inputs: Dict[str, Any]
    outputs: Dict[str, Any]

class DataType(Enum):
    """Supported data types for connections"""
    LLM = "llm"
    PROMPT = "prompt"
    TOOL = "tool"
    TOOLS = "tools"
    MEMORY = "memory"
    TEXT = "text"
    CHAIN = "chain"
    AGENT = "agent"
    DOCUMENT = "document"
    VECTOR_STORE = "vector_store"
    ANY = "any"

class DynamicChainBuilder:
    """
    Builds executable LangChain objects from frontend workflow definitions
    """
    
    def __init__(self, node_registry: Dict[str, Type]):
        self.node_registry = node_registry
        self.nodes: Dict[str, NodeInstance] = {}
        self.connections: List[NodeConnection] = []
        self.execution_graph: Dict[str, List[str]] = {}
        
    def build_from_flow(self, flow_data: Dict[str, Any]) -> Runnable:
        """
        Main entry point: converts ReactFlow data to executable chain
        """
        nodes = flow_data.get("nodes", [])
        edges = flow_data.get("edges", [])
        
        # Reset state
        self.nodes.clear()
        self.connections.clear()
        self.execution_graph.clear()
        
        # Phase 1: Parse connections
        self._parse_connections(edges)
        
        # Phase 2: Instantiate nodes in dependency order
        self._instantiate_nodes(nodes)
        
        # Phase 3: Wire connections
        self._wire_connections()
        
        # Phase 4: Find and return the final executable
        return self._get_final_executable()
    
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
            
            # Build execution graph
            if connection.target_node_id not in self.execution_graph:
                self.execution_graph[connection.target_node_id] = []
            self.execution_graph[connection.target_node_id].append(connection.source_node_id)
    
    def _instantiate_nodes(self, nodes: List[Dict[str, Any]]):
        """Instantiate nodes based on their dependencies"""
        # Topological sort
        sorted_nodes = self._topological_sort(nodes)
        
        for node_data in sorted_nodes:
            node_id = node_data["id"]
            node_type = node_data["type"]
            user_inputs = node_data.get("data", {})
            
            # Get node class
            node_class = self.node_registry.get(node_type)
            if not node_class:
                raise ValueError(f"Unknown node type: {node_type}")
            
            # Create instance
            node_instance = node_class()
            
            # Prepare inputs
            inputs = self._prepare_node_inputs(node_id, node_instance, user_inputs)
            
            # Execute node to get output
            output = self._execute_node(node_instance, inputs)
            
            # Store node instance
            self.nodes[node_id] = NodeInstance(
                id=node_id,
                type=node_type,
                instance=node_instance,
                metadata=node_instance.metadata.__dict__,
                inputs=inputs,
                outputs={"output": output}
            )
            
            print(f"✅ Instantiated node: {node_id} ({node_type})")
    
    def _prepare_node_inputs(self, node_id: str, node_instance: Any, user_inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare inputs for a node, including connected inputs"""
        prepared_inputs = {}
        metadata = node_instance.metadata
        
        # Get connections to this node
        incoming_connections = [c for c in self.connections if c.target_node_id == node_id]
        
        # Process each input defined in metadata
        for input_spec in metadata.inputs:
            input_name = input_spec.name
            
            # Check if this input comes from a connection
            connection = next(
                (c for c in incoming_connections if c.target_handle == input_name),
                None
            )
            
            if connection and connection.source_node_id in self.nodes:
                # Get output from connected node
                source_node = self.nodes[connection.source_node_id]
                prepared_inputs[input_name] = source_node.outputs.get(
                    connection.source_handle, 
                    source_node.outputs.get("output")
                )
            elif input_name in user_inputs:
                # Use user-provided input
                prepared_inputs[input_name] = user_inputs[input_name]
            elif input_spec.default is not None:
                # Use default value
                prepared_inputs[input_name] = input_spec.default
            elif input_spec.required:
                raise ValueError(f"Required input '{input_name}' not provided for node {node_id}")
        
        return prepared_inputs
    
    def _execute_node(self, node_instance: Any, inputs: Dict[str, Any]) -> Any:
        """Execute a node with prepared inputs"""
        from nodes.base import ProviderNode, ProcessorNode, TerminatorNode
        
        if isinstance(node_instance, ProviderNode):
            # Provider nodes create objects from scratch
            return node_instance.execute(**inputs)
            
        elif isinstance(node_instance, ProcessorNode):
            # Processor nodes combine multiple inputs
            # Separate connected nodes from regular inputs
            connected_nodes = {}
            user_inputs = {}
            
            for key, value in inputs.items():
                if isinstance(value, (Runnable, BaseTool, BaseMemory, BasePromptTemplate)):
                    connected_nodes[key] = value
                else:
                    user_inputs[key] = value
            
            return node_instance.execute(
                inputs=user_inputs,
                connected_nodes=connected_nodes
            )
            
        elif isinstance(node_instance, TerminatorNode):
            # Terminator nodes process output from previous node
            # Find the main input (usually the first connected runnable)
            previous_node = None
            other_inputs = {}
            
            for key, value in inputs.items():
                if isinstance(value, Runnable) and previous_node is None:
                    previous_node = value
                else:
                    other_inputs[key] = value
            
            if previous_node is None:
                raise ValueError(f"TerminatorNode requires a previous node connection")
            
            return node_instance.execute(
                previous_node=previous_node,
                inputs=other_inputs
            )
        else:
            # Fallback for custom nodes
            return node_instance.execute(**inputs)
    
    def _wire_connections(self):
        """Wire up connections between nodes"""
        # This is handled during node instantiation
        # But we can add post-processing here if needed
        pass
    
    def _get_final_executable(self) -> Runnable:
        """Find and return the final executable node"""
        # Find nodes with no outgoing connections
        source_nodes = {c.source_node_id for c in self.connections}
        target_nodes = {c.target_node_id for c in self.connections}
        
        final_nodes = []
        for node_id, node in self.nodes.items():
            if node_id not in source_nodes:
                final_nodes.append(node)
        
        if not final_nodes:
            # If no clear final node, return the last instantiated node
            final_nodes = [list(self.nodes.values())[-1]]
        
        if len(final_nodes) > 1:
            # Multiple endpoints - create a combined chain
            return self._create_combined_chain(final_nodes)
        
        # Return the output of the final node
        final_output = final_nodes[0].outputs.get("output")
        
        # Wrap in a runnable if needed
        if not isinstance(final_output, Runnable):
            final_output = RunnableLambda(lambda x: final_output)
        
        return final_output
    
    def _create_combined_chain(self, nodes: List[NodeInstance]) -> Runnable:
        """Create a combined chain from multiple endpoints"""
        chains = []
        for node in nodes:
            output = node.outputs.get("output")
            if isinstance(output, Runnable):
                chains.append(output)
        
        if len(chains) == 1:
            return chains[0]
        
        # Create a parallel execution chain
        return RunnablePassthrough.assign(
            **{f"output_{i}": chain for i, chain in enumerate(chains)}
        )
    
    def _topological_sort(self, nodes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Sort nodes in dependency order"""
        from collections import deque
        
        # Create node lookup
        node_map = {node["id"]: node for node in nodes}
        
        # Calculate in-degrees
        in_degree = {node["id"]: 0 for node in nodes}
        for target, sources in self.execution_graph.items():
            if target in in_degree:
                in_degree[target] = len(sources)
        
        # Find nodes with no dependencies
        queue = deque([node_id for node_id, degree in in_degree.items() if degree == 0])
        sorted_nodes = []
        
        while queue:
            current_id = queue.popleft()
            sorted_nodes.append(node_map[current_id])
            
            # Reduce in-degree for dependent nodes
            for target, sources in self.execution_graph.items():
                if current_id in sources:
                    in_degree[target] -= 1
                    if in_degree[target] == 0:
                        queue.append(target)
        
        if len(sorted_nodes) != len(nodes):
            raise ValueError("Workflow contains circular dependencies!")
        
        return sorted_nodes
