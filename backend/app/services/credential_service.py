import uuid
import base64
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.models.user_credential import UserCredential
from app.services.base import BaseService
from app.schemas.user_credential import UserCredentialCreate, UserCredentialUpdate
from app.core.encryption import encrypt_data, decrypt_data


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

    async def get_by_user_id_and_name(
        self, db: AsyncSession, user_id: uuid.UUID, name: str
    ) -> List[UserCredential]:
        """
        Get credentials for a specific user filtered by name.
        """
        query = select(self.model).filter_by(user_id=user_id, name=name)
        result = await db.execute(query)
        return result.scalars().all()

    async def get_by_user_and_id(
        self, db: AsyncSession, user_id: uuid.UUID, credential_id: uuid.UUID
    ) -> Optional[UserCredential]:
        """
        Get a specific credential by user and credential ID.
        """
        query = select(self.model).filter_by(user_id=user_id, id=credential_id)
        result = await db.execute(query)
        return result.scalars().first()

    async def create_credential(
        self, db: AsyncSession, user_id: uuid.UUID, credential_data: UserCredentialCreate
    ) -> UserCredential:
        """
        Create a new credential for a user.
        """
        # Encrypt the secret data
        encrypted_bytes = encrypt_data(credential_data.secret)
        # Convert bytes to base64 string for database storage
        encrypted_secret = base64.b64encode(encrypted_bytes).decode('utf-8')
        
        # Create the credential object
        credential = UserCredential(
            id=uuid.uuid4(),
            user_id=user_id,
            name=credential_data.name,
            service_type=credential_data.service_type,
            encrypted_secret=encrypted_secret
        )
        
        db.add(credential)
        await db.commit()
        await db.refresh(credential)
        return credential

    async def update_credential(
        self, 
        db: AsyncSession, 
        user_id: uuid.UUID, 
        credential_id: uuid.UUID,
        update_data: UserCredentialUpdate
    ) -> Optional[UserCredential]:
        """
        Update an existing credential.
        """
        # Get the credential
        credential = await self.get_by_user_and_id(db, user_id, credential_id)
        if not credential:
            return None
        
        # Update fields
        if update_data.name is not None:
            credential.name = update_data.name
        
        await db.commit()
        await db.refresh(credential)
        return credential

    async def delete_credential(
        self, db: AsyncSession, user_id: uuid.UUID, credential_id: uuid.UUID
    ) -> bool:
        """
        Delete a credential.
        """
        credential = await self.get_by_user_and_id(db, user_id, credential_id)
        if not credential:
            return False
        
        await db.delete(credential)
        await db.commit()
        return True

    async def get_decrypted_credential(
        self, db: AsyncSession, user_id: uuid.UUID, credential_id: uuid.UUID
    ) -> Optional[Dict[str, Any]]:
        """
        Get a credential with decrypted secret data.
        """
        credential = await self.get_by_user_and_id(db, user_id, credential_id)
        if not credential:
            return None
        try:
            # Convert base64 string back to bytes for decryption
            encrypted_bytes = base64.b64decode(credential.encrypted_secret.encode('utf-8'))
            decrypted_secret = decrypt_data(encrypted_bytes)
            return {
                "id": credential.id,
                "name": credential.name,
                "service_type": credential.service_type,
                "secret": decrypted_secret if decrypted_secret is not None else {},
                "created_at": credential.created_at,
                "updated_at": credential.updated_at
            }
        except Exception:
            # Return credential with empty secret if decryption fails
            return {
                "id": credential.id,
                "name": credential.name,
                "service_type": credential.service_type,
                "secret": {},
                "created_at": credential.created_at,
                "updated_at": credential.updated_at
            } 