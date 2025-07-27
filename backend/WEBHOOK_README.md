# 🌐 Webhook & HTTP Request System - KAI-Fusion

Complete REST API integration system for external service communication with LangChain ecosystem integration.

## 🎯 System Overview

```
External Services  →  [WebhookTrigger]  →  [Workflow Processing]  →  [HttpRequest]  →  External APIs
      ↓                     ↓                        ↓                     ↓              ↓
   POST /webhook      Event Processing       RAG Pipeline        REST API Call    Response Processing
```

## ✨ Features Implemented

### 🔗 WebhookTriggerNode
- **Dynamic Endpoint Creation**: Unique webhook URLs per node
- **FastAPI Integration**: Native router integration with automatic discovery
- **Authentication**: Bearer token, API key, or no-auth modes
- **Rate Limiting**: Configurable requests per minute
- **Event Streaming**: LangChain Runnable with async event streaming
- **Payload Validation**: Size limits, event type filtering
- **LangSmith Tracing**: Full observability integration

### 📡 HttpRequestNode  
- **HTTP Methods**: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
- **Authentication**: Bearer token, Basic auth, API key headers
- **Template Engine**: Jinja2 templating for dynamic URLs and bodies
- **Content Types**: JSON, form-data, multipart, text, XML
- **Error Handling**: Retry logic with exponential backoff
- **SSL Verification**: Configurable certificate validation
- **Performance Tracking**: Request duration and statistics

## 🚀 Quick Start

### 1. Create Webhook Trigger

```python
from app.nodes.triggers import WebhookTriggerNode

# Create webhook node
webhook_node = WebhookTriggerNode()

# Configure webhook
webhook_config = webhook_node.execute(
    authentication_required=True,
    allowed_event_types="order.created,payment.completed",
    max_payload_size=2048,  # KB
    rate_limit_per_minute=100,
    enable_cors=True
)

# Get webhook URL
webhook_url = webhook_config["webhook_endpoint"]
webhook_token = webhook_config["webhook_token"]

print(f"📍 Webhook URL: {webhook_url}")
print(f"🔑 Auth Token: {webhook_token}")
```

### 2. Create HTTP Request Node

```python
from app.nodes.tools import HttpRequestNode

# Create HTTP request node
http_node = HttpRequestNode()

# Configure HTTP request
request_config = {
    "method": "POST",
    "url": "https://api.external-service.com/webhook",
    "auth_type": "bearer",
    "auth_token": "your-api-token",
    "content_type": "json",
    "body": json.dumps({
        "event_type": "{{ data.event_type }}",
        "payload": "{{ data | tojson }}",
        "processed_at": "{{ now() }}"
    }),
    "timeout": 30,
    "max_retries": 3
}

# Execute request
result = http_node.execute(
    inputs=request_config,
    connected_nodes={"template_context": webhook_event_data}
)
```

## 📋 Real-World Examples

### E-commerce Order Processing

```python
# 1. External store sends webhook
POST /api/webhooks/wh_abc123
{
    "event_type": "order.created",
    "data": {
        "order_id": "ORD-2025-001",
        "customer_id": "CUST-567",
        "items": [{"product_id": "PROD-123", "quantity": 2}],
        "total": 59.98
    }
}

# 2. Workflow processes order
# 3. Send confirmation to external fulfillment
POST https://fulfillment.company.com/api/orders
{
    "order_id": "ORD-2025-001",
    "items": [...],
    "priority": "standard"
}
```

### ChatOps Deployment

```python
# 1. Slack sends deployment command
POST /api/webhooks/wh_deploy456
{
    "event_type": "slash_command.deploy",
    "data": {
        "command": "/deploy production api-service v1.2.3",
        "user": "jane.doe",
        "channel": "deployments"
    }
}

# 2. Trigger CI/CD pipeline
POST https://ci.company.com/api/v1/trigger
{
    "project": "api-service",
    "environment": "production", 
    "version": "v1.2.3",
    "triggered_by": "jane.doe"
}
```

### Monitoring Alerts

```python
# 1. Prometheus sends critical alert
POST /api/webhooks/wh_alerts789
{
    "event_type": "alert.critical",
    "data": {
        "alert_name": "High CPU Usage",
        "severity": "critical",
        "metrics": {"cpu_usage": 94.5},
        "environment": "production"
    }
}

# 2. Create PagerDuty incident
POST https://events.pagerduty.com/v2/enqueue
{
    "routing_key": "xxx",
    "event_action": "trigger",
    "payload": {
        "summary": "High CPU Usage",
        "severity": "critical",
        "source": "production"
    }
}
```

## 🔧 Configuration Options

### Webhook Trigger Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `authentication_required` | boolean | `true` | Require bearer token |
| `allowed_event_types` | string | `""` | Comma-separated event types |
| `max_payload_size` | number | `1024` | Max payload size in KB |
| `rate_limit_per_minute` | number | `60` | Request rate limit |
| `enable_cors` | boolean | `true` | Enable CORS headers |
| `webhook_timeout` | number | `30` | Processing timeout (seconds) |

### HTTP Request Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `method` | select | `GET` | HTTP method |
| `url` | text | - | Target URL (supports templating) |
| `auth_type` | select | `none` | Authentication method |
| `content_type` | select | `json` | Request content type |
| `timeout` | number | `30` | Request timeout |
| `max_retries` | number | `3` | Retry attempts |
| `verify_ssl` | boolean | `true` | SSL certificate verification |

