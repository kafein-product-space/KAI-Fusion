from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Union, Callable
from pydantic import BaseModel, Field, field_validator
from langchain_core.runnables import Runnable
from enum import Enum

# Import FlowState for LangGraph compatibility
from app.core.state import FlowState

# 1. Node'un türünü belirten bir Enum tanımlıyoruz.
class NodeType(str, Enum):
    PROVIDER = "provider"    # Bir LangChain nesnesi SAĞLAR (LLM, Tool, Prompt)
    PROCESSOR = "processor"  # Birden fazla nesneyi İŞLER (Agent gibi)
    TERMINATOR = "terminator" # Bir zincirin sonunu DÖNÜŞTÜRÜR (Output Parser gibi)

# 2. Metadata için Pydantic modelleri, standartları zorunlu kılar.
class NodeInput(BaseModel):
    name: str
    type: str
    description: str
    required: bool = True
    # Bu alan, girdinin başka bir node'dan mı (bağlantı) yoksa kullanıcıdan mı geleceğini belirtir.
    is_connection: bool = False 
    default: Any = None

class NodeOutput(BaseModel):
    """Defines what a node outputs"""
    name: str
    type: str
    description: str

class NodeMetadata(BaseModel):
    name: str
    description: str
    display_name: str | None = None
    icon: str | None = None
    color: str | None = None
    category: str = "Other"
    node_type: NodeType # Her node türünü belirtmek zorunda.
    inputs: List[NodeInput] = []
    outputs: List[NodeOutput] = []  # Now we track outputs too!

    @field_validator('display_name', mode='before')
    def default_display_name(cls, v, info):  # noqa: N805 – Pydantic validator signature
        """Provide a default display_name equal to the node *name* if omitted."""
        return v or info.data.get('name')

