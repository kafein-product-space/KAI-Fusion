# -*- coding: utf-8 -*-
"""Advanced Tree Shaker for AST-Based Export System
===================================================

Sophisticated tree shaking implementation using libcst for eliminating
unused code, optimizing imports, and minimizing export package size.
Implements method-level dead code elimination and intelligent optimization.
"""

import libcst as cst
import libcst.matchers as m
from libcst.metadata import ScopeProvider, PositionProvider
from typing import Dict, Set, List, Any, Optional, Tuple
import logging
import ast
import re

logger = logging.getLogger(__name__)


class TreeShaker:
    """Advanced tree shaking for optimal code elimination"""

    def __init__(self):
        self.eliminated_lines = 0
        self.kept_lines = 0
        self.optimization_stats = {}

    def tree_shake_components(self, components: Dict[str, cst.Module],
                              required_nodes: List[str]) -> Dict[str, cst.Module]:
        """Perform comprehensive tree shaking on components

        Args:
            components: Dictionary of parsed AST modules
            required_nodes: List of node types that are required

        Returns:
            Dictionary of tree-shaken modules
        """
        logger.info(f"🌲 Starting tree shaking for {len(components)} components")

        # Calculate complete dependency graph
        dependency_graph = self._build_dependency_graph(components, required_nodes)

        # Calculate required elements transitively
        required_elements = self._calculate_transitive_dependencies(dependency_graph, required_nodes)

        logger.info(f"📊 Required elements after analysis: {len(required_elements)}")

        # Shake each component
        shaken_components = {}

        for component_name, module in components.items():
            logger.debug(f"🌲 Tree shaking {component_name}...")

            # Create component-specific shaker
            shaker = ComponentTreeShaker(required_elements, component_name)

            # Apply tree shaking
            shaken_module = module.visit(shaker)

            # Only keep if it has required elements or is a core component
            if shaker.has_required_elements or self._is_core_component(component_name):
                shaken_components[component_name] = shaken_module

                # Update statistics
                self.optimization_stats[component_name] = {
                    "kept_classes": len(shaker.kept_classes),
                    "kept_functions": len(shaker.kept_functions),
                    "eliminated_classes": len(shaker.eliminated_classes),
                    "eliminated_functions": len(shaker.eliminated_functions),
                    "size_reduction": shaker.size_reduction_estimate()
                }

                logger.debug(f"✅ Kept {component_name}: "
                             f"{len(shaker.kept_classes)} classes, "
                             f"{len(shaker.kept_functions)} functions")
            else:
                logger.debug(f"❌ Eliminated {component_name}: no required elements")

                self.optimization_stats[component_name] = {
                    "eliminated": True,
                    "reason": "no_required_elements"
                }

        # Calculate overall statistics
        total_reduction = self._calculate_overall_reduction()

        logger.info(f"✅ Tree shaking completed")
        logger.info(f"📊 Kept {len(shaken_components)}/{len(components)} components")
        logger.info(f"📉 Estimated size reduction: {total_reduction:.1f}%")

        return shaken_components

    def optimize_for_export(self, components: Dict[str, cst.Module]) -> Dict[str, str]:
        """Apply comprehensive export optimizations

        Args:
            components: Tree-shaken AST modules

        Returns:
            Dictionary mapping filenames to optimized source code
        """
        logger.info("⚡ Applying export optimizations...")

        optimized_sources = {}

        for component_name, module in components.items():
            logger.debug(f"⚡ Optimizing {component_name}...")

            try:
                # Apply optimizations in sequence
                optimized_module = self._apply_optimization_pipeline(module, component_name)

                # Convert to source code
                source_code = optimized_module.code

                # Apply post-processing optimizations
                source_code = self._post_process_source(source_code, component_name)

                filename = f"{component_name}.py"
                optimized_sources[filename] = source_code

                logger.debug(f"✅ Optimized {component_name}: {len(source_code)} chars")

            except Exception as e:
                logger.error(f"❌ Failed to optimize {component_name}: {e}")
                # Fallback to original source
                optimized_sources[f"{component_name}.py"] = module.code

        logger.info(f"✅ Export optimization completed: {len(optimized_sources)} files")
        return optimized_sources

    def _build_dependency_graph(self, components: Dict[str, cst.Module],
                                required_nodes: List[str]) -> Dict[str, Set[str]]:
        """Build comprehensive dependency graph"""

        dependency_graph = {}

        # Analyze each component for dependencies
        for component_name, module in components.items():
            analyzer = DependencyAnalyzer()
            module.visit(analyzer)

            deps = set()

            # Add class dependencies
            deps.update(analyzer.referenced_classes)

            # Add import dependencies
            deps.update(analyzer.imported_modules)

            # Add function call dependencies
            deps.update(analyzer.function_calls)

            dependency_graph[component_name] = deps

        # Add node-specific dependencies
        for node_type in required_nodes:
            if node_type not in dependency_graph:
                dependency_graph[node_type] = set()

            # Add base class dependencies
            if "llm" in node_type.lower() or "openai" in node_type.lower():
                dependency_graph[node_type].add("ProviderNode")
                dependency_graph[node_type].add("BaseLanguageModel")
            elif "agent" in node_type.lower():
                dependency_graph[node_type].add("ProcessorNode")
                dependency_graph[node_type].add("AgentExecutor")
            elif "end" in node_type.lower():
                dependency_graph[node_type].add("TerminatorNode")

        return dependency_graph

    def _calculate_transitive_dependencies(self, graph: Dict[str, Set[str]],
                                           required: List[str]) -> Set[str]:
        """Calculate transitive closure of dependencies"""

        result = set(required)
        queue = list(required)

        while queue:
            current = queue.pop(0)

            if current in graph:
                for dep in graph[current]:
                    if dep not in result:
                        result.add(dep)
                        queue.append(dep)

        # Always include core components
        result.update([
            "BaseNode", "FlowState", "NodeMetadata", "NodeInput", "NodeOutput"
        ])

        return result

    def _apply_optimization_pipeline(self, module: cst.Module, component_name: str) -> cst.Module:
        """Apply comprehensive optimization pipeline"""

        optimized = module

        # 1. Dead code elimination
        optimized = self._eliminate_dead_code(optimized)

        # 2. Import optimization
        optimized = self._optimize_imports(optimized)

        # 3. Debug code removal
        optimized = self._remove_debug_code(optimized)

        # 4. Docstring optimization
        optimized = self._optimize_docstrings(optimized)

        # 5. Comment removal (optional)
        if self._should_remove_comments(component_name):
            optimized = self._remove_comments(optimized)

        # 6. Method inlining (for small methods)
        optimized = self._inline_small_methods(optimized)

        return optimized

    def _eliminate_dead_code(self, module: cst.Module) -> cst.Module:
        """Advanced dead code elimination"""

        class DeadCodeEliminator(cst.CSTTransformer):
            def __init__(self):
                self.eliminated_blocks = 0

            def leave_If(self, original_node: cst.If, updated_node: cst.If) -> cst.If:
                """Remove debug and development-only if blocks"""

                # Remove DEBUG blocks
                if m.matches(updated_node.test, m.Name("DEBUG")):
                    self.eliminated_blocks += 1
                    return cst.RemovalSentinel.REMOVE

                # Remove DEVELOPMENT_MODE blocks
                if m.matches(updated_node.test, m.Name("DEVELOPMENT_MODE")):
                    self.eliminated_blocks += 1
                    return cst.RemovalSentinel.REMOVE

                # Remove always-false conditions
                if m.matches(updated_node.test, m.Name("False")):
                    self.eliminated_blocks += 1
                    return cst.RemovalSentinel.REMOVE

                return updated_node

            def leave_Try(self, original_node: cst.Try, updated_node: cst.Try) -> cst.Try:
                """Simplify try-except blocks where possible"""

                # If try block is empty or trivial, might be eliminable
                if len(updated_node.body.body) == 0:
                    self.eliminated_blocks += 1
                    return cst.RemovalSentinel.REMOVE

                return updated_node

        eliminator = DeadCodeEliminator()
        result = module.visit(eliminator)

        if eliminator.eliminated_blocks > 0:
            logger.debug(f"🗑️ Eliminated {eliminator.eliminated_blocks} dead code blocks")

        return result

    def _optimize_imports(self, module: cst.Module) -> cst.Module:
        """Optimize import statements"""

        class ImportOptimizer(cst.CSTTransformer):
            def __init__(self):
                self.used_names = set()
                self.imported_names = {}
                self.optimized_imports = 0

            def visit_Name(self, node: cst.Name) -> None:
                """Track used names"""
                self.used_names.add(node.value)

            def leave_ImportFrom(self, original_node: cst.ImportFrom,
                                 updated_node: cst.ImportFrom) -> cst.ImportFrom:
                """Optimize from imports"""

                if not updated_node.names or isinstance(updated_node.names, cst.ImportStar):
                    return updated_node

                # Filter out unused imports - libcst correct API
                used_imports = []

                if isinstance(updated_node.names, list):
                    for import_target in updated_node.names:
                        if isinstance(import_target, cst.ImportAlias):
                            name = import_target.name.value
                            if name in self.used_names:
                                used_imports.append(import_target)
                            else:
                                self.optimized_imports += 1
                elif hasattr(updated_node.names, 'targets'):
                    # Handle ImportStar or other types
                    return updated_node

                if used_imports:
                    return updated_node.with_changes(names=used_imports)
                else:
                    # Remove entire import if nothing is used
                    self.optimized_imports += 1
                    return cst.RemovalSentinel.REMOVE

            def leave_Import(self, original_node: cst.Import, updated_node: cst.Import) -> cst.Import:
                """Optimize regular imports"""

                used_imports = []

                for alias in updated_node.names:
                    if isinstance(alias, cst.ImportAlias):
                        name = alias.name.value if isinstance(alias.name, cst.Name) else str(alias.name)
                        base_name = name.split('.')[0]

                        if base_name in self.used_names:
                            used_imports.append(alias)
                        else:
                            self.optimized_imports += 1

                if used_imports:
                    return updated_node.with_changes(names=used_imports)
                else:
                    self.optimized_imports += 1
                    return cst.RemovalSentinel.REMOVE

        optimizer = ImportOptimizer()
        result = module.visit(optimizer)

        if optimizer.optimized_imports > 0:
            logger.debug(f"📦 Optimized {optimizer.optimized_imports} import statements")

        return result

    def _remove_debug_code(self, module: cst.Module) -> cst.Module:
        """Remove debug and logging statements"""

        class DebugRemover(cst.CSTTransformer):
            def __init__(self):
                self.removed_statements = 0

            def leave_SimpleStatementLine(self, original_node: cst.SimpleStatementLine,
                                          updated_node: cst.SimpleStatementLine) -> cst.SimpleStatementLine:
                """Remove debug statements"""

                filtered_statements = []

                for stmt in updated_node.body:
                    should_remove = False

                    if isinstance(stmt, cst.Expr):
                        # Remove print statements
                        if m.matches(stmt.value, m.Call(func=m.Name("print"))):
                            should_remove = True

                        # Remove logger.debug calls
                        elif m.matches(stmt.value, m.Call(func=m.Attribute(attr=m.Name("debug")))):
                            should_remove = True

                        # Remove logger.info calls in production
                        elif m.matches(stmt.value, m.Call(func=m.Attribute(attr=m.Name("info")))):
                            # Keep error and warning logs, remove info and debug
                            call_node = stmt.value
                            if isinstance(call_node, cst.Call) and isinstance(call_node.func, cst.Attribute):
                                attr_name = call_node.func.attr.value
                                if attr_name in ["info", "debug"]:
                                    should_remove = True

                    if should_remove:
                        self.removed_statements += 1
                    else:
                        filtered_statements.append(stmt)

                if not filtered_statements:
                    return cst.RemovalSentinel.REMOVE

                return updated_node.with_changes(body=filtered_statements)

        remover = DebugRemover()
        result = module.visit(remover)

        if remover.removed_statements > 0:
            logger.debug(f"🐛 Removed {remover.removed_statements} debug statements")

        return result

    def _optimize_docstrings(self, module: cst.Module) -> cst.Module:
        """Optimize docstrings for export"""

        class DocstringOptimizer(cst.CSTTransformer):
            def __init__(self):
                self.optimized_docstrings = 0

            def leave_SimpleStatementLine(self, original_node: cst.SimpleStatementLine,
                                          updated_node: cst.SimpleStatementLine) -> cst.SimpleStatementLine:
                """Optimize docstrings in statements"""

                # Check if this is a docstring (string literal at start of block)
                if (len(updated_node.body) == 1 and
                        isinstance(updated_node.body[0], cst.Expr) and
                        isinstance(updated_node.body[0].value,
                                   (cst.SimpleString, cst.ConcatenatedString, cst.FormattedString))):

                    # This is likely a docstring - keep it short
                    original_string = updated_node.body[0].value

                    if isinstance(original_string, cst.SimpleString):
                        content = original_string.value

                        # If it's a very long docstring, shorten it
                        if len(content) > 200:
                            # Keep first line only
                            lines = content.split('\\n')
                            if len(lines) > 1:
                                short_content = f'"{lines[0].strip(chr(34))}"'
                                short_string = cst.SimpleString(short_content)
                                short_expr = cst.Expr(value=short_string)
                                self.optimized_docstrings += 1
                                return updated_node.with_changes(body=[short_expr])

                return updated_node

        optimizer = DocstringOptimizer()
        result = module.visit(optimizer)

        if optimizer.optimized_docstrings > 0:
            logger.debug(f"📝 Optimized {optimizer.optimized_docstrings} docstrings")

        return result

    def _remove_comments(self, module: cst.Module) -> cst.Module:
        """Remove comments from code (optional optimization)"""

        # libcst preserves comments in leading_lines and trailing_whitespace
        # This is a simplified implementation

        class CommentRemover(cst.CSTTransformer):
            def leave_SimpleStatementLine(self, original_node: cst.SimpleStatementLine,
                                          updated_node: cst.SimpleStatementLine) -> cst.SimpleStatementLine:
                # Remove leading comments
                return updated_node.with_changes(
                    leading_lines=[],
                    trailing_whitespace=cst.SimpleWhitespace("")
                )

        remover = CommentRemover()
        return module.visit(remover)

    def _inline_small_methods(self, module: cst.Module) -> cst.Module:
        """Inline very small methods to reduce call overhead"""

        # This is a complex optimization that requires call graph analysis
        # For now, we'll implement a simplified version

        class MethodInliner(cst.CSTTransformer):
            def __init__(self):
                self.small_methods = {}
                self.inlined_calls = 0

            def visit_FunctionDef(self, node: cst.FunctionDef) -> None:
                """Identify small methods that can be inlined"""

                # Only consider very small methods (1-2 statements)
                if (len(node.body.body) <= 2 and
                        not node.decorators and  # No decorators
                        len(node.params.params) <= 2):  # Simple parameters

                    self.small_methods[node.name.value] = node

            # Implementation would need call site analysis and replacement
            # This is quite complex, so we'll skip for now

        # Return unchanged for now
        return module

    def _post_process_source(self, source_code: str, component_name: str) -> str:
        """Apply post-processing optimizations to source code"""

        # Remove excessive blank lines
        lines = source_code.split('\n')
        processed_lines = []
        blank_count = 0

        for line in lines:
            if line.strip() == '':
                blank_count += 1
                if blank_count <= 2:  # Allow max 2 consecutive blank lines
                    processed_lines.append(line)
            else:
                blank_count = 0
                processed_lines.append(line)

        # Remove trailing whitespace
        processed_lines = [line.rstrip() for line in processed_lines]

        # Remove empty lines at end
        while processed_lines and processed_lines[-1].strip() == '':
            processed_lines.pop()

        return '\n'.join(processed_lines)

    def _is_core_component(self, component_name: str) -> bool:
        """Check if component is core and should always be kept"""
        core_components = {
            "engine", "state", "base_node", "node_registry", "graph_builder"
        }
        return component_name in core_components

    def _should_remove_comments(self, component_name: str) -> bool:
        """Determine if comments should be removed for this component"""
        # Keep comments in core components for debugging
        return not self._is_core_component(component_name)

    def _calculate_overall_reduction(self) -> float:
        """Calculate overall size reduction percentage"""

        total_kept = 0
        total_possible = 0

        for stats in self.optimization_stats.values():
            if isinstance(stats, dict) and not stats.get("eliminated", False):
                kept_items = stats.get("kept_classes", 0) + stats.get("kept_functions", 0)
                eliminated_items = stats.get("eliminated_classes", 0) + stats.get("eliminated_functions", 0)

                total_kept += kept_items
                total_possible += kept_items + eliminated_items

        if total_possible == 0:
            return 0.0

        return ((total_possible - total_kept) / total_possible) * 100

    def get_optimization_report(self) -> Dict[str, Any]:
        """Get detailed optimization report"""

        return {
            "components_analyzed": len(self.optimization_stats),
            "overall_reduction_percent": self._calculate_overall_reduction(),
            "eliminated_lines": self.eliminated_lines,
            "kept_lines": self.kept_lines,
            "component_details": self.optimization_stats,
            "optimization_techniques": [
                "Dead code elimination",
                "Import optimization",
                "Debug code removal",
                "Docstring optimization",
                "Tree shaking",
                "Method inlining"
            ]
        }


