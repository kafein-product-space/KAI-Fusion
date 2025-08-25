# -*- coding: utf-8 -*-
"""Export functionality router."""

import logging
import uuid
import os
import tempfile
import zipfile
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, File, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.workflow import Workflow
from app.services.workflow_service import WorkflowService
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.core.database import get_db_session
from app.core.dynamic_node_analyzer import DynamicNodeAnalyzer
from app.core.node_registry import node_registry

logger = logging.getLogger(__name__)
router = APIRouter()

# ================================================================================
# WORKFLOW DOCKER EXPORT SCHEMAS
# ================================================================================

class WorkflowExportConfig(BaseModel):
    """Configuration for basic workflow export request."""
    include_credentials: bool = Field(default=False, description="Include credential schemas")
    export_format: str = Field(default="docker", description="Export format (docker, json)")

class EnvironmentVariable(BaseModel):
    """Environment variable definition."""
    name: str
    description: str
    example: Optional[str] = None
    default: Optional[str] = None
    required: bool = True
    node_type: Optional[str] = None

class WorkflowDependencies(BaseModel):
    """Workflow dependencies analysis result."""
    workflow_id: str
    nodes: List[str]
    required_env_vars: List[EnvironmentVariable]
    optional_env_vars: List[EnvironmentVariable]
    python_packages: List[str]
    api_endpoints: List[str]

class SecurityConfig(BaseModel):
    """Security configuration for exported workflow."""
    allowed_hosts: str = Field(default="*", description="Comma-separated allowed hosts (* for all hosts)")
    api_keys: Optional[str] = Field(default=None, description="Comma-separated API keys")
    require_api_key: bool = Field(default=False, description="Whether to require API key authentication")
    custom_api_keys: Optional[str] = Field(default=None, description="User custom API keys")

class MonitoringConfig(BaseModel):
    """Monitoring configuration for exported workflow."""
    enable_langsmith: bool = Field(default=False, description="Enable LangSmith monitoring")
    langsmith_api_key: Optional[str] = Field(default=None, description="LangSmith API key")
    langsmith_project: Optional[str] = Field(default=None, description="LangSmith project name")

class DockerConfig(BaseModel):
    """Docker configuration for exported workflow."""
    api_port: int = Field(default=8000, description="Internal API port")
    docker_port: int = Field(default=8000, description="External Docker port")
    database_url: Optional[str] = Field(default=None, description="External database URL")

class WorkflowEnvironmentConfig(BaseModel):
    """Complete environment configuration from user."""
    env_vars: Dict[str, str] = Field(default_factory=dict, description="Environment variables")
    security: SecurityConfig = Field(default_factory=SecurityConfig, description="Security settings")
    monitoring: MonitoringConfig = Field(default_factory=MonitoringConfig, description="Monitoring settings")
    docker: DockerConfig = Field(default_factory=DockerConfig, description="Docker settings")

class ExportPackage(BaseModel):
    """Export package information."""
    download_url: str
    package_size: int
    workflow_id: str
    export_timestamp: str
    ready_to_run: bool
    instructions: str

# ================================================================================
# DYNAMIC NODE ANALYSIS SYSTEM
# ================================================================================

# Initialize dynamic analyzer (replaces static NODE_ENV_MAPPING)
dynamic_analyzer = DynamicNodeAnalyzer(node_registry)

# Legacy compatibility layer - for gradual migration
LEGACY_ENV_DESCRIPTIONS = {
    # Core system
    "DATABASE_URL": "PostgreSQL database connection URL for workflow data",
    "SECRET_KEY": "Secret key for JWT authentication and encryption",
    "WORKFLOW_ID": "Unique identifier for the exported workflow",
    
    # Monitoring
    "LANGCHAIN_API_KEY": "LangSmith API key for optional monitoring",
    "LANGCHAIN_PROJECT": "LangSmith project name for tracing",
    "LANGCHAIN_TRACING_V2": "Enable LangSmith tracing (true/false)",
    
    # Security
    "API_KEYS": "Comma-separated API keys for authentication",
    "REQUIRE_API_KEY": "Whether API key authentication is required",
    
    # Runtime
    "API_HOST": "Host address for the API server",
    "API_PORT": "Internal port for the API server",
    "DOCKER_PORT": "External Docker port mapping"
}

LEGACY_ENV_EXAMPLES = {
    "DATABASE_URL": "postgresql://user:password@localhost:5432/workflow_db",
    "SECRET_KEY": "your-secret-key-here",
    "LANGCHAIN_API_KEY": "lsv2_sk_abc123...",
    "API_KEYS": "key1,key2,key3",
    "REQUIRE_API_KEY": "true",
    "LANGCHAIN_TRACING_V2": "true"
}

# ================================================================================
# HELPER FUNCTIONS  
# ================================================================================

def analyze_workflow_dependencies(flow_data: Dict[str, Any]) -> WorkflowDependencies:
    """
    Dynamic workflow dependency analysis using DynamicNodeAnalyzer.
    
    This function replaces the static NODE_ENV_MAPPING approach with intelligent
    node metadata analysis for automatic environment variable detection,
    package dependency resolution, and Docker configuration optimization.
    """
    logger.info("🔍 Starting dynamic workflow dependency analysis")
    
    try:
        # Initialize dynamic analyzer with node registry
        analyzer = dynamic_analyzer
        
        # Perform comprehensive workflow analysis
        analysis_result = analyzer.analyze_workflow(flow_data)
        
        logger.info(f"✅ Dynamic analysis complete - Found {len(analysis_result.node_types)} node types")
        logger.info(f"📋 Environment variables: {len(analysis_result.required_env_vars)} required, {len(analysis_result.optional_env_vars)} optional")
        logger.info(f"📦 Package dependencies: {len(analysis_result.package_dependencies)} packages")
        
        # Convert DynamicAnalysisResult to WorkflowDependencies format
        required_env_vars = []
        optional_env_vars = []
        
        # Process required environment variables
        for env_var in analysis_result.required_env_vars:
            required_env_vars.append(EnvironmentVariable(
                name=env_var.name,
                description=env_var.description,
                example=env_var.example or "",
                required=True,
                node_type=env_var.source_node or "Dynamic"
            ))
        
        # Process optional environment variables
        for env_var in analysis_result.optional_env_vars:
            optional_env_vars.append(EnvironmentVariable(
                name=env_var.name,
                description=env_var.description,
                example=env_var.example or "",
                default=env_var.default_value or "",
                required=False,
                node_type=env_var.source_node or "Dynamic"
            ))
        
        # Add system-level required variables
        if not any(var.name == "DATABASE_URL" for var in required_env_vars):
            required_env_vars.append(EnvironmentVariable(
                name="DATABASE_URL",
                description="PostgreSQL database connection URL for workflow execution data",
                example="postgresql://user:password@localhost:5432/workflow_db",
                required=True,
                node_type="System"
            ))
        
        # Add monitoring variables as optional
        if not any(var.name == "LANGCHAIN_API_KEY" for var in optional_env_vars):
            optional_env_vars.append(EnvironmentVariable(
                name="LANGCHAIN_API_KEY",
                description="LangSmith API key for monitoring (optional)",
                example="lsv2_sk_abc123...",
                default="",
                required=False,
                node_type="Monitoring"
            ))
        
        # Define standard API endpoints
        api_endpoints = [
            "POST /api/workflow/execute",
            "GET /api/workflow/status/{execution_id}",
            "GET /api/workflow/result/{execution_id}",
            "GET /api/health",
            "GET /api/workflow/info",
            "GET /api/workflow/external/info",
            "POST /api/workflow/external/ping",
            "GET /api/workflow/external/metrics"
        ]
        
        logger.info(f"🎯 Dynamic analysis summary:")
        logger.info(f"   • Node types: {', '.join(analysis_result.node_types)}")
        logger.info(f"   • Critical credentials detected: {len([v for v in analysis_result.required_env_vars if v.security_level in ['critical', 'high']])}")
        logger.info(f"   • Package dependencies: {len(analysis_result.package_dependencies)}")
        
        return WorkflowDependencies(
            workflow_id="temp_id",
            nodes=analysis_result.node_types,
            required_env_vars=required_env_vars,
            optional_env_vars=optional_env_vars,
            python_packages=analysis_result.package_dependencies,
            api_endpoints=api_endpoints
        )
        
    except Exception as e:
        logger.error(f"❌ Dynamic workflow analysis failed: {e}", exc_info=True)
        logger.warning("🔄 Falling back to legacy static analysis")
        
        # Fallback to simplified static analysis for safety
        return _fallback_static_analysis(flow_data)

