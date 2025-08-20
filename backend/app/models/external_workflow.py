# -*- coding: utf-8 -*-
"""External workflow model for managing Docker-exported workflows."""

from sqlalchemy import Column, String, Boolean, Integer, DateTime, Text, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.models.base import Base


class ExternalWorkflow(Base):
    """External workflow model for Docker-exported workflows."""
    
    __tablename__ = "external_workflows"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Foreign key to user
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Basic workflow information
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Connection information
    host = Column(String(255), nullable=False)
    port = Column(Integer, nullable=False)
    is_secure = Column(Boolean, default=False)
    api_key = Column(String(500), nullable=True)  # Encrypted in real implementation
    api_key_required = Column(Boolean, default=False)  # Whether the external workflow requires API key
    
    # External workflow metadata
    external_workflow_id = Column(String(255), nullable=True)  # Original workflow ID from export
    external_url = Column(String(500), nullable=False)
    
    # Workflow structure information (read-only copy from external)
    workflow_structure = Column(JSON, nullable=True)  # Nodes, edges, etc.
    capabilities = Column(JSON, nullable=True)  # Chat, memory, etc.
    
    # Status and health
    status = Column(String(50), default="unknown")  # online, offline, error
    last_health_check = Column(DateTime(timezone=True), nullable=True)
    last_error = Column(Text, nullable=True)
    
    # Metadata
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="external_workflows")
    
    def __repr__(self):
        return f"<ExternalWorkflow(id={self.id}, name='{self.name}', host='{self.host}:{self.port}')>"
    
    @property
    def full_url(self) -> str:
        """Get the full URL of the external workflow."""
        protocol = "https" if self.is_secure else "http"
        return f"{protocol}://{self.host}:{self.port}"
    
    @property
    def is_online(self) -> bool:
        """Check if the workflow is currently online."""
        return self.status == "online"
    
    def to_dict(self) -> dict:
        """Convert to dictionary for API responses."""
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "name": self.name,
            "description": self.description,
            "host": self.host,
            "port": self.port,
            "is_secure": self.is_secure,
            "api_key_required": self.api_key_required,
            "external_workflow_id": self.external_workflow_id,
            "external_url": self.external_url,
            "workflow_structure": self.workflow_structure,
            "capabilities": self.capabilities,
            "status": self.status,
            "last_health_check": self.last_health_check.isoformat() if self.last_health_check else None,
            "last_error": self.last_error,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
