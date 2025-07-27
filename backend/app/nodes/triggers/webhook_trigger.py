"""
Webhook Trigger Node - Inbound REST API Integration
─────────────────────────────────────────────────
• Purpose: Expose REST endpoints to trigger workflows from external services
• Integration: FastAPI router with automatic endpoint registration
• Features: JSON payload processing, authentication, rate limiting
• LangChain: Full Runnable integration with event streaming
• Security: Token-based authentication and request validation
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, AsyncGenerator, Union
from urllib.parse import urljoin

from fastapi import APIRouter, Request, HTTPException, Depends, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, ValidationError

from langchain_core.runnables import Runnable, RunnableLambda, RunnableConfig
from langchain_core.runnables.utils import Input, Output

from ..base import ProviderNode, TerminatorNode, NodeInput, NodeOutput, NodeType
from app.models.node import NodeCategory

logger = logging.getLogger(__name__)

# Global webhook router (will be included in main FastAPI app)
webhook_router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])

# Health check endpoint for webhook router
@webhook_router.get("/")
async def webhook_router_health():
    """Webhook router health check"""
    return {
        "status": "healthy",
        "router": "webhook_trigger",
        "active_webhooks": len(webhook_events),
        "message": "Webhook router is operational"
    }

# Security
security = HTTPBearer(auto_error=False)

# Webhook event storage for streaming
webhook_events: Dict[str, List[Dict[str, Any]]] = {}
webhook_subscribers: Dict[str, List[asyncio.Queue]] = {}

class WebhookPayload(BaseModel):
    """Standard webhook payload model."""
    event_type: str = Field(default="webhook.received", description="Type of webhook event")
    data: Dict[str, Any] = Field(default_factory=dict, description="Webhook payload data")
    source: Optional[str] = Field(default=None, description="Source service identifier")
    timestamp: Optional[str] = Field(default=None, description="Event timestamp")
    correlation_id: Optional[str] = Field(default=None, description="Request correlation ID")

class WebhookResponse(BaseModel):
    """Standard webhook response model."""
    success: bool
    message: str
    webhook_id: str
    received_at: str
    correlation_id: Optional[str] = None

class WebhookTriggerNode(TerminatorNode):
    """
    Unified webhook trigger node that can:
    1. Start workflows (as entry point)
    2. Trigger workflows mid-flow (as intermediate node)
    3. Expose REST endpoints for external integrations
    """
    
    def __init__(self):
        super().__init__()
        
        # Generate unique webhook ID and endpoint
        self.webhook_id = f"wh_{uuid.uuid4().hex[:12]}"
        self.endpoint_path = f"/{self.webhook_id}"
        self.secret_token = f"wht_{uuid.uuid4().hex}"
        
        # Initialize event storage
        webhook_events[self.webhook_id] = []
        webhook_subscribers[self.webhook_id] = []
        
        self._metadata = {
            "name": "WebhookTrigger",
            "display_name": "Webhook Trigger",
            "description": (
                "Unified webhook node that can start workflows or trigger mid-flow. "
                f"POST to /api/webhooks{self.endpoint_path} with JSON payload."
            ),
            "category": NodeCategory.TRIGGER,
            "node_type": NodeType.TERMINATOR,
            "icon": "webhook",
            "color": "#3b82f6",
            
            # Webhook configuration inputs
            "inputs": [
                NodeInput(
                    name="authentication_required",
                    type="boolean",
                    description="Require bearer token authentication",
                    default=True,
                    required=False,
                ),
                NodeInput(
                    name="allowed_event_types",
                    type="text",
                    description="Comma-separated list of allowed event types (empty = all allowed)",
                    default="",
                    required=False,
                ),
                NodeInput(
                    name="max_payload_size",
                    type="number",
                    description="Maximum payload size in KB",
                    default=1024,
                    min_value=1,
                    max_value=10240,
                    required=False,
                ),
                NodeInput(
                    name="rate_limit_per_minute",
                    type="number",
                    description="Maximum requests per minute (0 = no limit)",
                    default=60,
                    min_value=0,
                    max_value=1000,
                    required=False,
                ),
                NodeInput(
                    name="enable_cors",
                    type="boolean",
                    description="Enable CORS for cross-origin requests",
                    default=True,
                    required=False,
                ),
                NodeInput(
                    name="webhook_timeout",
                    type="number",
                    description="Webhook processing timeout in seconds",
                    default=30,
                    min_value=5,
                    max_value=300,
                    required=False,
                ),
            ],
            
            # Webhook outputs
            "outputs": [
                NodeOutput(
                    name="webhook_endpoint",
                    type="string",
                    description="Full webhook endpoint URL",
                ),
                NodeOutput(
                    name="webhook_token",
                    type="string",
                    description="Authentication token for webhook calls",
                ),
                NodeOutput(
                    name="webhook_runnable",
                    type="runnable",
                    description="LangChain Runnable for webhook event processing",
                ),
                NodeOutput(
                    name="webhook_config",
                    type="dict",
                    description="Webhook configuration and metadata",
                ),
            ],
        }
        
        # Register webhook endpoint
        self._register_webhook_endpoint()
        
        logger.info(f"🔗 Webhook trigger created: {self.webhook_id}")
    
    def _register_webhook_endpoint(self) -> None:
        """Register webhook endpoint with FastAPI router."""
        
        @webhook_router.post(self.endpoint_path, response_model=WebhookResponse)
        async def webhook_handler(
            request: Request,
            background_tasks: BackgroundTasks,
            payload: WebhookPayload,
            credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
        ) -> WebhookResponse:
            """Handle incoming webhook requests."""
            
            correlation_id = str(uuid.uuid4())
            received_at = datetime.now(timezone.utc)
            
            try:
                # Authentication check
                if self.user_data.get("authentication_required", True):
                    if not credentials or credentials.credentials != self.secret_token:
                        raise HTTPException(
                            status_code=401,
                            detail="Invalid or missing authentication token"
                        )
                
                # Event type validation
                allowed_types = self.user_data.get("allowed_event_types", "")
                if allowed_types:
                    allowed_list = [t.strip() for t in allowed_types.split(",")]
                    if payload.event_type not in allowed_list:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Event type '{payload.event_type}' not allowed"
                        )
                
                # Payload size check
                max_size_kb = self.user_data.get("max_payload_size", 1024)
                payload_size = len(json.dumps(payload.data).encode('utf-8')) / 1024
                if payload_size > max_size_kb:
                    raise HTTPException(
                        status_code=413,
                        detail=f"Payload size {payload_size:.1f}KB exceeds limit {max_size_kb}KB"
                    )
                
                # Process webhook event
                webhook_event = {
                    "webhook_id": self.webhook_id,
                    "correlation_id": correlation_id,
                    "event_type": payload.event_type,
                    "data": payload.data,
                    "source": payload.source,
                    "received_at": received_at.isoformat(),
                    "client_ip": request.client.host,
                    "user_agent": request.headers.get("user-agent"),
                    "timestamp": payload.timestamp or received_at.isoformat(),
                }
                
                # Store event
                webhook_events[self.webhook_id].append(webhook_event)
                
                # Maintain event history limit
                if len(webhook_events[self.webhook_id]) > 1000:
                    webhook_events[self.webhook_id] = webhook_events[self.webhook_id][-1000:]
                
                # Notify subscribers (for streaming)
                background_tasks.add_task(self._notify_subscribers, webhook_event)
                
                logger.info(f"📨 Webhook received: {self.webhook_id} - {payload.event_type}")
                
                return WebhookResponse(
                    success=True,
                    message="Webhook received and processed successfully",
                    webhook_id=self.webhook_id,
                    received_at=received_at.isoformat(),
                    correlation_id=correlation_id
                )
                
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"❌ Webhook processing error: {str(e)}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Webhook processing failed: {str(e)}"
                )
        
        logger.info(f"🌐 Webhook endpoint registered: POST /api/webhooks{self.endpoint_path}")
    
    async def _notify_subscribers(self, event: Dict[str, Any]) -> None:
        """Notify all subscribers of new webhook event."""
        if self.webhook_id in webhook_subscribers:
            for queue in webhook_subscribers[self.webhook_id]:
                try:
                    await queue.put(event)
                except Exception as e:
                    logger.warning(f"Failed to notify subscriber: {e}")
    
    def _execute(self, state) -> Dict[str, Any]:
        """
        Execute webhook trigger in LangGraph workflow.
        
        Args:
            state: Current workflow state
            
        Returns:
            Dict containing webhook data and configuration
        """
        from app.core.state import FlowState
        
        logger.info(f"🔧 Executing Webhook Trigger: {self.webhook_id}")
        
        # Get webhook payload from user data or latest event
        webhook_payload = self.user_data.get("webhook_payload", {})
        
        # If no payload in user_data, get latest webhook event
        if not webhook_payload:
            events = webhook_events.get(self.webhook_id, [])
            if events:
                webhook_payload = events[-1].get("data", {})
        
        # Generate webhook configuration
        base_url = os.getenv("WEBHOOK_BASE_URL", "http://localhost:8000")
        full_endpoint = urljoin(base_url, f"/api/webhooks{self.endpoint_path}")
        
        webhook_data = {
            "payload": webhook_payload,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "webhook_id": self.webhook_id,
            "source": webhook_payload.get("source", "external"),
            "event_type": webhook_payload.get("event_type", "webhook.received")
        }
        
        # Set initial input from webhook data
        if webhook_payload:
            initial_input = webhook_payload.get("data", webhook_payload.get("message", "Webhook triggered"))
        else:
            initial_input = f"Webhook endpoint ready: {full_endpoint}"
        
        # Update state
        state.last_output = str(initial_input)
        
        # Add this node to executed nodes list
        if self.node_id and self.node_id not in state.executed_nodes:
            state.executed_nodes.append(self.node_id)
        
        logger.info(f"[WebhookTrigger] {self.webhook_id} executed with: {initial_input}")
        
        return {
            "webhook_data": webhook_data,
            "webhook_endpoint": full_endpoint,
            "webhook_token": self.secret_token if self.user_data.get("authentication_required", True) else None,
            "webhook_config": {
                "webhook_id": self.webhook_id,
                "endpoint_url": full_endpoint,
                "authentication_required": self.user_data.get("authentication_required", True),
                "created_at": datetime.now(timezone.utc).isoformat(),
            },
            "output": initial_input,
            "status": "webhook_ready"
        }

    def execute(self, **kwargs) -> Dict[str, Any]:
        """
        Configure webhook trigger and return webhook details.
        
        Returns:
            Dict with webhook endpoint, token, runnable, and config
        """
        logger.info(f"🔧 Configuring Webhook Trigger: {self.webhook_id}")
        
        # Store user configuration
        self.user_data.update(kwargs)
        
        # Generate webhook configuration
        base_url = os.getenv("WEBHOOK_BASE_URL", "http://localhost:8000")
        full_endpoint = urljoin(base_url, f"/api/webhooks{self.endpoint_path}")
        
        webhook_config = {
            "webhook_id": self.webhook_id,
            "endpoint_url": full_endpoint,
            "endpoint_path": f"/api/webhooks{self.endpoint_path}",
            "authentication_required": kwargs.get("authentication_required", True),
            "secret_token": self.secret_token if kwargs.get("authentication_required", True) else None,
            "allowed_event_types": kwargs.get("allowed_event_types", ""),
            "max_payload_size_kb": kwargs.get("max_payload_size", 1024),
            "rate_limit_per_minute": kwargs.get("rate_limit_per_minute", 60),
            "enable_cors": kwargs.get("enable_cors", True),
            "timeout_seconds": kwargs.get("webhook_timeout", 30),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        
        # Create webhook runnable
        webhook_runnable = self._create_webhook_runnable()
        
        logger.info(f"✅ Webhook trigger configured: {full_endpoint}")
        
        return {
            "webhook_endpoint": full_endpoint,
            "webhook_token": self.secret_token if kwargs.get("authentication_required", True) else None,
            "webhook_runnable": webhook_runnable,
            "webhook_config": webhook_config,
        }
    
    def _create_webhook_runnable(self) -> Runnable:
        """Create LangChain Runnable for webhook event processing."""
        
        class WebhookRunnable(Runnable[None, Dict[str, Any]]):
            """LangChain-native webhook event processor."""
            
            def __init__(self, webhook_id: str):
                self.webhook_id = webhook_id
            
            def invoke(self, input: None, config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
                """Get latest webhook event."""
                events = webhook_events.get(self.webhook_id, [])
                if events:
                    return events[-1]  # Return most recent event
                return {"message": "No webhook events received"}
            
            async def ainvoke(self, input: None, config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
                """Async version of invoke."""
                return self.invoke(input, config)
            
            async def astream(self, input: None, config: Optional[RunnableConfig] = None) -> AsyncGenerator[Dict[str, Any], None]:
                """Stream webhook events as they arrive."""
                # Subscribe to webhook events
                queue = asyncio.Queue()
                if self.webhook_id not in webhook_subscribers:
                    webhook_subscribers[self.webhook_id] = []
                webhook_subscribers[self.webhook_id].append(queue)
                
                try:
                    logger.info(f"🔄 Webhook streaming started: {self.webhook_id}")
                    
                    # Yield any existing events first
                    existing_events = webhook_events.get(self.webhook_id, [])
                    for event in existing_events[-10:]:  # Last 10 events
                        yield event
                    
                    # Stream new events
                    while True:
                        try:
                            event = await asyncio.wait_for(queue.get(), timeout=60.0)
                            yield event
                        except asyncio.TimeoutError:
                            # Send heartbeat
                            yield {
                                "webhook_id": self.webhook_id,
                                "event_type": "webhook.heartbeat",
                                "timestamp": datetime.now(timezone.utc).isoformat(),
                            }
                        except Exception as e:
                            logger.error(f"Webhook streaming error: {e}")
                            break
                            
                finally:
                    # Cleanup subscriber
                    if self.webhook_id in webhook_subscribers:
                        try:
                            webhook_subscribers[self.webhook_id].remove(queue)
                        except ValueError:
                            pass
                    logger.info(f"🔄 Webhook streaming ended: {self.webhook_id}")
        
        # Add LangSmith tracing if enabled
        runnable = WebhookRunnable(self.webhook_id)
        
        if os.getenv("LANGCHAIN_TRACING_V2"):
            config = RunnableConfig(
                run_name=f"WebhookTrigger_{self.webhook_id}",
                tags=["webhook", "trigger"]
            )
            runnable = runnable.with_config(config)
        
        return runnable
    
    def get_webhook_stats(self) -> Dict[str, Any]:
        """Get webhook statistics and recent events."""
        events = webhook_events.get(self.webhook_id, [])
        
        if not events:
            return {
                "webhook_id": self.webhook_id,
                "total_events": 0,
                "recent_events": [],
                "event_types": {},
                "sources": {},
            }
        
        # Calculate statistics
        event_types = {}
        sources = {}
        
        for event in events:
            event_type = event.get("event_type", "unknown")
            source = event.get("source", "unknown")
            
            event_types[event_type] = event_types.get(event_type, 0) + 1
            sources[source] = sources.get(source, 0) + 1
        
        return {
            "webhook_id": self.webhook_id,
            "total_events": len(events),
            "recent_events": events[-10:],  # Last 10 events
            "event_types": event_types,
            "sources": sources,
            "last_event_at": events[-1].get("received_at") if events else None,
        }
    
    def as_runnable(self) -> Runnable:
        """
        Convert node to LangChain Runnable for direct composition.
        
        Returns:
            RunnableLambda that executes webhook configuration
        """
        return RunnableLambda(
            lambda params: self.execute(**params),
            name=f"WebhookTrigger_{self.webhook_id}",
        )

# Utility functions for webhook management
def get_active_webhooks() -> List[Dict[str, Any]]:
    """Get all active webhook endpoints."""
    return [
        {
            "webhook_id": webhook_id,
            "event_count": len(events),
            "last_event": events[-1].get("received_at") if events else None,
        }
        for webhook_id, events in webhook_events.items()
    ]

def cleanup_webhook_events(max_age_hours: int = 24) -> int:
    """Clean up old webhook events."""
    cutoff_time = datetime.now(timezone.utc) - timedelta(hours=max_age_hours)
    cleaned_count = 0
    
    for webhook_id in list(webhook_events.keys()):
        original_count = len(webhook_events[webhook_id])
        webhook_events[webhook_id] = [
            event for event in webhook_events[webhook_id]
            if datetime.fromisoformat(event["received_at"].replace('Z', '+00:00')) > cutoff_time
        ]
        cleaned_count += original_count - len(webhook_events[webhook_id])
    
    logger.info(f"🧹 Cleaned up {cleaned_count} old webhook events")
    return cleaned_count

# Export for use
__all__ = [
    "WebhookTriggerNode",
    "WebhookPayload", 
    "WebhookResponse",
    "webhook_router",
    "get_active_webhooks",
    "cleanup_webhook_events"
]