def _fallback_static_analysis(flow_data: Dict[str, Any]) -> WorkflowDependencies:
    """
    Fallback static analysis for error conditions.
    
    Provides basic dependency analysis when dynamic analysis fails,
    ensuring export functionality remains available.
    """
    logger.info("🔄 Executing fallback static analysis")
    
    nodes = flow_data.get("nodes", [])
    node_types = list(set(node.get("type", "") for node in nodes if node.get("type")))
    
    # Basic required environment variables
    required_env_vars = [
        EnvironmentVariable(
            name="DATABASE_URL",
            description="Database connection URL for workflow execution",
            example="postgresql://user:password@localhost:5432/workflow_db",
            required=True,
            node_type="System"
        )
    ]
    
    # Basic optional environment variables
    optional_env_vars = [
        EnvironmentVariable(
            name="LANGCHAIN_API_KEY",
            description="LangSmith API key for monitoring (optional)",
            example="lsv2_sk_abc123...",
            default="",
            required=False,
            node_type="Monitoring"
        )
    ]
    
    # Basic package dependencies
    python_packages = [
        "fastapi>=0.104.0",
        "uvicorn[standard]>=0.24.0",
        "sqlalchemy>=2.0.0",
        "asyncpg>=0.28.0",
        "pydantic>=2.5.0",
        "langchain>=0.1.0",
        "langchain-core>=0.1.0"
    ]
    
    # API endpoints
    api_endpoints = [
        "POST /api/workflow/execute",
        "GET /api/workflow/status/{execution_id}",
        "GET /api/health",
        "GET /api/workflow/info"
    ]
    
    return WorkflowDependencies(
        workflow_id="temp_id",
        nodes=node_types,
        required_env_vars=required_env_vars,
        optional_env_vars=optional_env_vars,
        python_packages=python_packages,
        api_endpoints=api_endpoints
    )

def get_required_env_vars_for_workflow(dependencies: WorkflowDependencies) -> Dict[str, Any]:
    """Get required environment variables for workflow."""
    return {
        "required": [
            {
                "name": var.name,
                "description": var.description,
                "example": var.example,
                "node": var.node_type
            }
            for var in dependencies.required_env_vars
        ],
        "optional": [
            {
                "name": var.name,
                "description": var.description,
                "default": var.default,
                "node": var.node_type
            }
            for var in dependencies.optional_env_vars
        ]
    }

# ================================================================================
# WORKFLOW DOCKER EXPORT ENDPOINTS
# ================================================================================

@router.post("/export/workflow/{workflow_id}", tags=["Export"])
async def export_workflow(
    workflow_id: str,
    export_config: WorkflowExportConfig,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    workflow_service: WorkflowService = Depends()
):
    """
    Initialize workflow export and return required environment variables.
    
    This endpoint analyzes the workflow and returns the required environment
    variables that need to be provided by the user to complete the export.
    """
    try:
        logger.info(f"Starting workflow export for workflow_id: {workflow_id}")
        
        # Get workflow
        workflow = await workflow_service.get_by_id(
            db, uuid.UUID(workflow_id), current_user.id
        )
        
        if not workflow:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workflow not found or access denied"
            )
        
        # Analyze dependencies
        dependencies = analyze_workflow_dependencies(workflow.flow_data)
        dependencies.workflow_id = workflow_id
        
        # Get required environment variables
        required_env_vars = get_required_env_vars_for_workflow(dependencies)
        
        logger.info(f"Workflow analysis complete. Required vars: {len(required_env_vars['required'])}")
        
        return {
            "workflow_id": workflow_id,
            "workflow_name": workflow.name,
            "workflow_description": workflow.description,
            "required_env_vars": required_env_vars,
            "dependencies": {
                "nodes": dependencies.nodes,
                "python_packages": dependencies.python_packages,
                "api_endpoints": dependencies.api_endpoints
            },
            "export_ready": False,
            "message": "Please provide environment variables to complete export"
        }
        
    except ValueError as e:
        logger.error(f"Invalid workflow ID: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid workflow ID format"
        )
    except Exception as e:
        logger.error(f"Workflow export initialization failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initialize workflow export"
        )

@router.post("/export/workflow/{workflow_id}/complete", tags=["Export"])
async def complete_workflow_export(
    workflow_id: str,
    env_config: WorkflowEnvironmentConfig,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    workflow_service: WorkflowService = Depends()
):
    """
    Complete workflow export with user-provided environment variables.
    
    This endpoint creates a ready-to-run Docker package with the user's
    environment configuration, security settings, and monitoring options.
    """
    try:
        logger.info(f"Completing workflow export for workflow_id: {workflow_id}")
        
        # Get workflow
        workflow = await workflow_service.get_by_id(
            db, uuid.UUID(workflow_id), current_user.id
        )
        
        if not workflow:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workflow not found or access denied"
            )
        
        # Re-analyze dependencies
        dependencies = analyze_workflow_dependencies(workflow.flow_data)
        dependencies.workflow_id = workflow_id
        
        # Validate environment variables
        validation_result = validate_env_variables(dependencies, env_config.env_vars)
        if not validation_result["valid"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid environment variables: {validation_result['errors']}"
            )
        
        # Create minimal backend components
        minimal_backend = create_minimal_backend(dependencies)
        
        # Filter requirements for nodes
        filtered_requirements = filter_requirements_for_nodes(dependencies.nodes)
        
        # Create pre-configured .env file
        pre_configured_env = create_pre_configured_env_file(
            dependencies, env_config.env_vars, env_config.security, 
            env_config.monitoring, env_config.docker, workflow.flow_data
        )
        
        # Create Docker context
        docker_context = create_ready_to_run_docker_context(
            workflow, minimal_backend, pre_configured_env, env_config.docker
        )
        
        # Create export package
        export_package = create_workflow_export_package({
            'workflow': workflow,
            'backend': minimal_backend,
            'pre_configured_env': pre_configured_env,
            'docker_configs': docker_context,
            'filtered_requirements': filtered_requirements,
            'readme': generate_ready_to_run_readme(workflow.name, env_config)
        })
        
        logger.info(f"Export package created: {export_package['download_url']}")
        
        return {
            "workflow_id": workflow_id,
            "download_url": export_package["download_url"],
            "package_size": export_package["package_size"],
            "ready_to_run": True,
            "export_timestamp": datetime.now().isoformat(),
            "instructions": "Extract and run: docker-compose up -d",
            "package_info": {
                "workflow_name": workflow.name,
                "included_nodes": dependencies.nodes,
                "api_port": env_config.docker.docker_port,
                "security_enabled": env_config.security.require_api_key,
                "monitoring_enabled": env_config.monitoring.enable_langsmith
            }
        }
        
    except ValueError as e:
        logger.error(f"Invalid workflow ID: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid workflow ID format"
        )
    except Exception as e:
        logger.error(f"Workflow export completion failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete workflow export"
        )

