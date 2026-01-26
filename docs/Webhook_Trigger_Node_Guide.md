# Webhook Trigger Node - Kapsamlı Kullanım Kılavuzu

Bu kılavuz, KAI-Fusion platformunda Webhook Trigger Node'un tüm özelliklerini ve kullanım senaryolarını detaylı şekilde açıklar.

## 🎯 Webhook Trigger Node Nedir?

Webhook Trigger Node, dış sistemlerin KAI-Fusion workflow'larını HTTP istekleri ile tetiklememizi sağlayan güçlü bir giriş noktası bileşenidir. REST API endpoint'i oluşturur ve gelen istekleri workflow'a aktarır.

## ⚙️ Temel Özellikler

### 🌐 HTTP Metodları (YENİ!)
- **GET** - Query parametreleri ile veri alma
- **POST** - JSON body ile veri gönderme (varsayılan)
- **PUT** - Tam kaynak güncelleme
- **PATCH** - Kısmi kaynak güncelleme  
- **DELETE** - Query parametreleri ile kaynak silme
- **HEAD** - Sadece header bilgileri

### 🔐 Güvenlik Özellikleri
- **Bearer Token Authentication** - JWT ve custom token desteği
- **Event Type Filtering** - İzin verilen event türleri
- **Rate Limiting** - Dakika başına istek sınırı
- **Payload Size Control** - Maksimum payload boyutu
- **CORS Support** - Cross-origin requests desteği
- **IP Whitelisting** - Gelecek güncellemede

### 📊 İzleme ve Analytics
- **Real-time Event Tracking** - Gelen isteklerin canlı takibi
- **Event Statistics** - Event türü ve kaynak istatistikleri
- **Performance Metrics** - İstek zamanlamaları ve başarı oranları
- **Request Logging** - Detaylı istek logları

## 🔧 Konfigürasyon Parametreleri

### 📋 Temel Ayarlar
```json
{
  "http_method": "POST",
  "authentication_required": true,
  "enable_cors": true,
  "webhook_timeout": 30
}
```

### 🛡️ Güvenlik Ayarları
```json
{
  "authentication_required": true,
  "allowed_event_types": "user.created,order.completed,data.updated",
  "max_payload_size": 1024,
  "rate_limit_per_minute": 60
}
```

### 🔧 Gelişmiş Ayarlar
```json
{
  "webhook_timeout": 30,
  "enable_cors": true,
  "preserve_document_metadata": true,
  "metadata_strategy": "merge"
}
```

## 🎯 HTTP Method Kullanımları

### 1. **GET Request** - Query Parameters
```bash
# URL: https://your-domain.com/{API_START}/webhooks/wh_abc123
curl -X GET "https://your-domain.com/{API_START}/webhooks/wh_abc123?event_type=user.login&user_id=123&session_id=xyz789" \
  -H "Authorization: Bearer your_webhook_token"
```

### 2. **POST Request** - JSON Body
```bash
curl -X POST "https://your-domain.com/{API_START}/webhooks/wh_abc123" \
  -H "Authorization: Bearer your_webhook_token" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "user.created",
    "data": {
      "user_id": 12345,
      "email": "user@example.com",
      "name": "John Doe"
    }
  }'
```

### 3. **PUT Request** - Full Resource Update
```bash
curl -X PUT "https://your-domain.com/{API_START}/webhooks/wh_abc123" \
  -H "Authorization: Bearer your_webhook_token" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "user.updated",
    "data": {
      "user_id": 12345,
      "email": "newemail@example.com",
      "name": "John Smith",
      "status": "active"
    }
  }'
```

### 4. **PATCH Request** - Partial Update
```bash
curl -X PATCH "https://your-domain.com/{API_START}/webhooks/wh_abc123" \
  -H "Authorization: Bearer your_webhook_token" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "user.partial_update",
    "data": {
      "user_id": 12345,
      "status": "inactive"
    }
  }'
```

### 5. **DELETE Request** - Query Parameters
```bash
curl -X DELETE "https://your-domain.com/{API_START}/webhooks/wh_abc123?event_type=user.deleted&user_id=12345&reason=account_closure" \
  -H "Authorization: Bearer your_webhook_token"
```

### 6. **HEAD Request** - Headers Only
```bash
curl -X HEAD "https://your-domain.com/{API_START}/webhooks/wh_abc123" \
  -H "Authorization: Bearer your_webhook_token"
```

## 🎨 Kullanım Senaryoları

### 1. **E-ticaret Order Processing**
```json
{
  "http_method": "POST",
  "allowed_event_types": "order.completed,order.cancelled,payment.received",
  "authentication_required": true,
  "max_payload_size": 2048,
  "rate_limit_per_minute": 100
}
```

**Webhook Call:**
```bash
curl -X POST "https://your-domain.com/{API_START}/webhooks/wh_order_processor" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "order.completed",
    "data": {
      "order_id": "ORD-98765",
      "customer_id": 67890,
      "items": [{"sku": "PROD-001", "qty": 2}],
      "total": 299.99,
      "payment_status": "paid"
    },
    "source": "payment_gateway"
  }'
```

