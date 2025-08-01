# KAI-Fusion Workflow Testing System

> **Comprehensive guide for creating, testing, and running AI workflows**

[![KAI-Fusion](https://img.shields.io/badge/Platform-KAI--Fusion-blue.svg)](https://github.com/KAI-Fusion)
[![Workflow](https://img.shields.io/badge/Status-Production%20Ready-green.svg)](.)
[![Tests](https://img.shields.io/badge/Tests-Passing-brightgreen.svg)](.)

## 📋 Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [File Structure](#file-structure)
- [Creating Workflows](#creating-workflows)
- [Testing](#testing)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

The KAI-Fusion Workflow Testing System enables you to create, test, and run AI workflows from the terminal. With its agent-centric architecture, you can develop powerful and scalable AI solutions.

### ✨ Key Features

- **🤖 Agent-Centric Design**: Agent node required in every workflow
- **🔗 Intelligent Connections**: Proper LLM-to-Agent linking
- **📊 Comprehensive Testing**: Terminal and API-based testing methods
- **📚 Rich Templates**: Pre-built workflow templates
- **🔧 Debug Tools**: Detailed error analysis and solution recommendations

## 🚀 Quick Start

### 1. Run Test Runner

```bash
# List available nodes
python test_runner.py --list-nodes

# Create simple chatbot template
python test_runner.py --create --template simple_openai

# Test workflow
python test_runner.py --workflow agent_chatbot_fixed.json --input "Hello!"
```

### 2. Start Backend

```bash
# Start backend server
cd /Users/bahakizil/Desktop/KAI-Fusion/backend
uvicorn app.main:app --reload --port 8000

# Health check
curl http://localhost:8000/health
```

### 3. Test Chat API

```bash
# Start new chat
curl -X POST "http://localhost:8000/api/v1/chat/" \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello!"}'
```

## 📁 File Structure

```
workflow_tests/
├── README.md                  # This file
├── WORKFLOW_GUIDE.md         # Detailed technical guide
├── test_runner.py            # Main test tool
├── test_analyzer.py          # Test result analyzer
├── api_test.py              # API test scripts
├── agent_chatbot_fixed.json # Working agent chatbot example
├── templates/               # Workflow templates
│   ├── simple_openai.json
│   ├── real_chatbot.json
│   ├── webhook_test.json
│   └── embeddings_test.json
└── test_results/           # Test results (auto-generated)
```

## 🏗️ Creating Workflows

### Core Rule: Agent-Centric Architecture

**🚨 IMPORTANT**: Every workflow must contain exactly one Agent node!

### Basic Structure

```
StartNode → Agent → EndNode
            ↑
        [LLM Node]
```

### JSON Template

```json
{
  "name": "Workflow Name",
  "description": "Workflow description",
  "nodes": [
    {
      "id": "start_1",
      "type": "StartNode",
      "position": {"x": 100, "y": 200},
      "data": {"name": "Start"}
    },
    {
      "id": "agent_1",
      "type": "Agent",
      "position": {"x": 400, "y": 200},
      "data": {
        "name": "Main Agent",
        "system_prompt": "You are a helpful AI assistant.",
        "max_iterations": 5,
        "tools": []
      }
    },
    {
      "id": "openai_1",
      "type": "OpenAIChat",
      "position": {"x": 400, "y": 350},
      "data": {
        "name": "GPT Model",
        "model_name": "gpt-4o",
        "temperature": 0.7,
        "max_tokens": 1000,
        "credential_id": "credential-id"
      }
    },
    {
      "id": "end_1",
      "type": "EndNode",
      "position": {"x": 700, "y": 200},
      "data": {"name": "End"}
    }
  ],
  "edges": [
    {"id": "e1", "source": "start_1", "target": "agent_1"},
    {"id": "e2", "source": "agent_1", "target": "end_1"},
    {
      "id": "e3",
      "source": "openai_1",
      "target": "agent_1",
      "sourceHandle": "output",
      "targetHandle": "llm"
    }
  ]
}
```

## 🧪 Testing

### 1. Terminal Testing

```bash
# Test workflow file
python test_runner.py --workflow your_workflow.json --input "Test message"

# Interactive mode
python test_runner.py --interactive

# Save results
python test_runner.py --workflow your_workflow.json --save-result test_result.json
```

### 2. API Testing

```bash
# Chat API test
python api_test.py --test chat --message "Hello!"

# Node list test
python api_test.py --test nodes

# Health check test
python api_test.py --test health
```

### 3. Test Analysis

```bash
# Analyze test results
python test_analyzer.py --analyze test_results/

# Performance report
python test_analyzer.py --performance
```

## 📚 Examples

### 1. Simple Chatbot

File: `agent_chatbot_fixed.json`

```bash
python test_runner.py --workflow agent_chatbot_fixed.json --input "Hello!"
```

**Features:**
- Agent-based conversation
- GPT-4o integration
- Multi-language support
- 5 max iterations

### 2. Web Search Agent

File: `templates/real_chatbot.json`

**Features:**
- Web search capabilities
- Agent coordination
- Multi-tool integration

### 3. Webhook Triggered Workflow

File: `templates/webhook_test.json`

**Features:**
- Webhook trigger start
- HTTP response handling
- Event-driven processing

### 4. Embeddings Pipeline

File: `templates/embeddings_test.json`

**Features:**
- Document processing
- Vector embeddings
- RAG capabilities

## 🔧 Troubleshooting

### Common Errors

#### 1. "Agent node is required"
```
❌ Error: Every workflow must include exactly one Agent node
✅ Solution: Add an Agent node to your workflow
```

#### 2. "Required input 'llm' not found"
```
❌ Error: Missing LLM connection
✅ Solution: Connect OpenAI node to Agent's llm input
```

#### 3. "OpenAI API key is required"
```
❌ Error: Missing API key
✅ Solution: Set credential_id parameter correctly
```

#### 4. "Node type not found"
```
❌ Error: Unknown node type
✅ Solution: Check available nodes with python test_runner.py --list-nodes
```

### Debug Steps

1. **Node Registry Check**:
   ```bash
   python test_runner.py --list-nodes
   ```

2. **Workflow Validation**:
   ```bash
   python test_runner.py --workflow your_workflow.json
   ```

3. **Backend Health Check**:
   ```bash
   curl http://localhost:8000/health
   ```

4. **API Endpoints**:
   ```bash
   curl http://localhost:8000/docs
   ```

### Performance Tips

- **Model Selection**: gpt-3.5-turbo (speed), gpt-4 (quality)
- **Token Limits**: Set appropriate max_tokens values
- **Temperature**: Low (0.1-0.3) for factual, high (0.7-0.9) for creative
- **Memory Usage**: Add memory nodes for conversation context

## 📊 Available Nodes

### Essential Nodes
- **StartNode**: Workflow entry point
- **EndNode**: Workflow exit point
- **Agent**: Main conversational agent (REQUIRED)

### LLM Nodes
- **OpenAIChat**: GPT models

### Tools
- **TavilySearch**: Web search
- **HttpRequest**: HTTP API calls
- **Reranker**: Document ranking

### Memory
- **ConversationMemory**: Persistent conversation history
- **BufferMemory**: Temporary message buffer

### Document Processing
- **WebScraper**: Web content extraction
- **ChunkSplitter**: Document splitting
- **OpenAIEmbedder**: Text embeddings

### Vector Storage
- **PGVectorStore**: PostgreSQL vector database

### Triggers
- **WebhookStartNode**: Webhook trigger
- **TimerStartNode**: Timer trigger

## 🔗 Links

- **Main Documentation**: [WORKFLOW_GUIDE.md](./WORKFLOW_GUIDE.md)
- **Backend Health**: http://localhost:8000/health
- **API Docs**: http://localhost:8000/docs
- **Node API**: http://localhost:8000/api/v1/nodes/

## 📞 Support

For issues:

1. **Workflow Guide**: Detailed technical information in `WORKFLOW_GUIDE.md`
2. **Test Runner**: `python test_runner.py --help`
3. **API Test**: `python api_test.py --help`
4. **Backend Logs**: Check server console output

---

**Remember**: All workflows must include an Agent node. The Agent is the central coordinator that manages interactions between LLMs, tools, and other components.