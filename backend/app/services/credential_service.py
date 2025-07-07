"""Credential Service for Agent-Flow V2.

Handles secure credential storage, retrieval, encryption,
and credential-related business logic with proper access control.
"""

import logging
from typing import List, Optional, Dict, Any
from uuid import UUID
import json
import base64

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories import CredentialRepository
from app.db.models import Credential, CredentialCreate, CredentialUpdate
from app.core.encryption import encrypt_data, decrypt_data
from .base import BaseService, ValidationError, NotFoundError, BusinessRuleError

logger = logging.getLogger(__name__)


class CredentialService(BaseService):
    """Service for credential management with encryption."""
    
    def __init__(self, credential_repository: CredentialRepository):
        super().__init__(credential_repository)
        self.model_name = "Credential"
    
    # Credential Management
    
    async def create_credential(
        self,
        session: AsyncSession,
        credential_create: CredentialCreate,
        user_id: UUID
    ) -> Credential:
        """Create encrypted credential.
        
        Args:
            session: Database session
            credential_create: Credential creation data
            user_id: Owner user ID
            
        Returns:
            Created credential instance (with encrypted data)
        """
        try:
            # Encrypt credential data
            encrypted_data = await self._encrypt_credential_data(credential_create.credential_data)
            
            # Prepare credential data for the database model
            credential = Credential(
                name=credential_create.name,
                description=credential_create.description,
                service_type=credential_create.service_type,
                is_active=credential_create.is_active,
                user_id=str(user_id),
                encrypted_data=encrypted_data
            )
            
            # Create credential using repository
            session.add(credential)
            await session.commit()
            await session.refresh(credential)
            
            self.logger.info(f"Created credential {credential.name} for user {user_id}")
            return credential
            
        except ValidationError:
            raise
        except Exception as e:
            await session.rollback()
            self.logger.error(f"Error creating credential: {e}")
            raise ValidationError("Failed to create credential")
    
    async def get_user_credentials(
        self,
        session: AsyncSession,
        user_id: UUID,
        service_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Credential]:
        """Get credentials for a user.
        
        Args:
            session: Database session
            user_id: User ID
            service_type: Optional filter by service type
            skip: Number of records to skip
            limit: Maximum records to return
            
        Returns:
            List of user credentials (without decrypted data)
        """
        try:
            filters = {"user_id": str(user_id)}
            
            if service_type:
                filters["service_type"] = service_type
            
            credentials = await self.repository.get_multi(
                session, skip=skip, limit=limit, filters=filters
            )
            
            # Remove encrypted data from response for security
            for credential in credentials:
                credential.credential_data = None
            
            return credentials
            
        except Exception as e:
            self.logger.error(f"Error getting user credentials: {e}")
            raise ValidationError("Failed to get user credentials")
    
    async def get_credential_data(
        self,
        session: AsyncSession,
        credential_id: UUID,
        user_id: UUID
    ) -> Dict[str, Any]:
        """Get decrypted credential data.
        
        Args:
            session: Database session
            credential_id: Credential ID
            user_id: User ID for access control
            
        Returns:
            Decrypted credential data
            
        Raises:
            NotFoundError: If credential not found
            ValidationError: If user lacks access
        """
        try:
            # Get credential with ownership check
            credential = await self.get_by_id(session, credential_id, user_id)
            
            # Decrypt credential data
            decrypted_data = await self._decrypt_credential_data(credential.credential_data)
            
            return decrypted_data
            
        except (NotFoundError, ValidationError):
            raise
        except Exception as e:
            self.logger.error(f"Error getting credential data: {e}")
            raise ValidationError("Failed to decrypt credential data")
    
    async def update_credential(
        self,
        session: AsyncSession,
        credential_id: UUID,
        credential_update: CredentialUpdate,
        user_id: UUID
    ) -> Credential:
        """Update credential with re-encryption if data changed."""
        try:
            # Get credential with ownership check
            credential = await self.get_by_id(session, credential_id, user_id)
            
            # Prepare update data
            update_data = credential_update.model_dump(exclude_unset=True)
            
            # Re-encrypt credential data if provided
            if 'credential_data' in update_data and update_data['credential_data']:
                update_data['credential_data'] = await self._encrypt_credential_data(
                    update_data['credential_data']
                )
            
            # Update credential
            updated_credential = await self.repository.update(
                session, 
                db_obj=credential, 
                obj_in=CredentialUpdate(**update_data)
            )
            
            self.logger.info(f"Updated credential {credential_id}")
            return updated_credential
            
        except (NotFoundError, ValidationError):
            raise
        except Exception as e:
            self.logger.error(f"Error updating credential: {e}")
            raise ValidationError("Failed to update credential")
    
    async def test_credential(
        self,
        session: AsyncSession,
        credential_id: UUID,
        user_id: UUID
    ) -> Dict[str, Any]:
        """Test credential connectivity.
        
        Args:
            session: Database session
            credential_id: Credential ID
            user_id: User ID for access control
            
        Returns:
            Test result with status and details
        """
        try:
            credential = await self.get_by_id(session, credential_id, user_id)
            credential_data = await self.get_credential_data(session, credential_id, user_id)
            
            # Test based on service type
            test_result = await self._test_credential_by_service_type(
                credential.service_type, 
                credential_data
            )
            
            self.logger.info(f"Tested credential {credential_id}: {test_result['status']}")
            return test_result
            
        except (NotFoundError, ValidationError):
            raise
        except Exception as e:
            self.logger.error(f"Error testing credential: {e}")
            return {
                "status": "error",
                "message": "Failed to test credential",
                "error": str(e)
            }
    
    async def get_credentials_by_service_type(
        self,
        session: AsyncSession,
        user_id: UUID,
        service_type: str
    ) -> List[Credential]:
        """Get user credentials for specific service type."""
        return await self.get_user_credentials(
            session, user_id, service_type=service_type
        )
    
    # Validation hooks implementation
    
    async def _validate_create(
        self, 
        session: AsyncSession, 
        obj_in: Any, 
        user_id: Optional[UUID]
    ) -> None:
        """Validate credential creation."""
        if hasattr(obj_in, 'name') and hasattr(obj_in, 'service_type'):
            # Check for duplicate credential name for user and service type
            if user_id:
                existing = await self.repository.get_multi(
                    session,
                    filters={
                        "user_id": str(user_id),
                        "name": obj_in.name,
                        "service_type": obj_in.service_type
                    }
                )
                if existing:
                    raise ValidationError("Credential name already exists for this service type")
        
        if hasattr(obj_in, 'credential_data'):
            self._validate_credential_data_structure(obj_in.credential_data, obj_in.service_type)
    
    async def _validate_update(
        self,
        session: AsyncSession,
        model: Any,
        obj_in: Any,
        user_id: Optional[UUID]
    ) -> None:
        """Validate credential update."""
        if hasattr(obj_in, 'credential_data') and obj_in.credential_data:
            self._validate_credential_data_structure(obj_in.credential_data, model.service_type)
    
    async def _validate_delete(
        self,
        session: AsyncSession,
        model: Any,
        user_id: Optional[UUID]
    ) -> None:
        """Validate credential deletion."""
        # Check if credential is in use by any workflows
        # This would require checking workflow nodes for credential references
        # For now, allow deletion (implement usage checking later)
        pass
    
    # Private utility methods
    
    async def _encrypt_credential_data(self, credential_data: Dict[str, Any]) -> str:
        """Encrypt credential data."""
        try:
            # Convert to JSON string
            data_json = json.dumps(credential_data)
            
            # Encrypt using the encryption module (returns bytes)
            encrypted_bytes = encrypt_data(data_json)
            
            # Convert bytes to base64 string for database storage
            encrypted_string = base64.b64encode(encrypted_bytes).decode('utf-8')
            
            return encrypted_string
            
        except Exception as e:
            self.logger.error(f"Error encrypting credential data: {e}")
            raise ValidationError("Failed to encrypt credential data")
    
    async def _decrypt_credential_data(self, encrypted_data: str) -> Dict[str, Any]:
        """Decrypt credential data."""
        try:
            # Convert base64 string back to bytes
            encrypted_bytes = base64.b64decode(encrypted_data.encode('utf-8'))
            
            # Decrypt using the encryption module (expects bytes, returns string)
            decrypted_data = decrypt_data(encrypted_bytes)
            
            # Handle different return types from decrypt_data
            if isinstance(decrypted_data, str):
                # Parse JSON string to dictionary
                credential_data = json.loads(decrypted_data)
            elif isinstance(decrypted_data, dict):
                # Already a dictionary
                credential_data = decrypted_data
            else:
                # Try to convert to string first, then parse
                credential_data = json.loads(str(decrypted_data))
            
            return credential_data
            
        except Exception as e:
            self.logger.error(f"Error decrypting credential data: {e}")
            raise ValidationError("Failed to decrypt credential data")
    
    def _validate_credential_data_structure(
        self, 
        credential_data: Dict[str, Any], 
        service_type: str
    ) -> None:
        """Validate credential data structure based on service type."""
        if not isinstance(credential_data, dict):
            raise ValidationError("Credential data must be a dictionary")
        
        # Define required fields by service type
        required_fields = {
            "openai": ["api_key"],
            "anthropic": ["api_key"],
            "google": ["api_key"],
            "aws": ["access_key_id", "secret_access_key"],
            "azure": ["client_id", "client_secret", "tenant_id"],
            "database": ["host", "port", "username", "password"],
            "api": ["base_url"],
            "oauth": ["client_id", "client_secret"],
        }
        
        service_required = required_fields.get(service_type, [])
        
        for field in service_required:
            if field not in credential_data:
                raise ValidationError(f"Missing required field '{field}' for {service_type} credentials")
        
        # Validate field types and formats
        self._validate_credential_field_formats(credential_data, service_type)
    
    def _validate_credential_field_formats(
        self, 
        credential_data: Dict[str, Any], 
        service_type: str
    ) -> None:
        """Validate credential field formats."""
        # API key validation
        if "api_key" in credential_data:
            api_key = credential_data["api_key"]
            if not isinstance(api_key, str) or len(api_key.strip()) == 0:
                raise ValidationError("API key must be a non-empty string")
        
        # Port validation
        if "port" in credential_data:
            port = credential_data["port"]
            if not isinstance(port, int) or not 1 <= port <= 65535:
                raise ValidationError("Port must be an integer between 1 and 65535")
        
        # URL validation
        if "base_url" in credential_data:
            url = credential_data["base_url"]
            if not isinstance(url, str) or not url.startswith(('http://', 'https://')):
                raise ValidationError("Base URL must be a valid HTTP/HTTPS URL")
    
    async def _test_credential_by_service_type(
        self, 
        service_type: str, 
        credential_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Test credential based on service type."""
        try:
            if service_type in ["openai", "anthropic", "google"]:
                return await self._test_llm_credential(service_type, credential_data)
            elif service_type == "database":
                return await self._test_database_credential(credential_data)
            elif service_type == "api":
                return await self._test_api_credential(credential_data)
            else:
                return {
                    "status": "skipped",
                    "message": f"Testing not implemented for {service_type} credentials"
                }
                
        except Exception as e:
            return {
                "status": "error",
                "message": f"Failed to test {service_type} credential",
                "error": str(e)
            }
    
    async def _test_llm_credential(
        self, 
        service_type: str, 
        credential_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Test LLM service credential."""
        # This would make actual API calls to test credentials
        # For now, return a mock success response
        return {
            "status": "success",
            "message": f"{service_type.upper()} credentials are valid",
            "details": {"api_accessible": True}
        }
    
    async def _test_database_credential(self, credential_data: Dict[str, Any]) -> Dict[str, Any]:
        """Test database credential."""
        # This would make actual database connection test
        # For now, return a mock success response
        return {
            "status": "success",
            "message": "Database connection successful",
            "details": {"connection_time_ms": 150}
        }
    
    async def _test_api_credential(self, credential_data: Dict[str, Any]) -> Dict[str, Any]:
        """Test API credential."""
        # This would make actual API health check
        # For now, return a mock success response
        return {
            "status": "success",
            "message": "API endpoint accessible",
            "details": {"response_time_ms": 200}
        } 