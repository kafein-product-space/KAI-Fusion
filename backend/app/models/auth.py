from sqlalchemy import Column, String, UUID, Text, Integer, TIMESTAMP, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from .base import Base

class LoginMethod(Base):
    __tablename__ = "login_method"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey('organization.id'))
    name = Column(String(100), nullable=False)
    config = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default='ENABLE')
    created_at = Column(TIMESTAMP(timezone=True), default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), default=func.now(), onupdate=func.now())
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    updated_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    
    # Relationships
    organization = relationship("Organization", back_populates="login_methods")
    creator = relationship("User", foreign_keys=[created_by])
    updater = relationship("User", foreign_keys=[updated_by])

class LoginActivity(Base):
    __tablename__ = "login_activity"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String, nullable=False)
    activity_code = Column(Integer, nullable=False)
    message = Column(String, nullable=False)
    attempted_at = Column(TIMESTAMP(timezone=True), default=func.now()) 