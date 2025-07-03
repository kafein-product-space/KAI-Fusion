from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging

# Import consolidated components
from app.core.config import get_settings, setup_logging, setup_langsmith, validate_api_keys
from app.core.node_registry import node_registry
from app.core.session_manager import SessionManager
from app.database import db

# Import API routers
from app.api import auth, nodes, workflows, tasks

# Initialize settings and setup
settings = get_settings()
setup_logging(settings)
setup_langsmith(settings)
warnings = validate_api_keys(settings)

# Global session manager
session_manager = SessionManager()

# Define tags metadata for better Swagger organization
tags_metadata = [
    {
        "name": "Authentication",
        "description": "🔐 **User authentication and authorization endpoints**. Sign up, sign in, and manage user sessions with Supabase integration.",
        "externalDocs": {
            "description": "Supabase Auth Documentation",
            "url": "https://supabase.com/docs/guides/auth",
        },
    },
    {
        "name": "Nodes",
        "description": "🧩 **Workflow node management**. Discover available nodes, get node information, and manage the node registry. Includes LLM, Tools, Memory, and other node types.",
    },
    {
        "name": "Workflows", 
        "description": "⚡ **Workflow creation and execution**. Create, update, delete workflows and execute them with real-time streaming support.",
    },
    {
        "name": "Tasks",
        "description": "🔄 **Async task management**. Monitor workflow execution tasks, check progress, cancel tasks, and get execution statistics using Celery + Redis.",
    },
    {
        "name": "Health",
        "description": "🩺 **System health and monitoring**. Check API status, component health, and get system information.",
    },
    {
        "name": "Info",
        "description": "ℹ️ **API information and metadata**. Get details about available endpoints, features, and system statistics.",
    }
]

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logging.info("🚀 Starting Flowise FastAPI Backend...")
    
    # Discover and register all nodes
    logging.info("🔍 Discovering available nodes...")
    node_registry.discover_nodes()
    logging.info(f"✅ Registered {len(node_registry.nodes)} nodes")
    
    # Start session cleanup task
    await session_manager.start_cleanup_task()
    logging.info("🧹 Session cleanup task started")
    
    # Validate integrations
    if warnings:
        for warning in warnings:
            logging.warning(f"⚠️  {warning}")
    
    logging.info("✅ Backend initialization complete")
    
    yield
    
    # Shutdown
    logging.info("🛑 Shutting down backend...")
    await session_manager.stop_cleanup_task()
    logging.info("✅ Cleanup complete")

# Create FastAPI app with comprehensive metadata
app = FastAPI(
    title="🌊 Flowise-FastAPI",
    description="""
    ## 🚀 **AI Workflow Builder & Execution Engine**
    
    A powerful **LangChain-based workflow engine** built with FastAPI, supporting dynamic node creation, 
    workflow execution, and real-time streaming capabilities.
    
    ### ✨ **Key Features**
    - 🧩 **18+ Node Types**: LLM, Tools, Memory, Agents, Chains, Document Loaders, and more
    - ⚡ **Real-time Execution**: Stream workflow results with WebSocket support
    - 🔐 **Secure Authentication**: Supabase integration with JWT tokens
    - 📊 **Visual Workflow Builder**: React Flow-based frontend interface
    - 🔧 **Extensible Architecture**: Plugin-based node system
    - 🐳 **Docker Ready**: Complete containerization support
    
    ### 🏗️ **Architecture**
    Built on **FastAPI** + **LangChain** + **Supabase** + **React** stack for enterprise-grade AI applications.
    
    ### 🌐 **Try the Demo**
    1. **Sign up** → Create your account
    2. **Browse Nodes** → Explore available AI components  
    3. **Build Workflow** → Drag & drop to create your flow
    4. **Execute** → Run and see real-time results
    
    ---
    💡 **Need help?** Check out the `/info` endpoint for API details.
    """,
    version=settings.VERSION,
    debug=settings.DEBUG,
    lifespan=lifespan,
    openapi_tags=tags_metadata,
    contact={
        "name": "Flowise-FastAPI Team",
        "url": "https://github.com/your-repo/flowise-fastapi",
        "email": "contact@example.com",
    },
    license_info={
        "name": "MIT License",
        "identifier": "MIT",
    },
    servers=[
        {
            "url": "http://localhost:8001",
            "description": "Development server",
        },
        {
            "url": "https://your-domain.com",
            "description": "Production server",
        },
    ],
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency injection for shared components
async def get_session_manager():
    return session_manager

async def get_node_registry():
    return node_registry

async def get_database():
    return db

# Include API routers with dependencies
app.include_router(
    auth.router, 
    prefix="/api/v1/auth", 
    tags=["Authentication"]
)

app.include_router(
    nodes.router, 
    prefix="/api/v1/nodes", 
    tags=["Nodes"],
    dependencies=[Depends(get_node_registry)]
)

app.include_router(
    workflows.router, 
    prefix="/api/v1/workflows", 
    tags=["Workflows"],
    dependencies=[Depends(get_session_manager), Depends(get_database)]
)

app.include_router(
    tasks.router, 
    prefix="/api/v1/tasks", 
    tags=["Tasks"],
    dependencies=[Depends(get_database)]
)

# Health check endpoints
@app.get(
    "/", 
    tags=["Health"],
    summary="🏠 Root Health Check",
    description="Quick health check endpoint that returns basic API information and status.",
    response_description="API status and basic information"
)
async def read_root():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "message": "🌊 Flowise FastAPI Backend is running!",
        "docs": "/docs",
        "api": "/api/v1",
        "features": ["AI Workflows", "Real-time Execution", "Node Registry", "Authentication"]
    }

