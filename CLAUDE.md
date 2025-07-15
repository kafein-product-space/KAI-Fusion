# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KAI-Fusion is a comprehensive AI workflow automation platform featuring a visual workflow builder with Python FastAPI backend and React frontend. The system enables users to create complex AI workflows using a drag-and-drop interface with LangChain integration and real-time execution capabilities.

## Architecture

### Backend (Python FastAPI)
- **Main Framework**: FastAPI with async/await support
- **AI Framework**: LangChain ecosystem (langchain, langchain-community, langgraph)
- **Database**: PostgreSQL with SQLAlchemy/SQLModel
- **Authentication**: JWT-based with refresh tokens
- **Task Queue**: Celery with Redis backend
- **Core Engine**: LangGraph unified workflow engine (engine_v2.py)

### Frontend (React TypeScript)
- **Framework**: React Router v7 with TypeScript
- **UI Library**: Tailwind CSS + DaisyUI components
- **Workflow Editor**: ReactFlow (@xyflow/react) for visual node editor
- **State Management**: Zustand stores
- **HTTP Client**: Axios with react-query for API interactions
- **Testing**: Vitest + Testing Library

### Key Components

#### Backend Core Modules
- `app/main.py` - FastAPI application entry point with lifespan management
- `app/core/engine_v2.py` - Unified workflow engine interface (BaseWorkflowEngine)
- `app/core/node_registry.py` - Auto-discovery and registration of node types
- `app/core/config.py` - Centralized configuration with environment validation
- `app/nodes/` - 18+ node implementations (LLMs, tools, chains, memory, etc.)
- `app/api/workflows.py` - Workflow CRUD and execution endpoints
- `app/services/` - Business logic layer for workflows, users, credentials

#### Frontend Core Components
- `app/components/canvas/FlowCanvas.tsx` - Main visual workflow editor
- `app/stores/` - Zustand state management (auth, workflows, nodes, etc.)
- `app/services/` - API service layer with typed interfaces
- `app/routes/canvas.tsx` - Primary workflow editing interface

## Development Commands

### Backend Development
```bash
# Setup and run backend
cd backend
python -m venv venv && source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python start.py       # Development server (recommended)
# OR: uvicorn app.main:app --reload --port 8001

# Code quality
ruff check .          # Fast linting
ruff format .         # Code formatting
mypy app/             # Type checking
pytest tests/ -v      # Run test suite (if tests/ directory exists)
python test_react_workflow.py  # Run main test file

# Database operations (if using Alembic)
alembic upgrade head  # Apply migrations
alembic revision --autogenerate -m "description"  # Create migration
```

### Frontend Development
```bash
# Setup and run frontend
cd client
npm install
npm run dev           # Development server on port 5173

# Code quality and testing
npm run typecheck     # TypeScript validation (alias: type-check)
npm run lint          # ESLint checking
npm run lint:fix      # Fix linting issues
npm test              # Run Vitest tests
npm run test:coverage # Test coverage report
npm run test:watch    # Watch mode for tests
npm run build         # Production build
npm run preview       # Preview production build
```

### Full Stack Development
```bash
# Run both services simultaneously
# Terminal 1: Backend
cd backend && python start.py

# Terminal 2: Frontend  
cd client && npm run dev

# Access points:
# Frontend: http://localhost:5173
# Backend API: http://localhost:8001
# API Docs: http://localhost:8001/docs
```

## Key Configuration Files

- `backend/ruff.toml` - Python linting and formatting rules
- `backend/pytest.ini` - Test configuration with markers and logging
- `backend/mypy.ini` - MyPy type checking configuration
- `backend/start.py` - Development server startup script
- `client/tsconfig.json` - TypeScript compiler settings
- `client/vite.config.ts` - Vite build configuration with API proxy
- `client/vitest.config.ts` - Vitest testing configuration
- `backend/requirements.txt` - Python dependencies (pinned versions)
- `client/package.json` - Node.js dependencies and scripts

## Node System Architecture

The platform uses a dynamic node discovery system:

1. **Node Types**: Located in `backend/app/nodes/` with categories:
   - `llms/` - Language models (OpenAI, Anthropic, Google)
   - `tools/` - External integrations (Google Search, Wikipedia, Tavily)
   - `chains/` - Workflow orchestration (Sequential, Conditional)
   - `memory/` - Context management (Conversation, Buffer)
   - `agents/` - Autonomous AI agents (React Agent)
   - `document_loaders/` - Data ingestion (PDF, Web, Text)
   - `embeddings/` - Vector embeddings (OpenAI, Cohere, HuggingFace)
   - `vectorstores/` - Vector databases (Chroma, Pinecone, Qdrant)

2. **Node Registration**: Auto-discovery via `node_registry.discover_nodes()`
3. **Frontend Integration**: Nodes auto-appear in UI sidebar via `/api/v1/nodes` endpoint

## Environment Setup

### Required Environment Variables
```bash
# Backend (.env in backend/)
SECRET_KEY=your-32-character-secret-key
OPENAI_API_KEY=your-openai-key-optional
ANTHROPIC_API_KEY=your-anthropic-key-optional
GOOGLE_API_KEY=your-google-key-optional
TAVILY_API_KEY=your-tavily-key-optional

# Database (PostgreSQL)
POSTGRES_DB=flowise
POSTGRES_USER=flowise
POSTGRES_PASSWORD=flowisepassword
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Frontend (.env in client/)
VITE_API_BASE_URL=http://localhost:8001
VITE_API_VERSION=/api/v1
VITE_APP_NAME=KAI-Fusion
```

## Testing Strategy

### Backend Tests
- Location: `backend/test_react_workflow.py` (main test file)
- Framework: pytest with async support
- Run: `pytest tests/ -v` or `python test_react_workflow.py`
- Markers: `unit`, `integration`, `api`, `workflows`, `auth`
- Configuration: `pytest.ini` with comprehensive test markers and settings

### Frontend Tests  
- Framework: Vitest + Testing Library
- Configuration: `vitest.config.ts`
- Run: `npm test`
- Coverage: `npm run test:coverage`

## API Structure

### Key Endpoints
- `GET /api/v1/nodes` - List available node types
- `POST /api/v1/workflows/execute` - Execute workflow
- `POST /api/v1/workflows/{id}/execute/stream` - Streaming execution
- `GET /api/v1/workflows` - List user workflows
- `POST /api/v1/workflows/validate` - Validate workflow structure

### Authentication
- JWT-based authentication with refresh tokens
- Headers: `Authorization: Bearer <token>`
- Token expiry: 30 minutes (configurable)

## Common Development Patterns

### Adding New Node Types
1. Create node class in `backend/app/nodes/{category}/`
2. Inherit from `BaseNode` and implement required methods
3. Node auto-registers via discovery system
4. Frontend automatically displays new node in sidebar

### Workflow Execution Flow
1. Frontend builds workflow JSON (nodes + edges)
2. Backend validates via `BaseWorkflowEngine.validate()`
3. Engine compiles to executable graph via `build()`
4. Execution via `execute()` with optional streaming

### State Management (Frontend)
- Zustand stores in `app/stores/`
- Separate stores for: auth, workflows, nodes, executions
- Reactive updates across components

## Production Considerations

- Use environment-specific configurations
- Enable proper CORS settings
- Configure rate limiting and security headers
- Monitor API performance and database connections
- Use Redis for session management in production
- Enable proper logging and error tracking

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.