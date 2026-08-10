"""User Credentials API endpoints"""

import asyncio
import logging
import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
import httpx
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.credential_service import CredentialService
from app.services.dependencies import get_credential_service_dep, get_db_session
from app.auth.dependencies import get_current_user
from app.schemas.user_credential import (
    CredentialCreateRequest,
    CredentialUpdateRequest,
    CredentialDetailResponse,
    CredentialDeleteResponse,
    CredentialWorkflowUsageResponse,
    UserCredentialCreate,
)

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("", response_model=List[CredentialDetailResponse])
async def get_user_credentials(
    credential_name: Optional[str] = Query(None, alias="credentialName"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    credential_service: CredentialService = Depends(get_credential_service_dep)
):
    """
    Get all credentials for the current user.
    
    - **credential_name**: Optional query parameter to filter by credential name
    - **Returns**: List of user credentials (without sensitive data)
    """
    # Store user_id early to avoid lazy loading issues
    user_id = current_user.id
    
    try:
        if credential_name:
            # Filter by credential name
            credentials = await credential_service.get_by_user_id_and_name(
                db, user_id, credential_name
            )
        else:
            # Get all credentials for user
            credentials = await credential_service.get_by_user_id(db, user_id)
        
        # Convert to response schema
        response_credentials = [
            CredentialDetailResponse(
                id=cred.id,
                name=cred.name,
                service_type=cred.service_type,
                created_at=cred.created_at,
                updated_at=cred.updated_at
            )
            for cred in credentials
        ]
        
        return response_credentials
        
    except Exception as e:
        logger.error(f"Error retrieving credentials for user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve credentials"
        )

@router.get("/{credential_id}", response_model=CredentialDetailResponse)
async def get_credential_by_id(
    credential_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    credential_service: CredentialService = Depends(get_credential_service_dep)
):
    """
    Get a specific credential by ID.
    
    - **credential_id**: UUID of the credential to retrieve
    - **Returns**: Credential details (without sensitive data)
    """
    # Store user_id early to avoid lazy loading issues
    user_id = current_user.id
    
    try:
        # Use get_decrypted_credential to return secret data for editing
        decrypted = await credential_service.get_decrypted_credential(
            db, user_id, credential_id
        )
        if not decrypted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Credential not found"
            )
        
        return CredentialDetailResponse(
            id=decrypted["id"],
            name=decrypted["name"],
            service_type=decrypted["service_type"],
            created_at=decrypted["created_at"],
            updated_at=decrypted["updated_at"],
            secret=decrypted.get("secret", {})
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving credential {credential_id} for user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve credential"
        )


@router.get("/{credential_id}/workflows", response_model=CredentialWorkflowUsageResponse)
async def get_credential_workflows(
    credential_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    credential_service: CredentialService = Depends(get_credential_service_dep),
):
    """
    List workflows that use the given credential in node configuration.

    Returns minimal workflow metadata and node usage details (no full flow_data).
    """
    user_id = current_user.id

    try:
        usage = await credential_service.get_workflows_using_credential(
            db, user_id, credential_id
        )
        if not usage:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Credential not found",
            )
        return usage
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Error retrieving workflow usage for credential {credential_id} "
            f"and user {user_id}: {e}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve credential workflow usage",
        )


@router.post("", response_model=CredentialDetailResponse)
async def create_credential(
    credential_data: CredentialCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    credential_service: CredentialService = Depends(get_credential_service_dep)
):
    """
    Create a new credential.
    
    - **credential_data**: Credential creation data with name and data fields
    - **Returns**: Created credential details
    """
    # Store user_id early to avoid lazy loading issues
    user_id = current_user.id
    
    try:
        # Detect service type from data structure unless explicitly provided by client
        service_type = credential_data.service_type or _detect_service_type(credential_data.data)
        
        # Create UserCredentialCreate schema
        create_schema = UserCredentialCreate(
            name=credential_data.name,
            service_type=service_type,
            secret=credential_data.data
        )
        
        # Create the credential
        credential = await credential_service.create_credential(
            db, user_id, create_schema
        )
        
        return CredentialDetailResponse(
            id=credential.id,
            name=credential.name,
            service_type=credential.service_type,
            created_at=credential.created_at,
            updated_at=credential.updated_at
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error creating credential for user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create credential"
        )

