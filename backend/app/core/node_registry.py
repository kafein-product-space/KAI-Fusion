from typing import Dict, Type, List, Optional
from app.nodes.base import BaseNode
from app.nodes.base import NodeMetadata
import importlib
import inspect
import os
from pathlib import Path

class NodeRegistry:
    """Registry for all available nodes"""
    
    def __init__(self):
        self.nodes: Dict[str, Type[BaseNode]] = {}
        self.node_configs: Dict[str, NodeMetadata] = {}
    
    def register_node(self, node_class: Type[BaseNode]):
        """Register a node class if it provides valid metadata."""
        try:
            metadata = node_class().metadata
            # Basic validation – ensure required fields are present
            if not metadata.name or not metadata.description:
                # Skip base/abstract-like classes that don't define required metadata
                return

            self.nodes[metadata.name] = node_class
            self.node_configs[metadata.name] = metadata
            # Also register by class name (for convenience) if different
            if metadata.name != node_class.__name__:
                self.nodes[node_class.__name__] = node_class
            print(f"✅ Registered node: {metadata.name}")
        except Exception as e:  # noqa: BLE001
            # Skip nodes that cannot be instantiated (likely abstract bases)
            print(f"⚠️  Skipping node {node_class.__name__}: {e}")
    
    def get_node(self, node_name: str) -> Optional[Type[BaseNode]]:
        """Get a node class by name"""
        return self.nodes.get(node_name)
    
    def get_all_nodes(self) -> List[NodeMetadata]:
        """Get all available node configurations"""
        return list(self.node_configs.values())
    
    def get_nodes_by_category(self, category: str) -> List[NodeMetadata]:
        """Get nodes filtered by category"""
        return [
            config for config in self.node_configs.values()
            if config.category == category
        ]
    
    def discover_nodes(self):
        """Discover and register all nodes in the nodes directory"""
        nodes_dir = Path("app/nodes").resolve()
        
        if not nodes_dir.exists():
            print(f"⚠️ Nodes directory not found: {nodes_dir}")
            return
        
        # Walk through all subdirectories
        for root, dirs, files in os.walk(nodes_dir):
            # Skip __pycache__ directories
            dirs[:] = [d for d in dirs if d != '__pycache__']
            
            for file in files:
                if file.endswith('.py') and file != '__init__.py' and file != 'base.py':
                    # Convert file path to module path
                    file_path = Path(root) / file
                    
                    # Calculate relative path from project root
                    try:
                        relative_path = file_path.relative_to(Path.cwd())
                        module_path = str(relative_path).replace('/', '.').replace('\\', '.')[:-3]
                    except ValueError:
                        # If relative_to fails, construct module path manually
                        parts = file_path.parts
                        # Find 'app' in the path and build module path from there
                        try:
                            app_index = parts.index('app')
                            module_parts = parts[app_index:]
                            if module_parts[-1].endswith('.py'):
                                module_parts = module_parts[:-1] + (module_parts[-1][:-3],)
                            module_path = '.'.join(module_parts)
                        except ValueError:
                            print(f"⚠️ Could not determine module path for {file_path}")
                            continue
                    
                    try:
                        # Import the module
                        module = importlib.import_module(module_path)
                        
                        # Find all BaseNode subclasses
                        for name, obj in inspect.getmembers(module):
                            if (inspect.isclass(obj) and 
                                issubclass(obj, BaseNode) and 
                                obj != BaseNode and not inspect.isabstract(obj)):
                                self.register_node(obj)
                                
                    except Exception as e:
                        print(f"❌ Error loading node from {module_path}: {e}")
    
    def clear(self):
        """Clear all registered nodes"""
        self.nodes.clear()
        self.node_configs.clear()

# Global node registry instance
node_registry = NodeRegistry()
