from typing import Dict, Any
from ..base import ProcessorNode, NodeInput, NodeType
from langchain.memory import ConversationSummaryMemory
from langchain_core.language_models import BaseLanguageModel
from langchain_core.runnables import Runnable
from typing import cast

class SummaryMemoryNode(ProcessorNode):
    """Conversation summary memory"""
    
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "SummaryMemory",
            "display_name": "Summary Memory",

            "description": "Summarizes conversation history using an LLM",
            "category": "Memory",
            "node_type": NodeType.PROCESSOR,
            "inputs": [
                NodeInput(name="llm", type="llm", description="LLM for summarization", is_connection=True, required=True),
                NodeInput(name="memory_key", type="str", description="Memory key", default="chat_history"),
                NodeInput(name="max_token_limit", type="int", description="Max tokens before summarizing", default=2000),
            ]
        }

    def execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Runnable]) -> Runnable:
        """Execute summary memory node"""
        llm = connected_nodes.get("llm")
        if not isinstance(llm, BaseLanguageModel):
            raise ValueError("LLM connection is required")
        
        return cast(Runnable, ConversationSummaryMemory(
            llm=llm,
            memory_key=inputs.get("memory_key", "chat_history"),
            max_token_limit=inputs.get("max_token_limit", 2000)
        ))
