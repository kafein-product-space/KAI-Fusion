from app.models.user import User
from app.services.base import BaseService
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional


class UserService(BaseService[User]):
    def __init__(self):
        super().__init__(User)

    async def get_by_email(self, db: AsyncSession, email: str) -> Optional[User]:
        """
        Get a user by their email address.
        """
        result = await db.execute(select(self.model).filter_by(email=email))
        return result.scalars().first() 