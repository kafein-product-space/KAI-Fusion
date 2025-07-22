from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.user_service import UserService
from app.services.dependencies import get_user_service_dep, get_db_session
from app.core.constants import SECRET_KEY, ALGORITHM

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
        payload = jwt.decode(
            credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM]
        )
        email: Optional[str] = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await user_service.get_by_email(db, email=email)
    if user is None:
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