@router.put("/{credential_id}", response_model=CredentialDetailResponse)
async def update_credential(
    credential_id: uuid.UUID,
    update_data: CredentialUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    credential_service: CredentialService = Depends(get_credential_service_dep)
):
    """
    Update an existing credential.
    
    - **credential_id**: UUID of the credential to update
    - **update_data**: Fields to update
    - **Returns**: Updated credential details
    """
    # Store user_id early to avoid lazy loading issues
    user_id = current_user.id
    
    try:
        # Check if credential exists and belongs to user
        existing_credential = await credential_service.get_by_user_and_id(
            db, user_id, credential_id
        )
        
        if not existing_credential:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Credential not found"
            )
        
        # If data is provided, we need to re-encrypt the credential
        if update_data.data is not None:
            # Instead of delete/create, update the existing credential with new encrypted data
            # Determine service type (client overrides detection if provided)
            service_type = update_data.service_type or _detect_service_type(update_data.data)
            name = update_data.name if update_data.name is not None else existing_credential.name
            
            # Encrypt the new data
            from app.core.encryption import encrypt_data
            import base64
            
            encrypted_bytes = encrypt_data(update_data.data)
            encrypted_secret = base64.b64encode(encrypted_bytes).decode('utf-8')
            
            # Update the credential directly
            existing_credential.name = name
            existing_credential.service_type = service_type
            existing_credential.encrypted_secret = encrypted_secret
            
            await db.commit()
            await db.refresh(existing_credential)
            credential = existing_credential
            
        else:
            # Only update name if provided
            from app.schemas.user_credential import UserCredentialUpdate
            update_schema = UserCredentialUpdate(name=update_data.name)
            
            credential = await credential_service.update_credential(
                db, user_id, credential_id, update_schema
            )
        
        if not credential:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update credential"
            )
        
        return CredentialDetailResponse(
            id=credential.id,
            name=credential.name,
            service_type=credential.service_type,
            created_at=credential.created_at,
            updated_at=credential.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating credential {credential_id} for user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update credential"
        )

@router.delete("/{credential_id}", response_model=CredentialDeleteResponse)
async def delete_credential(
    credential_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    credential_service: CredentialService = Depends(get_credential_service_dep)
):
    """
    Delete a credential.
    
    - **credential_id**: UUID of the credential to delete
    - **Returns**: Success message with deleted credential ID
    """
    # Store user_id early to avoid lazy loading issues
    user_id = current_user.id
    
    try:
        # Check if credential exists and belongs to user
        existing_credential = await credential_service.get_by_user_and_id(
            db, user_id, credential_id
        )
        
        if not existing_credential:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Credential not found"
            )
        
        # Delete the credential
        success = await credential_service.delete_credential(
            db, user_id, credential_id
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete credential"
            )
        
        return CredentialDeleteResponse(
            message="Credential deleted successfully",
            deleted_id=credential_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting credential {credential_id} for user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete credential"
        )

class CredentialTestResponse(BaseModel):
    success: bool
    message: str


class CredentialTestRawRequest(BaseModel):
    service_type: str
    data: Dict[str, Any]


async def _test_openai(secret: Dict[str, Any]) -> CredentialTestResponse:
    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=secret.get("api_key", ""))
        await asyncio.wait_for(client.models.list(), timeout=10)
        return CredentialTestResponse(success=True, message="Connected to OpenAI successfully.")
    except asyncio.TimeoutError:
        return CredentialTestResponse(success=False, message="Connection timed out.")
    except Exception as e:
        msg = str(e)
        if "invalid" in msg.lower() or "auth" in msg.lower():
            msg += (
                " Note: If this key is for an OpenAI-compatible provider "
                "(OpenRouter, vLLM, etc.), it may still be valid for that provider."
            )
        return CredentialTestResponse(success=False, message=msg)


