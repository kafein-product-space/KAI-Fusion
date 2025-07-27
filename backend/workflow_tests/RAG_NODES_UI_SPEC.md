# RAG Node UI Specifications

> **Complete specification for RAG workflow node UI components and database requirements**

[![KAI-Fusion](https://img.shields.io/badge/Platform-KAI--Fusion-blue.svg)](https://github.com/KAI-Fusion)
[![RAG](https://img.shields.io/badge/Type-RAG%20Workflow-green.svg)](./)

## 📋 Table of Contents

- [WebScraper Node](#webscraper-node)
- [ChunkSplitter Node](#chunksplitter-node)
- [OpenAIEmbedder Node](#openaiembedder-node)
- [PGVectorStore Node](#pgvectorstore-node)
- [RetrievalQA Node](#retrievalqa-node)
- [Database Schema](#database-schema)
- [Credential Management](#credential-management)

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

### Frontend UI Components
- [ ] WebScraper configuration panel
- [ ] ChunkSplitter settings form
- [ ] OpenAIEmbedder credential selection
- [ ] PGVectorStore database configuration
- [ ] RetrievalQA search parameters
- [ ] Credential management system
- [ ] Node validation and error handling

### Backend Integration
- [ ] Node registration and discovery
- [ ] Credential encryption/decryption
- [ ] Database connection validation
- [ ] Vector store initialization
- [ ] Error handling and logging
- [ ] Performance monitoring

### Database Setup
- [ ] pgvector extension installation
- [ ] Vector table creation
- [ ] Index optimization
- [ ] Backup and recovery procedures

---

**Note:** All sensitive data (API keys, passwords) must be encrypted before storage and decrypted only during execution. Implement proper validation for all user inputs and provide clear error messages for configuration issues.