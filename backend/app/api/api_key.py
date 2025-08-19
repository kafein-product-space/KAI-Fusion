import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.models.user import User
from app.schemas.api_key import APIKeyCreate, APIKeyCreateResponse, APIKeyResponse, APIKeyUpdate
from app.services.api_key_service import APIKeyService
from app.services.dependencies import get_db_session, get_api_key_service

router = APIRouter()

@router.post("", response_model=APIKeyCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    api_key_in: APIKeyCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    api_key_service: APIKeyService = Depends(get_api_key_service)
):
    """
    Create a new API key for the current user.
    """
    key, created_api_key = await api_key_service.create_api_key(db, api_key_in=api_key_in, user=current_user)
    
    return APIKeyCreateResponse(
        id=created_api_key.id,
        key_name=created_api_key.key_name,
        created_at=created_api_key.created_at,
        last_used_at=created_api_key.last_used_at,
        key=key
    )

@router.get("", response_model=List[APIKeyResponse])
async def get_api_keys(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    api_key_service: APIKeyService = Depends(get_api_key_service)
):
    """
    Get all API keys for the current user.
    """
    api_keys = await api_key_service.get_api_keys(db, user=current_user)
    return api_keys

@router.put("/{key_id}", response_model=APIKeyResponse)
async def update_api_key(
    key_id: uuid.UUID,
    api_key_in: APIKeyUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    api_key_service: APIKeyService = Depends(get_api_key_service)
):
    """
    Update an API key for the current user.
    """
    db_api_key = await api_key_service.get_api_key(db, api_key_id=key_id, user=current_user)
    if not db_api_key:
        raise HTTPException(status_code=404, detail="API Key not found")
    
    updated_key = await api_key_service.update_api_key(db, db_api_key=db_api_key, api_key_in=api_key_in)
    return updated_key

@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_key(
    key_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    api_key_service: APIKeyService = Depends(get_api_key_service)
):
    """
    Delete an API key for the current user.
    """
    db_api_key = await api_key_service.get_api_key(db, api_key_id=key_id, user=current_user)
    if not db_api_key:
        raise HTTPException(status_code=404, detail="API Key not found")

    await api_key_service.delete_api_key(db, db_api_key=db_api_key)
    return 