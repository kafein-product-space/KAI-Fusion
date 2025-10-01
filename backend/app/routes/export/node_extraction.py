# -*- coding: utf-8 -*-
"""Core node extraction services for export system."""

import logging
import inspect
import re
from typing import Dict, Any, Optional
from langchain_core.runnables import RunnableLambda

logger = logging.getLogger(__name__)

# ================================================================================
# CORE NODE EXTRACTION SERVICES
# ================================================================================

def extract_node_source_code(node_class, node_type: str) -> str:
    """Extract actual source code from node class."""
    try:
        # Get the module where the node class is defined
        module = inspect.getmodule(node_class)
        if not module:
            raise ValueError(f"Could not determine module for {node_type}")

        # Get the file path of the module
        module_file = inspect.getfile(module)
        logger.info(f"🔍 Extracting {node_type} from {module_file}")

        # Read the entire source file
        with open(module_file, 'r', encoding='utf-8') as f:
            full_source = f.read()

        # Clean up the source for export
        cleaned_source = clean_node_source_for_export(full_source, node_type)

        logger.info(f"✅ Successfully extracted {len(cleaned_source)} chars for {node_type}")
        return cleaned_source

    except Exception as e:
        logger.warning(f"❌ Failed to extract source for {node_type}: {e}")
        return create_simple_fallback(node_type)

def clean_node_source_for_export(source_code: str, node_type: str) -> str:
    """Clean node source code for standalone export runtime."""
    import re

    logger.info(f"🧹 Cleaning source code for {node_type}")

    cleaned = source_code

    # Remove project internal imports
    internal_imports = [
        "from ..base import", "from ...base import", "from app.core",
        "from app.models", "from app.services", "from app.nodes"
    ]

    for pattern in internal_imports:
        cleaned = cleaned.replace(pattern, f"# {pattern}")

    # Keep external imports (LangChain, etc.)
    external_imports = [
        "from langchain_openai import", "from langchain_tavily import",
        "from langchain_cohere import", "from langchain.memory import"
    ]

    for import_line in external_imports:
        cleaned = cleaned.replace(f"# {import_line}", import_line)

    # Final cleanup
    cleaned = re.sub(r"^(\s*)from app\.", r"\1# from app.", cleaned, flags=re.MULTILINE)

    return cleaned

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

def create_enhanced_base_fallback(node_type: str) -> str:
    """Create enhanced fallback for base node types."""
    if 'processor' in node_type.lower():
        base_class = "ProcessorNode"
        node_behavior = '''
    def execute_core_logic(self, processed_inputs: Dict[str, Any]) -> Any:
        input_text = processed_inputs.get("input", str(processed_inputs))
        return {
            "output": f"Processed by {self.__class__.__name__}: {input_text}",
            "processed_by": self.__class__.__name__,
            "node_type": "processor"
        }'''
    elif 'provider' in node_type.lower():
        base_class = "ProviderNode"
        node_behavior = '''
    def execute_core_logic(self, processed_inputs: Dict[str, Any]) -> Any:
        input_text = processed_inputs.get("input", str(processed_inputs))
        return {
            "provided_data": f"Data provided by {self.__class__.__name__}: {input_text}",
            "provider": self.__class__.__name__,
            "node_type": "provider"
        }'''
    elif 'terminator' in node_type.lower():
        base_class = "TerminatorNode"
        node_behavior = '''
    def execute_core_logic(self, processed_inputs: Dict[str, Any]) -> Any:
        input_data = processed_inputs.get("input", processed_inputs)
        return {
            "final_result": input_data,
            "terminated_by": self.__class__.__name__,
            "execution_complete": True,
            "node_type": "terminator"
        }'''
    else:
        base_class = "BaseNode"
        node_behavior = '''
    def execute_core_logic(self, processed_inputs: Dict[str, Any]) -> Any:
        return {
            "output": f"Executed by {self.__class__.__name__}",
            "inputs": processed_inputs,
            "node_type": "base"
        }'''

    return f'''
# Enhanced {node_type} based on {base_class}
class {node_type}({base_class}):
    def __init__(self):
        super().__init__()
        self.user_data = {{}}
        self._metadata = {{"name": "{node_type}", "type": "{base_class.lower()}"}}

{node_behavior}
'''

__all__ = [
    'extract_node_source_code',
    'clean_node_source_for_export',
    'create_simple_fallback',
    'create_enhanced_base_fallback'
]