async def _test_openai_compatible(secret: Dict[str, Any]) -> CredentialTestResponse:
    try:
        from openai import AsyncOpenAI

        # Use dummy key for local servers that don't need auth, so client doesn't complain about empty key
        api_key = secret.get("api_key", "")
        if not api_key:
            api_key = "dummy_for_local"

        # Check if SSL verification should be skipped
        skip_ssl = secret.get("skip_ssl_verify", False)
        if isinstance(skip_ssl, str):
            skip_ssl = skip_ssl.lower() in ("true", "1", "yes", "on")
        skip_ssl = bool(skip_ssl)

        client_kwargs = {
            "api_key": api_key,
            "base_url": secret.get("base_url", "")
        }

        # Inject custom HTTP client to bypass SSL verification
        if skip_ssl:
            logger.info("SSL verification disabled for test connection.")
            client_kwargs["http_client"] = httpx.AsyncClient(verify=False)

        client = AsyncOpenAI(**client_kwargs)
        
        # 1. First, test using chat/completions endpoint
        model_name = secret.get("model_name", "")
        await asyncio.wait_for(
            client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": "ping"}],
                max_tokens=16
            ),
            timeout=10
        )
        msg = "Connected to OpenAI Compatible provider successfully via chat/completions."
        if skip_ssl:
            msg += " (SSL verification was skipped)"
        return CredentialTestResponse(success=True, message=msg)
    except asyncio.TimeoutError:
        return CredentialTestResponse(success=False, message="Connection timed out.")
    except Exception as e:
        return CredentialTestResponse(success=False, message=str(e))


async def _test_cohere(secret: Dict[str, Any]) -> CredentialTestResponse:
    try:
        import cohere

        client = cohere.AsyncClientV2(api_key=secret.get("api_key", ""))
        await asyncio.wait_for(
            client.embed(texts=["test"], model="embed-english-v3.0", input_type="search_query"),
            timeout=10,
        )
        return CredentialTestResponse(success=True, message="Connected to Cohere successfully.")
    except asyncio.TimeoutError:
        return CredentialTestResponse(success=False, message="Connection timed out.")
    except Exception as e:
        return CredentialTestResponse(success=False, message=str(e))


async def _test_tavily(secret: Dict[str, Any]) -> CredentialTestResponse:
    api_key = str(secret.get("api_key", "")).strip()
    if not api_key:
        return CredentialTestResponse(success=False, message="API key is required.")

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                "https://api.tavily.com/search",
                json={"api_key": api_key, "query": "ping", "max_results": 1},
            )
            response.raise_for_status()
        return CredentialTestResponse(success=True, message="Connected to Tavily successfully.")
    except (asyncio.TimeoutError, httpx.TimeoutException):
        return CredentialTestResponse(success=False, message="Connection timed out.")
    except Exception as e:
        return CredentialTestResponse(success=False, message=str(e))


async def _test_postgresql(secret: Dict[str, Any]) -> CredentialTestResponse:
    try:
        import psycopg2

        def _connect():
            conn = psycopg2.connect(
                host=secret.get("host", "localhost"),
                port=int(secret.get("port", 5432)),
                dbname=secret.get("database", ""),
                user=secret.get("username", ""),
                password=secret.get("password", ""),
                connect_timeout=10,
            )
            cur = conn.cursor()
            cur.execute("SELECT 1")
            cur.close()
            conn.close()

        await asyncio.wait_for(asyncio.get_event_loop().run_in_executor(None, _connect), timeout=15)
        return CredentialTestResponse(success=True, message="Connected to PostgreSQL successfully.")
    except asyncio.TimeoutError:
        return CredentialTestResponse(success=False, message="Connection timed out.")
    except Exception as e:
        return CredentialTestResponse(success=False, message=str(e))


