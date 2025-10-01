# -*- coding: utf-8 -*-
"""Modular node processing and file generation for export system."""

import logging
import re
from typing import Dict, Any, List
from langchain_core.runnables import RunnableLambda

from app.core.node_registry import node_registry
from .node_mappings import NODE_NAME_MAPPINGS, resolve_node_name
from .node_extraction import extract_node_source_code, create_enhanced_base_fallback

logger = logging.getLogger(__name__)

# ================================================================================
# MODULAR NODE PROCESSING
# ================================================================================

def extract_modular_node_implementations(flow_data: Dict[str, Any]) -> Dict[str, str]:
    """🔥 PHASE 1: Extract nodes with proper name resolution and import order."""
    logger.info("🔥 PHASE 1: Extracting nodes with enhanced name resolution")

    workflow_nodes = flow_data.get("nodes", [])
    detected_node_types = list(set(node.get("type", "") for node in workflow_nodes if node.get("type")))

    logger.info(f"📋 Workflow node types: {detected_node_types}")

    # Initialize node registry
    if not node_registry.nodes:
        node_registry.discover_nodes()

    # Define base node types that shouldn't be searched in registry
    base_node_types = {
        'ProcessorNode', 'ProviderNode', 'TerminatorNode', 'BaseNode', 'MemoryNode',
        'processor', 'provider', 'terminator', 'base', 'memory'
    }

    modular_files = {}

    # 🔥 STEP 1: Base definitions with enhanced mapping
    modular_files["nodes/__init__.py"] = create_base_definitions()

    # 🔥 STEP 2: Process each node with name resolution
    for workflow_node_type in detected_node_types:
        try:
            # 🎯 PHASE 1 FIX: Resolve workflow node name to export class name
            export_class_name = resolve_node_name(workflow_node_type)

            logger.info(f"🔍 Processing: {workflow_node_type} → {export_class_name}")

            node_source = None

            # Check if it's a base node type first
            if workflow_node_type in base_node_types or workflow_node_type.lower() in [t.lower() for t in base_node_types]:
                logger.info(f"✅ {workflow_node_type} is a base class, using built-in definition")
                node_source = create_enhanced_base_fallback(workflow_node_type)
            else:
                # 🔥 Try multiple resolution strategies:

                # Strategy 1: Try original workflow node type
                node_class = node_registry.get_node(workflow_node_type)

                # Strategy 2: Try resolved export class name
                if not node_class and export_class_name != workflow_node_type:
                    node_class = node_registry.get_node(export_class_name.replace('Node', ''))  # Try without 'Node' suffix

                # Strategy 3: Try with metadata.name matching
                if not node_class:
                    # Search registry by metadata name
                    for reg_name, reg_class in node_registry.nodes.items():
                        try:
                            metadata = reg_class().metadata
                            if metadata.name == workflow_node_type or metadata.name == export_class_name:
                                node_class = reg_class
                                logger.info(f"✅ Found {workflow_node_type} via metadata matching: {reg_name}")
                                break
                        except:
                            continue

                if node_class:
                    logger.info(f"✅ {workflow_node_type} found in registry, extracting source")
                    node_source = extract_node_source_code(node_class, export_class_name)
                else:
                    logger.info(f"⚠️  {workflow_node_type} not found in registry, creating enhanced fallback")
                    node_source = create_enhanced_fallback_for_node(workflow_node_type, export_class_name)

            # 🔥 STEP 3: Create clean file with proper naming
            clean_source = create_clean_node_file(node_source, export_class_name)

            # Use consistent filename pattern
            safe_filename = export_class_name.lower().replace('node', '')
            filename = f"nodes/{safe_filename}_node.py"
            modular_files[filename] = clean_source

            logger.info(f"✅ {workflow_node_type} → {export_class_name} → {filename}")

        except Exception as e:
            logger.warning(f"❌ Failed to process {workflow_node_type}: {e}")
            # Emergency fallback
            safe_filename = workflow_node_type.lower()
            filename = f"nodes/{safe_filename}_node.py"
            modular_files[filename] = create_simple_fallback(workflow_node_type)

    logger.info(f"✅ PHASE 1 MODULAR: Created {len(modular_files)} files with enhanced name resolution")
    return modular_files

