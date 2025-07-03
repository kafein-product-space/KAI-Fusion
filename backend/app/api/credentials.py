from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
import uuid
from datetime import datetime

from app.models.credential import (
    CredentialCreate,
    CredentialUpdate, 
    CredentialOut,
    CredentialWithData,
    validate_credential_data
)
from app.auth.dependencies import get_current_user
from app.core.encryption import encrypt_data, decrypt_data
from app.database import db

router = APIRouter(prefix="/credentials", tags=["credentials"])
security = HTTPBearer()

@router.post("/", response_model=CredentialOut, status_code=status.HTTP_201_CREATED)
async def create_credential(
    credential: CredentialCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new encrypted credential
    """
    try:
        # Validate credential data
        validation = validate_credential_data(credential.service_type, credential.credential_data)
        if not validation["valid"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid credential data: {', '.join(validation['errors'])}"
            )
        
        # Encrypt the credential data
        encrypted_data = encrypt_data(credential.credential_data)
        
        # Create credential record
        credential_id = str(uuid.uuid4())
        credential_record = {
            "id": credential_id,
            "user_id": current_user["id"],
            "name": credential.name,
            "description": credential.description,
            "service_type": credential.service_type,
            "encrypted_data": encrypted_data,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Save to database
        saved_credential = await db.create_credential(credential_record)
        
        return CredentialOut(**saved_credential)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create credential: {str(e)}"
        )

@router.get("/", response_model=List[CredentialOut])
async def list_credentials(
    service_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    List all credentials for the current user
    """
    try:
        credentials = await db.get_user_credentials(
            user_id=current_user["id"],
            service_type=service_type
        )
        
        return [CredentialOut(**cred) for cred in credentials]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list credentials: {str(e)}"
        )

@router.get("/{credential_id}", response_model=CredentialOut)
async def get_credential(
    credential_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific credential (without sensitive data)
    """
    try:
        credential = await db.get_credential(credential_id, current_user["id"])
        
        if not credential:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Credential not found"
            )
        
        return CredentialOut(**credential)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get credential: {str(e)}"
        )

@router.get("/{credential_id}/data", response_model=CredentialWithData)
async def get_credential_with_data(
    credential_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a credential with decrypted data (use carefully!)
    This endpoint should be used only when actually needed for API calls
    """
    try:
        credential = await db.get_credential(credential_id, current_user["id"])
        
        if not credential:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Credential not found"
            )
        
        if not credential["is_active"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Credential is inactive"
            )
        
        # Decrypt the credential data
        decrypted_data = decrypt_data(credential["encrypted_data"])
        
        credential_with_data = credential.copy()
        credential_with_data["credential_data"] = decrypted_data
        
        return CredentialWithData(**credential_with_data)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get credential data: {str(e)}"
        )

@router.put("/{credential_id}", response_model=CredentialOut)
async def update_credential(
    credential_id: str,
    credential_update: CredentialUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update an existing credential
    """
    try:
        # Check if credential exists and belongs to user
        existing = await db.get_credential(credential_id, current_user["id"])
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Credential not found"
            )
        
        update_data = {}
        
        # Update basic fields
        if credential_update.name is not None:
            update_data["name"] = credential_update.name
        if credential_update.description is not None:
            update_data["description"] = credential_update.description
        
        # Update credential data if provided
        if credential_update.credential_data is not None:
            # Validate new credential data
            validation = validate_credential_data(
                existing["service_type"], 
                credential_update.credential_data
            )
            if not validation["valid"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid credential data: {', '.join(validation['errors'])}"
                )
            
            # Encrypt new data
            update_data["encrypted_data"] = encrypt_data(credential_update.credential_data)
        
        update_data["updated_at"] = datetime.utcnow()
        
        # Update in database
        updated_credential = await db.update_credential(credential_id, update_data)
        
        return CredentialOut(**updated_credential)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update credential: {str(e)}"
        )

@router.delete("/{credential_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_credential(
    credential_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a credential (soft delete - mark as inactive)
    """
    try:
        # Check if credential exists and belongs to user
        existing = await db.get_credential(credential_id, current_user["id"])
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Credential not found"
            )
        
        # Soft delete by marking as inactive
        await db.update_credential(credential_id, {
            "is_active": False,
            "updated_at": datetime.utcnow()
        })
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete credential: {str(e)}"
        )

@router.post("/{credential_id}/test")
async def test_credential(
    credential_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Test if a credential is valid by making a simple API call
    """
    try:
        credential = await db.get_credential(credential_id, current_user["id"])
        
        if not credential:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Credential not found"
            )
        
        if not credential["is_active"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Credential is inactive"
            )
        
        # Decrypt credential data
        decrypted_data = decrypt_data(credential["encrypted_data"])
        
        # Test based on service type
        service_type = credential["service_type"]
        test_result = await _test_credential_by_type(service_type, decrypted_data)
        
        return {
            "credential_id": credential_id,
            "service_type": service_type,
            "test_result": test_result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to test credential: {str(e)}"
        )

async def _test_credential_by_type(service_type: str, credential_data: dict) -> dict:
    """
    Test credential validity based on service type
    """
    # This is a simplified implementation
    # In production, you'd make actual API calls to validate
    
    if service_type == "openai":
        # Test OpenAI API key
        api_key = credential_data.get("api_key")
        if not api_key or not api_key.startswith("sk-"):
            return {"valid": False, "error": "Invalid OpenAI API key format"}
        
        # Here you could make a real API call to OpenAI to test
        return {"valid": True, "message": "API key format is valid"}
    
    elif service_type == "anthropic":
        # Test Anthropic API key
        api_key = credential_data.get("api_key")
        if not api_key:
            return {"valid": False, "error": "Missing Anthropic API key"}
        
        return {"valid": True, "message": "API key is present"}
    
    else:
        return {"valid": True, "message": f"No validation available for {service_type}"} 