import uuid
from pydantic import BaseModel, Field
from pydantic.alias_generators import to_camel
from typing import Optional
from datetime import datetime

class APIKeyBase(BaseModel):
    key_name: str = Field(..., alias="keyName")

    class Config:
        populate_by_name = True
        alias_generator = to_camel

class APIKeyCreate(APIKeyBase):
    pass

class APIKeyUpdate(APIKeyBase):
    pass

class APIKeyResponse(APIKeyBase):
    id: uuid.UUID
    created_at: datetime = Field(..., alias="createdAt")
    last_used_at: Optional[datetime] = Field(None, alias="lastUsedAt")

    class Config:
        from_attributes = True
        populate_by_name = True
        alias_generator = to_camel


class APIKeyCreateResponse(APIKeyResponse):
    key: str 