# -*- coding: utf-8 -*-
"""AST Workflow Analyzer for Dynamic Export System
==================================================

Libcst-powered workflow requirements analysis for KAI-Fusion exports.
Analyzes workflows to determine exact node dependencies, required components,
and optimization targets for minimal package generation.
"""

import libcst as cst
import logging
from typing import Dict, Any, List, Set, Optional
from pathlib import Path
from dataclasses import dataclass

from app.core.node_registry import node_registry

logger = logging.getLogger(__name__)


@dataclass
class WorkflowAnalysisResult:
    """Comprehensive workflow analysis results"""
    workflow_id: str
    node_types: List[str]
    node_dependencies: Dict[str, Dict[str, Any]]
    complexity_metrics: Dict[str, Any]
    required_components: Set[str]
    optimization_targets: List[str]
    dependency_graph: Dict[str, Set[str]]


class LibcstWorkflowAnalyzer:
    """Libcst-powered workflow requirements analysis"""

    def __init__(self):
        self.source_root = Path("backend/app")
        self.node_source_cache: Dict[str, str] = {}

    def analyze_workflow_requirements(self, workflow_data: Dict[str, Any]) -> WorkflowAnalysisResult:
        """Main workflow analysis function

        Args:
            workflow_data: Workflow definition with nodes and edges

        Returns:
            Comprehensive analysis results
        """
        logger.info("🔍 Starting workflow requirements analysis")

        nodes = workflow_data.get("nodes", [])
        edges = workflow_data.get("edges", [])
        workflow_id = workflow_data.get("id", f"wf_{hash(str(workflow_data))}")

        # 1. Extract node types from workflow
        node_types = self._extract_node_types(nodes)
        logger.info(f"📝 Found {len(node_types)} unique node types: {node_types}")

        # 2. Analyze each node type for dependencies
        node_dependencies = {}
        for node_type in node_types:
            deps = self.analyze_node_dependencies(node_type)
            node_dependencies[node_type] = deps

        # 3. Calculate graph complexity metrics
        complexity_metrics = self.analyze_graph_complexity(nodes, edges)

        # 4. Determine required components
        required_components = self.calculate_required_components(node_types)

        # 5. Identify optimization targets
        optimization_targets = self.identify_optimization_targets(node_dependencies)

        # 6. Build dependency graph
        dependency_graph = self._build_dependency_graph(node_dependencies)

        result = WorkflowAnalysisResult(
            workflow_id=workflow_id,
            node_types=node_types,
            node_dependencies=node_dependencies,
            complexity_metrics=complexity_metrics,
            required_components=required_components,
            optimization_targets=optimization_targets,
            dependency_graph=dependency_graph
        )

        logger.info(f"✅ Workflow analysis completed")
        logger.info(f"📊 Required components: {len(required_components)}")
        logger.info(f"🎯 Optimization targets: {len(optimization_targets)}")

        return result

    def _extract_node_types(self, nodes: List[Dict[str, Any]]) -> List[str]:
        """Extract unique node types from workflow nodes"""
        node_types = []
        for node in nodes:
            node_type = node.get("type")
            if node_type and node_type not in node_types:
                node_types.append(node_type)
        return node_types

    def analyze_node_dependencies(self, node_type: str) -> Dict[str, Any]:
        """Analyze specific node type's dependencies using libcst

        Args:
            node_type: The node type to analyze (e.g., "ReactAgent", "OpenAI")

        Returns:
            Comprehensive dependency analysis
        """
        logger.debug(f"🔍 Analyzing dependencies for {node_type}")

        try:
            # Find node source file
            node_file = self._find_node_source_file(node_type)
            if not node_file:
                logger.warning(f"⚠️ Source file not found for {node_type}")
                return self._create_fallback_analysis(node_type)

            # Get source code
            source_code = self._get_node_source(node_file)
            if not source_code:
                logger.warning(f"⚠️ Could not read source for {node_type}")
                return self._create_fallback_analysis(node_type)

            # Parse with libcst
            try:
                module = cst.parse_module(source_code)
            except Exception as e:
                logger.error(f"❌ Failed to parse {node_type} with libcst: {e}")
                return self._create_fallback_analysis(node_type)

            # Analyze dependencies using AST visitor
            analyzer = NodeDependencyAnalyzer()
            module.visit(analyzer)

            return {
                "node_type": node_type,
                "source_file": str(node_file),
                "imports": analyzer.imports,
                "base_classes": analyzer.base_classes,
                "external_calls": analyzer.external_calls,
                "langchain_dependencies": analyzer.langchain_dependencies,
                "required_packages": analyzer.required_packages,
                "complexity_score": self._calculate_node_complexity(analyzer),
                "optimization_potential": self._assess_optimization_potential(analyzer)
            }

        except Exception as e:
            logger.error(f"❌ Failed to analyze {node_type}: {e}")
            return self._create_fallback_analysis(node_type)

    def _find_node_source_file(self, node_type: str) -> Optional[Path]:
        """Find the source file for a given node type"""

        # Initialize node registry if needed
        if not node_registry.nodes:
            node_registry.discover_nodes()

        # Try to get node from registry
        node_class = node_registry.get_node(node_type)
        if not node_class:
            logger.warning(f"⚠️ Node {node_type} not found in registry")
            return None

        try:
            import inspect
            source_file = inspect.getfile(node_class)
            return Path(source_file)
        except Exception as e:
            logger.error(f"❌ Could not get source file for {node_type}: {e}")
            return None

    def _get_node_source(self, file_path: Path) -> Optional[str]:
        """Get source code from file with caching"""

        file_str = str(file_path)
        if file_str in self.node_source_cache:
            return self.node_source_cache[file_str]

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                source = f.read()
                self.node_source_cache[file_str] = source
                return source
        except Exception as e:
            logger.error(f"❌ Could not read source file {file_path}: {e}")
            return None

    def analyze_graph_complexity(self, nodes: List[Dict], edges: List[Dict]) -> Dict[str, Any]:
        """Analyze workflow graph complexity metrics"""

        node_count = len(nodes)
        edge_count = len(edges)

        # Calculate connectivity metrics
        node_ids = {node.get("id") for node in nodes}
        connected_nodes = set()

        for edge in edges:
            source = edge.get("source")
            target = edge.get("target")
            if source and target:
                connected_nodes.add(source)
                connected_nodes.add(target)

        connectivity_ratio = len(connected_nodes) / node_count if node_count > 0 else 0

        # Complexity scoring
        complexity_score = self._calculate_complexity_score(node_count, edge_count, connectivity_ratio)

        return {
            "node_count": node_count,
            "edge_count": edge_count,
            "connectivity_ratio": connectivity_ratio,
            "complexity_score": complexity_score,
            "complexity_level": self._get_complexity_level(complexity_score),
            "optimization_priority": self._get_optimization_priority(complexity_score)
        }

    def calculate_required_components(self, node_types: List[str]) -> Set[str]:
        """Calculate required production components based on node types"""

        components = set()

        # Core components always required
        components.update([
            "LangGraphWorkflowEngine", "GraphBuilder", "FlowState",
            "NodeRegistry", "BaseNode", "NodeExecutor"
        ])

        # Node-specific component requirements
        for node_type in node_types:
            # Base node classes
            if any(keyword in node_type.lower() for keyword in ["chat", "llm", "openai", "cohere"]):
                components.add("ProviderNode")
                components.add("BaseLanguageModel")
            elif any(keyword in node_type.lower() for keyword in ["agent", "react", "processor"]):
                components.add("ProcessorNode")
                components.add("AgentExecutor")
            elif any(keyword in node_type.lower() for keyword in ["end", "output", "terminator"]):
                components.add("TerminatorNode")
                components.add("OutputParser")
            elif any(keyword in node_type.lower() for keyword in ["memory", "buffer", "conversation"]):
                components.add("MemoryNode")
                components.add("ConversationMemory")

            # Specific node implementations
            components.add(f"{node_type}Node")

        return components

    def identify_optimization_targets(self, node_dependencies: Dict[str, Dict[str, Any]]) -> List[str]:
        """Identify components that can be optimized or eliminated"""

        targets = []

        for node_type, deps in node_dependencies.items():
            # Check for heavy dependencies that might be optimizable
            imports = deps.get("imports", [])
            complexity = deps.get("complexity_score", 0)

            # Target nodes with many imports but low actual usage
            if len(imports) > 10 and complexity < 5:
                targets.append(f"dead_imports_{node_type}")

            # Target nodes with complex inheritance that could be flattened
            base_classes = deps.get("base_classes", [])
            if len(base_classes) > 2:
                targets.append(f"inheritance_optimization_{node_type}")

            # Target nodes with many external calls that could be inlined
            external_calls = deps.get("external_calls", [])
            if len(external_calls) > 15:
                targets.append(f"inline_optimization_{node_type}")

        return targets

    def _build_dependency_graph(self, node_dependencies: Dict[str, Dict[str, Any]]) -> Dict[str, Set[str]]:
        """Build dependency graph between components"""

        graph = {}

        for node_type, deps in node_dependencies.items():
            node_deps = set()

            # Add base class dependencies
            for base_class in deps.get("base_classes", []):
                node_deps.add(base_class)

            # Add import dependencies
            for import_name in deps.get("imports", []):
                if any(lc_dep in import_name for lc_dep in ["langchain", "langgraph"]):
                    node_deps.add(import_name)

            graph[node_type] = node_deps

        return graph

    def _create_fallback_analysis(self, node_type: str) -> Dict[str, Any]:
        """Create fallback analysis when AST parsing fails"""
        return {
            "node_type": node_type,
            "source_file": "unknown",
            "imports": ["langchain_core"],
            "base_classes": ["BaseNode"],
            "external_calls": [],
            "langchain_dependencies": ["langchain_core"],
            "required_packages": ["langchain_core"],
            "complexity_score": 1,
            "optimization_potential": "unknown",
            "fallback": True
        }

    def _calculate_node_complexity(self, analyzer) -> int:
        """Calculate complexity score for a node based on AST analysis"""
        score = 0
        score += len(analyzer.imports) * 0.5
        score += len(analyzer.base_classes) * 2
        score += len(analyzer.external_calls) * 0.3
        score += len(analyzer.langchain_dependencies) * 1.5
        return int(score)

    def _assess_optimization_potential(self, analyzer) -> str:
        """Assess optimization potential based on analysis"""
        import_count = len(analyzer.imports)
        call_count = len(analyzer.external_calls)

        if import_count > 15 or call_count > 20:
            return "high"
        elif import_count > 8 or call_count > 10:
            return "medium"
        else:
            return "low"

    def _calculate_complexity_score(self, nodes: int, edges: int, connectivity: float) -> float:
        """Calculate overall workflow complexity score"""
        return (nodes * 1.0) + (edges * 1.5) + (connectivity * 2.0)

    def _get_complexity_level(self, score: float) -> str:
        """Get complexity level from score"""
        if score > 20:
            return "high"
        elif score > 10:
            return "medium"
        else:
            return "low"

    def _get_optimization_priority(self, score: float) -> str:
        """Get optimization priority from complexity"""
        if score > 15:
            return "high"
        elif score > 8:
            return "medium"
        else:
            return "low"


