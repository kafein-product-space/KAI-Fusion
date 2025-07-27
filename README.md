# 🚀 KAI-Fusion

> **Enterprise AI Workflow Automation Platform**

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://reactjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-green.svg)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://postgresql.org)
[![Production](https://img.shields.io/badge/Status-Production%20Ready-brightgreen.svg)](./)

**KAI-Fusion** is a production-ready AI workflow automation platform that enables enterprises to build, deploy, and manage sophisticated AI workflows through a visual interface. Built with modern technologies and enterprise-grade architecture.

## ✨ Key Features

### 🎨 **Visual Workflow Builder**
- Drag-and-drop interface for creating AI workflows
- Real-time collaboration and workflow sharing
- Professional UI with ReactFlow and TypeScript

### 🧩 **17 Production Nodes**
- **Triggers**: Webhook, Timer, HTTP endpoints
- **LLMs**: OpenAI GPT models with streaming
- **Tools**: Web search, HTTP requests, document processing
- **Memory**: Conversation history and context management
- **RAG**: Vector storage, embeddings, retrieval systems

### ⚡ **Real-time Execution**
- LangGraph-based workflow engine
- Streaming execution with live results
- State management and checkpointing
- Error handling and recovery

### 🔒 **Enterprise Security**
- JWT authentication with encrypted credentials
- Row-level security and user isolation
- HTTPS/TLS encryption
- Comprehensive audit logging

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│                 │    │                 │    │                 │
│ • React + TS    │◄──►│ • FastAPI       │◄──►│ • PostgreSQL    │
│ • ReactFlow     │    │ • LangChain     │    │ • pgvector      │
│ • Zustand       │    │ • Async/Await   │    │ • Supabase      │
│ • Tailwind      │    │ • JWT Auth      │    │ • Encryption    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- **Python 3.11+**
- **Node.js 18+** 
- **PostgreSQL 15+** (or Supabase)

### 1. Clone Repository
```bash
git clone https://github.com/your-org/kai-fusion.git
cd kai-fusion
```

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Configure your database and API keys in .env
uvicorn app.main:app --reload --port 8001
```

### 3. Frontend Setup
```bash
cd frontend  # or aiagent/client
npm install
cp .env.example .env
# Configure API endpoint
npm run dev
```

### 4. Access Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8001
- **API Docs**: http://localhost:8001/docs

## 🧩 Available Nodes

### 🚀 **Triggers (2 nodes)**
```
WebhookTrigger      # Unified webhook trigger (start workflows or mid-flow)
TimerStartNode      # Schedule workflows with cron/intervals  
```

### 🧠 **AI & LLMs (1 node)**
```
OpenAIChat          # GPT-3.5, GPT-4, GPT-4o integration
```

### 🛠️ **Tools (3 nodes)**
```
HttpRequest         # Send HTTP requests to external APIs
TavilySearch        # Advanced web search capabilities
Reranker           # Document reranking with Cohere/Jina
```

### 💾 **Memory (2 nodes)**
```
BufferMemory        # Temporary conversation memory
ConversationMemory  # Persistent chat history
```

### 📄 **Document Processing (2 nodes)**
```
WebScraper          # Extract content from web pages
ChunkSplitter       # Split documents for processing
```

### 🔮 **Embeddings & Vector (3 nodes)**
```
OpenAIEmbedder      # Generate text embeddings
PGVectorStore       # PostgreSQL vector storage
RetrievalQA         # RAG question answering
```

### 🏠 **Core (3 nodes)**
```
StartNode           # Workflow entry point
EndNode             # Workflow completion
Agent               # AI agent orchestration
```

## 💡 Usage Examples

### Simple Chatbot
```json
{
  "nodes": [
    {"type": "StartNode"},
    {"type": "Agent", "data": {"system_prompt": "You are a helpful assistant"}},
    {"type": "OpenAIChat", "data": {"model": "gpt-4o"}},
    {"type": "EndNode"}
  ],
  "edges": [
    {"source": "start", "target": "agent"},
    {"source": "openai", "target": "agent", "targetHandle": "llm"},
    {"source": "agent", "target": "end"}
  ]
}
```

### RAG System
```json
{
  "nodes": [
    {"type": "WebScraper", "data": {"url": "https://docs.company.com"}},
    {"type": "ChunkSplitter", "data": {"chunk_size": 1000}},
    {"type": "OpenAIEmbedder"},
    {"type": "PGVectorStore", "data": {"collection": "docs"}},
    {"type": "RetrievalQA"},
    {"type": "Agent"}
  ]
}
```

### Webhook Integration
```json
{
  "nodes": [
    {"type": "WebhookTrigger"},
    {"type": "Agent", "data": {"system_prompt": "Process webhook data"}},
    {"type": "HttpRequest", "data": {"url": "https://api.slack.com/messages"}}
  ]
}
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/kai_fusion
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# Security
SECRET_KEY=your-secret-key-32-characters
ACCESS_TOKEN_EXPIRE_MINUTES=30

# API Keys (Optional)
OPENAI_API_KEY=sk-your-openai-key
TAVILY_API_KEY=tvly-your-tavily-key

# Environment
ENVIRONMENT=development
LOG_LEVEL=INFO
```

#### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:8001
VITE_API_VERSION=/api/v1
VITE_APP_NAME=KAI-Fusion
```

## 🐳 Docker Deployment

```bash
# Development
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

## 📁 Project Structure

```
kai-fusion/
├── backend/                 # Python FastAPI backend
│   ├── app/
│   │   ├── api/            # REST API endpoints
│   │   ├── core/           # Core engine & utilities
│   │   ├── models/         # Database models
│   │   ├── nodes/          # 17 workflow nodes
│   │   │   ├── triggers/   # Webhook, Timer triggers
│   │   │   ├── tools/      # HTTP, Search tools
│   │   │   ├── llms/       # Language models
│   │   │   ├── memory/     # Memory systems
│   │   │   └── ...
│   │   └── services/       # Business logic
│   ├── docs/               # Technical documentation
│   ├── tests/              # Test suite
│   └── requirements.txt
│
├── frontend/               # React TypeScript frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── stores/         # State management
│   │   └── services/       # API clients
│   └── package.json
│
├── docker-compose.yml      # Development setup
└── README.md              # This file
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
python -m pytest tests/ -v
python test_runner.py --list-nodes
python api_test.py --test all
```

### Frontend Tests
```bash
cd frontend
npm test
npm run type-check
npm run lint
```

## 📊 API Documentation

Interactive API documentation available at:
- **Swagger UI**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc

### Key Endpoints
```
POST /api/v1/auth/signin          # User authentication
GET  /api/v1/nodes/               # Available node types
POST /api/v1/workflows/execute    # Execute workflow
GET  /api/v1/workflows/           # List workflows
POST /api/v1/credentials/         # Manage API keys
```

## 🔒 Security

- **Authentication**: JWT tokens with secure storage
- **Authorization**: Role-based access control
- **Encryption**: All sensitive data encrypted at rest
- **HTTPS**: TLS encryption for all communications
- **Audit**: Comprehensive logging and monitoring

## 🎯 Use Cases

### **Customer Support Automation**
- Webhook triggers from support tickets
- AI analysis and response generation
- Integration with CRM systems

### **Content Processing Pipeline**
- Document ingestion and processing
- Vector search and RAG systems
- Automated content generation

### **Business Process Automation**
- Scheduled data processing
- API integrations and workflows
- Real-time decision making

### **AI-Powered Analytics**
- Data collection and analysis
- Report generation and distribution
- Predictive analytics workflows

## 🔄 Workflow Patterns

### **Linear Workflow**
```
StartNode → Agent → HttpRequest → EndNode
```

### **RAG Workflow**
```
WebScraper → ChunkSplitter → Embedder → VectorStore
                                             ↓
StartNode → Agent ← RetrievalQA ←──────────────┘
    ↓
EndNode
```

### **Conditional Workflow**
```
WebhookTrigger → Agent → [Condition] → HttpRequest A
                             ↓
                      HttpRequest B
```

## 🚀 Production Deployment

### Prerequisites
- **Kubernetes cluster** or **Docker Swarm**
- **PostgreSQL database** with pgvector extension
- **Redis** for caching (optional)
- **Load balancer** for high availability

### Deployment Steps
1. Configure production environment variables
2. Set up database with migrations
3. Deploy backend services
4. Deploy frontend with CDN
5. Configure monitoring and logging

## 📈 Monitoring

### Health Checks
```bash
curl http://localhost:8001/health      # Basic health
curl http://localhost:8001/health/db   # Database health
```

### Metrics
- Request latency and throughput
- Workflow execution times
- Node success/failure rates
- Database connection pooling

### Logging
- Structured JSON logging
- Workflow execution traces
- Error tracking and alerting
- Performance monitoring




## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


---


[![Stars](https://img.shields.io/github/stars/your-org/kai-fusion?style=social)](https://github.com/your-org/kai-fusion)
[![Forks](https://img.shields.io/github/forks/your-org/kai-fusion?style=social)](https://github.com/your-org/kai-fusion)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)