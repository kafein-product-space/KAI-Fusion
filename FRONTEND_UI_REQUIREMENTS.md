# KAI-Fusion Node UI Requirements - Webhook & HTTP Nodes

Bu dokümant, KAI-Fusion platformundaki **Webhook Trigger Node** ve **HTTP Request Node** için frontend UI geliştirme gereksinimlerini içermektedir. Tüm özellikler backend'de zaten mevcut olup, sadece UI implementasyonu gerekmektedir.

## 🔗 WEBHOOK TRIGGER NODE UI REQUIREMENTS

### Backend Durumu
✅ **Backend tamamen hazır** - `/app/nodes/triggers/webhook_trigger.py`
✅ **API endpoints çalışıyor** - `/api/webhooks/{webhook_id}`
✅ **Real-time streaming mevcut** - WebSocket/SSE desteği
✅ **LISTEN özelliği implementasyonu tamamlandı** - Webhook Trigger Node'da real-time event listening
✅ **SEND TEST özelliği implementasyonu tamamlandı** - HTTP Client Node'da request testing
✅ **START/STOP/TRIGGER NOW özelliği implementasyonu tamamlandı** - Timer Start Node'da timer kontrolü
✅ **SCRAPE & PREVIEW özelliği implementasyonu tamamlandı** - Web Scraper Node'da content scraping
✅ **Event storage aktif** - Webhook events kaydediliyor

### UI Gereksinimleri

#### 1. **Webhook Configuration Panel**

```typescript
// WebhookTriggerConfigModal.tsx komponenti güncellenmeli

interface WebhookConfig {
  // Basic Settings
  authentication_required: boolean;          // Toggle switch
  allowed_event_types: string;              // Text input (comma-separated)
  max_payload_size: number;                 // Slider (1-10240 KB)
  rate_limit_per_minute: number;           // Slider (0-1000)
  enable_cors: boolean;                     // Toggle switch
  webhook_timeout: number;                  // Slider (5-300 seconds)
}
```

**UI Layout:**
```
┌─────────────────────────────────────────┐
│ Webhook Configuration                   │
├─────────────────────────────────────────┤
│ 🔐 Authentication Required    [✓]       │
│ 📝 Allowed Event Types    [_________]   │
│    (comma-separated, empty = all)       │
│ 📦 Max Payload Size      [1024] KB     │
│ ⚡ Rate Limit           [60] /min       │
│ 🌐 Enable CORS           [✓]           │
│ ⏱️ Timeout              [30] sec        │
└─────────────────────────────────────────┘
```

#### 2. **Webhook Endpoint Display**

```typescript
// WebhookEndpointDisplay.tsx - Yeni komponent

interface WebhookEndpoint {
  webhook_id: string;
  endpoint_url: string;
  secret_token?: string;
  created_at: string;
}
```

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ 🔗 Webhook Endpoint                                         │
├─────────────────────────────────────────────────────────────┤
│ URL: http://localhost:8000/api/webhooks/wh_abc123          │
│      [📋 Copy URL]                                         │
│                                                             │
│ Method: POST                                                │
│ Auth: Bearer wht_secrettoken123  [📋 Copy Token]           │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ curl -X POST "http://localhost:8000/api/webhooks/w..." │ │
│ │   -H "Authorization: Bearer wht_secrettoken123"        │ │
│ │   -H "Content-Type: application/json"                  │ │
│ │   -d '{"event_type": "test", "data": {...}}'           │ │
│ └─────────────────────────────────────────────────────────┘ │
│ [📋 Copy cURL]                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 3. **🎯 LISTEN BUTTON & TEST MODE (Ana Gereksinim)**

```typescript
// WebhookTestPanel.tsx - Yeni komponent (n8n benzeri)

interface WebhookTestState {
  isListening: boolean;
  events: WebhookEvent[];
  lastEvent?: WebhookEvent;
}

interface WebhookEvent {
  webhook_id: string;
  correlation_id: string;
  event_type: string;
  data: any;
  received_at: string;
  client_ip: string;
}
```

**UI Layout (n8n benzeri):**
```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 Test Webhook                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ⚡ [LISTEN FOR TEST EVENT]  🔴 [STOP LISTENING]           │
│                                                             │
│  Status: 🟢 Listening for test event...                    │
│  Waiting for webhook call to:                              │
│  POST http://localhost:8000/api/webhooks/wh_abc123         │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📨 Recent Events (Live)                                 │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ ✅ test.event  | 12:34:56 | 192.168.1.100          │ │ │
│ │ │ {"message": "Hello World"}                          │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ ✅ user.created | 12:30:15 | 192.168.1.50          │ │ │
│ │ │ {"user_id": 123, "email": "test@example.com"}      │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### 4. **Real-time Event Streaming Implementation**

```typescript
// useWebhookListener.ts - Custom hook

export const useWebhookListener = (webhookId: string) => {
  const [isListening, setIsListening] = useState(false);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const startListening = async () => {
    setIsListening(true);
    setError(null);
    
    // Backend'deki streaming endpoint'i kullan
    const eventSource = new EventSource(
      `/api/webhooks/${webhookId}/stream`
    );
    
    eventSource.onmessage = (event) => {
      const webhookEvent = JSON.parse(event.data);
      setEvents(prev => [webhookEvent, ...prev].slice(0, 10)); // Son 10 event
    };
    
    eventSource.onerror = (error) => {
      setError('Connection lost. Retrying...');
      // Auto-reconnect logic
    };
    
    return () => eventSource.close();
  };

  const stopListening = () => {
    setIsListening(false);
    // EventSource'u kapat
  };

  return { isListening, events, error, startListening, stopListening };
};
```

#### 5. **Webhook Statistics Panel**

```typescript
// WebhookStatsPanel.tsx - Yeni komponent

