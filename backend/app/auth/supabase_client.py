from supabase import create_client, Client
from app.core.config import get_settings
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)
settings = get_settings()

class SupabaseAuth:
    """Enhanced Supabase authentication client"""
    
    def __init__(self):
        if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
            logger.warning("Supabase credentials not configured. Authentication will be disabled.")
            self.client = None
            return
            
        try:
            self.client: Client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_KEY
            )
            logger.info("✅ Supabase auth client initialized successfully")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Supabase auth client: {e}")
            self.client = None
    
    def _ensure_client(self):
        """Ensure auth client is available"""
        if not self.client:
            raise ValueError("Authentication service not available. Check Supabase configuration.")
    
    async def sign_up(self, email: str, password: str, metadata: Optional[dict] = None) -> Dict[str, Any]:
        """Register a new user"""
        self._ensure_client()
        try:
            response = self.client.auth.sign_up({
                "email": email,
                "password": password,
                "options": {
                    "data": metadata or {}
                }
            })
            
            if response.user:
                logger.info(f"✅ User registered: {email}")
                return {
                    "success": True,
                    "user": response.user,
                    "session": response.session
                }
            else:
                logger.warning(f"Failed to register user: {email}")
                return {
                    "success": False,
                    "error": "Registration failed"
                }
                
        except Exception as e:
            logger.error(f"❌ Registration error for {email}: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def sign_in(self, email: str, password: str) -> Dict[str, Any]:
        """Sign in with email and password"""
        self._ensure_client()
        try:
            response = self.client.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            
            if response.user:
                logger.info(f"✅ User signed in: {email}")
                return {
                    "success": True,
                    "user": response.user,
                    "session": response.session
                }
            else:
                logger.warning(f"Failed to sign in user: {email}")
                return {
                    "success": False,
                    "error": "Invalid credentials"
                }
                
        except Exception as e:
            logger.warning(f"Sign in failed for {email}: {e}")
            return {
                "success": False,
                "error": "Invalid credentials"
            }
    
    async def sign_out(self, token: str) -> Dict[str, Any]:
        """Sign out a user"""
        self._ensure_client()
        try:
            await self.client.auth.sign_out(token)
            logger.info("✅ User signed out successfully")
            return {
                "success": True,
                "message": "Signed out successfully"
            }
        except Exception as e:
            logger.error(f"❌ Sign out error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_user(self, token: str) -> Optional[Dict[str, Any]]:
        """Get user from JWT token"""
        self._ensure_client()
        try:
            response = self.client.auth.get_user(token)
            if response.user:
                return {
                    "id": response.user.id,
                    "email": response.user.email,
                    "created_at": response.user.created_at,
                    "metadata": response.user.user_metadata or {},
                    "app_metadata": response.user.app_metadata or {}
                }
            return None
        except Exception as e:
            logger.debug(f"Token validation failed: {e}")
            return None
    
    async def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token"""
        self._ensure_client()
        try:
            response = self.client.auth.refresh_session(refresh_token)
            
            if response.session:
                logger.info("✅ Token refreshed successfully")
                return {
                    "success": True,
                    "user": response.user,
                    "session": response.session
                }
            else:
                return {
                    "success": False,
                    "error": "Token refresh failed"
                }
                
        except Exception as e:
            logger.warning(f"Token refresh failed: {e}")
            return {
                "success": False,
                "error": "Invalid refresh token"
            }
    
    async def update_user(self, token: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update user profile"""
        self._ensure_client()
        try:
            # Set the token for the request
            self.client.auth.set_session(token, refresh_token=None)
            
            response = self.client.auth.update_user(updates)
            
            if response.user:
                logger.info(f"✅ User updated: {response.user.email}")
                return {
                    "success": True,
                    "user": response.user
                }
            else:
                return {
                    "success": False,
                    "error": "Update failed"
                }
                
        except Exception as e:
            logger.error(f"❌ User update error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def reset_password(self, email: str) -> Dict[str, Any]:
        """Send password reset email"""
        self._ensure_client()
        try:
            response = self.client.auth.reset_password_email(email)
            logger.info(f"✅ Password reset email sent to: {email}")
            return {
                "success": True,
                "message": "Password reset email sent"
            }
        except Exception as e:
            logger.error(f"❌ Password reset error for {email}: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def verify_email(self, token: str, email: str) -> Dict[str, Any]:
        """Verify email with token"""
        self._ensure_client()
        try:
            response = self.client.auth.verify_otp({
                "token": token,
                "type": "email",
                "email": email
            })
            
            if response.user:
                logger.info(f"✅ Email verified: {email}")
                return {
                    "success": True,
                    "user": response.user,
                    "session": response.session
                }
            else:
                return {
                    "success": False,
                    "error": "Email verification failed"
                }
                
        except Exception as e:
            logger.error(f"❌ Email verification error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def is_available(self) -> bool:
        """Check if auth service is available"""
        return self.client is not None

# Global auth client instance
auth_client = SupabaseAuth() if settings.SUPABASE_URL and settings.SUPABASE_KEY else None

# Export for backwards compatibility
__all__ = ['SupabaseAuth', 'auth_client']
