"""
KAI-Fusion Node Architecture Foundation
=====================================

This module defines the fundamental architecture for all nodes in the KAI-Fusion platform.
It provides a sophisticated, type-safe, and highly extensible node system that seamlessly 
integrates with LangChain's ecosystem while adding enterprise-grade features.

Core Philosophy:
- Type Safety: Comprehensive type hints and Pydantic validation
- Extensibility: Abstract base classes with clear inheritance patterns  
- Composability: Seamless integration with LangChain Runnables
- Observability: Built-in tracing, logging, and state management
- Scalability: Designed for complex, multi-node workflow orchestration

Architecture Overview:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  ProviderNode   │    │ ProcessorNode   │    │ TerminatorNode  │
│                 │    │                 │    │                 │
│ • Creates LLMs  │    │ • Orchestrates  │    │ • Transforms    │
│ • Creates Tools │    │ • Composes      │    │ • Finalizes     │
│ • Creates Memory│    │ • Chains        │    │ • Outputs       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
                    ┌─────────────────┐
                    │    BaseNode     │
                    │                 │
                    │ • State Mgmt    │
                    │ • Type System   │
                    │ • LangGraph API │
                    │ • Error Handle  │
                    └─────────────────┘

Node Types Explained:
1. PROVIDER: Source nodes that create/provide LangChain objects (LLMs, Tools, Memory)
2. PROCESSOR: Orchestration nodes that combine multiple inputs (Agents, Chains)  
3. TERMINATOR: Output nodes that finalize/transform results (Parsers, Formatters)
4. MEMORY: Specialized nodes for conversation/context persistence

Key Features:
- Metadata-driven configuration with Pydantic validation
- Connection-aware input/output management
- LangGraph state compatibility for complex workflows
- Built-in error handling and graceful degradation
- LangSmith tracing integration for observability
- Type-safe input/output contracts

Authors: KAI-Fusion Development Team
Version: 2.0.0
License: Proprietary
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Union, Callable
from pydantic import BaseModel, Field, field_validator
from langchain_core.runnables import Runnable
from enum import Enum

# Import FlowState for LangGraph compatibility
from app.core.state import FlowState

# ================================================================================
# NODE TYPE CLASSIFICATION SYSTEM
# ================================================================================
class NodeType(str, Enum):
    """
    Comprehensive node type classification system for the KAI-Fusion platform.
    
    This enum defines the four fundamental node types that form the backbone of
    our workflow orchestration system. Each type has specific responsibilities,
    input/output contracts, and execution patterns.
    
    Design Rationale:
    - PROVIDER: Factory pattern - creates LangChain objects
    - PROCESSOR: Orchestrator pattern - combines multiple inputs  
    - TERMINATOR: Transformer pattern - finalizes output
    - MEMORY: Persistence pattern - manages conversation state
    """
    
    PROVIDER = "provider"
    """
    Factory Pattern Nodes
    
    Purpose: Create and configure LangChain objects from user inputs
    Characteristics:
    - Zero dependencies on other nodes
    - Pure configuration-to-object transformation
    - Stateless execution
    - High reusability across workflows
    
    Examples: OpenAI LLM, Tavily Search Tool, PGVector Store
    Input Sources: User configuration only (no node connections)
    Output Type: LangChain objects (Runnable, BaseTool, BaseRetriever)
    """
    
    PROCESSOR = "processor"  
    """
    Orchestrator Pattern Nodes
    
    Purpose: Combine and orchestrate multiple LangChain objects
    Characteristics:
    - Multi-input dependency management
    - Complex business logic orchestration
    - Stateful execution with memory
    - Context-aware processing
    
    Examples: ReactAgent, RetrievalQA Chain, Custom Workflows
    Input Sources: Connected nodes + user configuration
    Output Type: Composed Runnable or execution results
    """
    
    TERMINATOR = "terminator"
    """
    Transformer Pattern Nodes
    
    Purpose: Transform, format, or finalize workflow outputs
    Characteristics:
    - Single input focus (previous node output)
    - Output formatting and transformation
    - Result validation and sanitization
    - Chain termination logic
    
    Examples: JSON Parser, Text Formatter, Response Validator
    Input Sources: Previous node output + formatting rules
    Output Type: Formatted/transformed final results
    """
    
    MEMORY = "memory"
    """
    Persistence Pattern Nodes
    
    Purpose: Manage conversation state and context persistence
    Characteristics:
    - Session-aware state management
    - Conversation history persistence
    - Context injection capabilities
    - Multi-turn conversation support
    
    Examples: ConversationMemory, BufferMemory, VectorMemory
    Input Sources: Session context + memory configuration
    Output Type: Memory objects with conversation state
    """

# ================================================================================
# METADATA SYSTEM - TYPE-SAFE NODE CONFIGURATION
# ================================================================================

class NodeInput(BaseModel):
    """
    Comprehensive input specification for node configuration.
    
    This model defines the contract for node inputs, enabling type-safe configuration,
    validation, and automatic UI generation. It supports both user inputs (form fields)
    and connection inputs (from other nodes).
    
    Design Patterns:
    - Factory Pattern: User inputs create objects
    - Observer Pattern: Connection inputs receive data from other nodes
    - Validation Pattern: Type checking and constraint enforcement
    """
    
    name: str = Field(
        ...,
        description="Unique identifier for this input within the node",
        min_length=1,
        pattern=r"^[a-zA-ZçÇğĞıİöÖşŞüÜ_][a-zA-ZçÇğĞıİöÖşŞüÜ0-9_]*$"  # Valid Python identifier with Turkish characters
    )
    
    type: str = Field(
        ...,
        description="Expected data type (BaseLanguageModel, str, int, bool, etc.)"
    )
    
    description: str = Field(
        ...,
        description="Human-readable description for UI tooltips and documentation",
        min_length=10
    )
    
    required: bool = Field(
        default=True,
        description="Whether this input must be provided for node execution"
    )
    
    is_connection: bool = Field(
        default=False,
        description="True if input comes from node connections, False if from user form"
    )
    
    default: Any = Field(
        default=None,
        description="Default value used when input is not provided (only for non-required inputs)"
    )
    
    # Advanced input configuration
    validation_rules: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Custom validation rules (min, max, regex, choices, etc.)"
    )
    
    ui_config: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Frontend UI configuration (widget type, placeholder, etc.)"
    )
    
    @property
    def type_hint(self) -> str:
        """Backward compatibility property for type_hint."""
        return self.type

class NodeOutput(BaseModel):
    """
    Comprehensive output specification for node results.
    
    This model defines what a node produces, enabling type checking,
    automatic connection validation, and documentation generation.
    """
    
    name: str = Field(
        ...,
        description="Unique identifier for this output",
        pattern=r"^[a-zA-Z_][a-zA-Z0-9_]*$"
    )
    
    type: str = Field(
        ...,
        description="Output data type (str, BaseRetriever, Dict[str, Any], etc.)"
    )
    
    description: str = Field(
        ...,
        description="Human-readable description of what this output contains",
        min_length=10
    )
    
    # Optional output metadata
    format: Optional[str] = Field(
        default=None,
        description="Expected format (json, text, html, etc.)"
    )
    
    output_schema: Optional[Dict[str, Any]] = Field(
        default=None,
        description="JSON schema for structured outputs",
        alias="schema"  # Keep backward compatibility if needed
    )

class NodeMetadata(BaseModel):
    """
    Comprehensive metadata specification for complete node definition.
    
    This is the heart of the node system - it defines everything needed
    to understand, validate, execute, and display a node in the UI.
    
    Design Philosophy:
    - Self-Documenting: All information needed is contained here
    - Validation-First: Strict type checking and constraint enforcement
    - UI-Aware: Contains everything needed for automatic UI generation
    - Version-Safe: Structured for backward compatibility
    """
    
    # Core Identity
    name: str = Field(
        ...,
        description="Internal node identifier (must be unique per class)",
        pattern=r"^[A-Za-z][A-Za-z0-9]*$"  # PascalCase recommended
    )
    
    description: str = Field(
        ...,
        description="Comprehensive description of node functionality and use cases",
        min_length=20
    )
    
    display_name: Optional[str] = Field(
        default=None,
        description="Human-friendly name displayed in UI (auto-generated from name if not provided)"
    )
    
    # Visual Configuration
    icon: Optional[str] = Field(
        default=None,
        description="Icon identifier for UI display (from icon library)"
    )
    
    color: Optional[str] = Field(
        default=None,
        description="Hex color code for node visual theming (#RRGGBB)"
    )
    
    category: str = Field(
        default="Other",
        description="Category for node organization in UI (LLMs, Tools, Agents, etc.)"
    )
    
    # Type System
    node_type: NodeType = Field(
        ...,
        description="Fundamental node type determining execution pattern"
    )
    
    # Input/Output Contracts
    inputs: List[NodeInput] = Field(
        default_factory=list,
        description="Complete specification of all node inputs"
    )
    
    outputs: List[NodeOutput] = Field(
        default_factory=list,
        description="Complete specification of all node outputs"
    )
    
    # Advanced Configuration
    version: str = Field(
        default="1.0.0",
        description="Node version for compatibility tracking"
    )
    
    tags: List[str] = Field(
        default_factory=list,
        description="Tags for search and categorization"
    )
    
    documentation_url: Optional[str] = Field(
        default=None,
        description="URL to detailed documentation"
    )
    
    examples: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Usage examples with input/output samples"
    )

    @field_validator('display_name', mode='before')
    def default_display_name(cls, v, info):  # noqa: N805 – Pydantic validator signature
        """Provide a default display_name equal to the node *name* if omitted."""
        return v or info.data.get('name')

# ================================================================================
# BASE NODE ARCHITECTURE - THE FOUNDATION OF ALL NODES
# ================================================================================

class BaseNode(ABC):
    """
    The Foundation of KAI-Fusion's Node Architecture
    ===============================================
    
    This abstract base class defines the core contract and implementation for all nodes
    in the KAI-Fusion platform. It provides a sophisticated, enterprise-grade foundation
    that seamlessly integrates with LangChain's ecosystem while adding advanced features
    for complex workflow orchestration.
    
    ARCHITECTURAL PRINCIPLES:
    ========================
    
    1. **Type Safety First**: Every input/output is strictly typed and validated
    2. **State Management**: Full integration with LangGraph's FlowState system
    3. **Connection Awareness**: Sophisticated input/output connection management
    4. **Error Resilience**: Graceful error handling with detailed diagnostics
    5. **Observability**: Built-in tracing, logging, and performance monitoring
    6. **Composability**: Seamless LangChain Runnable integration
    7. **Extensibility**: Clear inheritance patterns for custom nodes
    
    EXECUTION FLOW:
    ==============
    
    1. **Initialization**: Node created with metadata and configuration
    2. **Connection Setup**: Input/output connections established by GraphBuilder
    3. **State Preparation**: FlowState provides execution context
    4. **Input Resolution**: User inputs and connected node outputs resolved
    5. **Execution**: Node-specific logic executed via execute() method
    6. **Result Processing**: Output processed and stored in state
    7. **Error Handling**: Any errors caught and handled gracefully
    
    STATE INTEGRATION:
    =================
    
    BaseNode integrates deeply with LangGraph's state management:
    - FlowState provides execution context and variable storage
    - Connection mappings track node relationships
    - Execution history maintains workflow progress
    - Error tracking enables debugging and recovery
    
    EXTENSIBILITY PATTERNS:
    ======================
    
    To create custom nodes, inherit from one of the specialized base classes:
    - ProviderNode: For creating LangChain objects (LLMs, Tools, etc.)
    - ProcessorNode: For orchestrating multiple inputs (Agents, Chains)
    - TerminatorNode: For finalizing outputs (Parsers, Formatters)
    
    Each pattern provides specific execution semantics optimized for its use case.
    
    EXAMPLE USAGE:
    =============
    
    ```python
    class CustomLLMNode(ProviderNode):
        def __init__(self):
            super().__init__()
            self._metadata = {
                "name": "CustomLLM",
                "description": "Custom language model provider",
                "category": "LLMs",
                "node_type": NodeType.PROVIDER,
                "inputs": [
                    NodeInput(name="api_key", type="str", description="API key for authentication"),
                    NodeInput(name="model", type="str", description="Model name to use"),
                ],
                "outputs": [
                    NodeOutput(name="llm", type="BaseLanguageModel", description="Configured LLM instance")
                ]
            }
        
        def execute(self, api_key: str, model: str) -> BaseLanguageModel:
            # Implementation here
            return configured_llm
    ```
    
    PERFORMANCE CONSIDERATIONS:
    ==========================
    
    - Metadata validation is cached to avoid repeated processing
    - State operations are optimized for large workflow graphs
    - Connection resolution uses efficient mapping structures
    - Error handling minimizes performance impact during normal execution
    
    THREAD SAFETY:
    =============
    
    BaseNode instances are NOT thread-safe by design. Each execution context
    should use separate node instances to avoid state corruption in concurrent
    environments.
    
    AUTHORS: KAI-Fusion Development Team
    VERSION: 2.0.0
    """
    _metadata: Dict[str, Any]  # Node configuration provided by subclasses
    
    # Class-level attribute declarations for linter
    node_id: Optional[str]
    context_id: Optional[str]
    session_id: Optional[str]
    _input_connections: Dict[str, Dict[str, str]]
    _output_connections: Dict[str, List[Dict[str, str]]]
    user_data: Dict[str, Any]
    
    def __init__(self):
        self.node_id = None  # Will be set by GraphBuilder
        self.context_id = None  # Credential context for provider
        self.session_id = None  # Session ID for conversation continuity
        # 🔥 NEW: Connection mappings set by GraphBuilder
        self._input_connections = {}
        self._output_connections = {}
        self.user_data = {}  # User configuration from frontend
    
    @property
    def metadata(self) -> NodeMetadata:
        """Metadatayı Pydantic modeline göre doğrular ve döndürür."""
        meta_dict = getattr(self, "_metadata", None) or {}
        if "name" not in meta_dict:
            meta_dict = getattr(self, "_metadatas", {})
        return NodeMetadata(**meta_dict)

    # ------------------------------------------------------------------
    # Graph-topology helpers
    # ------------------------------------------------------------------
    @property
    def edge_type(self) -> str:
        """Return edge behaviour hint provided by the frontend.

        Values: "normal" | "conditional" | "parallel" | "loop"
        Currently optional – GraphBuilder may detect control-flow via
        dedicated helper nodes, but exposing it here enables future
        fine-grained behaviours without new node classes.
        """
        meta = getattr(self, "_metadata", {})
        return meta.get("edge_type", "normal")

    @property
    def condition(self):  # noqa: D401 – simple accessors
        """Return condition details for conditional / loop edges, if any."""
        meta = getattr(self, "_metadata", {})
        return meta.get("condition")

    def execute(self, *args, **kwargs) -> Runnable:
        """Ana yürütme metodu.

        Yeni node'lar bu metodu override edebilir.  Geriye dönük uyumluluk için
        alt sınıf `execute` yerine `_execute` tanımlamışsa onu çağırırız.  Eğer
        hiçbiri yoksa `NotImplementedError` fırlatılır."""
        if hasattr(self, "_execute") and callable(getattr(self, "_execute")):
            # type: ignore[attr-defined]
            return getattr(self, "_execute")(*args, **kwargs)  # noqa: SLF001
        raise NotImplementedError(f"{self.__class__.__name__} must implement execute()")

    def to_graph_node(self) -> Callable[[FlowState], Dict[str, Any]]:
        """
        Convert this node to a LangGraph-compatible function
        This method transforms the node into a function that takes and returns FlowState
        """
        def graph_node_function(state: FlowState) -> Dict[str, Any]:  # noqa: D401
            try:
                # Merge user configuration into state variables
                for key, value in self.user_data.items():
                    state.set_variable(key, value)
                
                # Get node metadata for input processing
                metadata = self.metadata
                node_id = getattr(self, 'node_id', f"{self.__class__.__name__}_{id(self)}")
                
                # Prepare inputs based on node type and connections
                if self.metadata.node_type == NodeType.PROVIDER:
                    # Provider nodes create objects from user inputs only
                    inputs = self._extract_user_inputs(state, metadata.inputs)
                    result = self.execute(**inputs)
                    
                elif self.metadata.node_type == NodeType.PROCESSOR:
                    # Processor nodes need both connected nodes and user inputs
                    user_inputs = self._extract_user_inputs(state, metadata.inputs)
                    connected_nodes = self._extract_connected_inputs(state, metadata.inputs)
                    
                    # Log connection details for debugging
                    print(f"[DEBUG] Processor {node_id} - User inputs: {list(user_inputs.keys())}")
                    print(f"[DEBUG] Processor {node_id} - Connected inputs: {list(connected_nodes.keys())}")
                    
                    result = self.execute(inputs=user_inputs, connected_nodes=connected_nodes)
                    
                elif self.metadata.node_type == NodeType.TERMINATOR:
                    # Terminator nodes process previous node output
                    connected_inputs = self._extract_connected_inputs(state, metadata.inputs)
                    user_inputs = self._extract_user_inputs(state, metadata.inputs)
                    
                    # Get the primary input from connections
                    previous_node = None
                    if connected_inputs:
                        # Get the first connected input as the primary input
                        previous_node = list(connected_inputs.values())[0]
                    
                    result = self.execute(previous_node=previous_node, inputs=user_inputs)
                    
                else:
                    # Fallback for unknown node types
                    inputs = self._extract_all_inputs(state, metadata.inputs)
                    result = self.execute(**inputs)
                
                # Handle different result types
                processed_result = self._process_execution_result(result, state)
                
                # Store the result in state using unique key
                unique_output_key = f"output_{node_id}"

                # Update execution tracking
                updated_executed_nodes = state.executed_nodes.copy()
                if node_id not in updated_executed_nodes:
                    updated_executed_nodes.append(node_id)

                return {
                    unique_output_key: processed_result,
                    "executed_nodes": updated_executed_nodes,
                    "last_output": str(processed_result)
                }
                
            except Exception as e:
                # Handle errors gracefully
                error_msg = f"Error in {self.__class__.__name__} ({node_id}): {str(e)}"
                print(f"[ERROR] {error_msg}")
                state.add_error(error_msg)
                return {
                    "errors": state.errors,
                    "last_output": f"ERROR: {error_msg}"
                }
        
        return graph_node_function
    
    def _process_execution_result(self, result: Any, state: FlowState) -> Any:
        """Process the execution result based on node type"""
        # For provider nodes, keep the raw result (LLM, Tool, etc.)
        if self.metadata.node_type == NodeType.PROVIDER:
            return result
        
        # For non-provider nodes, if result is a Runnable, execute it
        if isinstance(result, Runnable):
            try:
                # Try to invoke with current input
                invoke_input = state.current_input or state.last_output or ""
                if isinstance(invoke_input, str):
                    invoke_input = {"input": invoke_input}
                elif not isinstance(invoke_input, dict):
                    invoke_input = {"input": str(invoke_input)}
                
                executed_result = result.invoke(invoke_input)
                return executed_result
            except Exception as e:
                return f"Runnable execution error: {str(e)}"
        
        # For other types, ensure JSON-serializable
        try:
            import json
            json.dumps(result)  # type: ignore[arg-type]
            return result  # Already serializable
        except TypeError:
            return str(result)
    
    def _extract_user_inputs(self, state: FlowState, input_specs: List[NodeInput]) -> Dict[str, Any]:
        """Extract user-provided inputs from state and user_data"""
        inputs = {}
        
        for input_spec in input_specs:
            if not input_spec.is_connection:
                # Check user_data first (from frontend form)
                if input_spec.name in self.user_data:
                    inputs[input_spec.name] = self.user_data[input_spec.name]
                # Then check state variables
                elif input_spec.name in state.variables:
                    inputs[input_spec.name] = state.get_variable(input_spec.name)
                # Use default if available
                elif input_spec.default is not None:
                    inputs[input_spec.name] = input_spec.default
                # Check if required
                elif input_spec.required:
                    # For special input names, try to get from state
                    if input_spec.name == "input":
                        inputs[input_spec.name] = state.current_input or ""
                    else:
                        raise ValueError(f"Required input '{input_spec.name}' not found")
        
        return inputs
    
    def _extract_connected_inputs(self, state: FlowState, input_specs: List[NodeInput]) -> Dict[str, Any]:
        """Extract connected node inputs from state using connection mappings"""
        connected = {}

        for input_spec in input_specs:
            if input_spec.is_connection:
                # Use connection mapping if available
                if input_spec.name in self._input_connections:
                    connection_info = self._input_connections[input_spec.name]
                    source_node_id = connection_info.get("source_node_id")
                    output_key = f"output_{source_node_id}"
                    
                    # Debug output to see what's in state
                    print(f"[DEBUG] EndNode looking for output_key: {output_key}")
                    print(f"[DEBUG] Available state variables: {list(state.variables.keys())}")
                    print(f"[DEBUG] State.last_output: {state.last_output}")
                    
                    # Check multiple possible locations for the output
                    found_output = None
                    
                    # 1. Check if it's a dynamic attribute on the state (Pydantic extra fields)
                    if hasattr(state, output_key):
                        found_output = getattr(state, output_key)
                        print(f"[DEBUG] Found as state attribute: {found_output}")
                    
                    # 2. Check state variables
                    elif output_key in state.variables:
                        found_output = state.get_variable(output_key)
                        print(f"[DEBUG] Found in state.variables: {found_output}")
                    
                    # 3. Check node_outputs if available
                    elif hasattr(state, 'node_outputs') and source_node_id in state.node_outputs:
                        node_output = state.node_outputs[source_node_id]
                        if isinstance(node_output, dict) and 'output' in node_output:
                            found_output = node_output['output']
                        else:
                            found_output = node_output
                        print(f"[DEBUG] Found in node_outputs: {found_output}")
                    
                    # 4. Use the state's built-in get_node_output method
                    elif hasattr(state, 'get_node_output'):
                        try:
                            found_output = state.get_node_output(source_node_id)
                            if found_output is not None:
                                print(f"[DEBUG] Found via get_node_output: {found_output}")
                        except:
                            pass
                    
                    # 5. Fallback: use last_output if it's from the expected source node
                    if found_output is None and state.last_output:
                        # Check if the last executed node matches our source
                        if (hasattr(state, 'executed_nodes') and state.executed_nodes and
                            state.executed_nodes[-1] == source_node_id):
                            found_output = state.last_output
                            print(f"[DEBUG] Using last_output as fallback: {found_output}")
                    
                    if found_output is not None:
                        connected[input_spec.name] = found_output
                        print(f"[DEBUG] Connected input {input_spec.name} = '{str(found_output)[:100]}...'")
                    elif input_spec.required:
                        # Enhanced error message with more debugging info
                        error_msg = (
                            f"Required connected input '{input_spec.name}' from node '{source_node_id}' not found. "
                            f"Checked locations: dynamic attribute ({output_key}), state.variables, "
                            f"node_outputs, get_node_output method. Available in state: "
                            f"variables={list(state.variables.keys())}, "
                            f"last_output={'Yes' if state.last_output else 'No'}, "
                            f"executed_nodes={getattr(state, 'executed_nodes', [])}"
                        )
                        print(f"[ERROR] {error_msg}")
                        # Don't raise error, use fallback instead
                        if state.last_output:
                            connected[input_spec.name] = state.last_output
                            print(f"[DEBUG] Using last_output as emergency fallback for {input_spec.name}")
                elif input_spec.required:
                    raise ValueError(f"Connection info for required input '{input_spec.name}' not found.")
        
        return connected
    
    def _get_previous_node_output(self, state: FlowState) -> Any:
        """Get the most recent node output for terminator nodes"""
        if self._input_connections:
            # Use specific connection if available
            first_connection = list(self._input_connections.values())[0]
            source_node_id = first_connection["source_node_id"]
            return state.get_node_output(source_node_id)
        elif state.executed_nodes:
            # Fallback to last executed node
            last_node_id = state.executed_nodes[-1]
            return state.get_node_output(last_node_id)
        return None
    
    def _extract_all_inputs(self, state: FlowState, input_specs: List[NodeInput]) -> Dict[str, Any]:
        """Extract all inputs (user + connected) for fallback cases"""
        inputs = {}
        inputs.update(self._extract_user_inputs(state, input_specs))
        inputs.update(self._extract_connected_inputs(state, input_specs))
        return inputs
    
    def get_output_type(self) -> str:
        """Return the node's primary output type, if defined."""
        outputs = self.metadata.outputs
        if outputs:
            return outputs[0].type
        return "any"
    
    def validate_input(self, input_name: str, input_value: Any) -> bool:
        """Validate if an input value is acceptable"""
        # Override in subclasses for custom validation
        return True
    
    def as_runnable(self) -> "Runnable":
        """
        Convert node to LangChain Runnable for direct composition.
        
        Returns:
            RunnableLambda that executes this node
        """
        from langchain_core.runnables import RunnableLambda, RunnableConfig
        import os
        
        # LangSmith tracing configuration
        ENABLE_TRACING = bool(os.getenv("LANGCHAIN_TRACING_V2", ""))
        run_config = RunnableConfig(run_name=self.__class__.__name__) if ENABLE_TRACING else None
        
        def node_runner(params):
            """Execute node with parameters."""
            if hasattr(self, 'execute'):
                # Handle different node types
                if self.metadata.node_type == NodeType.PROCESSOR:
                    # Processor nodes need inputs and connected_nodes
                    inputs = params.get('inputs', {})
                    connected_nodes = params.get('connected_nodes', {})
                    return self.execute(inputs=inputs, connected_nodes=connected_nodes)
                else:
                    # Provider and Terminator nodes use **kwargs pattern
                    return self.execute(**params)
            else:
                raise NotImplementedError(f"{self.__class__.__name__} must implement execute()")
        
        runnable = RunnableLambda(node_runner, name=self.__class__.__name__)
        
        if run_config:
            runnable = runnable.with_config(run_config)
        
        return runnable