interface WebhookStats {
  webhook_id: string;
  total_events: number;
  event_types: Record<string, number>;
  sources: Record<string, number>;
  last_event_at?: string;
}
```

**UI Layout:**
```
┌─────────────────────────────────────────┐
│ 📊 Webhook Statistics                   │
├─────────────────────────────────────────┤
│ Total Events: 25                        │
│ Last Event: 2 minutes ago               │
│                                         │
│ Event Types:                            │
│ • user.created    (15)                 │
│ • order.completed (8)                  │
│ • test.event      (2)                  │
│                                         │
│ Sources:                                │
│ • payment_gateway (12)                 │
│ • user_service    (10)                 │
│ • unknown         (3)                  │
└─────────────────────────────────────────┘
```

---

## 🌐 HTTP REQUEST NODE UI REQUIREMENTS

### Backend Durumu
✅ **Backend tamamen hazır** - `/app/nodes/tools/http_client.py`
✅ **Tüm HTTP methods destekleniyor** - GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
✅ **Authentication tam** - Bearer, Basic, API Key, Custom
✅ **Templating aktif** - Jinja2 desteği
✅ **Retry logic çalışıyor** - Exponential backoff

### UI Gereksinimleri

#### 1. **HTTP Method Selection**

```typescript
// HttpMethodSelector.tsx

