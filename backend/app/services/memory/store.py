"""Simplified memory service using repository pattern."""

from typing import List, Dict, Any
from sqlalchemy.orm import Session

from .repo import MemoryRepo
from .service import MemoryService, MemoryItem


class MemoryStore:
    """Basic memory store interface for backwards compatibility."""
    
    def save_memory(self, user_id: str, session_id: str, content: str, context: str = "", 
                   metadata: Dict[str, Any] = None) -> str:
        raise NotImplementedError
    
    def retrieve_memories(self, user_id: str, query: str = "", limit: int = 10, 
                         semantic_search: bool = True) -> List[MemoryItem]:
        raise NotImplementedError
    
    def get_memory_count(self, user_id: str) -> int:
        return 0
    
    def get_memory_stats(self, user_id: str) -> Dict[str, Any]:
        return {}
    
    def clear_memories(self, user_id: str, session_id: str = None) -> int:
        return 0


class DatabaseMemoryStore(MemoryStore):
    """Database-backed memory store using repository pattern."""
    
    def __init__(self, db_session: Session = None):
        """Initialize with optional database session."""
        self.db_session = db_session
        self.memory_service = MemoryService()
    
    def save_memory(self, user_id: str, session_id: str, content: str, context: str = "", 
                   metadata: Dict[str, Any] = None) -> str:
        """Save memory to database."""
        if not self.db_session:
            raise ValueError("Database session is required")
        
        return self.memory_service.save_memory(
            self.db_session, user_id, session_id, content, context, metadata
        )
    
    def retrieve_memories(self, user_id: str, query: str = "", limit: int = 10, 
                         semantic_search: bool = True) -> List[MemoryItem]:
        """Retrieve memories from database."""
        if not self.db_session:
            raise ValueError("Database session is required")
        
        return self.memory_service.retrieve_memories(
            self.db_session, user_id, query, limit, semantic_search
        )
    
    def get_memory_count(self, user_id: str) -> int:
        """Get total memory count for a user."""
        if not self.db_session:
            raise ValueError("Database session is required")
        
        return self.memory_service.get_memory_count(self.db_session, user_id)
    
    def get_memory_stats(self, user_id: str) -> Dict[str, Any]:
        """Get detailed memory statistics."""
        if not self.db_session:
            raise ValueError("Database session is required")
        
        return self.memory_service.get_memory_stats(self.db_session, user_id)
    
    def clear_memories(self, user_id: str, session_id: str = None) -> int:
        """Clear memories for a user or specific session."""
        if not self.db_session:
            raise ValueError("Database session is required")
        
        return self.memory_service.clear_memories(self.db_session, user_id, session_id)
    
    def get_memory_analytics(self, user_id: str, days: int = 30) -> Dict[str, Any]:
        """Get memory analytics for a user."""
        if not self.db_session:
            raise ValueError("Database session is required")
        
        return self.memory_service.get_memory_analytics(self.db_session, user_id, days)
    
    def get_session_memories(self, session_id: str, limit: int = 10) -> List[MemoryItem]:
        """Get memories for a specific session."""
        if not self.db_session:
            raise ValueError("Database session is required")
        
        return self.memory_service.get_session_memories(self.db_session, session_id, limit)


# Factory function to create memory store with session
def create_memory_store(db_session: Session) -> DatabaseMemoryStore:
    """Create a memory store with the provided database session."""
    return DatabaseMemoryStore(db_session)


# Legacy global instance - deprecated, use create_memory_store instead
# This maintains backwards compatibility but requires manual session injection
class LegacyMemoryStore(DatabaseMemoryStore):
    """Legacy memory store that requires external session management."""
    
    def __init__(self):
        super().__init__(None)
        self._session = None
    
    def set_session(self, db_session: Session):
        """Set the database session - required before using any methods."""
        self._session = db_session
        self.db_session = db_session
    
    def save_memory(self, user_id: str, session_id: str, content: str, context: str = "", 
                   metadata: Dict[str, Any] = None) -> str:
        if not self._session:
            raise ValueError("Database session must be set using set_session() method")
        return super().save_memory(user_id, session_id, content, context, metadata)
    
    def retrieve_memories(self, user_id: str, query: str = "", limit: int = 10, 
                         semantic_search: bool = True) -> List[MemoryItem]:
        if not self._session:
            raise ValueError("Database session must be set using set_session() method")
        return super().retrieve_memories(user_id, query, limit, semantic_search)
    
    def get_memory_count(self, user_id: str) -> int:
        if not self._session:
            raise ValueError("Database session must be set using set_session() method")
        return super().get_memory_count(user_id)
    
    def get_memory_stats(self, user_id: str) -> Dict[str, Any]:
        if not self._session:
            raise ValueError("Database session must be set using set_session() method")
        return super().get_memory_stats(user_id)
    
    def clear_memories(self, user_id: str, session_id: str = None) -> int:
        if not self._session:
            raise ValueError("Database session must be set using set_session() method")
        return super().clear_memories(user_id, session_id)


# Legacy global instance for backwards compatibility
db_memory_store = LegacyMemoryStore()