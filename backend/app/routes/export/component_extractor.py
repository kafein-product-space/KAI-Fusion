# -*- coding: utf-8 -*-
"""Production Component Extractor with Tree Shaking
===================================================

Advanced component extraction system using libcst for surgical code extraction
from KAI-Fusion production components. Implements intelligent tree shaking to
extract only required classes, methods, and dependencies for minimal exports.
"""

import libcst as cst
import libcst.matchers as m
from libcst.metadata import ScopeProvider
from typing import Dict, Set, List, Any, Optional, Tuple
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class ProductionComponentExtractor:
    """Extract production components with intelligent tree shaking"""

    def __init__(self, source_root: Path):
        self.source_root = source_root
        self.parsed_modules: Dict[str, cst.Module] = {}

    def parse_production_sources(self) -> Dict[str, cst.Module]:
        """Parse production source files using libcst

        Returns:
            Dictionary mapping component names to parsed AST modules
        """
        logger.info("📖 Parsing production source components...")

        components = {}

        # Critical production files to parse
        production_files = {
            "engine": "core/engine.py",
            "graph_builder": "core/graph_builder/__init__.py",
            "state": "core/state.py",
            "node_registry": "core/node_registry.py",
            "base_node": "nodes/base.py",
            "connection_mapper": "core/graph_builder/connection_mapper.py",
            "node_executor": "core/graph_builder/node_executor.py",
            "validation": "core/graph_builder/validation.py"
        }

        for component_name, file_path in production_files.items():
            full_path = self.source_root / file_path

            if not full_path.exists():
                logger.warning(f"⚠️ Production file not found: {full_path}")
                continue

            try:
                with open(full_path, 'r', encoding='utf-8') as f:
                    source_code = f.read()

                # Parse with libcst
                module = cst.parse_module(source_code)
                components[component_name] = module

                # Cache parsed module
                self.parsed_modules[component_name] = module

                logger.debug(f"✅ Parsed {component_name}: {len(source_code)} chars")

            except Exception as e:
                logger.error(f"❌ Failed to parse {file_path}: {e}")

        logger.info(f"✅ Parsed {len(components)} production components")
        return components

    def extract_production_engine(self) -> Dict[str, Any]:
        """Extract LangGraphWorkflowEngine with tree shaking"""
        logger.info("🔧 Extracting production workflow engine...")

        engine_file = self.source_root / "core/engine.py"
        if not engine_file.exists():
            logger.error(f"❌ Engine file not found: {engine_file}")
            return {"error": "Engine file not found"}

        try:
            with open(engine_file, 'r', encoding='utf-8') as f:
                source = f.read()

            module = cst.parse_module(source)

            # Extract LangGraphWorkflowEngine class with minimal dependencies
            extractor = EngineExtractor()
            cleaned_module = module.visit(extractor)

            return {
                "module": cleaned_module,
                "engine_class": extractor.extracted_engine,
                "helper_functions": extractor.helper_functions,
                "source_code": cleaned_module.code,
                "extracted_classes": len(extractor.extracted_classes),
                "eliminated_lines": extractor.eliminated_lines
            }

        except Exception as e:
            logger.error(f"❌ Failed to extract engine: {e}")
            return {"error": str(e)}

    def extract_graph_builder(self) -> Dict[str, Any]:
        """Extract GraphBuilder with minimal required methods"""
        logger.info("🔧 Extracting production graph builder...")

        builder_file = self.source_root / "core/graph_builder/__init__.py"
        if not builder_file.exists():
            logger.error(f"❌ GraphBuilder file not found: {builder_file}")
            return {"error": "GraphBuilder file not found"}

        try:
            with open(builder_file, 'r', encoding='utf-8') as f:
                source = f.read()

            module = cst.parse_module(source)

            # Extract GraphBuilder with only required methods
            extractor = GraphBuilderExtractor()
            cleaned_module = module.visit(extractor)

            return {
                "module": cleaned_module,
                "main_class": extractor.main_class,
                "source_code": cleaned_module.code,
                "method_count": len(extractor.kept_methods),
                "eliminated_methods": len(extractor.eliminated_methods)
            }

        except Exception as e:
            logger.error(f"❌ Failed to extract graph builder: {e}")
            return {"error": str(e)}

    def extract_node_implementations(self, required_nodes: List[str]) -> Dict[str, Any]:
        """Extract required node implementations with tree shaking"""
        logger.info(f"🔧 Extracting {len(required_nodes)} node implementations...")

        extracted_nodes = {}

        for node_type in required_nodes:
            try:
                node_file = self._find_node_file(node_type)
                if not node_file:
                    logger.warning(f"⚠️ Source file not found for {node_type}")
                    extracted_nodes[node_type] = self._create_fallback_node(node_type)
                    continue

                with open(node_file, 'r', encoding='utf-8') as f:
                    source = f.read()

                module = cst.parse_module(source)

                # Extract specific node class with tree shaking
                extractor = NodeExtractor(node_type)
                cleaned_module = module.visit(extractor)

                extracted_nodes[node_type] = {
                    "module": cleaned_module,
                    "class_def": extractor.extracted_class,
                    "source_code": cleaned_module.code,
                    "original_size": len(source),
                    "optimized_size": len(cleaned_module.code),
                    "size_reduction": 1 - (len(cleaned_module.code) / len(source))
                }

                logger.debug(f"✅ Extracted {node_type}: {len(cleaned_module.code)} chars")

            except Exception as e:
                logger.error(f"❌ Failed to extract {node_type}: {e}")
                extracted_nodes[node_type] = self._create_fallback_node(node_type)

        total_original = sum(
            node.get("original_size", 0) for node in extracted_nodes.values() if isinstance(node, dict))
        total_optimized = sum(
            node.get("optimized_size", 0) for node in extracted_nodes.values() if isinstance(node, dict))

        logger.info(f"✅ Node extraction completed")
        logger.info(f"📊 Size reduction: {((total_original - total_optimized) / total_original * 100):.1f}%")

        return extracted_nodes

    def _find_node_file(self, node_type: str) -> Optional[Path]:
        """Find source file for a node type"""

        # Common node locations to search
        search_paths = [
            self.source_root / "nodes" / f"{node_type.lower()}.py",
            self.source_root / "nodes" / f"{node_type.lower()}_node.py",
            self.source_root / "nodes" / "llms" / f"{node_type.lower()}.py",
            self.source_root / "nodes" / "agents" / f"{node_type.lower()}.py",
            self.source_root / "nodes" / "tools" / f"{node_type.lower()}.py",
            self.source_root / "nodes" / "default" / f"{node_type.lower()}.py",
        ]

        # Try to find using node registry
        try:
            from app.core.node_registry import node_registry
            if not node_registry.nodes:
                node_registry.discover_nodes()

            node_class = node_registry.get_node(node_type)
            if node_class:
                import inspect
                return Path(inspect.getfile(node_class))
        except Exception as e:
            logger.debug(f"Could not get from registry: {e}")

        # Search in common locations
        for search_path in search_paths:
            if search_path.exists():
                return search_path

        # Recursive search in nodes directory
        nodes_dir = self.source_root / "nodes"
        if nodes_dir.exists():
            for file_path in nodes_dir.rglob("*.py"):
                if node_type.lower() in file_path.name.lower():
                    return file_path

        return None

    def _create_fallback_node(self, node_type: str) -> Dict[str, Any]:
        """Create fallback node implementation when extraction fails"""

        # Use dynamic base class analysis instead of hardcoded patterns
        try:
            from .dynamic_base_class_analyzer import create_dynamic_base_class_extractor

            analyzer = create_dynamic_base_class_extractor(self.source_root)
            analysis_result = analyzer.analyze_inheritance_patterns()
            base_class = analyzer.determine_base_class_for_node(node_type)

            logger.info(f"🔍 Dynamic analysis determined {node_type} -> {base_class}")

        except Exception as e:
            logger.warning(f"⚠️ Dynamic analysis failed for {node_type}, using semantic fallback: {e}")
            base_class = self._semantic_base_class_analysis(node_type)

        fallback_code = f'''# -*- coding: utf-8 -*-
"""Fallback {node_type} Node - Generated for export"""

from nodes import {base_class}, NodeInput, NodeOutput
from typing import Dict, Any
from langchain_core.runnables import RunnableLambda

class {node_type}({base_class}):
    """Fallback implementation for {node_type}"""

    def __init__(self):
        super().__init__()
        self._metadata = {{
            "name": "{node_type}",
            "description": "Fallback implementation for {node_type} node",
            "category": "Fallback",
            "inputs": [
                NodeInput(
                    name="input",
                    description="Input data to process"
                )
            ],
            "outputs": [
                NodeOutput(
                    name="output",
                    description="Processed output"
                )
            ]
        }}

    def execute(self, **kwargs):
        def fallback_exec(input_data):
            return {{
                "output": f"{node_type} fallback executed with: {{input_data}}",
                "node_type": "{node_type}",
                "fallback": True
            }}

        return RunnableLambda(fallback_exec)

# Export the node class
__all__ = ['{node_type}']
'''

        return {
            "source_code": fallback_code,
            "fallback": True,
            "base_class": base_class,
            "analysis_method": "dynamic" if hasattr(self, '_used_dynamic_analysis') else "semantic",
            "original_size": 0,
            "optimized_size": len(fallback_code),
            "size_reduction": 0
        }

    def _semantic_base_class_analysis(self, node_type: str) -> str:
        """Perform semantic analysis when dynamic analysis is not available"""

        # This is a more flexible semantic analysis without hardcoded mappings
        node_lower = node_type.lower()

        # Analyze semantic indicators
        semantic_indicators = {
            'provider': ['api', 'service', 'client', 'model', 'llm', 'embeddings', 'retriever', 'search'],
            'processor': ['agent', 'chain', 'transform', 'process', 'analyze', 'parse', 'filter'],
            'memory': ['memory', 'buffer', 'store', 'cache', 'history', 'conversation'],
            'terminator': ['end', 'final', 'output', 'result', 'finish', 'complete']
        }

        # Calculate semantic scores
        category_scores = {}
        for category, indicators in semantic_indicators.items():
            score = sum(1 for indicator in indicators if indicator in node_lower)
            if score > 0:
                category_scores[category] = score

        # Map to base class
        if category_scores:
            best_category = max(category_scores.items(), key=lambda x: x[1])[0]
            category_mapping = {
                'provider': 'ProviderNode',
                'processor': 'ProcessorNode',
                'memory': 'MemoryNode',
                'terminator': 'TerminatorNode'
            }
            return category_mapping.get(best_category, 'BaseNode')

        return 'BaseNode'