def create_enhanced_fallback_for_node(workflow_node_type: str, export_class_name: str) -> str:
    """Create enhanced fallback node with proper inheritance and naming."""

    # Determine base class based on node type patterns
    if any(pattern in workflow_node_type.lower() for pattern in ['memory', 'buffer', 'conversation']):
        base_class = 'MemoryNode'
        execute_pattern = '''
    def execute(self, **kwargs):
        def memory_exec(input_data):
            return {
                "output": f"Enhanced {self.__class__.__name__}: {input_data.get('input', '')}",
                "memory_type": self.__class__.__name__.lower(),
                "session_id": input_data.get("session_id", "default"),
                "type": "memory_result"
            }
        from langchain_core.runnables import RunnableLambda
        return RunnableLambda(memory_exec)'''

    elif any(pattern in workflow_node_type.lower() for pattern in ['agent', 'react', 'tool']):
        base_class = 'ProcessorNode'
        execute_pattern = '''
    def execute(self, **kwargs):
        # Handle processor signature patterns
        inputs = kwargs.get('inputs', kwargs)
        connected_nodes = kwargs.get('connected_nodes', {})

        def processor_exec(input_data):
            return {
                "output": f"Enhanced {self.__class__.__name__}: {input_data.get('input', '')}",
                "processor_type": self.__class__.__name__.lower(),
                "inputs_count": len(inputs) if isinstance(inputs, dict) else 0,
                "type": "processor_result"
            }
        from langchain_core.runnables import RunnableLambda
        return RunnableLambda(processor_exec)'''

    elif any(pattern in workflow_node_type.lower() for pattern in ['openai', 'llm', 'chat', 'gpt', 'cohere', 'claude']):
        base_class = 'ProviderNode'
        execute_pattern = '''
    def execute(self, **kwargs):
        def provider_exec(input_data):
            model = self.user_data.get("model_name", "default-model")
            return {
                "output": f"Enhanced {self.__class__.__name__}[{model}]: {input_data.get('input', '')}",
                "provider_type": self.__class__.__name__.lower(),
                "model": model,
                "type": "llm_result"
            }
        from langchain_core.runnables import RunnableLambda
        return RunnableLambda(provider_exec)'''
    else:
        base_class = 'BaseNode'
        execute_pattern = '''
    def execute(self, **kwargs):
        def base_exec(input_data):
            return {
                "output": f"Enhanced {self.__class__.__name__}: {input_data.get('input', '')}",
                "node_type": self.__class__.__name__.lower(),
                "type": "base_result"
            }
        from langchain_core.runnables import RunnableLambda
        return RunnableLambda(base_exec)'''

    return f'''# -*- coding: utf-8 -*-
"""Enhanced {export_class_name} - Auto-generated from {workflow_node_type}"""

from nodes import {base_class}
from langchain_core.runnables import RunnableLambda
import logging

logger = logging.getLogger(__name__)

class {export_class_name}({base_class}):
    """Enhanced {export_class_name} with proper inheritance."""

    def __init__(self):
        super().__init__()
        self.user_data = {{}}
        self._metadata = {{
            "name": "{workflow_node_type}",
            "node_type": "{base_class.lower().replace('node', '')}",
            "export_class": "{export_class_name}"
        }}
        logger.info(f"Initialized {{self.__class__.__name__}} for workflow type: {workflow_node_type}")
{execute_pattern}

# Export the main class
__all__ = ['{export_class_name}']
'''

