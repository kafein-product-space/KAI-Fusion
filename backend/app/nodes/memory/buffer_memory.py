from ..base import ProviderNode, NodeInput, NodeType
from langchain.memory import ConversationBufferMemory
from langchain_core.runnables import Runnable
from typing import cast, Dict
from app.core.tracing import trace_memory_operation

class BufferMemoryNode(ProviderNode):
    """Session-aware conversation buffer memory"""
    
    # Global class-level memory storage to persist across workflow rebuilds
    _global_session_memories: Dict[str, ConversationBufferMemory] = {}
    
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "BufferMemory",
            "display_name": "Buffer Memory",
            "description": "Stores entire conversation history",
            "category": "Memory",
            "node_type": NodeType.PROVIDER,
            "inputs": [
                NodeInput(name="memory_key", type="str", description="Memory key", default="memory"),
                NodeInput(name="return_messages", type="bool", description="Return as messages", default=True),
                NodeInput(name="input_key", type="str", description="Input key name", default="input"),
                NodeInput(name="output_key", type="str", description="Output key name", default="output"),
            ]
        }

    @trace_memory_operation("execute")
    def execute(self, **kwargs) -> Runnable:
        """Execute buffer memory node with session persistence and tracing"""
        # Get session ID from context (set by graph builder)
        session_id = getattr(self, 'session_id', 'default_session')
        print(f"💾 BufferMemoryNode session_id: {session_id}")
        
        # Use existing session memory or create new one (using global class storage)
        if session_id not in BufferMemoryNode._global_session_memories:
            BufferMemoryNode._global_session_memories[session_id] = ConversationBufferMemory(
                memory_key=kwargs.get("memory_key", "memory"),
                return_messages=kwargs.get("return_messages", True),
                input_key=kwargs.get("input_key", "input"),
                output_key=kwargs.get("output_key", "output")
            )
            print(f"💾 Created new BufferMemory for session: {session_id}")
        else:
            print(f"💾 Reusing existing BufferMemory for session: {session_id}")
            
        memory = BufferMemoryNode._global_session_memories[session_id]
        
        # Debug memory content with enhanced tracing
        if hasattr(memory, 'chat_memory') and hasattr(memory.chat_memory, 'messages'):
            message_count = len(memory.chat_memory.messages)
            print(f"💾 BufferMemory has {message_count} messages")
            for i, msg in enumerate(memory.chat_memory.messages[-3:]):  # Show last 3 messages
                print(f"  {i}: {getattr(msg, 'type', 'unknown')}: {getattr(msg, 'content', str(msg))[:100]}")
            
            # Track memory content for LangSmith
            from app.core.tracing import get_workflow_tracer
            tracer = get_workflow_tracer(session_id=session_id)
            tracer.track_memory_operation("retrieve", "BufferMemory", f"{message_count} messages", session_id)
        
        print(f"💾 BufferMemory ready for session: {session_id}")
        return cast(Runnable, memory)
