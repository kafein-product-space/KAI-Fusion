from sqlalchemy import Column, String, Text, UUID, TIMESTAMP
from sqlalchemy.sql import func
import uuid
from .base import Base

class Variable(Base):
    __tablename__ = "variable"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    value = Column(Text, nullable=False)
    type = Column(Text, nullable=True)
    created_at = Column("createdDate", TIMESTAMP(timezone=True), nullable=False, default=func.now())
    updated_at = Column("updatedDate", TIMESTAMP(timezone=True), nullable=False, default=func.now(), onupdate=func.now()) 