class NodeDependencyAnalyzer(cst.CSTVisitor):
    """libcst visitor for analyzing node dependencies"""

    def __init__(self):
        self.imports: List[str] = []
        self.base_classes: List[str] = []
        self.external_calls: List[str] = []
        self.langchain_dependencies: List[str] = []
        self.required_packages: List[str] = []

    def visit_ImportFrom(self, node: cst.ImportFrom) -> None:
        """Visit import from statements"""
        if node.module:
            module_name = self._get_full_name(node.module)
            self.imports.append(module_name)

            # Track LangChain dependencies
            if "langchain" in module_name:
                self.langchain_dependencies.append(module_name)

            # Map to required packages
            package = self._map_import_to_package(module_name)
            if package and package not in self.required_packages:
                self.required_packages.append(package)

    def visit_Import(self, node: cst.Import) -> None:
        """Visit import statements"""
        for alias in node.names:
            if isinstance(alias, cst.ImportAlias):
                name = self._get_full_name(alias.name)
                self.imports.append(name)

    def visit_ClassDef(self, node: cst.ClassDef) -> None:
        """Visit class definitions to find base classes"""
        if node.bases:
            for base in node.bases:
                if isinstance(base, cst.Arg) and isinstance(base.value, cst.Name):
                    self.base_classes.append(base.value.value)

    def visit_Call(self, node: cst.Call) -> None:
        """Visit function calls to track external dependencies"""
        if isinstance(node.func, cst.Attribute):
            call_name = self._get_full_name(node.func)
            self.external_calls.append(call_name)

    def _get_full_name(self, node) -> str:
        """Get full name from various AST node types"""
        if isinstance(node, cst.Attribute):
            parts = []
            current = node
            while isinstance(current, cst.Attribute):
                parts.append(current.attr.value)
                current = current.value
            if isinstance(current, cst.Name):
                parts.append(current.value)
            parts.reverse()
            return ".".join(parts)
        elif isinstance(node, cst.Name):
            return node.value
        else:
            return str(node)

    def _map_import_to_package(self, import_name: str) -> Optional[str]:
        """Map import name to required package"""
        mapping = {
            "langchain_openai": "langchain-openai>=0.3.0",
            "langchain_tavily": "langchain-tavily>=0.2.0",
            "langchain_cohere": "langchain-cohere>=0.4.0",
            "langchain_community": "langchain-community>=0.3.0",
            "langchain_core": "langchain-core>=0.3.0",
            "langchain": "langchain>=0.3.0",
            "langgraph": "langgraph>=0.6.0",
            "sqlalchemy": "sqlalchemy>=2.0.0",
            "fastapi": "fastapi>=0.104.0",
            "pydantic": "pydantic>=2.5.0",
            "requests": "requests>=2.32.0"
        }

        for key, package in mapping.items():
            if key in import_name:
                return package

        return None


# Export main classes
__all__ = ["LibcstWorkflowAnalyzer", "WorkflowAnalysisResult", "NodeDependencyAnalyzer"]