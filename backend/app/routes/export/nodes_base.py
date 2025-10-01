def generate_dynamic_nodes_init(required_node_types, base_class_analysis=None):
    """Generate dynamic nodes/__init__.py based on required node types and analysis"""

    # Start with core base classes that are always needed
    template_start = '''# -*- coding: utf-8 -*-
"""KAI-Fusion Node Base Classes - Dynamic Export Runtime"""

from typing import Dict, Any, List, Optional, Union
from enum import Enum
from abc import ABC, abstractmethod
from langchain_core.runnables import Runnable, RunnableLambda
import logging

logger = logging.getLogger(__name__)

class NodeType(Enum):
    """Node type enumeration"""
    PROCESSOR = "processor"
    PROVIDER = "provider"
    TERMINATOR = "terminator"
    MEMORY = "memory"
    TRIGGER = "trigger"

class NodeInput:
    """Node input specification"""
    def __init__(self, name: str, description: str = "", required: bool = True, default: Any = None):
        self.name = name
        self.description = description
        self.required = required
        self.default = default

class NodeOutput:
    """Node output specification"""
    def __init__(self, name: str, type: str = "", description: str = ""):
        self.name = name
        self.type = type
        self.description = description

class NodeMetadata:
    """Node metadata container"""
    def __init__(self, name: str = "", description: str = "", category: str = "",
                 node_type: NodeType = NodeType.PROCESSOR, inputs: List[NodeInput] = None,
                 outputs: List[NodeOutput] = None):
        self.name = name
        self.description = description
        self.category = category
        self.node_type = node_type
        self.inputs = inputs or []
        self.outputs = outputs or []

class BaseNode(ABC):
    """Base class for all workflow nodes"""

    def __init__(self):
        self.user_data = {}
        self._metadata = NodeMetadata()

    @property
    def metadata(self) -> NodeMetadata:
        """Get node metadata"""
        return self._metadata

    def execute(self) -> Runnable:
        """Execute the node - must be implemented by subclasses"""
        def default_execution(inputs):
            return {"output": f"Base node executed with {inputs}"}
        return RunnableLambda(default_execution)

'''

    # Determine needed base classes dynamically
    needed_base_classes = set()
    node_mappings = {}

    #if base_class_analysis:
    # Use analysis results if available
    node_categories = base_class_analysis.get("node_categories", {})
    for node_type in required_node_types:
        base_class = node_categories.get(node_type, "BaseNode")
        node_mappings[node_type] = base_class
        needed_base_classes.add(base_class)
    #else:
    #    # Fallback to semantic analysis
    #    from .dynamic_base_class_analyzer import DynamicBaseClassAnalyzer
    #    from pathlib import Path

    #    analyzer = DynamicBaseClassAnalyzer(Path("backend/app"))
    #    for node_type in required_node_types:
    #        base_class = analyzer._analyze_node_semantics(node_type)
    #        node_mappings[node_type] = base_class
    #        needed_base_classes.add(base_class)


    # Dynamic analysis can miss dependencies, so we ensure core classes are always present
    critical_base_classes = {"ProcessorNode", "ProviderNode", "TerminatorNode", "MemoryNode"}
    needed_base_classes.update(critical_base_classes)

    # Generate base classes dynamically based on needed_base_classes
    intermediate_classes = ""
    base_class_configs = {
        "MemoryNode": {
            "category": "Memory",
            "node_type": "NodeType.MEMORY"
        },
        "ProcessorNode": {
            "category": "Processor",
            "node_type": "NodeType.PROCESSOR"
        },
        "ProviderNode": {
            "category": "Provider",
            "node_type": "NodeType.PROVIDER"
        },
        "TerminatorNode": {
            "category": "Terminator",
            "node_type": "NodeType.TERMINATOR"
        }
    }

    for base_class_name, config in base_class_configs.items():
        if base_class_name in needed_base_classes:
            intermediate_classes += f'''
class {base_class_name}(BaseNode):
    """Base class for {config["category"].lower()}-related nodes"""
    def __init__(self):
        super().__init__()
        self._metadata.category = "{config["category"]}"
        self._metadata.node_type = {config["node_type"]}
'''

    # Generate dynamic node type mappings
    dynamic_mappings = ""
    for node_type, base_class in node_mappings.items():
        if base_class != "BaseNode":
            dynamic_mappings += f"{node_type} = {base_class}\n"

    # Generate exports dynamically
    export_list = ["'BaseNode'"] + [f"'{base}'" for base in needed_base_classes if base != "BaseNode"]
    export_list.extend([f"'{node_type}'" for node_type in required_node_types])
    export_list.extend(["'NodeType'", "'NodeInput'", "'NodeOutput'", "'NodeMetadata'"])

    # 🔥 SOLUTION 2.3: Add runtime validation and diagnostics
    validation_code = '''
# 🔥 SOLUTION 2.3: Runtime validation to ensure all critical classes are available
def _validate_critical_classes():
    """Validate that all critical base classes are available at runtime"""
    critical_classes = ['BaseNode', 'ProcessorNode', 'ProviderNode', 'TerminatorNode']
    missing_classes = []

    for class_name in critical_classes:
        if class_name not in globals():
            missing_classes.append(class_name)
            logger.error(f"❌ CRITICAL: Missing base class {class_name}")

    if missing_classes:
        logger.error(f"❌ CRITICAL: Missing base classes: {missing_classes}")
        raise ImportError(f"Critical base classes missing: {missing_classes}")
    else:
        logger.info(f"✅ All critical base classes validated: {critical_classes}")

# Run validation when module loads
try:
    _validate_critical_classes()
except ImportError as e:
    logger.error(f"❌ Base class validation failed: {e}")
    # Emergency fallback - create missing classes
    if 'ProcessorNode' not in globals():
        class ProcessorNode(BaseNode):
            def __init__(self):
                super().__init__()
                self.node_type = "processor"
        logger.warning("🛡️ Emergency fallback: Created ProcessorNode")

    if 'ProviderNode' not in globals():
        class ProviderNode(BaseNode):
            def __init__(self):
                super().__init__()
                self.node_type = "provider"
        logger.warning("🛡️ Emergency fallback: Created ProviderNode")

    if 'TerminatorNode' not in globals():
        class TerminatorNode(BaseNode):
            def __init__(self):
                super().__init__()
                self.node_type = "terminator"
        logger.warning("🛡️ Emergency fallback: Created TerminatorNode")

'''

    template_end = f'''
# Dynamic node type mappings based on workflow requirements
{dynamic_mappings}

{validation_code}

# Export all classes
__all__ = [{', '.join(export_list)}]

logger.info(f"✅ Dynamic nodes module initialized with {{len(__all__)}} exports")
'''

    return template_start + intermediate_classes + template_end


def get_nodes_init_content(required_node_types=None, base_class_analysis=None):
    """Get dynamic nodes/__init__.py content based on requirements"""

    if required_node_types:
        return generate_dynamic_nodes_init(required_node_types, base_class_analysis)
    else:
        # Fallback to minimal template
        return generate_dynamic_nodes_init(["BaseNode"], None)