def validate_env_variables(dependencies: WorkflowDependencies, env_vars: Dict[str, str]) -> Dict[str, Any]:
    """Validate provided environment variables against requirements."""
    errors = []
    warnings = []
    
    # Check required variables
    for var in dependencies.required_env_vars:
        if var.name not in env_vars or not env_vars[var.name].strip():
            errors.append(f"Required environment variable '{var.name}' is missing or empty")
    
    # Check for potentially invalid values
    for var_name, var_value in env_vars.items():
        if var_name == "OPENAI_API_KEY" and not var_value.startswith("sk-"):
            warnings.append(f"OpenAI API key format may be invalid (should start with 'sk-')")
        elif var_name == "TAVILY_API_KEY" and not var_value.startswith("tvly-"):
            warnings.append(f"Tavily API key format may be invalid (should start with 'tvly-')")
        elif var_name == "DATABASE_URL" and not var_value.startswith(("postgresql://", "mysql://", "sqlite://")):
            warnings.append(f"Database URL format may be invalid")
    
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings
    }

def create_minimal_backend(dependencies: WorkflowDependencies) -> Dict[str, str]:
    """Create minimal backend components for workflow runtime."""
    logger.info("Creating minimal backend components")
    
    # Main application file
    main_py = f'''# -*- coding: utf-8 -*-
"""
Minimal KAI-Fusion Workflow Runtime
Auto-generated runtime for workflow: {dependencies.workflow_id}
"""

import os
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import uuid

# Import modular components
from app.api.workflow import router as workflow_router
from app.api.health import router as health_router
from app.core.config import settings
from app.core.database import init_database, close_database

# Configure logging
logging.basicConfig(
    level=getattr(logging, os.getenv('LOG_LEVEL', 'INFO')),
    format=os.getenv('LOG_FORMAT', '%(asctime)s - %(name)s - %(levelname)s - %(message)s')
)
logger = logging.getLogger(__name__)

# Load workflow definition
try:
    with open('workflow-definition.json', 'r', encoding='utf-8') as f:
        WORKFLOW_DEFINITION = json.load(f)
    logger.info("Workflow definition loaded successfully")
except Exception as e:
    logger.error(f"Failed to load workflow definition: {{e}}")
    WORKFLOW_DEFINITION = {{"nodes": [], "edges": []}}

# Security configuration
API_KEYS = [key.strip() for key in (settings.API_KEYS or '').split(',') if key.strip()]
# Use REQUIRE_API_KEY setting from export configuration
REQUIRE_API_KEY = settings.REQUIRE_API_KEY.lower() == 'true'

# Minimal startup log (avoid template-time f-string evaluation)
logger.info("Workflow runtime security configuration loaded")

# Initialize FastAPI
app = FastAPI(
    title="KAI-Fusion Workflow Runtime",
    description=f"Runtime for workflow: {{settings.WORKFLOW_ID}}",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for workflow exports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request models
class WorkflowExecuteRequest(BaseModel):
    input: str
    parameters: Dict[str, Any] = {{}}

class WorkflowExecuteResponse(BaseModel):
    execution_id: str
    status: str
    result: Optional[Any] = None
    error: Optional[str] = None
    timestamp: str

# Security middleware
@app.middleware("http")
async def security_middleware(request: Request, call_next):
    # API key validation only (no host validation as requested)
    if REQUIRE_API_KEY:
        path = request.url.path
        if path.startswith("/api/") and not path.startswith("/api/health"):
            api_key = request.headers.get("X-API-Key")
            auth_header = request.headers.get("Authorization")

            if not api_key and auth_header and auth_header.startswith("Bearer "):
                api_key = auth_header.split(" ")[1]

            if not api_key:
                logger.warning("API key is missing")
                raise HTTPException(status_code=401, detail="API key required")
            if api_key not in API_KEYS:
                logger.warning("Invalid API key provided")
                raise HTTPException(status_code=401, detail="Invalid API key")
            logger.info("Request authenticated successfully")

    response = await call_next(request)
    return response

# Include API routers
app.include_router(health_router, prefix="/api/health", tags=["Health"])
app.include_router(workflow_router, prefix="/api/workflow", tags=["Workflow"])

# Root endpoint
@app.get("/")
async def root():
    return {{
        "service": "KAI-Fusion Workflow Runtime",
        "version": "1.0.0", 
        "workflow_id": settings.WORKFLOW_ID,
        "status": "running",
        "docs": "/docs",
        "api_endpoints": {{
            "health": "/api/health",
            "workflow": "/api/workflow",
            "execute": "/api/workflow/execute"
        }}
    }}

# Legacy health endpoint for backwards compatibility 
@app.get("/health")
async def legacy_health():
    return {{
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "workflow_id": settings.WORKFLOW_ID
    }}

# Application lifecycle events
@app.on_event("startup")
async def startup_event():
    """Initialize database and services on startup."""
    try:
        await init_database()
        logger.info("Workflow runtime started successfully")
    except Exception as e:
        logger.error(f"Startup failed: {{e}}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources on shutdown."""
    try:
        await close_database()
        logger.info("Workflow runtime stopped")
    except Exception as e:
        logger.error(f"Shutdown error: {{e}}")

# Placeholder external workflow integration
@app.get("/api/workflow/external/info")
async def get_external_workflow_info():
    return {{
        "workflow_id": settings.WORKFLOW_ID,
        "name": WORKFLOW_DEFINITION.get("name", "External Workflow"),
        "description": WORKFLOW_DEFINITION.get("description", "Exported workflow running in Docker"),
        "version": "1.0.0",
        "is_external": True,
        "external_host": os.getenv('EXTERNAL_HOST', ''),
        "flow_data": WORKFLOW_DEFINITION,
        "capabilities": {{
            "execution": True,
            "monitoring": bool(os.getenv("LANGCHAIN_TRACING_V2")),
            "api_key_required": REQUIRE_API_KEY
        }},
        "connection_info": {{
            "last_ping": datetime.now().isoformat(),
            "uptime": "healthy",
            "health": "healthy"
        }}
    }}

@app.post("/api/workflow/external/ping")
async def external_ping():
    return {{
        "status": "alive",
        "timestamp": datetime.now().isoformat(),
        "workflow_id": settings.WORKFLOW_ID,
        "uptime": "healthy"
    }}

# Workflow execution (placeholder - would integrate with actual engine)
@app.post("/api/workflow/execute", response_model=WorkflowExecuteResponse)
async def execute_workflow(request: WorkflowExecuteRequest):
    execution_id = str(uuid.uuid4())
    
    try:
        # TODO: Integrate with actual workflow engine
        # This is a placeholder implementation
        result = {{
            "message": "Workflow execution completed",
            "input": request.input,
            "parameters": request.parameters,
            "processed_at": datetime.now().isoformat()
        }}
        
        return WorkflowExecuteResponse(
            execution_id=execution_id,
            status="completed",
            result=result,
            timestamp=datetime.now().isoformat()
        )
    
    except Exception as e:
        logger.error(f"Workflow execution failed: {{e}}")
        return WorkflowExecuteResponse(
            execution_id=execution_id,
            status="failed",
            error=str(e),
            timestamp=datetime.now().isoformat()
        )

@app.get("/api/workflow/status/{{execution_id}}")
async def get_execution_status(execution_id: str):
    # TODO: Implement actual status tracking
    return {{
        "execution_id": execution_id,
        "status": "completed",
        "timestamp": datetime.now().isoformat()
    }}

@app.get("/api/workflow/result/{{execution_id}}")
async def get_execution_result(execution_id: str):
    # TODO: Implement actual result retrieval
    return {{
        "execution_id": execution_id,
        "result": "Placeholder result",
        "timestamp": datetime.now().isoformat()
    }}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=settings.HOST,
        port=settings.API_PORT
    )
'''
    
    # Dockerfile
    dockerfile = f'''FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    libpq-dev \\
    curl \\
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies  
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir uvicorn[standard]>=0.24.0 sqlalchemy>=2.0.0 asyncpg>=0.28.0

# Copy application files
COPY main.py .
COPY app/ ./app/
COPY workflow-definition.json .
COPY .env .

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \\
    CMD curl -f http://localhost:8000/health || exit 1

# Create logs directory with proper permissions
RUN mkdir -p /app/logs && \\
    chmod -R 755 /app && \\
    chown -R root:root /app

EXPOSE 8000

# Create startup script to ensure uvicorn is available
RUN echo '#!/bin/bash' > /start.sh && \\
    echo 'echo "Checking required packages..."' >> /start.sh && \\
    echo 'python -m pip show uvicorn || pip install uvicorn[standard]' >> /start.sh && \\
    echo 'python -m pip show asyncpg || pip install asyncpg' >> /start.sh && \\
    echo 'python -m pip show sqlalchemy || pip install sqlalchemy' >> /start.sh && \\
    echo 'echo "Starting application..."' >> /start.sh && \\
    echo 'cd /app' >> /start.sh && \\
    echo 'exec python -m uvicorn main:app --host 0.0.0.0 --port $API_PORT --log-level info' >> /start.sh && \\
    chmod +x /start.sh

# Start application
CMD ["/start.sh"]
'''
    
    return {
        "main.py": main_py,
        "Dockerfile": dockerfile
    }

