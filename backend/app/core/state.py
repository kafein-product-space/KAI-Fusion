"""
KAI-Fusion Enterprise Workflow State Management - Advanced State Orchestration System
======================================================================================

This module implements the sophisticated workflow state management system for the KAI-Fusion
platform, providing enterprise-grade state persistence, advanced data flow orchestration,
and comprehensive state lifecycle management. Built for high-performance AI workflow
execution with intelligent state tracking, concurrent execution support, and production-ready
reliability features designed for complex enterprise automation scenarios.

"""

from pydantic import BaseModel, Field
from typing import Any, List, Dict, Optional, Union, Annotated
from datetime import datetime

def merge_node_outputs(left: Dict[str, Any], right: Dict[str, Any]) -> Dict[str, Any]:
    """
    Enterprise-Grade Node Output Merger for Concurrent Execution
    ===========================================================
    
    Advanced reducer function designed for merging node outputs from multiple nodes
    executing in parallel within the KAI-Fusion workflow engine. Provides intelligent
    conflict resolution, type preservation, and comprehensive error handling for
    enterprise-grade concurrent workflow execution scenarios.
    
    This function implements sophisticated merging strategies for handling concurrent
    state updates while preserving data integrity and ensuring consistent state
    across parallel execution branches in complex AI workflow orchestration.


    """
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
    memory_data: Dict[str, Any] = Field(default_factory=dict, description="General purpose memory storage")
    
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
    
    def __init__(self, **data):
        super().__init__(**data)
        # 🔥 CRITICAL: Ensure session_id is always set
        if not self.session_id or self.session_id == 'None' or len(str(self.session_id).strip()) == 0:
            import uuid
            self.session_id = f"state_session_{uuid.uuid4().hex[:8]}"
            print(f"⚠️  No valid session_id in FlowState, generated: {self.session_id}")
        
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
        """Get output from a specific node using the unique key format.

        Öncelik sırası:
        1. Benzersiz anahtar formatı: 'output_<node_id>'
        2. Eski node_outputs sözlüğü
        3. Doğrudan node_id attribute'u (eski stil)
        """
        # Önce benzersiz anahtar formatını dene
        dyn_key = f"output_{node_id}"
        if hasattr(self, dyn_key):
            return getattr(self, dyn_key)
            
        # Eski node_outputs sözlüğünü kontrol et
        if node_id in self.node_outputs:
            return self.node_outputs[node_id]

        # Eski stil doğrudan attribute
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