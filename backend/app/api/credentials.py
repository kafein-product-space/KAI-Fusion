"""User Credentials API endpoints"""

import logging
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter()

# Mock credentials data (replace with real database service in production)
MOCK_CREDENTIALS = {}

class CredentialCreate(BaseModel):
    name: str
    provider: str  # "openai", "anthropic", "google", etc.
    api_key: str
    description: str = ""

class CredentialResponse(BaseModel):
    id: str
    name: str
    provider: str
    description: str
    created_at: str
    is_active: bool

class CredentialUpdate(BaseModel):
    name: str = None
    api_key: str = None
    description: str = None
    is_active: bool = None

@router.get("/", response_model=List[CredentialResponse])
async def get_user_credentials():
    """Get all credentials for the current user"""
    # For development, return mock data
    return [
        CredentialResponse(
            id="1",
            name="OpenAI Production",
            provider="openai",
            description="Main OpenAI API key for production",
            created_at="2025-01-14T10:00:00Z",
            is_active=True
        ),
        CredentialResponse(
            id="2", 
            name="Anthropic Claude",
            provider="anthropic",
            description="Claude API for advanced reasoning",
            created_at="2025-01-14T11:00:00Z",
            is_active=True
        )
    ]

@router.post("/", response_model=CredentialResponse)
async def create_credential(credential: CredentialCreate):
    """Create a new credential"""
    credential_id = str(len(MOCK_CREDENTIALS) + 1)
    
    # In production, encrypt the API key before storing
    new_credential = {
        "id": credential_id,
        "name": credential.name,
        "provider": credential.provider,
        "api_key": credential.api_key,  # Should be encrypted
        "description": credential.description,
        "created_at": "2025-01-14T12:00:00Z",
        "is_active": True
    }
    
    MOCK_CREDENTIALS[credential_id] = new_credential
    
    return CredentialResponse(
        id=credential_id,
        name=credential.name,
        provider=credential.provider,
        description=credential.description,
        created_at=new_credential["created_at"],
        is_active=True
    )

@router.get("/{credential_id}", response_model=CredentialResponse)
async def get_credential(credential_id: str):
    """Get a specific credential by ID"""
    credential = MOCK_CREDENTIALS.get(credential_id)
    if not credential:
        raise HTTPException(status_code=404, detail="Credential not found")
    
    return CredentialResponse(**credential)

@router.put("/{credential_id}", response_model=CredentialResponse)
async def update_credential(credential_id: str, update_data: CredentialUpdate):
    """Update a credential"""
    credential = MOCK_CREDENTIALS.get(credential_id)
    if not credential:
        raise HTTPException(status_code=404, detail="Credential not found")
    
    # Update fields if provided
    if update_data.name is not None:
        credential["name"] = update_data.name
    if update_data.api_key is not None:
        credential["api_key"] = update_data.api_key  # Should be encrypted
    if update_data.description is not None:
        credential["description"] = update_data.description
    if update_data.is_active is not None:
        credential["is_active"] = update_data.is_active
    
    return CredentialResponse(**credential)

@router.delete("/{credential_id}")
async def delete_credential(credential_id: str):
    """Delete a credential"""
    if credential_id not in MOCK_CREDENTIALS:
        raise HTTPException(status_code=404, detail="Credential not found")
    
    del MOCK_CREDENTIALS[credential_id]
    return {"message": "Credential deleted successfully"}

@router.get("/providers/", response_model=List[Dict[str, Any]])
async def get_supported_providers():
    """Get list of supported credential providers"""
    return [
        {
            "id": "openai",
            "name": "OpenAI",
            "description": "OpenAI GPT models",
            "fields": [
                {"name": "api_key", "label": "API Key", "type": "password", "required": True}
            ]
        },
        {
            "id": "anthropic", 
            "name": "Anthropic",
            "description": "Claude AI models",
            "fields": [
                {"name": "api_key", "label": "API Key", "type": "password", "required": True}
            ]
        },
        {
            "id": "google",
            "name": "Google",
            "description": "Google AI and Search services",
            "fields": [
                {"name": "api_key", "label": "API Key", "type": "password", "required": True},
                {"name": "cse_id", "label": "Custom Search Engine ID", "type": "text", "required": False}
            ]
        },
        {
            "id": "tavily",
            "name": "Tavily",
            "description": "Tavily search API",
            "fields": [
                {"name": "api_key", "label": "API Key", "type": "password", "required": True}
            ]
        }
    ]

