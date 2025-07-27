# KAI-Fusion Workflow Testing Guide

> **Complete guide for creating, connecting, and running AI workflows in KAI-Fusion platform**

## 📋 Table of Contents

- [Overview](#overview)
- [Available Nodes](#available-nodes)
- [Workflow Architecture](#workflow-architecture)
- [Creating Workflows](#creating-workflows)
- [Node Connections](#node-connections)
- [Testing Workflows](#testing-workflows)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

KAI-Fusion is an enterprise AI workflow automation platform that allows you to create sophisticated AI workflows by connecting various nodes (LLMs, agents, tools, etc.). This guide explains how to create, test, and run workflows programmatically.

## 🧩 Available Nodes

### **Essential Nodes (Required for all workflows)**
- **StartNode**: Entry point for all workflows
- **EndNode**: Exit point for all workflows  
- **Agent**: **MANDATORY** - All workflows must include an Agent node

### **LLM Nodes**
- **OpenAIChat**: GPT models (gpt-3.5-turbo, gpt-4, gpt-4o)

### **Agent Nodes**
- **Agent**: Main conversational agent (ReactAgent pattern)

### **Tools**
- **TavilySearch**: Web search capabilities
- **HttpRequest**: HTTP API calls
- **Reranker**: Document ranking and reordering

### **Memory**
- **ConversationMemory**: Persistent conversation history
- **BufferMemory**: Temporary message buffering

### **Document Processing**
- **WebScraper**: Extract content from web pages
- **ChunkSplitter**: Split documents into chunks
- **OpenAIEmbedder**: Create text embeddings

### **Vector Storage**
- **PGVectorStore**: PostgreSQL vector database

### **Triggers**
- **WebhookStartNode**: Start workflows via webhooks
- **TimerStartNode**: Schedule-based workflow execution

### **Utilities**
- **RetrievalQA**: Question answering with retrieval
- **SchedulerTrigger**: Advanced scheduling
- **WebhookTrigger**: Webhook handling

## 🏗️ Workflow Architecture

### **Core Principle: Agent-Centric Design**

**🚨 IMPORTANT**: Every workflow MUST include an Agent node. The Agent acts as the central orchestrator.

### **Basic Workflow Structure**
```
StartNode → Agent → EndNode
            ↑
        [LLM Node]
```

### **Advanced Workflow Structure**
```
StartNode → Agent → EndNode
            ↑   ↓
        [Tools] [Memory]
            ↑
        [LLM Node]
```

## 📝 Creating Workflows

### **1. Workflow JSON Structure**

```json
{
  "name": "Workflow Name",
  "description": "Workflow description",
  "nodes": [
    {
      "id": "unique_node_id",
      "type": "NodeType",
      "position": {"x": 100, "y": 200},
      "data": {
        "name": "Node Name",
        "param1": "value1",
        "param2": "value2"
      }
    }
  ],
  "edges": [
    {
      "id": "edge_id",
      "source": "source_node_id", 
      "target": "target_node_id"
    }
  ]
}
```

### **2. Essential Nodes Configuration**

#### **StartNode**
```json
{
  "id": "start_1",
  "type": "StartNode",
  "position": {"x": 100, "y": 200},
  "data": {"name": "Start"}
}
```

#### **Agent Node (REQUIRED)**
```json
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
}
```

#### **OpenAI LLM Node**
```json
{
  "id": "openai_1",
  "type": "OpenAIChat",
  "position": {"x": 400, "y": 350},
  "data": {
    "name": "GPT Model",
    "model_name": "gpt-4o",
    "temperature": 0.7,
    "max_tokens": 1000,
    "credential_id": "your-credential-id"
  }
}
```

#### **EndNode**
```json
{
  "id": "end_1",
  "type": "EndNode",
  "position": {"x": 700, "y": 200},
  "data": {"name": "End"}
}
```

## 🔗 Node Connections

### **1. Main Flow Connections**
Connect nodes in the primary execution flow:

```json
{
  "id": "e1",
  "source": "start_1",
  "target": "agent_1"
},
{
  "id": "e2", 
  "source": "agent_1",
  "target": "end_1"
}
```

### **2. LLM Connection to Agent**
**CRITICAL**: Connect LLM to Agent's `llm` input:

```json
{
  "id": "e3",
  "source": "openai_1",
  "target": "agent_1",
  "sourceHandle": "output",
  "targetHandle": "llm"
}
```

### **3. Tool Connections**
Connect tools to Agent's tools input:

```json
{
  "id": "e4",
  "source": "tavily_search_1",
  "target": "agent_1",
  "sourceHandle": "output", 
  "targetHandle": "tools"
}
```

### **4. Memory Connections**
Connect memory to Agent:

```json
{
  "id": "e5",
  "source": "memory_1",
  "target": "agent_1",
  "sourceHandle": "output",
  "targetHandle": "memory"
}
```

## 🧪 Testing Workflows

### **1. Using Test Runner**

```bash
# Test a workflow file
python test_runner.py --workflow your_workflow.json --input "Test message"

# Create from template
python test_runner.py --create --template simple_openai

# List available nodes
python test_runner.py --list-nodes

# Interactive mode
python test_runner.py --interactive
```

### **2. Via Chat API**

```bash
# Start new chat
curl -X POST "http://localhost:8000/api/v1/chat/" \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello!"}'

# Continue conversation  
curl -X POST "http://localhost:8000/api/v1/chat/{chatflow_id}/interact" \
  -H "Content-Type: application/json" \
  -d '{"content": "Follow up message"}'
```

### **3. Backend Health Check**

```bash
curl http://localhost:8000/health
```

## 📚 Examples

### **Example 1: Simple Chatbot**

```json
{
  "name": "Simple Chatbot",
  "description": "Basic conversational agent",
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
        "name": "Chatbot Agent",
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
        "credential_id": "63989c5e-f754-4e49-9829-42513afb9d0f"
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

### **Example 2: Web Search Agent**

```json
{
  "name": "Web Search Agent",
  "description": "Agent with web search capabilities",
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
        "name": "Search Agent",
        "system_prompt": "You are a helpful assistant with web search capabilities.",
        "max_iterations": 5,
        "tools": []
      }
    },
    {
      "id": "openai_1",
      "type": "OpenAIChat",
      "position": {"x": 300, "y": 350}, 
      "data": {
        "name": "GPT Model",
        "model_name": "gpt-4o",
        "temperature": 0.7,
        "max_tokens": 1000,
        "credential_id": "63989c5e-f754-4e49-9829-42513afb9d0f"
      }
    },
    {
      "id": "search_1",
      "type": "TavilySearch",
      "position": {"x": 500, "y": 350},
      "data": {
        "name": "Web Search",
        "max_results": 5,
        "search_depth": "basic"
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
    },
    {
      "id": "e4",
      "source": "search_1",
      "target": "agent_1",
      "sourceHandle": "output",
      "targetHandle": "tools"
    }
  ]
}
```

## 🔧 Troubleshooting

### **Common Issues**

#### **1. "Agent node is required"**
- **Solution**: Every workflow must include exactly one Agent node
- **Fix**: Add an Agent node to your workflow

#### **2. "OpenAI API key is required"**
- **Solution**: Configure credentials properly
- **Fix**: Set up credential_id in OpenAI nodes or use credential management

#### **3. "Required input 'llm' not found"**
- **Solution**: Connect LLM to Agent's llm input
- **Fix**: Add edge with `targetHandle: "llm"`

#### **4. Workflow validation failed**
- **Solution**: Check JSON syntax and node types
- **Fix**: Validate against available node types

#### **5. "Node type not found"**
- **Solution**: Use correct node type names
- **Fix**: Check available nodes with `--list-nodes`

### **Debugging Steps**

1. **Check Node Registry**:
   ```bash
   python test_runner.py --list-nodes
   ```

2. **Validate Workflow**:
   ```bash
   python test_runner.py --workflow your_workflow.json
   ```

3. **Check Backend Health**:
   ```bash
   curl http://localhost:8000/health
   ```

4. **View Available Endpoints**:
   ```bash
   curl http://localhost:8000/docs
   ```

### **Performance Tips**

1. **Use appropriate model sizes**: gpt-3.5-turbo for speed, gpt-4 for quality
2. **Limit max_tokens**: Set reasonable limits to control response length
3. **Optimize temperature**: Lower (0.1-0.3) for factual, higher (0.7-0.9) for creative
4. **Batch operations**: Process multiple items when possible
5. **Cache results**: Use memory nodes for conversation context

## 🚀 Quick Start

1. **Clone a template**:
   ```bash
   python test_runner.py --create --template simple_openai
   ```

2. **Modify for your needs**:
   - Update system prompts
   - Add tools/memory
   - Configure credentials

3. **Test the workflow**:
   ```bash  
   python test_runner.py --workflow your_workflow.json --input "Test message"
   ```

4. **Deploy to production**:
   - Import JSON via UI
   - Configure environment
   - Start chatting!

## 📞 Support

- **Documentation**: Check `/docs` endpoint on running server
- **Health Check**: `GET /health`
- **Node Information**: `GET /api/v1/nodes/`
- **Workflow Management**: `POST /api/v1/workflows/`

---

**Remember**: All workflows must include an Agent node. The Agent is the central orchestrator that coordinates between LLMs, tools, and other components to create intelligent, conversational AI experiences.