from sqlalchemy import Column, String, Text, UUID, TIMESTAMP, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from .base import Base

class Variable(Base):
    __tablename__ = "variable"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    workflow_id = Column(UUID(as_uuid=True), ForeignKey('workflows.id', ondelete='CASCADE'), nullable=True, index=True)
    name = Column(String, nullable=False)
    value = Column(Text, nullable=False)
    type = Column(Text, nullable=True)
    created_at = Column("createdDate", TIMESTAMP(timezone=True), nullable=False, default=func.now())
    updated_at = Column("updatedDate", TIMESTAMP(timezone=True), nullable=False, default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="variables")
    workflow = relationship("Workflow", back_populates="variables") 