# 4. Geliştiricilerin Kullanacağı 3 Standart Node Sınıfı

class ProviderNode(BaseNode):
    """
    Sıfırdan bir LangChain nesnesi (LLM, Tool, Prompt, Memory) oluşturan node'lar için temel sınıf.
    """
    _metadata = {
        "name": "ProviderNode",
        "description": "Base class for nodes that provide objects.",
        "node_type": NodeType.PROVIDER,
    }
    def __init__(self):
        super().__init__()
        if not hasattr(self, '_metadata'):
            self._metadata = {}
        if "node_type" not in self._metadata:
            self._metadata["node_type"] = NodeType.PROVIDER

    # Subclasses can override execute; fallback implemented in BaseNode
    def execute(self, **kwargs) -> Runnable:  # type: ignore[override]
        return super().execute(**kwargs)


class ProcessorNode(BaseNode):
    """
    Birden fazla LangChain nesnesini girdi olarak alıp birleştiren node'lar (örn: Agent).
    """
    _metadata = {
        "name": "ProcessorNode",
        "description": "Base class for nodes that process inputs.",
        "node_type": NodeType.PROCESSOR,
    }
    def __init__(self):
        super().__init__()
        if not hasattr(self, '_metadata'):
            self._metadata = {}
        if "node_type" not in self._metadata:
            self._metadata["node_type"] = NodeType.PROCESSOR
    
    def execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Runnable]) -> Runnable:  # type: ignore[override]
        return super().execute(inputs=inputs, connected_nodes=connected_nodes)

