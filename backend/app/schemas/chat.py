import uuid
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# Base schema for chat message fields
class ChatMessageBase(BaseModel):
    role: str
    content: str
    source_documents: Optional[str] = None

# Schema for creating a chat message
class ChatMessageCreate(ChatMessageBase):
    chatflow_id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    workflow_id: Optional[uuid.UUID] = None

# Schema for updating a chat message
class ChatMessageUpdate(BaseModel):
    role: Optional[str] = None
    content: Optional[str] = None
    source_documents: Optional[str] = None

# Schema for user input in an interaction
class ChatMessageInput(BaseModel):
    content: str

# Schema for API responses
class ChatMessageResponse(ChatMessageBase):
    id: uuid.UUID
    chatflow_id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True 