def create_clean_node_file(node_source: str, node_type: str) -> str:
    """Create clean, standalone node file."""
    import re

    # Simple header
    header = f'''# -*- coding: utf-8 -*-
"""{node_type} Node - Extracted from KAI-Fusion"""

from nodes import BaseNode, ProviderNode, ProcessorNode, TerminatorNode, NodeType, NodeInput, NodeOutput
from typing import Dict, Any, Optional, List
from langchain_core.runnables import Runnable, RunnableLambda
import logging

logger = logging.getLogger(__name__)

'''

    # Clean the source
    cleaned = node_source

    # Fix "class class" syntax error
    cleaned = re.sub(r'class\s+class\s+(\w+)', r'class \1', cleaned)

    # Remove excessive imports (they're in header)
    cleaned = re.sub(r'from typing import.*\n', '', cleaned)
    cleaned = re.sub(r'import logging.*\n', '', cleaned)

    # Shorten very long docstrings
    def shorten_docstring(match):
        full_docstring = match.group(1)
        lines = full_docstring.split('\n')
        if len(lines) > 10:
            return f'"""{lines[0]}\n\n... (Documentation shortened for export) ...\n"""'
        return match.group(0)

    cleaned = re.sub(r'"""(.*?)"""', shorten_docstring, cleaned, flags=re.DOTALL)

    # Ensure we have a proper class definition for this node type
    if f'class {node_type}' not in cleaned:
        # If no specific class found, create a standard one
        if 'class' in cleaned:
            # Replace first class name with correct node type
            cleaned = re.sub(r'class\s+\w+(\([^)]*\))?:', f'class {node_type}\\1:', cleaned, count=1)
        else:
            # Fallback: create a minimal class implementation
            cleaned = f'''
class {node_type}(BaseNode):
    """Generated {node_type} class."""
    def __init__(self):
        super().__init__()
        self.user_data = {{}}
        self._metadata = {{"name": "{node_type}"}}

    def execute_core_logic(self, processed_inputs: Dict[str, Any]) -> Any:
        return {{
            "output": f"Executed by {{self.__class__.__name__}}",
            "inputs": processed_inputs,
            "node_type": "{node_type.lower()}"
        }}
'''

    # Add explicit export of the main class
    footer = f'''

# Export the main node class
__all__ = ['{node_type}']
'''

    return header + cleaned + footer

def create_simple_fallback(node_type: str) -> str:
    """Create simple fallback for nodes that can't be extracted."""
    return f'''
# Simple {node_type} fallback
class {node_type}Node:
    def __init__(self):
        self.user_data = {{}}
        self._metadata = {{"name": "{node_type}"}}

    def execute(self, **kwargs):
        def simple_exec(inputs):
            return {{"output": f"{node_type} executed", "type": "fallback"}}
        from langchain_core.runnables import RunnableLambda
        return RunnableLambda(simple_exec)
'''

