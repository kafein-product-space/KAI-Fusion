"""Memory database models for KAI Fusion."""

from sqlalchemy import Column, String, Text, DateTime, JSON, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from .base import Base


class Memory(Base):
    """Memory storage table for semantic memory management."""

    __tablename__ = "memories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    session_id = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    context = Column(Text, nullable=True)
    memory_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationship to user
    user = relationship("User", back_populates="memories")

    # Indexes for performance
    __table_args__ = (
        Index("idx_memories_user_id", "user_id"),
        Index("idx_memories_session_id", "session_id"),
        Index("idx_memories_created_at", "created_at"),
        Index("idx_memories_user_session", "user_id", "session_id"),
    )

    def __repr__(self):
        return f"<Memory(id={self.id}, user_id={self.user_id}, session_id={self.session_id})>"

    def to_dict(self):
        """Convert memory to dictionary."""
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "session_id": self.session_id,
            "content": self.content,
            "context": self.context,
            "metadata": self.memory_metadata or {},
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }