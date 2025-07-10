import uuid
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.user_credential import UserCredential
from app.services.base import BaseService


class CredentialService(BaseService[UserCredential]):
    def __init__(self):
        super().__init__(UserCredential)

    async def get_by_user_id(
        self, db: AsyncSession, user_id: uuid.UUID
    ) -> List[UserCredential]:
        """
        Get all credentials for a specific user.
        """
        query = select(self.model).filter_by(user_id=user_id)
        result = await db.execute(query)
        return result.scalars().all() 