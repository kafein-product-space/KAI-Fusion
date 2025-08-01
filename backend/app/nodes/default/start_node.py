"""Start Node - Entry point for workflows."""

from typing import Dict, Any
from app.nodes.base import ProcessorNode, NodeMetadata, NodeInput, NodeOutput, NodeType
from app.core.state import FlowState


class StartNode(ProcessorNode):
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
            "node_type": NodeType.PROCESSOR,
            "category": "Special",
            "inputs": [
                NodeInput(
                    name="initial_input",
                    type="string",
                    description="Initial input text to start the workflow",
                    default="",
                    required=False
                ),
                NodeInput(
                    name="trigger_data",
                    type="any",
                    description="Data received from trigger nodes",
                    required=False,
                    is_connection=True
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
    
    def execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the start node.
        
        Args:
            inputs: User inputs from the frontend
            connected_nodes: Connected node outputs
            
        Returns:
            Dict containing the initial input to pass to next nodes
        """
        # Get initial input from user data or connected nodes
        initial_input = inputs.get("initial_input", "")
        
        # If no input provided, check connected nodes for trigger data
        if not initial_input and connected_nodes:
            trigger_data = connected_nodes.get("trigger_data")
            if trigger_data:
                # Handle different types of trigger data
                if isinstance(trigger_data, dict):
                    initial_input = trigger_data.get("data", trigger_data.get("message", str(trigger_data)))
                else:
                    initial_input = str(trigger_data)
        
        # If still no input, use a default message
        if not initial_input:
            initial_input = "Workflow started"
        
        print(f"[StartNode] Starting workflow with input: {initial_input}")
        
        return {
            "output": initial_input,
            "message": f"Workflow started with: {initial_input}",
            "status": "started"
        }