class EngineExtractor(cst.CSTTransformer):
    """Extract LangGraphWorkflowEngine with minimal dependencies"""

    def __init__(self):
        self.extracted_engine = None
        self.helper_functions = []
        self.extracted_classes = []
        self.eliminated_lines = 0

        # Required methods for minimal engine
        self.required_methods = {
            "__init__", "validate", "build", "execute",
            "_create_minimal_fallback_registry"
        }

        # Helper functions to keep
        self.required_functions = {
            "get_engine", "_create_minimal_fallback_registry"
        }

    def leave_ClassDef(self, original_node: cst.ClassDef, updated_node: cst.ClassDef) -> cst.ClassDef:
        """Extract only required classes"""

        class_name = updated_node.name.value

        if class_name == "LangGraphWorkflowEngine":
            # Keep the main engine class but minimize it
            minimized_class = self._minimize_engine_class(updated_node)
            self.extracted_engine = minimized_class
            self.extracted_classes.append(class_name)
            return minimized_class

        elif class_name in ["BaseWorkflowEngine", "StubWorkflowEngine"]:
            # Keep base classes
            self.extracted_classes.append(class_name)
            return updated_node

        else:
            # Remove other classes
            self.eliminated_lines += self._count_lines(original_node)
            return cst.RemovalSentinel.REMOVE

    def leave_FunctionDef(self, original_node: cst.FunctionDef, updated_node: cst.FunctionDef) -> cst.FunctionDef:
        """Keep only required helper functions"""

        func_name = updated_node.name.value

        if func_name in self.required_functions:
            self.helper_functions.append(updated_node)
            return updated_node
        else:
            # Remove unnecessary functions
            self.eliminated_lines += self._count_lines(original_node)
            return cst.RemovalSentinel.REMOVE

    def _minimize_engine_class(self, class_node: cst.ClassDef) -> cst.ClassDef:
        """Minimize engine class to only essential methods"""

        minimal_methods = []

        for stmt in class_node.body.body:
            if isinstance(stmt, cst.FunctionDef):
                method_name = stmt.name.value
                if method_name in self.required_methods:
                    minimal_methods.append(stmt)
                else:
                    self.eliminated_lines += self._count_lines(stmt)
            elif isinstance(stmt, cst.SimpleStatementLine):
                # Keep class attributes and simple statements
                minimal_methods.append(stmt)

        # Create minimized class body
        minimal_body = cst.IndentedBlock(body=minimal_methods)
        return class_node.with_changes(body=minimal_body)

    def _count_lines(self, node: cst.CSTNode) -> int:
        """Estimate line count for a node"""
        return len(str(node).split('\n'))


