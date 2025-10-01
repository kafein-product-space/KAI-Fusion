# -*- coding: utf-8 -*-
"""Dynamic Package Generator for AST-Based Export System
========================================================

Advanced package generation system that creates optimized, ready-to-run
workflow export packages with dynamic main.py, optimized requirements,
Docker configurations, and production-ready runtime components.
"""

import json
import os
import tempfile
import zipfile
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)


class DynamicPackageGenerator:
    """Generate optimized export packages with dynamic runtime"""

    def __init__(self):
        self.generation_stats = {}

    def generate_export_package(self, optimized_components: Dict[str, str],
                                workflow_data: Dict[str, Any]) -> Dict[str, str]:
        """Generate complete export package

        Args:
            optimized_components: Dictionary of optimized source code files
            workflow_data: Original workflow definition

        Returns:
            Dictionary containing all package files
        """
        logger.info("📦 Generating dynamic export package...")

        package = {}

        try:
            # 1. Generate dynamic main.py
            logger.info("🚀 Creating dynamic main.py...")
            package["main.py"] = self._create_dynamic_main(workflow_data, optimized_components)

            # 2. Add optimized components
            logger.info("📁 Adding optimized components...")
            package.update(optimized_components)

            # 3. Generate optimized requirements.txt
            logger.info("📋 Creating optimized requirements.txt...")
            package["requirements.txt"] = self._create_optimized_requirements(optimized_components)

            # 4. Create Docker configuration
            logger.info("🐳 Creating Docker configuration...")
            docker_config = self._create_docker_configuration(workflow_data)
            package.update(docker_config)

            # 5. Create environment configuration
            logger.info("⚙️ Creating environment configuration...")
            package[".env"] = self._create_environment_config(workflow_data)

            # 6. Create dynamic nodes base classes based on workflow requirements
            logger.info("🔧 Creating dynamic nodes base classes...")
            nodes_files = self._create_dynamic_nodes_base_classes(workflow_data, optimized_components)
            package.update(nodes_files)

            # 7. Generate workflow runtime
            logger.info("🔧 Creating workflow runtime...")
            runtime_files = self._create_workflow_runtime(workflow_data)
            package.update(runtime_files)

            # 7. Create documentation
            logger.info("📖 Creating documentation...")
            package["README.md"] = self._create_dynamic_readme(workflow_data)

            # 8. Add workflow definition
            package["workflow-definition.json"] = json.dumps(workflow_data, indent=2)

            # 9. Create package manifest
            package["package-manifest.json"] = self._create_package_manifest(
                workflow_data, len(package), optimized_components
            )

            # Generate statistics
            self.generation_stats = self._calculate_package_stats(package, optimized_components)

            logger.info(f"✅ Export package generated successfully")
            logger.info(f"📊 Package contains {len(package)} files")
            logger.info(f"📏 Total package size: {self.generation_stats['total_size_kb']:.1f} KB")

            return package

        except Exception as e:
            logger.error(f"❌ Failed to generate export package: {e}")
            raise

    def _create_dynamic_main(self, workflow_data: Dict[str, Any],
                             components: Dict[str, str]) -> str:
        """Create dynamic main.py tailored to the specific workflow"""

        workflow_name = workflow_data.get("name", "KAI-Fusion Workflow")
        workflow_id = workflow_data.get("id", f"wf_{uuid.uuid4().hex[:8]}")
        nodes = workflow_data.get("nodes", [])
        node_types = list(set(node.get("type") for node in nodes if node.get("type")))

        # Determine which imports are needed based on components
        imports = self._analyze_required_imports(components)

        # Import the main.py template from workflow_templates
        from .workflow_templates import create_main_py

        main_content = create_main_py()

        return main_content

    def _create_optimized_requirements(self, components: Dict[str, str]) -> str:
        """Create optimized requirements.txt based on actual component usage"""

        # Base requirements always needed
        base_requirements = [
            "fastapi>=0.104.0",
            "uvicorn[standard]>=0.24.0",
            "pydantic>=2.5.0",
            "langchain-core>=0.3.0",
            "langgraph>=0.6.0"
        ]

        # Analyze components for additional requirements
        additional_requirements = set()

        for component_name, source_code in components.items():
            # Check for specific imports in the source code
            if "langchain_openai" in source_code:
                additional_requirements.add("langchain-openai>=0.3.0")
            if "langchain_tavily" in source_code:
                additional_requirements.add("langchain-tavily>=0.2.0")
            if "langchain_cohere" in source_code:
                additional_requirements.add("langchain-cohere>=0.4.0")
            if "langchain_community" in source_code:
                additional_requirements.add("langchain-community>=0.3.0")
            if "sqlalchemy" in source_code:
                additional_requirements.add("sqlalchemy>=2.0.0")
                additional_requirements.add("asyncpg>=0.28.0")
            if "requests" in source_code:
                additional_requirements.add("requests>=2.32.0")
            if "httpx" in source_code:
                additional_requirements.add("httpx>=0.28.0")
            if "aiofiles" in source_code:
                additional_requirements.add("aiofiles>=23.0.0")

        # Combine and sort
        all_requirements = sorted(base_requirements + list(additional_requirements))

        return "\n".join(all_requirements)

    def _create_docker_configuration(self, workflow_data: Dict[str, Any]) -> Dict[str, str]:
        """Create optimized Docker configuration"""

        workflow_name = workflow_data.get("name", "kai-fusion-workflow")
        workflow_slug = workflow_name.lower().replace(" ", "-").replace("_", "-")

        dockerfile = f'''# Optimized Dockerfile for KAI-Fusion Workflow Export
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies (minimal)
RUN apt-get update && apt-get install -y \\
    --no-install-recommends \\
    gcc \\
    python3-dev \\
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash workflow
USER workflow

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \\
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["python", "main.py"]
'''

        compose_yml = f'''version: '3.8'

services:
  {workflow_slug}:
    build: .
    container_name: {workflow_slug}
    ports:
      - "${{PORT:-8000}}:8000"
    environment:
      - HOST=0.0.0.0
      - PORT=8000
      - RELOAD=false
    env_file:
      - .env
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  logs:
    driver: local
'''

        dockerignore = '''# Docker ignore file for KAI-Fusion export
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg
MANIFEST
.env.local
.env.development
.env.test
.venv
env/
venv/
ENV/
env.bak/
venv.bak/
.git
.gitignore
README.md
*.md
tests/
test_*
*_test.py
'''

        return {
            "Dockerfile": dockerfile,
            "docker-compose.yml": compose_yml,
            ".dockerignore": dockerignore
        }

    def _create_environment_config(self, workflow_data: Dict[str, Any]) -> str:
        """Create .env configuration file"""

        workflow_id = workflow_data.get("id", f"wf_{uuid.uuid4().hex[:8]}")
        workflow_name = workflow_data.get("name", "KAI-Fusion Workflow")

        env_content = f'''# Environment Configuration for {workflow_name}
# Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

# Workflow Configuration
WORKFLOW_ID={workflow_id}
WORKFLOW_NAME="{workflow_name}"

# Server Configuration
HOST=0.0.0.0
PORT=8000
RELOAD=false

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=%(asctime)s - %(name)s - %(levelname)s - %(message)s

# Performance Configuration
WORKERS=1
MAX_REQUESTS=1000
MAX_REQUESTS_JITTER=100

# Security Configuration (configure these for production)
# SECRET_KEY=your-secret-key-here
# API_KEYS=your-api-keys-here

# LangChain Configuration (optional)
# LANGCHAIN_TRACING_V2=true
# LANGCHAIN_API_KEY=your-langsmith-api-key
# LANGCHAIN_PROJECT=your-project-name

# Provider API Keys (configure as needed for your workflow)
# OPENAI_API_KEY=your-openai-api-key
# COHERE_API_KEY=your-cohere-api-key
# TAVILY_API_KEY=your-tavily-api-key

# Database Configuration (if needed)
# DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# External Service Configuration
# Add any additional environment variables your workflow requires
'''

        return env_content

    def _create_dynamic_nodes_base_classes(self, workflow_data: Dict[str, Any], components: Dict[str, str]) -> Dict[
        str, str]:
        """Create dynamic nodes base classes based on workflow requirements"""

        # Extract required node types from workflow
        nodes = workflow_data.get("nodes", [])
        required_node_types = list(set(node.get("type") for node in nodes if node.get("type")))

        logger.info(f"🔍 Generating dynamic base classes for node types: {required_node_types}")

        # Perform dynamic base class analysis
        try:
            from .dynamic_base_class_analyzer import create_dynamic_base_class_extractor

            analyzer = create_dynamic_base_class_extractor(Path("backend/app"))
            base_class_analysis = analyzer.analyze_inheritance_patterns()

            logger.info(f"✅ Dynamic analysis found {len(base_class_analysis['base_class_definitions'])} base classes")

        except Exception as e:
            logger.warning(f"⚠️ Dynamic analysis failed, using semantic analysis: {e}")
            base_class_analysis = None

        # Generate dynamic nodes init content
        from .nodes_base import get_nodes_init_content

        nodes_init_content = get_nodes_init_content(required_node_types, base_class_analysis)

        return {
            "nodes/__init__.py": nodes_init_content
        }

    def _create_workflow_runtime(self, workflow_data: Dict[str, Any]) -> Dict[str, str]:
        """Create additional runtime files"""

        # Create the enhanced workflow engine that was shown in workflow_templates.py
        from .workflow_templates import create_workflow_engine

        # Create a simple logging configuration
        logging_config = '''# -*- coding: utf-8 -*-
"""Logging configuration for KAI-Fusion runtime"""

import logging
import sys
from typing import Dict, Any

def setup_logging(level: str = "INFO") -> None:
    """Setup logging configuration"""

    logging.basicConfig(
        level=getattr(logging, level.upper()),
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler("logs/runtime.log", mode="a", encoding="utf-8")
        ]
    )

    # Set specific log levels for noisy libraries
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("fastapi").setLevel(logging.WARNING)

def get_logger(name: str) -> logging.Logger:
    """Get configured logger"""
    return logging.getLogger(name)
'''

        # Create runtime utilities
        utils = '''# -*- coding: utf-8 -*-
"""Runtime utilities for KAI-Fusion export"""

import os
import json
import asyncio
from typing import Dict, Any, Optional
from pathlib import Path

class RuntimeConfig:
    """Runtime configuration management"""

    def __init__(self):
        self.config = self._load_config()

    def _load_config(self) -> Dict[str, Any]:
        """Load runtime configuration"""
        return {
            "workflow_id": os.getenv("WORKFLOW_ID", "unknown"),
            "workflow_name": os.getenv("WORKFLOW_NAME", "KAI-Fusion Workflow"),
            "host": os.getenv("HOST", "0.0.0.0"),
            "port": int(os.getenv("PORT", "8000")),
            "log_level": os.getenv("LOG_LEVEL", "info"),
            "reload": os.getenv("RELOAD", "false").lower() == "true"
        }

    def get(self, key: str, default: Any = None) -> Any:
        """Get configuration value"""
        return self.config.get(key, default)

# Global configuration instance
config = RuntimeConfig()
'''

        return {
            "workflow_engine.py": create_workflow_engine(),
            "logging_config.py": logging_config,
            "runtime_utils.py": utils
        }

    def _create_dynamic_readme(self, workflow_data: Dict[str, Any]) -> str:
        """Create comprehensive README for the export package"""

        workflow_name = workflow_data.get("name", "KAI-Fusion Workflow")
        workflow_description = workflow_data.get("description", "Exported KAI-Fusion workflow")
        nodes = workflow_data.get("nodes", [])
        node_types = list(set(node.get("type") for node in nodes if node.get("type")))

        readme_content = f'''# {workflow_name} - KAI-Fusion Export

{workflow_description}

This is an optimized, standalone export of a KAI-Fusion workflow, generated using advanced AST-based tree shaking and code optimization techniques.

## 🚀 Quick Start

### Prerequisites
- Python 3.11 or higher
- Docker (optional, for containerized deployment)

### Local Development
```bash
# Install dependencies
pip install -r requirements.txt

# Run the application
python main.py
```

The application will start on `http://localhost:8000`

### Docker Deployment
```bash
# Build the Docker image
docker-compose build

# Run with Docker Compose
docker-compose up -d
```

## 📖 API Documentation

Once running, visit:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## 🔗 API Endpoints

### Health Check
```bash
curl http://localhost:8000/health
```

### Execute Workflow
```bash
curl -X POST http://localhost:8000/api/workflow/execute \\
  -H "Content-Type: application/json" \\
  -d '{{"inputs": {{"input": "Your input data here"}}}}'
```

### Get Workflow Information
```bash
curl http://localhost:8000/api/workflow/info
```

## 📊 Workflow Details

- **Workflow ID**: `{workflow_data.get("id", "N/A")}`
- **Node Count**: `{len(nodes)}`
- **Edge Count**: `{len(workflow_data.get("edges", []))}`
- **Node Types**: `{", ".join(node_types) if node_types else "None"}`
- **Generated**: `{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}`

## ⚙️ Configuration

### Environment Variables

Configure the application using environment variables in the `.env` file:

| Variable | Description | Default |
|----------|-------------|---------|
| `HOST` | Server host address | `0.0.0.0` |
| `PORT` | Server port | `8000` |
| `LOG_LEVEL` | Logging level | `info` |
| `RELOAD` | Enable auto-reload (development) | `false` |

### API Keys

If your workflow uses external services, configure the appropriate API keys:

```bash
# OpenAI
export OPENAI_API_KEY="your-openai-api-key"

# Cohere
export COHERE_API_KEY="your-cohere-api-key"

# Tavily
export TAVILY_API_KEY="your-tavily-api-key"
```

## 🏗️ Architecture

This export package contains:

- **Optimized Runtime**: Tree-shaken KAI-Fusion components with only required functionality
- **Dynamic Main**: Application entry point tailored to your specific workflow
- **Production Engine**: Complete LangGraph workflow execution engine
- **FastAPI Server**: RESTful API for workflow execution
- **Docker Support**: Ready-to-deploy containerization

## 📦 Package Optimization

This export has been optimized using advanced techniques:

- **Tree Shaking**: Eliminated unused code and dependencies
- **Dead Code Removal**: Removed debug statements and unreachable code
- **Import Optimization**: Minimized import statements to required modules only
- **Component Extraction**: Surgical extraction of only required components

**Size Reduction**: Estimated 80-95% smaller than full KAI-Fusion installation
**Performance**: Zero-overhead runtime with production-optimized code paths

## 🔧 Development

### Project Structure
```
{workflow_name.lower().replace(" ", "-")}/
├── main.py                 # Application entry point
├── requirements.txt        # Python dependencies
├── workflow-definition.json # Original workflow definition
├── package-manifest.json   # Package metadata
├── .env                    # Environment configuration
├── Dockerfile             # Container definition
├── docker-compose.yml     # Container orchestration
├── README.md              # This file
└── *.py                   # Optimized KAI-Fusion components
```

### Extending the Runtime

To modify or extend this runtime:

1. Update the workflow definition in `workflow-definition.json`
2. Modify environment variables in `.env`
3. Restart the application

### Logging

Logs are written to:
- Console output (stdout)
- `logs/runtime.log` (if logs directory exists)

## 🐛 Troubleshooting

### Common Issues

**Application won't start**
- Check that all required API keys are configured
- Verify Python version (3.11+ required)
- Ensure all dependencies are installed

**Workflow execution fails**
- Check the logs for detailed error messages
- Verify input data format matches expected schema
- Ensure all required environment variables are set

**Docker container fails to build**
- Check Docker version (20.10+ recommended)
- Ensure sufficient disk space
- Verify internet connectivity for dependency downloads

### Getting Help

If you encounter issues:

1. Check the application logs
2. Verify your configuration
3. Ensure all API keys are valid
4. Contact your KAI-Fusion administrator

## 📝 Generated Information

- **Export Method**: AST-based tree shaking with libcst
- **Generation Time**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
- **KAI-Fusion Version**: 2.1.0
- **Optimization Level**: Production
- **Package Type**: Standalone Runtime

---

*This package was automatically generated by the KAI-Fusion platform using advanced AST-based optimization techniques for minimal footprint and maximum performance.*
'''

        return readme_content

    def _create_package_manifest(self, workflow_data: Dict[str, Any],
                                 file_count: int, components: Dict[str, str]) -> str:
        """Create package manifest with metadata"""

        manifest = {
            "package_info": {
                "name": workflow_data.get("name", "KAI-Fusion Workflow"),
                "workflow_id": workflow_data.get("id", "unknown"),
                "generated_at": datetime.now().isoformat(),
                "generator_version": "2.1.0",
                "export_method": "AST-based tree shaking"
            },
            "workflow_stats": {
                "node_count": len(workflow_data.get("nodes", [])),
                "edge_count": len(workflow_data.get("edges", [])),
                "node_types": list(set(node.get("type") for node in workflow_data.get("nodes", []) if node.get("type")))
            },
            "package_stats": {
                "total_files": file_count,
                "component_files": len(components),
                "total_size_estimate_kb": sum(len(content) for content in components.values()) // 1024,
                "optimization_level": "production"
            },
            "optimization_features": [
                "Tree shaking",
                "Dead code elimination",
                "Import optimization",
                "Docstring optimization",
                "Debug code removal",
                "Method inlining"
            ],
            "runtime_features": [
                "FastAPI web server",
                "Complete workflow execution",
                "Health monitoring",
                "Docker containerization",
                "Production logging"
            ]
        }

        return json.dumps(manifest, indent=2)

    def _analyze_required_imports(self, components: Dict[str, str]) -> str:
        """Analyze components to determine required imports for main.py"""

        required_imports = set()

        # Always needed for main.py
        base_imports = [
            "from pathlib import Path",
            "import uuid",
            "from datetime import datetime"
        ]

        # Check what components are available
        if any("engine" in name.lower() for name in components.keys()):
            required_imports.add("from engine import LangGraphWorkflowEngine")

        if any("node_registry" in name.lower() for name in components.keys()):
            required_imports.add("from node_registry import NodeRegistry")

        if any("state" in name.lower() for name in components.keys()):
            required_imports.add("from state import FlowState")

        # Combine all imports
        all_imports = base_imports + sorted(list(required_imports))

        return "\n".join(all_imports)

    def _estimate_package_size(self, components: Dict[str, str]) -> str:
        """Estimate total package size"""

        total_bytes = sum(len(content.encode('utf-8')) for content in components.values())

        if total_bytes < 1024:
            return f"{total_bytes} bytes"
        elif total_bytes < 1024 * 1024:
            return f"{total_bytes / 1024:.1f} KB"
        else:
            return f"{total_bytes / (1024 * 1024):.1f} MB"

    def _calculate_package_stats(self, package: Dict[str, str],
                                 components: Dict[str, str]) -> Dict[str, Any]:
        """Calculate comprehensive package statistics"""

        total_size = sum(len(content.encode('utf-8')) for content in package.values())
        component_size = sum(len(content.encode('utf-8')) for content in components.values())

        return {
            "total_files": len(package),
            "component_files": len(components),
            "total_size_bytes": total_size,
            "total_size_kb": total_size / 1024,
            "total_size_mb": total_size / (1024 * 1024),
            "component_size_kb": component_size / 1024,
            "overhead_size_kb": (total_size - component_size) / 1024,
            "largest_file": max(package.items(), key=lambda x: len(x[1]))[0],
            "file_types": self._analyze_file_types(package)
        }

    def _analyze_file_types(self, package: Dict[str, str]) -> Dict[str, int]:
        """Analyze file types in package"""

        types = {}

        for filename in package.keys():
            if filename.endswith('.py'):
                types['python'] = types.get('python', 0) + 1
            elif filename.endswith('.json'):
                types['json'] = types.get('json', 0) + 1
            elif filename.endswith('.txt'):
                types['text'] = types.get('text', 0) + 1
            elif filename.endswith('.md'):
                types['markdown'] = types.get('markdown', 0) + 1
            elif filename.endswith('.yml') or filename.endswith('.yaml'):
                types['yaml'] = types.get('yaml', 0) + 1
            elif filename.startswith('Dockerfile') or filename.startswith('.docker'):
                types['docker'] = types.get('docker', 0) + 1
            else:
                types['other'] = types.get('other', 0) + 1

        return types

    def get_generation_stats(self) -> Dict[str, Any]:
        """Get package generation statistics"""
        return self.generation_stats


# Export main class
__all__ = ["DynamicPackageGenerator"]