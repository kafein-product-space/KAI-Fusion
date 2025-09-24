# -*- coding: utf-8 -*-
"""
Simplified Export Module - Clean Export Functionality
=====================================================

This module provides streamlined export functionality with:
- Core export services (services.py)
- API routes (routes.py)
- Utilities (utils.py)
- Data schemas (schemas.py)
- Workflow templates (workflow_templates.py)
- AST-based export (ast_exporter.py)

Removed over-engineered components:
- Dynamic base class analyzer
- Interface standardizer
- Unified registry system
- Enhanced export engine
- Tree shaker
- Component extractor
- Package generator
- Nodes base generator
"""

from typing import Dict, Any

from .routes import router
from .schemas import (
    WorkflowExportConfig,
    EnvironmentVariable,
    WorkflowDependencies,
    SecurityConfig,
    MonitoringConfig,
    DockerConfig,
    WorkflowEnvironmentConfig,
    ExportPackage
)
from .utils import (
    analyze_workflow_dependencies,
    get_required_env_vars_for_workflow,
    validate_env_variables
)

# Core export services
from .services import (
    extract_node_source_code,
    clean_node_source_for_export,
    extract_modular_node_implementations,
    create_minimal_backend,
    create_workflow_export_package,
    NODE_NAME_MAPPINGS,
    resolve_node_name
)

# AST-based export
from .ast_exporter import LibcstWorkflowExporter

# Workflow templates
from .workflow_templates import (
    create_workflow_engine,
    create_main_py,
    create_dockerfile
)

__all__ = [
    # Core API
    "router",
    "WorkflowExportConfig",
    "EnvironmentVariable",
    "WorkflowDependencies",
    "SecurityConfig",
    "MonitoringConfig",
    "DockerConfig",
    "WorkflowEnvironmentConfig",
    "ExportPackage",
    "analyze_workflow_dependencies",
    "get_required_env_vars_for_workflow",
    "validate_env_variables",

    # Export services
    "extract_node_source_code",
    "clean_node_source_for_export",
    "extract_modular_node_implementations",
    "create_minimal_backend",
    "create_workflow_export_package",
    "NODE_NAME_MAPPINGS",
    "resolve_node_name",

    # AST export
    "LibcstWorkflowExporter",

    # Templates
    "create_workflow_engine",
    "create_main_py",
    "create_dockerfile"
]