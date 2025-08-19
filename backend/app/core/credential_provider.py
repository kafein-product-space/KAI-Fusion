from typing import Dict, Any, Optional, Set
import asyncio
from datetime import datetime, timedelta
import threading

from app.core.encryption import decrypt_data

# ------------------------------------------------------------------
# Legacy Supabase dependency – replaced by SQLAlchemy layer.
# Provide a stub so that existing credential-provider logic continues to
# import successfully until full migration is complete.
# ------------------------------------------------------------------

try:
    # Attempt to import the old Supabase adapter (may no longer exist)
    from app.core.database import get_db_session_context  # type: ignore
except ImportError:  # pragma: no cover – executes once after removal
    class _StubDB:  # noqa: D101, D401
        async def get_credential(self, *_, **__):  # noqa: ANN002
            return None

        async def get_user_credentials(self, *_, **__):  # noqa: ANN002
            return []

    def get_database():  # type: ignore
        """Fallback that returns a stub DB object after Supabase removal."""
        return _StubDB()


class CredentialProvider:
    """
    Singleton credential provider for secure access to encrypted credentials
    Implements caching and lazy loading for performance
    """
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if not hasattr(self, '_initialized') or not self._initialized:
            self.cache: Dict[str, Dict[str, Any]] = {}
            self.cache_timestamps: Dict[str, datetime] = {}
            self.cache_ttl = timedelta(minutes=5)  # Cache for 5 minutes
            self.user_contexts: Dict[str, str] = {}  # Maps context_id to user_id
            self._initialized = True
    
    def set_user_context(self, context_id: str, user_id: str):
        """
        Set user context for credential access
        This is called when starting a workflow execution
        """
        self.user_contexts[context_id] = user_id
    
    def clear_user_context(self, context_id: str):
        """Clear user context when workflow execution ends"""
        if context_id in self.user_contexts:
            del self.user_contexts[context_id]
            
        # Also clear related cache entries
        to_remove = [key for key in self.cache.keys() if key.startswith(f"{context_id}:")]
        for key in to_remove:
            del self.cache[key]
            del self.cache_timestamps[key]
    
    async def get_credential(
        self, 
        credential_name_or_id: str, 
        context_id: str,
        service_type: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Get credential data by name or ID
        
        Args:
            credential_name_or_id: Name or UUID of the credential
            context_id: Context ID to identify the user
            service_type: Optional service type filter
            
        Returns:
            Decrypted credential data or None if not found
        """
        user_id = self.user_contexts.get(context_id)
        if not user_id:
            raise ValueError(f"No user context found for context_id: {context_id}")
        
        cache_key = f"{context_id}:{credential_name_or_id}"
        
        # Check cache first
        if cache_key in self.cache:
            if self._is_cache_valid(cache_key):
                return self.cache[cache_key]
            else:
                # Remove expired cache entry
                del self.cache[cache_key]
                del self.cache_timestamps[cache_key]
        
        # Fetch from database
        try:
            credential = await self._fetch_credential(
                credential_name_or_id, 
                user_id, 
                service_type
            )
            
            if credential:
                # Decrypt and cache
                decrypted_data = decrypt_data(credential["encrypted_data"])
                
                # Add metadata for easier access
                result = {
                    "id": credential["id"],
                    "name": credential["name"],
                    "service_type": credential["service_type"],
                    **decrypted_data
                }
                
                # Cache the result
                self.cache[cache_key] = result
                self.cache_timestamps[cache_key] = datetime.now()
                
                return result
            
            return None
            
        except Exception as e:
            print(f"Error fetching credential {credential_name_or_id}: {e}")
            return None
    
    async def get_credential_by_service(
        self, 
        service_type: str, 
        context_id: str,
        credential_name: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Get the first active credential for a service type
        
        Args:
            service_type: Type of service (openai, anthropic, etc.)
            context_id: Context ID to identify the user
            credential_name: Optional specific credential name
            
        Returns:
            Decrypted credential data or None if not found
        """
        user_id = self.user_contexts.get(context_id)
        if not user_id:
            raise ValueError(f"No user context found for context_id: {context_id}")
        
        try:
            credentials = await get_database().get_user_credentials(
                user_id=user_id,
                service_type=service_type
            )
            
            if not credentials:
                return None
            
            # If specific name provided, find it
            if credential_name:
                credential = next(
                    (c for c in credentials if c["name"] == credential_name),
                    None
                )
            else:
                # Get the first active credential
                credential = next(
                    (c for c in credentials if c["is_active"]),
                    None
                )
            
            if credential:
                return await self.get_credential(credential["id"], context_id)
            
            return None
            
        except Exception as e:
            print(f"Error fetching credential for service {service_type}: {e}")
            return None
    
    async def _fetch_credential(
        self, 
        credential_name_or_id: str, 
        user_id: str,
        service_type: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Fetch credential from database by name or ID"""
        
        # Try by ID first
        if len(credential_name_or_id) == 36:  # UUID length
            credential = await get_database().get_credential(credential_name_or_id, user_id)
            if credential and credential["is_active"]:
                if not service_type or credential["service_type"] == service_type:
                    return credential
        
        # Try by name
        credentials = await get_database().get_user_credentials(user_id=user_id)
        for cred in credentials:
            if (cred["name"] == credential_name_or_id and 
                cred["is_active"] and
                (not service_type or cred["service_type"] == service_type)):
                return cred
        
        return None
    
    def _is_cache_valid(self, cache_key: str) -> bool:
        """Check if cache entry is still valid"""
        if cache_key not in self.cache_timestamps:
            return False
        
        return datetime.now() - self.cache_timestamps[cache_key] < self.cache_ttl
    
    def clear_cache(self):
        """Clear all cached credentials"""
        self.cache.clear()
        self.cache_timestamps.clear()
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics for monitoring"""
        total_entries = len(self.cache)
        valid_entries = sum(1 for key in self.cache.keys() if self._is_cache_valid(key))
        
        return {
            "total_entries": total_entries,
            "valid_entries": valid_entries,
            "expired_entries": total_entries - valid_entries,
            "cache_ttl_minutes": self.cache_ttl.total_seconds() / 60
        }


# Global singleton instance
credential_provider = CredentialProvider()

# Convenience functions for easy access
async def get_credential(
    credential_name_or_id: str, 
    context_id: str,
    service_type: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Convenience function to get credential
    """
    return await credential_provider.get_credential(
        credential_name_or_id, 
        context_id, 
        service_type
    )

async def get_openai_credential(context_id: str, name: Optional[str] = None) -> Optional[str]:
    """Get OpenAI API key"""
    cred = await credential_provider.get_credential_by_service("openai", context_id, name)
    return cred.get("api_key") if cred else None

async def get_anthropic_credential(context_id: str, name: Optional[str] = None) -> Optional[str]:
    """Get Anthropic API key"""
    cred = await credential_provider.get_credential_by_service("anthropic", context_id, name)
    return cred.get("api_key") if cred else None

async def get_google_credential(context_id: str, name: Optional[str] = None) -> Optional[str]:
    """Get Google API key"""
    cred = await credential_provider.get_credential_by_service("google", context_id, name)
    return cred.get("api_key") if cred else None

def set_workflow_context(context_id: str, user_id: str):
    """Set user context for workflow execution"""
    credential_provider.set_user_context(context_id, user_id)

def clear_workflow_context(context_id: str):
    """Clear workflow context"""
    credential_provider.clear_user_context(context_id) 