async def _test_kafka(secret: Dict[str, Any]) -> CredentialTestResponse:
    try:
        from confluent_kafka.admin import AdminClient

        conf: Dict[str, Any] = {
            "bootstrap.servers": secret.get("brokers", ""),
            "socket.timeout.ms": 10000,
        }
        security_protocol = secret.get("security_protocol", "PLAINTEXT")
        if security_protocol:
            conf["security.protocol"] = security_protocol
        if security_protocol in ("SASL_PLAINTEXT", "SASL_SSL"):
            conf["sasl.mechanism"] = secret.get("sasl_mechanism", "PLAIN")
            conf["sasl.username"] = secret.get("sasl_username", "")
            conf["sasl.password"] = secret.get("sasl_password", "")

        def _connect():
            admin = AdminClient(conf)
            metadata = admin.list_topics(timeout=10)
            return metadata

        await asyncio.wait_for(asyncio.get_event_loop().run_in_executor(None, _connect), timeout=15)
        return CredentialTestResponse(success=True, message="Connected to Kafka successfully.")
    except asyncio.TimeoutError:
        return CredentialTestResponse(success=False, message="Connection timed out.")
    except Exception as e:
        return CredentialTestResponse(success=False, message=str(e))


async def _test_minio(secret: Dict[str, Any]) -> CredentialTestResponse:
    try:
        from app.services.minio_service import minio_service
        import asyncio
        import boto3
        from botocore.exceptions import ClientError, EndpointConnectionError
        
        endpoint = secret.get("endpoint", "").strip()
        # Strip protocols if user entered them
        if endpoint.startswith("http://"):
            endpoint = endpoint[7:]
        elif endpoint.startswith("https://"):
            endpoint = endpoint[8:]
            
        if not endpoint:
            return CredentialTestResponse(success=False, message="Endpoint URL is required (e.g. host.docker.internal:9000).")
            
        access_key = secret.get("access_key") or secret.get("username", "")
        secret_key = secret.get("secret_key") or secret.get("password", "")
        
        if not access_key or not secret_key:
            return CredentialTestResponse(success=False, message="Access Key and Secret Key are required.")

        use_ssl_val = secret.get('use_ssl', False)
        use_ssl = use_ssl_val is True or str(use_ssl_val).lower() in ['true', '1', 'yes']

        def _connect():
            logger.info(f"Testing MinIO connection to {endpoint} (SSL: {use_ssl})")
            # Force path-style for MinIO
            client = minio_service.get_client(endpoint, access_key, secret_key, use_ssl=use_ssl)
            # Try to list buckets to verify credentials and connectivity
            client.list_buckets()

        await asyncio.wait_for(asyncio.get_event_loop().run_in_executor(None, _connect), timeout=12)
        return CredentialTestResponse(success=True, message="Connected to MinIO/S3 successfully.")
    except asyncio.TimeoutError:
        logger.error("MinIO test timed out")
        return CredentialTestResponse(success=False, message="Connection timed out. Check your Endpoint URL and Firewall.")
    except EndpointConnectionError as e:
        logger.error(f"MinIO endpoint error: {e}")
        return CredentialTestResponse(success=False, message=f"Could not connect to endpoint: {e}")
    except ClientError as e:
        logger.error(f"MinIO client error: {e}")
        return CredentialTestResponse(success=False, message=f"Authentication failed: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected MinIO test error: {type(e).__name__}: {e}")
        return CredentialTestResponse(success=False, message=f"Connection failed: {str(e)}")