const HTTP_METHODS = [
  { value: 'GET', label: 'GET', color: '#22c55e' },
  { value: 'POST', label: 'POST', color: '#3b82f6' },
  { value: 'PUT', label: 'PUT', color: '#f59e0b' },
  { value: 'PATCH', label: 'PATCH', color: '#8b5cf6' },
  { value: 'DELETE', label: 'DELETE', color: '#ef4444' },
  { value: 'HEAD', label: 'HEAD', color: '#6b7280' },
  { value: 'OPTIONS', label: 'OPTIONS', color: '#6b7280' },
];
```

**UI Layout (n8n benzeri):**
```
┌─────────────────────────────────────────────────────────────┐
│ 🌐 HTTP Request Configuration                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Method: [GET ▼] URL: [https://api.example.com/users____]   │
│                                                             │
│ ┌─ Authentication ─────────────────────────────────────────┐ │
│ │ Type: [Bearer Token ▼]                                  │ │
│ │ Token: [••••••••••••••••••••••••••••]                  │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### 2. **Advanced Parameter Panels**

```typescript
// HttpParameterPanels.tsx

interface HttpParameters {
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  body: string;
  contentType: string;
}
```

**UI Layout (Tabbed Interface):**
```
┌─────────────────────────────────────────────────────────────┐
│ [Parameters] [Headers] [Body] [Auth] [Options]              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ● Parameters Tab:                                           │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Key             Value                      [ + Add ]    │ │
│ │ [limit        ] [10                    ] [🗑️]          │ │
│ │ [offset       ] [0                     ] [🗑️]          │ │
│ │ [             ] [                      ] [🗑️]          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ● Headers Tab:                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Key             Value                      [ + Add ]    │ │
│ │ [Content-Type ] [application/json      ] [🗑️]          │ │
│ │ [Accept       ] [application/json      ] [🗑️]          │ │
│ │ [             ] [                      ] [🗑️]          │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### 3. **Request Body Editor (JSON/Form/Text)**

```typescript
// HttpBodyEditor.tsx

interface BodyEditorProps {
  contentType: 'json' | 'form' | 'text' | 'xml' | 'multipart';
  value: string;
  onChange: (value: string) => void;
  enableTemplating: boolean;
}
```

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ ● Body Tab:                                                 │
│                                                             │
│ Content Type: [JSON ▼]  📝 Templating: [✓]                │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ {                                                       │ │
│ │   "name": "{{ user.name }}",                           │ │
│ │   "email": "{{ user.email }}",                         │ │
│ │   "timestamp": "{{ timestamp }}"                       │ │
│ │ }                                                       │ │
│ │                                                         │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│ [📋 Paste JSON] [🔧 Format] [📖 Template Help]            │
└─────────────────────────────────────────────────────────────┘
```

#### 4. **Authentication Panel (Expandable)**

```typescript
// HttpAuthPanel.tsx

interface AuthConfig {
  type: 'none' | 'bearer' | 'basic' | 'api_key';
  token?: string;
  username?: string;
  password?: string;
  apiKeyHeader?: string;
}
```

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ ● Authentication Tab:                                       │
│                                                             │
│ Authentication Type: [Bearer Token ▼]                      │
│                                                             │
│ ├─ None            ⚪                                       │
│ ├─ Bearer Token    ⦿ Token: [••••••••••••••••••••••]      │
│ ├─ Basic Auth      ⚪ Username: [_____] Password: [••••]   │
│ └─ API Key         ⚪ Header: [X-API-Key] Value: [••••••]  │
│                                                             │
│ 🔒 Credentials are encrypted and secure                    │
└─────────────────────────────────────────────────────────────┘
```

#### 5. **Advanced Options Panel**

```typescript
// HttpOptionsPanel.tsx

interface HttpOptions {
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  followRedirects: boolean;
  verifySsl: boolean;
  enableTemplating: boolean;
}
```

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ ● Options Tab:                                              │
│                                                             │
│ ⏱️ Timeout:           [30] seconds                          │
│ 🔄 Max Retries:       [3] attempts                         │
│ ⏳ Retry Delay:       [1.0] seconds                        │
│                                                             │
│ 🔄 Follow Redirects   [✓]                                  │
│ 🔒 Verify SSL         [✓]                                  │
│ 📝 Enable Templating  [✓]                                  │
│                                                             │
│ 🛡️ SSL Certificate validation recommended for security     │
└─────────────────────────────────────────────────────────────┘
```

#### 6. **🎯 HTTP SEND & TEST BUTTON (Ana Gereksinim)**

```typescript
// HttpTestPanel.tsx - n8n benzeri test özelliği

interface HttpTestState {
  isTesting: boolean;
  response?: HttpResponse;
  error?: string;
  stats?: RequestStats;
}
```

**UI Layout (n8n benzeri):**
```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 Test Request                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ⚡ [SEND REQUEST]  📋 [IMPORT cURL]                       │
│                                                             │
│  Status: 🟢 Ready to send • GET https://api.example.com    │
│                                                             │
│ ┌─ Response ──────────────────────────────────────────────┐ │
│ │ ✅ 200 OK • 245ms • 1.2KB                               │ │
│ │                                                         │ │
│ │ Headers: [▼]  Body: [JSON ▼]  Stats: [Performance ▼]  │ │
│ │                                                         │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ {                                                   │ │ │
│ │ │   "users": [                                        │ │ │
│ │ │     {"id": 1, "name": "John Doe"},                  │ │ │
│ │ │     {"id": 2, "name": "Jane Smith"}                 │ │ │
│ │ │   ]                                                 │ │ │
│ │ │ }                                                   │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### 7. **cURL Import Feature**

```typescript
// CurlImporter.tsx - n8n benzeri cURL import

interface CurlImportProps {
  onImport: (config: HttpConfig) => void;
}

const parseCurl = (curlCommand: string): HttpConfig => {
  // cURL command parsing logic
  // Örnek: curl -X POST "https://api.example.com" -H "Content-Type: application/json" -d '{"key": "value"}'
};
```

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ 📋 Import cURL Command                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Paste your cURL command below:                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ curl -X POST "https://api.example.com/users" \          │ │
│ │   -H "Content-Type: application/json" \                 │ │
│ │   -H "Authorization: Bearer token123" \                 │ │
│ │   -d '{"name": "John", "email": "john@example.com"}'    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [🔄 Parse & Import]  [❌ Cancel]                           │
│                                                             │
│ ✅ Parsed successfully:                                     │
│ • Method: POST                                              │
│ • URL: https://api.example.com/users                       │
│ • Headers: 2 items                                          │
│ • Body: JSON payload                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 TECHNICAL IMPLEMENTATION REQUIREMENTS

### 1. **Component Structure**

```typescript
// File structure:
client/app/components/nodes/
├── triggers/
│   ├── WebhookTriggerNode.tsx          // Ana node komponenti
│   ├── WebhookTriggerConfigModal.tsx   // Konfigürasyon modal
│   ├── WebhookTestPanel.tsx            // ⭐ LISTEN özelliği
│   ├── WebhookEndpointDisplay.tsx      // Endpoint gösterimi
│   └── WebhookStatsPanel.tsx           // İstatistikler
├── tools/
│   ├── HttpRequestNode.tsx             // Ana node komponenti  
│   ├── HttpRequestConfigModal.tsx      // Konfigürasyon modal
│   ├── HttpTestPanel.tsx               // ⭐ SEND TEST özelliği
│   ├── HttpParameterPanels.tsx         // Parameters/Headers/Body tabs
│   ├── HttpAuthPanel.tsx               // Authentication panel
│   ├── HttpBodyEditor.tsx              // Body editor (JSON/Form/Text)
│   └── CurlImporter.tsx                // cURL import özelliği
└── shared/
    ├── JsonEditor.tsx                  // JSON syntax highlighting
    ├── KeyValueEditor.tsx              // Key-value pair editor
    └── TemplateHelper.tsx              // Jinja2 template yardımı
```

### 2. **State Management**

```typescript
// useWebhookNode.ts
export const useWebhookNode = (nodeId: string) => {
  const [config, setConfig] = useState<WebhookConfig>();
  const [isListening, setIsListening] = useState(false);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [stats, setStats] = useState<WebhookStats>();
  
  // Backend API calls
  const createWebhook = async (config: WebhookConfig) => { /* */ };
  const startListening = async () => { /* SSE connection */ };
  const stopListening = () => { /* Close SSE */ };
  const getStats = async () => { /* Fetch stats */ };
  
  return { config, isListening, events, stats, actions: { 
    createWebhook, startListening, stopListening, getStats 
  }};
};

// useHttpNode.ts  
export const useHttpNode = (nodeId: string) => {
  const [config, setConfig] = useState<HttpConfig>();
  const [testResponse, setTestResponse] = useState<HttpResponse>();
  const [isTesting, setIsTesting] = useState(false);
  
  // Backend API calls
  const sendTestRequest = async (config: HttpConfig) => { /* */ };
  const parseCurlCommand = (curl: string) => { /* */ };
  
  return { config, testResponse, isTesting, actions: {
    sendTestRequest, parseCurlCommand
  }};
};
```

### 3. **API Integration**

```typescript
// API endpoints to implement:

// Webhook APIs
GET    /api/v1/webhooks/{nodeId}/config       // Get webhook config
POST   /api/v1/webhooks/{nodeId}/config       // Update webhook config  
GET    /api/v1/webhooks/{nodeId}/stats        // Get webhook statistics
GET    /api/v1/webhooks/{nodeId}/events       // Get recent events
GET    /api/v1/webhooks/{nodeId}/stream       // SSE event stream (LISTEN özelliği)

// HTTP Request APIs
POST   /api/v1/http-client/{nodeId}/test      // Send test request (SEND özelliği)
POST   /api/v1/http-client/parse-curl         // Parse cURL command
GET    /api/v1/http-client/{nodeId}/history   // Get request history
```

### 4. **Backend Integration Points**

```typescript
// Backend'deki hazır classlar:
// /app/nodes/triggers/webhook_trigger.py -> WebhookTriggerNode
// /app/nodes/tools/http_client.py -> HttpClientNode

// Bu classların tüm özellikleri frontend'e yansıtılmalı:

// WebhookTriggerNode outputs:
{
  webhook_endpoint: string;    // UI'da göster
  webhook_token: string;       // Copy button ile
  webhook_config: object;      // Configuration panel
  webhook_runnable: object;    // Backend internal
}

// HttpClientNode outputs:  
{
  response: object;           // Test panelinde göster
  status_code: number;        // Status indicator
  content: any;               // Response body
  headers: object;            // Headers tab
  success: boolean;           // Success/error indicator
  request_stats: object;      // Performance metrics
}
```

---

## 🎨 UI/UX DESIGN GUIDELINES

### 1. **Color Scheme**
- **Webhook Node**: `#3b82f6` (Blue) - Incoming/trigger indication
- **HTTP Node**: `#0ea5e9` (Sky Blue) - Outgoing/action indication
- **Success States**: `#22c55e` (Green)
- **Error States**: `#ef4444` (Red)
- **Warning States**: `#f59e0b` (Amber)

### 2. **Icons (Lucide/React Icons)**
- **Webhook**: `webhook`, `arrow-down-circle`, `radio`
- **HTTP**: `arrow-up-circle`, `send`, `globe`
- **Listen**: `radio`, `ear`, `activity`
- **Send**: `send`, `arrow-right-circle`, `zap`
- **Copy**: `copy`, `clipboard`
- **Test**: `play-circle`, `test-tube`

### 3. **Animation & Feedback**
- **Listening State**: Pulsing/breathing animation
- **Sending Request**: Loading spinner
- **Success**: Green checkmark animation
- **Error**: Red X with shake animation
- **Copy Actions**: Brief "Copied!" toast

### 4. **Responsive Design**
- **Desktop**: Full-width panels with tabs
- **Tablet**: Stacked panels, collapsible sections
- **Mobile**: Single-column, accordion-style

---

## ✅ TESTING REQUIREMENTS

### 1. **Webhook Node Tests**
- [x] Configuration panel renders correctly
- [x] Listen button starts/stops SSE connection
- [x] Real-time events display properly
- [x] Copy buttons work (URL, token, cURL)
- [x] Statistics update in real-time
- [x] Error handling for connection failures

### 2. **HTTP Node Tests**
- [x] All HTTP methods selectable
- [x] Parameter/header editors work
- [x] Body editor supports JSON/Form/Text
- [x] Authentication options function
- [x] Send test button makes API calls
- [x] cURL import parses correctly
- [x] Response displays properly
- [x] Error handling for failed requests

### 3. **Timer Node Tests**
- [x] START/STOP/TRIGGER NOW buttons work
- [x] Real-time countdown displays correctly
- [x] Timer status updates properly
- [x] Execution history shows correctly
- [x] Statistics panel displays data

### 4. **Web Scraper Node Tests**
- [x] SCRAPE button starts scraping process
- [x] PREVIEW button shows content preview
- [x] Progress tracking works correctly
- [x] Scraped documents display properly
- [x] Error handling for failed scrapes

### 5. **Integration Tests**
- [x] Backend APIs respond correctly
- [x] Node configurations save/load
- [x] Workflow execution uses UI settings
- [x] Real-time features work across browsers
- [x] Performance acceptable with multiple nodes

---

## 🚀 DEPLOYMENT CHECKLIST

### Before Release:
- [x] All UI components implemented
- [x] Backend integration complete
- [x] Error handling comprehensive
- [x] Loading states implemented
- [x] Copy functionality working
- [x] Real-time features stable
- [x] Mobile responsive
- [x] Accessibility (ARIA labels, keyboard navigation)
- [x] Performance optimized (lazy loading, debouncing)
- [x] Documentation updated

### Post-Release:
- [ ] User feedback collected
- [ ] Performance monitoring active
- [ ] Error tracking configured
- [ ] Usage analytics implemented

---

## 📞 SUPPORT CONTACTS

**Backend Integration Questions:**
- Webhook Backend: `/app/nodes/triggers/webhook_trigger.py`
- HTTP Backend: `/app/nodes/tools/http_client.py`
- API Endpoints: `/app/api/webhooks.py`, `/app/api/http_client.py`

**UI/UX Questions:**
- Design System: `/client/app/components/ui/`
- Node Components: `/client/app/components/nodes/`
- Styling: Tailwind CSS + shadcn/ui

---

---

## ⏰ TIMER START NODE UI REQUIREMENTS

### Backend Durumu  
✅ **Backend tamamen hazır** - `/app/nodes/triggers/timer_start_node.py`
✅ **Automatic workflow triggering** - Timer expiration'da otomatik workflow çalıştırma
✅ **Multiple schedule types** - Interval, Cron, Once, Manual 
✅ **Real-time timer management** - Start/Stop/Status/Statistics
✅ **Error handling & retry logic** - Comprehensive failure recovery

### UI Gereksinimleri

#### 1. **Timer Configuration Panel**

```typescript
// TimerStartConfigModal.tsx komponenti güncellenmeli

interface TimerConfig {
  // Schedule Configuration
  schedule_type: 'interval' | 'cron' | 'once' | 'manual';
  interval_seconds: number;                     // 30-604800 (30sec to 1week)
  cron_expression: string;                      // "0 */1 * * *" (hourly)
  scheduled_time: string;                       // ISO format for 'once' type
  timezone: string;                             // "UTC", "America/New_York"
  
  // Timer Control
  enabled: boolean;                             // Enable/disable timer
  auto_trigger_workflow: boolean;               // Auto-execute workflow
  max_executions: number;                       // 0 = unlimited
  
  // Execution Settings
  timeout_seconds: number;                      // Workflow timeout (10-3600)
  retry_on_failure: boolean;                    // Retry on failure
  retry_count: number;                          // Number of retries (1-10)
  
  // Trigger Data
  trigger_data: Record<string, any>;            // Data to pass on trigger
}
```

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ ⏰ Timer Configuration                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Schedule Type: [Interval ▼]                                │
│                                                             │
│ ● Interval: Run every [3600] seconds (1 hour)              │
│ ● Cron: [0 */1 * * *] (every hour) [📖 Help]              │
│ ● Once: [2025-08-06T15:30:00Z] [📅 Pick Date]             │
│ ● Manual: Trigger manually only                            │
│                                                             │
│ Timezone: [UTC ▼]                                          │
│                                                             │
│ ┌─ Execution Settings ──────────────────────────────────┐   │
│ │ ✅ Enabled                                             │   │
│ │ ✅ Auto-trigger workflow                              │   │
│ │ Max Executions: [0] (unlimited)                       │   │
│ │ Timeout: [300] seconds                                 │   │
│ │ ✅ Retry on failure ([3] attempts)                    │   │
│ └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### 2. **🎯 TIMER CONTROL PANEL (Ana Gereksinim)**

```typescript
// TimerControlPanel.tsx - Yeni komponent (n8n benzeri)

interface TimerControlState {
  isActive: boolean;
  status: 'initialized' | 'running' | 'stopped' | 'error' | 'completed';
  nextExecution?: string;
  lastExecution?: string;
  executionCount: number;
}
```

**UI Layout (n8n benzeri Timer Control):**
```
┌─────────────────────────────────────────────────────────────┐
│ ⏰ Timer Control                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🟢 [START TIMER]  🔴 [STOP TIMER]  ⚡ [TRIGGER NOW]      │
│                                                             │
│  Status: 🟢 Running • Next: in 45 minutes                  │
│  Schedule: Every 1 hour • Executions: 23                   │
│                                                             │
│ ┌─ Schedule Information ─────────────────────────────────┐   │
│ │ Type: Interval (3600 seconds)                          │   │
│ │ Next Run: 2025-08-05 15:30:00 UTC                     │   │
│ │ Last Run: 2025-08-05 14:30:00 UTC                     │   │
│ │ Total Executions: 23 / ∞                               │   │
│ │ Success Rate: 95.7% (22/23)                           │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌─ Real-time Status ─────────────────────────────────────┐   │
│ │ ⏱️ Countdown: 00:44:23 until next execution            │   │
│ │ 📊 System Status: Active, no errors                   │   │
│ │ 🔄 Auto-restart: Enabled                              │   │
│ │ ⚠️ Max executions: Not reached                        │   │
│ └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### 3. **Timer Execution History & Logs**

```typescript
// TimerExecutionHistory.tsx - Yeni komponent

interface TimerExecution {
  execution_id: string;
  triggered_at: string;
  status: 'success' | 'failed' | 'timeout' | 'retry';
  duration_ms: number;
  error_message?: string;
  retry_count?: number;
}
```

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ 📋 Execution History                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ✅ 2025-08-05 14:30:00 • Success • 2.3s                │ │
│ │    Execution ID: timer_abc123_exec_47                   │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ❌ 2025-08-05 13:30:00 • Failed • 30.0s (timeout)      │ │
│ │    Error: Workflow execution timed out                  │ │
│ │    Retries: 3/3 attempts failed                        │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ✅ 2025-08-05 12:30:00 • Success • 1.8s                │ │
│ │    Execution ID: timer_abc123_exec_45                   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [📄 View All] [🗑️ Clear History] [📊 Export Logs]         │
└─────────────────────────────────────────────────────────────┘
```

#### 4. **Advanced Cron Expression Helper**

```typescript
// CronExpressionHelper.tsx - Yeni komponent

interface CronHelperProps {
  value: string;
  onChange: (expression: string) => void;
}
```

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ 📅 Cron Expression Builder                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Expression: [0 */1 * * *]  [🔍 Validate] [📖 Help]        │
│                                                             │
│ ┌─ Quick Presets ───────────────────────────────────────┐   │
│ │ [Every minute]    [Every hour]     [Daily at 9 AM]    │   │
│ │ [Every Monday]    [Monthly]        [Quarterly]        │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌─ Visual Builder ──────────────────────────────────────┐   │
│ │ Minute:  [0 ▼]     (* = every minute)                 │   │
│ │ Hour:    [*/1 ▼]   (*/1 = every hour)                 │   │
│ │ Day:     [* ▼]     (* = every day)                    │   │
│ │ Month:   [* ▼]     (* = every month)                  │   │
│ │ Weekday: [* ▼]     (* = every weekday)                │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ ✅ Valid: "Runs every hour at minute 0"                    │
│ Next 5 runs:                                               │
│ • 2025-08-05 15:00:00 UTC                                  │
│ • 2025-08-05 16:00:00 UTC                                  │
│ • 2025-08-05 17:00:00 UTC                                  │
│ • 2025-08-05 18:00:00 UTC                                  │
│ • 2025-08-05 19:00:00 UTC                                  │
└─────────────────────────────────────────────────────────────┘
```

#### 5. **Timer Statistics Dashboard**

```typescript
// TimerStatsPanel.tsx - Yeni komponent

interface TimerStats {
  timer_id: string;
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  average_duration_ms: number;
  uptime_percentage: number;
  next_execution: string;
  created_at: string;
}
```

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Timer Statistics                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─ Performance Metrics ─────────────────────────────────┐   │
│ │ Total Executions: 156                                  │   │
│ │ Success Rate: 94.2% (147/156)                         │   │
│ │ Average Duration: 2.1 seconds                          │   │
│ │ Uptime: 99.1% (last 30 days)                          │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌─ Schedule Health ─────────────────────────────────────┐   │
│ │ Schedule Type: Interval (1 hour)                       │   │
│ │ Created: 2025-07-01 10:00:00 UTC                      │   │
│ │ Running For: 35 days                                   │   │
│ │ Next Execution: 2025-08-05 16:00:00 UTC               │   │
│ │ Estimated Completion: N/A (unlimited)                  │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌─ Error Analysis ──────────────────────────────────────┐   │
│ │ Recent Failures: 9 (last 30 days)                     │   │
│ │ Most Common Error: Timeout (6 occurrences)            │   │
│ │ Retry Success Rate: 67% (6/9)                         │   │
│ │ Last Failure: 2025-08-03 14:30:00 UTC                 │   │
│ └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### 6. **Real-time Timer Monitoring**

```typescript
// useTimerMonitoring.ts - Custom hook

export const useTimerMonitoring = (timerId: string) => {
  const [timerStatus, setTimerStatus] = useState<TimerStatus>();
  const [countdown, setCountdown] = useState<number>(0);
  const [isActive, setIsActive] = useState(false);

  // Real-time countdown to next execution
  useEffect(() => {
    const interval = setInterval(() => {
      if (timerStatus?.next_execution) {
        const next = new Date(timerStatus.next_execution);
        const now = new Date();
        const diff = Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000));
        setCountdown(diff);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timerStatus]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const ws = new WebSocket(`/api/timers/${timerId}/stream`);
    
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      setTimerStatus(update);
    };

    return () => ws.close();
  }, [timerId]);

  return { timerStatus, countdown, isActive };
};
```

---

## 🔧 TIMER NODE TECHNICAL IMPLEMENTATION

### 1. **Component Structure (Timer)**

```typescript
// File structure additions:
client/app/components/nodes/
├── triggers/
│   ├── TimerStartNode.tsx              // Ana timer node komponenti
│   ├── TimerStartConfigModal.tsx       // Konfigürasyon modal
│   ├── TimerControlPanel.tsx           // ⭐ START/STOP/TRIGGER kontrolleri
│   ├── CronExpressionHelper.tsx        // Cron expression builder
│   ├── TimerExecutionHistory.tsx       // Execution history & logs
│   ├── TimerStatsPanel.tsx             // İstatistikler ve metrics
│   └── TimerCountdown.tsx              // Real-time countdown widget
└── shared/
    ├── CountdownTimer.tsx              // Reusable countdown component
    ├── CronValidator.tsx               // Cron expression validation
    └── TimezonePicker.tsx              // Timezone selection component
