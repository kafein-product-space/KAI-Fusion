from sqlalchemy import Column, String, UUID, DateTime, Boolean, JSON, TIMESTAMP
from sqlalchemy.sql import func
import uuid
from .base import Base
from .node import NodeCategory


class NodeRegistry(Base):
    """Node Registry model for storing node type definitions and schemas"""
    
    __tablename__ = "node_registry"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    node_type = Column(String(100), unique=True, nullable=False, index=True)
    node_class = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False, index=True)
    version = Column(String(20), default='1.0.0')
    schema_definition = Column(JSON, nullable=False)  # Input/output schema
    ui_schema = Column(JSON, nullable=False)  # UI configuration schema
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(TIMESTAMP(timezone=True), default=func.now())
    
    def as_dict(self):
        """Convert model to dictionary"""
        return {
            'id': str(self.id),
            'node_type': self.node_type,
            'node_class': self.node_class,
            'category': self.category,
            'version': self.version,
            'schema_definition': self.schema_definition,
            'ui_schema': self.ui_schema,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f"<NodeRegistry(id={self.id}, node_type='{self.node_type}', category='{self.category}')>" 