"""Memory service package with clean repository pattern."""

from typing import List, Dict, Any
from sqlalchemy.orm import Session

# Import all components
from .repo import MemoryRepo
from .service import MemoryService, MemoryItem
from .store import MemoryStore, DatabaseMemoryStore, create_memory_store, db_memory_store

# Create instances
memory_repo = MemoryRepo()
memory_service = MemoryService()

# Main functions that can be used directly
def save_memory(db: Session, user_id: str, session_id: str, content: str, 
               context: str = "", metadata: Dict[str, Any] = None, 
               source_type: str = "chat", chatflow_id: str = None) -> str:
    """Save memory and return ID."""
    return memory_service.save_memory(
        db, user_id, session_id, content, context, metadata, source_type, chatflow_id
    )

def get_memories_by_user(db: Session, user_id: str, limit: int = 10, 
                        offset: int = 0) -> List:
    """Get memories for a user."""
    return memory_repo.get_memories_by_user(db, user_id, limit, offset)

def get_memories_by_session(db: Session, session_id: str, limit: int = 10, 
                           offset: int = 0) -> List:
    """Get memories for a session."""
    return memory_repo.get_memories_by_session(db, session_id, limit, offset)

def retrieve_memories(db: Session, user_id: str, query: str = "", 
                     limit: int = 10, semantic_search: bool = True) -> List[MemoryItem]:
    """Retrieve memories with optional semantic search."""
    return memory_service.retrieve_memories(db, user_id, query, limit, semantic_search)

def search_memories(db: Session, user_id: str, query: str, limit: int = 10) -> List:
    """Search memories by content."""
    return memory_repo.search_memories_by_content(db, user_id, query, limit)

def get_memory_count(db: Session, user_id: str) -> int:
    """Get total memory count for a user."""
    return memory_repo.get_memory_count_by_user(db, user_id)

def get_memory_count_by_session(db: Session, session_id: str) -> int:
    """Get total memory count for a session."""
    return memory_repo.get_memory_count_by_session(db, session_id)

def get_memory_stats(db: Session, user_id: str) -> Dict[str, Any]:
    """Get detailed memory statistics."""
    return memory_service.get_memory_stats(db, user_id)

def get_memory_analytics(db: Session, user_id: str, days: int = 30) -> Dict[str, Any]:
    """Get memory analytics for a user."""
    return memory_service.get_memory_analytics(db, user_id, days)

def clear_memories(db: Session, user_id: str, session_id: str = None) -> int:
    """Clear memories for a user or specific session."""
    return memory_service.clear_memories(db, user_id, session_id)

def delete_memory(db: Session, memory_id: str) -> bool:
    """Delete a specific memory."""
    return memory_repo.delete_memory(db, memory_id)

def delete_memories_by_user(db: Session, user_id: str) -> int:
    """Delete all memories for a user."""
    return memory_repo.delete_memories_by_user(db, user_id)

def delete_memories_by_session(db: Session, session_id: str) -> int:
    """Delete all memories for a session."""
    return memory_repo.delete_memories_by_session(db, session_id)

def get_session_memories(db: Session, session_id: str, limit: int = 10) -> List[MemoryItem]:
    """Get memories for a specific session."""
    return memory_service.get_session_memories(db, session_id, limit)

def get_session_list_by_user(db: Session, user_id: str) -> List[str]:
    """Get unique session IDs for a user."""
    return memory_repo.get_session_list_by_user(db, user_id)

def update_memory(db: Session, memory_id: str, content: str = None, 
                 context: str = None, metadata: dict = None):
    """Update a memory."""
    return memory_repo.update_memory(db, memory_id, content, context, metadata)

def get_memory_by_id(db: Session, memory_id: str):
    """Get a specific memory by ID."""
    return memory_repo.get_memory_by_id(db, memory_id)

def get_memories_by_date_range(db: Session, user_id: str, start_date, end_date) -> List:
    """Get memories within a date range."""
    return memory_repo.get_memories_by_date_range(db, user_id, start_date, end_date)

def get_memories_by_source_type(db: Session, user_id: str, source_type: str, limit: int = 10) -> List:
    """Get memories by source type."""
    return memory_repo.get_memories_by_source_type(db, user_id, source_type, limit)

def get_memories_by_chatflow(db: Session, chatflow_id: str, limit: int = 10) -> List:
    """Get memories by chatflow ID."""
    return memory_repo.get_memories_by_chatflow(db, chatflow_id, limit)

# Export everything for easy access
__all__ = [
    # Classes
    'MemoryRepo',
    'MemoryService', 
    'MemoryItem',
    'MemoryStore',
    'DatabaseMemoryStore',
    
    # Instances
    'memory_repo',
    'memory_service',
    'db_memory_store',
    
    # Factory function
    'create_memory_store',
    
    # Main functions
    'save_memory',
    'get_memories_by_user',
    'get_memories_by_session',
    'retrieve_memories',
    'search_memories',
    'get_memory_count',
    'get_memory_count_by_session',
    'get_memory_stats',
    'get_memory_analytics',
    'clear_memories',
    'delete_memory',
    'delete_memories_by_user',
    'delete_memories_by_session',
    'get_session_memories',
    'get_session_list_by_user',
    'update_memory',
    'get_memory_by_id',
    'get_memories_by_date_range',
    'get_memories_by_source_type',
    'get_memories_by_chatflow',
]