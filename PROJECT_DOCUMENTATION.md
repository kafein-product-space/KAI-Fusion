# KAI-Fusion: Comprehensive Project Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture Overview](#architecture-overview)
3. [Backend Architecture](#backend-architecture)
4. [Frontend Architecture](#frontend-architecture)
5. [Development Setup](#development-setup)
6. [Node System](#node-system)
7. [Authentication & Security](#authentication--security)
8. [Database & Models](#database--models)
9. [API Integration](#api-integration)
10. [Testing Strategy](#testing-strategy)
11. [Deployment & Configuration](#deployment--configuration)
12. [Performance & Monitoring](#performance--monitoring)

---

## Project Overview

**KAI-Fusion** is a comprehensive AI workflow automation platform that enables users to create complex AI-powered workflows through an intuitive visual interface. The platform combines a drag-and-drop workflow builder with powerful backend execution capabilities, supporting 55+ integrated AI models, tools, and data processing nodes.

### Key Features
- **Visual Workflow Builder**: ReactFlow-based drag-and-drop interface
- **Multi-AI Integration**: Support for OpenAI, Anthropic, Google Gemini, and more
- **Real-time Execution**: Server-sent events for streaming workflow results
- **Memory Management**: Conversation history and context preservation
- **Extensible Node System**: 55+ pre-built nodes across 8 categories
- **Credential Management**: Secure API key storage and validation
- **Session Management**: User-specific workflow execution contexts

### Technology Stack
- **Backend**: Python FastAPI with async/await support
- **Frontend**: React 18 + TypeScript with Vite
- **AI Framework**: LangChain ecosystem (langchain, langchain-community, langgraph)
- **Database**: PostgreSQL with SQLAlchemy/SQLModel
- **Authentication**: JWT-based with refresh tokens
- **Task Queue**: Celery with Redis backend
- **UI Framework**: Tailwind CSS + DaisyUI components
- **Testing**: Vitest (Frontend), pytest (Backend)

---

## Architecture Overview

KAI-Fusion follows a modern microservices-inspired architecture with clear separation between frontend and backend concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React/TS)                      │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │   Workflow      │ │   Node Library  │ │   Execution     ││
│  │   Builder       │ │   Sidebar       │ │   Monitor       ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │ HTTP/SSE
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (FastAPI)                         │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │   API Layer     │ │  Engine Core    │ │  Node Registry  ││
│  │   (FastAPI)     │ │  (LangGraph)    │ │  (Auto-discover)││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │   Auth/Users    │ │   Memory Mgmt   │ │   Credentials   ││
│  │   Management    │ │   (Sessions)    │ │   Validation    ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              External Services & Storage                    │
│     PostgreSQL  │  Redis  │  OpenAI  │  Anthropic  │ ...   │
└─────────────────────────────────────────────────────────────┘
```

---

## Backend Architecture

### Core Components

#### 1. FastAPI Application (`app/main.py`)
```python
# Application Entry Point
app = FastAPI(
    title="KAI-Fusion API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Router Registration
app.include_router(workflows_router, prefix="/api/v1")
app.include_router(nodes_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(credentials_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
```

#### 2. Workflow Engine (`app/core/engine_v2.py`)
The unified workflow engine provides a consistent interface for workflow execution:

```python
class BaseWorkflowEngine:
    def validate(self, workflow_data: Dict) -> bool
    def build(self, workflow_data: Dict) -> Any
    def execute(self, graph: Any, inputs: Dict) -> Dict
    def execute_stream(self, graph: Any, inputs: Dict) -> Iterator[Dict]
```

#### 3. Node Registry (`app/core/node_registry.py`)
Automatic discovery and registration of node types:

```python
def discover_nodes() -> Dict[str, BaseNode]:
    """Auto-discover all node implementations"""
    
def get_node_metadata(node_class: Type[BaseNode]) -> Dict:
    """Extract metadata from node class"""
    
def register_node(node_type: str, node_class: Type[BaseNode]):
    """Register a node type globally"""
```

### Directory Structure

```
backend/
├── app/
│   ├── main.py                 # FastAPI application entry
│   ├── core/
│   │   ├── config.py          # Configuration management
│   │   ├── engine_v2.py       # Unified workflow engine
│   │   ├── node_registry.py   # Node auto-discovery
│   │   └── base_node.py       # Base node interface
│   ├── api/
│   │   ├── workflows.py       # Workflow CRUD & execution
│   │   ├── nodes.py           # Node metadata endpoints
│   │   ├── auth.py            # Authentication endpoints
│   │   ├── credentials.py     # Credential validation
│   │   └── users.py           # User management
│   ├── models/
│   │   ├── workflow.py        # SQLModel definitions
│   │   ├── user.py            # User models
│   │   └── base.py            # Base model classes
│   ├── services/
│   │   ├── workflow_service.py # Business logic
│   │   ├── auth_service.py     # Authentication logic
│   │   └── credential_service.py # Credential management
│   └── nodes/                  # Node implementations
│       ├── llms/              # Language models
│       ├── tools/             # External tool integrations
│       ├── chains/            # Workflow orchestration
│       ├── memory/            # Context management
│       ├── agents/            # Autonomous AI agents
│       ├── document_loaders/  # Data ingestion
│       ├── embeddings/        # Vector embeddings
│       └── vectorstores/      # Vector databases
├── requirements.txt
├── start.py                   # Development server
└── test_react_workflow.py     # Main test file
```

### API Layer Architecture

#### Workflow Management
- **POST** `/api/v1/workflows/` - Create workflow
- **GET** `/api/v1/workflows/` - List user workflows
- **PUT** `/api/v1/workflows/{id}` - Update workflow
- **DELETE** `/api/v1/workflows/{id}` - Delete workflow
- **POST** `/api/v1/workflows/execute` - Execute workflow
- **POST** `/api/v1/workflows/{id}/execute/stream` - Stream execution

#### Node System
- **GET** `/api/v1/nodes` - List all available nodes
- **GET** `/api/v1/nodes/categories` - List node categories
- **GET** `/api/v1/nodes/{type}` - Get specific node metadata

#### Authentication
- **POST** `/api/v1/auth/signup` - User registration
- **POST** `/api/v1/auth/signin` - User login
- **POST** `/api/v1/auth/refresh` - Refresh access token
- **GET** `/api/v1/auth/profile` - Get user profile

---

## Frontend Architecture

### Core Components

#### 1. Application Structure (`client/app/`)
```
app/
├── routes/
│   ├── _index.tsx             # Home page
│   ├── canvas.tsx             # Main workflow editor
│   ├── auth/
│   │   ├── signin.tsx         # Login page
│   │   └── signup.tsx         # Registration page
│   └── workflows.tsx          # Workflow management
├── components/
│   ├── canvas/
│   │   ├── FlowCanvas.tsx     # Main ReactFlow editor
│   │   ├── NodeSidebar.tsx    # Draggable node library
│   │   └── ExecutionPanel.tsx # Workflow execution controls
│   ├── common/
│   │   ├── DraggableNode.tsx  # Node drag component
│   │   └── Header.tsx         # Navigation header
│   └── modals/
│       └── llms/
│           └── OpenAIChatModal.tsx # Node configuration
├── stores/
│   ├── auth.ts                # Authentication state
│   ├── workflows.ts           # Workflow management
│   ├── nodes.ts               # Node library state
│   └── executions.ts          # Execution tracking
├── services/
│   ├── api.ts                 # HTTP client configuration
│   ├── auth.ts                # Authentication API
│   ├── workflows.ts           # Workflow API
│   └── nodes.ts               # Node API
├── types/
│   └── api.ts                 # TypeScript type definitions
└── hooks/
    ├── useAuth.ts             # Authentication hook
    └── useWorkflow.ts         # Workflow management hook
```

#### 2. State Management (Zustand)

**Authentication Store:**
```typescript
interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  signin: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  signout: () => void;
  refresh: () => Promise<void>;
}
```

**Workflow Store:**
```typescript
interface WorkflowStore {
  workflows: Workflow[];
  currentWorkflow: Workflow | null;
  nodes: Node[];
  edges: Edge[];
  isExecuting: boolean;
  loadWorkflows: () => Promise<void>;
  saveWorkflow: (workflow: Workflow) => Promise<void>;
  executeWorkflow: (input: string) => Promise<void>;
}
```

#### 3. ReactFlow Integration
The visual workflow editor uses ReactFlow with custom node types:

```typescript
// Custom Node Types
const nodeTypes = {
  openaiChat: OpenAIChatNode,
  reactAgent: ReactAgentNode,
  bufferMemory: BufferMemoryNode,
  start: StartNode,
  condition: ConditionNode,
  // ... 50+ more node types
};

// Main Canvas Component
function FlowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <Background />
      <Controls />
      <MiniMap />
    </ReactFlow>
  );
}
```

---

## Development Setup

### Prerequisites
- **Node.js** 18+ (for frontend)
- **Python** 3.11+ (for backend)
- **PostgreSQL** 14+ (database)
- **Redis** 6+ (caching/sessions)

### Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Environment configuration
cp .env.example .env
# Edit .env with your API keys and database credentials

# Start development server
python start.py
# OR: uvicorn app.main:app --reload --port 8001
```

### Frontend Setup
```bash
cd client

# Install dependencies
npm install

# Environment configuration
cp .env.example .env
# Edit .env with backend URL

# Start development server
npm run dev
```

### Full Stack Development
```bash
# Terminal 1: Backend
cd backend && python start.py

# Terminal 2: Frontend
cd client && npm run dev

# Access points:
# Frontend: http://localhost:5173
# Backend API: http://localhost:8001
# API Documentation: http://localhost:8001/docs
```

---

## Node System

### Node Categories & Types

#### 1. Language Models (`llms/`)
- **OpenAIChat**: GPT-3.5, GPT-4, GPT-4o models
- **AnthropicClaude**: Claude 3 series models
- **GoogleGemini**: Gemini Pro and Ultra models

#### 2. AI Agents (`agents/`)
- **ReactAgent**: Autonomous reasoning and action agent
- **ToolAgent**: Multi-tool capable agent

#### 3. Memory Management (`memory/`)
- **BufferMemory**: Conversation history storage
- **ConversationMemory**: Multi-turn conversation context
- **SummaryMemory**: Condensed conversation summaries

#### 4. Workflow Chains (`chains/`)
- **SequentialChain**: Linear workflow execution
- **ConditionalChain**: Branching logic implementation
- **LLMChain**: Direct language model chaining
- **MapReduceChain**: Parallel processing patterns

#### 5. External Tools (`tools/`)
- **GoogleSearchTool**: Web search integration
- **TavilySearch**: Advanced web search
- **WikipediaTool**: Wikipedia knowledge access
- **WolframAlphaTool**: Mathematical computations
- **WebBrowserTool**: Web page content extraction

#### 6. Document Processing (`document_loaders/`)
- **PDFLoader**: PDF document ingestion
- **TextDataLoader**: Plain text file processing
- **WebLoader**: Web page content loading
- **YoutubeLoader**: YouTube transcript extraction
- **GitHubLoader**: GitHub repository content

#### 7. Embeddings (`embeddings/`)
- **OpenAIEmbeddings**: OpenAI text-embedding models
- **CohereEmbeddings**: Cohere embedding models
- **HuggingFaceEmbeddings**: Open-source embeddings

#### 8. Vector Stores (`vectorstores/`)
- **ChromaRetriever**: Chroma vector database
- **PineconeVectorStore**: Pinecone cloud vector DB
- **QdrantVectorStore**: Qdrant vector search
- **FaissVectorStore**: Facebook AI Similarity Search

### Node Implementation Pattern

All nodes inherit from `BaseNode` and implement the required interface:

```python
class BaseNode:
    def __init__(self, **kwargs):
        """Initialize node with configuration"""
    
    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute node logic and return outputs"""
    
    def get_metadata(self) -> Dict[str, Any]:
        """Return node metadata for UI"""
    
    def validate_inputs(self, inputs: Dict[str, Any]) -> bool:
        """Validate input parameters"""
```

---

## Authentication & Security

### JWT-Based Authentication
The platform uses JWT tokens with refresh token rotation:

```python
# Authentication Flow
1. User signs up/in with email/password
2. Server generates access token (30min) + refresh token (7 days)
3. Frontend stores tokens in memory (AuthStore)
4. Access token included in API requests
5. Automatic refresh when access token expires
```

### Security Features
- **Password Hashing**: bcrypt with salt rounds
- **Token Validation**: JWT signature verification
- **CORS Configuration**: Controlled cross-origin requests
- **Input Validation**: Pydantic models for request validation
- **SQL Injection Prevention**: SQLAlchemy ORM usage
- **API Key Encryption**: Secure credential storage

### Authorization Levels
- **Public Endpoints**: Health checks, documentation
- **Authenticated Endpoints**: User-specific resources
- **Admin Endpoints**: System management (future)

---

## Database & Models

### SQLModel Schema Design

#### User Model
```python
class User(SQLModel, table=True):
    id: str = Field(primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    created_at: datetime
    updated_at: Optional[datetime]
    is_active: bool = True
```

#### Workflow Model
```python
class Workflow(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str = Field(index=True)
    description: Optional[str]
    flow_data: Dict[str, Any] = Field(sa_column=Column(JSON))
    user_id: str = Field(foreign_key="user.id")
    created_at: datetime
    updated_at: datetime
    is_active: bool = True
```

#### Execution Tracking
```python
class WorkflowExecution(SQLModel, table=True):
    id: str = Field(primary_key=True)
    workflow_id: str = Field(foreign_key="workflow.id")
    input_text: str
    result: Dict[str, Any] = Field(sa_column=Column(JSON))
    started_at: datetime
    completed_at: Optional[datetime]
    status: ExecutionStatus
    runtime: Optional[str]
```

### Database Operations
- **Connection Pooling**: SQLAlchemy async engine
- **Migration Management**: Alembic (when configured)
- **Query Optimization**: Indexed fields and relationships
- **Transaction Management**: Automatic commit/rollback

---

## API Integration

### External Service Integration

#### OpenAI Integration
```python
class OpenAIChatNode(BaseNode):
    def __init__(self, model_name="gpt-3.5-turbo", temperature=0.7, **kwargs):
        self.client = OpenAI(api_key=kwargs.get('api_key'))
        self.model_name = model_name
        self.temperature = temperature
    
    async def execute(self, inputs):
        response = await self.client.chat.completions.create(
            model=self.model_name,
            messages=inputs['messages'],
            temperature=self.temperature
        )
        return {"content": response.choices[0].message.content}
```

#### Credential Validation
```python
async def validate_openai_credentials(api_key: str, model: str):
    try:
        client = OpenAI(api_key=api_key)
        await client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "test"}],
            max_tokens=1
        )
        return {"valid": True, "message": "Credentials validated successfully"}
    except Exception as e:
        return {"valid": False, "message": str(e)}
```

### Streaming Execution
Server-sent events provide real-time workflow execution updates:

```python
async def stream_workflow_execution(workflow_data: Dict, input_text: str):
    async for chunk in engine.execute_stream(workflow_data, {"input": input_text}):
        yield f"data: {json.dumps(chunk)}\n\n"
```

---

## Testing Strategy

### Backend Testing (`pytest`)
```python
# test_react_workflow.py
class TestWorkflowExecution:
    @pytest.mark.asyncio
    async def test_react_agent_execution(self):
        """Test ReactAgent workflow execution"""
        
    @pytest.mark.integration
    async def test_openai_integration(self):
        """Test OpenAI API integration"""
        
    @pytest.mark.unit
    def test_node_validation(self):
        """Test node input validation"""
```

#### Test Configuration (`pytest.ini`)
```ini
[tool:pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
markers =
    unit: Unit tests
    integration: Integration tests
    api: API endpoint tests
    workflows: Workflow execution tests
    auth: Authentication tests
```

### Frontend Testing (`vitest`)
```typescript
// Component Testing
describe('FlowCanvas', () => {
  test('renders workflow canvas', () => {
    render(<FlowCanvas />);
    expect(screen.getByTestId('react-flow')).toBeInTheDocument();
  });
  
  test('handles node drag and drop', () => {
    // Test drag and drop functionality
  });
});

// API Service Testing
describe('WorkflowService', () => {
  test('creates workflow successfully', async () => {
    const workflow = await workflowService.create(mockWorkflowData);
    expect(workflow.id).toBeDefined();
  });
});
```

### Test Coverage Goals
- **Backend**: 80%+ line coverage
- **Frontend**: 70%+ line coverage
- **Critical Paths**: 95%+ coverage (auth, workflow execution)

---

## Deployment & Configuration

### Environment Configuration

#### Backend Environment Variables
```env
# Core Configuration
SECRET_KEY=your-32-character-secret-key
DEBUG=false
LOG_LEVEL=info

# Database
POSTGRES_DB=kai_fusion
POSTGRES_USER=kai_user
POSTGRES_PASSWORD=secure_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
DATABASE_URL=postgresql://user:pass@host:port/db

# AI Service APIs
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
TAVILY_API_KEY=...

# Redis
REDIS_URL=redis://localhost:6379

# CORS
ALLOWED_ORIGINS=["http://localhost:5173", "https://yourdomain.com"]
```

#### Frontend Environment Variables
```env
VITE_API_BASE_URL=http://localhost:8001
VITE_API_VERSION=/api/v1
VITE_APP_NAME=KAI-Fusion
VITE_ENABLE_ANALYTICS=false
```

### Docker Deployment
```dockerfile
# Backend Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY app/ ./app/
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]

# Frontend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build
CMD ["npm", "run", "preview"]
```

### Production Considerations
- **Reverse Proxy**: Nginx for SSL termination and static serving
- **Database**: PostgreSQL with connection pooling
- **Caching**: Redis for session storage and caching
- **Monitoring**: Health check endpoints and logging
- **Security**: Environment variable encryption, HTTPS enforcement

---

## Performance & Monitoring

### Performance Optimizations

#### Backend Optimizations
- **Async/Await**: Non-blocking I/O operations
- **Connection Pooling**: Database connection reuse
- **Caching**: Redis for frequently accessed data
- **Lazy Loading**: On-demand node registration
- **Streaming**: Server-sent events for real-time updates

#### Frontend Optimizations
- **Code Splitting**: Dynamic imports for routes
- **Component Memoization**: React.memo for expensive components
- **Virtual Scrolling**: Large node lists optimization
- **Debounced Input**: Reduced API calls during user input
- **Progressive Loading**: Incremental data fetching

### Monitoring & Observability

#### Health Checks
```python
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "components": {
            "database": await check_database(),
            "node_registry": check_node_registry(),
            "session_manager": check_sessions()
        }
    }
```

#### Logging Strategy
```python
import logging
import structlog

# Structured logging configuration
logger = structlog.get_logger()

# Request/Response logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    
    logger.info(
        "api_request",
        method=request.method,
        url=str(request.url),
        status_code=response.status_code,
        duration=duration
    )
    return response
```

#### Metrics Collection
- **Request Latency**: API response times
- **Error Rates**: Failed requests by endpoint
- **Node Execution Times**: Workflow performance tracking
- **Memory Usage**: Backend resource consumption
- **User Activity**: Workflow creation and execution statistics

---

## Future Development Roadmap

### Planned Features
1. **Enhanced Node Library**: 100+ nodes across more categories
2. **Collaborative Workflows**: Multi-user workflow editing
3. **Workflow Templates**: Pre-built workflow marketplace
4. **Advanced Analytics**: Detailed execution monitoring
5. **Enterprise Features**: RBAC, audit logs, compliance tools
6. **Mobile Interface**: Responsive design for mobile devices
7. **API Marketplace**: Third-party node integrations
8. **Workflow Versioning**: Git-like version control for workflows

### Technical Improvements
1. **Database Migrations**: Alembic integration for schema changes
2. **Comprehensive Testing**: 90%+ test coverage across all components
3. **Performance Monitoring**: APM integration (DataDog, New Relic)
4. **Container Orchestration**: Kubernetes deployment manifests
5. **CI/CD Pipeline**: Automated testing and deployment
6. **Documentation**: Auto-generated API docs and user guides

---

This documentation provides a comprehensive overview of the KAI-Fusion platform architecture, implementation details, and development practices. For specific API endpoint documentation, refer to the accompanying `API_DOCUMENTATION.md` file.