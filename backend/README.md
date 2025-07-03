# 🚀 Flowise-FastAPI: Dynamic Workflow Engine

A powerful LangChain-based workflow engine inspired by Flowise, built with FastAPI. This system enables frontend-driven workflow creation with automatic node connections and dynamic chain building.

## ✨ Key Features

### 🔄 Dynamic Chain Builder
- **Automatic Workflow Execution**: Frontend workflows are automatically converted to executable LangChain objects
- **Topological Sorting**: Nodes are executed in dependency order
- **Type Safety**: Strong typing for node inputs/outputs
- **Error Recovery**: Detailed error messages and debugging information

### 🔌 Auto-Connection System
- **Smart Suggestions**: AI-powered connection suggestions between nodes
- **Type Compatibility**: Automatic validation of connection compatibility
- **Confidence Scoring**: Connection suggestions ranked by confidence

### 💾 Session Management
- **Conversation Memory**: Maintains chat history across sessions
- **Context Persistence**: Workflow context preserved between executions
- **TTL Management**: Automatic cleanup of expired sessions
- **Multi-user Support**: Isolated sessions per user/workflow

### 🧩 Enhanced Node System
- **Provider Nodes**: Create LangChain objects (LLMs, Tools, Prompts)
- **Processor Nodes**: Combine and process multiple inputs (Chains, Agents)
- **Terminator Nodes**: Handle final output processing
- **Custom Nodes**: Easy to add new node types

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/bahakizil/flows-fastapi.git
cd flows-fastapi/flowise-fastapi

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys
```

## 🚀 Quick Start

### 1. Start the Backend

```bash
# Run the FastAPI server
python main.py
```

The API will be available at `http://localhost:8000`

### 2. Basic Workflow Execution

```python
import requests

# Simple chat workflow
workflow = {
    "name": "Simple Chat",
    "nodes": [
        {
            "id": "llm_1",
            "type": "OpenAIChat",
            "data": {
                "model_name": "gpt-4",
                "temperature": 0.7
            },
            "position": {"x": 100, "y": 100}
        }
    ],
    "edges": []
}

# Execute workflow
response = requests.post(
    "http://localhost:8000/api/v1/workflows/execute",
    json={
        "workflow": workflow,
        "input": "Hello, how are you?"
    }
)

print(response.json())
```

### 3. Complex Agent Workflow

```python
# Agent with tools workflow
agent_workflow = {
    "name": "Research Agent",
    "nodes": [
        {
            "id": "llm_1",
            "type": "OpenAIChat",
            "data": {"model_name": "gpt-4"}
        },
        {
            "id": "search_tool",
            "type": "GoogleSearch",
            "data": {}
        },
        {
            "id": "calc_tool",
            "type": "Calculator",
            "data": {}
        },
        {
            "id": "agent_prompt",
            "type": "ReactAgentPrompt",
            "data": {}
        },
        {
            "id": "agent_1",
            "type": "ReactAgent",
            "data": {}
        }
    ],
    "edges": [
        {"source": "llm_1", "target": "agent_1", "targetHandle": "llm"},
        {"source": "search_tool", "target": "agent_1", "targetHandle": "tools"},
        {"source": "calc_tool", "target": "agent_1", "targetHandle": "tools"},
        {"source": "agent_prompt", "target": "agent_1", "targetHandle": "prompt"}
    ]
}

# Execute with session
response = requests.post(
    "http://localhost:8000/api/v1/workflows/execute",
    json={
        "workflow": agent_workflow,
        "input": "What is the population of Tokyo and calculate its square root?"
    }
)
```

## 🔥 Advanced Features

### Sequential Chains

```python
sequential_workflow = {
    "name": "Translation Pipeline",
    "nodes": [
        # LLM Node
        {"id": "llm_1", "type": "OpenAIChat", "data": {"model_name": "gpt-3.5-turbo"}},
        
        # Translation prompts
        {"id": "french_prompt", "type": "PromptTemplate", 
         "data": {"template": "Translate to French: {input}"}},
        {"id": "spanish_prompt", "type": "PromptTemplate",
         "data": {"template": "Translate to Spanish: {french}"}},
        
        # Chains
        {"id": "french_chain", "type": "LLMChain", "data": {"output_key": "french"}},
        {"id": "spanish_chain", "type": "LLMChain", "data": {"output_key": "spanish"}},
        
        # Sequential Chain
        {"id": "sequential", "type": "SequentialChain",
         "data": {
             "input_variables": ["input"],
             "output_variables": ["french", "spanish"],
             "return_all": True
         }}
    ],
    "edges": [
        {"source": "llm_1", "target": "french_chain", "targetHandle": "llm"},
        {"source": "french_prompt", "target": "french_chain", "targetHandle": "prompt"},
        {"source": "llm_1", "target": "spanish_chain", "targetHandle": "llm"},
        {"source": "spanish_prompt", "target": "spanish_chain", "targetHandle": "prompt"},
        {"source": "french_chain", "target": "sequential", "targetHandle": "chains"},
        {"source": "spanish_chain", "target": "sequential", "targetHandle": "chains"}
    ]
}
```

### Conditional Routing

