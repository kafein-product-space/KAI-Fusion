from sqlalchemy import Column, String, UUID, Text, TIMESTAMP
from sqlalchemy.sql import func
import uuid
from .base import Base

class ChatMessage(Base):
    __tablename__ = "chat_message"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    role = Column(String(255), nullable=False)
    chatflow_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    content = Column(Text, nullable=False)
    source_documents = Column(String(255))
    created_at = Column(TIMESTAMP(timezone=True), default=func.now()) 