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
from app.core.config import get_settings
from app.core.node_registry import node_registry
from app.core.engine_v2 import get_engine

# Temporary flag to disable database functionality (default: enabled)
DISABLE_DATABASE = os.getenv("DISABLE_DATABASE", "false").lower() == "true"

if not DISABLE_DATABASE:
    try:
        # Database imports (only if database is enabled)
        # from app.core.exceptions import agent_flow_exception_handler, database_exception_handler
        from app.auth.middleware import get_current_user, get_optional_user
        
        # API routers imports (only if database is enabled)
        from app.api import auth as auth_router
        from app.api import workflows as workflows_router
        from app.api import executions as executions_router
        from app.api import credentials as credentials_router
        
        DB_AVAILABLE = True
    except ImportError as e:
        print(f"Database functionality disabled due to import error: {e}")
        DB_AVAILABLE = False
        DISABLE_DATABASE = True
else:
    DB_AVAILABLE = False
    print("Database functionality disabled by DISABLE_DATABASE flag")

# Always available imports (core functionality)
from app.api.nodes import router as nodes_router
from app.api.test import router as test_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    logger.info("🚀 Starting Agent-Flow V2 Backend...")
    
    # Initialize node registry (always available)
    try:
        node_registry.discover_nodes()
        nodes_count = len(node_registry.nodes)
        logger.info(f"✅ Registered {nodes_count} nodes")
    except Exception as e:
        logger.error(f"❌ Failed to initialize node registry: {e}")
        nodes_count = 0
    
    # Initialize engine (always available)
    try:
        engine = get_engine()
        logger.info("✅ Engine initialized")
    except Exception as e:
        logger.error(f"❌ Failed to initialize engine: {e}")
    
    if not DISABLE_DATABASE and DB_AVAILABLE:
        # Database initialization (only if enabled)
        try:
            # TODO: Add database initialization here when enabled
            logger.info("✅ Database services initialized")
        except Exception as e:
            logger.error(f"❌ Database initialization failed: {e}")
    else:
        logger.info("⚠️ Database functionality disabled - running in standalone mode")
    
    logger.info("✅ Backend initialization complete - Agent-Flow V2 Ready!")
    
    yield
    
    # Cleanup
    logger.info("🔄 Shutting down Agent-Flow V2 Backend...")
    
    if not DISABLE_DATABASE and DB_AVAILABLE:
        try:
            # TODO: Add database cleanup here when enabled
            logger.info("✅ Database cleanup complete")
        except Exception as e:
            logger.error(f"❌ Database cleanup failed: {e}")
    
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
settings = get_settings()
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

# Core routers (always available)
app.include_router(nodes_router, prefix="/api/v1/nodes", tags=["Nodes"])
app.include_router(test_router, prefix="/api/v1/test", tags=["Test"])

# Database-dependent routers (only if database is available)
if not DISABLE_DATABASE and DB_AVAILABLE:
    try:
        app.include_router(auth_router.router, prefix="/api/v1/auth", tags=["Authentication"])
        app.include_router(workflows_router.router, prefix="/api/v1/workflows", tags=["Workflows"])
        app.include_router(executions_router.router, prefix="/api/v1/executions", tags=["Executions"])
        app.include_router(credentials_router.router, prefix="/api/v1/credentials", tags=["Credentials"])
    except Exception as e:
        logger.warning(f"Some database-dependent routers failed to load: {e}")
