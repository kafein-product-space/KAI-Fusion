from typing import Any, Dict
from langchain_core.runnables import Runnable
from app.nodes.base import TerminatorNode, NodeMetadata, NodeInput, NodeOutput, NodeType

class EndNode(TerminatorNode):
    """
    Marks the end of a workflow path.
    This node acts as a sink, terminating a branch of the graph. Any data
    passed to it will be available in the final output of the graph execution.
    """
    
    def __init__(self):
        super().__init__()
        # Correctly assign metadata as a dictionary
        self._metadata = NodeMetadata(
            name="EndNode",
            display_name="End",
            description="Marks the end of a workflow path",
            category="Special",
            node_type=NodeType.TERMINATOR,
            icon="flag-checkered",
            color="#D32F2F", # A distinct red color
            inputs=[
                NodeInput(
                    name="input",
                    type="any",
                    description="The final data from the preceding node",
                    is_connection=True,
                    required=True,
                )
            ],
            outputs=[], # End node has no outputs
        ).dict()

    def execute(self, previous_node: Runnable, inputs: Dict[str, Any]) -> Runnable:
        """
        Passes through the input from the previous node.
        The actual termination is handled by the GraphBuilder connecting this node to END.
        """
        # The EndNode simply returns the output of the node connected to it.
        # The GraphBuilder will connect this node's output to the global END.
        return previous_node 