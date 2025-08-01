# KAI-Fusion Complete Node UI Specifications

> **Comprehensive specification for ALL workflow node UI components and database requirements**

[![KAI-Fusion](https://img.shields.io/badge/Platform-KAI--Fusion-blue.svg)](https://github.com/KAI-Fusion)
[![Enterprise](https://img.shields.io/badge/Level-Enterprise%20Ready-green.svg)](./)
[![Nodes](https://img.shields.io/badge/Nodes-29%20Total-blue.svg)](./)

## 📋 Table of Contents

### 🚀 Trigger Nodes
- [WebhookTrigger](#webhooktrigger) (Unified webhook node)
- [TimerStartNode](#timerstartnode)

### 🌐 HTTP & Integration
- [HttpRequestNode](#httprequestnode)
- [HttpClientNode](#httpclientnode)

### 📄 Document Processing
- [WebScraper Node](#webscraper-node)
- [ChunkSplitter Node](#chunksplitter-node)

### 🧠 Embeddings & AI
- [OpenAIEmbedder Node](#openaiembedder-node)
- [RerankerNode](#rerankernode)

### 🗄️ Storage & Retrieval
- [PGVectorStore Node](#pgvectorstore-node)
- [RetrievalQA Node](#retrievalqa-node)

### 📊 System
- [Database Schema](#database-schema)
- [Credential Management](#credential-management)

---

## ⏰ TimerStartNode

### UI Component Specification

#### **Input Fields:**
```javascript
{
  // Timer Type
  timer_type: {
    type: "select",
    label: "Timer Type",
    default: "interval",
    options: [
      { value: "interval", label: "Recurring Interval" },
      { value: "cron", label: "Cron Schedule" },
      { value: "once", label: "One-time Delay" }
    ]
  },
  
  // Interval Configuration
  interval_seconds: {
    type: "number",
    label: "Interval (seconds)",
    default: 60,
    min: 1,
    max: 86400,
    show_when: "timer_type === 'interval'",
    help: "Repeat every N seconds"
  },
  
  // Cron Configuration
  cron_expression: {
    type: "text",
    label: "Cron Expression",
    placeholder: "0 */5 * * * *",
    show_when: "timer_type === 'cron'",
    help: "6-field cron: second minute hour day month weekday",
    validation: "cron"
  },
  
  // One-time Configuration
  delay_seconds: {
    type: "number",
    label: "Delay (seconds)",
    default: 10,
    min: 1,
    max: 86400,
    show_when: "timer_type === 'once'",
    help: "Execute once after delay"
  },
  
  // Common Fields
  timezone: {
    type: "select",
    label: "Timezone",
    default: "UTC",
    options: [
      { value: "UTC", label: "UTC" },
      { value: "Europe/Istanbul", label: "Europe/Istanbul" },
      { value: "America/New_York", label: "America/New_York" },
      { value: "Asia/Tokyo", label: "Asia/Tokyo" }
    ]
  },
  
  max_executions: {
    type: "number",
    label: "Max Executions",
    default: 0,
    min: 0,
    help: "0 = unlimited"
  },
  
  enabled: {
    type: "checkbox",
    label: "Timer Enabled",
    default: true,
    help: "Start/stop timer execution"
  }
}
```

#### **Node Properties:**
```javascript
{
  category: "triggers", 
  color: "#9C27B0",
  icon: "⏰",
  handles: {
    inputs: [],
    outputs: ["timer_data"]
  },
  isStartNode: true
}
```

---

## 🔗 WebhookTrigger

### UI Component Specification
> **UNIFIED WEBHOOK NODE** - Can start workflows OR trigger mid-flow

#### **Input Fields:**
```javascript
{
  // Auto-generated Fields (Read-only)
  webhook_endpoint: {
    type: "text",
    label: "Webhook URL",
    readonly: true,
    value: "https://api.kai-fusion.com/api/webhooks/wh_{{generated_id}}",
    help: "Auto-generated webhook endpoint",
    copyable: true
  },
  
  webhook_token: {
    type: "text", 
    label: "Webhook Token",
    readonly: true,
    value: "{{auto_generated_token}}",
    help: "Security token for webhook validation",
    copyable: true,
    masked: true
  },
  
  // Security Configuration
  authentication_required: {
    type: "checkbox",
    label: "Require Authentication",
    default: true,
    help: "Require bearer token authentication"
  },
  
  allowed_event_types: {
    type: "text",
    label: "Allowed Event Types",
    placeholder: "webhook.received,user.created",
    help: "Comma-separated list (empty = all allowed)"
  },
  
  // Performance & Limits
  max_payload_size: {
    type: "number",
    label: "Max Payload Size (KB)",
    default: 1024,
    min: 1,
    max: 10240,
    help: "Maximum payload size limit"
  },
  
  rate_limit_per_minute: {
    type: "number",
    label: "Rate Limit (per minute)",
    default: 60,
    min: 0,
    max: 1000,
    help: "0 = no limit"
  },
  
  webhook_timeout: {
    type: "number",
    label: "Timeout (seconds)",
    default: 30,
    min: 5,
    max: 300,
    help: "Webhook processing timeout"
  },
  
  // CORS Configuration
  enable_cors: {
    type: "checkbox",
    label: "Enable CORS",
    default: true,
    help: "Allow cross-origin requests"
  },
  
  // Node Behavior
  node_behavior: {
    type: "select",
    label: "Node Behavior",
    default: "auto",
    options: [
      { value: "auto", label: "Auto (start if no inputs)" },
      { value: "start_only", label: "Start workflows only" },
      { value: "trigger_only", label: "Mid-flow trigger only" }
    ],
    help: "How this node behaves in workflow"
  }
}
```

#### **Node Properties:**
```javascript
{
  category: "triggers",
  color: "#3b82f6",
  icon: "🔗",
  handles: {
    inputs: ["input"], // Optional for mid-flow
    outputs: ["webhook_data", "webhook_config"]
  },
  isStartNode: "conditional", // Can be start or mid-flow
  isTerminator: true
}
```

#### **Database Requirements:**
```sql
-- Webhook endpoint storage
CREATE TABLE webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES workflows(id),
    node_id VARCHAR(100) NOT NULL,
    webhook_id VARCHAR(50) UNIQUE NOT NULL,
    endpoint_path VARCHAR(255) NOT NULL,
    secret_token TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    last_triggered TIMESTAMP
);

-- Webhook events log
CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id VARCHAR(50) REFERENCES webhook_endpoints(webhook_id),
    event_type VARCHAR(100),
    payload JSONB,
    source_ip INET,
    user_agent TEXT,
    correlation_id UUID,
    processed_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_webhook_endpoints_workflow ON webhook_endpoints(workflow_id);
CREATE INDEX idx_webhook_events_webhook_id ON webhook_events(webhook_id);
CREATE INDEX idx_webhook_events_timestamp ON webhook_events(processed_at);
```

---

## 🌐 HttpRequestNode

### UI Component Specification

#### **Input Fields:**
```javascript
{
  // Request Configuration
  url: {
    type: "url",
    label: "Request URL",
    placeholder: "https://api.example.com/endpoint",
    required: true,
    templatable: true,
    help: "Supports {{variable}} templating"
  },
  
  method: {
    type: "select",
    label: "HTTP Method",
    default: "GET",
    options: [
      { value: "GET", label: "GET" },
      { value: "POST", label: "POST" },
      { value: "PUT", label: "PUT" },
      { value: "PATCH", label: "PATCH" },
      { value: "DELETE", label: "DELETE" }
    ]
  },
  
  // Headers
  headers: {
    type: "key_value",
    label: "Headers",
    default: [
      { key: "Content-Type", value: "application/json" }
    ],
    help: "Request headers"
  },
  
  // Authentication
  auth_type: {
    type: "select",
    label: "Authentication",
    default: "none",
    options: [
      { value: "none", label: "None" },
      { value: "bearer", label: "Bearer Token" },
      { value: "basic", label: "Basic Auth" },
      { value: "api_key", label: "API Key" },
      { value: "oauth", label: "OAuth 2.0" }
    ]
  },
  
  bearer_token: {
    type: "password",
    label: "Bearer Token", 
    show_when: "auth_type === 'bearer'",
    templatable: true
  },
  
  basic_username: {
    type: "text",
    label: "Username",
    show_when: "auth_type === 'basic'"
  },
  
  basic_password: {
    type: "password",
    label: "Password",
    show_when: "auth_type === 'basic'"
  },
  
  // Body
  body_type: {
    type: "select",
    label: "Body Type",
    default: "json",
    show_when: "method !== 'GET'",
    options: [
      { value: "json", label: "JSON" },
      { value: "form", label: "Form Data" },
      { value: "text", label: "Raw Text" },
      { value: "file", label: "File Upload" }
    ]
  },
  
  json_body: {
    type: "json_editor",
    label: "JSON Body",
    show_when: "body_type === 'json'",
    templatable: true,
    default: "{}"
  },
  
  // Advanced
  timeout: {
    type: "number",
    label: "Timeout (seconds)",
    default: 30,
    min: 1,
    max: 300
  },
  
  retry_count: {
    type: "number",
    label: "Retry Count",
    default: 3,
    min: 0,
    max: 10
  },
  
  follow_redirects: {
    type: "checkbox",
    label: "Follow Redirects",
    default: true
  },
  
  verify_ssl: {
    type: "checkbox",
    label: "Verify SSL",
    default: true
  }
}
```

#### **Node Properties:**
```javascript
{
  category: "tools",
  color: "#2196F3",
  icon: "🌐",
  handles: {
    inputs: ["trigger"],
    outputs: ["response", "error"]
  }
}
```

---

## 🔧 HttpClientNode

### UI Component Specification

#### **Input Fields:**
```javascript
{
  // Simple HTTP Client
  base_url: {
    type: "url",
    label: "Base URL",
    placeholder: "https://api.example.com",
    help: "Base URL for all requests"
  },
  
  default_headers: {
    type: "key_value",
    label: "Default Headers",
    help: "Headers for all requests"
  },
  
  connection_timeout: {
    type: "number",
    label: "Connection Timeout",
    default: 10,
    min: 1,
    max: 60,
    help: "Connection timeout in seconds"
  },
  
  read_timeout: {
    type: "number",
    label: "Read Timeout", 
    default: 30,
    min: 1,
    max: 300,
    help: "Read timeout in seconds"
  },
  
  max_retries: {
    type: "number",
    label: "Max Retries",
    default: 3,
    min: 0,
    max: 10
  },
  
  retry_backoff: {
    type: "number",
    label: "Retry Backoff (seconds)",
    default: 1,
    min: 0.1,
    max: 60,
    step: 0.1
  }
}
```

#### **Node Properties:**
```javascript
{
  category: "tools",
  color: "#607D8B",
  icon: "🔧",
  handles: {
    inputs: ["config"],
    outputs: ["client"]
  }
}
```

---

## 🌐 WebScraper Node

### UI Component Specification

#### **Input Fields:**
```javascript
{
  // Required Fields
  url: {
    type: "url",
    label: "Target URL",
    placeholder: "https://example.com",
    required: true,
    validation: "Must be valid URL"
  },
  
  // Optional Fields
  max_pages: {
    type: "number",
    label: "Maximum Pages",
    default: 10,
    min: 1,
    max: 100,
    help: "Number of pages to scrape"
  },
  
  depth: {
    type: "select",
    label: "Crawl Depth",
    default: 1,
    options: [
      { value: 1, label: "Shallow (1 level)" },
      { value: 2, label: "Medium (2 levels)" },
      { value: 3, label: "Deep (3 levels)" }
    ]
  },
  
  wait_time: {
    type: "number",
    label: "Wait Time (seconds)",
    default: 2,
    min: 0,
    max: 10,
    step: 0.5,
    help: "Delay between requests"
  },
  
  user_agent: {
    type: "text",
    label: "User Agent",
    default: "KAI-Fusion-WebScraper/1.0",
    help: "Browser identification string"
  }
}
```

#### **Node Properties:**
```javascript
{
  category: "document_loaders",
  color: "#4CAF50",
  icon: "🌐",
  handles: {
    inputs: [],
    outputs: ["documents"]
  }
}
```

### Database Schema
```sql
-- No specific DB table needed (processes data in memory)
-- Output: List of Document objects
```

---

## ✂️ ChunkSplitter Node

### UI Component Specification

#### **Input Fields:**
```javascript
{
  // Required Fields
  chunk_size: {
    type: "number",
    label: "Chunk Size (characters)",
    default: 1000,
    min: 100,
    max: 4000,
    help: "Maximum characters per chunk"
  },
  
  chunk_overlap: {
    type: "number", 
    label: "Chunk Overlap",
    default: 200,
    min: 0,
    max: 500,
    help: "Characters overlap between chunks"
  },
  
  // Optional Fields
  separator: {
    type: "select",
    label: "Split Method",
    default: "recursive",
    options: [
      { value: "recursive", label: "Recursive Character Split" },
      { value: "sentence", label: "Sentence Boundary" },
      { value: "paragraph", label: "Paragraph Boundary" },
      { value: "token", label: "Token Based" }
    ]
  },
  
  keep_separator: {
    type: "checkbox",
    label: "Keep Separators",
    default: true,
    help: "Preserve separator characters"
  },
  
  strip_whitespace: {
    type: "checkbox", 
    label: "Strip Whitespace",
    default: true,
    help: "Remove extra whitespace"
  }
}
```

#### **Node Properties:**
```javascript
{
  category: "text_processing",
  color: "#FF9800",
  icon: "✂️",
  handles: {
    inputs: ["documents"],
    outputs: ["chunks"]
  }
}
```

---

## 🧠 OpenAIEmbedder Node

### UI Component Specification

#### **Input Fields:**
```javascript
{
  // Required Fields
  credential_id: {
    type: "credential_select",
    label: "OpenAI Credential",
    credential_type: "openai",
    required: true,
    help: "Select OpenAI API credential"
  },
  
  // Optional Fields
  model: {
    type: "select",
    label: "Embedding Model",
    default: "text-embedding-3-small",
    options: [
      { value: "text-embedding-3-small", label: "text-embedding-3-small (1536 dim)" },
      { value: "text-embedding-3-large", label: "text-embedding-3-large (3072 dim)" },
      { value: "text-embedding-ada-002", label: "text-embedding-ada-002 (1536 dim)" }
    ]
  },
  
  batch_size: {
    type: "number",
    label: "Batch Size",
    default: 100,
    min: 1,
    max: 1000,
    help: "Documents per API request"
  },
  
  dimensions: {
    type: "number",
    label: "Output Dimensions",
    default: 1536,
    min: 1,
    max: 3072,
    help: "Vector dimensions (model dependent)"
  }
}
```

#### **Node Properties:**
```javascript
{
  category: "embeddings",
  color: "#9C27B0",
  icon: "🧠",
  handles: {
    inputs: ["chunks"],
    outputs: ["embeddings"]
  }
}
```

---

## 🗄️ PGVectorStore Node

### UI Component Specification

#### **Input Fields:**
```javascript
{
  // Required Fields
  credential_id: {
    type: "credential_select",
    label: "Database Credential",
    credential_type: "database",
    required: true,
    help: "PostgreSQL database with pgvector"
  },
  
  collection_name: {
    type: "text",
    label: "Collection Name", 
    default: "documents",
    required: true,
    pattern: "^[a-zA-Z][a-zA-Z0-9_]*$",
    help: "Table name for storing vectors"
  },
  
  // Optional Fields
  embedding_dimension: {
    type: "select",
    label: "Vector Dimension",
    default: 1536,
    options: [
      { value: 384, label: "384 (MiniLM)" },
      { value: 768, label: "768 (BERT)" },
      { value: 1536, label: "1536 (OpenAI small)" },
      { value: 3072, label: "3072 (OpenAI large)" }
    ]
  },
  
  distance_strategy: {
    type: "select",
    label: "Distance Function",
    default: "cosine",
    options: [
      { value: "cosine", label: "Cosine Similarity" },
      { value: "euclidean", label: "Euclidean Distance" },
      { value: "inner_product", label: "Inner Product" }
    ]
  },
  
  create_extension: {
    type: "checkbox",
    label: "Create pgvector Extension",
    default: true,
    help: "Auto-create pgvector extension if needed"
  },
  
  pre_delete_collection: {
    type: "checkbox",
    label: "Clear Existing Data",
    default: false,
    help: "Delete existing collection before storing"
  }
}
```

#### **Node Properties:**
```javascript
{
  category: "vector_stores",
  color: "#2196F3",
  icon: "🗄️", 
  handles: {
    inputs: ["embeddings"],
    outputs: ["vector_store"]
  }
}
```

### Database Schema
```sql
-- Auto-created table structure
CREATE TABLE IF NOT EXISTS {collection_name} (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT,
    metadata JSONB,
    embedding VECTOR({embedding_dimension}),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast vector search
CREATE INDEX IF NOT EXISTS {collection_name}_embedding_idx 
ON {collection_name} 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Metadata index for filtering
CREATE INDEX IF NOT EXISTS {collection_name}_metadata_idx 
ON {collection_name} 
USING GIN (metadata);
```

---

## 🎯 RerankerNode

### UI Component Specification

#### **Input Fields:**
```javascript
{
  // Reranker Service
  reranker_type: {
    type: "select",
    label: "Reranker Service",
    default: "cohere",
    options: [
      { value: "cohere", label: "Cohere Rerank" },
      { value: "jina", label: "Jina AI Reranker" },
      { value: "sentence_transformers", label: "SentenceTransformers" },
      { value: "cross_encoder", label: "Cross Encoder" }
    ]
  },
  
  // Credential
  credential_id: {
    type: "credential_select",
    label: "API Credential",
    credential_type: "reranker",
    required: true,
    show_when: "reranker_type === 'cohere' || reranker_type === 'jina'",
    help: "API key for reranking service"
  },
  
  // Model Configuration
  model_name: {
    type: "select",
    label: "Rerank Model",
    default: "rerank-english-v2.0",
    options: [
      { value: "rerank-english-v2.0", label: "Cohere English v2.0" },
      { value: "rerank-multilingual-v2.0", label: "Cohere Multilingual v2.0" },
      { value: "jina-reranker-v1-base-en", label: "Jina Base EN" },
      { value: "ms-marco-MiniLM-L-12-v2", label: "MiniLM Cross Encoder" }
    ],
    dynamic_options: "based_on_reranker_type"
  },
  
  // Ranking Parameters
  top_k: {
    type: "number",
    label: "Top K Results",
    default: 10,
    min: 1,
    max: 100,
    help: "Number of top results to return"
  },
  
  return_documents: {
    type: "checkbox",
    label: "Return Documents",
    default: true,
    help: "Include document content in response"
  },
  
  max_chunks_per_doc: {
    type: "number",
    label: "Max Chunks per Document",
    default: 3,
    min: 1,
    max: 20,
    help: "Limit chunks per source document"
  },
  
  // Advanced Settings
  batch_size: {
    type: "number",
    label: "Batch Size",
    default: 100,
    min: 1,
    max: 1000,
    help: "Process documents in batches"
  },
  
  relevance_threshold: {
    type: "number",
    label: "Relevance Threshold",
    default: 0.5,
    min: 0,
    max: 1,
    step: 0.1,
    help: "Minimum relevance score"
  },
  
  normalize_scores: {
    type: "checkbox",
    label: "Normalize Scores",
    default: true,
    help: "Normalize relevance scores 0-1"
  }
}
```

#### **Node Properties:**
```javascript
{
  category: "retrieval",
  color: "#E91E63",
  icon: "🎯",
  handles: {
    inputs: ["documents", "query"],
    outputs: ["ranked_documents"]
  }
}
```

---

## 🔍 RetrievalQA Node

### UI Component Specification

#### **Input Fields:**
```javascript
{
  // Required Fields
  retriever_type: {
    type: "select",
    label: "Retrieval Method",
    default: "similarity",
    options: [
      { value: "similarity", label: "Similarity Search" },
      { value: "mmr", label: "Maximum Marginal Relevance" },
      { value: "similarity_score_threshold", label: "Score Threshold" }
    ]
  },
  
  // Optional Fields
  k: {
    type: "number",
    label: "Top K Results",
    default: 5,
    min: 1,
    max: 50,
    help: "Number of documents to retrieve"
  },
  
  score_threshold: {
    type: "number",
    label: "Score Threshold",
    default: 0.5,
    min: 0,
    max: 1,
    step: 0.1,
    help: "Minimum similarity score",
    show_when: "retriever_type === 'similarity_score_threshold'"
  },
  
  fetch_k: {
    type: "number",
    label: "Fetch K",
    default: 20,
    min: 1,
    max: 100,
    help: "Initial documents to fetch for MMR",
    show_when: "retriever_type === 'mmr'"
  },
  
  lambda_mult: {
    type: "number",
    label: "Lambda Multiplier",
    default: 0.5,
    min: 0,
    max: 1,
    step: 0.1,
    help: "Diversity vs relevance balance",
    show_when: "retriever_type === 'mmr'"
  },
  
  return_source_documents: {
    type: "checkbox",
    label: "Return Source Documents",
    default: true,
    help: "Include source documents in response"
  },
  
  chain_type: {
    type: "select",
    label: "Chain Type",
    default: "stuff",
    options: [
      { value: "stuff", label: "Stuff (All context)" },
      { value: "map_reduce", label: "Map Reduce" },
      { value: "refine", label: "Refine" },
      { value: "map_rerank", label: "Map Rerank" }
    ]
  }
}
```

#### **Node Properties:**
```javascript
{
  category: "retrieval",
  color: "#673AB7",
  icon: "🔍",
  handles: {
    inputs: ["vector_store", "llm"],
    outputs: ["qa_chain"]
  }
}
```

---

## 🗃️ Database Schema

### User Credentials Table
```sql
CREATE TABLE user_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'openai', 'database', 'tavily'
    encrypted_data JSONB NOT NULL, -- Encrypted credential data
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Database credential structure
{
  "type": "database",
  "host": "db.supabase.co", 
  "port": 5432,
  "database": "postgres",
  "username": "postgres",
  "password": "encrypted_password"
}

-- OpenAI credential structure  
{
  "type": "openai",
  "api_key": "encrypted_api_key",
  "organization": "optional_org_id"
}
```

### Workflow Metadata Table
```sql
CREATE TABLE workflow_rag_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES workflows(id),
    collection_name VARCHAR(255),
    embedding_model VARCHAR(100),
    vector_dimension INTEGER,
    document_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT NOW()
);
```

---

## 🔐 Credential Management

### Credential Types

#### **1. Database Credential (PostgreSQL/Supabase)**
```javascript
{
  id: "uuid",
  name: "Supabase Production DB",
  type: "database",
  fields: {
    host: "db.xxxxx.supabase.co",
    port: 5432,
    database: "postgres", 
    username: "postgres",
    password: "encrypted_password",
    ssl_mode: "require"
  }
}
```

#### **2. OpenAI Credential**
```javascript
{
  id: "uuid", 
  name: "OpenAI Production",
  type: "openai",
  fields: {
    api_key: "encrypted_sk-...",
    organization: "optional_org_id",
    base_url: "https://api.openai.com/v1" // optional
  }
}
```

#### **3. Reranker Credential (Cohere/Jina)**
```javascript
{
  id: "uuid",
  name: "Cohere Rerank API",
  type: "reranker",
  fields: {
    api_key: "encrypted_co-...",
    provider: "cohere", // or "jina"
    base_url: "https://api.cohere.ai/v1" // optional
  }
}
```

#### **4. Webhook Credential**
```javascript
{
  id: "uuid",
  name: "Webhook Security Token",
  type: "webhook",
  fields: {
    token: "encrypted_webhook_token",
    secret: "encrypted_signing_secret"
  }
}
```

#### **5. HTTP API Credential**
```javascript
{
  id: "uuid",
  name: "External API Access",
  type: "http_api",
  fields: {
    api_key: "encrypted_api_key",
    api_secret: "encrypted_api_secret",
    base_url: "https://api.example.com",
    auth_type: "bearer" // or "basic", "api_key"
  }
}
```

### UI Credential Selector
```javascript
const CredentialSelect = ({ 
  value, 
  onChange, 
  credentialType, 
  required = false 
}) => {
  const credentials = useCredentials(credentialType);
  
  return (
    <div className="credential-select">
      <select value={value} onChange={onChange} required={required}>
        <option value="">Select {credentialType} credential</option>
        {credentials.map(cred => (
          <option key={cred.id} value={cred.id}>
            {cred.name} 
            <span className="credential-status">
              {cred.verified ? "✅" : "⚠️"}
            </span>
          </option>
        ))}
      </select>
      <button onClick={openCredentialModal}>+ Add New</button>
    </div>
  );
};
```

---

## 🎯 Complete RAG Workflow Example

### Node Configuration
```json
{
  "name": "Web RAG Pipeline",
  "nodes": [
    {
      "id": "scraper_1",
      "type": "WebScraper",
      "data": {
        "url": "https://docs.python.org",
        "max_pages": 50,
        "depth": 2
      }
    },
    {
      "id": "splitter_1", 
      "type": "ChunkSplitter",
      "data": {
        "chunk_size": 1000,
        "chunk_overlap": 200,
        "separator": "recursive"
      }
    },
    {
      "id": "embedder_1",
      "type": "OpenAIEmbedder", 
      "data": {
        "credential_id": "openai_cred_id",
        "model": "text-embedding-3-small"
      }
    },
    {
      "id": "vectorstore_1",
      "type": "PGVectorStore",
      "data": {
        "credential_id": "supabase_cred_id", 
        "collection_name": "python_docs",
        "embedding_dimension": 1536
      }
    },
    {
      "id": "agent_1",
      "type": "Agent",
      "data": {
        "system_prompt": "You are a Python documentation assistant."
      }
    },
    {
      "id": "retrieval_1",
      "type": "RetrievalQA",
      "data": {
        "k": 5,
        "retriever_type": "similarity"
      }
    },
    {
      "id": "llm_1",
      "type": "OpenAIChat",
      "data": {
        "credential_id": "openai_cred_id",
        "model_name": "gpt-4o"
      }
    }
  ],
  "edges": [
    {"source": "scraper_1", "target": "splitter_1"},
    {"source": "splitter_1", "target": "embedder_1"},
    {"source": "embedder_1", "target": "vectorstore_1"},
    {"source": "vectorstore_1", "target": "retrieval_1"},
    {"source": "retrieval_1", "target": "agent_1", "targetHandle": "tools"},
    {"source": "llm_1", "target": "agent_1", "targetHandle": "llm"}
  ]
}
```

---

## ✅ Implementation Checklist

### 🚀 Trigger Nodes UI
- [ ] WebhookTrigger unified configuration panel (auto-generated URLs, security, start/mid-flow behavior)
- [ ] TimerStartNode cron/interval settings

### 🌐 HTTP & Integration UI
- [ ] HttpRequestNode comprehensive API client
- [ ] HttpClientNode simple HTTP wrapper
- [ ] Authentication type selector
- [ ] Request/response body editors

### 📄 Document Processing UI
- [ ] WebScraper URL configuration and crawl settings
- [ ] ChunkSplitter text splitting parameters
- [ ] File upload and processing options

### 🧠 AI & Embeddings UI
- [ ] OpenAIEmbedder model selection and batching
- [ ] RerankerNode service provider selection
- [ ] Model configuration and parameters

### 🗄️ Storage & Retrieval UI
- [ ] PGVectorStore database configuration
- [ ] RetrievalQA search parameter tuning
- [ ] Vector index management

### 🔐 Credential Management
- [ ] Database credentials (PostgreSQL/Supabase)
- [ ] OpenAI API key management
- [ ] Reranker service credentials (Cohere/Jina)
- [ ] Webhook security tokens
- [ ] HTTP API authentication

### 🔧 Advanced UI Components
- [ ] JSON editor component
- [ ] Key-value pair editor
- [ ] Cron expression builder
- [ ] URL template editor with variable support
- [ ] Multi-select dropdown
- [ ] Conditional field visibility (show_when)
- [ ] Copy-to-clipboard buttons
- [ ] Masked/password input fields

### 🔗 Node Handle System
- [ ] Input handle validation
- [ ] Output handle mapping
- [ ] Dynamic handle creation
- [ ] Connection compatibility checking

### Backend Integration
- [x] Node registration and discovery (unified webhook system)
- [ ] Credential encryption/decryption (5 credential types)
- [ ] Database connection validation
- [ ] Vector store initialization
- [x] Webhook endpoint creation and management (unified WebhookTrigger)
- [ ] Timer/cron job scheduling
- [ ] Error handling and logging
- [ ] Performance monitoring
- [x] Security token generation (automated in WebhookTrigger)

### Database Setup
- [ ] pgvector extension installation
- [ ] Vector table creation with proper indexes
- [x] Webhook endpoint storage (webhook_endpoints, webhook_events tables)
- [ ] Timer job persistence
- [ ] Credential storage encryption
- [ ] Index optimization for large datasets
- [ ] Backup and recovery procedures

### 🧪 Testing & Validation
- [ ] Node configuration validation
- [ ] Credential connection testing
- [ ] Webhook endpoint testing
- [ ] Timer execution testing
- [ ] HTTP request validation
- [ ] Vector search performance testing
- [ ] End-to-end workflow testing

---

**Note:** All sensitive data (API keys, passwords) must be encrypted before storage and decrypted only during execution. Implement proper validation for all user inputs and provide clear error messages for configuration issues.