class TerminatorNode(BaseNode):
    """
    Bir zincirin sonuna eklenen ve çıktıyı işleyen/dönüştüren node'lar (örn: OutputParser).
    Genellikle tek bir node'dan girdi alırlar.
    """
    _metadata = {
        "name": "TerminatorNode",
        "description": "Base class for nodes that terminate chains.",
        "node_type": NodeType.TERMINATOR,
    }
    def __init__(self):
        super().__init__()
        if not hasattr(self, '_metadata'):
            self._metadata = {}
        if "node_type" not in self._metadata:
            self._metadata["node_type"] = NodeType.TERMINATOR

    def execute(self, previous_node: Runnable, inputs: Dict[str, Any]) -> Runnable:  # type: ignore[override]
        return super().execute(previous_node=previous_node, inputs=inputs)


class MemoryNode(BaseNode):
    """
    Base class for nodes that manage conversation state and context.
    They are responsible for creating and handling memory objects.
    """
    _metadata = {
        "name": "MemoryNode",
        "description": "Base class for nodes that manage memory.",
        "node_type": NodeType.MEMORY,
    }

    def __init__(self):
        super().__init__()
        if not hasattr(self, '_metadata'):
            self._metadata = {}
        if "node_type" not in self._metadata:
            self._metadata["node_type"] = NodeType.MEMORY
        
        # Define standard inputs common to all memory nodes
        self._standard_inputs = [
            NodeInput(
                name="session_id",
                type="str",
                description="Unique identifier for the conversation session.",
                required=False,
                is_connection=False
            ),
            NodeInput(
                name="memory_key",
                type="str",
                description="The key for the memory variable in the chain.",
                default="history",
                required=False
            )
        ]
    
    # MemoryNode subclasses will implement their own `execute` method
    # to create and configure the specific LangChain memory object.
    pass
