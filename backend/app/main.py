"""Agent-Flow V2 FastAPI Application.

Main application entry point with service layer integration,
authentication middleware, and comprehensive API endpoints.
"""

import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, status, Body, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi import APIRouter

# Core imports
from app.core.constants import CREATE_DATABASE
from app.core.node_registry import node_registry
from app.core.engine_v2 import get_engine
from app.core.database import create_tables, get_db_session
from app.core.tracing import setup_tracing

# API routers imports
from app.api.workflows import router as workflows_router
from app.api.executions import router as executions_router
from app.api.nodes import router as nodes_router
from app.api.credentials import router as credentials_router
from app.api.auth import router as auth_router
from app.api.api_key import router as api_key_router
from app.api.chat import router as chat_router
from app.api.variables import router as variables_router

logger = logging.getLogger(__name__)


def validate_env_vars():
    """Check if all required environment variables are set."""
    required_vars = [
        "CREATE_DATABASE",
        "DATABASE_URL",
        "ASYNC_DATABASE_URL"
    ]
    missing = [var for var in required_vars if not os.getenv(var)]
    if missing:
        logger.error(f"❌ Missing required environment variables: {', '.join(missing)}")
        raise RuntimeError("Environment validation failed")
    for var in required_vars:
        logger.info(f"✅ {var} = {os.getenv(var)}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""

    # ✅ Check .env values early
    validate_env_vars()

    logger.info("🚀 Starting Agent-Flow V2 Backend...")
    
    # Initialize node registry
    try:
        node_registry.discover_nodes()
        nodes_count = len(node_registry.nodes)
        logger.info(f"✅ Registered {nodes_count} nodes")
    except Exception as e:
        logger.error(f"❌ Failed to initialize node registry: {e}")
    
    # Initialize engine
    try:
        get_engine()
        logger.info("✅ Engine initialized")
    except Exception as e:
        logger.error(f"❌ Failed to initialize engine: {e}")
    
    # Initialize tracing and monitoring
    try:
        setup_tracing()
        logger.info("✅ Tracing and monitoring initialized")
    except Exception as e:
        logger.error(f"❌ Failed to initialize tracing: {e}")
    
    # Initialize database only if CREATE_DATABASE is enabled
    if CREATE_DATABASE:
        try:
            await create_tables()
            logger.info("✅ Database tables created or already exist.")
        except Exception as e:
            logger.error(f"❌ Database initialization failed: {e}")
    else:
        logger.info("ℹ️ Database creation/validation skipped (CREATE_DATABASE=false or not set)")
    
    logger.info("✅ Backend initialization complete - KAI Fusion Ready!")
    
    yield
    
    # Cleanup
    logger.info("🔄 Shutting down KAI Fusion Backend...")
    logger.info("✅ Backend shutdown complete")


# Create FastAPI application
app = FastAPI(
    title="Agent-Flow V2",
    description="Advanced workflow automation platform with LangGraph engine",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add exception handlers (only if database is available)
# Temporarily disabled due to import issues
# if not DISABLE_DATABASE and DB_AVAILABLE:
#     try:
#         app.add_exception_handler(Exception, agent_flow_exception_handler)
#         # app.add_exception_handler(DatabaseException, database_exception_handler)
#     except:
#         pass

# Include API routers
app.include_router(auth_router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(nodes_router, prefix="/api/v1/nodes", tags=["Nodes"])
app.include_router(workflows_router, prefix="/api/v1/workflows", tags=["Workflows"])
app.include_router(api_key_router, prefix="/api/v1/api-keys", tags=["API Keys"])
app.include_router(executions_router, prefix="/api/v1/executions", tags=["Executions"])
app.include_router(credentials_router, prefix="/api/v1/credentials", tags=["Credentials"])
app.include_router(chat_router, prefix="/api/v1/chat", tags=["Chat"])
app.include_router(variables_router, prefix="/api/v1/variables", tags=["Variables"])


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    try:
        nodes_healthy = len(node_registry.nodes) > 0
        engine_healthy = True
        try:
            engine = get_engine()
        except Exception:
            engine_healthy = False

        if CREATE_DATABASE:
            db_healthy = "enabled"
        else:
            db_healthy = "disabled (CREATE_DATABASE=false)"

        return {
            "status": "healthy" if (nodes_healthy and engine_healthy) else "degraded",
            "version": "2.0.0",
            "timestamp": "2025-01-21T12:00:00Z",
            "components": {
                "node_registry": {
                    "status": "healthy" if nodes_healthy else "error",
                    "nodes_registered": len(node_registry.nodes),
                    "node_types": list(set(node.__name__ for node in node_registry.nodes.values()))
                },
                "engine": {
                    "status": "healthy" if engine_healthy else "error",
                    "type": "LangGraph Unified Engine"
                },
                "database": {
                    "status": db_healthy,
                    "enabled": CREATE_DATABASE
                }
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "unhealthy", "error": str(e)}
        )


@app.get("/api/health", tags=["Health"])
async def health_check_api():
    return await health_check()


@app.get("/info", tags=["Info"])
async def get_info():
    try:
        return {
            "name": "Agent-Flow V2",
            "version": "2.0.0",
            "description": "Advanced workflow automation platform",
            "features": [
                "LangGraph engine integration",
                "Node-based workflow builder", 
                "Real-time execution monitoring",
                "Extensible node system",
                "Database integration"
            ],
            "statistics": {
                "total_nodes": len(node_registry.nodes),
                "node_types": list(set(node.__name__ for node in node_registry.nodes.values())),
                "api_endpoints": 25,
                "database_enabled": CREATE_DATABASE
            },
            "engine": {
                "type": "LangGraph Unified Engine",
                "features": [
                    "Async execution",
                    "State management", 
                    "Checkpointing",
                    "Error handling",
                    "Streaming support"
                ]
            }
        }
    except Exception as e:
        logger.error(f"Info endpoint failed: {e}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": "Failed to retrieve application info"}
        )


@app.get("/api/v1/info", tags=["Info"])
async def get_info_v1():
    original = await get_info()
    if isinstance(original, JSONResponse):
        return original
    original.setdefault("endpoints", [
        "/",
        "/api/health",
        "/api/v1/nodes",
        "/docs",
    ])
    original.setdefault("stats", original.get("statistics", {}))
    return original


@app.get("/", tags=["Root"])
async def root():
    return {
        "status": "healthy",
        "app": "Agent-Flow V2",
        "message": "Agent-Flow V2 API",
        "version": "2.0.0",
        "docs": "/docs",
        "health": "/api/health",
        "info": "/api/v1/info",
        "database_enabled": CREATE_DATABASE
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
