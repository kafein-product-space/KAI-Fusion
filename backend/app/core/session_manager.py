"""
Session management for maintaining conversation context and state
"""
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta, UTC
import uuid
import asyncio
from collections import defaultdict
import json

class SessionManager:
    """Manages workflow sessions with memory and context"""
    
    def __init__(self, ttl_minutes: int = 30):
        self.sessions: Dict[str, SessionData] = {}
        self.ttl = timedelta(minutes=ttl_minutes)
        self._cleanup_task = None
        self._lock = asyncio.Lock()
    
    async def create_session(self, workflow_id: str, user_id: Optional[str] = None) -> str:
        """Create a new session"""
        async with self._lock:
            session_id = str(uuid.uuid4())
            self.sessions[session_id] = SessionData(
                session_id=session_id,
                workflow_id=workflow_id,
                user_id=user_id or "anonymous",
                created_at=datetime.now(UTC),
                last_accessed=datetime.now(UTC),
                messages=[],
                context={},
                memory_store={}
            )
            return session_id
    
    async def get_session(self, session_id: str) -> Optional['SessionData']:
        """Get session by ID"""
        async with self._lock:
            session = self.sessions.get(session_id)
            if session:
                # Update last accessed time
                session.last_accessed = datetime.now(UTC)
                
                # Check if session expired
                if datetime.now(UTC) - session.created_at > self.ttl:
                    del self.sessions[session_id]
                    return None
                
                return session
            return None
    
    async def update_session(
        self, 
        session_id: str, 
        human_message: Optional[str] = None,
        ai_message: Optional[str] = None,
        context_update: Optional[Dict[str, Any]] = None,
        memory_update: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Update session with new messages or context"""
        async with self._lock:
            session = self.sessions.get(session_id)
            if not session:
                return False
            
            # Add messages
            if human_message and ai_message:
                session.messages.append({
                    "human": human_message,
                    "ai": ai_message,
                    "timestamp": datetime.now(UTC).isoformat()
                })
            
            # Update context
            if context_update:
                session.context.update(context_update)
            
            # Update memory
            if memory_update:
                session.memory_store.update(memory_update)
            
            session.last_accessed = datetime.now(UTC)
            return True
    
    async def get_session_context(self, session_id: str) -> Dict[str, Any]:
        """Get context for chain execution"""
        session = await self.get_session(session_id)
        if not session:
            return {}
        
        return {
            "messages": session.messages,
            "context": session.context,
            "memory": session.memory_store,
            "session_id": session_id,
            "user_id": session.user_id
        }
    
    async def delete_session(self, session_id: str) -> bool:
        """Delete a session"""
        async with self._lock:
            if session_id in self.sessions:
                del self.sessions[session_id]
                return True
            return False
    
    async def cleanup_expired_sessions(self):
        """Remove expired sessions"""
        async with self._lock:
            current_time = datetime.now(UTC)
            expired_sessions = []
            
            for session_id, session in self.sessions.items():
                if current_time - session.last_accessed > self.ttl:
                    expired_sessions.append(session_id)
            
            for session_id in expired_sessions:
                del self.sessions[session_id]
            
            return len(expired_sessions)
    
    async def start_cleanup_task(self):
        """Start background cleanup task"""
        if self._cleanup_task:
            return
        
        async def cleanup_loop():
            while True:
                try:
                    await asyncio.sleep(300)  # Run every 5 minutes
                    count = await self.cleanup_expired_sessions()
                    if count > 0:
                        print(f"Cleaned up {count} expired sessions")
                except Exception as e:
                    print(f"Error in cleanup task: {e}")
        
        self._cleanup_task = asyncio.create_task(cleanup_loop())
    
    async def stop_cleanup_task(self):
        """Stop background cleanup task"""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            self._cleanup_task = None
    
    def get_stats(self) -> Dict[str, Any]:
        """Get session statistics"""
        total_sessions = len(self.sessions)
        sessions_by_workflow = defaultdict(int)
        sessions_by_user = defaultdict(int)
        
        for session in self.sessions.values():
            sessions_by_workflow[session.workflow_id] += 1
            sessions_by_user[session.user_id] += 1
        
        return {
            "total_sessions": total_sessions,
            "sessions_by_workflow": dict(sessions_by_workflow),
            "sessions_by_user": dict(sessions_by_user),
            "ttl_minutes": self.ttl.total_seconds() / 60
        }

class SessionData:
    """Container for session data"""
    
    def __init__(
        self,
        session_id: str,
        workflow_id: str,
        user_id: str,
        created_at: datetime,
        last_accessed: datetime,
        messages: List[Dict[str, Any]],
        context: Dict[str, Any],
        memory_store: Dict[str, Any]
    ):
        self.session_id = session_id
        self.workflow_id = workflow_id
        self.user_id = user_id
        self.created_at = created_at
        self.last_accessed = last_accessed
        self.messages = messages
        self.context = context
        self.memory_store = memory_store
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "session_id": self.session_id,
            "workflow_id": self.workflow_id,
            "user_id": self.user_id,
            "created_at": self.created_at.isoformat(),
            "last_accessed": self.last_accessed.isoformat(),
            "message_count": len(self.messages),
            "context": self.context,
            "has_memory": bool(self.memory_store)
        }

class ConversationMemoryAdapter:
    """Adapter to integrate LangChain memory with session manager"""
    
    def __init__(self, session_manager: SessionManager, session_id: str):
        self.session_manager = session_manager
        self.session_id = session_id
    
    async def save_context(self, inputs: Dict[str, Any], outputs: Dict[str, Any]):
        """Save conversation context"""
        human_message = inputs.get("input", "")
        ai_message = outputs.get("output", outputs.get("text", ""))
        
        await self.session_manager.update_session(
            self.session_id,
            human_message=human_message,
            ai_message=ai_message
        )
    
    async def load_memory_variables(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Load memory variables"""
        context = await self.session_manager.get_session_context(self.session_id)
        
        # Format chat history
        chat_history = []
        for msg in context.get("messages", [])[-10:]:  # Last 10 messages
            chat_history.append(f"Human: {msg['human']}")
            chat_history.append(f"AI: {msg['ai']}")
        
        return {
            "chat_history": "\n".join(chat_history),
            "history": chat_history,
            **context.get("memory", {})
        }
    
    async def clear(self):
        """Clear memory"""
        session = await self.session_manager.get_session(self.session_id)
        if session:
            session.messages.clear()
            session.memory_store.clear()

# Create a default global SessionManager instance for convenience
session_manager = SessionManager()

__all__ = [
    "SessionManager",
    "SessionData",
    "ConversationMemoryAdapter",
    "session_manager",
]
