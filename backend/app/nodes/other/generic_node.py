from typing import Dict, Any
from langchain_core.runnables import Runnable, RunnableLambda
from ..base import ProcessorNode, NodeInput, NodeOutput, NodeType

class GenericNode(ProcessorNode):
    """
    Generic node that can process any input and pass it through with optional transformations
    """
    
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "Generic",
            "display_name": "Generic Node",
            "description": "A generic node that can process any input",
            "category": "Utility",
            "node_type": NodeType.PROCESSOR,
            "inputs": [
                NodeInput(
                    name="input", 
                    type="any", 
                    description="Any input data", 
                    is_connection=True,
                    required=True
                ),
                NodeInput(
                    name="transform_type",
                    type="str",
                    description="Type of transformation: 'passthrough', 'stringify', 'jsonify'",
                    default="passthrough"
                ),
                NodeInput(
                    name="custom_label",
                    type="str",
                    description="Custom label for the node",
                    default="Generic Node"
                )
            ],
            "outputs": [
                NodeOutput(name="output", type="any", description="Processed output")
            ]
        }

    def execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Runnable]) -> Runnable:
        """Execute generic processing"""
        transform_type = inputs.get("transform_type", "passthrough")
        custom_label = inputs.get("custom_label", "Generic Node")
        
        def process_generic(data: Any) -> Any:
            """Process data based on transform type"""
            try:
                if transform_type == "passthrough":
                    return data
                elif transform_type == "stringify":
                    return str(data)
                elif transform_type == "jsonify":
                    import json
                    if isinstance(data, (dict, list)):
                        return json.dumps(data, indent=2)
                    else:
                        return json.dumps({"value": data}, indent=2)
                elif transform_type == "extract_text":
                    if isinstance(data, dict):
                        # Try common text fields
                        for field in ["text", "content", "message", "output", "result"]:
                            if field in data:
                                return data[field]
                        return str(data)
                    return str(data)
                else:
                    # Default passthrough
                    return data
            except Exception as e:
                return f"Error in {custom_label}: {str(e)}"
        
        return RunnableLambda(process_generic) 