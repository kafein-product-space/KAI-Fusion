"""Credential repository for credential-related database operations."""

from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Credential, CredentialCreate, CredentialUpdate
from ..base import BaseRepository


class CredentialRepository(BaseRepository[Credential, CredentialCreate, CredentialUpdate]):
    """Repository for credential operations."""

    def __init__(self):
        super().__init__(Credential)

    async def get_by_user(
        self, 
        session: AsyncSession, 
        user_id: str
    ) -> List[Credential]:
        """Get all credentials for a user."""
        return await self.get_multi(
            session,
            filters={"user_id": user_id, "is_active": True},
            order_by="created_at",
            order_desc=True
        )

    async def get_by_service_type(
        self,
        session: AsyncSession,
        user_id: str,
        service_type: str
    ) -> List[Credential]:
        """Get credentials by service type for a user."""
        return await self.get_multi(
            session,
            filters={
                "user_id": user_id,
                "service_type": service_type,
                "is_active": True
            }
        ) 