def _test_webhook_auth(secret: Dict[str, Any], service_type: str) -> CredentialTestResponse:
    if service_type == "basic_auth":
        if secret.get("username") and secret.get("password"):
            return CredentialTestResponse(success=True, message="Credentials format is valid.")
        return CredentialTestResponse(success=False, message="Username and password are required.")
    if service_type == "header_auth":
        if secret.get("header_name") and secret.get("header_value"):
            return CredentialTestResponse(success=True, message="Credentials format is valid.")
        return CredentialTestResponse(success=False, message="Header name and value are required.")
    return CredentialTestResponse(success=False, message="Unknown credential type.")


async def _run_test(service_type: str, secret: Dict[str, Any]) -> CredentialTestResponse:
    """Route a test request to the appropriate handler based on service type."""
    if service_type == "openai":
        return await _test_openai(secret)
    elif service_type == "openai_compatible":
        return await _test_openai_compatible(secret)
    elif service_type == "cohere":
        return await _test_cohere(secret)
    elif service_type == "tavily_search":
        return await _test_tavily(secret)
    elif service_type == "postgresql_vectorstore":
        return await _test_postgresql(secret)
    elif service_type in ("gmail", "gmail_readonly", "google_drive",
                          "google_sheets", "google_calendar"):
        return await _test_google(secret)
    elif service_type == "kafka":
        return await _test_kafka(secret)
    elif service_type == "minio":
        return await _test_minio(secret)
    elif service_type in ("basic_auth", "header_auth"):
        return _test_webhook_auth(secret, service_type)
    else:
        return CredentialTestResponse(
            success=False, message=f"Test not supported for service type: {service_type}"
        )


@router.post("/test-raw", response_model=CredentialTestResponse)
async def test_credential_raw(
    request: CredentialTestRawRequest,
    current_user=Depends(get_current_user),
):
    """Test credentials before saving, using raw data from the form."""
    try:
        return await _run_test(request.service_type, request.data)
    except Exception as e:
        logger.error(f"Unexpected error testing raw credential: {e}")
        return CredentialTestResponse(success=False, message=f"Unexpected error: {e}")


@router.post("/{credential_id}/test", response_model=CredentialTestResponse)
async def test_credential(
    credential_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    credential_service: CredentialService = Depends(get_credential_service_dep),
):
    """Test whether a saved credential can successfully connect to its service."""
    user_id = current_user.id

    decrypted = await credential_service.get_decrypted_credential(db, user_id, credential_id)
    if not decrypted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Credential not found")

    service_type: str = decrypted.get("service_type", "")
    secret: Dict[str, Any] = decrypted.get("secret", {})

    try:
        return await _run_test(service_type, secret)
    except Exception as e:
        logger.error(f"Unexpected error testing credential {credential_id}: {e}")
        return CredentialTestResponse(success=False, message=f"Unexpected error: {e}")


def _detect_service_type(data: dict) -> str:
    """
    Detect service type from credential data structure.
    
    - **data**: Dictionary containing credential data
    - **Returns**: Detected service type
    """
    # Simple heuristics to detect service type
# 1) PostgreSQL Vector Store (must be detected BEFORE generic username/password)
    if (
        # Connection string form (accept postgresql://, postgresql+asyncpg://, etc.)
        ("connection_string" in data and isinstance(data.get("connection_string"), str) and data.get("connection_string", "").lower().startswith("postgresql"))
        # Discrete fields form
        or (all(k in data for k in ["host", "port", "database", "username", "password"]))
    ):
        return "postgresql_vectorstore"

    if "api_key" in data:
        # Cohere API
        if data.get("provider") == "cohere" or data.get("cohere") is True:
            return "cohere"
        if "base_url" in data:
            return "openai_compatible"
        if "organization" in data or "project_id" in data:
            return "openai"
        elif "engine" in data or "model" in data:
            return "anthropic"
        elif "cse_id" in data or "search_engine_id" in data:
            return "google"
        else:
            return "generic_api"
    elif "access_token" in data:
        return "oauth"
    elif "username" in data and "password" in data:
        return "basic_auth"
    elif ("access_key" in data and "secret_key" in data) or "endpoint" in data:
        return "minio"
    elif "private_key" in data or "certificate" in data:
        return "certificate"
    else:
        return "custom"

