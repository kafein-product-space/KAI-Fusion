# -*- coding: utf-8 -*-
"""Export API routes."""

import logging
import uuid
import os
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.models.workflow import Workflow
from app.services.workflow_service import WorkflowService
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.core.database import get_db_session

from .schemas import WorkflowExportConfig, WorkflowEnvironmentConfig
from .utils import analyze_workflow_dependencies, get_required_env_vars_for_workflow, validate_env_variables
from .ast_exporter import LibcstWorkflowExporter

logger = logging.getLogger(__name__)
router = APIRouter()

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
        
        # Use AST-based export system
        logger.info("Starting AST-based workflow export...")

        # Export workflow using AST-based exporter
        ast_exporter = LibcstWorkflowExporter()
        ast_export_package = ast_exporter.export_workflow_ast(
            workflow.flow_data, env_config
        )

        logger.info("✅ AST-based export completed successfully")

        # Create export package
        export_package = _create_export_package_from_ast(ast_export_package, workflow)

        logger.info("✅ Export package created successfully")
        
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

def _create_export_package_from_ast(ast_export_package: Dict[str, str], workflow) -> Dict[str, Any]:
    """Create export package format from AST-based export."""
    import tempfile
    import zipfile
    import os
    import shutil
    
    logger.info("📦 Creating export package from AST output...")
    
    # Create package name
    package_name = f"workflow-export-{workflow.name.lower().replace(' ', '-')}"
    
    with tempfile.TemporaryDirectory() as temp_dir:
        package_dir = os.path.join(temp_dir, package_name)
        os.makedirs(package_dir)
        
        # Write all files from AST export
        for filename, content in ast_export_package.items():
            file_path = os.path.join(package_dir, filename)
            
            # Create subdirectories if needed
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            
            with open(file_path, 'w', encoding='utf-8') as f:
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
        permanent_dir = os.path.join(os.getcwd(), "exports")
        os.makedirs(permanent_dir, exist_ok=True)
        permanent_zip_path = os.path.join(permanent_dir, f"{package_name}.zip")
        shutil.move(zip_path, permanent_zip_path)
        
        logger.info(f"✅ Export package created: {permanent_zip_path}")
        
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