class GraphBuilderExtractor(cst.CSTTransformer):
    """Extract GraphBuilder with only essential methods"""

    def __init__(self):
        self.main_class = None
        self.kept_methods = []
        self.eliminated_methods = []

        # Essential methods for workflow execution
        self.required_methods = {
            "__init__", "build_from_flow", "execute",
            "_compile_final_graph", "_wrap_node_enhanced",
            "_add_regular_edges", "_create_start_node"
        }

    def leave_ClassDef(self, original_node: cst.ClassDef, updated_node: cst.ClassDef) -> cst.ClassDef:
        """Extract GraphBuilder class with minimal methods"""

        if updated_node.name.value == "GraphBuilder":
            minimal_class = self._minimize_graph_builder(updated_node)
            self.main_class = minimal_class
            return minimal_class
        else:
            # Remove other classes
            return cst.RemovalSentinel.REMOVE

    def _minimize_graph_builder(self, class_def: cst.ClassDef) -> cst.ClassDef:
        """Minimize GraphBuilder to essential functionality"""

        essential_methods = []

        for stmt in class_def.body.body:
            if isinstance(stmt, cst.FunctionDef):
                method_name = stmt.name.value
                if method_name in self.required_methods:
                    essential_methods.append(stmt)
                    self.kept_methods.append(method_name)
                else:
                    self.eliminated_methods.append(method_name)
            elif isinstance(stmt, cst.SimpleStatementLine):
                # Keep class attributes
                essential_methods.append(stmt)

        # Create minimal class body
        minimal_body = cst.IndentedBlock(body=essential_methods)
        return class_def.with_changes(body=minimal_body)


