from ..base import TerminatorNode, NodeMetadata, NodeInput, NodeType
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import Runnable
from typing import Dict, Any

class StringOutputParserNode(TerminatorNode):
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "StringOutputParser",
            "category": "Output Parsers",
            "description": "A simple parser that returns the output of the LLM as a string.",
            "node_type": NodeType.TERMINATOR,
        }

    def execute(self, previous_node: Runnable, inputs: Dict[str, Any]) -> Runnable:
        """Execute with correct TerminatorNode signature"""
        return previous_node | StrOutputParser()
