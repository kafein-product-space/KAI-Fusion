"""Memory service for database operations."""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from uuid import UUID

from app.models.memory import Memory
from app.models.user import User
# MemoryAgent removed - implementing basic MemoryStore interface
from datetime import datetime
from typing import Dict, Any
from app.core.database import get_db_session


class MemoryItem:
    """Basic memory item class."""
    def __init__(self, id: str, content: str, context: str, timestamp: datetime, 
                 user_id: str, session_id: str, metadata: Dict[str, Any] = None):
        self.id = id
        self.content = content
        self.context = context
        self.timestamp = timestamp
        self.user_id = user_id
        self.session_id = session_id
        self.metadata = metadata or {}


class MemoryStore:
    """Basic memory store interface."""
    def save_memory(self, user_id: str, session_id: str, content: str, context: str = "", metadata: Dict[str, Any] = None) -> str:
        raise NotImplementedError
    
    def retrieve_memories(self, user_id: str, query: str = "", limit: int = 10, semantic_search: bool = True):
        raise NotImplementedError
    
    def get_memory_count(self, user_id: str) -> int:
        return 0
    
    def get_memory_stats(self, user_id: str) -> Dict[str, Any]:
        return {}
    
    def clear_memories(self, user_id: str, session_id: str = None) -> int:
        return 0


