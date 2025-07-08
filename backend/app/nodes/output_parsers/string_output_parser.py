from ..base import ProcessorNode, NodeMetadata, NodeInput, NodeType
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import Runnable
from typing import Dict, Any

class StringOutputParserNode(ProcessorNode):
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "StringOutputParser",
            "display_name": "String Output Parser",
            "category": "Output Parsers",
            "description": "A simple parser that returns the output of the LLM as a string.",
            "node_type": NodeType.PROCESSOR,
            "inputs": [
                NodeInput(
                    name="input",
                    type="chain",
                    description="Input chain or runnable to parse",
                    is_connection=True,
                    required=True
                )
            ]
        }

    def execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Runnable]) -> Runnable:
        """Execute with correct ProcessorNode signature using explicit connections"""
        input_runnable = connected_nodes.get("input")
        
        if input_runnable is None:
            raise ValueError("Input runnable is required for StringOutputParser")
        
        return input_runnable | StrOutputParser()