def filter_requirements_for_nodes(node_types: List[str]) -> str:
    """
    Dynamic requirements filtering using DynamicNodeAnalyzer.
    
    Generates optimized requirements.txt based on actual node dependencies
    detected through dynamic analysis instead of static mappings.
    """
    logger.info(f"🔍 Filtering requirements dynamically for nodes: {node_types}")
    
    try:
        # Use dynamic analyzer to get package dependencies
        analyzer = dynamic_analyzer
        
        # Create a minimal flow_data structure for package analysis
        # This leverages the existing analysis results from workflow analysis
        flow_data = {
            "nodes": [{"type": node_type, "id": f"node_{i}", "data": {}}
                     for i, node_type in enumerate(node_types)]
        }
        
        # Perform package analysis
        analysis_result = analyzer.analyze_workflow(flow_data)
        
        # Get dynamically determined packages
        dynamic_packages = analysis_result.package_dependencies
        
        logger.info(f"✅ Dynamic package analysis complete - Found {len(dynamic_packages)} packages")
        logger.info(f"📦 Key packages: {', '.join(dynamic_packages[:5])}{'...' if len(dynamic_packages) > 5 else ''}")
        
        return "\n".join(sorted(dynamic_packages))
        
    except Exception as e:
        logger.error(f"❌ Dynamic package filtering failed: {e}", exc_info=True)
        logger.warning("🔄 Falling back to static package filtering")
        
        # Fallback to static requirements for safety
        return _fallback_static_requirements(node_types)

def _fallback_static_requirements(node_types: List[str]) -> str:
    """
    Fallback static requirements generation for error conditions.
    
    Provides basic package requirements when dynamic analysis fails,
    ensuring export functionality remains available.
    """
    logger.info("🔄 Executing fallback static requirements generation")
    
    # Essential base packages for any workflow
    base_packages = [
        "fastapi>=0.104.0",
        "uvicorn[standard]>=0.24.0",
        "sqlalchemy>=2.0.0",
        "asyncpg>=0.28.0",
        "pydantic>=2.5.0",
        "python-dotenv>=1.0.0",
        "httpx>=0.25.0",
        "requests>=2.31.0"
    ]
    
    # Essential LangChain packages
    langchain_packages = [
        "langchain>=0.1.0",
        "langchain-core>=0.1.0",
        "langchain-community>=0.0.10"
    ]
    
    # Node-specific packages (minimal set)
    node_packages = []
    for node_type in node_types:
        if "OpenAI" in node_type or "Chat" in node_type:
            node_packages.extend(["langchain-openai>=0.0.5", "openai>=1.0.0"])
        elif "Tavily" in node_type:
            node_packages.append("langchain-tavily>=0.2.0")
        elif "Cohere" in node_type:
            node_packages.extend(["cohere>=5.0.0", "langchain-cohere>=0.4.0"])
        elif "VectorStore" in node_type:
            node_packages.append("langchain-postgres>=0.0.15")
    
    # Combine and deduplicate
    all_packages = list(set(base_packages + langchain_packages + node_packages))
    return "\n".join(sorted(all_packages))

