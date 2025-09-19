

from sqlalchemy import Column, String, UUID, Text, Boolean, Integer, TIMESTAMP, ForeignKey, Index, Float, text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
import uuid
from datetime import datetime
from .base import Base

class DocumentCollection(Base):
    """
    Document Collection Model - Hierarchical Document Organization
    ============================================================
    
    Provides enterprise-grade document collection management with hierarchical
    organization, metadata management, and intelligent collection analytics.
    """
    __tablename__ = "document_collections"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)  
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    doc_metadata = Column(JSONB, default={})
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(TIMESTAMP(timezone=True), default=func.now(), index=True)
    updated_at = Column(TIMESTAMP(timezone=True), default=func.now(), onupdate=func.now(), index=True)
    
    # Relationships
    user = relationship("User", back_populates="document_collections")
    documents = relationship("Document", back_populates="collection", cascade="all, delete-orphan")
    
    # Indexes for performance optimization
    __table_args__ = (
        Index('idx_doc_collections_user_active', 'user_id', 'is_active'),
        Index('idx_doc_collections_user_created', 'user_id', 'created_at'),
        Index('idx_doc_collections_metadata_gin', 'doc_metadata', postgresql_using='gin'),
    )

class Document(Base):
    """
    Document Storage Model - Enterprise Document Management
    =====================================================
    
    Comprehensive document storage with advanced metadata management,
    full-text search capabilities, version control, and intelligent
    document organization for enterprise AI workflow integration.
    """
    __tablename__ = "documents"
    
    # Primary identification
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    collection_id = Column(UUID(as_uuid=True), ForeignKey('document_collections.id', ondelete='CASCADE'), nullable=True, index=True)
    
    # Document content and metadata
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=False)
    document_format = Column(String(50), nullable=False, index=True)  # txt, json, docx, pdf, web
    
    # Source information
    source_url = Column(Text, nullable=True)  # For web documents
    file_path = Column(Text, nullable=True)   # For local files
    source_type = Column(String(50), nullable=True, index=True)  # web, file, upload
    
    # Content analysis
    content_hash = Column(String(64), nullable=True, index=True)  # SHA-256 for deduplication
    content_length = Column(Integer, nullable=True)
    word_count = Column(Integer, nullable=True)
    
    # Quality and processing metadata
    quality_score = Column(Float, nullable=True, index=True)
    processing_status = Column(String(50), default='completed', index=True)  # completed, processing, failed
    doc_metadata = Column(JSONB, default={})  # Flexible metadata storage
    
    # Organization and discovery
    tags = Column(ARRAY(String), default=[], index=True)
    is_public = Column(Boolean, default=False, index=True)
    
    # Version control and lifecycle
    version = Column(Integer, default=1)
    is_archived = Column(Boolean, default=False, index=True)
    archived_at = Column(TIMESTAMP(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(TIMESTAMP(timezone=True), default=func.now(), index=True)
    updated_at = Column(TIMESTAMP(timezone=True), default=func.now(), onupdate=func.now(), index=True)
    
    # Relationships
    user = relationship("User", back_populates="documents")
    collection = relationship("DocumentCollection", back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")
    access_logs = relationship("DocumentAccessLog", back_populates="document", cascade="all, delete-orphan")
    
    # Advanced indexes for enterprise performance
    __table_args__ = (
        # User-based access patterns
        Index('idx_documents_user_created', 'user_id', 'created_at'),
        Index('idx_documents_user_format', 'user_id', 'document_format'),
        Index('idx_documents_user_quality', 'user_id', 'quality_score'),
        
        # Collection-based organization
        Index('idx_documents_collection_created', 'collection_id', 'created_at'),
        Index('idx_documents_collection_format', 'collection_id', 'document_format'),
        
        # Full-text search optimization
        Index('idx_documents_content_fts', text("to_tsvector('english', content)"), postgresql_using='gin'),
        Index('idx_documents_title_fts', text("to_tsvector('english', title)"), postgresql_using='gin'),
        
        # Metadata and tag search
        Index('idx_documents_metadata_gin', 'doc_metadata', postgresql_using='gin'),
        Index('idx_documents_tags_gin', 'tags', postgresql_using='gin'),
        
        # Quality and processing filters
        Index('idx_documents_quality_created', 'quality_score', 'created_at'),
        Index('idx_documents_status_created', 'processing_status', 'created_at'),
        
        # Deduplication and content analysis
        Index('idx_documents_content_hash', 'content_hash'),
        Index('idx_documents_source_url', 'source_url'),
        
        # Public and archived document access
        Index('idx_documents_public_created', 'is_public', 'created_at'),
        Index('idx_documents_archived_status', 'is_archived', 'archived_at'),
    )

class DocumentChunk(Base):
    """
    Document Chunk Model - Processed Document Segments
    ================================================
    
    Storage for processed document chunks created by the ChunkSplitter,
    optimized for vector embedding and retrieval workflows.
    """
    __tablename__ = "document_chunks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey('documents.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Chunk content and metadata
    content = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)  # Position in original document
    content_length = Column(Integer, nullable=True)
    
    # Processing metadata
    splitter_strategy = Column(String(100), nullable=True)  # recursive_character, tokens, etc.
    chunk_size_config = Column(Integer, nullable=True)
    chunk_overlap_config = Column(Integer, nullable=True)
    
    # Quality and analytics
    quality_score = Column(Float, nullable=True)
    doc_metadata = Column(JSONB, default={})
    
    # Vector embedding integration
    embedding_model = Column(String(100), nullable=True)  # For tracking which model was used
    embedding_vector = Column(ARRAY(Float), nullable=True)  # Store embeddings directly
    
    # Timestamps
    created_at = Column(TIMESTAMP(timezone=True), default=func.now(), index=True)
    updated_at = Column(TIMESTAMP(timezone=True), default=func.now(), onupdate=func.now(), index=True)
    
    # Relationships
    document = relationship("Document", back_populates="chunks")
    user = relationship("User", back_populates="document_chunks")  
    
    # Chunk-specific indexes
    __table_args__ = (
        Index('idx_doc_chunks_document_index', 'document_id', 'chunk_index'),
        Index('idx_doc_chunks_user_created', 'user_id', 'created_at'),
        Index('idx_doc_chunks_strategy', 'splitter_strategy'),
        Index('idx_doc_chunks_quality', 'quality_score'),
        Index('idx_doc_chunks_content_fts', text("to_tsvector('english', content)"), postgresql_using='gin'),
        Index('idx_doc_chunks_metadata_gin', 'doc_metadata', postgresql_using='gin'),
    )

class DocumentAccessLog(Base):
    """
    Document Access Log - Audit Trail and Analytics
    ==============================================
    
    Comprehensive access logging for document usage analytics,
    compliance auditing, and user behavior analysis.
    """
    __tablename__ = "document_access_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey('documents.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Access details
    access_type = Column(String(50), nullable=False, index=True)  # read, search, download, etc.
    access_method = Column(String(100), nullable=True)  # api, web, node_processing, etc.
    
    # Context information
    session_id = Column(String(100), nullable=True, index=True)
    workflow_id = Column(UUID(as_uuid=True), nullable=True, index=True)  # If accessed within workflow
    node_id = Column(String(100), nullable=True)  # Which node accessed the document
    
    # Metadata
    doc_metadata = Column(JSONB, default={})
    access_timestamp = Column(TIMESTAMP(timezone=True), default=func.now(), index=True)
    
    # Relationships
    document = relationship("Document", back_populates="access_logs")
    user = relationship("User", back_populates="document_access_logs")
    
    # Access log indexes
    __table_args__ = (
        Index('idx_doc_access_logs_document_time', 'document_id', 'access_timestamp'),
        Index('idx_doc_access_logs_user_time', 'user_id', 'access_timestamp'),
        Index('idx_doc_access_logs_type_time', 'access_type', 'access_timestamp'),
        Index('idx_doc_access_logs_workflow', 'workflow_id', 'access_timestamp'),
        Index('idx_doc_access_logs_session', 'session_id', 'access_timestamp'),
    )

class DocumentVersion(Base):
    """
    Document Version Control - Change Tracking and History
    ====================================================
    
    Comprehensive version control system for document changes,
    enabling rollback capabilities and change audit trails.
    """
    __tablename__ = "document_versions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey('documents.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Version information
    version_number = Column(Integer, nullable=False)
    change_type = Column(String(50), nullable=False)  # create, update, metadata_change, etc.
    change_description = Column(Text, nullable=True)
    
    # Content snapshot
    content_snapshot = Column(Text, nullable=True)  # Store previous content for rollback
    metadata_snapshot = Column(JSONB, default={})
    
    # Change details
    changed_fields = Column(ARRAY(String), default=[])
    change_metadata = Column(JSONB, default={})
    
    # Timestamps
    created_at = Column(TIMESTAMP(timezone=True), default=func.now(), index=True)
    
    # Relationships
    document = relationship("Document")
    user = relationship("User")
    
    # Version control indexes
    __table_args__ = (
        Index('idx_doc_versions_document_version', 'document_id', 'version_number'),
        Index('idx_doc_versions_document_time', 'document_id', 'created_at'),
        Index('idx_doc_versions_user_time', 'user_id', 'created_at'),
        Index('idx_doc_versions_change_type', 'change_type', 'created_at'),
    )

# Export all models for easy importing
__all__ = [
    'Document',
    'DocumentCollection', 
    'DocumentChunk',
    'DocumentAccessLog',
    'DocumentVersion'
]