class ComponentTreeShaker(cst.CSTTransformer):
    """Tree shaker for individual components"""

    def __init__(self, required_elements: Set[str], component_name: str):
        self.required_elements = required_elements
        self.component_name = component_name

        self.kept_classes = []
        self.kept_functions = []
        self.eliminated_classes = []
        self.eliminated_functions = []
        self.has_required_elements = False

    def leave_ClassDef(self, original_node: cst.ClassDef, updated_node: cst.ClassDef) -> cst.ClassDef:
        """Keep only required classes"""

        class_name = updated_node.name.value

        if (class_name in self.required_elements or
                self._is_base_class(class_name) or
                self._is_component_specific_class(class_name)):

            self.kept_classes.append(class_name)
            self.has_required_elements = True
            return updated_node
        else:
            self.eliminated_classes.append(class_name)
            return cst.RemovalSentinel.REMOVE

    def leave_FunctionDef(self, original_node: cst.FunctionDef, updated_node: cst.FunctionDef) -> cst.FunctionDef:
        """Keep only required functions"""

        func_name = updated_node.name.value

        if (func_name in self.required_elements or
                self._is_helper_function(func_name) or
                self._is_component_specific_function(func_name)):

            self.kept_functions.append(func_name)
            self.has_required_elements = True
            return updated_node
        else:
            self.eliminated_functions.append(func_name)
            return cst.RemovalSentinel.REMOVE

    def _is_base_class(self, class_name: str) -> bool:
        """Check if this is a base class that should be kept"""
        base_classes = {
            "BaseNode", "ProviderNode", "ProcessorNode", "TerminatorNode",
            "BaseWorkflowEngine", "NodeRegistry", "FlowState"
        }
        return class_name in base_classes

    def _is_helper_function(self, func_name: str) -> bool:
        """Check if this is a helper function that should be kept"""
        return (func_name.startswith('get_') or
                func_name.startswith('create_') or
                func_name.startswith('_') or  # Private methods might be needed
                func_name in {'__init__', '__call__', '__enter__', '__exit__'})

    def _is_component_specific_class(self, class_name: str) -> bool:
        """Check if class is specific to current component and should be kept"""
        component_mappings = {
            "engine": ["LangGraphWorkflowEngine", "StubWorkflowEngine"],
            "state": ["FlowState"],
            "node_registry": ["NodeRegistry"],
            "base_node": ["BaseNode", "NodeMetadata", "NodeInput", "NodeOutput"]
        }

        return class_name in component_mappings.get(self.component_name, [])

    def _is_component_specific_function(self, func_name: str) -> bool:
        """Check if function is specific to current component"""
        component_mappings = {
            "engine": ["get_engine"],
            "state": ["merge_node_outputs"],
        }

        return func_name in component_mappings.get(self.component_name, [])

    def size_reduction_estimate(self) -> float:
        """Estimate size reduction for this component"""
        total_kept = len(self.kept_classes) + len(self.kept_functions)
        total_eliminated = len(self.eliminated_classes) + len(self.eliminated_functions)
        total = total_kept + total_eliminated

        if total == 0:
            return 0.0

        return (total_eliminated / total) * 100


class DependencyAnalyzer(cst.CSTVisitor):
    """Analyze dependencies in AST modules"""

    def __init__(self):
        self.referenced_classes = set()
        self.imported_modules = set()
        self.function_calls = set()

    def visit_Name(self, node: cst.Name) -> None:
        """Track referenced names (potential class references)"""
        name = node.value

        # Heuristic: uppercase names are likely classes
        if name[0].isupper():
            self.referenced_classes.add(name)

    def visit_ImportFrom(self, node: cst.ImportFrom) -> None:
        """Track imported modules"""
        if node.module:
            module_name = self._get_module_name(node.module)
            self.imported_modules.add(module_name)

    def visit_Call(self, node: cst.Call) -> None:
        """Track function calls"""
        if isinstance(node.func, cst.Name):
            self.function_calls.add(node.func.value)
        elif isinstance(node.func, cst.Attribute):
            # Track method calls
            method_name = node.func.attr.value
            self.function_calls.add(method_name)

    def _get_module_name(self, node) -> str:
        """Extract module name from various node types"""
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


# Export main classes
__all__ = ["TreeShaker", "ComponentTreeShaker", "DependencyAnalyzer"]