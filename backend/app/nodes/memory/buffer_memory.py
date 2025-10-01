"""
KAI-Fusion Buffer Memory - Comprehensive Conversation History Management
=======================================================================

This module implements advanced buffer memory management for the KAI-Fusion platform,
providing enterprise-grade complete conversation history storage, intelligent session
management, and seamless integration with AI workflows requiring full conversational context.



AUTHORS: KAI-Fusion Memory Architecture Team
VERSION: 2.1.0  
LAST_UPDATED: 2025-07-26
LICENSE: Proprietary - KAI-Fusion Platform
"""

from app.nodes import MemoryNode, NodeInput, NodeType
from langchain.memory import ConversationBufferMemory
from langchain_core.runnables import Runnable
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from typing import cast, Dict, Optional, List
from sqlalchemy.orm import Session
from app.core.tracing import trace_memory_operation
from app.services.memory import save_memory, get_memories_by_session, get_memory_count_by_session
from app.core.database import get_db

# ================================================================================
# BUFFER MEMORY NODE - ENTERPRISE COMPLETE HISTORY MANAGEMENT
# ================================================================================

class BufferMemoryNode(MemoryNode):
    """
    A persistent, session-aware memory node that stores the complete
    conversation history in a database. It adheres to the BaseMemoryNode
    standard and is independent of ProviderNode.
    """
    
    def __init__(self):
        super().__init__()
        self._metadata.update({
            "name": "BufferMemory",
            "display_name": "Buffer Memory (Persistent)",
            "description": "Stores entire conversation history with database persistence.",
            "inputs": [
                NodeInput(name="return_messages", type="bool", description="Return as messages.", default=True),
                NodeInput(name="input_key", type="str", description="Key for user input.", default="input"),
                NodeInput(name="user_id", type="str", description="User ID for multi-tenancy.", required=False),
            ]
        })
        # Standard inputs are now inherited from MemoryNode
        self.db_session: Optional[Session] = None

    def get_required_packages(self) -> list[str]:
        """Returns the Python packages required for this node to be exported."""
        return [
            "langchain>=0.1.0",
            "sqlalchemy"
        ]

    @trace_memory_operation("execute")
    def execute(self, **kwargs) -> Runnable:
        """
        Retrieves or creates a persistent, session-aware memory instance.
        """
        session_id = self.session_id
        print(f"💾 BufferMemoryNode session_id: {session_id}")
        
        try:
            memory = self.get_memory_instance(session_id, **kwargs)
            self._track_memory_operation(session_id, memory)
            return cast(Runnable, memory)
        except Exception as e:
            print(f"Error in BufferMemoryNode.execute: {e}")
            # Fallback to a non-persistent memory instance in case of DB error
            return ConversationBufferMemory(
                memory_key=kwargs.get("memory_key", "memory"),
                return_messages=kwargs.get("return_messages", True)
            )

    def get_memory_instance(self, session_id: str, **kwargs) -> Runnable:
        """
        Creates or retrieves a ConversationBufferMemory instance and populates
        it with history from the database.
        """
        input_key = kwargs.get("input", "input")
        memory_key = session_id
        return_messages = kwargs.get("return_messages", True)

        # Create a standard ConversationBufferMemory instance
        memory = ConversationBufferMemory(
            memory_key=memory_key,
            return_messages=return_messages,
            input_key=input_key,
        )

        # Load historical messages from the database
        loaded_messages = self.load_messages(session_id)
        if loaded_messages:
            memory.chat_memory.messages = loaded_messages
        
        # A new user input might be part of the current execution context (`kwargs`).
        # We need to save it to ensure it's persisted for the *next* run.
        user_input_content = input_key
        if user_input_content:
            new_message = HumanMessage(content=user_input_content)
            # Add to current memory instance immediately
            memory.chat_memory.add_messages([new_message])
            # Persist it for future sessions
            self.save_messages(session_id, [new_message], **kwargs)

        return memory

    def load_messages(self, session_id: str, **kwargs) -> List[BaseMessage]:
        """
        Loads conversation history from the database for a given session ID.
        """
        try:
            db = next(get_db())
            print(f"Loading messages for session {session_id} from database...")
            db_memories = get_memories_by_session(db, session_id, limit=5)
            messages = [self._convert_db_memory_to_message(mem) for mem in db_memories]
            # Filter out any None values that may result from conversion errors
            return [msg for msg in messages if msg is not None]
        except Exception as e:
            print(f"Warning: Failed to load conversation history for session {session_id}: {e}")
            return []

    def save_messages(self, session_id: str, messages: List[BaseMessage], **kwargs) -> None:
        """
        Saves a list of messages to the database for a given session ID.
        """
        try:
            db = next(get_db())
            user_id = kwargs.get('user_id') or getattr(self, 'user_id', None)
            print(f"Saving {len(messages)} messages for session {session_id} to database...")
            
            for message in messages:
                if isinstance(message, HumanMessage):
                    context = "human"
                elif isinstance(message, AIMessage):
                    context = "ai"
                elif isinstance(message, SystemMessage):
                    context = "system"
                else:
                    context = "unknown"

                try:
                    save_memory(
                        db=db,
                        user_id=user_id,
                        session_id=session_id,
                        content=message.content,
                        context=context,
                        metadata={"message_type": message.__class__.__name__},
                        source_type="buffer_memory"
                    )
                except Exception as e:
                    print(f"Warning: Failed to persist a message to the database: {e}")
        except Exception as e:
            print(f"Warning: Database not available, skipping message persistence: {e}")

    def _convert_db_memory_to_message(self, db_memory) -> Optional[BaseMessage]:
        """Converts a database memory record to a LangChain message object."""
        try:
            content = db_memory.content
            context = db_memory.context.lower() if db_memory.context else ""
            
            if context in ["human", "user", "input"]:
                return HumanMessage(content=content)
            elif context in ["ai", "assistant", "output", "bot"]:
                return AIMessage(content=content)
            elif context == "system":
                return SystemMessage(content=content)
            else:
                return HumanMessage(content=content)  # Default assumption
        except Exception as e:
            print(f"Warning: Failed to convert database memory to message: {e}")
            return None

    def _track_memory_operation(self, session_id: str, memory) -> None:
        """Tracks memory operation for monitoring purposes."""
        try:
            message_count = len(memory.chat_memory.messages)
            from app.core.tracing import get_workflow_tracer
            tracer = get_workflow_tracer(session_id=session_id)
            tracer.track_memory_operation(
                "retrieve",
                "PersistentBufferMemory",
                f"{message_count} messages loaded",
                session_id
            )
        except Exception:
            # Silently ignore tracing errors
            pass

