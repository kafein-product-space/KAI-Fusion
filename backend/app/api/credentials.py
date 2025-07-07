"""Credential API endpoints for Agent-Flow V2.

Provides secure credential management for various services
using encryption and the new service layer architecture.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any
from uuid import UUID
from pydantic import BaseModel

# Service imports
from app.services.dependencies import get_credential_service_dep, get_db_session
from app.services.credential_service import CredentialService
from app.auth.middleware import get_current_user, get_admin_user
from app.db.models import User, CredentialCreate, CredentialUpdate

import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# Request/Response Models

class CredentialResponse(BaseModel):
    id: str
    user_id: str
    service_type: str
    name: str
    description: Optional[str] = None
    is_active: bool
    created_at: str
    updated_at: str
    # Note: encrypted_data is intentionally excluded for security

    class Config:
        from_attributes = True

class CredentialCreateRequest(BaseModel):
    service_type: str
    name: str
    description: Optional[str] = None
    credential_data: Dict[str, Any]

class CredentialUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    credential_data: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

class CredentialTestResult(BaseModel):
    success: bool
    message: str
    details: Optional[Dict[str, Any]] = None

class ServiceTypesResponse(BaseModel):
    service_types: List[str]
    descriptions: Dict[str, str]

# Credential CRUD Endpoints

@router.post(
    "/",
    response_model=CredentialResponse,
    status_code=status.HTTP_201_CREATED,
    summary="🔐 Create Credential",
    description="Create and encrypt a new service credential."
)
async def create_credential(
    credential_data: CredentialCreateRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
    credential_service: CredentialService = Depends(get_credential_service_dep)
):
    """Create a new encrypted credential."""
    try:
        # Create credential through service
        credential_create = CredentialCreate(
            service_type=credential_data.service_type,
            name=credential_data.name,
            description=credential_data.description,
            credential_data=credential_data.credential_data
        )
        
        credential = await credential_service.create_credential(
            session, credential_create, UUID(current_user.id)
        )
        
        return CredentialResponse(
            id=str(credential.id),
            user_id=str(credential.user_id),
            service_type=credential.service_type,
            name=credential.name,
            description=credential.description,
            is_active=credential.is_active,
            created_at=credential.created_at.isoformat(),
            updated_at=credential.updated_at.isoformat()
        )
        
    except Exception as e:
        logger.error(f"Failed to create credential: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create credential"
        )

@router.get(
    "/",
    response_model=List[CredentialResponse],
    summary="📋 List Credentials",
    description="List credentials for the current user."
)
async def list_credentials(
    service_type: Optional[str] = None,
    active_only: bool = True,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
    credential_service: CredentialService = Depends(get_credential_service_dep)
):
    """List user credentials."""
    try:
        credentials = await credential_service.get_user_credentials(
            session, UUID(current_user.id), service_type, active_only
        )
        
        return [
            CredentialResponse(
                id=str(credential.id),
                user_id=str(credential.user_id),
                service_type=credential.service_type,
                name=credential.name,
                description=credential.description,
                is_active=credential.is_active,
                created_at=credential.created_at.isoformat(),
                updated_at=credential.updated_at.isoformat()
            )
            for credential in credentials
        ]
        
    except Exception as e:
        logger.error(f"Failed to list credentials: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve credentials"
        )

@router.get(
    "/{credential_id}",
    response_model=CredentialResponse,
    summary="🔍 Get Credential",
    description="Get credential details (without sensitive data)."
)
async def get_credential(
    credential_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
    credential_service: CredentialService = Depends(get_credential_service_dep)
):
    """Get credential details."""
    try:
        credential = await credential_service.get_by_id(
            session, UUID(credential_id), UUID(current_user.id)
        )
        
        return CredentialResponse(
            id=str(credential.id),
            user_id=str(credential.user_id),
            service_type=credential.service_type,
            name=credential.name,
            description=credential.description,
            is_active=credential.is_active,
            created_at=credential.created_at.isoformat(),
            updated_at=credential.updated_at.isoformat()
        )
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid credential ID format"
        )
    except Exception as e:
        logger.error(f"Failed to get credential {credential_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credential not found or access denied"
        )

@router.put(
    "/{credential_id}",
    response_model=CredentialResponse,
    summary="✏️ Update Credential",
    description="Update credential data and metadata."
)
async def update_credential(
    credential_id: str,
    update_data: CredentialUpdateRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
    credential_service: CredentialService = Depends(get_credential_service_dep)
):
    """Update credential."""
    try:
        credential_update = CredentialUpdate(
            name=update_data.name,
            description=update_data.description,
            credential_data=update_data.credential_data,
            is_active=update_data.is_active
        )
        
        credential = await credential_service.update_credential(
            session, UUID(credential_id), credential_update, UUID(current_user.id)
        )
        
        return CredentialResponse(
            id=str(credential.id),
            user_id=str(credential.user_id),
            service_type=credential.service_type,
            name=credential.name,
            description=credential.description,
            is_active=credential.is_active,
            created_at=credential.created_at.isoformat(),
            updated_at=credential.updated_at.isoformat()
        )
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid credential ID format"
        )
    except Exception as e:
        logger.error(f"Failed to update credential {credential_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update credential"
        )

@router.delete(
    "/{credential_id}",
    summary="🗑️ Delete Credential",
    description="Delete credential permanently."
)
async def delete_credential(
    credential_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
    credential_service: CredentialService = Depends(get_credential_service_dep)
):
    """Delete credential."""
    try:
        # Get credential to check ownership before deletion
        credential = await credential_service.get_by_id(
            session, UUID(credential_id), UUID(current_user.id)
        )
        
        # Delete credential using base service method
        await credential_service.delete(session, id=UUID(credential_id))
        
        return {"success": True, "message": "Credential deleted successfully"}
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid credential ID format"
        )
    except Exception as e:
        logger.error(f"Failed to delete credential {credential_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete credential"
        )

# Credential Testing and Validation

@router.post(
    "/{credential_id}/test",
    response_model=CredentialTestResult,
    summary="🧪 Test Credential",
    description="Test credential connectivity and validity."
)
async def test_credential(
    credential_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
    credential_service: CredentialService = Depends(get_credential_service_dep)
):
    """Test credential connectivity."""
    try:
        result = await credential_service.test_credential(
            session, UUID(credential_id), UUID(current_user.id)
        )
        
        return CredentialTestResult(
            success=result.get("success", False),
            message=result.get("message", "Test completed"),
            details=result.get("details")
        )
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid credential ID format"
        )
    except Exception as e:
        logger.error(f"Failed to test credential {credential_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to test credential"
        )

@router.get(
    "/{credential_id}/decrypt",
    summary="🔓 Decrypt Credential",
    description="Get decrypted credential data (use with caution)."
)
async def decrypt_credential(
    credential_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
    credential_service: CredentialService = Depends(get_credential_service_dep)
):
    """Get decrypted credential data."""
    try:
        credential_data = await credential_service.get_credential_data(
            session, UUID(credential_id), UUID(current_user.id)
        )
        
        return {
            "credential_data": credential_data,
            "warning": "This data is sensitive and should be handled securely"
        }
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid credential ID format"
        )
    except Exception as e:
        logger.error(f"Failed to decrypt credential {credential_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credential not found or access denied"
        )

# Service Information

@router.get(
    "/service-types",
    response_model=ServiceTypesResponse,
    summary="📋 Get Service Types",
    description="Get available service types and their descriptions."
)
async def get_service_types():
    """Get available credential service types."""
    return ServiceTypesResponse(
        service_types=[
            "openai", "anthropic", "google", "aws", "azure", 
            "database", "api", "oauth", "custom"
        ],
        descriptions={
            "openai": "OpenAI API credentials (API key)",
            "anthropic": "Anthropic Claude API credentials",
            "google": "Google Cloud/AI credentials",
            "aws": "Amazon Web Services credentials",
            "azure": "Microsoft Azure credentials",
            "database": "Database connection credentials",
            "api": "Generic API credentials",
            "oauth": "OAuth authentication credentials",
            "custom": "Custom service credentials"
        }
    )

# Admin Endpoints

@router.get(
    "/admin/all",
    response_model=List[CredentialResponse],
    summary="👑 List All Credentials (Admin)",
    description="List all credentials in the system (admin only)."
)
async def list_all_credentials(
    service_type: Optional[str] = None,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum records to return"),
    admin_user: User = Depends(get_admin_user),
    session: AsyncSession = Depends(get_db_session),
    credential_service: CredentialService = Depends(get_credential_service_dep)
):
    """List all credentials (admin only)."""
    try:
        # Use base repository to get all credentials
        filters = {"service_type": service_type} if service_type else {}
        
        credentials = await credential_service.repository.get_multi(
            session, skip=skip, limit=limit, filters=filters
        )
        
        return [
            CredentialResponse(
                id=str(credential.id),
                user_id=str(credential.user_id),
                service_type=credential.service_type,
                name=credential.name,
                description=credential.description,
                is_active=credential.is_active,
                created_at=credential.created_at.isoformat(),
                updated_at=credential.updated_at.isoformat()
            )
            for credential in credentials
        ]
        
    except Exception as e:
        logger.error(f"Failed to list all credentials: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve credentials"
        )

# Health and Status Endpoints

@router.get(
    "/health",
    summary="🩺 Credential Service Health",
    description="Check credential service health status."
)
async def credential_health():
    """Check credential service health."""
    return {
        "service": "credential",
        "status": "healthy",
        "version": "2.0",
        "features": [
            "Credential encryption",
            "Service validation",
            "Access control",
            "Testing",
            "Multi-service support"
        ],
        "supported_services": [
            "OpenAI", "Anthropic", "Google", "AWS", "Azure", 
            "Database", "API", "OAuth", "Custom"
        ]
    } 