"""User repository for user-related database operations."""

from datetime import datetime
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.exc import IntegrityError

from ..models import User, UserCreate, UserUpdate
from ..base import BaseRepository


class UserRepository(BaseRepository[User, UserCreate, UserUpdate]):
    """Repository for user operations."""

    def __init__(self):
        super().__init__(User)

    async def get_by_email(self, session: AsyncSession, email: str) -> Optional[User]:
        """Get user by email address."""
        return await self.get_by_field(session, field="email", value=email)

    async def create_user(
        self, 
        session: AsyncSession, 
        user_create: UserCreate, 
        hashed_password: str
    ) -> Optional[User]:
        """Create a new user with hashed password."""
        try:
            user_data = user_create.model_dump(exclude={"password"})
            user_data["hashed_password"] = hashed_password
            
            user = User(**user_data)
            session.add(user)
            await session.commit()
            await session.refresh(user)
            return user
        except IntegrityError:
            await session.rollback()
            return None  # Email already exists

    async def update_last_login(self, session: AsyncSession, user_id: str) -> bool:
        """Update user's last login timestamp."""
        user = await self.get(session, user_id)
        if user:
            user.last_login = datetime.utcnow()
            await session.commit()
            return True
        return False

    async def get_active_users(self, session: AsyncSession) -> List[User]:
        """Get all active users."""
        return await self.get_multi(
            session,
            filters={"is_active": True}
        )

    async def search_users(
        self, 
        session: AsyncSession, 
        query: str, 
        limit: int = 10
    ) -> List[User]:
        """Search users by email or full name."""
        # Use the base repository's filtering capability
        return await self.get_multi(
            session,
            filters={
                "is_active": True,
                "email": {"like": query},
                "full_name": {"like": query}
            },
            limit=limit
        )

    async def deactivate_user(self, session: AsyncSession, user_id: str) -> bool:
        """Deactivate a user (soft delete)."""
        user = await self.get(session, user_id)
        if user:
            user.is_active = False
            await session.commit()
            return True
        return False 