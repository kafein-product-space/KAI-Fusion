from sqlalchemy import Column, String, Integer, BigInteger, TIMESTAMP, ForeignKey, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base
import uuid


class VectorCollection(Base):
    __tablename__ = "vector_collections"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_id = Column(UUID(as_uuid=True), ForeignKey('workflows.id', ondelete='CASCADE'), nullable=False)
    collection_name = Column(String(255), nullable=False)
    embedding_dimension = Column(Integer, nullable=False)
    distance_strategy = Column(String(20), default='cosine')
    index_type = Column(String(20), default='ivfflat')
    index_params = Column(JSONB)
    document_count = Column(BigInteger, default=0)
    created_at = Column(TIMESTAMP(timezone=True), default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), default=func.now(), onupdate=func.now())
    
    workflow = relationship("Workflow", back_populates="vector_collections")
    documents = relationship("VectorDocument", back_populates="collection", cascade="all, delete-orphan")
    
    __table_args__ = (
        UniqueConstraint('workflow_id', 'collection_name', name='unique_workflow_collection'),
        Index('idx_vector_collections_workflow', 'workflow_id'),
        Index('idx_vector_collections_name', 'collection_name'),
    ) 