### 2. **User Management System**
```json
{
  "http_method": "GET",
  "allowed_event_types": "user.login,user.logout,user.password_reset",
  "authentication_required": false,
  "enable_cors": true,
  "rate_limit_per_minute": 500
}
```

**Webhook Call:**
```bash
curl -X GET "https://your-domain.com/{API_START}/webhooks/wh_user_events?event_type=user.login&user_id=123&ip=192.168.1.1&timestamp=1641234567"
```

### 3. **System Monitoring & Alerts**
```json
{
  "http_method": "POST",
  "allowed_event_types": "system.alert,system.warning,system.info",
  "authentication_required": true,
  "max_payload_size": 5120,
  "webhook_timeout": 60
}
```

**Webhook Call:**
```bash
curl -X POST "https://your-domain.com/{API_START}/webhooks/wh_system_monitor" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "system.alert",
    "data": {
      "alert_type": "service_down",
      "service_name": "payment_processor", 
      "severity": "critical",
      "affected_users": 1500,
      "auto_recovery": false
    },
    "source": "monitoring_system"
  }'
```

### 4. **Content Management (RESTful)**
```json
{
  "http_method": "PUT",
  "allowed_event_types": "content.created,content.updated,content.deleted",
  "authentication_required": true,
  "max_payload_size": 10240
}
```

**Webhook Call:**
```bash
curl -X PUT "https://your-domain.com/{API_START}/webhooks/wh_content_manager" \
  -H "Authorization: Bearer cms_token_123" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "content.updated",
    "data": {
      "content_id": "article_456",
      "title": "Updated Article Title",
      "body": "Updated content body...",
      "tags": ["technology", "ai", "automation"],
      "status": "published"
    }
  }'
```

## 🔗 Workflow Entegrasyonu

### 1. **Basic Webhook → Processing → Response**
```json
{
  "nodes": [
    {
      "id": "webhook_1",
      "type": "WebhookTrigger", 
      "data": {
        "http_method": "POST",
        "authentication_required": true,
        "allowed_event_types": "user.created,order.completed"
      }
    },
    {
      "id": "start_1",
      "type": "Start",
      "data": {"name": "Process Webhook"}
    },
    {
      "id": "llm_1", 
      "type": "OpenAI",
      "data": {
        "prompt": "Process this webhook data: {{webhook_data.payload}}"
      }
    },
    {
      "id": "end_1",
      "type": "End"
    }
  ],
  "edges": [
    {"source": "webhook_1", "target": "start_1"},
    {"source": "start_1", "target": "llm_1"},
    {"source": "llm_1", "target": "end_1"}
  ]
}
```

### 2. **Advanced Multi-Method Workflow**
```json
{
  "nodes": [
    {
      "id": "get_webhook",
      "type": "WebhookTrigger",
      "data": {
        "http_method": "GET",
        "authentication_required": false,
        "allowed_event_types": "data.query"
      }
    },
    {
      "id": "post_webhook", 
      "type": "WebhookTrigger",
      "data": {
        "http_method": "POST",
        "authentication_required": true,
        "allowed_event_types": "data.create"
      }
    },
    {
      "id": "router",
      "type": "ConditionalRouter",
      "data": {
        "condition": "webhook_data.event_type == 'data.query'"
      }
    }
  ]
}
```

## 📊 Event Monitoring & Analytics

### Real-time Event Tracking
```javascript
// Event stream endpoint
GET /{API_START}/webhooks/wh_abc123/events/stream

// Response
{
  "event_id": "evt_789",
  "webhook_id": "wh_abc123", 
  "event_type": "user.created",
  "received_at": "2024-08-06T09:30:00Z",
  "client_ip": "192.168.1.100",
  "user_agent": "PostmanRuntime/7.29.0",
  "data": {
    "user_id": 12345,
    "name": "John Doe"
  },
  "processing_time": 0.045,
  "status": "success"
}
```

### Statistics API
```javascript
// Get webhook statistics
GET /{API_START}/webhooks/wh_abc123/stats

// Response
{
  "webhook_id": "wh_abc123",
  "total_events": 1250,
  "event_types": {
    "user.created": 800,
    "user.updated": 350,
    "user.deleted": 100
  },
  "sources": {
    "mobile_app": 600,
    "web_app": 500,
    "api_direct": 150
  },
  "last_event_at": "2024-08-06T09:30:00Z",
  "average_response_time": 0.12,
  "success_rate": 98.5
}
```

## 🛡️ Güvenlik ve Rate Limiting

### Authentication Examples
```bash
# Bearer Token
curl -H "Authorization: Bearer wht_secrettoken123" \
  https://api.example.com/webhooks/wh_abc123

# API Key Header  
curl -H "X-API-Key: your-api-key" \
  https://api.example.com/webhooks/wh_abc123

# Basic Auth
curl -u "username:password" \
  https://api.example.com/webhooks/wh_abc123
```