def create_pre_configured_env_file(
    dependencies: WorkflowDependencies, 
    user_env_vars: Dict[str, str],
    security: SecurityConfig,
    monitoring: MonitoringConfig,
    docker: DockerConfig,
    flow_data: Dict[str, Any]
) -> str:
    """Create pre-configured .env file with user settings."""
    logger.info("Creating pre-configured .env file")
    
    env_content = [
        "# Generated .env file for workflow export",
        "# Ready to run - no additional configuration needed",
        f"# Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "",
        "# Workflow Configuration",
        f"WORKFLOW_ID={dependencies.workflow_id}",
        f"WORKFLOW_MODE=runtime",
        "",
        "# External Database Configuration", 
        f"DATABASE_URL={user_env_vars.get('DATABASE_URL', 'postgresql://user:pass@localhost:5432/workflow_db')}",
        "",
        "# Security & Authentication",
        f"SECRET_KEY={user_env_vars.get('SECRET_KEY', 'auto-generated-secret-key-' + str(uuid.uuid4()))}",
        f"REQUIRE_API_KEY={str(security.require_api_key).lower()}",
        "",
    ]
    
    # API Keys (combine system and custom keys)
    api_keys = []
    if security.api_keys:
        api_keys.extend([key.strip() for key in security.api_keys.split(',') if key.strip()])
    if security.custom_api_keys:
        api_keys.extend([key.strip() for key in security.custom_api_keys.split(',') if key.strip()])
    
    # Use the exact setting from export configuration (no auto-enable)
    # User explicitly chooses whether API key is required or not
    
    if api_keys:
        env_content.append(f"API_KEYS={','.join(api_keys)}")
    else:
        env_content.append("API_KEYS=")
    
    env_content.extend([
        "",
        "# LangSmith Monitoring (Optional)",
        f"LANGCHAIN_TRACING_V2={str(monitoring.enable_langsmith).lower()}",
        f"LANGCHAIN_API_KEY={monitoring.langsmith_api_key or ''}",
        f"LANGCHAIN_PROJECT={monitoring.langsmith_project or dependencies.workflow_id}",
        "",
        "# Runtime Application",
        "API_HOST=0.0.0.0", 
        f"API_PORT={docker.api_port}",
        f"DOCKER_PORT={docker.docker_port}",
        "",
        "# Auto-migration settings",
        "AUTO_MIGRATE=true",
        "MIGRATION_TIMEOUT=30",
        ""
    ])
    
    # Collect all environment variables to avoid duplicates
    used_env_vars = set(["DATABASE_URL", "SECRET_KEY", "WORKFLOW_ID", "WORKFLOW_MODE", 
                        "REQUIRE_API_KEY", "API_KEYS",
                        "LANGCHAIN_TRACING_V2", "LANGCHAIN_API_KEY", "LANGCHAIN_PROJECT",
                        "API_HOST", "API_PORT", "DOCKER_PORT", "AUTO_MIGRATE", "MIGRATION_TIMEOUT"])
    
    # API Keys and Credentials (from user input - not from nodes)
    credential_vars = {}
    for env_var, value in user_env_vars.items():
        if env_var not in used_env_vars:
            # Check if this is a node-specific variable
            if any(node_type in env_var for node_type in ["OPENAI", "TAVILY", "COHERE", "LANGCHAIN"]):
                continue  # Skip node-specific vars, they'll be handled in node sections
            credential_vars[env_var] = value
            used_env_vars.add(env_var)
    
    if credential_vars:
        env_content.append("# API Keys and Credentials")
        for env_var, value in credential_vars.items():
            env_content.append(f"{env_var}={value}")
        env_content.append("")
    
    # Node Configuration Variables (organized by node type)
    nodes = flow_data.get("nodes", [])
    node_sections = {}
    
    # Group nodes by type
    for node in nodes:
        node_id = node.get("id", "")
        node_type = node.get("type", "")
        node_data = node.get("data", {})
        
        if node_data and node_type:
            if node_type not in node_sections:
                node_sections[node_type] = []
            
            # Collect configuration for this node
            node_config = {}
            
            # Add common settings
            for key, value in node_data.items():
                if key in ["model", "temperature", "max_tokens", "timeout", "max_results", "search_depth"]:
                    env_var_name = f"{node_type.upper()}_{key.upper()}"
                    if env_var_name not in used_env_vars:
                        node_config[env_var_name] = str(value)
                        used_env_vars.add(env_var_name)
            
            # Add credentials (prioritize user input)
            for key, value in node_data.items():
                if any(cred_key in key.lower() for cred_key in ['api_key', 'token', 'secret', 'password', 'key']):
                    env_var_name = f"{node_type.upper()}_{key.upper()}"
                    if env_var_name not in used_env_vars:
                        user_value = user_env_vars.get(env_var_name, str(value))
                        node_config[env_var_name] = str(user_value)
                        used_env_vars.add(env_var_name)
            
            if node_config:
                node_sections[node_type].append((node_id, node_config))
    
    # Write node sections
    if node_sections:
        env_content.append("# Node Configuration Variables")
        for node_type, nodes_list in node_sections.items():
            env_content.append(f"# {node_type} Nodes Configuration")
            
            # Combine all configs for this node type
            combined_config = {}
            for node_id, config in nodes_list:
                combined_config.update(config)
            
            # Write unique variables for this node type
            for env_var, value in combined_config.items():
                env_content.append(f"{env_var}={value}")
            env_content.append("")
    
    return "\n".join(env_content)

def create_ready_to_run_docker_context(
    workflow: Workflow,
    minimal_backend: Dict[str, str], 
    pre_configured_env: str,
    docker_config: DockerConfig
) -> Dict[str, str]:
    """Create ready-to-run Docker context files."""
    logger.info("Creating Docker context")
    
    # docker-compose.yml
    docker_compose = f'''services:
  # Workflow API Backend (RESTful API only)
  workflow-api:
    build: .
    env_file:
      - .env
    environment:
      # Override critical settings to ensure they're set
      - WORKFLOW_MODE=runtime
    ports:
      - "{docker_config.docker_port}:{docker_config.api_port}"
    volumes:
      - ./logs:/app/logs
      - workflow_memory:/app/memory
    healthcheck:
      test: ["CMD", "sh", "-c", "curl -f http://localhost:$$API_PORT/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: unless-stopped
    networks:
      - workflow-runtime-network

volumes:
  logs:
  workflow_memory:
    driver: local

networks:
  workflow-runtime-network:
    driver: bridge
'''
    
    return {
        "docker-compose.yml": docker_compose
    }

def generate_ready_to_run_readme(workflow_name: str, env_config: WorkflowEnvironmentConfig) -> str:
    """Generate README for exported workflow."""
    
    # Get formatted date outside f-string to avoid backslash issue
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    workflow_slug = workflow_name.lower().replace(' ', '-')
    
    # Build API key section
    api_key_status = "WITH API KEY:" if env_config.security.require_api_key else "WITHOUT API KEY:"
    api_key_header = '  -H "X-API-Key: YOUR_API_KEY" \\\n  # OR -H "Authorization: Bearer YOUR_API_KEY" \\' if env_config.security.require_api_key else ''
    
    # Build security status
    auth_status = "✅ API Key authentication is ENABLED" if env_config.security.require_api_key else "⚠️ API Key authentication is DISABLED"
    host_status = "✅ All hosts allowed for maximum accessibility" if env_config.security.allowed_hosts == "*" else f"⚠️ Limited to hosts: {env_config.security.allowed_hosts}"
    
    # Build monitoring status  
    monitoring_status = "✅ LangSmith monitoring is ENABLED" if env_config.monitoring.enable_langsmith else "❌ LangSmith monitoring is DISABLED"
    
    readme = f"""# {workflow_name} - Docker Export

This is a ready-to-run Docker export of your KAI-Fusion workflow.

## Quick Start

1. **Extract the package:**
   ```bash
   unzip workflow-export-{workflow_slug}.zip
   cd workflow-export-{workflow_slug}/
   ```

2. **Start the workflow:**
   ```bash
   docker-compose up -d
   ```

3. **Check status:**
   ```bash
   docker-compose ps
   docker-compose logs workflow-api
   ```

4. **Test the API:**
   ```bash
   curl http://localhost:{env_config.docker.docker_port}/health
   curl http://localhost:{env_config.docker.docker_port}/api/workflow/info
   ```

## API Usage

### Execute Workflow
{api_key_status}
```bash
curl -X POST http://localhost:{env_config.docker.docker_port}/api/workflow/execute \\
  -H "Content-Type: application/json" \\
{api_key_header}
  -d '{{"input": "Your input here", "parameters": {{}}}}'
```

### Available Endpoints
- `GET /health` - Health check
- `GET /api/workflow/info` - Workflow information
- `POST /api/workflow/execute` - Execute workflow
- `GET /api/workflow/status/{{execution_id}}` - Check execution status
- `GET /api/workflow/result/{{execution_id}}` - Get execution result

## Configuration

### Environment Variables
The `.env` file contains all pre-configured settings. You can modify:

- `DOCKER_PORT` - Change the external port
- `API_KEYS` - Update API keys for access control
- `REQUIRE_API_KEY` - Enable/disable API key authentication

### Security
{auth_status}
{host_status}

### Monitoring
{monitoring_status}

 ## Troubleshooting
 
 ### Check Container Status
 ```bash
 docker-compose ps
 docker-compose logs -f workflow-api
 ```
 
 ### Port Connection Issues
 If you can't access http://localhost:{env_config.docker.docker_port}:
 
 1. **Check if container is running:**
    ```bash
    docker-compose ps
    ```
 
 2. **Check port mapping:**
    ```bash
    docker port $(docker-compose ps -q workflow-api)
    ```
 
 3. **Test internal connection:**
    ```bash
    docker-compose exec workflow-api sh -c 'curl http://localhost:$API_PORT/health'
    ```
 
 4. **Windows Docker Desktop - try 127.0.0.1:**
    ```bash
    curl http://127.0.0.1:{env_config.docker.docker_port}/health
    ```
 
 ### Restart Services
 ```bash
 docker-compose restart
 docker-compose down && docker-compose up -d
 ```
 
 ### Rebuild if Needed
 ```bash
 docker-compose down
 docker-compose build --no-cache
 docker-compose up -d
 ```

## Support

This workflow was exported from KAI-Fusion. For support, please refer to your KAI-Fusion documentation.

Generated on: {current_time}
"""
    
    return readme