class DatabaseMemoryStore(MemoryStore):
    """Database-backed memory store implementation."""
    
    def __init__(self):
        super().__init__()
        self.db_session = None
    
    def _get_session(self) -> Session:
        """Get database session."""
        if self.db_session is None:
            self.db_session = next(get_db_session())
        return self.db_session
    
    def save_memory(self, user_id: str, session_id: str, content: str, context: str = "", metadata: Dict[str, Any] = None) -> str:
        """Save memory to database."""
        try:
            db = self._get_session()
            
            memory = Memory(
                user_id=UUID(user_id),
                session_id=session_id,
                content=content,
                context=context,
                memory_metadata=metadata or {}
            )
            
            db.add(memory)
            db.commit()
            db.refresh(memory)
            
            return str(memory.id)
        except Exception as e:
            print(f"Error saving memory to database: {e}")
            # Fallback to in-memory storage
            return super().save_memory(user_id, session_id, content, context, metadata)
    
    def retrieve_memories(self, user_id: str, query: str = "", limit: int = 10, semantic_search: bool = True) -> List[MemoryItem]:
        """Retrieve memories from database."""
        try:
            db = self._get_session()
            
            # Base query
            query_builder = db.query(Memory).filter(Memory.user_id == UUID(user_id))
            
            # Apply text search if query provided
            if query:
                search_filter = func.lower(Memory.content).contains(query.lower()) | func.lower(Memory.context).contains(query.lower())
                query_builder = query_builder.filter(search_filter)
            
            # Order by creation date (most recent first) and limit
            memories = query_builder.order_by(desc(Memory.created_at)).limit(limit).all()
            
            # Convert to MemoryItem objects
            memory_items = []
            for memory in memories:
                memory_item = MemoryItem(
                    id=str(memory.id),
                    content=memory.content,
                    context=memory.context or "",
                    timestamp=memory.created_at,
                    user_id=str(memory.user_id),
                    session_id=memory.session_id,
                    metadata=memory.memory_metadata or {}
                )
                memory_items.append(memory_item)
            
            # Apply semantic search if enabled and query provided
            if query and semantic_search and memory_items:
                return self._apply_semantic_search(memory_items, query, limit)
            
            return memory_items
            
        except Exception as e:
            print(f"Error retrieving memories from database: {e}")
            # Fallback to in-memory storage
            return super().retrieve_memories(user_id, query, limit, semantic_search)
    
    def _apply_semantic_search(self, memories: List[MemoryItem], query: str, limit: int) -> List[MemoryItem]:
        """Apply semantic search using TF-IDF."""
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.metrics.pairwise import cosine_similarity
            import numpy as np
            
            memory_texts = [f"{m.content} {m.context}" for m in memories]
            
            # Create TF-IDF vectorizer
            vectorizer = TfidfVectorizer(stop_words='english', max_features=1000)
            tfidf_matrix = vectorizer.fit_transform(memory_texts + [query])
            
            # Calculate cosine similarity
            query_vector = tfidf_matrix[-1]
            memory_vectors = tfidf_matrix[:-1]
            similarities = cosine_similarity(query_vector, memory_vectors).flatten()
            
            # Get top similar memories
            similar_indices = np.argsort(similarities)[::-1]
            
            # Filter memories with similarity > 0.1
            relevant_memories = []
            for idx in similar_indices:
                if similarities[idx] > 0.1:
                    memory = memories[idx]
                    memory.metadata['similarity_score'] = float(similarities[idx])
                    relevant_memories.append(memory)
            
            return relevant_memories[:limit]
            
        except Exception as e:
            print(f"Semantic search failed: {e}")
            return memories[:limit]
    
    def get_memory_count(self, user_id: str) -> int:
        """Get total memory count for a user."""
        try:
            db = self._get_session()
            return db.query(func.count(Memory.id)).filter(Memory.user_id == UUID(user_id)).scalar()
        except Exception as e:
            print(f"Error getting memory count: {e}")
            return super().get_memory_count(user_id)
    
    def get_memory_stats(self, user_id: str) -> Dict[str, Any]:
        """Get detailed memory statistics."""
        try:
            db = self._get_session()
            
            # Get all memories for user
            memories = db.query(Memory).filter(Memory.user_id == UUID(user_id)).all()
            
            if not memories:
                return {"total_memories": 0, "sessions": 0, "oldest_memory": None, "newest_memory": None}
            
            # Calculate statistics
            sessions = set(m.session_id for m in memories)
            oldest = min(memories, key=lambda x: x.created_at)
            newest = max(memories, key=lambda x: x.created_at)
            avg_length = sum(len(m.content) for m in memories) / len(memories)
            
            return {
                "total_memories": len(memories),
                "sessions": len(sessions),
                "oldest_memory": oldest.created_at.isoformat(),
                "newest_memory": newest.created_at.isoformat(),
                "average_content_length": avg_length
            }
            
        except Exception as e:
            print(f"Error getting memory stats: {e}")
            return super().get_memory_stats(user_id)
    
    def clear_memories(self, user_id: str, session_id: str = None) -> int:
        """Clear memories for a user or specific session."""
        try:
            db = self._get_session()
            
            query = db.query(Memory).filter(Memory.user_id == UUID(user_id))
            
            if session_id:
                query = query.filter(Memory.session_id == session_id)
            
            # Get count before deletion
            count = query.count()
            
            # Delete memories
            query.delete(synchronize_session=False)
            db.commit()
            
            return count
            
        except Exception as e:
            print(f"Error clearing memories: {e}")
            return super().clear_memories(user_id, session_id)
    
    def get_memory_analytics(self, user_id: str, days: int = 30) -> Dict[str, Any]:
        """Get memory analytics for a user."""
        try:
            db = self._get_session()
            
            # Calculate date range
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            # Get memories within date range
            memories = db.query(Memory).filter(
                Memory.user_id == UUID(user_id),
                Memory.created_at >= cutoff_date
            ).all()
            
            # Calculate analytics
            total_memories = len(memories)
            sessions = set(m.session_id for m in memories)
            
            # Daily memory counts
            daily_counts = {}
            for memory in memories:
                date_key = memory.created_at.date().isoformat()
                daily_counts[date_key] = daily_counts.get(date_key, 0) + 1
            
            # Content analysis
            content_lengths = [len(m.content) for m in memories]
            avg_content_length = sum(content_lengths) / len(content_lengths) if content_lengths else 0
            
            # Word frequency analysis
            all_content = " ".join(m.content.lower() for m in memories)
            words = all_content.split()
            word_counts = {}
            for word in words:
                if len(word) > 3:  # Skip short words
                    word_counts[word] = word_counts.get(word, 0) + 1
            
            top_words = sorted(word_counts.items(), key=lambda x: x[1], reverse=True)[:10]
            
            return {
                "period_days": days,
                "total_memories": total_memories,
                "total_sessions": len(sessions),
                "daily_counts": daily_counts,
                "average_content_length": avg_content_length,
                "top_words": [{"word": word, "count": count} for word, count in top_words],
                "analytics_timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            print(f"Error getting memory analytics: {e}")
            return {
                "period_days": days,
                "total_memories": 0,
                "total_sessions": 0,
                "daily_counts": {},
                "average_content_length": 0,
                "top_words": [],
                "analytics_timestamp": datetime.utcnow().isoformat(),
                "error": str(e)
            }


# Global database memory store instance
db_memory_store = DatabaseMemoryStore()