### Rate Limiting Response
```json
{
  "error": "Rate limit exceeded",
  "status_code": 429,
  "details": {
    "limit": 60,
    "window": "1 minute",
    "remaining": 0,
    "reset_at": "2024-08-06T09:31:00Z"
  }
}
```

### Payload Size Validation
```json
{
  "error": "Payload too large",
  "status_code": 413,
  "details": {
    "max_size": "1024KB",
    "received_size": "1500KB",
    "suggestion": "Reduce payload size or increase max_payload_size setting"
  }
}
```

## 🎯 Testing ve Debugging

### Test Webhook Locally
```bash
# Using ngrok for local development
ngrok http 8000

# Test webhook
curl -X POST "https://abc123.ngrok.io/{API_START}/webhooks/wh_test" \
  -H "Content-Type: application/json" \
  -d '{"event_type": "test.event", "data": {"message": "Hello World"}}'
```

### Debug Webhook with cURL
```bash
# Full debug output
curl -X POST "https://your-domain.com/{API_START}/webhooks/wh_abc123" \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{"event_type": "debug.test", "data": {"debug": true}}' \
  -v --trace-time
```

### Webhook Testing Tools
```json
{
  "testing_tools": [
    {
      "name": "Postman",
      "description": "GUI tool for API testing",
      "url": "https://www.postman.com/"
    },
    {
      "name": "webhook.site", 
      "description": "Online webhook testing",
      "url": "https://webhook.site/"
    },
    {
      "name": "ngrok",
      "description": "Local tunnel for testing",
      "url": "https://ngrok.com/"
    }
  ]
}
```

## 📈 Performance Optimization

### Connection Pooling
```json
{
  "performance_settings": {
    "max_concurrent_connections": 100,
    "connection_timeout": 30,
    "keep_alive": true,
    "request_pooling": true
  }
}
```

### Caching Strategies
```json
{
  "caching": {
    "enable_response_cache": true,
    "cache_duration": 300,
    "cache_keys": ["event_type", "source"],
    "cache_size_limit": "100MB"
  }
}
```

## 🚀 Advanced Use Cases

### 1. **Multi-Tenant Webhook System**
```json
{
  "webhook_config": {
    "tenant_isolation": true,
    "tenant_header": "X-Tenant-ID",
    "per_tenant_rate_limits": {
      "tenant_a": 100,
      "tenant_b": 500,
      "default": 60
    }
  }
}
```

### 2. **Event-Driven Microservices**
```json
{
  "microservice_integration": {
    "service_discovery": true,
    "load_balancing": true,
    "circuit_breaker": true,
    "event_routing": {
      "user.*": "user_service",
      "order.*": "order_service", 
      "payment.*": "payment_service"
    }
  }
}
```

### 3. **Real-time Dashboard Updates**
```json
{
  "dashboard_webhook": {
    "http_method": "POST",
    "allowed_event_types": "dashboard.update,metric.change",
    "enable_websocket_broadcast": true,
    "realtime_channels": ["admin", "analytics", "monitoring"]
  }
}
```

## 📋 Best Practices

### 1. **Security**
```json
{
  "security_best_practices": {
    "always_use_https": true,
    "validate_signatures": true,
    "implement_idempotency": true,
    "log_security_events": true,
    "rate_limit_by_ip": true
  }
}
```

### 2. **Reliability** 
```json
{
  "reliability_practices": {
    "implement_retries": true,
    "use_circuit_breakers": true,
    "monitor_error_rates": true,
    "implement_timeouts": true,
    "graceful_degradation": true
  }
}
```

### 3. **Performance**
```json
{
  "performance_practices": {
    "async_processing": true,
    "batch_operations": true,
    "connection_pooling": true,
    "caching_strategies": true,
    "payload_compression": true
  }
}
```

## 🛠️ Troubleshooting

### Common Issues
```json
{
  "troubleshooting": {
    "401_unauthorized": {
      "cause": "Invalid or missing authentication token",
      "solution": "Check webhook_token and Authorization header"
    },
    "413_payload_too_large": {
      "cause": "Request payload exceeds max_payload_size", 
      "solution": "Reduce payload size or increase limit"
    },
    "429_rate_limit": {
      "cause": "Too many requests within time window",
      "solution": "Implement backoff or increase rate limit"
    },
    "timeout_error": {
      "cause": "Webhook processing took too long",
      "solution": "Increase webhook_timeout or optimize workflow"
    }
  }
}
```

### Debugging Steps
1. **Check Authentication** - Token valid mi?
2. **Validate Payload** - JSON format doğru mu?
3. **Verify URL** - Endpoint aktif mi?
4. **Monitor Logs** - Error mesajları kontrol et
5. **Test Rate Limits** - Limit aşılmış mı?

Webhook Trigger Node, KAI-Fusion platformunda dış sistemlerle entegrasyon kurmak için güçlü ve esnek bir giriş noktasıdır. Yeni HTTP method desteği ile daha da güçlü hale gelmiştir!