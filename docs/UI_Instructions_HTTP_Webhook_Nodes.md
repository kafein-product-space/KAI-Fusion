# KAI-Fusion UI Instructions: HTTP Client & Webhook Trigger Nodes

## Overview
This guide provides step-by-step instructions for configuring and using the enhanced HTTP Client Node and Webhook Trigger Node in the KAI-Fusion platform interface.

---

## 🌐 HTTP Client Node - UI Configuration

### Basic Settings Tab

#### 1. **HTTP Method Selection**
- **Location**: Main configuration panel, top section
- **Options**: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
- **Default**: GET
- **Usage**: Select the HTTP method for your API request

#### 2. **URL Configuration**
- **Field**: Target URL
- **Format**: Complete URL with protocol (https://api.example.com/endpoint)
- **Template Support**: ✅ Supports Jinja2 templating (e.g., `{{base_url}}/users/{{user_id}}`)
- **Example**: `https://jsonplaceholder.typicode.com/posts/{{post_id}}`

#### 3. **Request Body** (POST, PUT, PATCH methods)
- **Content Type**: Automatically set based on body format
- **Formats Supported**:
  - JSON: `{"key": "value"}`
  - Form Data: `name=value&email=test@example.com`
  - XML: `<root><item>value</item></root>`
  - Plain Text: Any text content
- **Template Support**: ✅ Full Jinja2 support in body content

### Authentication Tab

#### 1. **Authentication Type Selection**
- **None**: No authentication required
- **Bearer Token**: 
  - Field: `Bearer Token`
  - Format: JWT or API token
  - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Basic Auth**:
  - Fields: `Username`, `Password`
  - Automatically encoded in Base64
- **API Key**:
  - Fields: `Header Name`, `API Key Value`
  - Example: Header: `X-API-Key`, Value: `your_api_key_123`

### Headers Tab

#### 1. **Custom Headers Configuration**
- **Format**: JSON object format
- **Example**:
  ```json
  {
    "Content-Type": "application/json",
    "X-Client-Version": "KAI-Fusion/2.1.0",
    "X-Request-ID": "{{request_id}}"
  }
  ```
- **Template Support**: ✅ Values can use Jinja2 templating

### Advanced Settings Tab

#### 1. **Timeout Configuration**
- **Field**: Request Timeout (seconds)
- **Default**: 10 seconds
- **Range**: 1-300 seconds

#### 2. **SSL Verification**
- **Toggle**: Verify SSL certificates
- **Default**: Enabled (recommended)
- **Disable**: Only for development/testing

#### 3. **Redirect Handling**
- **Toggle**: Follow redirects automatically
- **Default**: Enabled
- **Max Redirects**: 5 (configurable)

#### 4. **Template Engine**
- **Toggle**: Enable Jinja2 templating
- **Default**: Enabled
- **Scope**: URL, headers, body, and parameters

### Output Configuration

#### Expected Outputs:
- `status_code`: HTTP response status code
- `data`: Response body (parsed JSON or raw text)
- `headers`: Response headers as JSON object
- `url`: Final URL after redirects
- `method`: HTTP method used
- `response_time`: Request duration in seconds

---

## 🎯 Webhook Trigger Node - UI Configuration

### Basic Settings Tab

#### 1. **HTTP Method Selection** ⭐ NEW FEATURE
- **Location**: Basic Settings, top section
- **Options**: GET, POST, PUT, PATCH, DELETE, HEAD
- **Default**: POST
- **Description**: Select which HTTP method your webhook endpoint will accept
- **UI Element**: Dropdown menu with method icons

#### 2. **Authentication Settings**
- **Toggle**: Require Authentication
- **When Enabled**:
  - Generates secure token automatically
  - Token displayed in configuration summary
  - Must be included in webhook requests as `Authorization: Bearer <token>`

#### 3. **Webhook URL Display**
- **Auto-generated**: Based on selected HTTP method and webhook ID
- **Format**: `https://your-domain.com/api/webhooks/{method}/{webhook_id}`
- **Copy Button**: One-click copy to clipboard
- **QR Code**: Available for mobile integration

### Event Filtering Tab

#### 1. **Allowed Event Types**
- **Field**: Event Type Filter (comma-separated)
- **Format**: `event.type1,event.type2,event.type3`
- **Example**: `user.created,user.updated,order.completed`
- **Wildcard Support**: Use `*` for all events or `user.*` for user events

#### 2. **Event Source Filtering**
- **Field**: Allowed Sources (optional)
- **Format**: Comma-separated source identifiers
- **Example**: `mobile_app,web_app,api_client`

### Security Tab

#### 1. **Rate Limiting**
- **Field**: Requests per minute
- **Default**: 100 requests/minute
- **Range**: 1-1000 requests/minute
- **UI**: Slider with numeric input

#### 2. **Payload Size Limits**
- **Field**: Maximum payload size (KB)
- **Default**: 1024 KB (1 MB)
- **Range**: 1-10240 KB (10 MB)
- **Warning**: Large payloads may impact performance

#### 3. **CORS Configuration**
- **Toggle**: Enable CORS
- **Default**: Disabled
- **When Enabled**: Allows cross-origin requests from browsers

### Advanced Settings Tab

#### 1. **Webhook Timeout**
- **Field**: Processing timeout (seconds)
- **Default**: 30 seconds
- **Range**: 5-300 seconds

#### 2. **Response Format**
- **Options**: JSON, Plain Text, Custom
- **Default**: JSON
- **Custom**: Allows custom response templates

#### 3. **Retry Configuration**
- **Toggle**: Enable retry on failure
- **Retry Attempts**: 1-5 attempts
- **Retry Delay**: 1-60 seconds between attempts

### Monitoring Tab

#### 1. **Real-time Statistics**
- Total events received
- Events by type (chart)
- Events by source (chart)
- Success/error rates
- Average processing time

#### 2. **Event History**
- Recent webhook calls (last 100)
- Payload inspection
- Response codes and times
- Error details and stack traces

### Output Configuration

#### Expected Outputs:
- `webhook_data`: Received webhook payload
- `event_type`: Extracted event type
- `source`: Request source identifier
- `webhook_endpoint`: Full webhook URL
- `webhook_config`: Complete webhook configuration
- `status`: Webhook processing status
- `received_at`: Event timestamp

---

## 🔗 Workflow Integration Guide

### Connecting HTTP Client and Webhook Trigger

#### 1. **Basic Chain Setup**
1. Add Webhook Trigger Node to workflow
2. Configure with desired HTTP method and security
3. Add HTTP Client Node
4. Connect Webhook Trigger output to HTTP Client input
5. Configure HTTP Client to use webhook data

#### 2. **Data Flow Configuration**
```
Webhook Trigger (webhook_data) → HTTP Client (url/body)
```

#### 3. **Template Usage in HTTP Client**
When receiving webhook data, use templating:
- URL: `https://api.example.com/users/{{webhook_data.user_id}}`
- Body: `{"event": "{{webhook_data.event_type}}", "data": {{webhook_data.data|tojson}}}`

### Example Workflow Configurations

#### 1. **User Registration Webhook → Welcome Email**
- **Webhook**: POST method, `user.created` event filter
- **HTTP Client**: POST to email service API
- **Template**: Use webhook user data for email personalization

#### 2. **Order Status → External System Sync**
- **Webhook**: PUT method, `order.*` event filter  
- **HTTP Client**: PUT to external inventory system
- **Authentication**: API key for external system

#### 3. **Real-time Data Processing**
- **Webhook**: GET method for status checks
- **HTTP Client**: GET from monitoring APIs
- **Chain**: Multiple HTTP clients for different services

---

## 🛠️ Testing and Validation

### HTTP Client Node Testing
1. **Test Button**: Available in configuration panel
2. **Test Results**: Shows response preview
3. **Error Handling**: Displays detailed error messages
4. **Performance Metrics**: Response time and status

### Webhook Trigger Testing
1. **Test URL**: Generated for each webhook
2. **Manual Testing**: Send test requests using provided curl commands
3. **Event Simulation**: Built-in event simulator
4. **Live Monitoring**: Real-time event reception display

---

## 🚨 Troubleshooting Guide

### Common HTTP Client Issues

#### 1. **Connection Timeouts**
- Check URL accessibility
- Increase timeout value
- Verify network connectivity

#### 2. **Authentication Failures**
- Verify token/credentials
- Check header format
- Confirm API key permissions

#### 3. **Template Errors**
- Validate Jinja2 syntax
- Check variable availability
- Use template tester

### Common Webhook Issues

#### 1. **Webhook Not Triggering**
- Verify HTTP method matches
- Check authentication token
- Confirm event type filtering

#### 2. **Payload Too Large**
- Check size limits
- Reduce payload content
- Increase size limit if needed

#### 3. **Rate Limiting**
- Check current request rate
- Increase rate limit
- Implement request queuing

---

## 📝 Best Practices

### HTTP Client Node
1. **Always set appropriate timeouts**
2. **Use templating for dynamic content**
3. **Implement proper error handling**
4. **Monitor response times and status codes**
5. **Secure API credentials properly**

### Webhook Trigger Node
1. **Set reasonable rate limits**
2. **Use authentication for security**
3. **Filter events to reduce processing**
4. **Monitor webhook statistics regularly**
5. **Test with various HTTP methods**

### Integration
1. **Plan data flow before configuration**
2. **Use meaningful node names**
3. **Document webhook endpoints**
4. **Implement proper logging**
5. **Test end-to-end workflows**

---

## 🔄 Version Updates

### New Features in Latest Version
- ✅ Multi-HTTP method support for Webhook Trigger
- ✅ Enhanced authentication options
- ✅ Improved templating engine
- ✅ Real-time monitoring dashboard
- ✅ Advanced error handling
- ✅ Performance optimizations

### Migration from Previous Versions
- Previous webhook configurations remain compatible
- New HTTP method selection defaults to POST
- Enhanced features are opt-in
- No breaking changes to existing workflows

---

*This guide covers all UI configurations for the enhanced HTTP Client and Webhook Trigger nodes. For technical implementation details, refer to the respective node guides and test files.*