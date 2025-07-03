from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
import uuid

class CredentialBase(BaseModel):
    """Base credential model with common fields"""
    name: str = Field(..., description="Human-readable name for the credential")
    description: Optional[str] = Field(None, description="Optional description of the credential")
    service_type: str = Field(..., description="Type of service (openai, anthropic, google, etc.)")
    
class CredentialCreate(CredentialBase):
    """Model for creating new credentials"""
    credential_data: Dict[str, Any] = Field(..., description="Raw credential data to be encrypted")
    
class CredentialUpdate(BaseModel):
    """Model for updating existing credentials"""
    name: Optional[str] = None
    description: Optional[str] = None
    credential_data: Optional[Dict[str, Any]] = None
    
class CredentialOut(CredentialBase):
    """Model for returning credential info (without sensitive data)"""
    id: str = Field(..., description="Unique credential identifier")
    user_id: str = Field(..., description="Owner user ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    is_active: bool = Field(True, description="Whether credential is active")
    
    class Config:
        from_attributes = True

class CredentialInDB(CredentialOut):
    """Model representing credential as stored in database"""
    encrypted_data: bytes = Field(..., description="Encrypted credential data")
    encryption_key_id: Optional[str] = Field(None, description="ID of encryption key used")
    
class CredentialWithData(CredentialOut):
    """Model for returning credential with decrypted data (use carefully!)"""
    credential_data: Dict[str, Any] = Field(..., description="Decrypted credential data")
    
# Common credential types for validation
SUPPORTED_CREDENTIAL_TYPES = {
    "openai": {
        "required_fields": ["api_key"],
        "optional_fields": ["organization_id", "base_url"]
    },
    "anthropic": {
        "required_fields": ["api_key"],
        "optional_fields": ["base_url"]
    },
    "google": {
        "required_fields": ["api_key"],
        "optional_fields": ["project_id", "location"]
    },
    "azure_openai": {
        "required_fields": ["api_key", "azure_endpoint", "api_version"],
        "optional_fields": ["deployment_name"]
    },
    "huggingface": {
        "required_fields": ["api_token"],
        "optional_fields": ["endpoint_url"]
    },
    "tavily": {
        "required_fields": ["api_key"],
        "optional_fields": []
    },
    "custom": {
        "required_fields": [],
        "optional_fields": []
    }
}

def validate_credential_data(service_type: str, credential_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate credential data based on service type
    Returns validation result with errors if any
    """
    if service_type not in SUPPORTED_CREDENTIAL_TYPES:
        return {
            "valid": False,
            "errors": [f"Unsupported service type: {service_type}"]
        }
    
    config = SUPPORTED_CREDENTIAL_TYPES[service_type]
    errors = []
    
    # Check required fields
    for field in config["required_fields"]:
        if field not in credential_data or not credential_data[field]:
            errors.append(f"Required field '{field}' is missing or empty")
    
    # Check for unexpected fields (warning, not error)
    all_allowed = set(config["required_fields"] + config["optional_fields"])
    unexpected = set(credential_data.keys()) - all_allowed
    
    warnings = []
    if unexpected:
        warnings.append(f"Unexpected fields found: {list(unexpected)}")
    
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings
    } 