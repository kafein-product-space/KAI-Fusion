"""
HTTP Request Node - Outbound REST API Integration
───────────────────────────────────────────────
• Purpose: Send HTTP requests to external services from workflows
• Integration: Full LangChain Runnable with comprehensive HTTP methods
• Features: JSON/form data, headers, authentication, timeout handling
• Monitoring: Request/response logging, performance metrics, error tracking
• Security: Header management, authentication tokens, SSL verification
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Union
from urllib.parse import urljoin, urlparse
import uuid

import httpx
from jinja2 import Template, Environment, select_autoescape
from pydantic import BaseModel, Field, ValidationError

from langchain_core.runnables import Runnable, RunnableLambda, RunnableConfig
from langchain_core.runnables.utils import Input, Output

from ..base import ProcessorNode, NodeInput, NodeOutput, NodeType
from app.models.node import NodeCategory

logger = logging.getLogger(__name__)

# HTTP methods supported
HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]

# Common content types
CONTENT_TYPES = {
    "json": "application/json",
    "form": "application/x-www-form-urlencoded", 
    "multipart": "multipart/form-data",
    "text": "text/plain",
    "xml": "application/xml",
}

# Authentication types
AUTH_TYPES = ["none", "bearer", "basic", "api_key"]

class HttpRequestConfig(BaseModel):
    """HTTP request configuration model."""
    method: str = Field(default="GET", description="HTTP method")
    url: str = Field(description="Target URL")
    headers: Dict[str, str] = Field(default_factory=dict, description="Request headers")
    params: Dict[str, Any] = Field(default_factory=dict, description="URL parameters")
    body: Optional[str] = Field(default=None, description="Request body")
    content_type: str = Field(default="json", description="Content type")
    auth_type: str = Field(default="none", description="Authentication type")
    auth_token: Optional[str] = Field(default=None, description="Authentication token")
    auth_username: Optional[str] = Field(default=None, description="Basic auth username")
    auth_password: Optional[str] = Field(default=None, description="Basic auth password")
    timeout: int = Field(default=30, description="Request timeout in seconds")
    follow_redirects: bool = Field(default=True, description="Follow HTTP redirects")
    verify_ssl: bool = Field(default=True, description="Verify SSL certificates")

class HttpResponse(BaseModel):
    """HTTP response model."""
    status_code: int
    headers: Dict[str, str]
    content: Union[Dict[str, Any], str, None]
    is_json: bool
    url: str
    method: str
    duration_ms: float
    request_id: str
    timestamp: str

class HttpRequestNode(ProcessorNode):
    """
    HTTP request node for making outbound API calls from workflows.
    """
    
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "HttpRequest",
            "display_name": "HTTP Request",
            "description": (
                "Send HTTP requests to external REST APIs. Supports all HTTP methods, "
                "authentication, templating, and comprehensive response handling."
            ),
            "category": NodeCategory.TOOLS,
            "node_type": NodeType.PROCESSOR,
            "icon": "arrow-up-circle",
            "color": "#0ea5e9",
            
            # HTTP request configuration
            "inputs": [
                # Basic request config
                NodeInput(
                    name="method",
                    type="select",
                    description="HTTP method to use",
                    choices=[
                        {"value": method, "label": method, "description": f"{method} request"}
                        for method in HTTP_METHODS
                    ],
                    default="GET",
                    required=True,
                ),
                NodeInput(
                    name="url",
                    type="text",
                    description="Target URL (supports Jinja2 templating)",
                    required=True,
                ),
                
                # Headers and parameters
                NodeInput(
                    name="headers",
                    type="json",
                    description="Request headers as JSON object",
                    default="{}",
                    required=False,
                ),
                NodeInput(
                    name="url_params",
                    type="json",
                    description="URL query parameters as JSON object",
                    default="{}",
                    required=False,
                ),
                
                # Request body
                NodeInput(
                    name="body",
                    type="textarea",
                    description="Request body (supports Jinja2 templating)",
                    required=False,
                ),
                NodeInput(
                    name="content_type",
                    type="select",
                    description="Content type for request body",
                    choices=[
                        {"value": k, "label": v, "description": f"Send as {v}"}
                        for k, v in CONTENT_TYPES.items()
                    ],
                    default="json",
                    required=False,
                ),
                
                # Authentication
                NodeInput(
                    name="auth_type",
                    type="select",
                    description="Authentication method",
                    choices=[
                        {"value": "none", "label": "No Authentication", "description": "No authentication"},
                        {"value": "bearer", "label": "Bearer Token", "description": "Authorization: Bearer <token>"},
                        {"value": "basic", "label": "Basic Auth", "description": "HTTP Basic Authentication"},
                        {"value": "api_key", "label": "API Key Header", "description": "Custom API key header"},
                    ],
                    default="none",
                    required=False,
                ),
                NodeInput(
                    name="auth_token",
                    type="password",
                    description="Authentication token or API key",
                    required=False,
                ),
                NodeInput(
                    name="auth_username",
                    type="text",
                    description="Username for basic authentication",
                    required=False,
                ),
                NodeInput(
                    name="auth_password",
                    type="password",
                    description="Password for basic authentication",
                    required=False,
                ),
                NodeInput(
                    name="api_key_header",
                    type="text",
                    description="Header name for API key (e.g., 'X-API-Key')",
                    default="X-API-Key",
                    required=False,
                ),
                
                # Advanced options
                NodeInput(
                    name="timeout",
                    type="slider",
                    description="Request timeout in seconds",
                    default=30,
                    min_value=1,
                    max_value=300,
                    step=1,
                    required=False,
                ),
                NodeInput(
                    name="max_retries",
                    type="number",
                    description="Maximum number of retry attempts",
                    default=3,
                    min_value=0,
                    max_value=10,
                    required=False,
                ),
                NodeInput(
                    name="retry_delay",
                    type="slider",
                    description="Delay between retries in seconds",
                    default=1.0,
                    min_value=0.1,
                    max_value=10.0,
                    step=0.1,
                    required=False,
                ),
                NodeInput(
                    name="follow_redirects",
                    type="boolean",
                    description="Follow HTTP redirects automatically",
                    default=True,
                    required=False,
                ),
                NodeInput(
                    name="verify_ssl",
                    type="boolean",
                    description="Verify SSL certificates",
                    default=True,
                    required=False,
                ),
                NodeInput(
                    name="enable_templating",
                    type="boolean",
                    description="Enable Jinja2 templating for URL and body",
                    default=True,
                    required=False,
                ),
                
                # Connected input for template context
                NodeInput(
                    name="template_context",
                    type="dict",
                    description="Context data for Jinja2 templating",
                    is_connection=True,
                    required=False,
                ),
            ],
            
            # HTTP response outputs
            "outputs": [
                NodeOutput(
                    name="response",
                    type="dict",
                    description="Complete HTTP response object",
                ),
                NodeOutput(
                    name="status_code",
                    type="number",
                    description="HTTP status code",
                ),
                NodeOutput(
                    name="content",
                    type="any",
                    description="Response content (JSON object or text)",
                ),
                NodeOutput(
                    name="headers",
                    type="dict",
                    description="Response headers",
                ),
                NodeOutput(
                    name="success",
                    type="boolean",
                    description="Whether request was successful (2xx status)",
                ),
                NodeOutput(
                    name="request_stats",
                    type="dict",
                    description="Request performance statistics",
                ),
            ],
        }
        
        # Jinja2 environment for templating
        self.jinja_env = Environment(
            autoescape=select_autoescape(['html', 'xml']),
            trim_blocks=True,
            lstrip_blocks=True,
        )
        
        logger.info("🌐 HTTP Request Node initialized")
    
    def _render_template(self, template_str: str, context: Dict[str, Any]) -> str:
        """Render Jinja2 template with provided context."""
        try:
            template = self.jinja_env.from_string(template_str)
            return template.render(**context)
        except Exception as e:
            logger.warning(f"Template rendering failed: {e}")
            return template_str  # Return original if templating fails
    
    def _prepare_headers(self, 
                        headers: Dict[str, str], 
                        content_type: str,
                        auth_type: str,
                        auth_token: Optional[str],
                        api_key_header: str) -> Dict[str, str]:
        """Prepare request headers with authentication and content type."""
        prepared_headers = headers.copy()
        
        # Set content type
        if content_type in CONTENT_TYPES:
            prepared_headers["Content-Type"] = CONTENT_TYPES[content_type]
        
        # Add authentication
        if auth_type == "bearer" and auth_token:
            prepared_headers["Authorization"] = f"Bearer {auth_token}"
        elif auth_type == "api_key" and auth_token:
            prepared_headers[api_key_header] = auth_token
        
        # Add user agent
        prepared_headers.setdefault("User-Agent", "KAI-Fusion-HttpRequest/1.0")
        
        return prepared_headers
    
    def _prepare_auth(self, auth_type: str, username: Optional[str], password: Optional[str]) -> Optional[httpx.Auth]:
        """Prepare authentication for httpx client."""
        if auth_type == "basic" and username and password:
            return httpx.BasicAuth(username, password)
        return None
    
    def _prepare_body(self, 
                     body: Optional[str], 
                     content_type: str,
                     context: Dict[str, Any],
                     enable_templating: bool) -> Optional[Union[str, bytes, Dict[str, Any]]]:
        """Prepare request body based on content type."""
        if not body:
            return None
        
        # Apply templating if enabled
        if enable_templating:
            body = self._render_template(body, context)
        
        # Process based on content type
        if content_type == "json":
            try:
                return json.loads(body)
            except json.JSONDecodeError as e:
                raise ValueError(f"Invalid JSON in request body: {e}")
        elif content_type == "form":
            # Parse form data
            try:
                form_data = json.loads(body)
                return form_data if isinstance(form_data, dict) else {}
            except json.JSONDecodeError:
                # Try to parse as query string format
                import urllib.parse
                return dict(urllib.parse.parse_qsl(body))
        else:
            return body
    
    async def _make_request(self, config: HttpRequestConfig, context: Dict[str, Any]) -> HttpResponse:
        """Make HTTP request with comprehensive error handling."""
        request_id = str(uuid.uuid4())
        start_time = time.time()
        
        # Apply templating to URL
        url = config.url
        if config.url and context:
            url = self._render_template(config.url, context)
        
        # Validate URL
        parsed_url = urlparse(url)
        if not parsed_url.scheme or not parsed_url.netloc:
            raise ValueError(f"Invalid URL: {url}")
        
        # Prepare request components
        headers = self._prepare_headers(
            config.headers,
            config.content_type,
            config.auth_type,
            config.auth_token,
            config.get("api_key_header", "X-API-Key")
        )
        
        auth = self._prepare_auth(config.auth_type, config.auth_username, config.auth_password)
        
        body = self._prepare_body(
            config.body,
            config.content_type,
            context,
            True  # enable_templating from config
        )
        
        # Configure httpx client
        client_config = {
            "timeout": httpx.Timeout(config.timeout),
            "follow_redirects": config.follow_redirects,
            "verify": config.verify_ssl,
        }
        
        if auth:
            client_config["auth"] = auth
        
        logger.info(f"🌐 Making {config.method} request to {url} [{request_id}]")
        
        try:
            async with httpx.AsyncClient(**client_config) as client:
                # Prepare request kwargs
                request_kwargs = {
                    "method": config.method,
                    "url": url,
                    "headers": headers,
                    "params": config.params,
                }
                
                # Add body for methods that support it
                if config.method in ["POST", "PUT", "PATCH"] and body is not None:
                    if config.content_type == "json":
                        request_kwargs["json"] = body
                    elif config.content_type == "form":
                        request_kwargs["data"] = body
                    else:
                        request_kwargs["content"] = body
                
                # Make request
                response = await client.request(**request_kwargs)
                
                # Process response
                duration_ms = (time.time() - start_time) * 1000
                
                # Try to parse JSON content
                content = None
                is_json = False
                content_type_header = response.headers.get("content-type", "").lower()
                
                if "application/json" in content_type_header:
                    try:
                        content = response.json()
                        is_json = True
                    except ValueError:
                        content = response.text
                else:
                    content = response.text
                
                return HttpResponse(
                    status_code=response.status_code,
                    headers=dict(response.headers),
                    content=content,
                    is_json=is_json,
                    url=str(response.url),
                    method=config.method,
                    duration_ms=duration_ms,
                    request_id=request_id,
                    timestamp=datetime.now(timezone.utc).isoformat()
                )
                
        except httpx.TimeoutException:
            raise ValueError(f"Request timeout after {config.timeout} seconds")
        except httpx.NetworkError as e:
            raise ValueError(f"Network error: {str(e)}")
        except Exception as e:
            raise ValueError(f"Request failed: {str(e)}")
    
    def execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute HTTP request with comprehensive error handling and retries.
        
        Args:
            inputs: User-provided configuration
            connected_nodes: Connected node outputs for templating
            
        Returns:
            Dict with response data and request statistics
        """
        logger.info("🚀 Executing HTTP Request")
        
        try:
            # Build configuration
            config = HttpRequestConfig(
                method=inputs.get("method", "GET").upper(),
                url=inputs.get("url", ""),
                headers=json.loads(inputs.get("headers", "{}")),
                params=json.loads(inputs.get("url_params", "{}")),
                body=inputs.get("body"),
                content_type=inputs.get("content_type", "json"),
                auth_type=inputs.get("auth_type", "none"),
                auth_token=inputs.get("auth_token"),
                auth_username=inputs.get("auth_username"),
                auth_password=inputs.get("auth_password"),
                timeout=int(inputs.get("timeout", 30)),
                follow_redirects=inputs.get("follow_redirects", True),
                verify_ssl=inputs.get("verify_ssl", True),
            )
            
            # Get template context from connected nodes
            template_context = connected_nodes.get("template_context", {})
            if not isinstance(template_context, dict):
                template_context = {}
            
            # Add current inputs to context
            template_context.update({
                "inputs": inputs,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "request_id": str(uuid.uuid4()),
            })
            
            # Retry logic
            max_retries = int(inputs.get("max_retries", 3))
            retry_delay = float(inputs.get("retry_delay", 1.0))
            last_error = None
            
            for attempt in range(max_retries + 1):
                try:
                    # Make request (run async function in sync context)
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    try:
                        response = loop.run_until_complete(
                            self._make_request(config, template_context)
                        )
                    finally:
                        loop.close()
                    
                    # Check if request was successful
                    success = 200 <= response.status_code < 300
                    
                    # Calculate request statistics
                    request_stats = {
                        "request_id": response.request_id,
                        "method": response.method,
                        "url": response.url,
                        "duration_ms": response.duration_ms,
                        "status_code": response.status_code,
                        "success": success,
                        "attempt": attempt + 1,
                        "max_retries": max_retries,
                        "timestamp": response.timestamp,
                    }
                    
                    logger.info(f"✅ HTTP request completed: {response.status_code} in {response.duration_ms:.1f}ms")
                    
                    return {
                        "response": response.dict(),
                        "status_code": response.status_code,
                        "content": response.content,
                        "headers": response.headers,
                        "success": success,
                        "request_stats": request_stats,
                    }
                    
                except Exception as e:
                    last_error = str(e)
                    
                    if attempt < max_retries:
                        logger.warning(f"⚠️ HTTP request failed (attempt {attempt + 1}/{max_retries + 1}): {last_error}")
                        time.sleep(retry_delay)
                    else:
                        logger.error(f"❌ HTTP request failed after {max_retries + 1} attempts: {last_error}")
            
            # All retries failed
            raise ValueError(f"HTTP request failed after {max_retries + 1} attempts: {last_error}")
            
        except Exception as e:
            error_msg = f"HTTP Request execution failed: {str(e)}"
            logger.error(error_msg)
            
            # Return error response
            return {
                "response": None,
                "status_code": 0,
                "content": None,
                "headers": {},
                "success": False,
                "request_stats": {
                    "error": error_msg,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
            }
    
    def as_runnable(self) -> Runnable:
        """
        Convert node to LangChain Runnable for direct composition.
        
        Returns:
            RunnableLambda that executes HTTP request
        """
        # Add LangSmith tracing if enabled
        config = None
        if os.getenv("LANGCHAIN_TRACING_V2"):
            config = RunnableConfig(
                run_name="HttpRequest",
                tags=["http", "api", "external"]
            )
        
        runnable = RunnableLambda(
            lambda params: self.execute(
                inputs=params.get("inputs", {}),
                connected_nodes=params.get("connected_nodes", {})
            ),
            name="HttpRequest"
        )
        
        if config:
            runnable = runnable.with_config(config)
        
        return runnable

# Export for use
__all__ = [
    "HttpRequestNode",
    "HttpRequestConfig",
    "HttpResponse",
]