```python
conditional_workflow = {
    "name": "Smart Router",
    "nodes": [
        {"id": "llm_1", "type": "OpenAIChat", "data": {}},
        {"id": "technical_prompt", "type": "PromptTemplate",
         "data": {"template": "Technical explanation: {input}"}},
        {"id": "simple_prompt", "type": "PromptTemplate",
         "data": {"template": "Simple explanation: {input}"}},
        {"id": "technical_chain", "type": "LLMChain", "data": {}},
        {"id": "simple_chain", "type": "LLMChain", "data": {}},
        {"id": "router", "type": "ConditionalChain",
         "data": {
             "condition_chains": {
                 "technical": "technical_chain",
                 "simple": "simple_chain"
             },
             "condition_type": "contains"
         }}
    ],
    "edges": [
        # Connect chains...
    ]
}
```

### Auto-Connection Suggestions

```python
# Get connection suggestions
response = requests.post(
    "http://localhost:8000/api/v1/workflows/connections/suggest",
    json={
        "nodes": [
            {"id": "llm_1", "type": "OpenAIChat"},
            {"id": "prompt_1", "type": "PromptTemplate"},
            {"id": "chain_1", "type": "LLMChain"}
        ]
    }
)

suggestions = response.json()["suggestions"]
# Returns ranked suggestions with confidence scores
```

## 📊 Session Management

```python
# Create a session
session = requests.post("http://localhost:8000/api/v1/workflows/sessions").json()
session_id = session["session_id"]

# Execute with session
response1 = requests.post(
    "http://localhost:8000/api/v1/workflows/execute",
    json={
        "workflow": chat_workflow,
        "input": "My name is Alice",
        "session_id": session_id
    }
)

# Context is maintained
response2 = requests.post(
    "http://localhost:8000/api/v1/workflows/execute",
    json={
        "workflow": chat_workflow,
        "input": "What is my name?",
        "session_id": session_id
    }
)
# AI remembers: "Your name is Alice"
```

## 🔧 API Endpoints

### Workflow Execution
- `POST /api/v1/workflows/execute` - Execute a workflow
- `POST /api/v1/workflows/execute/stream` - Execute with streaming
- `POST /api/v1/workflows/validate` - Validate workflow

### Connection Management
- `POST /api/v1/workflows/connections/suggest` - Get connection suggestions

### Session Management
- `POST /api/v1/workflows/sessions` - Create session
- `GET /api/v1/workflows/sessions/{id}` - Get session
- `DELETE /api/v1/workflows/sessions/{id}` - Delete session
- `GET /api/v1/workflows/sessions` - Get statistics

### Node Discovery
- `GET /api/v1/nodes` - List all available nodes
- `GET /api/v1/nodes/{type}` - Get node details

## 🧪 Testing

```bash
# Run unit tests
pytest tests/

# Run integration tests
python tests/test_integration.py

# Test workflows
python tests/test_workflows.py
```

## 🛠️ Creating Custom Nodes

```python
from nodes.base import ProviderNode, NodeInput, NodeOutput

class MyCustomNode(ProviderNode):
    _metadatas = {
        "name": "MyCustomNode",
        "description": "A custom node implementation",
        "category": "Custom",
        "inputs": [
            NodeInput(name="param1", type="str", description="Parameter 1"),
            NodeInput(name="param2", type="int", default=10)
        ],
        "outputs": [
            NodeOutput(name="output", type="any", description="Node output")
        ]
    }
    
    def _execute(self, inputs: Dict[str, Any]) -> Any:
        # Your custom logic here
        return f"Processed: {inputs['param1']} with {inputs['param2']}"
```

## 🎯 Architecture

```
flowise-fastapi/
├── api/
│   └── routers/
│       ├── workflows.py    # Workflow execution endpoints
│       └── nodes.py        # Node management endpoints
├── core/
│   ├── dynamic_chain_builder.py  # Converts workflows to chains
│   ├── workflow_runner.py        # Executes workflows
│   ├── auto_connector.py         # Connection suggestions
│   ├── session_manager.py        # Session management
│   └── node_discovery.py         # Auto-discovers nodes
├── nodes/
│   ├── base.py                   # Base node classes
│   ├── llms/                     # LLM nodes
│   ├── tools/                    # Tool nodes
│   ├── chains/                   # Chain nodes
│   └── agents/                   # Agent nodes
└── tests/
    ├── test_workflows.py         # Workflow tests
    └── test_integration.py       # Integration tests
```

## 🔐 Environment Variables

```env
# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Google
GOOGLE_API_KEY=...
GOOGLE_CSE_ID=...

# LangSmith (optional)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
LANGCHAIN_API_KEY=ls__...
LANGCHAIN_PROJECT=flowise-fastapi

# App Config
DEBUG=true
HOST=0.0.0.0
PORT=8000
```

## 📈 Performance

- **Async Execution**: All workflows run asynchronously
- **Connection Pooling**: Efficient resource management
- **Caching**: Node instances cached for performance
- **Streaming**: Real-time token streaming support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📝 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Inspired by [Flowise](https://github.com/FlowiseAI/Flowise)
- Built with [LangChain](https://github.com/langchain-ai/langchain)
- Powered by [FastAPI](https://github.com/tiangolo/fastapi)

---

**Made with ❤️ by the Flowise-FastAPI Team**
