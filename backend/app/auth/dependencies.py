from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.auth.supabase_client import auth_client
from typing import Optional, Dict, Any

# Set auto_error=False so routes using `get_optional_user` don't automatically
# return 403 when the Authorization header is missing.

security = HTTPBearer(auto_error=False)

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Dict[str, Any]:
    """Return the currently authenticated user or raise 401.

    The ``HTTPBearer`` dependency is configured with ``auto_error=False`` so if
    the *Authorization* header is missing ``credentials`` will be *None*.
    In that case—or if the token is invalid—we raise **401 Unauthorized** so
    callers know they must authenticate first.
    """

    # No credentials supplied → unauthenticated
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if auth_client is None:
        # Auth service not configured; treat every request as unauthenticated
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service not available",
        )

    token = credentials.credentials
    user = await auth_client.get_user(token)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user

async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[Dict[str, Any]]:
    """Return user if a valid Bearer token is supplied; otherwise ``None``.

    Unlike ``get_current_user`` this never raises – it converts any auth
    failure into ``None`` so public endpoints can be accessed without creds.
    """

    if not credentials:
        return None

    try:
        return await get_current_user(credentials)
    except Exception:
        # Invalid / expired token → treat as unauthenticated
        return None
