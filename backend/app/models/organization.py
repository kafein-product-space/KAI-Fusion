from sqlalchemy import Column, String, UUID, Text, TIMESTAMP, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from .base import Base

class Role(Base):
    __tablename__ = "roles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String)
    description = Column(String)
    permissions = Column(Text)
    
    # Relationships
    organization_users = relationship("OrganizationUser", back_populates="role")

class Organization(Base):
    __tablename__ = "organization"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    admin_user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    default_ws_id = Column(UUID(as_uuid=True))
    organization_type = Column(String)
    created_at = Column(TIMESTAMP(timezone=True), default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), default=func.now(), onupdate=func.now())
    
    # Relationships
    admin_user = relationship("User")
    
    organization_users = relationship("OrganizationUser", back_populates="organization")
    login_methods = relationship("LoginMethod", back_populates="organization")

class OrganizationUser(Base):
    __tablename__ = "organization_user"
    
    organization_id = Column(UUID(as_uuid=True), ForeignKey('organization.id'), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), primary_key=True)
    role_id = Column(UUID(as_uuid=True), ForeignKey('roles.id'), nullable=False)
    status = Column(String(20), nullable=False, default='ACTIVE')
    created_at = Column(TIMESTAMP(timezone=True), default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), default=func.now(), onupdate=func.now())
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    updated_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    
    # Relationships
    organization = relationship("Organization", back_populates="organization_users")
    user = relationship("User", back_populates="organization_associations", foreign_keys=[user_id])
    
    role = relationship("Role", back_populates="organization_users")
    creator = relationship("User", foreign_keys=[created_by])
    updater = relationship("User", foreign_keys=[updated_by]) 