# =====================================================================
# Google OAuth
#
# Paste this block at the end of backend/app/api/credentials.py.
#
# Two endpoints and one test handler. Nothing above is touched.
# =====================================================================

@router.get("/google/config")
async def google_oauth_config(
        current_user: User = Depends(get_current_user),
):
    """
    Report whether this installation can connect a Google account.

    The form asks before it draws the connect button, so someone whose server
    has no OAuth client set up is told what is missing rather than being sent
    to a page that will refuse them.
    """
    from app.core import google_oauth

    return {
        "configured": google_oauth.is_configured(),
        "redirect_uri": google_oauth.redirect_uri() if google_oauth.is_configured() else None,
        "message": (
            None
            if google_oauth.is_configured()
            else (
                "This server has no Google OAuth client. Set GOOGLE_CLIENT_ID and "
                "GOOGLE_CLIENT_SECRET and restart it."
            )
        ),
    }

@router.get("/{credential_id}/google/authorize")
async def start_google_authorization(
        credential_id: uuid.UUID,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session),
        credential_service: CredentialService = Depends(get_credential_service_dep),
):
    """
    Begin connecting a Google account to a credential.

    Returns the address the browser should be sent to. The credential has to
    exist first, since the tokens that come back need somewhere to be written
    and the state carries its id.
    """
    from app.core import google_oauth

    user_id = current_user.id

    credential = await credential_service.get_by_user_and_id(db, user_id, credential_id)
    if not credential:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Credential not found"
        )

    try:
        state = google_oauth.pack_state(str(credential_id), str(user_id))
        url = google_oauth.authorization_url(credential.service_type, state)
    except google_oauth.GoogleOAuthError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    logger.info(
        f"Starting Google authorisation for credential {credential_id} "
        f"({credential.service_type})"
    )
    return {"authorization_url": url}

@router.get("/google/callback")
async def finish_google_authorization(
        code: Optional[str] = None,
        state: Optional[str] = None,
        error: Optional[str] = None,
        db: AsyncSession = Depends(get_db_session),
        credential_service: CredentialService = Depends(get_credential_service_dep),
):
    """
    Receive the browser back from Google and store the tokens.

    Google calls this, not the person, so there is no session to authenticate
    against. The credential is found through the state, which was issued a
    moment earlier and expires within ten minutes.

    The response is a small page rather than JSON, because what opened this was
    a popup window and it has to close itself.
    """
    from fastapi.responses import HTMLResponse
    from app.core import google_oauth
    from app.core.encryption import encrypt_data
    import base64

    def page(title: str, detail: str, ok: bool) -> HTMLResponse:
        colour = "#16a34a" if ok else "#dc2626"
        return HTMLResponse(
            f"""<!doctype html>
<html><head><meta charset="utf-8"><title>{title}</title></head>
<body style="font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;
             display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
  <div style="text-align:center;max-width:420px;padding:32px">
    <div style="font-size:20px;font-weight:600;color:{colour};margin-bottom:12px">{title}</div>
    <div style="font-size:14px;line-height:1.6;color:#94a3b8">{detail}</div>
  </div>
  <script>
    // The opener is told how it went, then this window closes itself.
    if (window.opener) {{
      window.opener.postMessage(
        {{ source: "google-oauth", success: {str(ok).lower()} }}, "*"
      );
      setTimeout(function () {{ window.close(); }}, {1200 if ok else 6000});
    }}
  </script>
</body></html>"""
        )

    if error:
        logger.warning(f"Google authorisation was refused: {error}")
        return page(
            "Not connected",
            "The request was turned down at Google. You can close this window and try again.",
            False,
        )

    if not code or not state:
        return page(
            "Not connected",
            "Google's response was incomplete. Start the connection again.",
            False,
        )

    try:
        payload = google_oauth.unpack_state(state)
        credential_id = uuid.UUID(payload["credential_id"])
        user_id = uuid.UUID(payload["user_id"])

        credential = await credential_service.get_by_user_and_id(db, user_id, credential_id)
        if not credential:
            return page(
                "Not connected",
                "The credential this belonged to is no longer there.",
                False,
            )

        tokens = google_oauth.exchange_code(code)
        email = google_oauth.account_email(tokens["access_token"])

        try:
            existing = await credential_service.get_decrypted_credential(
                db, user_id, credential_id
            )
            # Only what can be written back as JSON is carried over. A record
            # read from the store may come with timestamps attached, and those
            # belong to the row rather than to the secret.
            secret = {
                key: value
                for key, value in (existing or {}).items()
                if isinstance(value, (str, int, float, bool, list, dict, type(None)))
            }
        except Exception:
            secret = {}

        secret.update(tokens)
        if email:
            secret["email"] = email

        encrypted = encrypt_data(secret)
        credential.encrypted_secret = base64.b64encode(encrypted).decode("utf-8")
        await db.commit()

        logger.info(
            f"Google account connected to credential {credential_id}"
            + (f" ({email})" if email else "")
        )

        return page(
            "Connected",
            f"{email or 'The account'} is now connected. This window will close on its own.",
            True,
        )

    except google_oauth.GoogleOAuthError as exc:
        logger.warning(f"Google authorisation failed: {exc}")
        return page("Not connected", str(exc), False)
    except Exception as exc:
        logger.error(f"Google authorisation failed: {exc}")
        return page(
            "Not connected",
            "Something went wrong while storing the connection. Try again.",
            False,
        )