@router.post("/validate")
async def validate_credential(credential_data: Dict[str, Any]):
    """Validate credential configuration with live API testing"""
    try:
        credential_type = credential_data.get("type") or credential_data.get("provider")
        
        if credential_type == "openai":
            return await _validate_openai_credential(credential_data)
        elif credential_type == "anthropic":
            return await _validate_anthropic_credential(credential_data)
        elif credential_type == "google":
            return await _validate_google_credential(credential_data)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported credential type: {credential_type}")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Credential validation error: {e}")
        raise HTTPException(status_code=500, detail="Internal validation error")


async def _validate_openai_credential(credential_data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate OpenAI credentials with live API test"""
    try:
        import openai
        
        api_key = credential_data.get("api_key")
        if not api_key:
            raise HTTPException(status_code=400, detail="API key is required")
        
        # Format validation
        if not api_key.startswith(("sk-", "sk_")):
            raise HTTPException(status_code=400, detail="Invalid API key format")
        
        # Live API test
        client = openai.OpenAI(api_key=api_key)
        
        # Test with minimal request
        response = client.chat.completions.create(
            model=credential_data.get("model_name", "gpt-3.5-turbo"),
            messages=[{"role": "user", "content": "Hi"}],
            max_tokens=5
        )
        
        return {
            "valid": True,
            "message": "OpenAI credentials validated successfully",
            "details": {
                "model": credential_data.get("model_name", "gpt-3.5-turbo"),
                "api_accessible": True
            }
        }
        
    except openai.AuthenticationError:
        raise HTTPException(status_code=401, detail="Invalid API key")
    except openai.RateLimitError:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    except openai.APIError as e:
        raise HTTPException(status_code=400, detail=f"OpenAI API error: {str(e)}")
    except Exception as e:
        logger.error(f"OpenAI validation error: {e}")
        raise HTTPException(status_code=500, detail="Validation failed")


async def _validate_anthropic_credential(credential_data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate Anthropic credentials with live API test"""
    try:
        import anthropic
        
        api_key = credential_data.get("api_key")
        if not api_key:
            raise HTTPException(status_code=400, detail="API key is required")
        
        # Format validation
        if not api_key.startswith("sk-ant-"):
            raise HTTPException(status_code=400, detail="Invalid Anthropic API key format")
        
        # Live API test
        client = anthropic.Anthropic(api_key=api_key)
        
        response = client.messages.create(
            model=credential_data.get("model_name", "claude-3-haiku-20240307"),
            max_tokens=5,
            messages=[{"role": "user", "content": "Hi"}]
        )
        
        return {
            "valid": True,
            "message": "Anthropic credentials validated successfully",
            "details": {
                "model": credential_data.get("model_name", "claude-3-haiku-20240307"),
                "api_accessible": True
            }
        }
        
    except anthropic.AuthenticationError:
        raise HTTPException(status_code=401, detail="Invalid API key")
    except anthropic.RateLimitError:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    except Exception as e:
        logger.error(f"Anthropic validation error: {e}")
        raise HTTPException(status_code=500, detail="Validation failed")


async def _validate_google_credential(credential_data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate Google credentials"""
    api_key = credential_data.get("api_key")
    if not api_key:
        raise HTTPException(status_code=400, detail="API key is required")
    
    return {
        "valid": True,
        "message": "Google credentials format validated",
        "details": {
            "api_key_format": "valid"
        }
    }