@app.get(
    "/api/health", 
    tags=["Health"],
    summary="🩺 Comprehensive Health Check", 
    description="Detailed health check with component status, warnings, and system metrics.",
    response_description="Detailed system health information"
)
async def health_check():
    """Comprehensive health check with component details"""
    health_status = {
        "status": "healthy",
        "version": settings.VERSION,
        "timestamp": "2025-01-03T12:00:00Z",
        "components": {
            "database": "healthy" if db else "unavailable",
            "node_registry": f"{len(node_registry.nodes)} nodes registered",
            "session_manager": f"{len(session_manager.sessions)} active sessions",
            "auth": "supabase" if settings.SUPABASE_URL else "not configured"
        },
        "warnings": warnings,
        "uptime": "Available in production",
        "memory_usage": "Available in production"
    }
    
    status_code = 200 if all([db, len(node_registry.nodes) > 0]) else 503
    return JSONResponse(content=health_status, status_code=status_code)

@app.get(
    "/api/v1/info", 
    tags=["Info"],
    summary="ℹ️ API Information",
    description="Complete API information including endpoints, features, and system statistics.",
    response_description="API metadata and capabilities"
)
async def get_api_info():
    """API information and available endpoints"""
    return {
        "name": settings.APP_NAME,
        "version": settings.VERSION,
        "description": "AI Workflow Builder & Execution Engine",
        "endpoints": {
            "authentication": {
                "signup": "POST /api/v1/auth/signup",
                "signin": "POST /api/v1/auth/signin", 
                "user": "GET /api/v1/auth/user"
            },
            "nodes": {
                "list": "GET /api/v1/nodes",
                "categories": "GET /api/v1/nodes/categories",
                "info": "GET /api/v1/nodes/{node_type}"
            },
            "workflows": {
                "create": "POST /api/v1/workflows",
                "list": "GET /api/v1/workflows",
                "execute": "POST /api/v1/workflows/execute",
                "stream": "POST /api/v1/workflows/stream"
            },
            "system": {
                "health": "GET /api/health",
                "info": "GET /api/v1/info",
                "docs": "GET /docs"
            }
        },
        "features": {
            "authentication": "Supabase JWT",
            "node_registry": "Dynamic discovery with 18+ types",
            "workflow_engine": "LangChain integration",
            "session_management": "Memory persistence",
            "streaming": "Real-time execution results",
            "docker": "Container deployment ready"
        },
        "node_categories": ["LLM", "Tools", "Memory", "Agents", "Chains", "Document Loaders", "Output Parsers", "Prompts", "Retrievers"],
        "stats": {
            "registered_nodes": len(node_registry.nodes),
            "active_sessions": len(session_manager.sessions),
            "api_version": "v1",
            "environment": "development" if settings.DEBUG else "production"
        }
    }

# Error handlers
@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    return JSONResponse(
        status_code=400,
        content={
            "error": "ValueError", 
            "detail": str(exc),
            "help": "Check your request parameters and try again."
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logging.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error", 
            "detail": "An unexpected error occurred",
            "help": "Please contact support if this persists."
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.RELOAD,
        log_level=settings.LOG_LEVEL.lower()
    ) 