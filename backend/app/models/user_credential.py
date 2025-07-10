from sqlalchemy import Column, String, UUID, Text, TIMESTAMP, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from .base import Base

class UserCredential(Base):
    __tablename__ = "user_credentials"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    service_type = Column(String(50), nullable=False)
    encrypted_secret = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), default=func.now(), onupdate=func.now())
    
    __table_args__ = (UniqueConstraint('user_id', 'name'),)
    
    # Relationship
    user = relationship("User", back_populates="credentials") 