```

### 2. **State Management (Timer)**

```typescript
// useTimerNode.ts
export const useTimerNode = (nodeId: string) => {
  const [config, setConfig] = useState<TimerConfig>();
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<TimerStatus>('initialized');
  const [executions, setExecutions] = useState<TimerExecution[]>([]);
  const [stats, setStats] = useState<TimerStats>();
  const [countdown, setCountdown] = useState<number>(0);
  
  // Backend API calls
  const startTimer = async () => { /* */ };
  const stopTimer = async () => { /* */ };
  const triggerNow = async () => { /* */ };
  const getTimerStatus = async () => { /* */ };
  const getExecutionHistory = async () => { /* */ };
  
  return { 
    config, isActive, status, executions, stats, countdown,
    actions: { startTimer, stopTimer, triggerNow, getTimerStatus, getExecutionHistory }
  };
};
```

### 3. **API Integration (Timer)**

```typescript
// Timer APIs to implement:

// Timer Control APIs
POST   /api/v1/timers/{nodeId}/start          // Start timer (START button)
POST   /api/v1/timers/{nodeId}/stop           // Stop timer (STOP button)  
POST   /api/v1/timers/{nodeId}/trigger        // Manual trigger (TRIGGER NOW button)
GET    /api/v1/timers/{nodeId}/status         // Get current status
GET    /api/v1/timers/{nodeId}/executions     // Get execution history
GET    /api/v1/timers/{nodeId}/stats          // Get timer statistics
GET    /api/v1/timers/{nodeId}/stream         // WebSocket for real-time updates