# 3. Ana Soyut Sınıf (Tüm node'ların atası)
class BaseNode(ABC):
    _metadata: Dict[str, Any]  # Node configuration provided by subclasses
    
    # Class-level attribute declarations for linter
    node_id: Optional[str]
    context_id: Optional[str]
    _input_connections: Dict[str, Dict[str, str]]
    _output_connections: Dict[str, List[Dict[str, str]]]
    user_data: Dict[str, Any]
    
    def __init__(self):
        self.node_id = None  # Will be set by GraphBuilder
        self.context_id = None  # Credential context for provider
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
                # Get node metadata for input processing
                metadata = self.metadata
                
                # Prepare inputs based on node type
                if self.metadata.node_type == NodeType.PROVIDER:
                    # Provider nodes create objects from user inputs only
                    inputs = self._extract_user_inputs(state, metadata.inputs)
                    result = self.execute(**inputs)
                    
                elif self.metadata.node_type == NodeType.PROCESSOR:
                    # Processor nodes need both connected nodes and user inputs
                    user_inputs = self._extract_user_inputs(state, metadata.inputs)
                    connected_nodes = self._extract_connected_inputs(state, metadata.inputs)
                    result = self.execute(inputs=user_inputs, connected_nodes=connected_nodes)
                    
                elif self.metadata.node_type == NodeType.TERMINATOR:
                    # Terminator nodes process previous node output
                    previous_node = self._get_previous_node_output(state)
                    user_inputs = self._extract_user_inputs(state, metadata.inputs)
                    result = self.execute(previous_node=previous_node, inputs=user_inputs)
                    
                else:
                    # Fallback for unknown node types
                    inputs = self._extract_all_inputs(state, metadata.inputs)
                    result = self.execute(**inputs)
                
                # If execute returns a LangChain Runnable **and** this node is NOT a
                # provider, we run it immediately to obtain a concrete output.
                # Provider nodes are expected to *return* runnable objects (e.g.
                # LLMs, Tools) for downstream processors.

                if isinstance(result, Runnable) and self.metadata.node_type != NodeType.PROVIDER:
                    try:
                        result = result.invoke(state.variables)
                    except NotImplementedError:
                        try:
                            # Fallback: call the runnable directly if it is callable
                            call_fn = getattr(result, "__call__", None)
                            if callable(call_fn):
                                result = call_fn(state.variables)
                            else:
                                result = str(result)
                        except Exception as inner_exc:
                            result = f"Runnable execution error: {inner_exc}"
                    except Exception as inner_exc:
                        result = f"Runnable execution error: {inner_exc}"

                # Store the result in state
                node_id = getattr(self, 'node_id', f"{self.__class__.__name__}_{id(self)}")
                
                # For provider nodes, keep the raw result (LLM, Tool, etc.) since
                # other nodes need to use these objects directly. Only convert to 
                # string for non-provider nodes or if result is not a Runnable.
                if self.metadata.node_type == NodeType.PROVIDER:
                    safe_output = result  # Keep raw LLM/Tool objects
                else:
                    # For other node types, ensure JSON-serializable
                    try:
                        import json
                        json.dumps(result)  # type: ignore[arg-type]
                        safe_output = result  # Already serialisable
                    except TypeError:
                        safe_output = str(result)

                # Store result using both approaches for maximum compatibility:
                # 1. Dynamic field for unique key (avoids conflicts in parallel execution)
                # 2. node_outputs mapping (standard approach that LangGraph handles better)

                unique_key = f"output_{node_id}"

                partial_update = {
                    unique_key: safe_output,
                    "node_outputs": {**state.node_outputs, node_id: safe_output}
                }

                # Debug: log what this node is returning
                try:
                    print(f"[DEBUG] Node {node_id} returning diff: {unique_key} -> {type(safe_output)}")
                except Exception:
                    pass

                # Do not include `variables` in the diff – GraphBuilder's
                # wrapper mutates them before this node executes, so adding
                # them here would lead to duplicate updates within the same
                # step and trigger InvalidUpdateError.

                return partial_update
                
            except Exception as e:
                # Handle errors gracefully
                error_msg = f"Error in {self.__class__.__name__}: {str(e)}"
                state.add_error(error_msg)
                return {"errors": state.errors}
        
        return graph_node_function
    
    def _extract_user_inputs(self, state: FlowState, input_specs: List[NodeInput]) -> Dict[str, Any]:
        """Extract user-provided inputs from state"""
        inputs = {}
        for input_spec in input_specs:
            if not input_spec.is_connection:
                # This is a user input, not a connection
                if input_spec.name in state.variables:
                    inputs[input_spec.name] = state.get_variable(input_spec.name)
                elif input_spec.default is not None:
                    inputs[input_spec.name] = input_spec.default
                elif input_spec.required:
                    raise ValueError(f"Required input '{input_spec.name}' not found in state")
        return inputs
    
    def _extract_connected_inputs(self, state: FlowState, input_specs: List[NodeInput]) -> Dict[str, Any]:
        """Extract connected node inputs from state using new connection mapping."""
        connected = {}
        
        print(f"[DEBUG] Node '{self.node_id}' extracting connected inputs...")
        print(f"[DEBUG] Available input connections: {self._input_connections}")
        print(f"[DEBUG] State node_outputs keys: {list(state.node_outputs.keys())}")
        
        for input_spec in input_specs:
            if input_spec.is_connection:
                # Use new connection mapping format
                connection_info = self._input_connections.get(input_spec.name)
                
                if connection_info:
                    source_node_id = connection_info["source_node_id"]
                    source_handle = connection_info["source_handle"]
                    
                    print(f"[DEBUG] Resolving connection '{input_spec.name}' from source '{source_node_id}' handle '{source_handle}'")
                    
                    # 🔥 NEW: Try multiple strategies to find the output
                    output = None
                    
                    # Strategy 1: Look for source node output in node_outputs
                    if source_node_id in state.node_outputs:
                        source_output = state.node_outputs[source_node_id]
                        
                        # If source_handle is "output" (default), use the raw output
                        if source_handle == "output" or source_handle == "result":
                            output = source_output
                            print(f"[DEBUG] Found output via default handle from '{source_node_id}': {type(output)}")
                        else:
                            # Try to extract specific handle if output is a dict
                            if isinstance(source_output, dict) and source_handle in source_output:
                                output = source_output[source_handle]
                                print(f"[DEBUG] Found output via specific handle '{source_handle}': {type(output)}")
                            else:
                                # Fallback: use the raw output
                                output = source_output
                                print(f"[DEBUG] Using raw output as fallback for handle '{source_handle}': {type(output)}")
                    
                    # Strategy 2: Look for unique key format (output_nodeId)
                    if output is None:
                        unique_key = f"output_{source_node_id}"
                        if hasattr(state, unique_key):
                            output = getattr(state, unique_key)
                            print(f"[DEBUG] Found output via unique key '{unique_key}': {type(output)}")
                    
                    # Strategy 3: Legacy fallback
                    if output is None:
                        output = state.get_node_output(source_node_id)
                        if output:
                            print(f"[DEBUG] Found output via legacy method: {type(output)}")
                    
                    if output is not None:
                        connected[input_spec.name] = output
                        print(f"[DEBUG] ✅ Successfully connected '{input_spec.name}' from '{source_node_id}' handle '{source_handle}'")
                    elif input_spec.required:
                        error_msg = f"Required connection '{input_spec.name}' not found - source '{source_node_id}' handle '{source_handle}'"
                        print(f"[DEBUG] ❌ {error_msg}")
                        raise ValueError(error_msg)
                    else:
                        print(f"[DEBUG] ⚠️ Optional connection '{input_spec.name}' not found, skipping")
                else:
                    print(f"[DEBUG] ⚠️ No connection mapping found for input '{input_spec.name}'")
                    
                    # Legacy fallback: try direct name lookup
                    output = state.get_node_output(input_spec.name)
                    if output is not None:
                        connected[input_spec.name] = output
                        print(f"[DEBUG] Found via legacy direct lookup: {type(output)}")
                    elif input_spec.required:
                        raise ValueError(f"Required connection '{input_spec.name}' not found in connection mapping")
        
        print(f"[DEBUG] Final connected inputs for '{self.node_id}': {list(connected.keys())}")
        return connected
    
    def _get_previous_node_output(self, state: FlowState) -> Any:
        """Get the most recent node output for terminator nodes"""
        if state.executed_nodes:
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

# 4. Geliştiricilerin Kullanacağı 3 Standart Node Sınıfı

class ProviderNode(BaseNode):
    """
    Sıfırdan bir LangChain nesnesi (LLM, Tool, Prompt, Memory) oluşturan node'lar için temel sınıf.
    """
    def __init__(self):
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
    def __init__(self):
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
    def __init__(self):
        if not hasattr(self, '_metadata'):
            self._metadata = {}
        if "node_type" not in self._metadata:
            self._metadata["node_type"] = NodeType.TERMINATOR

    def execute(self, previous_node: Runnable, inputs: Dict[str, Any]) -> Runnable:  # type: ignore[override]
        return super().execute(previous_node=previous_node, inputs=inputs)
