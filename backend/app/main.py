import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, status, Body, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi import APIRouter

# Core imports
from app.core.node_registry import node_registry
from app.core.engine_v2 import get_engine
from app.core.database import get_db_session, check_database_health, get_database_stats
from app.core.tracing import setup_tracing
from app.core.error_handlers import register_exception_handlers

# Middleware imports
from app.middleware import (
    DetailedLoggingMiddleware,
    DatabaseQueryLoggingMiddleware,
    SecurityLoggingMiddleware
)

# API routers imports
from app.api.workflows import router as workflows_router
from app.api.executions import router as executions_router
from app.api.nodes import router as nodes_router
from app.api.credentials import router as credentials_router
from app.api.auth import router as auth_router
from app.api.api_key import router as api_key_router
from app.api.chat import router as chat_router
from app.api.variables import router as variables_router
from app.api.node_configurations import router as node_configurations_router
from app.api.node_registry import router as node_registry_router
from app.api.webhooks import router as webhook_router, trigger_router as webhook_trigger_router
from app.api.documents import router as documents_router
from app.api.scheduled_jobs import router as scheduled_jobs_router
from app.api.vectors import router as vectors_router

from app.routes.export import router as export_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
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
    
    # Initialize database
    try:
        # Test database connection
        db_health = await check_database_health()
        if db_health['healthy']:
            logger.info(f"✅ Database connection test passed ({db_health['response_time_ms']}ms)")
        else:
            logger.error(f"❌ Database connection test failed: {db_health.get('error', 'Unknown error')}")
            raise RuntimeError(f"Database connection test failed: {db_health.get('error', 'Unknown error')}")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        raise e
    
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

# Add comprehensive logging middleware
app.add_middleware(
    DetailedLoggingMiddleware,
    log_request_body=False,  # Set to True for debugging
    log_response_body=False,  # Set to True for debugging
    max_body_size=1024,
    exclude_paths=["/health", "/docs", "/openapi.json", "/redoc"]
)

app.add_middleware(DatabaseQueryLoggingMiddleware)

app.add_middleware(
    SecurityLoggingMiddleware,
    enable_suspicious_detection=True,
    log_all_security_headers=False  # Set to True for security debugging
)

# Register comprehensive exception handlers
register_exception_handlers(app)

# Include API routers

# Core routers (always available)
app.include_router(auth_router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(nodes_router, prefix="/api/v1/nodes", tags=["Nodes"])
app.include_router(workflows_router, prefix="/api/v1/workflows", tags=["Workflows"])
app.include_router(api_key_router, prefix="/api/v1/api-keys", tags=["API Keys"])
app.include_router(executions_router, prefix="/api/v1/executions", tags=["Executions"])
app.include_router(credentials_router, prefix="/api/v1/credentials", tags=["Credentials"])
app.include_router(chat_router, prefix="/api/v1/chat", tags=["Chat"])
app.include_router(variables_router, prefix="/api/v1/variables", tags=["Variables"])
app.include_router(node_configurations_router, prefix="/api/v1/node-configurations", tags=["Node Configurations"])
app.include_router(node_registry_router, prefix="/api/v1/nodes/registry", tags=["Node Registry"])
app.include_router(documents_router, prefix="/api/v1/documents", tags=["Documents"])
app.include_router(scheduled_jobs_router, prefix="/api/v1/jobs/scheduled", tags=["Scheduled Jobs"])
app.include_router(vectors_router, prefix="/api/v1/vectors", tags=["Vector Storage"])

# Include webhook routers
app.include_router(webhook_router, prefix="/api/v1/webhooks", tags=["Webhooks"])
app.include_router(webhook_trigger_router, prefix="/api/v1/webhooks/trigger", tags=["Webhook Triggers"])
app.include_router(export_router, prefix="/api", tags=["Export"])


# Health checks and info endpoints
@app.get("/health", tags=["Health"])
async def health_check():
    """Enhanced health check endpoint with comprehensive monitoring."""
    try:
        # Check node registry health
        nodes_healthy = len(node_registry.nodes) > 0
        
        # Check engine health
        engine_healthy = True
        try:
            engine = get_engine()
        except Exception:
            engine_healthy = False
        
        # Database health check
        db_status = {'enabled': True}
        try:
            db_health = await check_database_health()
            db_status.update({
                'status': 'healthy' if db_health['healthy'] else 'error',
                'response_time_ms': db_health['response_time_ms'],
                'connection_test': db_health['connection_test'],
                'query_test': db_health['query_test'],
                'connected': db_health['healthy']
            })
            
            # Add database statistics
            db_stats = get_database_stats()
            db_status['statistics'] = db_stats
            
        except Exception as e:
            db_status.update({
                'status': 'error',
                'connected': False,
                'error': str(e)
            })
        
        overall_healthy = nodes_healthy and engine_healthy and db_status.get("status") == "healthy"
        
        return {
            "status": "healthy" if overall_healthy else "degraded",
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
                "database": db_status,
                "logging": {
                    "status": "healthy",
                    "middleware_active": True,
                    "error_handlers_registered": True
                }
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "unhealthy", "error": str(e)}
        )

# Legacy alias for health endpoint expected by some clients/tests
@app.get("/api/health", tags=["Health"])
async def health_check_api():
    return await health_check()

# Info endpoint
@app.get("/info", tags=["Info"])
async def get_info():
    """Get application information and statistics."""
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
                "api_endpoints": 25,  # Approximate count
                "database_enabled": True
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

# Legacy alias for info endpoint with additional fields to maintain backward compatibility
@app.get("/api/v1/info", tags=["Info"])
async def get_info_v1():
    original = await get_info()

    # If get_info returned a JSONResponse (error case), forward it as-is
    if isinstance(original, JSONResponse):
        return original

    # Otherwise it's a normal dict – add legacy fields expected by tests
    original.setdefault("endpoints", [
        "/",
        "/api/health",
        "/api/v1/nodes",
        "/docs",
    ])
    original.setdefault("stats", original.get("statistics", {}))
    return original

# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information."""
    return {
        "status": "healthy",
        "app": "Agent-Flow V2",
        "message": "Agent-Flow V2 API",
        "version": "2.0.0",
        "docs": "/docs",
        "health": "/api/health",
        "info": "/api/v1/info",
        "database_enabled": True
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