## 🔐 Security Features

### Webhook Security
- ✅ **Token Authentication**: Configurable bearer token validation
- ✅ **Rate Limiting**: Protection against abuse
- ✅ **Payload Validation**: Size and content type restrictions
- ✅ **Event Filtering**: Whitelist allowed event types
- ✅ **Request Logging**: Comprehensive audit trail

### HTTP Request Security
- ✅ **Multiple Auth Methods**: Bearer, Basic, API Key
- ✅ **SSL Verification**: Certificate validation
- ✅ **Header Management**: Custom security headers
- ✅ **Timeout Controls**: Request timeout protection
- ✅ **Error Sanitization**: Safe error message handling

## 📊 Monitoring & Analytics

### Built-in Metrics
- Request/response times
- Success/failure rates
- Authentication attempts
- Rate limit violations
- Error categorization
- Performance trends

### LangSmith Integration
```python
# Enable tracing
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_key

# All webhook and HTTP requests will be traced
```

## 🧪 Testing

### Integration Test Suite
```bash
# Run webhook integration tests
cd app/nodes/tools
python test_webhook_integration.py

# Results:
# ✅ PASS webhook_trigger_basic
# ✅ PASS http_request_basic  
# ✅ PASS http_request_auth
# ✅ PASS webhook_to_http_workflow
# ✅ PASS error_handling
```

### Test Coverage
- ✅ Webhook endpoint creation and configuration
- ✅ HTTP request execution with various methods
- ✅ Authentication mechanisms
- ✅ Error handling and retries
- ✅ End-to-end workflow integration
- ✅ Performance and timeout scenarios

## 🔄 Workflow Integration

### Complete RAG Pipeline with Webhooks

```python
# External service triggers webhook
webhook_trigger = WebhookTriggerNode()

# Process through RAG pipeline
webscraper = WebScraperNode() 
chunksplitter = ChunkSplitterNode()
embedder = OpenAIEmbedderNode()
vectorstore = PGVectorStoreNode()
reranker = RerankerNode()
qa = RetrievalQANode()

# Send results via HTTP
http_request = HttpRequestNode()

# Chain everything together with LangChain
workflow = (
    webhook_trigger.as_runnable() |
    webscraper.as_runnable() |
    chunksplitter.as_runnable() |
    embedder.as_runnable() |
    vectorstore.as_runnable() |
    reranker.as_runnable() |
    qa.as_runnable() |
    http_request.as_runnable()
)
```

## 🌟 Advanced Features

### Template Engine (Jinja2)
```python
# Dynamic URLs
"url": "https://api.service.com/users/{{ data.user_id }}/orders"

# Dynamic request bodies
"body": {
    "event": "{{ data.event_type }}",
    "timestamp": "{{ now() }}",
    "processed_data": "{{ data | tojson }}"
}

# Conditional logic
"body": """
{
    "priority": "{% if data.amount > 1000 %}high{% else %}normal{% endif %}",
    "customer_tier": "{{ data.customer.tier | default('standard') }}"
}
"""
```

### Event Streaming
```python
# Stream webhook events in real-time
async for event in webhook_runnable.astream(None):
    print(f"📨 New event: {event['event_type']}")
    
    # Process event
    result = await process_workflow(event)
    
    # Send response
    await send_response(result)
```

## 🚀 Production Deployment

### Environment Variables
```bash
# Webhook configuration
WEBHOOK_BASE_URL=https://api.yourcompany.com
WEBHOOK_MAX_PAYLOAD_SIZE=4096
WEBHOOK_DEFAULT_TIMEOUT=30

# HTTP client configuration
HTTP_REQUEST_TIMEOUT=60
HTTP_MAX_RETRIES=3
HTTP_VERIFY_SSL=true

# Authentication tokens
API_TOKEN_EXTERNAL_SERVICE=xxx
WEBHOOK_SECRET_TOKEN=xxx
```

### FastAPI Integration
```python
# In main.py - automatically included
from app.nodes.triggers.webhook_trigger import webhook_router
app.include_router(webhook_router, tags=["Webhooks"])

# Webhooks available at: /api/webhooks/{webhook_id}
# Swagger docs: http://localhost:8000/docs#/Webhooks
```

## 📈 Success Metrics

The webhook and HTTP request system provides:

✅ **Complete REST Integration** - Both inbound and outbound  
✅ **LangChain Native** - Full Runnable pattern support  
✅ **Production Ready** - Authentication, rate limiting, error handling  
✅ **Developer Friendly** - Comprehensive testing and documentation  
✅ **Highly Configurable** - Flexible authentication and content types  
✅ **Observable** - LangSmith tracing and performance metrics  
✅ **Secure** - Token authentication and SSL verification  
✅ **Scalable** - Async processing and connection pooling  

## 🎉 Getting Started

1. **Install Dependencies**: `pip install jinja2 httpx pytest-asyncio`
2. **Import Nodes**: Available in UI node catalog automatically
3. **Create Webhook**: Drag WebhookTrigger to canvas
4. **Configure Endpoint**: Set authentication and limits
5. **Add HTTP Request**: Connect HttpRequest node for outbound calls
6. **Test Integration**: Use provided test suite
7. **Deploy**: Set environment variables and run!

The system is now ready for production use with comprehensive REST API integration! 🚀