# KAI-Fusion Backend

> **Enterprise-ready AI workflow automation platform**

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-green.svg)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://postgresql.org)

## 🚀 Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Start development server
uvicorn app.main:app --reload --port 8000

# Health check
curl http://localhost:8000/health
```

## 📁 Project Structure

```
backend/
├── app/                    # Application code
│   ├── api/               # REST API endpoints
│   ├── core/              # Core engine and utilities
│   ├── nodes/             # Workflow nodes
│   ├── services/          # Business logic
│   └── models/            # Database models
├── docs/                  # Documentation
├── tests/                 # Test suite
└── requirements.txt       # Dependencies
```

## 🧩 Available Nodes

### **Triggers**
- **WebhookStartNode** - HTTP webhook triggers
- **TimerStartNode** - Scheduled execution

### **LLMs**  
- **OpenAIChat** - GPT models integration

### **Tools**
- **TavilySearch** - Web search
- **HttpRequest** - HTTP API calls
- **Reranker** - Document reranking

### **Memory**
- **BufferMemory** - Conversation memory
- **ConversationMemory** - Persistent chat history

### **Document Processing**
- **WebScraper** - Web content extraction
- **ChunkSplitter** - Document chunking

### **Vector Storage**
- **PGVectorStore** - PostgreSQL vector storage
- **OpenAIEmbedder** - Text embeddings

### **Retrieval**
- **RetrievalQA** - RAG question answering

## 📖 Documentation

- **[Workflow Testing Guide](docs/WORKFLOW_TESTING.md)** - How to test workflows
- **[UI Specifications](docs/UI_SPECIFICATIONS.md)** - Frontend requirements  
- **[Backend Requirements](docs/BACKEND_REQUIREMENTS.md)** - Technical implementation
- **[Workflow Guide](docs/WORKFLOW_GUIDE.md)** - Creating workflows

## 🧪 Testing

```bash
# Run workflow tests
cd tests/
python test_runner.py --list-nodes

# API testing
python api_test.py --test all

# Test analysis
python test_analyzer.py --analyze test_results/
```

## 🏗️ Architecture

**KAI-Fusion** uses a **node-based workflow architecture**:

1. **Nodes** - Individual processing units
2. **Workflows** - Connected node graphs  
3. **Engine** - LangGraph-based execution
4. **API** - RESTful interface
5. **Storage** - PostgreSQL + Vector DB

## 🔧 Development

```bash
# Start with reload
uvicorn app.main:app --reload

# API documentation
open http://localhost:8000/docs

# Database health
curl http://localhost:8000/health
```

## 📊 Key Features

- ✅ **Enterprise Security** - JWT auth, encrypted credentials
- ✅ **Scalable Architecture** - Async processing, connection pooling
- ✅ **Node-based Workflows** - Drag-and-drop workflow building
- ✅ **Vector RAG** - Advanced document retrieval
- ✅ **Real-time Monitoring** - Execution tracking and logging
- ✅ **Webhook Integration** - External system triggers
- ✅ **Production Ready** - Health checks, error handling

---

**Built with ❤️ for enterprise AI automation**