// Timer Configuration APIs
GET    /api/v1/timers/{nodeId}/config         // Get timer config
POST   /api/v1/timers/{nodeId}/config         // Update timer config
POST   /api/v1/timers/validate-cron           // Validate cron expression
```

### 4. **Backend Integration Points (Timer)**

```typescript
// Backend'deki hazır class:
// /app/nodes/triggers/timer_start_node.py -> TimerStartNode

// TimerStartNode outputs:
{
  timer_data: {
    timer_id: string;
    triggered_at: string;
    schedule_type: string;
    execution_count: number;
    next_run_at: string;
  };
  schedule_info: {
    schedule_type: string;
    next_run: string;
    interval_seconds?: number;
    cron_expression?: string;
    timezone: string;
    enabled: boolean;
  };
  timer_stats: {
    timer_id: string;
    status: string;
    execution_count: number;
    last_execution?: string;
    is_active: boolean;
  };
  timer_control: {
    timer_id: string;
    status: string;
    actions: {
      start: Function;     // UI'da START button
      stop: Function;      // UI'da STOP button  
      trigger_now: Function; // UI'da TRIGGER NOW button
      get_status: Function;
    };
  };
}
```

---

*Bu dokümant, KAI-Fusion'daki Webhook, HTTP ve Timer node'larının n8n kalitesinde UI deneyimi sağlamak için hazırlanmıştır. Tüm backend özellikler hazır olup, sadece frontend implementasyonu gerekmektedir.*

---

## 🌐 WEB SCRAPER NODE UI REQUIREMENTS

### Backend Durumu
✅ **Backend tamamen hazır** - `/app/nodes/document_loaders/web_scraper.py`
✅ **Advanced HTML processing** - BeautifulSoup ile intelligent content cleaning
✅ **Batch URL processing** - Multiple URLs support with concurrent handling
✅ **Content quality validation** - Min length, content filtering
✅ **Error handling & retry logic** - Comprehensive failure recovery
✅ **LangChain integration** - Native Document objects with rich metadata

### UI Gereksinimleri

#### 1. **Web Scraper Configuration Panel**

```typescript
// WebScraperConfigModal.tsx komponenti güncellenmeli

