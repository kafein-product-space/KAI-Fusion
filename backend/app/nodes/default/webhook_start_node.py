"""Webhook Start Node - External webhook trigger that initiates workflows."""

import uuid
from typing import Dict, Any, Optional
from datetime import datetime
from app.nodes.base import TerminatorNode, NodeInput, NodeOutput, NodeType
from app.core.state import FlowState


class WebhookStartNode(TerminatorNode):
    """
    Webhook start node that can be triggered by external HTTP requests.
    This node acts as a LangGraph __start__ node but with webhook capabilities.
    """

    def __init__(self):
        super().__init__()
        self.webhook_id = f"wh_{uuid.uuid4().hex[:8]}"
        self.webhook_token = f"token_{uuid.uuid4().hex[:16]}"
        
        self._metadata = {
            "name": "WebhookStartNode",
            "display_name": "Webhook Start",
            "description": f"Start workflow via webhook. Endpoint: /api/webhooks/{self.webhook_id}",
            "node_type": NodeType.TERMINATOR,
            "category": "Triggers",
            "inputs": [
                NodeInput(
                    name="webhook_payload",
                    type="object",
                    description="Incoming webhook payload data",
                    default={},
                    required=False
                ),
                NodeInput(
                    name="require_auth",
                    type="bool",
                    description="Require authentication token",
                    default=True,
                    required=False
                ),
                NodeInput(
                    name="allowed_origins",
                    type="string",
                    description="Comma-separated allowed origins for CORS",
                    default="*",
                    required=False
                )
            ],
            "outputs": [
                NodeOutput(
                    name="webhook_data",
                    type="object",
                    description="Processed webhook payload"
                ),
                NodeOutput(
                    name="webhook_info",
                    type="object",
                    description="Webhook metadata and endpoint information"
                )
            ],
            "color": "#3b82f6",  # Blue color for webhook
            "icon": "webhook"
        }

    def _execute(self, state: FlowState) -> Dict[str, Any]:
        """
        Execute the webhook start node.
        
        Args:
            state: Current workflow state
            
        Returns:
            Dict containing the webhook payload and metadata
        """
        # Get webhook payload from user data or state
        webhook_payload = self.user_data.get("webhook_payload", {})
        
        # Extract useful data from webhook
        webhook_data = {
            "payload": webhook_payload,
            "timestamp": datetime.now().isoformat(),
            "webhook_id": self.webhook_id,
            "source": webhook_payload.get("source", "external"),
            "event_type": webhook_payload.get("event_type", "webhook.received")
        }
        
        # Set initial input from webhook data
        if webhook_payload:
            # Use the main data or message from payload
            initial_input = webhook_payload.get("data", webhook_payload.get("message", "Webhook triggered"))
        else:
            initial_input = "Webhook workflow started"
        
        # Update state
        state.last_output = str(initial_input)
        
        # Add this node to executed nodes list
        if self.node_id and self.node_id not in state.executed_nodes:
            state.executed_nodes.append(self.node_id)
        
        print(f"[WebhookStartNode] Webhook {self.webhook_id} triggered with: {initial_input}")
        
        return {
            "webhook_data": webhook_data,
            "webhook_info": {
                "endpoint": f"/api/webhooks/{self.webhook_id}",
                "token": self.webhook_token,
                "method": "POST",
                "auth_required": self.user_data.get("require_auth", True)
            },
            "output": initial_input,
            "status": "webhook_triggered"
        }

    def get_webhook_endpoint(self) -> str:
        """Get the webhook endpoint URL."""
        return f"/api/webhooks/{self.webhook_id}"
    
    def get_webhook_token(self) -> str:
        """Get the webhook authentication token."""
        return self.webhook_token