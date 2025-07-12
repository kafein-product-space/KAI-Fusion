"""
DEPRECATED: Legacy node discovery system.

This module is deprecated and should not be used in new code.
Use app.core.node_registry instead for standardized node discovery.

This file is kept for backward compatibility only.
"""

import warnings
import importlib
import inspect
from pathlib import Path
from typing import Dict, Type
from app.nodes.base import BaseNode

# Deprecated - use app.core.node_registry instead
NODE_TYPE_MAP: Dict[str, Type[BaseNode]] = {}

def discover_nodes():
    """DEPRECATED: Use app.core.node_registry.discover_nodes() instead."""
    warnings.warn(
        "node_discovery.discover_nodes() is deprecated. "
        "Use app.core.node_registry.node_registry.discover_nodes() instead.",
        DeprecationWarning,
        stacklevel=2
    )
    
    # Return empty to prevent usage
    return

def get_node_class(node_type: str) -> Type[BaseNode]:
    """DEPRECATED: Use app.core.node_registry.node_registry.get_node() instead."""
    warnings.warn(
        "node_discovery.get_node_class() is deprecated. "
        "Use app.core.node_registry.node_registry.get_node() instead.",
        DeprecationWarning,
        stacklevel=2
    )
    
    # Fallback to new system
    from app.core.node_registry import node_registry
    node_class = node_registry.get_node(node_type)
    if not node_class:
        raise ValueError(f"Unknown node type: {node_type}")
    return node_class

def get_registry() -> Dict[str, Type[BaseNode]]:
    """DEPRECATED: Use app.core.node_registry.node_registry.nodes instead."""
    warnings.warn(
        "node_discovery.get_registry() is deprecated. "
        "Use app.core.node_registry.node_registry.nodes instead.",
        DeprecationWarning,
        stacklevel=2
    )
    
    # Fallback to new system
    from app.core.node_registry import node_registry
    return node_registry.nodes.copy()
