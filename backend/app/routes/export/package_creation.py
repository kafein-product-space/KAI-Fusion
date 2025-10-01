# -*- coding: utf-8 -*-
"""Package creation and backend generation services for export system."""

import logging
import tempfile
import zipfile
import json
import os
import shutil
from typing import Dict, Any

from app.models.workflow import Workflow
from .schemas import WorkflowDependencies, SecurityConfig, MonitoringConfig, DockerConfig
from .workflow_templates import create_workflow_engine, create_main_py, create_dockerfile
from .node_processing import extract_modular_node_implementations

logger = logging.getLogger(__name__)

# ================================================================================
# BACKEND CREATION SERVICES
# ================================================================================

def create_minimal_backend(dependencies: WorkflowDependencies, workflow_flow_data: Dict[str, Any] = None) -> Dict[str, str]:
    """Create modular backend components."""
    logger.info("🔥 Creating modular backend")

    # Extract node implementations to separate files
    if workflow_flow_data:
        modular_files = extract_modular_node_implementations(workflow_flow_data)
        logger.info(f"✅ {len(modular_files)} node files created")
    else:
        modular_files = {"nodes/__init__.py": create_base_definitions()}

    # Add workflow engine from templates
    modular_files["workflow_engine.py"] = create_workflow_engine()

    # Create main.py from templates
    modular_files["main.py"] = create_main_py()

    # Add Dockerfile from templates
    modular_files["Dockerfile"] = create_dockerfile()

    return modular_files

# ================================================================================
# PACKAGE CREATION SERVICES
# ================================================================================

def create_workflow_export_package(components: Dict[str, Any]) -> Dict[str, Any]:
    """Create the final export package as a ZIP file."""
    logger.info("Creating workflow export package")

    workflow = components['workflow']
    package_name = f"workflow-export-{workflow.name.lower().replace(' ', '-')}"

    with tempfile.TemporaryDirectory() as temp_dir:
        package_dir = os.path.join(temp_dir, package_name)
        os.makedirs(package_dir)

        # Write all backend files (modular structure)
        backend_files = components['backend']
        for filename, content in backend_files.items():
            file_path = os.path.join(package_dir, filename)

            # Create subdirectories if needed
            os.makedirs(os.path.dirname(file_path), exist_ok=True)

            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)

        # Write essential files
        essential_files = {
            ".env": components['pre_configured_env'],
            "requirements.txt": components['filtered_requirements'],
            "README.md": components['readme'],
            "workflow-definition.json": json.dumps(workflow.flow_data, indent=2, ensure_ascii=False)
        }

        # Add docker files
        essential_files.update(components['docker_configs'])

        for filename, content in essential_files.items():
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

def create_base_definitions() -> str:
    """Create base node definitions for export runtime."""
    return '''# -*- coding: utf-8 -*-
"""Base Node Definitions - Export Runtime"""

from typing import Dict, Any, Optional, List
from langchain_core.runnables import Runnable, RunnableLambda
import logging

logger = logging.getLogger(__name__)

class BaseNode:
    """Base node class for export runtime."""
    def __init__(self):
        self._metadata = {}
        self.user_data = {}
        self.node_type = "base"

    def execute(self, **kwargs) -> Runnable:
        def base_exec(input_data):
            return {"output": f"{self.__class__.__name__} executed", "type": "base_result"}
        return RunnableLambda(base_exec)

class ProviderNode(BaseNode):
    """Provider node for LLMs and tools."""
    def __init__(self):
        super().__init__()
        self.node_type = "provider"

class ProcessorNode(BaseNode):
    """Processor node for data processing."""
    def __init__(self):
        super().__init__()
        self.node_type = "processor"

class TerminatorNode(BaseNode):
    """Terminator node for workflow completion."""
    def __init__(self):
        super().__init__()
        self.node_type = "terminator"

class MemoryNode(BaseNode):
    """Memory node for state management."""
    def __init__(self):
        super().__init__()
        self.node_type = "memory"
        self._metadata = {"name": "MemoryNode", "node_type": "memory"}

__all__ = ['BaseNode', 'ProviderNode', 'ProcessorNode', 'TerminatorNode', 'MemoryNode']
'''

__all__ = [
    'create_minimal_backend',
    'create_workflow_export_package',
    'create_base_definitions'
]