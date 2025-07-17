from sqlalchemy import Column, String, UUID, DateTime, Boolean, Text, TIMESTAMP
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from .base import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255))
    password_hash = Column(String(255), nullable=False)
    role = Column(String)
    credential = Column(Text)
    temp_token = Column(Text)
    token_expiry = Column(TIMESTAMP(timezone=True))
    status = Column(String, nullable=False)
    active_workspace_id = Column(UUID(as_uuid=True))
    last_login = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), default=func.now(), onupdate=func.now())
    is_active = Column(Boolean, default=True)
    
    # Relationships
    api_keys = relationship("APIKey", back_populates="user", cascade="all, delete-orphan")
    workflows = relationship("Workflow", back_populates="user", cascade="all, delete-orphan")
    executions = relationship("WorkflowExecution", back_populates="user")
    workflow_templates = relationship("WorkflowTemplate", back_populates="author")
    credentials = relationship("UserCredential", back_populates="user", cascade="all, delete-orphan")
    organization_associations = relationship("OrganizationUser", back_populates="user", foreign_keys="OrganizationUser.user_id")

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}')>" 