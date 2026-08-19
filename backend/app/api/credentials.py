"""User Credentials API endpoints"""

import ast
import asyncio
import logging
import re
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


class CredentialModelOption(BaseModel):
    id: str
    owned_by: Optional[str] = None


class CredentialModelsResponse(BaseModel):
    models: List[CredentialModelOption]
    source: str  # "provider" | "empty"
    message: Optional[str] = None


def _build_openai_client(
    secret: Dict[str, Any],
    *,
    compatible: bool = False,
    timeout: float = 15,
):
    from openai import AsyncOpenAI

    api_key = secret.get("api_key", "")
    if not api_key:
        api_key = "dummy_for_local"

    request_timeout = httpx.Timeout(timeout, connect=min(timeout, 5.0))
    client_kwargs: Dict[str, Any] = {"api_key": api_key, "timeout": request_timeout}

    if compatible:
        base_url = secret.get("base_url", "")
        if base_url:
            client_kwargs["base_url"] = base_url

        skip_ssl = secret.get("skip_ssl_verify", False)
        if isinstance(skip_ssl, str):
            skip_ssl = skip_ssl.lower() in ("true", "1", "yes", "on")
        if skip_ssl:
            client_kwargs["http_client"] = httpx.AsyncClient(
                verify=False,
                timeout=request_timeout,
            )

    return AsyncOpenAI(**client_kwargs)


_NON_CHAT_MODEL_HINTS = ("embed", "embedding", "rerank")


def _is_chat_model(model_id: str) -> bool:
    lowered = model_id.lower()
    return not any(hint in lowered for hint in _NON_CHAT_MODEL_HINTS)


def _model_size_score(model_id: str) -> float:
    match = re.search(r"(\d+(?:\.\d+)?)\s*([mb])\b", model_id.lower())
    if not match:
        return 10**9
    size = float(match.group(1))
    return size * (1 if match.group(2) == "b" else 0.001)


def _pick_chat_model(model_ids: List[str]) -> Optional[str]:
    chat_models = [model_id for model_id in model_ids if _is_chat_model(model_id)]
    candidates = chat_models or model_ids
    if not candidates:
        return None
    return min(candidates, key=lambda model_id: (_model_size_score(model_id), model_id.lower()))


def _is_license_restriction(error: Exception) -> bool:
    if _extract_allowed_models(error):
        return True
    text = str(error).lower()
    return "model not allowed" in text or "allowed_models" in text


def _extract_allowed_models(error: Exception) -> List[str]:
    """Read allowed_models from a provider 403 body or error string."""
    body = getattr(error, "body", None)
    if isinstance(body, dict):
        models = body.get("allowed_models")
        if isinstance(models, list):
            return [str(model_id) for model_id in models if model_id]

    match = re.search(r"allowed_models['\"]?\s*[:=]\s*(\[[^\]]*\])", str(error))
    if not match:
        return []
    try:
        parsed = ast.literal_eval(match.group(1))
    except (ValueError, SyntaxError):
        return []
    if isinstance(parsed, list):
        return [str(model_id) for model_id in parsed if model_id]
    return []


async def _list_models_from_provider(
    secret: Dict[str, Any],
    *,
    compatible: bool = False,
) -> List[CredentialModelOption]:
    client = _build_openai_client(secret, compatible=compatible)
    response = await asyncio.wait_for(client.models.list(), timeout=15)
    seen: set[str] = set()
    models: List[CredentialModelOption] = []
    for item in getattr(response, "data", []) or []:
        model_id = getattr(item, "id", None)
        if not model_id or model_id in seen:
            continue
        seen.add(model_id)
        models.append(
            CredentialModelOption(
                id=model_id,
                owned_by=getattr(item, "owned_by", None),
            )
        )
    models.sort(key=lambda m: m.id.lower())
    return models


