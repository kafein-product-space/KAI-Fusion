"""
Webhook Integration Examples and Usage Patterns
─────────────────────────────────────────────
• Purpose: Demonstrate common webhook and HTTP request patterns
• Examples: E-commerce, ChatOps, Data Processing, Monitoring
• Integration: Complete workflow examples with real-world scenarios
• Best Practices: Security, error handling, monitoring
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Any, List

from langchain_core.runnables import RunnableLambda, RunnablePassthrough
from langchain_core.runnables.config import RunnableConfig

logger = logging.getLogger(__name__)

class WebhookWorkflowExamples:
    """
    Collection of real-world webhook and HTTP request workflow examples.
    """
    
    def __init__(self):
        self.examples = {}
        logger.info("📚 Webhook Workflow Examples initialized")
    
    def create_ecommerce_order_processor(self) -> Dict[str, Any]:
        """
        E-commerce order processing workflow.
        
        Flow: External Store → Webhook → Inventory Check → Payment Process → Fulfillment
        """
        
        # Example webhook payload for order
        example_order_payload = {
            "event_type": "order.created",
            "data": {
                "order_id": "ORD-2025-001234",
                "customer_id": "CUST-567890",
                "items": [
                    {"product_id": "PROD-123", "quantity": 2, "price": 29.99},
                    {"product_id": "PROD-456", "quantity": 1, "price": 15.50}
                ],
                "total_amount": 75.48,
                "currency": "USD",
                "shipping_address": {
                    "name": "John Doe",
                    "address": "123 Main St",
                    "city": "New York",
                    "zip": "10001"
                },
                "created_at": "2025-01-25T10:30:00Z"
            },
            "source": "shopify_store"
        }
        
        # Workflow configuration
        workflow_config = {
            # Webhook trigger setup
            "webhook": {
                "authentication_required": True,
                "allowed_event_types": "order.created,order.updated,order.cancelled",
                "max_payload_size": 2048,
                "rate_limit_per_minute": 100,
            },
            
            # Inventory check HTTP request
            "inventory_check": {
                "method": "POST",
                "url": "https://inventory-api.company.com/check",
                "auth_type": "bearer",
                "auth_token": "{{ env.INVENTORY_API_TOKEN }}",
                "content_type": "json",
                "body": json.dumps({
                    "order_id": "{{ data.order_id }}",
                    "items": "{{ data.items }}"
                }),
                "timeout": 30,
            },
            
            # Payment processing HTTP request
            "payment_process": {
                "method": "POST",
                "url": "https://payments.stripe.com/v1/payment_intents",
                "auth_type": "bearer",
                "auth_token": "{{ env.STRIPE_SECRET_KEY }}",
                "content_type": "json",
                "body": json.dumps({
                    "amount": "{{ data.total_amount | multiply(100) | int }}",  # Convert to cents
                    "currency": "{{ data.currency | lower }}",
                    "customer": "{{ data.customer_id }}",
                    "metadata": {
                        "order_id": "{{ data.order_id }}"
                    }
                }),
                "timeout": 45,
            },
            
            # Fulfillment notification HTTP request
            "fulfillment_notify": {
                "method": "POST",
                "url": "https://fulfillment.warehouse.com/api/orders",
                "auth_type": "api_key",
                "auth_token": "{{ env.WAREHOUSE_API_KEY }}",
                "api_key_header": "X-Warehouse-Key",
                "content_type": "json",
                "body": json.dumps({
                    "order_id": "{{ data.order_id }}",
                    "items": "{{ data.items }}",
                    "shipping_address": "{{ data.shipping_address }}",
                    "priority": "standard",
                    "requested_ship_date": "{{ now() | add_days(1) }}"
                }),
                "timeout": 30,
            }
        }
        
        return {
            "example_name": "E-commerce Order Processing",
            "description": "Complete order processing from webhook to fulfillment",
            "webhook_payload": example_order_payload,
            "workflow_config": workflow_config,
            "integration_points": [
                "Shopify/WooCommerce webhook",
                "Inventory management system",
                "Stripe payment processing",
                "Warehouse fulfillment system"
            ]
        }
    
    def create_chatops_deployment_workflow(self) -> Dict[str, Any]:
        """
        ChatOps deployment workflow triggered by Slack.
        
        Flow: Slack Command → Webhook → GitHub API → CI/CD → Notification
        """
        
        # Example Slack webhook payload
        example_slack_payload = {
            "event_type": "slash_command.deploy",
            "data": {
                "command": "/deploy",
                "text": "production api-service v1.2.3",
                "user_id": "U1234567890",
                "user_name": "jane.doe",
                "channel_id": "C1234567890",
                "channel_name": "deployments",
                "team_id": "T1234567890",
                "response_url": "https://hooks.slack.com/commands/1234/5678/abcd",
                "trigger_id": "13345224609.738474920.8088930838d88f008e0"
            },
            "source": "slack_workspace"
        }
        
        # Workflow configuration
        workflow_config = {
            # Webhook trigger setup
            "webhook": {
                "authentication_required": True,
                "allowed_event_types": "slash_command.deploy,button.approve_deploy",
                "max_payload_size": 1024,
                "rate_limit_per_minute": 50,
            },
            
            # GitHub deployment API call
            "github_deploy": {
                "method": "POST",
                "url": "https://api.github.com/repos/company/api-service/deployments",
                "auth_type": "bearer",
                "auth_token": "{{ env.GITHUB_TOKEN }}",
                "content_type": "json",
                "body": json.dumps({
                    "ref": "{{ data.text.split()[2] }}",  # Extract version
                    "environment": "{{ data.text.split()[0] }}",  # Extract environment
                    "description": "Deployment triggered by {{ data.user_name }} via Slack",
                    "auto_merge": False,
                    "required_contexts": []
                }),
                "timeout": 30,
            },
            
            # CI/CD trigger
            "cicd_trigger": {
                "method": "POST", 
                "url": "https://ci.company.com/api/v1/trigger",
                "auth_type": "api_key",
                "auth_token": "{{ env.CICD_API_KEY }}",
                "api_key_header": "X-API-Key",
                "content_type": "json",
                "body": json.dumps({
                    "project": "api-service",
                    "environment": "{{ data.text.split()[0] }}",
                    "version": "{{ data.text.split()[2] }}",
                    "triggered_by": "{{ data.user_name }}",
                    "slack_channel": "{{ data.channel_name }}"
                }),
                "timeout": 60,
            },
            
            # Slack response
            "slack_response": {
                "method": "POST",
                "url": "{{ data.response_url }}",
                "content_type": "json",
                "body": json.dumps({
                    "response_type": "in_channel",
                    "text": "🚀 Deployment initiated!",
                    "attachments": [{
                        "color": "good",
                        "fields": [
                            {"title": "Environment", "value": "{{ data.text.split()[0] }}", "short": True},
                            {"title": "Service", "value": "{{ data.text.split()[1] }}", "short": True},
                            {"title": "Version", "value": "{{ data.text.split()[2] }}", "short": True},
                            {"title": "Triggered by", "value": "{{ data.user_name }}", "short": True}
                        ]
                    }]
                }),
                "timeout": 10,
            }
        }
        
        return {
            "example_name": "ChatOps Deployment Workflow",
            "description": "Slack-triggered deployment with GitHub and CI/CD integration",
            "webhook_payload": example_slack_payload,
            "workflow_config": workflow_config,
            "integration_points": [
                "Slack slash commands",
                "GitHub Deployments API",
                "CI/CD pipeline trigger",
                "Slack notifications"
            ]
        }
    
    def create_data_pipeline_processor(self) -> Dict[str, Any]:
        """
        Data processing pipeline triggered by external data sources.
        
        Flow: Data Source → Webhook → Data Validation → Processing → Storage → Notification
        """
        
        # Example data ingestion webhook
        example_data_payload = {
            "event_type": "data.batch_ready",
            "data": {
                "batch_id": "BATCH-20250125-001",
                "source_system": "customer_analytics",
                "data_type": "user_events",
                "file_count": 12,
                "total_records": 150000,
                "data_urls": [
                    "s3://data-lake/events/2025/01/25/batch_001_part_001.json",
                    "s3://data-lake/events/2025/01/25/batch_001_part_002.json"
                ],
                "schema_version": "v2.1",
                "created_at": "2025-01-25T02:00:00Z",
                "expires_at": "2025-01-27T02:00:00Z"
            },
            "source": "data_ingestion_service"
        }
        
        # Workflow configuration
        workflow_config = {
            # Webhook trigger setup
            "webhook": {
                "authentication_required": True,
                "allowed_event_types": "data.batch_ready,data.processing_complete,data.error",
                "max_payload_size": 4096,
                "rate_limit_per_minute": 200,
            },
            
            # Data validation check
            "data_validation": {
                "method": "POST",
                "url": "https://data-validator.company.com/api/validate",
                "auth_type": "bearer",
                "auth_token": "{{ env.DATA_VALIDATOR_TOKEN }}",
                "content_type": "json",
                "body": json.dumps({
                    "batch_id": "{{ data.batch_id }}",
                    "schema_version": "{{ data.schema_version }}",
                    "data_urls": "{{ data.data_urls }}",
                    "validation_rules": ["schema_check", "data_quality", "duplicate_check"]
                }),
                "timeout": 120,
            },
            
            # Trigger data processing
            "start_processing": {
                "method": "POST",
                "url": "https://data-processor.company.com/api/jobs",
                "auth_type": "bearer",
                "auth_token": "{{ env.PROCESSOR_API_TOKEN }}",
                "content_type": "json",
                "body": json.dumps({
                    "job_type": "batch_processing",
                    "batch_id": "{{ data.batch_id }}",
                    "source_system": "{{ data.source_system }}",
                    "input_data": "{{ data.data_urls }}",
                    "processing_config": {
                        "parallel_workers": 8,
                        "memory_limit": "16GB",
                        "output_format": "parquet"
                    },
                    "notifications": {
                        "webhook_url": "{{ webhook_endpoint }}/processing-complete",
                        "slack_channel": "#data-ops"
                    }
                }),
                "timeout": 60,
            },
            
            # Update data catalog
            "update_catalog": {
                "method": "PUT",
                "url": "https://catalog.company.com/api/datasets/{{ data.source_system }}",
                "auth_type": "bearer",
                "auth_token": "{{ env.CATALOG_API_TOKEN }}",
                "content_type": "json",
                "body": json.dumps({
                    "batch_id": "{{ data.batch_id }}",
                    "status": "processing",
                    "record_count": "{{ data.total_records }}",
                    "last_updated": "{{ now() }}",
                    "processing_started_at": "{{ now() }}",
                    "metadata": {
                        "schema_version": "{{ data.schema_version }}",
                        "source_files": "{{ data.file_count }}"
                    }
                }),
                "timeout": 30,
            }
        }
        
        return {
            "example_name": "Data Pipeline Processing",
            "description": "Automated data processing pipeline with validation and cataloging",
            "webhook_payload": example_data_payload,
            "workflow_config": workflow_config,
            "integration_points": [
                "Data ingestion service",
                "Data validation service",
                "Processing engine",
                "Data catalog",
                "Monitoring alerts"
            ]
        }
    
    def create_monitoring_alert_workflow(self) -> Dict[str, Any]:
        """
        Monitoring and alerting workflow for infrastructure incidents.
        
        Flow: Monitoring Alert → Webhook → Incident Creation → Team Notification → Escalation
        """
        
        # Example monitoring alert webhook
        example_alert_payload = {
            "event_type": "alert.critical",
            "data": {
                "alert_id": "ALERT-20250125-CRIT-001",
                "alert_name": "High CPU Usage - Production API",
                "severity": "critical",
                "status": "firing",
                "started_at": "2025-01-25T14:30:00Z",
                "description": "CPU usage has exceeded 90% for 5 consecutive minutes",
                "affected_services": ["api-gateway", "user-service", "payment-service"],
                "metrics": {
                    "cpu_usage_percent": 94.5,
                    "memory_usage_percent": 78.2,
                    "response_time_ms": 2850,
                    "error_rate_percent": 12.3
                },
                "tags": {
                    "environment": "production",
                    "cluster": "us-east-1",
                    "namespace": "api"
                },
                "runbook_url": "https://runbooks.company.com/high-cpu-api",
                "dashboard_url": "https://grafana.company.com/d/api-dashboard"
            },
            "source": "prometheus_alertmanager"
        }
        
        # Workflow configuration
        workflow_config = {
            # Webhook trigger setup
            "webhook": {
                "authentication_required": True,
                "allowed_event_types": "alert.critical,alert.warning,alert.resolved",
                "max_payload_size": 2048,
                "rate_limit_per_minute": 500,  # High limit for monitoring
            },
            
            # Create incident in PagerDuty
            "create_incident": {
                "method": "POST",
                "url": "https://events.pagerduty.com/v2/enqueue",
                "content_type": "json",
                "body": json.dumps({
                    "routing_key": "{{ env.PAGERDUTY_ROUTING_KEY }}",
                    "event_action": "trigger",
                    "dedup_key": "{{ data.alert_id }}",
                    "payload": {
                        "summary": "{{ data.alert_name }}",
                        "severity": "{{ data.severity }}",
                        "source": "{{ data.tags.environment }}",
                        "component": "{{ data.affected_services[0] }}",
                        "group": "{{ data.tags.cluster }}",
                        "class": "infrastructure",
                        "custom_details": {
                            "description": "{{ data.description }}",
                            "metrics": "{{ data.metrics }}",
                            "runbook": "{{ data.runbook_url }}",
                            "dashboard": "{{ data.dashboard_url }}"
                        }
                    }
                }),
                "timeout": 30,
            },
            
            # Slack emergency notification
            "slack_alert": {
                "method": "POST",
                "url": "{{ env.SLACK_EMERGENCY_WEBHOOK }}",
                "content_type": "json",
                "body": json.dumps({
                    "channel": "#incidents",
                    "username": "AlertBot",
                    "icon_emoji": ":rotating_light:",
                    "attachments": [{
                        "color": "danger",
                        "title": "🚨 CRITICAL ALERT: {{ data.alert_name }}",
                        "title_link": "{{ data.dashboard_url }}",
                        "text": "{{ data.description }}",
                        "fields": [
                            {"title": "Severity", "value": "{{ data.severity | upper }}", "short": True},
                            {"title": "Environment", "value": "{{ data.tags.environment }}", "short": True},
                            {"title": "CPU Usage", "value": "{{ data.metrics.cpu_usage_percent }}%", "short": True},
                            {"title": "Error Rate", "value": "{{ data.metrics.error_rate_percent }}%", "short": True}
                        ],
                        "actions": [{
                            "type": "button",
                            "text": "View Runbook",
                            "url": "{{ data.runbook_url }}"
                        }, {
                            "type": "button",
                            "text": "Open Dashboard",
                            "url": "{{ data.dashboard_url }}"
                        }]
                    }]
                }),
                "timeout": 15,
            },
            
            # Update status page
            "update_status_page": {
                "method": "POST",
                "url": "https://api.statuspage.io/v1/pages/{{ env.STATUSPAGE_ID }}/incidents",
                "auth_type": "bearer",
                "auth_token": "{{ env.STATUSPAGE_API_KEY }}",
                "content_type": "json",
                "body": json.dumps({
                    "incident": {
                        "name": "{{ data.alert_name }}",
                        "status": "investigating",
                        "impact_override": "major",
                        "body": "We are investigating reports of {{ data.description | lower }}. Updates will be posted as they become available.",
                        "component_ids": ["{{ env.STATUSPAGE_API_COMPONENT_ID }}"],
                        "components": {
                            "{{ env.STATUSPAGE_API_COMPONENT_ID }}": "major_outage"
                        }
                    }
                }),
                "timeout": 30,
            }
        }
        
        return {
            "example_name": "Monitoring Alert Workflow",
            "description": "Automated incident response for critical infrastructure alerts",
            "webhook_payload": example_alert_payload,
            "workflow_config": workflow_config,
            "integration_points": [
                "Prometheus/AlertManager",
                "PagerDuty incident management",
                "Slack emergency notifications",
                "Status page updates",
                "Runbook automation"
            ]
        }
    
    def get_all_examples(self) -> Dict[str, Dict[str, Any]]:
        """Get all workflow examples."""
        return {
            "ecommerce_order": self.create_ecommerce_order_processor(),
            "chatops_deployment": self.create_chatops_deployment_workflow(),
            "data_pipeline": self.create_data_pipeline_processor(),
            "monitoring_alerts": self.create_monitoring_alert_workflow(),
        }
    
    def generate_example_documentation(self) -> str:
        """Generate comprehensive documentation for all examples."""
        examples = self.get_all_examples()
        
        doc = "# Webhook Integration Examples\n\n"
        doc += "This document provides real-world examples of webhook and HTTP request workflows.\n\n"
        
        for example_id, example_data in examples.items():
            doc += f"## {example_data['example_name']}\n\n"
            doc += f"**Description:** {example_data['description']}\n\n"
            
            doc += "### Integration Points:\n"
            for point in example_data['integration_points']:
                doc += f"- {point}\n"
            doc += "\n"
            
            doc += "### Example Webhook Payload:\n"
            doc += "```json\n"
            doc += json.dumps(example_data['webhook_payload'], indent=2)
            doc += "\n```\n\n"
            
            doc += "### Workflow Configuration:\n"
            doc += "```json\n"
            doc += json.dumps(example_data['workflow_config'], indent=2)
            doc += "\n```\n\n"
            doc += "---\n\n"
        
        return doc

# Usage example
def create_example_workflow():
    """Create and configure an example workflow."""
    examples = WebhookWorkflowExamples()
    
    # Get e-commerce example
    ecommerce = examples.create_ecommerce_order_processor()
    
    logger.info(f"Created example: {ecommerce['example_name']}")
    logger.info(f"Integration points: {len(ecommerce['integration_points'])}")
    
    return ecommerce

if __name__ == "__main__":
    # Generate documentation
    examples = WebhookWorkflowExamples()
    documentation = examples.generate_example_documentation()
    
    # Save to file
    with open("webhook_examples_documentation.md", "w") as f:
        f.write(documentation)
    
    print("📚 Webhook examples documentation generated!")
    print(f"📊 Total examples: {len(examples.get_all_examples())}")

# Export for use
__all__ = [
    "WebhookWorkflowExamples",
    "create_example_workflow"
]