class NodeExtractor(cst.CSTTransformer):
    """Extract specific node class with tree shaking"""

    def __init__(self, target_node: str):
        self.target_node = target_node
        self.extracted_class = None

    def leave_ClassDef(self, original_node: cst.ClassDef, updated_node: cst.ClassDef) -> cst.ClassDef:
        """Extract only the target node class"""

        class_name = updated_node.name.value

        # Match various naming patterns
        possible_names = [
            self.target_node,
            f"{self.target_node}Node",
            f"{self.target_node}_Node",
            self.target_node.replace("Node", "")
        ]

        if class_name in possible_names:
            self.extracted_class = updated_node
            return updated_node
        else:
            # Remove other classes
            return cst.RemovalSentinel.REMOVE

    def leave_FunctionDef(self, original_node: cst.FunctionDef, updated_node: cst.FunctionDef) -> cst.FunctionDef:
        """Remove module-level functions not needed"""
        # Remove unless it's a helper function that might be needed
        func_name = updated_node.name.value
        if func_name.startswith('_') or func_name in ['create_', 'get_', 'setup_']:
            return updated_node
        else:
            return cst.RemovalSentinel.REMOVE


# Export main classes
__all__ = ["ProductionComponentExtractor", "EngineExtractor", "GraphBuilderExtractor"]