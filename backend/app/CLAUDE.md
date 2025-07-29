# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- **Start server**: `uvicorn app.main:app --reload --port 8000` (from backend/app directory)
- **Install dependencies**: `pip install -r requirements.txt` (from backend directory)
- **Health check**: Access `http://localhost:8000/health` or `http://localhost:8000/docs`

### Testing
- **Run tests**: `python -m pytest tests/ -v` (from backend directory)
- **API testing**: Use the interactive docs at `/docs` endpoint

### Database
- **Database creation**: Controlled by `CREATE_DATABASE` environment variable in core/constants.py
- **Connection**: Uses async PostgreSQL via SQLAlchemy and asyncpg
- **Health check**: Database health included in `/health` endpoint

## Architecture Overview

This is a **FastAPI-based AI workflow automation platform** with the following key components:

### Core Engine (`app/core/`)
- **`engine_v2.py`**: LangGraph-based unified execution engine
- **`node_registry.py`**: Dynamic node discovery and registration system
- **`graph_builder.py`**: Converts workflow definitions to executable graphs
- **`database.py`**: Async database operations and health monitoring
- **`constants.py`**: Centralized environment variable management

### Node System (`app/nodes/`)
The platform uses a **plugin-based node architecture** with automatic discovery:
- **Base**: `base.py` defines the `BaseNode` interface
- **Categories**: `agents/`, `llms/`, `tools/`, `memory/`, `embeddings/`, `vectorstores/`
- **Discovery**: Nodes are auto-registered by the `NodeRegistry` on startup
- **Metadata**: Each node provides rich metadata for frontend integration

### API Layer (`app/api/`)
RESTful endpoints organized by domain:
- **`workflows.py`**: Workflow CRUD and execution
- **`executions.py`**: Execution history and monitoring  
- **`nodes.py`**: Node discovery and metadata
- **`auth.py`**: Authentication and user management
- **`credentials.py`**: Encrypted credential storage

### Service Layer (`app/services/`)
Business logic separated from API controllers:
- **`workflow_service.py`**: Workflow management logic
- **`execution_service.py`**: Execution orchestration
- **`credential_service.py`**: Secure credential handling

### Data Models (`app/models/` and `app/schemas/`)
- **`models/`**: SQLAlchemy ORM models for database tables
- **`schemas/`**: Pydantic models for API request/response validation

## Key Development Patterns

### Node Development
1. Create new node class inheriting from `BaseNode`
2. Implement required methods: `execute()`, define `metadata`
3. Place in appropriate category subdirectory under `nodes/`
4. Node will be auto-discovered on next server restart

### Workflow Execution
- Workflows are JSON definitions converted to LangGraph graphs
- Execution supports both synchronous and streaming modes
- State is managed through checkpointing system
- All executions are logged and traceable

### Environment Configuration
- All environment variables defined in `core/constants.py`
- Database operations conditional on `CREATE_DATABASE` setting
- Supports both development and production configurations

### Error Handling
- Comprehensive exception handling in `core/error_handlers.py`
- Structured error responses across all API endpoints
- Health monitoring with component-level status reporting

## Security & Authentication
- JWT-based authentication with configurable expiration
- Encrypted credential storage for external API keys
- CORS configuration for cross-origin requests
- Middleware for logging and security monitoring

## Database Schema
- User management with organization support
- Workflow definitions and execution history
- Encrypted user credentials with proper isolation
- Database health monitoring and connection pooling