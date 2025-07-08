from pydantic import BaseModel, Field
from typing import Any, List, Dict, Optional, Union, Annotated
from datetime import datetime

def merge_node_outputs(left: Dict[str, Any], right: Dict[str, Any]) -> Dict[str, Any]:
    """Reducer function to merge node_outputs from multiple nodes running in parallel"""
    if not isinstance(left, dict):
        left = {}
    if not isinstance(right, dict):
        right = {}
    return {**left, **right}

class FlowState(BaseModel):
    """
    State object for LangGraph workflows
    This will hold all the data that flows between nodes in the graph
    """
    # Chat history for conversation memory
    chat_history: List[str] = Field(default_factory=list, description="Chat conversation history")
    
    # General memory for storing arbitrary data between nodes
    memory: Dict[str, Any] = Field(default_factory=dict, description="General purpose memory storage")
    
    # Last output from any node
    last_output: Optional[str] = Field(default=None, description="Output from the last executed node")
    
    # Current input being processed
    current_input: Optional[str] = Field(default=None, description="Current input being processed")
    
    # Node execution tracking
    executed_nodes: List[str] = Field(default_factory=list, description="List of node IDs that have been executed")
    
    # Error tracking
    errors: List[str] = Field(default_factory=list, description="List of errors encountered during execution")
    
    # Session metadata
    session_id: Optional[str] = Field(default=None, description="Session identifier for persistence")
    user_id: Optional[str] = Field(default=None, description="User identifier")
    workflow_id: Optional[str] = Field(default=None, description="Workflow identifier")
    
    # Execution metadata
    started_at: Optional[datetime] = Field(default=None, description="When execution started")
    updated_at: Optional[datetime] = Field(default_factory=datetime.now, description="Last update timestamp")
    
    # Variable storage for dynamic data
    variables: Dict[str, Any] = Field(default_factory=dict, description="Variables that can be set and accessed by nodes")
    
    # Node outputs storage - keeps track of each node's output
    # Use Annotated with reducer to handle concurrent updates from parallel nodes
    node_outputs: Annotated[Dict[str, Any], merge_node_outputs] = Field(default_factory=dict, description="Storage for individual node outputs")
    
    # Pydantic config – allow dynamic fields so that each node can attach
    # its own top-level output key (the node_id).  This avoids concurrent
    # updates to a shared `node_outputs` dictionary when multiple branches
    # run in parallel.

    model_config = {
        "extra": "allow"
    }
    
    def add_message(self, message: str, role: str = "user") -> None:
        """Add a message to chat history"""
        self.chat_history.append(f"{role}: {message}")
        
    def set_variable(self, key: str, value: Any) -> None:
        """Set a variable in the state"""
        self.variables[key] = value
        
    def get_variable(self, key: str, default: Any = None) -> Any:
        """Get a variable from the state"""
        return self.variables.get(key, default)
        
    def set_node_output(self, node_id: str, output: Any) -> None:
        """Store output from a specific node"""
        self.node_outputs[node_id] = output
        self.last_output = str(output)
        if node_id not in self.executed_nodes:
            self.executed_nodes.append(node_id)
        self.updated_at = datetime.now()
        
    def get_node_output(self, node_id: str, default: Any = None) -> Any:
        """Get output from a specific node.

        First tries the dedicated `node_outputs` mapping.  If not found,
        falls back to checking a dynamic top-level attribute matching the
        *node_id* (used when nodes write their output directly under a
        unique key to avoid merge conflicts).
        """
        if node_id in self.node_outputs:
            return self.node_outputs[node_id]
        # Check dynamic 'output_<node_id>' field added by BaseNode
        dyn_key = f"output_{node_id}"
        if dyn_key in self.__dict__:
            return self.__dict__[dyn_key]

        # Debug: log what keys are available when lookup fails
        try:
            available_outputs = [k for k in self.__dict__.keys() if k.startswith('output_')]
            print(f"[DEBUG] get_node_output({node_id}) failed. Available outputs: {available_outputs}")
            print(f"[DEBUG] Current __dict__ keys: {list(self.__dict__.keys())}")
        except Exception:
            pass

        # Fallback: look for attribute matching node_id (older style)
        return getattr(self, node_id, default)
        
    def add_error(self, error: str) -> None:
        """Add an error to the error list"""
        self.errors.append(f"{datetime.now().isoformat()}: {error}")
        
    def clear_errors(self) -> None:
        """Clear all errors"""
        self.errors.clear()
        
    def to_dict(self) -> Dict[str, Any]:
        """Convert state to dictionary for serialization"""
        return self.model_dump()
        
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "FlowState":
        """Create state from dictionary"""
        return cls(**data)
        
    def copy(self) -> "FlowState":
        """Create a copy of the current state"""
        return FlowState.from_dict(self.to_dict()) 