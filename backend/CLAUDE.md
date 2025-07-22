# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Running the Application
```bash
# Development server (from app.py or app/main.py)
python app.py
# or
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Using Docker Compose
docker-compose up
```

### Testing
```bash
# Run all tests
pytest

# Run tests with specific markers
pytest -m unit          # Unit tests only
pytest -m integration   # Integration tests only
pytest -m "not slow"    # Skip slow tests

# Run tests in specific directory
pytest tests/

# Run with coverage
pytest --cov=app --cov-report=html
```

### Code Quality
```bash
# Type checking
mypy app/

# Run from test directory for specific mypy config
cd test && mypy ../app/
```

### Database Operations
```bash
# Create/update database tables (when CREATE_DATABASE=true)
# Database initialization happens automatically on startup via app lifespan

# Manual database operations would use SQLAlchemy/Alembic commands
```

## Architecture Overview

### Core Components

**KAI Fusion** is a workflow automation platform built on FastAPI with LangGraph engine integration. The architecture follows a layered approach:

1. **API Layer** (`app/api/`) - REST endpoints for workflows, executions, nodes, auth, credentials, and chat
2. **Service Layer** (`app/services/`) - Business logic and data processing
3. **Core Engine** (`app/core/`) - Workflow engine, node registry, state management, and configuration
4. **Node System** (`app/nodes/`) - Extensible node-based workflow components
5. **Data Layer** (`app/models/`) - SQLAlchemy models for database entities

### Key Architectural Patterns

**Node-Based Workflow System**: The application centers around a node registry (`app/core/node_registry.py`) that discovers and manages workflow components. Nodes are categorized by type:
- `PROVIDER` - Supplies LangChain objects (LLMs, Tools, Prompts)
- `PROCESSOR` - Processes multiple objects (Agents)
- `TERMINATOR` - Transforms chain endings (Output Parsers)
- `MEMORY` - Provides conversation memory

**Unified Engine Interface**: The `BaseWorkflowEngine` in `app/core/engine_v2.py` provides an abstract interface for workflow execution engines, with LangGraph as the primary implementation target.

**State Management**: Uses LangGraph's `FlowState` for maintaining workflow execution state and checkpointing.

### Database Configuration

The application supports optional database integration controlled by the `CREATE_DATABASE` environment variable. When enabled, it uses PostgreSQL with SQLAlchemy for data persistence. Database initialization occurs automatically during application startup.

### Authentication & Security

- JWT-based authentication with refresh tokens
- API key management system
- Credential encryption and secure storage
- Environment-based configuration management

### Key Configuration Files

- `app/core/config.py` - Central configuration management using Pydantic Settings
- `test/pytest.ini` - Test configuration with markers for unit/integration/API tests
- `test/mypy.ini` - Type checking configuration with LangChain-specific ignores
- `requirements.txt` - Python dependencies including FastAPI, LangChain, LangGraph, SQLAlchemy

### Environment Setup

Required environment variables:
- `OPENAI_API_KEY` - For OpenAI LLM nodes
- `ANTHROPIC_API_KEY` - For Claude LLM nodes
- `GOOGLE_API_KEY` - For Google Search tools
- `TAVILY_API_KEY` - For Tavily search tools
- `SECRET_KEY` - JWT signing key (change in production)
- `DATABASE_URL` - PostgreSQL connection string
- `CREATE_DATABASE` - Enable/disable database features

### Development Patterns

- All nodes extend `BaseNode` and implement required metadata
- Service layer uses dependency injection pattern
- Database operations use SQLAlchemy's async patterns
- API endpoints follow RESTful conventions with proper HTTP status codes
- Error handling uses FastAPI's exception handling system

### Testing Strategy

The test suite uses pytest with custom markers:
- `unit` - Unit tests for individual components
- `integration` - Integration tests for component interactions
- `api` - API endpoint tests
- `slow` - Performance/load tests that can be skipped
- `auth` - Authentication system tests
- `workflows` - Workflow execution tests
- `nodes` - Node registry and node functionality tests