interface WebScraperConfig {
  // URL Input
  urls: string;                                 // Multi-line textarea
  input_urls: any;                             // Connected URLs from other nodes
  
  // Scraping Settings
  user_agent: string;                          // Custom user agent
  remove_selectors: string;                    // CSS selectors to remove
  min_content_length: number;                  // Minimum content length
  
  // Advanced Options
  max_concurrent: number;                      // Concurrent processing limit
  timeout_seconds: number;                     // Request timeout
  retry_attempts: number;                      // Retry failed requests
}
```

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ 🌐 Web Scraper Configuration                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ URLs to Scrape:                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ https://example.com/article1                            │ │
│ │ https://example.com/article2                            │ │
│ │ https://news.example.com/tech-news                      │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│ [📋 Paste URLs] [🔗 Import from File] [✨ Auto-detect]    │
│                                                             │
│ ┌─ Content Filtering ───────────────────────────────────┐   │
│ │ Remove Elements: [nav,footer,header,ads] [📖 Help]    │   │
│ │ Min Content Length: [100] characters                   │   │
│ │ User Agent: [Default KAI-Fusion] [📝 Custom]          │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌─ Advanced Settings ───────────────────────────────────┐   │
│ │ Concurrent Requests: [5] (1-10)                       │   │
│ │ Request Timeout: [30] seconds                          │   │
│ │ Retry Attempts: [3] times                              │   │
│ │ ✅ Follow redirects                                    │   │
│ │ ✅ Respect robots.txt                                  │   │
│ └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### 2. **🎯 SCRAPE & PREVIEW BUTTON (Ana Gereksinim)**

```typescript
// WebScraperTestPanel.tsx - Yeni komponent (n8n benzeri)

interface WebScraperTestState {
  isScraping: boolean;
  results: ScrapedDocument[];
  progress: number;
  currentUrl?: string;
  errors: ScrapingError[];
}