@router.delete("/{credential_id}/google/disconnect")
async def disconnect_google_account(
        credential_id: uuid.UUID,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db_session),
        credential_service: CredentialService = Depends(get_credential_service_dep),
):
    """
    Drop the connection to a Google account.

    Google is told as well as the credential, so the grant disappears from the
    account owner's list of connected apps rather than lingering unused.
    """
    from app.core import google_oauth
    from app.core.encryption import encrypt_data
    import base64

    user_id = current_user.id

    credential = await credential_service.get_by_user_and_id(db, user_id, credential_id)
    if not credential:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Credential not found"
        )

    try:
        secret = await credential_service.get_decrypted_credential(db, user_id, credential_id)
    except Exception:
        secret = {}

    refresh_token = (secret or {}).get("refresh_token")
    if refresh_token:
        google_oauth.revoke(refresh_token)

    remaining = {
        key: value
        for key, value in (secret or {}).items()
        if key not in ("refresh_token", "access_token", "expires_at", "scope",
                       "token_type", "email")
    }

    encrypted = encrypt_data(remaining)
    credential.encrypted_secret = base64.b64encode(encrypted).decode("utf-8")
    await db.commit()

    logger.info(f"Google account disconnected from credential {credential_id}")
    return {"success": True, "message": "The Google account is no longer connected."}

async def _test_google(secret: Dict[str, Any]) -> CredentialTestResponse:
    """Ask Google who the credential belongs to."""
    from app.core import google_oauth

    if not (secret or {}).get("refresh_token"):
        return CredentialTestResponse(
            success=False,
            message="No Google account is connected yet. Use Connect to Google.",
        )

    try:
        token = google_oauth.access_token_for(secret)
        email = google_oauth.account_email(token)
        return CredentialTestResponse(
            success=True,
            message=(
                f"Connected as {email}." if email else "Connected to a Google account."
            ),
        )
    except google_oauth.GoogleOAuthError as exc:
        return CredentialTestResponse(success=False, message=str(exc))
    except Exception as exc:
        return CredentialTestResponse(success=False, message=f"Could not connect: {exc}")