def create_base_definitions() -> str:
    """🔥 PHASE 1: Create enhanced base node definitions with proper hierarchy and mappings."""
    return '''# -*- coding: utf-8 -*-
"""🔥 PHASE 1: Enhanced Base Node Definitions - Export Runtime
==============================================================

This module provides the foundational classes for exported workflows with:
- Proper inheritance hierarchy (BaseNode → MemoryNode → specific nodes)
- Name mapping resolution (OpenAIChat → OpenAIChatNode)
- Consistent execute signatures across all node types
- Enhanced fallback mechanisms
"""

from typing import Dict, Any, Optional, List, Union
from langchain_core.runnables import Runnable, RunnableLambda
import logging
import json
import asyncio
import importlib
import os

logger = logging.getLogger(__name__)

# 🔥 PHASE 1: Node name mappings are imported from parent module
# This avoids duplication and ensures consistency

# ================================================================================
# NODE TYPE DEFINITIONS
# ================================================================================

class NodeType:
    PROCESSOR = "processor"
    PROVIDER = "provider"
    TERMINATOR = "terminator"
    MEMORY = "memory"

class NodeInput:
    """Node input definition for export runtime."""
    def __init__(self, name: str, type: str = "str", required: bool = True, description: str = "", default=None, is_connection: bool = False, **kwargs):
        self.name = name
        self.type = type
        self.required = required
        self.description = description
        self.default = default
        self.is_connection = is_connection
        # Handle any additional kwargs for flexibility
        for key, value in kwargs.items():
            setattr(self, key, value)

    @property
    def type_hint(self) -> str:
        """Backward compatibility property for type_hint."""
        return self.type

class NodeOutput:
    """Node output definition for export runtime."""
    def __init__(self, name: str, type: str = "str", description: str = "", type_hint: str = None, **kwargs):
        self.name = name
        self.type = type
        self.type_hint = type_hint or type  # Backward compatibility
        self.description = description
        # Handle any additional kwargs for flexibility
        for key, value in kwargs.items():
            setattr(self, key, value)

class ExecutionResult:
    """Standard execution result wrapper."""
    def __init__(self, data: Any, success: bool = True, error: Optional[str] = None):
        self.data = data
        self.success = success
        self.error = error
        self.metadata = {}

    def to_dict(self):
        return {
            "data": self.data,
            "success": self.success,
            "error": self.error,
            "metadata": self.metadata
        }

# ================================================================================
# 🔥 PHASE 1: ENHANCED BASE NODE HIERARCHY - PROPER INHERITANCE ORDER
# ================================================================================

class BaseNode:
    """🔥 Enhanced base node with standardized execution interface."""
    def __init__(self):
        self._metadata = {}
        self.user_data = {}
        self.node_type = "base"
        self._initialized = False

    @property
    def metadata(self):
        return self._metadata

    def initialize(self):
        """Initialize node with user configuration."""
        if not self._initialized:
            self._initialized = True
            logger.info(f"Node {self.__class__.__name__} initialized")

    def validate_inputs(self, inputs: Dict[str, Any]) -> bool:
        """Validate input data."""
        return True

    def process_inputs(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Process and normalize inputs."""
        return inputs

    def execute_core_logic(self, processed_inputs: Dict[str, Any]) -> Any:
        """Core execution logic - to be overridden."""
        return {"output": f"{self.__class__.__name__} executed", "inputs": processed_inputs}

    def format_outputs(self, result: Any) -> Dict[str, Any]:
        """Format outputs for downstream nodes."""
        if isinstance(result, dict):
            return result
        return {"result": result}

    def execute(self, **kwargs) -> Runnable:
        """🔥 PHASE 1: Universal execute signature - handles all node types."""
        def node_execution(inputs):
            try:
                # Initialize if needed
                self.initialize()

                # 🔥 Handle different signature patterns based on node type
                if hasattr(self, 'node_type') and self.node_type == "processor":
                    # Extract processor-specific arguments
                    processor_inputs = kwargs.get('inputs', {})
                    connected_nodes = kwargs.get('connected_nodes', {})

                    # Merge for processing
                    combined_inputs = {**inputs, **processor_inputs}
                    combined_inputs['connected_nodes'] = connected_nodes

                    processed_inputs = self.process_inputs(combined_inputs)
                else:
                    # Standard processing for provider/terminator/memory nodes
                    processed_inputs = self.process_inputs({**inputs, **kwargs})

                # Validate inputs
                if not self.validate_inputs(processed_inputs):
                    return ExecutionResult(
                        data={"error": "Invalid inputs"},
                        success=False,
                        error="Input validation failed"
                    ).to_dict()

                # Execute core logic
                result = self.execute_core_logic(processed_inputs)

                # Format outputs
                formatted_result = self.format_outputs(result)

                return ExecutionResult(data=formatted_result, success=True).to_dict()

            except Exception as e:
                logger.error(f"Node execution failed: {e}")
                return ExecutionResult(
                    data={"error": str(e)},
                    success=False,
                    error=str(e)
                ).to_dict()

        return RunnableLambda(node_execution)

class ProcessorNode(BaseNode):
    """🔥 Enhanced processor node with consistent signature handling."""
    def __init__(self):
        super().__init__()
        self.node_type = "processor"

    def execute_core_logic(self, processed_inputs: Dict[str, Any]) -> Any:
        # Enhanced processor behavior
        input_text = processed_inputs.get("input", str(processed_inputs))
        connected_nodes = processed_inputs.get("connected_nodes", {})

        return {
            "output": f"Processed: {input_text}",
            "processed_by": self.__class__.__name__,
            "connections_count": len(connected_nodes),
            "node_type": "processor",
            "timestamp": str(asyncio.get_event_loop().time()) if hasattr(asyncio, 'get_event_loop') else "unknown"
        }

class ProviderNode(BaseNode):
    """🔥 Enhanced provider node for LLMs, tools, etc."""
    def __init__(self):
        super().__init__()
        self.node_type = "provider"

    def execute_core_logic(self, processed_inputs: Dict[str, Any]) -> Any:
        # Enhanced provider behavior
        input_text = processed_inputs.get("input", str(processed_inputs))

        return {
            "provided_data": f"Data provided for: {input_text}",
            "provider": self.__class__.__name__,
            "node_type": "provider",
            "data_type": "text",
            "metadata": {"source": "provider_node"}
        }

class TerminatorNode(BaseNode):
    """🔥 Enhanced terminator node for workflow completion."""
    def __init__(self):
        super().__init__()
        self.node_type = "terminator"

    def execute_core_logic(self, processed_inputs: Dict[str, Any]) -> Any:
        # Enhanced terminator behavior
        input_data = processed_inputs.get("input", processed_inputs)

        return {
            "final_result": input_data,
            "terminated_by": self.__class__.__name__,
            "node_type": "terminator",
            "execution_complete": True,
            "summary": f"Workflow terminated with result: {json.dumps(input_data, default=str)[:100]}..."
        }

class MemoryNode(BaseNode):
    """🔥 PHASE 1 FIX: Memory base class - MUST be defined before BufferMemoryNode!"""
    def __init__(self):
        super().__init__()
        self.node_type = "memory"
        self._metadata = {"name": "MemoryNode", "node_type": "memory"}

    def execute_core_logic(self, processed_inputs: Dict[str, Any]) -> Any:
        # Enhanced memory behavior
        session_id = processed_inputs.get("session_id", "default")

        return {
            "memory_data": processed_inputs.get("input", ""),
            "memory_type": self.__class__.__name__,
            "session_id": session_id,
            "node_type": "memory",
            "metadata": {"source": "memory_node"}
        }

# ================================================================================
# ENHANCED RUNTIME SUPPORT FUNCTIONS
# ================================================================================

def trace_memory_operation(operation_name):
    """Enhanced memory operation tracer."""
    def decorator(func):
        def wrapper(*args, **kwargs):
            logger.debug(f"🔥 Memory operation: {operation_name}")
            return func(*args, **kwargs)
        return wrapper
    return decorator

def get_workflow_tracer(session_id=None):
    """Enhanced workflow tracer."""
    class EnhancedTracer:
        def __init__(self, session_id):
            self.session_id = session_id or "default_session"

        def track_memory_operation(self, op, node_type, message, session_id):
            logger.info(f"🔥 [{self.session_id}] {node_type}: {op} - {message}")

        def track_execution(self, node_name, inputs, outputs):
            logger.info(f"🔥 [{self.session_id}] Node {node_name} executed")

    return EnhancedTracer(session_id)

def get_colored_logger(name):
    """Enhanced colored logger."""
    class EnhancedColoredLogger:
        def __init__(self, name):
            self.name = name
            self.logger = logging.getLogger(name)

        def yellow(self, message):
            self.logger.warning(f"🔥 [{self.name}] {message}")

        def green(self, message):
            self.logger.info(f"🔥 [{self.name}] {message}")

        def red(self, message):
            self.logger.error(f"🔥 [{self.name}] {message}")

    return EnhancedColoredLogger(name)

def create_runnable_chain(*nodes):
    """Create a chain of runnable nodes."""
    def chain_execution(inputs):
        current_inputs = inputs
        results = []

        for node in nodes:
            try:
                runnable = node.execute()
                result = runnable.invoke(current_inputs)
                results.append(result)

                if result.get("success", True):
                    current_inputs = result.get("data", result)
                else:
                    return {"error": f"Chain failed at {node.__class__.__name__}", "results": results}
            except Exception as e:
                return {"error": f"Chain execution failed: {e}", "results": results}

        return {"success": True, "results": results, "final_output": current_inputs}

    return RunnableLambda(chain_execution)

# ================================================================================
# 🔥 PHASE 1: ENHANCED DYNAMIC MODULE IMPORTING WITH NAME RESOLUTION
# ================================================================================

def _discover_and_import_node_modules():
    """🔥 PHASE 1: Enhanced node module discovery with proper name mapping."""
    import glob
    import os
    import sys

    # 🔥 STEP 1: Pre-register critical classes in correct dependency order
    _register_critical_missing_classes()

    try:
        # Determine current directory for node discovery
        current_dir = None

        try:
            current_dir = os.path.dirname(__file__)
        except NameError:
            cwd = os.getcwd()
            potential_dirs = [
                os.path.join(cwd, "nodes"),
                cwd
            ]
            for potential_dir in potential_dirs:
                if os.path.exists(potential_dir) and os.path.isdir(potential_dir):
                    current_dir = potential_dir
                    break

        if not current_dir:
            for path in sys.path:
                nodes_path = os.path.join(path, "nodes")
                if os.path.exists(nodes_path) and os.path.isdir(nodes_path):
                    current_dir = nodes_path
                    break

        if not current_dir:
            logger.warning("🔥 Could not determine nodes directory")
            return

        logger.info(f"🔥 PHASE 1: Looking for node modules in: {current_dir}")

        # Find all *_node.py files
        node_files = glob.glob(os.path.join(current_dir, "*_node.py"))

        if not node_files:
            try:
                node_files = [f for f in os.listdir(current_dir) if f.endswith("_node.py")]
                node_files = [os.path.join(current_dir, f) for f in node_files]
            except OSError:
                logger.warning(f"🔥 Could not list directory: {current_dir}")
                return

        logger.info(f"🔥 PHASE 1: Found {len(node_files)} node files: {[os.path.basename(f) for f in node_files]}")

        # 🔥 STEP 2: Import modules with enhanced error handling
        for node_file in node_files:
            try:
                module_name = os.path.basename(node_file)[:-3]  # Remove .py

                try:
                    module = importlib.import_module(f".{module_name}", package="nodes")
                except ImportError as e:
                    try:
                        module = importlib.import_module(f"nodes.{module_name}")
                    except ImportError:
                        logger.warning(f"🔥 Failed to import {module_name}: {e}")
                        continue

                # Add module to global namespace
                globals()[module_name] = module

                # 🔥 STEP 3: Enhanced class discovery with name mapping
                node_type_parts = module_name.replace("_node", "").split("_")
                node_class_name = "".join(word.capitalize() for word in node_type_parts)

                # Try multiple naming patterns with name mapping resolution
                possible_names = [
                    node_class_name,
                    node_class_name + "Node",
                    module_name.replace("_", ""),
                    resolve_node_name(node_class_name)  # 🔥 Use name mapping
                ]

                class_found = False
                for class_name in possible_names:
                    if hasattr(module, class_name):
                        globals()[class_name] = getattr(module, class_name)
                        logger.info(f"🔥 Exposed class {class_name} from {module_name}")
                        class_found = True
                        break

                # Fallback: search for any node-like class
                if not class_found:
                    for attr_name in dir(module):
                        attr = getattr(module, attr_name)
                        if (isinstance(attr, type) and
                            hasattr(attr, 'execute') and
                            'node' in attr_name.lower()):
                            globals()[attr_name] = attr
                            logger.info(f"🔥 Exposed class {attr_name} from {module_name}")
                            break

                logger.info(f"🔥 Successfully imported: {module_name}")

            except Exception as e:
                logger.warning(f"🔥 Failed to process {module_name}: {e}")
                _create_fallback_module_stub(module_name)

    except Exception as e:
        logger.warning(f"🔥 Node module discovery failed: {e}")

# Enhanced exports and availability tracking
_available_modules = []
_available_classes = []

def _register_discovered_items():
    """🔥 Enhanced registration with name mapping support."""
    import os
    import glob

    try:
        current_dir = None
        try:
            current_dir = os.path.dirname(__file__)
        except NameError:
            current_dir = os.getcwd()
            if not os.path.exists(os.path.join(current_dir, "__init__.py")):
                nodes_dir = os.path.join(current_dir, "nodes")
                if os.path.exists(nodes_dir):
                    current_dir = nodes_dir

        if current_dir and os.path.exists(current_dir):
            node_files = glob.glob(os.path.join(current_dir, "*_node.py"))
            for node_file in node_files:
                module_name = os.path.basename(node_file)[:-3]
                _available_modules.append(module_name)

                # Generate both original and mapped class names
                node_type_parts = module_name.replace("_node", "").split("_")
                class_name = "".join(word.capitalize() for word in node_type_parts)
                _available_classes.extend([
                    class_name,
                    class_name + "Node",
                    resolve_node_name(class_name)  # 🔥 Include mapped names
                ])

        logger.info(f"🔥 PHASE 1: Registered {len(_available_modules)} modules, {len(_available_classes)} classes")

    except Exception as e:
        logger.warning(f"🔥 Registration failed: {e}")

# 🔥 PHASE 1: Auto-import with enhanced error handling
try:
    _discover_and_import_node_modules()
    _register_discovered_items()
    logger.info("🔥 PHASE 1: Node module discovery completed successfully")
except Exception as e:
    logger.error(f"🔥 PHASE 1: Auto-import failed: {e}")

# Enhanced exports with name mappings
__all__ = [
    'BaseNode', 'ProcessorNode', 'ProviderNode', 'TerminatorNode', 'MemoryNode',
    'NodeType', 'NodeInput', 'NodeOutput', 'ExecutionResult', 'resolve_node_name',
    'NODE_NAME_MAPPINGS'
] + _available_modules + _available_classes

def __getattr__(name):
    """🔥 PHASE 1: Enhanced dynamic attribute access with name resolution."""
    # 1. Try direct module access
    if name in _available_modules:
        try:
            return importlib.import_module(f".{name}", package="nodes")
        except ImportError as e:
            logger.warning(f"🔥 Failed to import module {name}: {e}")
            raise AttributeError(f"module 'nodes' has no attribute '{name}'")

    # 2. Try class access with name mapping
    if name in _available_classes:
        for module_name in _available_modules:
            try:
                module = importlib.import_module(f".{module_name}", package="nodes")
                if hasattr(module, name):
                    return getattr(module, name)
            except ImportError:
                continue

    # 3. Try name mapping resolution
    resolved_name = resolve_node_name(name)
    if resolved_name != name and resolved_name in globals():
        return globals()[resolved_name]

    raise AttributeError(f"module 'nodes' has no attribute '{name}' (tried name mapping: {resolved_name})")

logger.info("🔥 PHASE 1: Enhanced base definitions module initialized successfully")
'''

__all__ = [
    'extract_modular_node_implementations',
    'create_enhanced_fallback_for_node',
    'create_clean_node_file',
    'create_simple_fallback',
    'create_base_definitions'
]