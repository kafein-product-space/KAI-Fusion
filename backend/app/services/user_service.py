"""User Service for Agent-Flow V2.

Handles user authentication, registration, profile management,
password operations, and user-related business logic.
"""

import hashlib
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from uuid import UUID, uuid4
import secrets
import bcrypt
import jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.repositories import UserRepository  
from app.db.models import User, UserCreate, UserUpdate, UserRole
from .base import BaseService, ValidationError, NotFoundError, BusinessRuleError

logger = logging.getLogger(__name__)


class AuthenticationError(Exception):
    """Raised when authentication fails."""
    pass


class UserService(BaseService):
    """Service for user management and authentication."""
    
    def __init__(self, user_repository: UserRepository):
        super().__init__(user_repository)
        self.model_name = "User"
        self.settings = get_settings()
        
    # Authentication and Registration
    
    async def authenticate_user(
        self, 
        session: AsyncSession, 
        email: str, 
        password: str
    ) -> Optional[User]:
        """Authenticate user with email and password.
        
        Args:
            session: Database session
            email: User email
            password: Plain text password
            
        Returns:
            User instance if authentication successful, None otherwise
        """
        try:
            user = await self.repository.get_by_email(session, email)
            if not user or not user.is_active:
                return None
                
            if not self._verify_password(password, user.hashed_password):
                return None
                
            # Update last login
            await self.repository.update_last_login(session, user.id)
            
            self.logger.info(f"User {email} authenticated successfully")
            return user
            
        except Exception as e:
            self.logger.error(f"Authentication error for {email}: {e}")
            return None
    
    async def register_user(
        self, 
        session: AsyncSession, 
        user_create: UserCreate
    ) -> User:
        """Register a new user.
        
        Args:
            session: Database session
            user_create: User creation data
            
        Returns:
            Created user instance
            
        Raises:
            ValidationError: If validation fails
            BusinessRuleError: If email already exists
        """
        try:
            # Check if email already exists
            existing_user = await self.repository.get_by_email(session, user_create.email)
            if existing_user:
                raise BusinessRuleError("Email already registered")
            
            # Validate password strength
            self._validate_password_strength(user_create.password)
            
            # Hash password
            hashed_password = self._hash_password(user_create.password)
            
            # Create user
            user = await self.repository.create_user(session, user_create, hashed_password)
            if not user:
                raise BusinessRuleError("Failed to create user - email may already exist")
            
            self.logger.info(f"User registered: {user.email}")
            return user
            
        except (ValidationError, BusinessRuleError):
            raise
        except Exception as e:
            self.logger.error(f"Registration error: {e}")
            raise ValidationError("Failed to register user")
    
    async def change_password(
        self,
        session: AsyncSession,
        user_id: UUID,
        current_password: str,
        new_password: str
    ) -> bool:
        """Change user password.
        
        Args:
            session: Database session
            user_id: User ID
            current_password: Current password for verification
            new_password: New password
            
        Returns:
            True if password changed successfully
            
        Raises:
            NotFoundError: If user not found
            AuthenticationError: If current password is incorrect
            ValidationError: If new password validation fails
        """
        try:
            user = await self.get_by_id(session, user_id)
            
            # Verify current password
            if not self._verify_password(current_password, user.hashed_password):
                raise AuthenticationError("Current password is incorrect")
            
            # Validate new password
            self._validate_password_strength(new_password)
            
            # Hash new password
            new_hashed_password = self._hash_password(new_password)
            
            # Update user
            user_update = UserUpdate(hashed_password=new_hashed_password)
            await self.repository.update(session, db_obj=user, obj_in=user_update)
            
            self.logger.info(f"Password changed for user {user.email}")
            return True
            
        except (NotFoundError, AuthenticationError, ValidationError):
            raise
        except Exception as e:
            self.logger.error(f"Password change error: {e}")
            raise ValidationError("Failed to change password")
    
    async def reset_password_request(
        self,
        session: AsyncSession,
        email: str
    ) -> Optional[str]:
        """Request password reset for user.
        
        Args:
            session: Database session
            email: User email
            
        Returns:
            Reset token if user exists, None otherwise
        """
        try:
            user = await self.repository.get_by_email(session, email)
            if not user or not user.is_active:
                # Don't reveal whether email exists
                return None
            
            # Generate reset token
            reset_token = secrets.token_urlsafe(32)
            reset_expires = datetime.utcnow() + timedelta(hours=1)  # 1 hour expiry
            
            # Store reset token (you might want to create a separate table for this)
            user_update = UserUpdate(
                reset_token=reset_token,
                reset_token_expires=reset_expires
            )
            await self.repository.update(session, db_obj=user, obj_in=user_update)
            
            self.logger.info(f"Password reset requested for {email}")
            return reset_token
            
        except Exception as e:
            self.logger.error(f"Password reset request error: {e}")
            return None
    
    async def reset_password(
        self,
        session: AsyncSession,
        reset_token: str,
        new_password: str
    ) -> bool:
        """Reset password using reset token.
        
        Args:
            session: Database session
            reset_token: Password reset token
            new_password: New password
            
        Returns:
            True if password reset successfully
            
        Raises:
            ValidationError: If token invalid or expired
        """
        try:
            # Find user by reset token
            user = await self.repository.get_by_field(
                session, 
                field="reset_token", 
                value=reset_token
            )
            
            if not user or not user.reset_token_expires:
                raise ValidationError("Invalid reset token")
            
            if datetime.utcnow() > user.reset_token_expires:
                raise ValidationError("Reset token has expired")
            
            # Validate new password
            self._validate_password_strength(new_password)
            
            # Hash new password and clear reset token
            new_hashed_password = self._hash_password(new_password)
            user_update = UserUpdate(
                hashed_password=new_hashed_password,
                reset_token=None,
                reset_token_expires=None
            )
            await self.repository.update(session, db_obj=user, obj_in=user_update)
            
            self.logger.info(f"Password reset completed for {user.email}")
            return True
            
        except ValidationError:
            raise
        except Exception as e:
            self.logger.error(f"Password reset error: {e}")
            raise ValidationError("Failed to reset password")
    
    # JWT Token Management
    
    def create_access_token(self, user: User) -> str:
        """Create JWT access token for user.
        
        Args:
            user: User instance
            
        Returns:
            JWT access token
        """
        now = datetime.utcnow()
        expires = now + timedelta(minutes=self.settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        payload = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value,
            "iat": now,
            "exp": expires,
            "type": "access"
        }
        
        return jwt.encode(
            payload, 
            self.settings.SECRET_KEY, 
            algorithm="HS256"
        )
    
    def create_refresh_token(self, user: User) -> str:
        """Create JWT refresh token for user.
        
        Args:
            user: User instance
            
        Returns:
            JWT refresh token
        """
        now = datetime.utcnow()
        expires = now + timedelta(days=self.settings.REFRESH_TOKEN_EXPIRE_DAYS)
        
        payload = {
            "sub": str(user.id),
            "iat": now,
            "exp": expires,
            "type": "refresh"
        }
        
        return jwt.encode(
            payload, 
            self.settings.SECRET_KEY, 
            algorithm="HS256"
        )
    
    def verify_token(self, token: str, token_type: str = "access") -> Optional[Dict[str, Any]]:
        """Verify JWT token.
        
        Args:
            token: JWT token
            token_type: Token type ("access" or "refresh")
            
        Returns:
            Token payload if valid, None otherwise
        """
        try:
            payload = jwt.decode(
                token, 
                self.settings.SECRET_KEY, 
                algorithms=["HS256"]
            )
            
            if payload.get("type") != token_type:
                return None
                
            return payload
            
        except jwt.ExpiredSignatureError:
            self.logger.warning("Token has expired")
            return None
        except jwt.InvalidTokenError:
            self.logger.warning("Invalid token")
            return None
    
    async def refresh_access_token(
        self, 
        session: AsyncSession, 
        refresh_token: str
    ) -> Optional[Dict[str, str]]:
        """Refresh access token using refresh token.
        
        Args:
            session: Database session
            refresh_token: Refresh token
            
        Returns:
            New access and refresh tokens if successful
        """
        try:
            payload = self.verify_token(refresh_token, "refresh")
            if not payload:
                return None
            
            user = await self.get_by_id(session, UUID(payload["sub"]))
            if not user or not user.is_active:
                return None
            
            # Create new tokens
            new_access_token = self.create_access_token(user)
            new_refresh_token = self.create_refresh_token(user)
            
            return {
                "access_token": new_access_token,
                "refresh_token": new_refresh_token,
                "token_type": "bearer"
            }
            
        except Exception as e:
            self.logger.error(f"Token refresh error: {e}")
            return None
    
    # User Management
    
    async def get_user_profile(
        self, 
        session: AsyncSession, 
        user_id: UUID
    ) -> User:
        """Get user profile."""
        return await self.get_by_id(session, user_id)
    
    async def update_user_profile(
        self,
        session: AsyncSession,
        user_id: UUID,
        profile_update: UserUpdate
    ) -> User:
        """Update user profile."""
        # Don't allow updating sensitive fields through profile update
        sensitive_fields = ["hashed_password", "role", "is_active", "reset_token"]
        update_data = profile_update.model_dump(exclude_unset=True)
        
        for field in sensitive_fields:
            update_data.pop(field, None)
        
        if not update_data:
            raise ValidationError("No valid fields to update")
        
        # Create filtered update object
        filtered_update = UserUpdate(**update_data)
        return await self.update(session, user_id, filtered_update)
    
    async def deactivate_user(
        self,
        session: AsyncSession,
        user_id: UUID,
        admin_user_id: UUID
    ) -> bool:
        """Deactivate user (admin only)."""
        # Check if admin user has permission
        admin_user = await self.get_by_id(session, admin_user_id)
        if admin_user.role != UserRole.ADMIN:
            raise ValidationError("Only admins can deactivate users")
        
        return await self.repository.deactivate_user(session, str(user_id))
    
    async def search_users(
        self,
        session: AsyncSession,
        query: str,
        limit: int = 10,
        admin_user_id: Optional[UUID] = None
    ) -> List[User]:
        """Search users (admin only)."""
        if admin_user_id:
            admin_user = await self.get_by_id(session, admin_user_id)
            if admin_user.role != UserRole.ADMIN:
                raise ValidationError("Only admins can search users")
        
        return await self.repository.search_users(session, query, limit)
    
    # Validation hooks implementation
    
    async def _validate_create(
        self, 
        session: AsyncSession, 
        obj_in: Any, 
        user_id: Optional[UUID]
    ) -> None:
        """Validate user creation."""
        if hasattr(obj_in, 'email'):
            existing = await self.repository.get_by_email(session, obj_in.email)
            if existing:
                raise ValidationError("Email already registered")
        
        if hasattr(obj_in, 'password'):
            self._validate_password_strength(obj_in.password)
    
    async def _validate_update(
        self,
        session: AsyncSession,
        model: Any,
        obj_in: Any,
        user_id: Optional[UUID]
    ) -> None:
        """Validate user update."""
        # Check if user is updating their own profile or is admin
        if user_id and str(model.id) != str(user_id):
            admin_user = await self.get_by_id(session, user_id)
            if admin_user.role != UserRole.ADMIN:
                raise ValidationError("Can only update own profile")
    
    async def _validate_delete(
        self,
        session: AsyncSession,
        model: Any,
        user_id: Optional[UUID]
    ) -> None:
        """Validate user deletion."""
        # Only admins can delete users
        if user_id:
            admin_user = await self.get_by_id(session, user_id)
            if admin_user.role != UserRole.ADMIN:
                raise ValidationError("Only admins can delete users")
    
    # Private utility methods
    
    def _hash_password(self, password: str) -> str:
        """Hash password using bcrypt."""
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def _verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash."""
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    
    def _validate_password_strength(self, password: str) -> None:
        """Validate password strength."""
        if len(password) < 8:
            raise ValidationError("Password must be at least 8 characters long")
        
        if not any(c.isupper() for c in password):
            raise ValidationError("Password must contain at least one uppercase letter")
        
        if not any(c.islower() for c in password):
            raise ValidationError("Password must contain at least one lowercase letter")
        
        if not any(c.isdigit() for c in password):
            raise ValidationError("Password must contain at least one digit")
        
        if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
            raise ValidationError("Password must contain at least one special character") 