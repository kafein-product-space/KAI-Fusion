from sqlalchemy import Column, String, UUID, Text, TIMESTAMP, Index, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from .base import Base

class ChatMessage(Base):
    __tablename__ = "chat_message"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    workflow_id = Column(UUID(as_uuid=True), ForeignKey('workflows.id', ondelete='CASCADE'), nullable=True, index=True)
    role = Column(String(255), nullable=False)
    chatflow_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    content = Column(Text, nullable=False)
    source_documents = Column(String(255))
    created_at = Column(TIMESTAMP(timezone=True), default=func.now(), index=True)
    
    # Relationships
    user = relationship("User", back_populates="chat_messages")
    workflow = relationship("Workflow", back_populates="chat_messages")
    
    # Composite indexes for chat message queries
    __table_args__ = (
        Index('idx_chat_messages_chatflow_created', 'chatflow_id', 'created_at'),
        Index('idx_chat_messages_role_chatflow', 'role', 'chatflow_id'),
        Index('idx_chat_messages_user_created', 'user_id', 'created_at'),
        Index('idx_chat_messages_workflow_created', 'workflow_id', 'created_at'),
    ) 