def create_workflow_export_package(components: Dict[str, Any]) -> Dict[str, Any]:
    """Create the final export package as a ZIP file."""
    logger.info("Creating workflow export package")
    
    workflow = components['workflow']
    
    # Create temporary directory
    with tempfile.TemporaryDirectory() as temp_dir:
        package_name = f"workflow-export-{workflow.name.lower().replace(' ', '-')}"
        package_dir = os.path.join(temp_dir, package_name)
        os.makedirs(package_dir)
        
        # Create organized directory structure
        app_dir = os.path.join(package_dir, "app")
        api_dir = os.path.join(app_dir, "api")
        models_dir = os.path.join(app_dir, "models")
        core_dir = os.path.join(app_dir, "core")
        
        os.makedirs(app_dir)
        os.makedirs(api_dir)
        os.makedirs(models_dir)
        os.makedirs(core_dir)
        os.makedirs(os.path.join(package_dir, "logs"))
        
        # Write root level configuration files
        with open(os.path.join(package_dir, ".env"), 'w', encoding='utf-8') as f:
            f.write(components['pre_configured_env'])
        
        with open(os.path.join(package_dir, "Dockerfile"), 'w', encoding='utf-8') as f:
            f.write(components['backend']['Dockerfile'])
        
        with open(os.path.join(package_dir, "docker-compose.yml"), 'w', encoding='utf-8') as f:
            f.write(components['docker_configs']['docker-compose.yml'])
        
        with open(os.path.join(package_dir, "requirements.txt"), 'w', encoding='utf-8') as f:
            f.write(components['filtered_requirements'])
        
        with open(os.path.join(package_dir, "README.md"), 'w', encoding='utf-8') as f:
            f.write(components['readme'])
        
        # Write application structure
        with open(os.path.join(package_dir, "main.py"), 'w', encoding='utf-8') as f:
            f.write(components['backend']['main.py'])
        
        # Write API files
        with open(os.path.join(api_dir, "__init__.py"), 'w', encoding='utf-8') as f:
            f.write('"""API module for workflow execution."""\n')
        
        with open(os.path.join(api_dir, "workflow.py"), 'w', encoding='utf-8') as f:
            f.write(components['backend'].get('api_workflow', generate_workflow_api_code()))
        
        with open(os.path.join(api_dir, "health.py"), 'w', encoding='utf-8') as f:
            f.write(components['backend'].get('api_health', generate_health_api_code()))
        
        # Write Models files
        with open(os.path.join(models_dir, "__init__.py"), 'w', encoding='utf-8') as f:
            f.write('"""Data models for workflow execution."""\n')
        
        with open(os.path.join(models_dir, "workflow.py"), 'w', encoding='utf-8') as f:
            f.write(components['backend'].get('models_workflow', generate_workflow_models_code()))
        
        with open(os.path.join(models_dir, "execution.py"), 'w', encoding='utf-8') as f:
            f.write(components['backend'].get('models_execution', generate_execution_models_code()))
        
        # Write Core files
        with open(os.path.join(core_dir, "__init__.py"), 'w', encoding='utf-8') as f:
            f.write('"""Core utilities and configuration."""\n')
        
        with open(os.path.join(core_dir, "config.py"), 'w', encoding='utf-8') as f:
            f.write(components['backend'].get('core_config', generate_core_config_code()))
        
        with open(os.path.join(core_dir, "database.py"), 'w', encoding='utf-8') as f:
            f.write(components['backend'].get('core_database', generate_core_database_code()))
        
        # Write main app init
        with open(os.path.join(app_dir, "__init__.py"), 'w', encoding='utf-8') as f:
            f.write('"""Workflow execution application."""\n')
        
        # Write workflow definition
        with open(os.path.join(package_dir, "workflow-definition.json"), 'w', encoding='utf-8') as f:
            json.dump(workflow.flow_data, f, indent=2, ensure_ascii=False)
        
        # Create ZIP file
        zip_path = f"{package_dir}.zip"
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(package_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, temp_dir)
                    zipf.write(file_path, arcname)
        
        # Calculate size
        package_size = os.path.getsize(zip_path)
        
        # Move to permanent storage with enhanced directory handling
        import shutil
        import re
        
        # Get exports directory with automatic creation
        backend_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))  # Go up from app/routes to backend
        permanent_dir = os.path.join(backend_root, "exports")
        os.makedirs(permanent_dir, exist_ok=True)
        
        # Sanitize package name for safe filename
        safe_package_name = re.sub(r'[^\w\-_\.]', '-', package_name)
        safe_package_name = re.sub(r'-+', '-', safe_package_name).strip('-')
        
        permanent_zip_path = os.path.join(permanent_dir, f"{safe_package_name}.zip")
        
        # Ensure unique filename if conflict
        counter = 1
        original_path = permanent_zip_path
        while os.path.exists(permanent_zip_path):
            name_part = f"{safe_package_name}-{counter}"
            permanent_zip_path = os.path.join(permanent_dir, f"{name_part}.zip")
            counter += 1
        
        shutil.move(zip_path, permanent_zip_path)
        logger.info(f"Export package saved to: {permanent_zip_path}")
        
        final_filename = os.path.basename(permanent_zip_path)
        download_url = f"/api/v1/export/download/{final_filename}"
        
        return {
            "download_url": download_url,
            "package_size": package_size,
            "local_path": permanent_zip_path,
            "filename": final_filename
        }

def get_exports_directory() -> str:
    """Get exports directory with automatic creation."""
    # Use absolute path relative to backend app
    backend_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))  # Go up from app/routes to backend
    exports_dir = os.path.join(backend_root, "exports")
    os.makedirs(exports_dir, exist_ok=True)
    return exports_dir

@router.get("/export/download/{filename}", tags=["Export"])
async def download_export_package(filename: str):
    """Download exported workflow package with enhanced error handling."""
    try:
        # Validate filename to prevent directory traversal
        if ".." in filename or "/" in filename or "\\" in filename:
            logger.warning(f"Invalid filename attempted: {filename}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid filename"
            )
        
        # Get exports directory with automatic creation
        exports_dir = get_exports_directory()
        file_path = os.path.join(exports_dir, filename)
        
        logger.info(f"Attempting to download: {filename} from {exports_dir}")
        
        # Check if file exists
        if not os.path.exists(file_path):
            logger.warning(f"Export file not found: {filename}")
            
            # List available files for debugging
            if os.path.exists(exports_dir):
                available_files = os.listdir(exports_dir)
                logger.info(f"Available export files ({len(available_files)}): {available_files}")
            else:
                logger.warning(f"Exports directory does not exist: {exports_dir}")
            
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Export package '{filename}' not found. Please ensure the export was completed successfully."
            )
        
        logger.info(f"Successfully found export file: {file_path}")
        
        # Return file response
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type="application/zip"
        )
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        logger.error(f"Download failed for {filename}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Download failed due to server error"
        )

