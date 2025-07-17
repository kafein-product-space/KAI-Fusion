"""Start Node - Entry point for workflows."""

from typing import Dict, Any
from app.nodes.base import TerminatorNode, NodeMetadata, NodeInput, NodeOutput, NodeType
from app.core.state import FlowState


class StartNode(TerminatorNode):
    """
    Start node serves as the entry point for workflows.
    It receives initial input and forwards it to connected nodes.
    """

    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "StartNode",
            "display_name": "Start",
            "description": "Entry point for workflow execution. Receives initial input and starts the workflow.",
            "node_type": NodeType.TERMINATOR,
            "category": "Special",
            "inputs": [
                NodeInput(
                    name="initial_input",
                    type="string",
                    description="Initial input text to start the workflow",
                    default="",
                    required=False
                )
            ],
            "outputs": [
                NodeOutput(
                    name="output",
                    type="string",
                    description="Forwarded input to start the workflow chain"
                )
            ],
            "color": "#22c55e",  # Green color for start
            "icon": "play"
        }

    def _execute(self, state: FlowState) -> Dict[str, Any]:
        """
        Execute the start node.
        
        Args:
            state: Current workflow state
            
        Returns:
            Dict containing the initial input to pass to next nodes
        """
        # Get initial input from user data or use default
        initial_input = self.user_data.get("initial_input", "")
        
        # If no input provided, use the current state's last output or a default message
        if not initial_input:
            initial_input = state.last_output or "Workflow started"
        
        # Update state with the initial input
        state.last_output = initial_input
        
        # Add this node to executed nodes list
        if self.node_id and self.node_id not in state.executed_nodes:
            state.executed_nodes.append(self.node_id)
        
        print(f"[StartNode] Starting workflow with input: {initial_input}")
        
        return {
            "output": initial_input,
            "message": f"Workflow started with: {initial_input}",
            "status": "started"
        } 