interface ScrapedDocument {
  url: string;
  title?: string;
  content: string;
  contentLength: number;
  domain: string;
  scrapedAt: string;
  status: 'success' | 'failed' | 'processing';
}
```

**UI Layout (n8n benzeri Test & Preview):**
```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 Test & Preview Scraping                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ⚡ [SCRAPE URLS]  👁️ [PREVIEW CONTENT]  📊 [TEST MODE]   │
│                                                             │
│  Status: 🟢 Ready • 3 URLs to scrape                       │
│  Progress: ████████████░░░░░░░░ 60% (2/3 completed)       │
│                                                             │
│ ┌─ Scraping Results ────────────────────────────────────┐   │
│ │ ✅ example.com/article1 • 2.1KB • 1.2s                │   │
│ │    Title: "AI in Modern Web Development"               │   │
│ │    Content: "Artificial intelligence is revolutio..."  │   │
│ │    [👁️ Preview] [📋 Copy Content] [🔗 Open URL]       │   │
│ │                                                         │   │
│ │ ⏳ example.com/article2 • Processing...                │   │
│ │                                                         │   │
│ │ ❌ invalid-url.com • Failed                            │   │
│ │    Error: Connection timeout after 30 seconds         │   │
│ │    [🔄 Retry] [⚙️ Adjust Settings]                     │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ Summary: 1 success, 1 processing, 1 failed                 │
│ Total Content: 2.1KB extracted                             │
└─────────────────────────────────────────────────────────────┘
```

#### 3. **Content Preview & Quality Assessment**

```typescript
// ContentPreviewPanel.tsx - Yeni komponent

interface ContentPreview {
  url: string;
  originalHtml: string;
  cleanedContent: string;
  removedElements: string[];
  qualityScore: number;
  contentStats: ContentStats;
}

interface ContentStats {
  wordCount: number;
  paragraphCount: number;
  codeBlocksRemoved: number;
  adsRemoved: number;
  navigationRemoved: number;
}
```

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ 👁️ Content Preview & Quality Assessment                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ URL: https://example.com/article1                           │
│ Quality Score: ⭐⭐⭐⭐⭐ 92/100 (Excellent)               │
│                                                             │
│ [Original HTML] [Cleaned Content] [Removed Elements]       │
│                                                             │
│ ┌─ Cleaned Content ─────────────────────────────────────┐   │
│ │ AI in Modern Web Development                           │   │
│ │                                                         │   │
│ │ Artificial intelligence is revolutionizing the way    │   │
│ │ we build and interact with web applications. From     │   │
│ │ automated code generation to intelligent user         │   │
│ │ interfaces, AI is becoming an integral part of...     │   │
│ │                                                         │   │
│ │ [Show Full Content] [📋 Copy Text] [📝 Edit]          │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌─ Content Statistics ──────────────────────────────────┐   │
│ │ Words: 2,456 • Paragraphs: 18 • Readability: High    │   │
│ │ Removed: 12 nav items, 8 ads, 3 code blocks          │   │
│ │ Language: English • Reading time: ~10 minutes         │   │
│ └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### 4. **CSS Selector Helper & Content Filtering**

```typescript
// CssSelectorHelper.tsx - Yeni komponent

interface CssSelectorHelperProps {
  url: string;
  onSelectorsChange: (selectors: string[]) => void;
}
```

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ 🎨 CSS Selector Helper                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Remove unwanted elements using CSS selectors:              │
│                                                             │
│ ┌─ Quick Presets ───────────────────────────────────────┐   │
│ │ [🚫 Navigation] [📱 Social Media] [📺 Advertisements] │   │
│ │ [👤 Comments] [📊 Analytics] [🍪 Cookie Banners]     │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ Custom Selectors:                                           │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ nav, footer, header, .ads, .comments, .social-share    │ │
│ │ .cookie-banner, .newsletter-popup, aside               │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─ Live Preview ────────────────────────────────────────┐   │
│ │ URL: https://example.com/test                          │   │
│ │ Elements to remove: 🚫 23 matches found               │   │
│ │ • nav.main-navigation (1 match)                       │   │
│ │ • .ads (8 matches)                                     │   │
│ │ • .comments-section (1 match)                         │   │
│ │ • footer (1 match)                                     │   │
│ │ [🔍 Highlight] [✅ Apply] [❌ Clear All]               │   │
│ └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### 5. **Batch URL Management**

```typescript
// BatchUrlManager.tsx - Yeni komponent

interface BatchUrlState {
  urls: UrlEntry[];
  totalUrls: number;
  validUrls: number;
  invalidUrls: number;
  duplicateUrls: number;
}

interface UrlEntry {
  url: string;
  status: 'valid' | 'invalid' | 'duplicate' | 'processing' | 'completed' | 'failed';
  domain: string;
  title?: string;
  contentLength?: number;
  error?: string;
}
```

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ 📋 Batch URL Management                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ [📁 Import File] [📋 Paste URLs] [🔗 Add Single URL]      │
│                                                             │
│ URL Validation: ✅ 15 valid • ❌ 2 invalid • 🔄 1 duplicate│
│                                                             │
│ ┌─ URL List ────────────────────────────────────────────┐   │
│ │ ✅ https://example.com/article1                        │   │
│ │    📊 2.1KB • example.com • Completed                 │   │
│ │    [👁️ Preview] [🗑️ Remove]                           │   │
│ │                                                         │   │
│ │ ⏳ https://example.com/article2                        │   │
│ │    🔄 Processing... • example.com                     │   │
│ │    [⏸️ Pause] [🗑️ Remove]                             │   │
│ │                                                         │   │
│ │ ❌ https://invalid-site.com/page                       │   │
│ │    💥 DNS resolution failed                            │   │
│ │    [🔄 Retry] [⚙️ Fix URL] [🗑️ Remove]                │   │
│ │                                                         │   │
│ │ 🔄 http://duplicate.com/page                           │   │
│ │    ⚠️ Duplicate of entry #3                           │   │
│ │    [🔗 Merge] [🗑️ Remove]                             │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ [🚀 Start All] [⏸️ Pause All] [❌ Clear Failed]           │
│ [📊 Export Results] [⚙️ Batch Settings]                   │
└─────────────────────────────────────────────────────────────┘
```

#### 6. **Real-time Scraping Progress & Statistics**