@router.get("/export/workflows", tags=["Export"])
async def export_workflows():
    """Export workflows data."""
    try:
        # Placeholder for future export functionality
        return {
            "status": "success",
            "message": "Export functionality coming soon",
            "data": {}
        }
    except Exception as e:
        logger.error(f"Export failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Export operation failed"
        )

@router.get("/export/nodes", tags=["Export"])
async def export_nodes():
    """Export nodes configuration."""
    try:
        # Placeholder for future export functionality
        return {
            "status": "success", 
            "message": "Node export functionality coming soon",
            "data": {}
        }
    except Exception as e:
        logger.error(f"Node export failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Node export operation failed"
        )


def generate_workflow_api_code() -> str:
    """Generate workflow API endpoints code."""
    return '''# -*- coding: utf-8 -*-
"""Workflow execution API endpoints."""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, Optional
from pydantic import BaseModel
import logging
import uuid
import json
import os
from datetime import datetime

from app.models.workflow import WorkflowExecution, WorkflowExecutionRequest
from app.core.database import get_db_session

logger = logging.getLogger(__name__)
router = APIRouter()

class ExecuteWorkflowRequest(BaseModel):
    """Request model for workflow execution."""
    input_data: Optional[Dict[str, Any]] = None
    execution_config: Optional[Dict[str, Any]] = None

class ExecuteWorkflowResponse(BaseModel):
    """Response model for workflow execution."""
    execution_id: str
    status: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# Load workflow definition
def load_workflow_definition():
    try:
        with open('workflow-definition.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load workflow definition: {e}")
        return {"nodes": [], "edges": []}

WORKFLOW_DEF = load_workflow_definition()

def execute_llm_workflow(user_input: str, session_id: str = None, parameters: Dict[str, Any] = None) -> Dict[str, Any]:
    """Execute LLM workflow with user input and session memory."""
    try:
        # Find LLM and Memory nodes in workflow
        llm_nodes = [node for node in WORKFLOW_DEF.get("nodes", []) if "openai" in node.get("type", "").lower() or "chat" in node.get("type", "").lower()]
        memory_nodes = [node for node in WORKFLOW_DEF.get("nodes", []) if "memory" in node.get("type", "").lower()]
        
        if not llm_nodes:
            return {"response": "No LLM nodes found in workflow", "type": "error"}
        
        # Initialize memory system
        session_memory = []
        if session_id and memory_nodes:
            session_memory = load_session_memory(session_id)
        
        # Simple LLM integration - use OpenAI if available
        try:
            import openai
            
            # Get API key from environment
            api_key = os.getenv("OPENAI_API_KEY") or os.getenv("OPENAICHAT_API_KEY")
            if not api_key:
                return {"response": "OpenAI API key not configured", "type": "error"}
            
            # Initialize OpenAI client
            client = openai.OpenAI(api_key=api_key)
            
            # Get model from workflow or use default
            model = "gpt-3.5-turbo"
            temperature = 0.7
            max_tokens = 2048
            
            # Extract model config from first LLM node
            if llm_nodes:
                node_data = llm_nodes[0].get("data", {})
                model = node_data.get("model", model)
                temperature = float(node_data.get("temperature", temperature))
                max_tokens = int(node_data.get("max_tokens", max_tokens))
            
            # Build messages with memory
            messages = [{"role": "system", "content": "You are a helpful AI assistant integrated into KAI-Fusion workflow system."}]
            
            # Add memory context if available
            if session_memory:
                # Add recent conversation history (last 10 messages)
                recent_memory = session_memory[-10:] if len(session_memory) > 10 else session_memory
                for mem in recent_memory:
                    if mem.get("role") in ["user", "assistant"]:
                        messages.append({"role": mem["role"], "content": mem["content"]})
            
            # Add current user input
            messages.append({"role": "user", "content": user_input})
            
            # Create chat completion
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            assistant_response = response.choices[0].message.content
            
            # Save to memory if memory nodes exist and session_id provided
            if session_id and memory_nodes:
                save_to_session_memory(session_id, user_input, assistant_response)
            
            return {
                "response": assistant_response,
                "type": "success",
                "model": model,
                "session_id": session_id,
                "memory_enabled": bool(memory_nodes and session_id),
                "usage": {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                }
            }
            
        except ImportError:
            return {"response": "OpenAI library not installed", "type": "error"}
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            return {"response": f"LLM execution failed: {str(e)}", "type": "error"}
    
    except Exception as e:
        logger.error(f"Workflow execution error: {e}")
        return {"response": f"Workflow execution failed: {str(e)}", "type": "error"}

def load_session_memory(session_id: str) -> list:
    """Load conversation memory for a session."""
    try:
        memory_file = f"memory/session_{session_id}.json"
        if os.path.exists(memory_file):
            with open(memory_file, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load session memory: {e}")
    return []

def save_to_session_memory(session_id: str, user_input: str, assistant_response: str):
    """Save conversation to session memory."""
    try:
        # Create memory directory if it doesn't exist
        os.makedirs("memory", exist_ok=True)
        
        memory_file = f"memory/session_{session_id}.json"
        
        # Load existing memory
        memory = load_session_memory(session_id)
        
        # Add new conversation
        timestamp = datetime.now().isoformat()
        memory.extend([
            {"role": "user", "content": user_input, "timestamp": timestamp},
            {"role": "assistant", "content": assistant_response, "timestamp": timestamp}
        ])
        
        # Keep only last 100 messages to prevent memory file from growing too large
        if len(memory) > 100:
            memory = memory[-100:]
        
        # Save updated memory
        with open(memory_file, 'w', encoding='utf-8') as f:
            json.dump(memory, f, indent=2, ensure_ascii=False)
            
    except Exception as e:
        logger.error(f"Failed to save session memory: {e}")

@router.post("/execute", response_model=ExecuteWorkflowResponse)
async def execute_workflow(
    request: ExecuteWorkflowRequest,
    db = Depends(get_db_session)
):
    """Execute the workflow with provided input data."""
    try:
        execution_id = str(uuid.uuid4())
        
        # Get user input from request
        user_input = ""
        session_id = None
        
        if hasattr(request, 'input_data') and request.input_data:
            user_input = request.input_data.get("input", "") or request.input_data.get("message", "")
            session_id = request.input_data.get("session_id")
        
        # If no session_id provided, generate one for memory tracking
        if not session_id:
            session_id = f"session_{str(uuid.uuid4())[:8]}"
        
        if not user_input:
            return ExecuteWorkflowResponse(
                execution_id=execution_id,
                status="failed",
                error="No input provided",
                result=None
            )
        
        logger.info(f"Executing workflow with input: {user_input}, session: {session_id}")
        
        # Execute LLM workflow with session memory
        result = execute_llm_workflow(user_input, session_id, request.execution_config or {})
        
        return ExecuteWorkflowResponse(
            execution_id=execution_id,
            status="completed" if result.get("type") == "success" else "failed",
            result=result,
            error=None if result.get("type") == "success" else result.get("response")
        )
        
    except Exception as e:
        logger.error(f"Workflow execution failed: {e}")
        return ExecuteWorkflowResponse(
            execution_id=str(uuid.uuid4()),
            status="failed",
            error=str(e),
            result=None
        )

@router.get("/executions/{execution_id}")
async def get_execution_status(execution_id: str):
    """Get execution status and results."""
    try:
        return {
            "execution_id": execution_id,
            "status": "completed",
            "result": {"message": "Execution completed"},
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to get execution status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/info")
async def get_workflow_info():
    """Get workflow information."""
    try:
        llm_nodes = [node for node in WORKFLOW_DEF.get("nodes", []) if "openai" in node.get("type", "").lower() or "chat" in node.get("type", "").lower()]
        memory_nodes = [node for node in WORKFLOW_DEF.get("nodes", []) if "memory" in node.get("type", "").lower()]
        
        return {
            "workflow": WORKFLOW_DEF,
            "nodes_count": len(WORKFLOW_DEF.get("nodes", [])),
            "edges_count": len(WORKFLOW_DEF.get("edges", [])),
            "llm_nodes": llm_nodes,
            "memory_nodes": memory_nodes,
            "memory_enabled": len(memory_nodes) > 0,
            "status": "ready"
        }
    except Exception as e:
        logger.error(f"Failed to get workflow info: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/memory/{session_id}")
async def get_session_memory(session_id: str):
    """Get conversation memory for a session."""
    try:
        memory = load_session_memory(session_id)
        return {
            "session_id": session_id,
            "messages": memory,
            "message_count": len(memory),
            "memory_enabled": True
        }
    except Exception as e:
        logger.error(f"Failed to get session memory: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/memory/{session_id}")
async def clear_session_memory(session_id: str):
    """Clear conversation memory for a session."""
    try:
        memory_file = f"memory/session_{session_id}.json"
        if os.path.exists(memory_file):
            os.remove(memory_file)
        
        return {
            "session_id": session_id,
            "status": "cleared",
            "message": "Session memory cleared successfully"
        }
    except Exception as e:
        logger.error(f"Failed to clear session memory: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sessions")
async def list_active_sessions():
    """List all active sessions with memory."""
    try:
        sessions = []
        memory_dir = "memory"
        
        if os.path.exists(memory_dir):
            for filename in os.listdir(memory_dir):
                if filename.startswith("session_") and filename.endswith(".json"):
                    session_id = filename.replace("session_", "").replace(".json", "")
                    memory = load_session_memory(session_id)
                    
                    # Get last message timestamp
                    last_timestamp = None
                    if memory:
                        last_message = memory[-1]
                        last_timestamp = last_message.get("timestamp")
                    
                    sessions.append({
                        "session_id": session_id,
                        "message_count": len(memory),
                        "last_activity": last_timestamp
                    })
        
        return {
            "sessions": sessions,
            "total_sessions": len(sessions)
        }
    except Exception as e:
        logger.error(f"Failed to list sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))
'''