async def _list_models_response(
    service_type: str,
    secret: Dict[str, Any],
) -> CredentialModelsResponse:
    """Query a provider's /models API. Never return a hardcoded model catalog."""
    if service_type not in ("openai", "openai_compatible"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Model listing is not supported for service type: {service_type}",
        )

    if service_type == "openai" and not str(secret.get("api_key") or "").strip():
        return CredentialModelsResponse(
            models=[],
            source="empty",
            message="Enter your API key to load available models.",
        )

    if service_type == "openai_compatible" and not str(secret.get("base_url") or "").strip():
        return CredentialModelsResponse(
            models=[],
            source="empty",
            message="Enter a Base URL to load available models.",
        )

    try:
        models = await _list_models_from_provider(
            secret,
            compatible=(service_type == "openai_compatible"),
        )
        if models:
            return CredentialModelsResponse(models=models, source="provider")
        return CredentialModelsResponse(
            models=[],
            source="empty",
            message="Provider returned no models. You can type a model name manually.",
        )
    except asyncio.TimeoutError:
        return CredentialModelsResponse(
            models=[],
            source="empty",
            message="Connection timed out. You can type a model name manually.",
        )
    except Exception as e:
        allowed = _extract_allowed_models(e)
        if allowed:
            return CredentialModelsResponse(
                models=[CredentialModelOption(id=model_id) for model_id in allowed],
                source="provider",
            )
        logger.warning(f"Failed to list models for service type {service_type}: {e}")
        return CredentialModelsResponse(
            models=[],
            source="empty",
            message=f"Could not fetch models from provider ({e}). You can type a model name manually.",
        )


@router.post("/list-models", response_model=CredentialModelsResponse)
async def list_models_raw(
    request: CredentialTestRawRequest,
    current_user: User = Depends(get_current_user),
):
    """List models from unsaved credential form data (base URL / API key)."""
    return await _list_models_response(request.service_type, request.data or {})


@router.get("/{credential_id}/models", response_model=CredentialModelsResponse)
async def list_credential_models(
    credential_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    credential_service: CredentialService = Depends(get_credential_service_dep),
):
    """
    List available LLM models for a credential by querying the provider's /models API.
    """
    user_id = current_user.id
    decrypted = await credential_service.get_decrypted_credential(db, user_id, credential_id)
    if not decrypted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Credential not found")

    return await _list_models_response(
        decrypted.get("service_type", ""),
        decrypted.get("secret", {}) or {},
    )


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
        if not str(secret.get("base_url") or "").strip():
            return CredentialTestResponse(success=False, message="Base URL is required.")

        skip_ssl = secret.get("skip_ssl_verify", False)
        if isinstance(skip_ssl, str):
            skip_ssl = skip_ssl.lower() in ("true", "1", "yes", "on")
        skip_ssl = bool(skip_ssl)
        if skip_ssl:
            logger.info("SSL verification disabled for test connection.")

        client = _build_openai_client(secret, compatible=True, timeout=8)
        selected_model = str(secret.get("model_name") or "").strip()

        def _success(model: Optional[str] = None) -> CredentialTestResponse:
            if model:
                msg = f"Connected to OpenAI Compatible provider successfully using {model}."
            else:
                msg = "Connected to OpenAI Compatible provider successfully."
            if skip_ssl:
                msg += " (SSL verification was skipped)"
            return CredentialTestResponse(success=True, message=msg)

        try:
            response = await asyncio.wait_for(client.models.list(), timeout=8)
            listed_ids = [
                str(getattr(item, "id", "")).strip()
                for item in (getattr(response, "data", None) or [])
                if getattr(item, "id", None)
            ]
            return _success(selected_model or _pick_chat_model(listed_ids))
        except asyncio.TimeoutError:
            return CredentialTestResponse(success=False, message="Connection timed out.")
        except Exception as list_error:
            if isinstance(list_error, httpx.TimeoutException) or "timed out" in str(list_error).lower():
                return CredentialTestResponse(success=False, message="Connection timed out.")
            allowed = _extract_allowed_models(list_error)
            if allowed or _is_license_restriction(list_error):
                return _success(selected_model or _pick_chat_model(allowed))
            return CredentialTestResponse(success=False, message=str(list_error))
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