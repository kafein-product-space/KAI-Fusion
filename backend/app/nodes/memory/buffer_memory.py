from ..base import ProviderNode, NodeInput, NodeType
from langchain.memory import ConversationBufferMemory
from langchain_core.runnables import Runnable
from typing import cast

class BufferMemoryNode(ProviderNode):
    """Simple conversation buffer memory"""
    
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "BufferMemory",
            "description": "Stores entire conversation history",
            "category": "Memory",
            "node_type": NodeType.PROVIDER,
            "inputs": [
                NodeInput(name="memory_key", type="str", description="Memory key", default="chat_history"),
                NodeInput(name="return_messages", type="bool", description="Return as messages", default=True),
                NodeInput(name="input_key", type="str", description="Input key name", default="input"),
                NodeInput(name="output_key", type="str", description="Output key name", default="output"),
            ]
        }

    def execute(self, **kwargs) -> Runnable:
        """Execute buffer memory node"""
        return cast(Runnable, ConversationBufferMemory(
            memory_key=kwargs.get("memory_key", "chat_history"),
            return_messages=kwargs.get("return_messages", True),
            input_key=kwargs.get("input_key", "input"),
            output_key=kwargs.get("output_key", "output")
        ))
