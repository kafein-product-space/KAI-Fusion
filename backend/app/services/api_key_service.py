import secrets
import uuid
from typing import List, Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.security import get_password_hash
from app.models.api_key import APIKey
from app.models.user import User
from app.schemas.api_key import APIKeyCreate, APIKeyUpdate
from app.services.base import BaseService

class APIKeyService(BaseService[APIKey]):
    def __init__(self):
        super().__init__(APIKey)

    async def create_api_key(self, db: AsyncSession, *, api_key_in: APIKeyCreate, user: User) -> Tuple[str, APIKey]:
        api_key = secrets.token_urlsafe(32)
        hashed_key = get_password_hash(api_key)

        db_api_key = APIKey(
            key_name=api_key_in.key_name,
            hashed_key=hashed_key,
            user_id=user.id
        )
        db.add(db_api_key)
        await db.commit()
        await db.refresh(db_api_key)
        
        return api_key, db_api_key

    async def get_api_keys(self, db: AsyncSession, *, user: User) -> List[APIKey]:
        query = select(self.model).filter(self.model.user_id == user.id)
        result = await db.execute(query)
        return result.scalars().all()

    async def get_api_key(self, db: AsyncSession, *, api_key_id: uuid.UUID, user: User) -> Optional[APIKey]:
        query = select(self.model).filter(self.model.id == api_key_id, self.model.user_id == user.id)
        result = await db.execute(query)
        return result.scalars().first()

    async def update_api_key(self, db: AsyncSession, *, db_api_key: APIKey, api_key_in: APIKeyUpdate) -> APIKey:
        db_api_key.key_name = api_key_in.key_name
        await db.commit()
        await db.refresh(db_api_key)
        return db_api_key

    async def delete_api_key(self, db: AsyncSession, *, db_api_key: APIKey):
        await db.delete(db_api_key)
        await db.commit() 