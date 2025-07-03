
from ..base import ProviderNode, NodeMetadata, NodeInput, NodeType
from langchain.memory import ConversationBufferWindowMemory
from langchain_core.runnables import Runnable

class ConversationMemoryNode(ProviderNode):
    _metadatas = {
        "name": "ConversationMemory",
        "description": "Provides a conversation buffer window memory.",
        "node_type": NodeType.PROVIDER,
        "inputs": [
            NodeInput(name="k", type="int", description="The number of messages to keep in the buffer.", default=5),
            NodeInput(name="memory_key", type="string", description="The key for the memory in the chat history.", default="chat_history")
        ]
    }

    def _execute(self, k: int = 5, memory_key: str = "chat_history") -> Runnable:
        return ConversationBufferWindowMemory(
            k=k, 
            memory_key=memory_key, 
            return_messages=True
        )
