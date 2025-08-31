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

# System environment variables (minimal set for runtime)
SYSTEM_ENV_VARS = {
    "DATABASE_URL": "PostgreSQL database connection URL",
    "SECRET_KEY": "Secret key for JWT authentication",
    "WORKFLOW_ID": "Workflow identifier",
    "API_KEYS": "Comma-separated API keys",
    "REQUIRE_API_KEY": "API key authentication required"
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
        logger.info(f"📋 Environment variables: {len(analysis_result.environment_variables)} total")
        logger.info(f"📦 Package dependencies: {len(analysis_result.package_dependencies)} packages")
        
        # Convert DynamicAnalysisResult to WorkflowDependencies format
        required_env_vars = []
        optional_env_vars = []
        
        # Process environment variables by required status
        for env_var in analysis_result.environment_variables:
            if env_var.required:
                required_env_vars.append(EnvironmentVariable(
                    name=env_var.name,
                    description=env_var.description,
                    example=env_var.example or "",
                    required=True,
                    node_type=env_var.node_type or "Dynamic"
                ))
            else:
                optional_env_vars.append(EnvironmentVariable(
                    name=env_var.name,
                    description=env_var.description,
                    example=env_var.example or "",
                    default=str(env_var.default) if env_var.default is not None else "",
                    required=False,
                    node_type=env_var.node_type or "Dynamic"
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
        logger.info(f"   • Critical credentials detected: {len([v for v in analysis_result.environment_variables if v.security_level in ['critical', 'high']])}")
        logger.info(f"   • Package dependencies: {len(analysis_result.package_dependencies)}")
        
        return WorkflowDependencies(
            workflow_id="temp_id",
            nodes=analysis_result.node_types,
            required_env_vars=required_env_vars,
            optional_env_vars=optional_env_vars,
            python_packages=[f"{pkg.name}{pkg.version}" for pkg in analysis_result.package_dependencies],
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
    
    # Full-featured workflow runtime with OpenAI integration
    main_py = f'''# -*- coding: utf-8 -*-
"""KAI-Fusion Workflow Runtime with OpenAI Integration"""

import os
import logging
import asyncio
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load workflow definition
try:
    with open('workflow-definition.json', 'r', encoding='utf-8') as f:
        WORKFLOW_DEF = json.load(f)
    logger.info("Workflow definition loaded")
except Exception as e:
    logger.error(f"Failed to load workflow: {{e}}")
    WORKFLOW_DEF = {{"nodes": [], "edges": []}}

# Security configuration
API_KEYS = [k.strip() for k in (os.getenv("API_KEYS", "") or "").split(",") if k.strip()]
REQUIRE_API_KEY = os.getenv("REQUIRE_API_KEY", "false").lower() == "true"

# Database setup
async def init_database():
    """Initialize database and create tables if they don't exist."""
    try:
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            logger.warning("No DATABASE_URL provided, using SQLite")
            database_url = "sqlite:///./workflow.db"
        
        logger.info(f"Initializing database: {{database_url[:50]}}...")
        
        # Handle different database types
        if database_url.startswith("sqlite"):
            # For SQLite, create simple JSON storage
            import sqlite3
            import json
            
            db_path = database_url.replace("sqlite:///", "")
            conn = sqlite3.connect(db_path)
            
            # Create basic execution tracking table
            conn.execute("""
CREATE TABLE IF NOT EXISTS workflow_executions (
    execution_id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    input_data TEXT,
    result_data TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
            """)
            
            # Create session memory table
            conn.execute("""
CREATE TABLE IF NOT EXISTS session_memory (
    session_id TEXT NOT NULL,
    message_order INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (session_id, message_order)
)
            """)
            
            conn.commit()
            conn.close()
            logger.info("SQLite database initialized successfully")
            
        elif database_url.startswith("postgresql"):
            # For PostgreSQL, create tables using asyncpg
            try:
                import asyncpg
                
                # Parse connection URL
                conn = await asyncpg.connect(database_url)
                
                # Create execution tracking table
                await conn.execute("""
CREATE TABLE IF NOT EXISTS workflow_executions (
    execution_id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) NOT NULL,
    input_data JSONB,
    result_data JSONB,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
                """)
                
                # Create session memory table
                await conn.execute("""
CREATE TABLE IF NOT EXISTS session_memory (
    session_id VARCHAR(255) NOT NULL,
    message_order INTEGER NOT NULL,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (session_id, message_order)
)
                """)
                
                await conn.close()
                logger.info("PostgreSQL database initialized successfully")
                
            except ImportError:
                logger.error("asyncpg not installed for PostgreSQL support")
                logger.warning("Continuing with file-based storage")
            except Exception as e:
                logger.error(f"PostgreSQL initialization failed: {{e}}")
                logger.warning("Continuing with file-based storage")
        else:
            logger.warning(f"Unsupported database type: {{database_url[:10]}}, using file-based storage")
            
    except Exception as e:
        logger.error(f"Database initialization failed: {{e}}")
        logger.warning("Continuing with file-based storage only")

# Initialize FastAPI
app = FastAPI(
    title="KAI-Fusion Workflow Runtime",
    description=f"Runtime for workflow: {{os.getenv('WORKFLOW_ID', 'unknown')}}",
    version="1.0.0"
)

# Startup event to initialize database
@app.on_event("startup")
async def startup_event():
    """Initialize database and other services on startup."""
    try:
        await init_database()
        logger.info("✅ Workflow runtime started successfully")
    except Exception as e:
        logger.error(f"❌ Database startup failed: {{e}}")
        logger.info("✅ Workflow runtime started with file-based storage")

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources on shutdown."""
    logger.info("🔄 Shutting down workflow runtime")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response models
class WorkflowRequest(BaseModel):
    input: str
    parameters: Dict[str, Any] = {{}}
    session_id: Optional[str] = None

class WorkflowResponse(BaseModel):
    execution_id: str
    status: str
    result: Optional[Any] = None
    error: Optional[str] = None
    timestamp: str

# In-memory execution storage (fallback)
EXECUTIONS = {{}}

# Database persistence functions
async def save_execution_to_db(execution_data: Dict[str, Any]):
    """Save execution to database if available."""
    try:
        database_url = os.getenv("DATABASE_URL", "")
        
        if database_url.startswith("sqlite"):
            import sqlite3
            db_path = database_url.replace("sqlite:///", "")
            conn = sqlite3.connect(db_path)
            
            conn.execute("""
                INSERT OR REPLACE INTO workflow_executions
                (execution_id, status, input_data, result_data, error_message, updated_at)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """, (
                execution_data["execution_id"],
                execution_data["status"],
                json.dumps(execution_data.get("input")),
                json.dumps(execution_data.get("result")),
                execution_data.get("error")
            ))
            
            conn.commit()
            conn.close()
            
        elif database_url.startswith("postgresql"):
            import asyncpg
            conn = await asyncpg.connect(database_url)
            
            await conn.execute("""
                INSERT INTO workflow_executions
                (execution_id, status, input_data, result_data, error_message, updated_at)
                VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
                ON CONFLICT (execution_id) DO UPDATE SET
                    status = EXCLUDED.status,
                    result_data = EXCLUDED.result_data,
                    error_message = EXCLUDED.error_message,
                    updated_at = EXCLUDED.updated_at
            """,
                execution_data["execution_id"],
                execution_data["status"],
                execution_data.get("input"),
                execution_data.get("result"),
                execution_data.get("error")
            )
            
            await conn.close()
            
    except Exception as e:
        logger.error(f"Failed to save to database: {{e}}")
        # Continue with in-memory storage

async def get_execution_from_db(execution_id: str) -> Optional[Dict[str, Any]]:
    """Get execution from database if available."""
    try:
        database_url = os.getenv("DATABASE_URL", "")
        
        if database_url.startswith("sqlite"):
            import sqlite3
            db_path = database_url.replace("sqlite:///", "")
            conn = sqlite3.connect(db_path)
            
            cursor = conn.execute("""
                SELECT execution_id, status, input_data, result_data, error_message, created_at
                FROM workflow_executions WHERE execution_id = ?
            """, (execution_id,))
            
            row = cursor.fetchone()
            conn.close()
            
            if row:
                return {{
                    "execution_id": row[0],
                    "status": row[1],
                    "input": json.loads(row[2]) if row[2] else None,
                    "result": json.loads(row[3]) if row[3] else None,
                    "error": row[4],
                    "timestamp": row[5]
                }}
                
        elif database_url.startswith("postgresql"):
            import asyncpg
            conn = await asyncpg.connect(database_url)
            
            row = await conn.fetchrow("""
                SELECT execution_id, status, input_data, result_data, error_message, created_at
                FROM workflow_executions WHERE execution_id = $1
            """, execution_id)
            
            await conn.close()
            
            if row:
                return {{
                    "execution_id": row["execution_id"],
                    "status": row["status"],
                    "input": row["input_data"],
                    "result": row["result_data"],
                    "error": row["error_message"],
                    "timestamp": row["created_at"].isoformat()
                }}
                
    except Exception as e:
        logger.error(f"Failed to get from database: {{e}}")
        
    return None

async def save_session_memory_to_db(session_id: str, messages: list):
    """Save session memory to database if available."""
    try:
        database_url = os.getenv("DATABASE_URL", "")
        
        if database_url.startswith("sqlite"):
            import sqlite3
            db_path = database_url.replace("sqlite:///", "")
            conn = sqlite3.connect(db_path)
            
            # Clear existing session messages
            conn.execute('DELETE FROM session_memory WHERE session_id = ?', (session_id,))
            
            # Insert new messages
            for i, message in enumerate(messages):
                conn.execute("""
                    INSERT INTO session_memory (session_id, message_order, role, content, timestamp)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    session_id,
                    i,
                    message.get("role"),
                    message.get("content"),
                    message.get("timestamp", datetime.now().isoformat())
                ))
            
            conn.commit()
            conn.close()
            
        elif database_url.startswith("postgresql"):
            import asyncpg
            conn = await asyncpg.connect(database_url)
            
            # Clear existing session messages
            await conn.execute('DELETE FROM session_memory WHERE session_id = $1', session_id)
            
            # Insert new messages
            for i, message in enumerate(messages):
                # Convert string timestamp to datetime object for PostgreSQL
                timestamp_str = message.get("timestamp")
                if timestamp_str is None:
                    timestamp = datetime.now()
                elif isinstance(timestamp_str, str):
                    try:
                        # Parse ISO format timestamp string to datetime object
                        timestamp = datetime.fromisoformat(timestamp_str)
                    except ValueError:
                        # Fallback to current time if parsing fails
                        timestamp = datetime.now()
                else:
                    timestamp = timestamp_str  # Already a datetime object
                
                await conn.execute("""
                    INSERT INTO session_memory (session_id, message_order, role, content, timestamp)
                    VALUES ($1, $2, $3, $4, $5)
                """,
                    session_id,
                    i,
                    message.get("role"),
                    message.get("content"),
                    timestamp  # Burada artık string değil, datetime nesnesi gönderiyoruz
                )
            
            await conn.close()
            
    except Exception as e:
        logger.error(f"Failed to save session memory to database")

async def load_session_memory_from_db(session_id: str) -> list:
    """Load session memory from database if available."""
    try:
        database_url = os.getenv("DATABASE_URL", "")
        
        if database_url.startswith("sqlite"):
            import sqlite3
            db_path = database_url.replace("sqlite:///", "")
            conn = sqlite3.connect(db_path)
            
            cursor = conn.execute("""
                SELECT role, content, timestamp FROM session_memory
                WHERE session_id = ? ORDER BY message_order
            """, (session_id,))
            
            messages = []
            for row in cursor.fetchall():
                messages.append({{
                    "role": row[0],
                    "content": row[1],
                    "timestamp": row[2]
                }})
            
            conn.close()
            return messages
            
        elif database_url.startswith("postgresql"):
            import asyncpg
            conn = await asyncpg.connect(database_url)
            
            rows = await conn.fetch("""
                SELECT role, content, timestamp FROM session_memory
                WHERE session_id = $1 ORDER BY message_order
            """, session_id)
            
            messages = []
            for row in rows:
                messages.append({{
                    "role": row["role"],
                    "content": row["content"],
                    "timestamp": row["timestamp"].isoformat()
                }})
            
            await conn.close()
            return messages
            
    except Exception as e:
        logger.error(f"Failed to load session memory from database: {{e}}")
        
    return []

# Security middleware
@app.middleware("http")
async def security_middleware(request: Request, call_next):
    if REQUIRE_API_KEY and request.url.path.startswith("/api/"):
        api_key = request.headers.get("X-API-Key") or (
            request.headers.get("Authorization", "").replace("Bearer ", "")
        )
        if not api_key or api_key not in API_KEYS:
            raise HTTPException(status_code=401, detail="Invalid API key")
    
    return await call_next(request)

def execute_llm_workflow(user_input: str, session_id: str = None, parameters: Dict[str, Any] = None) -> Dict[str, Any]:
    """Execute LLM workflow with user input and session memory."""
    try:
        # Validate user input
        if not user_input or not user_input.strip():
            return {{"response": "Input is required and cannot be empty", "type": "error"}}
            
        # Find LLM and Memory nodes in workflow
        llm_nodes = [node for node in WORKFLOW_DEF.get("nodes", []) if "openai" in node.get("type", "").lower() or "chat" in node.get("type", "").lower()]
        memory_nodes = [node for node in WORKFLOW_DEF.get("nodes", []) if "memory" in node.get("type", "").lower()]
        
        if not llm_nodes:
            return {{"response": "No LLM nodes found in workflow", "type": "error"}}
        
        # Initialize memory system
        session_memory = []
        if session_id and memory_nodes:
            session_memory = load_session_memory(session_id)
        
        # OpenAI integration
        try:
            import openai
            
            # Get API key from environment
            api_key = os.getenv("OPENAI_API_KEY") or os.getenv("OPENAICHAT_API_KEY")
            if not api_key:
                return {{"response": "OpenAI API key not configured", "type": "error"}}
            
            # Initialize OpenAI client
            client = openai.OpenAI(api_key=api_key)
            
            # Get model from workflow or use default
            model = "gpt-4o-mini"
            temperature = 0.7
            max_tokens = 2048
            
            # Extract model config from first LLM node
            if llm_nodes:
                node_data = llm_nodes[0].get("data", {{}})
                model = node_data.get("model_name", model)
                temperature = float(node_data.get("temperature", temperature))
                max_tokens = int(node_data.get("max_tokens", max_tokens))
            
            # Build messages with memory
            messages = [{{"role": "system", "content": "You are a helpful AI assistant integrated into KAI-Fusion workflow system."}}]
            
            # Add memory context if available
            if session_memory:
                # Add recent conversation history (last 10 messages)
                recent_memory = session_memory[-10:] if len(session_memory) > 10 else session_memory
                for mem in recent_memory:
                    if mem.get("role") in ["user", "assistant"]:
                        messages.append({{"role": mem["role"], "content": mem["content"]}})
            
            # Add current user input
            messages.append({{"role": "user", "content": user_input}})
            
            logger.info(f"Calling OpenAI with model {{model}} for input: {{user_input[:50]}}...")
            
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
            
            return {{
                "response": assistant_response,
                "type": "success",
                "model": model,
                "session_id": session_id,
                "memory_enabled": bool(memory_nodes and session_id),
                "usage": {{
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                }}
            }}
            
        except ImportError:
            return {{"response": "OpenAI library not installed", "type": "error"}}
        except Exception as e:
            logger.error(f"OpenAI API error: {{e}}")
            return {{"response": f"LLM execution failed: {{str(e)}}", "type": "error"}}
    
    except Exception as e:
        logger.error(f"Workflow execution error: {{e}}")
        return {{"response": f"Workflow execution failed: {{str(e)}}", "type": "error"}}

def load_session_memory(session_id: str) -> list:
    """Load conversation memory for a session."""
    try:
        # Try database first (async safe)
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            memory = loop.run_until_complete(load_session_memory_from_db(session_id))
            loop.close()
            if memory:
                return memory
        except Exception as db_e:
            logger.warning(f"Failed to load from database, falling back to file: {{db_e}}")
            
        # Fallback to file storage
        memory_file = f"memory/session_{{session_id}}.json"
        if os.path.exists(memory_file):
            with open(memory_file, 'r', encoding='utf-8') as f:
                return json.load(f)
                    
    except Exception as e:
        logger.error(f"Failed to load session memory: {{e}}")
    return []

def save_to_session_memory(session_id: str, user_input: str, assistant_response: str):
    """Save conversation to session memory."""
    try:
        # Load existing memory
        memory = load_session_memory(session_id)
        
        # Add new conversation
        timestamp = datetime.now().isoformat()
        new_messages = [
            {{"role": "user", "content": user_input, "timestamp": timestamp}},
            {{"role": "assistant", "content": assistant_response, "timestamp": timestamp}}
        ]
        memory.extend(new_messages)
        
        # Keep only last 100 messages to prevent memory from growing too large
        if len(memory) > 100:
            memory = memory[-100:]
        
        # Try to save to database first (async safe)
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(save_session_memory_to_db(session_id, memory))
            loop.close()
        except Exception as db_e:
            logger.warning(f"Failed to save to database, falling back to file: {{db_e}}")
            
            # Fallback to file storage
            os.makedirs("memory", exist_ok=True)
            memory_file = f"memory/session_{{session_id}}.json"
            with open(memory_file, 'w', encoding='utf-8') as f:
                json.dump(memory, f, indent=2, ensure_ascii=False)
            
    except Exception as e:
        logger.error(f"Failed to save session memory: {{e}}")

# API Endpoints
@app.get("/")
async def root():
    return {{
        "service": "KAI-Fusion Workflow Runtime",
        "workflow_id": os.getenv("WORKFLOW_ID"),
        "status": "running"
    }}

@app.get("/health")
async def health():
    return {{"status": "healthy", "timestamp": datetime.now().isoformat()}}

@app.post("/api/workflow/execute", response_model=WorkflowResponse)
async def execute_workflow(request: WorkflowRequest):
    execution_id = str(uuid.uuid4())
    
    try:
        # Generate session ID if not provided
        session_id = request.session_id or f"session_{{str(uuid.uuid4())[:8]}}"
        
        logger.info(f"Executing workflow with input: {{request.input}}, session: {{session_id}}")
        
        # Validate input
        if not request.input or not request.input.strip():
            return WorkflowResponse(
                execution_id=execution_id,
                status="failed",
                error="Input is required and cannot be empty",
                result=None,
                timestamp=datetime.now().isoformat()
            )
        
        # Execute LLM workflow with session memory
        result = execute_llm_workflow(request.input, session_id, request.parameters or {{}})
        
        # Store execution result for status/result endpoints
        EXECUTIONS[execution_id] = {{
            "execution_id": execution_id,
            "status": "completed" if result.get("type") == "success" else "failed",
            "result": result,
            "error": None if result.get("type") == "success" else result.get("response"),
            "timestamp": datetime.now().isoformat(),
            "session_id": session_id
        }}
        
        return WorkflowResponse(
            execution_id=execution_id,
            status="completed" if result.get("type") == "success" else "failed",
            result=result,
            error=None if result.get("type") == "success" else result.get("response"),
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Workflow execution failed: {{e}}")
        execution_data = {{
            "execution_id": execution_id,
            "status": "failed",
            "error": str(e),
            "result": None,
            "timestamp": datetime.now().isoformat()
        }}
        EXECUTIONS[execution_id] = execution_data
        return WorkflowResponse(**execution_data)

@app.get("/api/workflow/status/{{execution_id}}")
async def get_execution_status(execution_id: str):
    """Get execution status."""
    try:
        if execution_id not in EXECUTIONS:
            raise HTTPException(status_code=404, detail="Execution not found")
        
        execution = EXECUTIONS[execution_id]
        return {{
            "execution_id": execution_id,
            "status": execution["status"],
            "timestamp": execution["timestamp"]
        }}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get execution status: {{e}}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/workflow/result/{{execution_id}}")
async def get_execution_result(execution_id: str):
    """Get execution result."""
    try:
        if execution_id not in EXECUTIONS:
            raise HTTPException(status_code=404, detail="Execution not found")
        
        execution = EXECUTIONS[execution_id]
        return {{
            "execution_id": execution_id,
            "status": execution["status"],
            "result": execution["result"],
            "error": execution.get("error"),
            "timestamp": execution["timestamp"]
        }}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get execution result: {{e}}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/workflow/executions/{{execution_id}}")
async def get_execution_details(execution_id: str):
    """Get execution status and details (legacy endpoint for compatibility)."""
    try:
        if execution_id not in EXECUTIONS:
            raise HTTPException(status_code=404, detail="Execution not found")
        
        execution = EXECUTIONS[execution_id]
        return {{
            "execution_id": execution_id,
            "status": execution["status"],
            "result": execution.get("result"),
            "error": execution.get("error"),
            "timestamp": execution["timestamp"]
        }}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get execution details: {{e}}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/workflow/info")
async def workflow_info():
    llm_nodes = [node for node in WORKFLOW_DEF.get("nodes", []) if "openai" in node.get("type", "").lower() or "chat" in node.get("type", "").lower()]
    memory_nodes = [node for node in WORKFLOW_DEF.get("nodes", []) if "memory" in node.get("type", "").lower()]
    
    return {{
        "workflow": WORKFLOW_DEF,
        "nodes_count": len(WORKFLOW_DEF.get("nodes", [])),
        "edges_count": len(WORKFLOW_DEF.get("edges", [])),
        "llm_nodes": llm_nodes,
        "memory_nodes": memory_nodes,
        "memory_enabled": len(memory_nodes) > 0,
        "status": "ready"
    }}

# External workflow compatibility endpoints
@app.get("/api/workflow/external/info")
async def external_workflow_info():
    """External workflow compatibility endpoint"""
    llm_nodes = [node for node in WORKFLOW_DEF.get("nodes", []) if "openai" in node.get("type", "").lower() or "chat" in node.get("type", "").lower()]
    memory_nodes = [node for node in WORKFLOW_DEF.get("nodes", []) if "memory" in node.get("type", "").lower()]
    
    return {{
        "workflow_id": os.getenv("WORKFLOW_ID", "unknown"),
        "name": "Exported Workflow",
        "description": "KAI-Fusion exported workflow runtime",
        "external_url": f"http://localhost:{{os.getenv('API_PORT', '8000')}}",
        "api_key_required": REQUIRE_API_KEY,
        "connection_status": "online",
        "capabilities": {{
            "chat": len(llm_nodes) > 0,
            "memory": len(memory_nodes) > 0,
            "info_access": True,
            "modification": False
        }},
        "created_at": datetime.now().isoformat(),
        "last_health_check": datetime.now().isoformat()
    }}

@app.post("/api/workflow/external/ping")
async def external_ping():
    """External workflow ping endpoint"""
    return {{
        "status": "online",
        "timestamp": datetime.now().isoformat(),
        "workflow_id": os.getenv("WORKFLOW_ID", "unknown")
    }}

@app.get("/api/workflow/external/metrics")
async def external_metrics():
    """External workflow metrics endpoint"""
    return {{
        "uptime": "running",
        "requests_processed": 0,
        "last_activity": datetime.now().isoformat(),
        "memory_usage": "N/A",
        "status": "healthy"
    }}

@app.get("/api/workflow/sessions")
async def list_sessions():
    """List all chat sessions with memory."""
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
                    
                    sessions.append({{
                        "session_id": session_id,
                        "message_count": len(memory),
                        "last_activity": last_timestamp
                    }})
        
        return {{
            "sessions": sessions,
            "total_sessions": len(sessions)
        }}
    except Exception as e:
        logger.error(f"Failed to list sessions: {{e}}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/workflow/memory/{{session_id}}")
async def get_session_memory(session_id: str):
    """Get conversation memory for a session."""
    try:
        memory = load_session_memory(session_id)
        return {{
            "session_id": session_id,
            "messages": memory,
            "message_count": len(memory),
            "memory_enabled": True
        }}
    except Exception as e:
        logger.error(f"Failed to get session memory: {{e}}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/workflow/memory/{{session_id}}")
async def clear_session_memory(session_id: str):
    """Clear conversation memory for a session."""
    try:
        memory_file = f"memory/session_{{session_id}}.json"
        if os.path.exists(memory_file):
            os.remove(memory_file)
        
        return {{
            "session_id": session_id,
            "status": "cleared",
            "message": "Session memory cleared successfully"
        }}
    except Exception as e:
        logger.error(f"Failed to clear session memory: {{e}}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("API_PORT", "8000")))
'''
    
    # Simplified Dockerfile
    dockerfile = '''FROM python:3.11-slim

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \\
    CMD curl -f http://localhost:$API_PORT/health || exit 1

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
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
        
        # Get dynamically determined packages - format PackageDependency objects properly
        dynamic_packages = [f"{pkg.name}{pkg.version}" for pkg in analysis_result.package_dependencies]
        
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
    
    docker_compose = f'''services:
  workflow-api:
    build: .
    env_file:
      - .env
    ports:
      - "{docker_config.docker_port}:{docker_config.api_port}"
    volumes:
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:$$API_PORT/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

volumes:
  logs:
'''
    
    return {"docker-compose.yml": docker_compose}

def generate_ready_to_run_readme(workflow_name: str, env_config: WorkflowEnvironmentConfig) -> str:
    """Generate README for exported workflow."""
    
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    workflow_slug = workflow_name.lower().replace(' ', '-')
    port = env_config.docker.docker_port
    auth_required = env_config.security.require_api_key
    
    auth_example = '''  -H "X-API-Key: YOUR_API_KEY" \\''' if auth_required else ""
    
    readme = f"""# {workflow_name} - Docker Export

Ready-to-run Docker export of your KAI-Fusion workflow.

## Quick Start

1. Extract: `unzip workflow-export-{workflow_slug}.zip && cd workflow-export-{workflow_slug}/`
2. Start: `docker-compose up -d`
3. Test: `curl http://localhost:{port}/health`

## API Usage

Execute workflow:
```bash
curl -X POST http://localhost:{port}/api/workflow/execute \\
  -H "Content-Type: application/json" \\
{auth_example}
  -d '{{"input": "Your input here"}}'
```

## Configuration

- API key required: {auth_required}
- Port: {port}
- Modify `.env` file to change settings

## Troubleshooting

- Check status: `docker-compose ps`
- View logs: `docker-compose logs workflow-api`
- Restart: `docker-compose restart`

Generated: {current_time}
"""
    
    return readme

def create_workflow_export_package(components: Dict[str, Any]) -> Dict[str, Any]:
    """Create the final export package as a ZIP file."""
    logger.info("Creating workflow export package")
    
    workflow = components['workflow']
    package_name = f"workflow-export-{workflow.name.lower().replace(' ', '-')}"
    
    with tempfile.TemporaryDirectory() as temp_dir:
        package_dir = os.path.join(temp_dir, package_name)
        os.makedirs(package_dir)
        os.makedirs(os.path.join(package_dir, "logs"))
        
        # Write essential files
        files_to_write = {
            ".env": components['pre_configured_env'],
            "Dockerfile": components['backend']['Dockerfile'],
            "docker-compose.yml": components['docker_configs']['docker-compose.yml'],
            "requirements.txt": components['filtered_requirements'],
            "README.md": components['readme'],
            "main.py": components['backend']['main.py'],
            "workflow-definition.json": json.dumps(workflow.flow_data, indent=2, ensure_ascii=False)
        }
        
        for filename, content in files_to_write.items():
            with open(os.path.join(package_dir, filename), 'w', encoding='utf-8') as f:
                f.write(content)
        
        # Create ZIP file
        zip_path = f"{package_dir}.zip"
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(package_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, temp_dir)
                    zipf.write(file_path, arcname)
        
        # Move to permanent storage
        import shutil
        permanent_dir = os.path.join(os.getcwd(), "exports")
        os.makedirs(permanent_dir, exist_ok=True)
        permanent_zip_path = os.path.join(permanent_dir, f"{package_name}.zip")
        shutil.move(zip_path, permanent_zip_path)
        
        return {
            "download_url": f"/api/v1/export/download/{package_name}.zip",
            "package_size": os.path.getsize(permanent_zip_path),
            "local_path": permanent_zip_path
        }

@router.get("/export/download/{filename}", tags=["Export"])
async def download_export_package(filename: str):
    """Download exported workflow package."""
    try:
        # Validate filename to prevent directory traversal
        if ".." in filename or "/" in filename or "\\" in filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid filename"
            )
        
        # Construct file path
        exports_dir = os.path.join(os.getcwd(), "exports")
        file_path = os.path.join(exports_dir, filename)
        
        logger.info(f"Looking for export file: {file_path}")
        logger.info(f"Exports directory: {exports_dir}")
        logger.info(f"File exists: {os.path.exists(file_path)}")
        
        # List available files for debugging
        if os.path.exists(exports_dir):
            available_files = os.listdir(exports_dir)
            logger.info(f"Available files: {available_files}")
        else:
            logger.error(f"Exports directory does not exist: {exports_dir}")
            os.makedirs(exports_dir, exist_ok=True)
        
        # Check if file exists
        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Export package not found: {filename}. Available files: {os.listdir(exports_dir) if os.path.exists(exports_dir) else 'None'}"
            )
        
        # Return file response
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type="application/zip"
        )
        
    except Exception as e:
        logger.error(f"Download failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Download failed"
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