def generate_health_api_code() -> str:
    """Generate health check API code."""
    return '''# -*- coding: utf-8 -*-
"""Health check API endpoints."""

from fastapi import APIRouter
from typing import Dict, Any
import logging
import os

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "workflow-runtime",
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "production")
    }

@router.get("/status")
async def status_check() -> Dict[str, Any]:
    """Detailed status check."""
    return {
        "status": "healthy",
        "checks": {
            "database": "connected",
            "workflow_engine": "ready",
            "api": "operational"
        },
        "uptime": "running",
        "configuration": {
            "workflow_mode": os.getenv("WORKFLOW_MODE", "runtime"),
            "api_port": os.getenv("API_PORT", "8000")
        }
    }
'''


def generate_workflow_models_code() -> str:
    """Generate workflow data models code."""
    return '''# -*- coding: utf-8 -*-
"""Workflow data models."""

from sqlalchemy import Column, String, Text, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from pydantic import BaseModel
from typing import Dict, Any, Optional
from datetime import datetime
import uuid

Base = declarative_base()

class WorkflowExecution(Base):
    """Workflow execution database model."""
    __tablename__ = "workflow_executions"
    
    execution_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    status = Column(String, nullable=False, default="pending")
    input_data = Column(JSON, nullable=True)
    output_data = Column(JSON, nullable=True)
    execution_config = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class WorkflowExecutionRequest(BaseModel):
    """Pydantic model for workflow execution requests."""
    input_data: Optional[Dict[str, Any]] = None
    execution_config: Optional[Dict[str, Any]] = None

class WorkflowExecutionResponse(BaseModel):
    """Pydantic model for workflow execution responses."""
    execution_id: str
    status: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: datetime
    updated_at: datetime
'''


def generate_execution_models_code() -> str:
    """Generate execution-specific models code."""
    return '''# -*- coding: utf-8 -*-
"""Execution tracking models."""

from sqlalchemy import Column, String, Text, DateTime, Integer, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

Base = declarative_base()

class ExecutionLog(Base):
    """Execution log database model."""
    __tablename__ = "execution_logs"
    
    log_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    execution_id = Column(String, nullable=False)
    log_level = Column(String, nullable=False, default="INFO")
    message = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=func.now())
    node_id = Column(String, nullable=True)
    step_number = Column(Integer, nullable=True)

class ExecutionMetrics(Base):
    """Execution metrics database model."""
    __tablename__ = "execution_metrics"
    
    metric_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    execution_id = Column(String, nullable=False)
    metric_name = Column(String, nullable=False)
    metric_value = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=func.now())

class ExecutionLogEntry(BaseModel):
    """Pydantic model for execution log entries."""
    log_level: str
    message: str
    node_id: Optional[str] = None
    step_number: Optional[int] = None
    timestamp: datetime

class ExecutionMetric(BaseModel):
    """Pydantic model for execution metrics."""
    metric_name: str
    metric_value: float
    timestamp: datetime
'''


def generate_core_config_code() -> str:
    """Generate core configuration code."""
    return '''# -*- coding: utf-8 -*-
"""Core configuration settings."""

import os
from typing import Optional

class Settings:
    """Application settings."""
    
    # API Configuration - Use dynamic port from environment
    API_PORT: int = int(os.getenv("API_PORT", "8000"))
    HOST: str = os.getenv("API_HOST", "0.0.0.0")
    
    # Database Configuration
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./workflow.db")
    
    # Workflow Configuration
    WORKFLOW_ID: str = os.getenv("WORKFLOW_ID", "unknown")
    WORKFLOW_MODE: str = os.getenv("WORKFLOW_MODE", "runtime")
    
    # Security Configuration
    API_KEYS: Optional[str] = os.getenv("API_KEYS", None)
    REQUIRE_API_KEY: str = os.getenv("REQUIRE_API_KEY", "false")
    
    # Monitoring Configuration
    ENABLE_LANGSMITH: bool = os.getenv("ENABLE_LANGSMITH", "false").lower() == "true"
    LANGCHAIN_API_KEY: Optional[str] = os.getenv("LANGCHAIN_API_KEY", None)
    LANGSMITH_PROJECT: Optional[str] = os.getenv("LANGSMITH_PROJECT", None)
    
    # Logging Configuration
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FORMAT: str = os.getenv("LOG_FORMAT", "%(asctime)s - %(name)s - %(levelname)s - %(message)s")

# Global settings instance
settings = Settings()
'''


def generate_core_database_code() -> str:
    """Generate core database utilities code."""
    return '''# -*- coding: utf-8 -*-
"""Database configuration and utilities."""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

# Create async engine with asyncpg configuration
engine = create_async_engine(
    settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://") 
    if settings.DATABASE_URL.startswith("postgresql://") 
    else settings.DATABASE_URL,
    echo=False,
    # Disable prepared statement cache to avoid conflicts
    connect_args={"statement_cache_size": 0} if "postgresql" in settings.DATABASE_URL else {}
)

# Create async session factory
AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()

async def get_db_session() -> AsyncSession:
    """Get database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_database():
    """Initialize database tables."""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise

async def close_database():
    """Close database connections."""
    try:
        await engine.dispose()
        logger.info("Database connections closed")
    except Exception as e:
        logger.error(f"Error closing database: {e}")
'''