import importlib
import inspect
from pathlib import Path
from typing import Dict, Type
from app.nodes.base import BaseNode

NODE_TYPE_MAP: Dict[str, Type[BaseNode]] = {}

def discover_nodes():
    """Scan the `nodes` folder and find all classes derived from BaseNode."""
    if NODE_TYPE_MAP:  # Run only once
        return

    nodes_dir = Path(__file__).parent.parent / "nodes"
    for path in nodes_dir.rglob("*.py"):  # Scan all subfolders
        if path.name == "__init__.py" or path.name == "base.py":
            continue

        # Convert file path to Python import path (e.g. app.nodes.llm.openai_node)
        rel_path = path.relative_to(nodes_dir.parent.parent)
        parts = list(rel_path.parts)
        if parts[-1].endswith('.py'):
            parts[-1] = parts[-1][:-3]  # Remove .py extension correctly
        if parts[0] == "app":
            module_path = ".".join(parts)  # already starts with app
        else:
            module_path = "app." + ".".join(parts)
        
        try:
            module = importlib.import_module(module_path)
            for name, obj in inspect.getmembers(module, inspect.isclass):
                if (issubclass(obj, BaseNode) and 
                    obj.__name__ not in {"BaseNode", "ProviderNode", "ProcessorNode", "TerminatorNode"} and 
                    not inspect.isabstract(obj)):
                    # Get name from class metadata
                    try:
                        instance = obj()
                        node_id = instance.metadata.name if hasattr(instance, 'metadata') else None
                        if not node_id:
                            continue
                        NODE_TYPE_MAP[node_id] = obj
                        print(f"Discovered Node: {node_id} -> {obj.__name__}")
                    except Exception as e:
                        print(f"Error instantiating node {obj.__name__}: {e}")
        except Exception as e:
            print(f"Error discovering node in {path}: {e}")

    # --------------------------------------------------
    # Legacy / alias mappings so that older frontend
    # node type strings still resolve to the new classes
    # --------------------------------------------------
    from app import nodes as _nodes_pkg  # noqa: WPS433 – runtime import ok

    alias_map = {
        "BufferMemory": getattr(_nodes_pkg, "ConversationMemoryNode", None),
        "GoogleSearch": getattr(_nodes_pkg, "GoogleSearchToolNode", None),
        "Wikipedia": getattr(_nodes_pkg, "WikipediaToolNode", None),
        "Calculator": getattr(_nodes_pkg, "CalculatorNode", None),
        "ReactAgentPrompt": getattr(_nodes_pkg, "AgentPromptNode", None),
        "LLMChain": getattr(_nodes_pkg, "LLMChainNode", None),
    }

    for alias, cls in alias_map.items():
        if cls is not None:
            NODE_TYPE_MAP[alias] = cls

def get_node_class(node_type: str) -> Type[BaseNode]:
    """Return the class corresponding to the given node type."""
    if not NODE_TYPE_MAP:
        discover_nodes()
    
    node_class = NODE_TYPE_MAP.get(node_type)
    if not node_class:
        raise ValueError(f"Unknown node type: {node_type}")
    return node_class

def get_registry() -> Dict[str, Type[BaseNode]]:
    """Returns the node registry (node type map)"""
    if not NODE_TYPE_MAP:
        discover_nodes()
    return NODE_TYPE_MAP.copy()
