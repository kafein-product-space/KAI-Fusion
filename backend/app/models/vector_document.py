from sqlalchemy import Column, String, Integer, Text, TIMESTAMP, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base
import uuid


class VectorDocument(Base):
    __tablename__ = "vector_documents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    collection_id = Column(UUID(as_uuid=True), ForeignKey('vector_collections.id', ondelete='CASCADE'), nullable=False)
    content = Column(Text, nullable=False)
    document_metadata = Column(JSONB, default={})
    embedding = Column(String)  # Will store vector as string, can be converted to actual vector type
    source_url = Column(Text)
    source_type = Column(String(50))
    chunk_index = Column(Integer)
    created_at = Column(TIMESTAMP(timezone=True), default=func.now())
    
    collection = relationship("VectorCollection", back_populates="documents")
    
    __table_args__ = (
        Index('idx_vector_documents_collection', 'collection_id'),
        Index('idx_vector_documents_metadata', 'document_metadata', postgresql_using='gin'),
    ) 