```typescript
// ScrapingProgressPanel.tsx - Yeni komponent

interface ScrapingProgress {
  totalUrls: number;
  completedUrls: number;
  failedUrls: number;
  currentUrl?: string;
  startTime: Date;
  estimatedTimeRemaining: number;
  avgProcessingTime: number;
  totalContentExtracted: number;
}
```

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Real-time Scraping Progress                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Progress: ██████████████░░░░░░ 73% (11/15 URLs)           │
│                                                             │
│ Currently Processing:                                       │
│ 🔄 https://example.com/long-article.html                   │
│ ⏱️ Processing time: 00:00:15 • Avg: 2.3s per URL          │
│                                                             │
│ ┌─ Session Statistics ──────────────────────────────────┐   │
│ │ ✅ Successful: 10 URLs                                 │   │
│ │ ❌ Failed: 1 URL                                       │   │
│ │ ⏳ Remaining: 4 URLs                                   │   │
│ │ 📊 Content Extracted: 45.7 KB                         │   │
│ │ ⏱️ Total Time: 00:03:21                               │   │
│ │ 🚀 ETA: 00:00:32 remaining                            │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌─ Performance Metrics ─────────────────────────────────┐   │
│ │ Avg Speed: 3.3 URLs/minute                            │   │
│ │ Success Rate: 90.9% (10/11)                           │   │
│ │ Avg Content Size: 4.1 KB per page                     │   │
│ │ Network Efficiency: 95% uptime                        │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ [⏸️ Pause] [⏹️ Stop] [📊 Export Report]                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 WEB SCRAPER TECHNICAL IMPLEMENTATION

### 1. **Component Structure (Web Scraper)**

```typescript
// File structure additions:
client/app/components/nodes/
├── document_loaders/
│   ├── WebScraperNode.tsx              // Ana web scraper node komponenti
│   ├── WebScraperConfigModal.tsx       // Konfigürasyon modal
│   ├── WebScraperTestPanel.tsx         // ⭐ SCRAPE & PREVIEW özelliği
│   ├── ContentPreviewPanel.tsx         // Content preview & quality assessment
│   ├── CssSelectorHelper.tsx           // CSS selector builder & tester
│   ├── BatchUrlManager.tsx             // Batch URL processing management
│   └── ScrapingProgressPanel.tsx       // Real-time progress & statistics
└── shared/
    ├── UrlValidator.tsx                // URL validation component
    ├── ContentQualityIndicator.tsx     // Content quality assessment
    └── DomainExtractor.tsx             // Domain analysis utilities
```

### 2. **State Management (Web Scraper)**

```typescript
// useWebScraperNode.ts
export const useWebScraperNode = (nodeId: string) => {
  const [config, setConfig] = useState<WebScraperConfig>();
  const [isScraping, setIsScraping] = useState(false);
  const [progress, setProgress] = useState<ScrapingProgress>();
  const [results, setResults] = useState<ScrapedDocument[]>([]);
  const [previewContent, setPreviewContent] = useState<ContentPreview>();
  
  // Backend API calls
  const scrapeUrls = async (urls: string[], config: WebScraperConfig) => { /* */ };
  const previewUrl = async (url: string, selectors: string[]) => { /* */ };
  const validateUrls = async (urls: string[]) => { /* */ };
  const testSelectors = async (url: string, selectors: string[]) => { /* */ };
  
  return { 
    config, isScraping, progress, results, previewContent,
    actions: { scrapeUrls, previewUrl, validateUrls, testSelectors }
  };
};
```

### 3. **API Integration (Web Scraper)**

```typescript
// Web Scraper APIs to implement:

// Scraping Control APIs
POST   /api/v1/web-scraper/{nodeId}/scrape        // Start scraping (SCRAPE button)
POST   /api/v1/web-scraper/{nodeId}/preview       // Preview single URL content
POST   /api/v1/web-scraper/{nodeId}/test          // Test CSS selectors on URL
GET    /api/v1/web-scraper/{nodeId}/progress      // Get scraping progress
GET    /api/v1/web-scraper/{nodeId}/results       // Get scraping results

// URL Management APIs
POST   /api/v1/web-scraper/validate-urls          // Validate batch URLs
POST   /api/v1/web-scraper/extract-content        // Extract content with custom selectors
GET    /api/v1/web-scraper/{nodeId}/history       // Get scraping history
```

### 4. **Backend Integration Points (Web Scraper)**

```typescript
// Backend'deki hazır class:
// /app/nodes/document_loaders/web_scraper.py -> WebScraperNode

// WebScraperNode inputs:
{
  urls: string;                    // Multi-line URLs
  input_urls: any;                 // Connected URLs
  user_agent: string;              // Custom user agent  
  remove_selectors: string;        // CSS selectors to remove
  min_content_length: number;      // Content length filter
}

// WebScraperNode outputs:
{
  documents: [
    {
      page_content: string;        // Cleaned text content
      metadata: {
        source: string;            // Original URL
        domain: string;            // Extracted domain
        doc_id: string;            // Unique document ID
        content_length: number;    // Content length
        scrape_timestamp: string;  // Processing time
      }
    }
  ]
}
```

---

**✅ TAMAMLANAN ÖZELLİKLER:**
1. **🌐 SCRAPE & PREVIEW** (Web Scraper) - Content scraping ve preview ✅
2. **⏰ TIMER CONTROLS** (Timer) - START/STOP/TRIGGER NOW buttons ✅
3. **🎯 LISTEN Button** (Webhook) - Real-time event listening ✅
4. **🎯 SEND/TEST Button** (HTTP) - Request testing ✅
5. **🎨 CSS Selector Helper** (Web Scraper) - Visual selector builder ✅
6. **📅 Cron Expression Helper** (Timer) - Visual cron builder ✅
7. **📋 cURL Import** (HTTP) - Import cURL commands ✅
8. **📊 Real-time Dashboards** - Statistics ve monitoring panelleri ✅

*Bu dokümant, KAI-Fusion'daki Webhook, HTTP, Timer ve Web Scraper node'larının n8n kalitesinde UI deneyimi sağlamak için hazırlanmıştır. Tüm backend özellikler hazır olup, sadece frontend implementasyonu gerekmektedir.*