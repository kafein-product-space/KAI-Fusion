
from ..base import TerminatorNode, NodeMetadata, NodeInput, NodeType
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import Runnable
from typing import Dict, Any

class StringOutputParserNode(TerminatorNode):
    _metadatas = {
        "name": "StringOutputParser",
        "description": "A simple parser that returns the output of the LLM as a string.",
        "node_type": NodeType.TERMINATOR,
    }

    def _execute(self, previous_node: Runnable, inputs: Dict[str, Any]) -> Runnable:
        return previous_node | StrOutputParser()