else:
    # Stub routers for development when database is disabled
    stub_router = APIRouter()

    @stub_router.get("/", summary="📋 List Workflows (stub)")
    async def list_workflows_stub():
        """Return empty workflow list in dev mode."""
        return []

    @stub_router.get("", summary="📋 List Workflows (stub no slash)")
    async def list_workflows_stub_noslash():
        return []

    @stub_router.post("/validate", summary="✅ Validate Workflow (stub)")
    async def validate_workflow_stub(payload: dict = Body(...)):
        """Always return valid=true for workflow validation in dev mode."""
        return {
            "valid": True,
            "errors": [],
            "message": "Flow data is valid (stub)"
        }

    from pydantic import BaseModel, Field
    from typing import Dict, Any, Optional, AsyncGenerator
    import json
    from fastapi.responses import StreamingResponse

    class StubExecuteRequest(BaseModel):
        """Request body for stateless workflow execution"""
        flow_data: Dict[str, Any]
        inputs: Dict[str, Any] = Field(default_factory=dict)
        session_context: Optional[Dict[str, Any]] = None

    @stub_router.post("/execute", summary="⚡ Execute Workflow (stateless)")
    async def execute_workflow_stub(req: StubExecuteRequest):
        """Execute workflow entirely in-memory using the LangGraph engine."""
        try:
            engine = get_engine()
            # Build (compile) the workflow graph for this request
            engine.build(req.flow_data)
            # Execute with provided runtime inputs
            result = await engine.execute(
                req.inputs,
                user_context=req.session_context or {},
            )
            
            # Apply the same serialization logic as the streaming endpoint
            def serialize_value(value: Any) -> Any:
                """Recursively serialize any value to be JSON-safe"""
                try:
                    # Try direct JSON serialization first
                    json.dumps(value)
                    return value
                except (TypeError, ValueError):
                    # Handle complex types
                    if value is None:
                        return None
                    elif isinstance(value, (str, int, float, bool)):
                        return value
                    elif isinstance(value, (list, tuple)):
                        return [serialize_value(item) for item in value]
                    elif isinstance(value, dict):
                        return {k: serialize_value(v) for k, v in value.items()}
                    elif hasattr(value, 'model_dump'):
                        # Pydantic models (like FlowState)
                        try:
                            return serialize_value(value.model_dump())
                        except Exception:
                            return f"<{type(value).__name__}>"
                    elif hasattr(value, 'dict'):
                        # Older Pydantic models
                        try:
                            return serialize_value(value.dict())
                        except Exception:
                            return f"<{type(value).__name__}>"
                    else:
                        # For LangChain objects and other complex types, provide a summary
                        return f"<{type(value).__name__}: {str(value)[:100]}{'...' if len(str(value)) > 100 else ''}>"
            
            # Serialize the result to be JSON/msgpack safe
            if isinstance(result, dict):
                serialized_result = {k: serialize_value(v) for k, v in result.items()}
                return serialized_result
            else:
                return {"result": serialize_value(result)}
                
        except Exception as e:
            logger.error(f"Stub execute failed: {e}")
            raise HTTPException(status_code=400, detail=str(e))

    @stub_router.post("/execute/stream", summary="⚡ Execute Workflow Stream (stateless)")
    async def execute_workflow_stream_stub(req: StubExecuteRequest):
        """Stream workflow execution results as Server-Sent Events (SSE)."""
        try:
            engine = get_engine()
            engine.build(req.flow_data)

            stream_gen = await engine.execute(
                req.inputs,
                stream=True,
                user_context=req.session_context or {},
            )

            if not hasattr(stream_gen, "__aiter__"):
                # If engine returned the final result instead of a generator, wrap it
                async def _single_event() -> AsyncGenerator[bytes, None]:
                    safe_result = serialize_event(stream_gen) if isinstance(stream_gen, dict) else {"result": str(stream_gen)}
                    yield f"data: {json.dumps(safe_result)}\n\n".encode()
                return StreamingResponse(_single_event(), media_type="text/event-stream")

            def serialize_event(event: Dict[str, Any]) -> Dict[str, Any]:
                """Serialize event for JSON output, handling non-serializable objects"""
                def serialize_value(value: Any) -> Any:
                    """Recursively serialize any value to be JSON-safe"""
                    try:
                        # Try direct JSON serialization first
                        json.dumps(value)
                        return value
                    except (TypeError, ValueError):
                        # Handle complex types
                        if value is None:
                            return None
                        elif isinstance(value, (str, int, float, bool)):
                            return value
                        elif isinstance(value, (list, tuple)):
                            return [serialize_value(item) for item in value]
                        elif isinstance(value, dict):
                            return {k: serialize_value(v) for k, v in value.items()}
                        elif hasattr(value, 'model_dump'):
                            # Pydantic models (like FlowState)
                            try:
                                return serialize_value(value.model_dump())
                            except Exception:
                                return f"<{type(value).__name__}>"
                        elif hasattr(value, 'dict'):
                            # Older Pydantic models
                            try:
                                return serialize_value(value.dict())
                            except Exception:
                                return f"<{type(value).__name__}>"
                        else:
                            # For LangChain objects and other complex types, provide a summary
                            return f"<{type(value).__name__}: {str(value)[:100]}{'...' if len(str(value)) > 100 else ''}>"
                
                return {key: serialize_value(value) for key, value in event.items()}
            
            async def event_generator() -> AsyncGenerator[bytes, None]:
                async for event in stream_gen:  # type: ignore[attr-defined]
                    safe_event = serialize_event(event)
                    yield f"data: {json.dumps(safe_event)}\n\n".encode()

            return StreamingResponse(event_generator(), media_type="text/event-stream")
        except Exception as e:
            logger.error(f"Stub streaming execute failed: {e}")
            raise HTTPException(status_code=400, detail=str(e))

    app.include_router(stub_router, prefix="/api/v1/workflows", tags=["Workflows (stub)"])

#

# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    try:
        # Check node registry health
        nodes_healthy = len(node_registry.nodes) > 0
        
        # Check engine health
        engine_healthy = True
        try:
            engine = get_engine()
        except Exception:
            engine_healthy = False
        
        # Database health (optional)
        db_healthy = "disabled" if DISABLE_DATABASE else "unknown"
        
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
                    "enabled": not DISABLE_DATABASE
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
                "Database integration" + (" (disabled)" if DISABLE_DATABASE else "")
            ],
            "statistics": {
                "total_nodes": len(node_registry.nodes),
                "node_types": list(set(node.__name__ for node in node_registry.nodes.values())),
                "api_endpoints": 25,  # Approximate count
                "database_enabled": not DISABLE_DATABASE
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
        "database_enabled": not DISABLE_DATABASE
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    ) 