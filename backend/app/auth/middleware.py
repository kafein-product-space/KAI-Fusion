"""JWT Authentication Middleware for Agent-Flow V2.

Provides FastAPI authentication middleware that integrates with the UserService
for JWT token validation and user context injection.
"""

import logging
from typing import Optional, Dict, Any
from uuid import UUID

from fastapi import HTTPException, status, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.dependencies import get_user_service_dep, get_db_session
from app.services.user_service import UserService
from app.db.models import User

logger = logging.getLogger(__name__)

# Configure HTTPBearer with auto_error=False for optional authentication
security = HTTPBearer(auto_error=False)


class AuthenticationError(Exception):
    """Custom authentication error."""
    pass


class AuthMiddleware:
    """JWT Authentication middleware for FastAPI."""
    
    def __init__(self, user_service: UserService):
        self.user_service = user_service
    
    async def get_current_user(
        self,
        session: AsyncSession,
        credentials: Optional[HTTPAuthorizationCredentials]
    ) -> User:
        """Get current authenticated user from JWT token.
        
        Args:
            session: Database session
            credentials: JWT credentials from request
            
        Returns:
            User instance
            
        Raises:
            HTTPException: If authentication fails
        """
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication credentials required",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        try:
            # Verify JWT token
            token_payload = self.user_service.verify_token(
                credentials.credentials, "access"
            )
            
            if not token_payload:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired token",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            # Get user from database
            user_id = UUID(token_payload["sub"])
            user = await self.user_service.get_by_id(session, user_id)
            
            if not user or not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User account is inactive",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            return user
            
        except ValueError as e:
            # Invalid UUID format
            logger.warning(f"Invalid user ID in token: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token format",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication failed",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    async def get_optional_user(
        self,
        session: AsyncSession,
        credentials: Optional[HTTPAuthorizationCredentials]
    ) -> Optional[User]:
        """Get current user if authenticated, None otherwise.
        
        Args:
            session: Database session
            credentials: JWT credentials from request
            
        Returns:
            User instance if authenticated, None otherwise
        """
        if not credentials:
            return None
        
        try:
            return await self.get_current_user(session, credentials)
        except HTTPException:
            # Convert authentication errors to None for optional auth
            return None
        except Exception as e:
            logger.warning(f"Optional authentication error: {e}")
            return None


# Global middleware instance (will be initialized in dependencies)
auth_middleware: Optional[AuthMiddleware] = None


def get_auth_middleware() -> AuthMiddleware:
    """Get or create authentication middleware instance."""
    global auth_middleware
    if auth_middleware is None:
        user_service = get_user_service_dep()
        auth_middleware = AuthMiddleware(user_service)
    return auth_middleware


# FastAPI Dependencies for Authentication

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session: AsyncSession = Depends(get_db_session),
    middleware: AuthMiddleware = Depends(get_auth_middleware),
) -> User:
    """FastAPI dependency to get current authenticated user.
    
    Use this dependency in endpoints that require authentication.
    
    Example:
        @app.get("/protected")
        async def protected_endpoint(
            current_user: User = Depends(get_current_user)
        ):
            return {"user_id": current_user.id}
    """
    return await middleware.get_current_user(session, credentials)


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session: AsyncSession = Depends(get_db_session),
    middleware: AuthMiddleware = Depends(get_auth_middleware),
) -> Optional[User]:
    """FastAPI dependency to get current user if authenticated.
    
    Use this dependency in endpoints that work with or without authentication.
    
    Example:
        @app.get("/public")
        async def public_endpoint(
            current_user: Optional[User] = Depends(get_optional_user)
        ):
            if current_user:
                return {"message": f"Hello {current_user.email}"}
            return {"message": "Hello anonymous user"}
    """
    return await middleware.get_optional_user(session, credentials)


async def get_admin_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """FastAPI dependency to get current user with admin privileges.
    
    Use this dependency in endpoints that require admin access.
    
    Example:
        @app.get("/admin")
        async def admin_endpoint(
            admin_user: User = Depends(get_admin_user)
        ):
            return {"admin_id": admin_user.id}
    """
    from app.db.models import UserRole
    
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    
    return current_user


# Legacy compatibility functions (for gradual migration)

async def get_current_user_legacy() -> Dict[str, Any]:
    """Legacy function for backward compatibility.
    
    Returns user data in the old format for existing endpoints
    that haven't been migrated yet.
    """
    # This would call the new authentication but return old format
    # Implement as needed during migration
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Legacy authentication not implemented in V2"
    )


# Utility functions

def extract_user_id(user: User) -> UUID:
    """Extract user ID from user object."""
    if user.id is None:
        raise ValueError("User ID cannot be None")
    return UUID(user.id) if isinstance(user.id, str) else user.id


def extract_user_email(user: User) -> str:
    """Extract user email from user object."""
    return user.email


def check_user_permission(user: User, resource_user_id: UUID) -> bool:
    """Check if user has permission to access resource.
    
    Args:
        user: Current user
        resource_user_id: Owner of the resource
        
    Returns:
        True if user has access, False otherwise
    """
    from app.db.models import UserRole
    
    # Admin users can access everything
    if user.role == UserRole.ADMIN:
        return True
    
    # Users can access their own resources
    user_uuid = extract_user_id(user)
    return user_uuid == resource_user_id


def require_user_permission(user: User, resource_user_id: UUID) -> None:
    """Require user permission or raise HTTP exception.
    
    Args:
        user: Current user
        resource_user_id: Owner of the resource
        
    Raises:
        HTTPException: If user lacks permission
    """
    if not check_user_permission(user, resource_user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to access resource"
        ) 