from ..base import ProviderNode, NodeMetadata, NodeInput, NodeType
from langchain.memory import ConversationBufferWindowMemory
from langchain_core.runnables import Runnable
from typing import cast, Dict

class ConversationMemoryNode(ProviderNode):
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "ConversationMemory",
            "display_name": "Conversation Memory",
            "description": "Provides a conversation buffer window memory.",
            "category": "Memory",
            "node_type": NodeType.PROVIDER,
            "inputs": [
                NodeInput(name="k", type="int", description="The number of messages to keep in the buffer.", default=5),
                NodeInput(name="memory_key", type="string", description="The key for the memory in the chat history.", default="chat_history")
            ]
        }
        # Session-aware memory storage
        self._session_memories: Dict[str, ConversationBufferWindowMemory] = {}

    def execute(self, **kwargs) -> Runnable:
        """Execute with session-aware memory support"""
        # Get session ID from context (set by graph builder)
        session_id = getattr(self, 'session_id', 'default_session')
        print(f"💾 ConversationMemoryNode session_id: {session_id}")
        
        k = kwargs.get("k", 5)
        memory_key = kwargs.get("memory_key", "chat_history")
        
        # Use existing session memory or create new one
        if session_id not in self._session_memories:
            self._session_memories[session_id] = ConversationBufferWindowMemory(
                k=k,
                memory_key=memory_key,
                return_messages=True
            )
            print(f"💾 Created new ConversationMemory for session: {session_id}")
        else:
            print(f"💾 Reusing existing ConversationMemory for session: {session_id}")
            
        memory = self._session_memories[session_id]
        
        # Debug memory content
        if hasattr(memory, 'chat_memory') and hasattr(memory.chat_memory, 'messages'):
            print(f"💾 ConversationMemory has {len(memory.chat_memory.messages)} messages")
            for i, msg in enumerate(memory.chat_memory.messages[-3:]):  # Show last 3 messages
                print(f"  {i}: {getattr(msg, 'type', 'unknown')}: {getattr(msg, 'content', str(msg))[:100]}")
        
        return cast(Runnable, memory)
