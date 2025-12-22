from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
import secrets
import string

from app.models.user import User
from app.services.user_service import UserService
from app.services.dependencies import get_user_service_dep, get_db_session
from app.core.constants import SECRET_KEY, ALGORITHM
from app.core.security import verify_token
from app.schemas.auth import UserSignUpData

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db_session),
    user_service: UserService = Depends(get_user_service_dep),
) -> User:
    """
    Decode JWT and return the database user.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Verify token using centralized security logic (supports Local + Keycloak)
        payload = verify_token(credentials.credentials)
        
        email: Optional[str] = payload.get("sub")
        # Keycloak uses 'sub' for UUID, and 'email' for email usually, but can be configured.
        # Check 'email' claim if 'sub' is not an email.
        if email and "@" not in email:
             email = payload.get("email") or payload.get("preferred_username")

        if email is None:
            raise credentials_exception
            
    except Exception:
        raise credentials_exception
    
    user = await user_service.get_by_email(db, email=email)
    
    if user is None:
        # Check if it's a Keycloak token (RS256) for JIT Provisioning
        try:
            unverified_header = jwt.get_unverified_header(credentials.credentials)
            if unverified_header.get("alg") == "RS256":
                # JIT Provisioning
                name = payload.get("name") or f"{payload.get('given_name', '')} {payload.get('family_name', '')}".strip()
                if not name:
                    name = email.split("@")[0]
                
                # Create a secure random password (user will login via Keycloak anyway)
                random_password = "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
                
                user_data = UserSignUpData(
                    email=email,
                    name=name,
                    credential=random_password
                )
                user = await user_service.create_user(db, user_data)
            else:
                # Local token but user not found
                raise credentials_exception
        except Exception:
            raise credentials_exception

    return user

async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: AsyncSession = Depends(get_db_session),
    user_service: UserService = Depends(get_user_service_dep),
) -> Optional[User]:
    """
    Return user if a valid Bearer token is supplied; otherwise ``None``.
    """
    if not credentials:
        return None
    try:
        return await get_current_user(credentials, db, user_service)
    except HTTPException:
        return None