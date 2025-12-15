"""
GraphBuilder Node Executor
=========================

Handles all node execution, session management, and state processing for the GraphBuilder system.
Provides clean separation of node execution logic from the main orchestrator.

AUTHORS: KAI-Fusion Workflow Orchestration Team
VERSION: 2.1.0
LAST_UPDATED: 2025-09-16
LICENSE: Proprietary - KAI-Fusion Platform
"""

from typing import Dict, Any, Optional, List, Union
import logging
import uuid
import inspect
import asyncio
import concurrent.futures
import datetime
import traceback
import re
from jinja2 import Template

from .types import (
    GraphNodeInstance,
    NodeInstanceRegistry,
    PROCESSOR_NODE_TYPES,
    MEMORY_NODE_TYPES,
    PooledConnectionRegistry,
    ConnectionPoolStats
)
from .exceptions import NodeExecutionError
from app.core.state import FlowState
from app.core.output_cache import default_connection_extractor
from app.core.node_handlers import node_handler_registry
from app.core.connection_pool import ConnectionPool, PooledConnection
from langchain_core.runnables import Runnable

logger = logging.getLogger(__name__)


class NodeExecutor:
    """
    Handles all node execution, session management, and state processing.
    
    Provides clean separation of node execution logic including:
    - Session setup for agents and memory nodes
    - Processor node execution with async handling
    - Standard node execution
    - Connected node instance extraction
    - Result processing and serialization
    """
    
    def __init__(self, connection_extractor=None, node_handlers=None):
        self.connection_extractor = connection_extractor or default_connection_extractor
        self.node_handlers = node_handlers or node_handler_registry
        self._execution_stats = {}
        self._nodes_registry = {}  # Store injected nodes registry
    
    def setup_node_session(self, gnode: GraphNodeInstance, state: FlowState, node_id: str) -> None:
        """
        Setup session information for agents and memory nodes.
        
        Args:
            gnode: Graph node instance to setup
            state: Current flow state
            node_id: ID of the node
        """
        try:
            # Setup User Context (User ID & Credentials)
            if hasattr(state, 'user_id') and state.user_id:
                gnode.node_instance.user_id = state.user_id
                
                # Fetch and inject credentials
                try:
                    from app.core.credential_provider import credential_provider
                    # Convert string user_id to UUID if necessary
                    user_uuid = uuid.UUID(state.user_id) if isinstance(state.user_id, str) else state.user_id
                    
                    credentials = credential_provider.get_credentials_sync(user_uuid)
                    gnode.node_instance.credentials = credentials
                    logger.debug(f"Injected {len(credentials)} credentials for user {state.user_id} into node {node_id}")
                except Exception as e:
                    logger.warning(f"Failed to inject credentials for node {node_id}: {e}")

            # Setup session for ReAct Agents and Tool Agents
            if gnode.type in PROCESSOR_NODE_TYPES and hasattr(gnode.node_instance, 'session_id'):
                session_id = state.session_id or f"session_{node_id}"
                
                # Ensure session_id is valid
                if not session_id or session_id == 'None' or len(session_id.strip()) == 0:
                    session_id = f"session_{node_id}_{uuid.uuid4().hex[:8]}"
                
                gnode.node_instance.session_id = session_id
                logger.debug(f"Set session_id on agent {node_id}: {session_id}")
            
            # Setup session for memory nodes (priority over user_id)
            if any(memory_type in gnode.type for memory_type in MEMORY_NODE_TYPES):
                if hasattr(gnode.node_instance, 'session_id'):
                    # Use state.session_id as primary source
                    session_id = state.session_id
                    if not session_id or session_id == 'None' or len(session_id.strip()) == 0:
                        session_id = f"session_{node_id}_{uuid.uuid4().hex[:8]}"
                    
                    gnode.node_instance.session_id = session_id
                    logger.debug(f"Set session_id on memory node {node_id}: {session_id}")
                    
        except Exception as e:
            logger.warning(f"Failed to setup session for node {node_id}: {e}")
    
    def execute_processor_node(self, gnode: GraphNodeInstance, state: FlowState, node_id: str) -> Dict[str, Any]:
        """
        Execute processor nodes (ReactAgent, etc.) with proper async handling.
        
        Args:
            gnode: Graph node instance to execute
            state: Current flow state  
            node_id: ID of the node
            
        Returns:
            Execution result dictionary
            
        Raises:
            NodeExecutionError: If processor execution fails
        """
        try:
            logger.info(f"🔄 Executing processor node: {node_id} ({gnode.type})")
            
            # Extract user inputs for processor
            user_inputs = self.extract_user_inputs_for_processor(gnode, state)
            logger.debug(f"User inputs extracted: {list(user_inputs.keys())}")
            
            # Apply node-output templating so processor inputs can reference upstream node outputs
            user_inputs = self._apply_node_output_templating(gnode, user_inputs, state)
            logger.debug(f"Templated user inputs: {list(user_inputs.keys())}")
            print(f"ana data {user_inputs}")
            
            # Extract connected node instances
            connected_nodes = self.extract_connected_node_instances(gnode, state)
            logger.debug(f"Connected nodes extracted: {list(connected_nodes.keys())}")
            
            # Call execute with proper async handling
            execute_method = gnode.node_instance.execute
            
            if inspect.iscoroutinefunction(execute_method):
                # Handle async execute method
                result = self._execute_async_method(execute_method, user_inputs, connected_nodes, node_id)
            else:
                # Handle sync execute method
                result = execute_method(user_inputs, connected_nodes)
            
            # Process the result
            processed_result = self.process_processor_result(result, state, node_id)
            
            # Update execution tracking
            updated_executed_nodes = state.executed_nodes.copy()
            if node_id not in updated_executed_nodes:
                updated_executed_nodes.append(node_id)

            # Extract the actual output for last_output
            if isinstance(processed_result, dict) and "output" in processed_result:
                last_output = processed_result["output"]
            else:
                last_output = str(processed_result)
            # Update the state directly
            state.last_output = last_output
            state.executed_nodes = updated_executed_nodes           # Filter out complex objects before storing in state
            if gnode.type in PROCESSOR_NODE_TYPES:
                serializable_result = self._filter_complex_objects(processed_result)
                serializable_output = last_output
                logger.debug(f"Agent serializable output: {type(serializable_output)} - '{str(serializable_output)[:100]}...'")
            else:
                serializable_result = self._make_serializable(processed_result)
                serializable_output = serializable_result            # Store only serializable data in state for connected nodes to access
            if not hasattr(state, 'node_outputs'):
                state.node_outputs = {}
            state.node_outputs[node_id] = serializable_result
            
            result_dict = {
                f"output_{node_id}": serializable_output,
                "executed_nodes": updated_executed_nodes,
                "last_output": last_output,
                "node_outputs": state.node_outputs
            }
            
            logger.info(f"✅ Processor node {node_id} completed successfully")
            logger.debug(f"Output: '{last_output[:80]}...' ({len(str(last_output))} chars)")
            
            return result_dict
            
        except Exception as e:
            raise NodeExecutionError(
                node_id=node_id,
                node_type=gnode.type,
                original_error=e,
                node_config=gnode.user_data,
                input_connections=getattr(gnode.node_instance, '_input_connections', {}),
                output_connections=getattr(gnode.node_instance, '_output_connections', {})
            ) from e
    
    def execute_standard_node(self, gnode: GraphNodeInstance, state: FlowState, node_id: str) -> Dict[str, Any]:
        """
        Execute standard nodes (Provider, etc.).
        
        Args:
            gnode: Graph node instance to execute
            state: Current flow state
            node_id: ID of the node
            
        Returns:
            Execution result dictionary
            
        Raises:
            NodeExecutionError: If standard execution fails
        """
        try:
            logger.info(f"🔄 Executing standard node: {node_id} ({gnode.type})")
            
            # Use the standard graph node function
            node_func = gnode.node_instance.to_graph_node()
            result = node_func(state)

            # Store primary output for standard nodes as well so templating can see them
            try:
                if isinstance(result, dict):
                    output_key = f"output_{node_id}"
                    if output_key in result:
                        primary_raw = result[output_key]
                        if not hasattr(state, "node_outputs"):
                            state.node_outputs = {}
                        state.node_outputs[node_id] = primary_raw
                        logger.debug(
                            f"[TEMPLATE] Standard node {node_id} stored in state.node_outputs "
                            f"with type={type(primary_raw)}"
                        )
            except Exception as e:
                logger.warning(f"[TEMPLATE] Failed to store standard node output for {node_id}: {e}")
            
            logger.info(f"✅ Standard node {node_id} completed successfully")
            logger.debug(f"Node {node_id} output: {str(result)[:200]}...")
            
            return result
            
        except Exception as e:
            raise NodeExecutionError(
                node_id=node_id,
                node_type=gnode.type,
                original_error=e,
                node_config=gnode.user_data,
                input_connections=getattr(gnode.node_instance, '_input_connections', {}),
                output_connections=getattr(gnode.node_instance, '_output_connections', {})
            ) from e
    
    def extract_user_inputs_for_processor(self, gnode: GraphNodeInstance, state: FlowState) -> Dict[str, Any]:
        """
        Extract user inputs for processor nodes from state and user_data.
        
        Args:
            gnode: Graph node instance
            state: Current flow state
            
        Returns:
            Dictionary of user inputs
        """
        user_inputs = {}
        input_specs = gnode.node_instance.metadata.inputs

        # Frontend genellikle node config'lerini gnode.user_data["inputs"] altında tutuyor.
        # Önce buradan okumaya çalışıyoruz, sonra düz gnode.user_data ve state.variables'a bakıyoruz.
        inputs_group = {}
        try:
            if isinstance(gnode.user_data, dict):
                inputs_group = gnode.user_data.get("inputs", {}) or {}
        except Exception:
            inputs_group = {}

        for input_spec in input_specs:
            if not input_spec.is_connection:
                # 1) Öncelik: data.inputs[...] (frontend form değerleri)
                if isinstance(inputs_group, dict) and input_spec.name in inputs_group:
                    user_inputs[input_spec.name] = inputs_group[input_spec.name]
                    logger.debug(f"Found user input {input_spec.name} in user_data['inputs']")
                # 2) Sonra: data[...] (düz user_data alanı)
                elif input_spec.name in gnode.user_data:
                    user_inputs[input_spec.name] = gnode.user_data[input_spec.name]
                    logger.debug(f"Found user input {input_spec.name} in user_data (top-level)")
                # 3) Sonra: state.variables
                elif hasattr(state, 'variables') and input_spec.name in state.variables:
                    user_inputs[input_spec.name] = state.get_variable(input_spec.name)
                    logger.debug(f"Found user input {input_spec.name} in state.variables")
                # 4) Varsayılan değer
                elif input_spec.default is not None:
                    user_inputs[input_spec.name] = input_spec.default
                    logger.debug(f"Using default for {input_spec.name}: {input_spec.default}")
                # 5) Zorunlu değilse ve değer yoksa atla
                elif not input_spec.required:
                    logger.debug(f"Skipping non-required input: {input_spec.name}")
                    continue
                else:
                    logger.debug(f"No value found for required input {input_spec.name}, using default if any")
                    
        # Ayrıca user_data'dan gelen özellikleri de dahil edin (ReactAgent gibi özelliklere sahip düğümler için)
        if hasattr(gnode.node_instance, 'metadata') and hasattr(gnode.node_instance.metadata, 'properties'):    
            for prop in gnode.node_instance.metadata.properties:
                if prop.name in gnode.user_data:
                    user_inputs[prop.name] = gnode.user_data[prop.name]
                    logger.debug(f"Found property {prop.name} in user_data")

        logger.debug(f"Processor {gnode.id} resolved user_inputs: {user_inputs}")
        return user_inputs
    
    def _normalize_display_name_for_template(self, name: str) -> str:
        """
        Normalize a node display name to a Jinja-safe identifier.
        
        Example:
            "OpenAI GPT" -> "openai_gpt"
        """
        if not name:
            return ""
        
        normalized = re.sub(r"[^0-9a-zA-Z_]+", "_", name.lower()).strip("_")
        if not normalized:
            return ""
        
        # Jinja identifiers should not start with a digit
        if normalized[0].isdigit():
            normalized = f"n_{normalized}"
        
        return normalized
    
    def _get_primary_output_for_node(self, node_id: str, state: FlowState) -> Any:
        """

        FlowState'ten verilen bir düğüm için birincil çıktı değerini belirleyin.

        Sezgisel yöntem:

        - Eğer node_outputs[node_id] bir sözlük ise:

        - 'output' tercih edin

        - Ardından 'content'

        - Yalnızca bir anahtar varsa tek değeri döndürün
        - Aksi takdirde tüm sözlüğü döndürün
        - Aksi takdirde, saklanan değeri doğrudan döndürün.

        """
        if not hasattr(state, "node_outputs"):
            return None
        
        node_output = state.node_outputs.get(node_id)
        if node_output is None:
            return None
        
        if isinstance(node_output, dict):
            if "output" in node_output:
                return node_output["output"]
            if "content" in node_output:
                return node_output["content"]
            if len(node_output) == 1:
                return next(iter(node_output.values()))
            return node_output
        
        return node_output
    
    def _render_template_string(self, template_str: str, context: Dict[str, Any], node_id: str) -> str:
        """

        Verilen bağlamla bir Jinja2 şablon dizesini işler.

        İşleme başarısız olursa, orijinal dizeyi döndürür ve bir uyarı kaydeder.

        """
        # Gereksiz Jinja çalışmalarından kaçınmak için hızlı kontrol
        if "{{" not in template_str or "}}" not in template_str:
            return template_str
        
        try:
            template = Template(template_str)
            return template.render(**context)
        except Exception as e:
            logger.warning(f"Node templating failed for {node_id}: {e}")
            return template_str
    
    def _apply_node_output_templating(
        self,
        gnode: GraphNodeInstance,
        user_inputs: Dict[str, Any],
        state: FlowState
    ) -> Dict[str, Any]:
        """
        İşlemci kullanıcı girişlerine Jinja2 şablonlama uygulayın, böylece yukarı akış düğüm çıktılarına normalleştirilmiş görünen adla referans verebilirler.

        İşlemci düğüm girişinde örnek kullanım:

        "Önceki cevabı kullan: {{openai_gpt}}"

        burada "OpenAI GPT", yukarı akış düğümünün görünen adıdır.
        """
        try:
            # Bu yöntem yalnızca execute_processor_node'dan çağrılır, bu nedenle burada ek bir gnode.type filtresine ihtiyacımız yok.

            # Tüm işlemci düğümleri için şablonlama uygulayın.

            # node_outputs ve doldurulmuş bir nodes_registry'ye ihtiyacımız var.
            if not hasattr(state, "node_outputs") or not state.node_outputs:
                return user_inputs
            if not getattr(self, "_nodes_registry", None):
                return user_inputs
            
            # Build templating context from executed nodes' primary outputs
            context: Dict[str, Any] = {}

            # SPECIAL CASE: Add current_input as 'input' for chat-like behavior
            # This allows {{input}} to work even when running with StartNode
            if hasattr(state, 'current_input') and state.current_input is not None:
                context['input'] = state.current_input

            for other_node_id in state.node_outputs.keys():
                graph_node = self._nodes_registry.get(other_node_id)
                if not graph_node:
                    continue

                # Bu düğüm için önceliklendirilmiş bir aday ad listesi oluşturun:

                # 1) user_data["name"]'den gelen kullanıcı arayüzünde görünen ad (tuvalde gördüğünüz)
                # 2) NodeMetadata.display_name
                # 3) NodeMetadata.name
                # 4) GraphNodeInstance.metadata["display_name"/"name"]
                # 5) Yedek: node_id
                alias_candidates: list[tuple[str, str]] = []

                # 1) Kullanıcı arayüzü adı (en yüksek öncelik, kullanıcının ön uçta düzenlediği şey)
                ui_name = None
                try:
                    user_data = getattr(graph_node, "user_data", {}) or {}
                    if isinstance(user_data, dict):
                        ui_name = user_data.get("name")
                except Exception:
                    user_data = {}
                    ui_name = None

                if ui_name:
                    alias_candidates.append(("ui_name", str(ui_name)))

                # 2) Düğüm örneğindeki Pydantic NodeMetadata
                node_meta_model = None
                try:
                    node_meta_model = getattr(graph_node.node_instance, "metadata", None)
                except Exception:
                    node_meta_model = None

                if node_meta_model is not None:
                    display_name = getattr(node_meta_model, "display_name", None)
                    meta_name = getattr(node_meta_model, "name", None)

                    if display_name:
                        alias_candidates.append(("display_name", str(display_name)))
                    if meta_name and meta_name != display_name:
                        alias_candidates.append(("meta_name", str(meta_name)))

                # 3) Fallback to GraphNodeInstance.metadata dict
                metadata_dict = getattr(graph_node, "metadata", {}) or {}
                if isinstance(metadata_dict, dict):
                    md_display = metadata_dict.get("display_name")
                    md_name = metadata_dict.get("name")

                    if md_display:
                        alias_candidates.append(("graph_display_name", str(md_display)))
                    if md_name and md_name != md_display:
                        alias_candidates.append(("graph_name", str(md_name)))

                # 4) Final fallback: raw node_id
                alias_candidates.append(("node_id", str(other_node_id)))

                primary_value = self._get_primary_output_for_node(other_node_id, state)
                if primary_value is None:
                    continue

                # ÖZEL DURUM: Eğer bu bir StartNode ise, çıktısını da 'giriş' olarak ekleyin.
                # Bu, {{input}}'un tıpkı bir sohbet sistemi gibi StartNode ile çalışmasına olanak tanır.
                is_start_node = False
                try:
                    if hasattr(graph_node, 'type') and graph_node.type == 'StartNode':
                        is_start_node = True
                        if 'input' not in context:  # Don't overwrite if already set
                            context['input'] = primary_value
                            print(f"[TEMPLATE DEBUG] Added 'input' context from StartNode output: {primary_value}")
                except Exception:
                    pass

                # Mevcut anahtarların üzerine yazmadan tüm takma adları normalleştirin ve kaydedin.
                # Bu, geriye dönük uyumluluğu (türe dayalı takma adlar) korurken
                # {{openai_gpt}} gibi temiz kullanıcı arayüzüne dayalı takma adlara olanak tanır.
                for source_type, raw_name in alias_candidates:
                    normalized = self._normalize_display_name_for_template(raw_name)
                    if not normalized:
                        continue

                    if normalized in context:
                        # Do not overwrite existing mapping; just log once for visibility
                        logger.debug(
                            f"[TEMPLATE] Skipping duplicate alias '{normalized}' from {source_type} "
                            f"for node {other_node_id} while building context for {gnode.id}"
                        )
                        continue

                    context[normalized] = primary_value
                    print(f"context-data= {primary_value}")
                    logger.debug(
                        f"[TEMPLATE] Added alias '{normalized}' from {source_type} "
                        f"for node '{other_node_id}' (raw='{raw_name}') into context for {gnode.id}"
                    )
            
            if not context:
                logger.debug(f"[TEMPLATE] No context built for node {gnode.id}; skipping templating")
                return user_inputs
            
            logger.debug(
                f"[TEMPLATE] Built templating context for node {gnode.id}: "
                f"keys={list(context.keys())}"
            )
            
            # Apply templating only to string inputs containing '{{' and '}}'
            rendered_inputs: Dict[str, Any] = {}
            for key, value in user_inputs.items():
                if isinstance(value, str) and "{{" in value and "}}" in value:
                    original = value
                    rendered = self._render_template_string(
                        original, context, gnode.id
                    )
                    print(
                        f"[TEMPLATE DEBUG] Node {gnode.id} input '{key}' "
                        f"before='{original}' after='{rendered}'"
                    )
                    if rendered != original:
                        logger.info(
                            f"[TEMPLATE] Node {gnode.id} input '{key}' templated from "
                            f"'{original}' to '{rendered}'"
                        )
                    else:
                        logger.info(
                            f"[TEMPLATE] Node {gnode.id} input '{key}' contained templates "
                            f"but rendered unchanged: '{original}'"
                        )
                    rendered_inputs[key] = rendered
                else:
                    rendered_inputs[key] = value
            
            return rendered_inputs
        
        except Exception as e:
            logger.error(f"Failed to apply node output templating for {gnode.id}: {e}")
            return user_inputs
    
    def extract_connected_node_instances(self, gnode: GraphNodeInstance, state: FlowState) -> Dict[str, Any]:
        """
        Extract connected node instances with pool-aware support for many-to-many connections.
        
        Args:
            gnode: Graph node instance
            state: Current flow state
            
        Returns:
            Dictionary of connected node instances/data
        """
        # Check for pool-based connections first
        has_pool = self._has_pool_connections(gnode)
        if has_pool:
            logger.debug(f"🔗 Extracting pool-enabled connections for {gnode.id}")
        else:
            logger.debug(f"🔗 Extracting connections for {gnode.id} (Clean Architecture)")
        
        try:
            # Use the clean connection extractor with proper nodes registry
            connected = self.connection_extractor.extract_connected_instances(
                gnode=gnode,
                state=state,
                nodes_registry=self._nodes_registry  # Use injected nodes registry
            )
            
            if has_pool:
                logger.debug(f"✅ Pool-aware connection extraction completed: {len(connected)} connections")
            else:
                logger.debug(f"✅ Clean connection extraction completed: {len(connected)} connections")
            
            # CRITICAL FIX: Validate connection formats before returning
            validated_connected = self._validate_and_fix_connection_formats(connected, gnode.id)
            return validated_connected
            
        except Exception as e:
            logger.error(f"Clean connection extraction failed for {gnode.id}: {e}")
            if has_pool:
                logger.info("Falling back to pool-aware legacy implementation")
            else:
                logger.info("Falling back to legacy implementation for compatibility")
            
            # Fallback to enhanced legacy method (now pool-aware)
            return self._extract_connected_node_instances_legacy_safe(gnode, state)
    
    def _extract_connected_node_instances_legacy_safe(self, gnode: GraphNodeInstance, state: FlowState) -> Dict[str, Any]:
        """
        Enhanced legacy version of connection extraction supporting both single and multiple connections.
        
        Args:
            gnode: Graph node instance
            state: Current flow state
            
        Returns:
            Dictionary of connected node instances/data
        """
        logger.debug(f"[LEGACY] Enhanced connection extraction for {gnode.id}")
        connected = {}
        
        if not hasattr(gnode.node_instance, '_input_connections'):
            return connected
        
        # Check if this node has pool connections
        has_pool = self._has_pool_connections(gnode)
        if has_pool:
            logger.debug(f"[LEGACY] Node {gnode.id} has pool-based connections")
        
        for input_name, connection_data in gnode.node_instance._input_connections.items():
            try:
                # Handle multiple connections (list format)
                if isinstance(connection_data, list):
                    logger.debug(f"[LEGACY] Processing {len(connection_data)} multiple connections for {input_name}")
                    aggregated_data = self._process_multiple_connections(connection_data, state)
                    connected[input_name] = aggregated_data
                    
                # Handle single connection (dict format) - backward compatibility
                elif isinstance(connection_data, dict):
                    logger.debug(f"[LEGACY] Processing single connection for {input_name}")
                    single_data = self._process_single_connection(connection_data, state)
                    connected[input_name] = single_data
                    
                else:
                    logger.error(f"[ERROR] Failed to extract connection {input_name}: {type(connection_data)} is not a supported format")
                    logger.error(f"[ERROR] Expected dict or list, got: {connection_data}")
                    connected[input_name] = None
                    
            except Exception as e:
                logger.error(f"[LEGACY] Failed to process connections for {input_name}: {e}")
                connected[input_name] = None
        
        logger.debug(f"[LEGACY] Extracted {len(connected)} connections for {gnode.id}")
        return connected
    
    def process_processor_result(self, result: Any, state: FlowState, node_id: str) -> Any:
        """
        Process the result from a processor node.
        
        Args:
            result: Raw result from node execution
            state: Current flow state
            node_id: ID of the node
            
        Returns:
            Processed result
        """
        # For processor nodes, if result is a Runnable, execute it with the user input
        if isinstance(result, Runnable):
            try:
                # Prepare input in correct format for Runnable
                runnable_input = state.current_input
                if isinstance(runnable_input, str):
                    runnable_input = {"input": runnable_input}
                elif not isinstance(runnable_input, dict):
                    runnable_input = {"input": str(runnable_input)}
                
                logger.debug(f"Executing Runnable for {node_id} with input: {runnable_input}")
                executed_result = result.invoke(runnable_input)
                logger.debug(f"Runnable execution result: {executed_result}")
                return executed_result
            except Exception as e:
                # Enhanced error logging for debugging connection format issues
                error_msg = str(e)
                if "string indices must be integers" in error_msg:
                    logger.error(f"CRITICAL: Agent connection format error for {node_id}")
                    logger.error(f"This usually indicates tools connection returned dict instead of List[BaseTool]")
                    logger.error(f"Check provider nodes connected to this agent for proper output format")
                
                logger.error(f"Failed to execute Runnable for {node_id}: {e}")
                import traceback
                logger.error(f"Full traceback: {traceback.format_exc()}")
                return {"error": str(e)}
        
        # Keep the original result for proper data flow between nodes
        return result
    
    def _execute_async_method(self, execute_method, user_inputs: Dict[str, Any], connected_nodes: Dict[str, Any], node_id: str) -> Any:
        """
        Execute async method with proper event loop handling.
        
        Args:
            execute_method: Async method to execute
            user_inputs: User inputs for the method
            connected_nodes: Connected node data
            node_id: ID of the node
            
        Returns:
            Execution result
        """
        try:
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    # We're already in an async context, create new event loop in thread
                    with concurrent.futures.ThreadPoolExecutor() as executor:
                        future = executor.submit(asyncio.run, execute_method(user_inputs, connected_nodes))
                        result = future.result()
                else:
                    result = asyncio.run(execute_method(user_inputs, connected_nodes))
            except RuntimeError:
                # No event loop, create one
                result = asyncio.run(execute_method(user_inputs, connected_nodes))
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to execute async method for {node_id}: {e}")
            raise
    
    def _has_pool_connections(self, gnode: GraphNodeInstance) -> bool:
        """
        Check if the node instance has pool-based multiple connections.
        
        Args:
            gnode: Graph node instance to check
            
        Returns:
            bool: True if pool connections are configured, False otherwise
        """
        try:
            if not hasattr(gnode.node_instance, '_input_connections'):
                return False
            
            # Check if any connection values are lists (indicating multiple connections)
            for connection_data in gnode.node_instance._input_connections.values():
                if isinstance(connection_data, list):
                    return True
                    
            return False
            
        except Exception as e:
            logger.debug(f"Error checking pool connections for {gnode.id}: {e}")
            return False
    
    def _process_multiple_connections(self, connection_data: List[Dict[str, Any]], state: FlowState) -> Any:
        """
        Process multiple input connections for a handle.
        
        Args:
            connection_data: List of connection dictionaries
            state: Current flow state
            
        Returns:
            Aggregated data from multiple connections
        """
        logger.debug(f"Processing {len(connection_data)} multiple connections")
        
        if not connection_data:
            return None
        
        # If only one connection, process it directly
        if len(connection_data) == 1:
            return self._process_single_connection(connection_data[0], state)
        
        # Process each connection and collect results
        results = []
        for conn_info in connection_data:
            try:
                result = self._process_single_connection(conn_info, state)
                if result is not None:
                    results.append(result)
            except Exception as e:
                logger.warning(f"Failed to process connection {conn_info}: {e}")
                continue
        
        # Aggregate results using the configured strategy
        return self._aggregate_connection_data(results, connection_data)
    
    def _process_single_connection(self, connection_info: Dict[str, Any], state: FlowState) -> Any:
        """
        Process a single connection to extract data.
        
        Args:
            connection_info: Connection information dictionary
            state: Current flow state
            
        Returns:
            Data from the single connection
        """
        try:
            # CRITICAL FIX: Handle format mismatch - check if connection_info is actually a list
            if isinstance(connection_info, list):
                logger.error(f"[ERROR] Failed to extract connection: list indices must be integers or slices, not str")
                logger.error(f"[ERROR] Expected dict but got list with {len(connection_info)} items: {connection_info}")
                
                # If it's a single-item list, extract the dict
                conn_list = list(connection_info)
                if len(conn_list) == 1 and isinstance(conn_list[0], dict):
                    logger.debug("[FIX] Extracting single dict from list format")
                    connection_info = conn_list[0]
                else:
                    logger.error("[ERROR] Cannot process multi-item list in single connection context")
                    return None
            
            # Ensure connection_info is a dictionary
            if not isinstance(connection_info, dict):
                logger.error(f"[ERROR] Invalid connection format: {type(connection_info)}")
                return None
                
            source_node_id = connection_info.get("source_node_id")
            source_handle = connection_info.get("source_handle", "output")
            
            if not source_node_id:
                logger.warning("Missing source_node_id in connection info")
                return None
            
            # Check if we have cached output for this node
            if hasattr(state, 'node_outputs') and source_node_id in state.node_outputs:
                stored_result = state.node_outputs[source_node_id]
                
                # Try to extract specific handle output
                if isinstance(stored_result, dict) and source_handle in stored_result:
                    return stored_result[source_handle]
                # Fallback to common output keys
                elif isinstance(stored_result, dict) and "documents" in stored_result:
                    return stored_result["documents"]
                elif isinstance(stored_result, dict) and "output" in stored_result:
                    return stored_result["output"]
                else:
                    return stored_result
            else:
                logger.warning(f"No cached output available for {source_node_id}")
                return None
                
        except Exception as e:
            logger.error(f"Error processing single connection: {e}")
            return None
    
    def _aggregate_connection_data(self, results: List[Any], connection_data: List[Dict[str, Any]]) -> Any:
        """
        Aggregate data from multiple connections using intelligent strategies.
        
        Args:
            results: List of results from multiple connections
            connection_data: Original connection data for priority information
            
        Returns:
            Aggregated result
        """
        if not results:
            return None
        
        if len(results) == 1:
            return results[0]
        
        logger.debug(f"Aggregating {len(results)} connection results")
        
        # Strategy 1: List Aggregation (default)
        # Combine all results into a list for processing
        if all(isinstance(result, list) for result in results):
            # Flatten lists of lists
            aggregated = []
            for result_list in results:
                aggregated.extend(result_list)
            logger.debug(f"List aggregation: {len(aggregated)} items")
            return aggregated
        
        # Strategy 2: Priority Selection
        # If connections have priority information, use highest priority
        if connection_data and len(connection_data) == len(results):
            # Check if any connection has priority information
            prioritized = []
            for i, conn_info in enumerate(connection_data):
                priority = conn_info.get("priority", 0)
                if i < len(results):
                    prioritized.append((priority, results[i]))
            
            if any(priority > 0 for priority, _ in prioritized):
                # Sort by priority (highest first) and return top result
                prioritized.sort(key=lambda x: x[0], reverse=True)
                logger.debug(f"Priority selection: chose result with priority {prioritized[0][0]}")
                return prioritized[0][1]
        
        # Strategy 3: Data Type-specific Merging
        # Handle specific data types intelligently
        first_result = results[0]
        
        if isinstance(first_result, dict):
            # Merge dictionaries
            merged = {}
            for result in results:
                if isinstance(result, dict):
                    merged.update(result)
            logger.debug(f"Dictionary merge: {len(merged)} keys")
            return merged
        
        elif isinstance(first_result, str):
            # Concatenate strings with separator
            merged = " | ".join(str(result) for result in results)
            logger.debug(f"String concatenation: {len(merged)} chars")
            return merged
        
        elif isinstance(first_result, (int, float)):
            # Sum numeric values
            try:
                total = sum(float(result) for result in results if isinstance(result, (int, float)))
                logger.debug(f"Numeric sum: {total}")
                return total
            except (ValueError, TypeError):
                pass
        
        # Fallback: Return as list for further processing
        logger.debug("Fallback aggregation: returning as list")
        return results
    
    def _validate_and_fix_connection_formats(self, connected: Dict[str, Any], node_id: str) -> Dict[str, Any]:
        """
        Validate and fix connection formats to prevent format mismatch errors.
        
        Args:
            connected: Dictionary of connected node data
            node_id: ID of the node for logging
            
        Returns:
            Dictionary with validated and corrected connection formats
        """
        validated = {}
        
        for handle_name, connection_data in connected.items():
            try:
                # Special handling for tools connections (CRITICAL FIX)
                if handle_name.lower() in ['tools', 'tool', 'tool_list']:
                    validated_tools = self._validate_tools_connection(connection_data, node_id, handle_name)
                    validated[handle_name] = validated_tools
                    continue
                
                # Check for format issues
                if isinstance(connection_data, list):
                    # If it's a single-item list containing a dict, extract the dict
                    if len(connection_data) == 1 and isinstance(connection_data[0], dict):
                        logger.debug(f"[FIX] Converting single-item list to dict for {node_id}.{handle_name}")
                        validated[handle_name] = connection_data[0]
                    else:
                        # Keep as list for genuine many-to-many cases
                        validated[handle_name] = connection_data
                        logger.debug(f"[KEEP] List format with {len(connection_data)} items for {node_id}.{handle_name}")
                        
                elif isinstance(connection_data, dict):
                    # Keep dict format as-is
                    validated[handle_name] = connection_data
                    logger.debug(f"[KEEP] Dict format for {node_id}.{handle_name}")
                    
                else:
                    # Handle other data types
                    validated[handle_name] = connection_data
                    logger.debug(f"[KEEP] {type(connection_data)} format for {node_id}.{handle_name}")
                    
            except Exception as e:
                logger.error(f"[ERROR] Failed to validate connection format for {node_id}.{handle_name}: {e}")
                # Keep original data in case of validation error
                validated[handle_name] = connection_data
        
        if len(validated) != len(connected):
            logger.warning(f"[WARNING] Connection validation changed count from {len(connected)} to {len(validated)}")
        
        return validated
    
    def _validate_tools_connection(self, connection_data: Any, node_id: str, handle_name: str) -> Any:
        """
        Validate and fix tools connection format to prevent Agent execution errors.
        
        Args:
            connection_data: The tools connection data
            node_id: ID of the node for logging
            handle_name: Name of the connection handle
            
        Returns:
            Properly formatted tools data
        """
        try:
            if isinstance(connection_data, list):
                # List format is usually correct
                logger.debug(f"[TOOLS] List format validated for {node_id}.{handle_name}: {len(connection_data)} items")
                return connection_data
            elif isinstance(connection_data, dict):
                # Dict format needs extraction - this prevents the "string indices" error
                if "tools" in connection_data:
                    tools_data = connection_data["tools"]
                    logger.debug(f"[TOOLS-FIX] Extracted tools from dict for {node_id}.{handle_name}: {type(tools_data)}")
                    return tools_data
                elif "tool" in connection_data:
                    tool_data = connection_data["tool"]
                    logger.debug(f"[TOOLS-FIX] Extracted tool from dict for {node_id}.{handle_name}: {type(tool_data)}")
                    return tool_data
                else:
                    # Dict might be a tool object itself
                    logger.warning(f"[TOOLS] Dict without 'tools' key for {node_id}.{handle_name}, keeping as-is")
                    return connection_data
            else:
                # Single tool object
                logger.debug(f"[TOOLS] Single tool object for {node_id}.{handle_name}: {type(connection_data)}")
                return connection_data
                
        except Exception as e:
            logger.error(f"[TOOLS-ERROR] Failed to validate tools connection for {node_id}.{handle_name}: {e}")
            return connection_data
    
    def _extract_single_connection(self, input_name: str, connection_data: Any, state: FlowState) -> Any:
        """
        COMPATIBILITY FIX: Extract single connection data (handles both single dict and multiple list formats).
        
        This method is called by default_connection_extractor and needs to handle many-to-many cases correctly.
        
        Args:
            input_name: Name of the input handle
            connection_data: Connection data (can be dict for single or list for multiple)
            state: Current flow state
            
        Returns:
            Extracted connection data
        """
        try:
            logger.debug(f"[EXTRACT] Processing connection '{input_name}' with format: {type(connection_data)}")
            
            # Handle multiple connections (list format) - CRITICAL FOR MANY-TO-MANY
            if isinstance(connection_data, list):
                logger.debug(f"[EXTRACT] Multiple connections detected for '{input_name}': {len(connection_data)} items")
                
                if not connection_data:
                    logger.warning(f"[EXTRACT] Empty connection list for '{input_name}'")
                    return None
                    
                # Use the multiple connections processor for aggregation
                return self._process_multiple_connections(connection_data, state)
                
            # Handle single connection (dict format) - BACKWARD COMPATIBILITY
            elif isinstance(connection_data, dict):
                logger.debug(f"[EXTRACT] Single connection detected for '{input_name}'")
                return self._process_single_connection(connection_data, state)
                
            else:
                logger.error(f"[EXTRACT] Unsupported connection format for '{input_name}': {type(connection_data)}")
                return None
                
        except Exception as e:
            logger.error(f"[EXTRACT] Error processing connection '{input_name}': {e}")
            import traceback
            logger.error(f"[EXTRACT] Stack trace: {traceback.format_exc()}")
            return None

    def _make_serializable(self, obj):
        """Convert any object to a JSON-serializable format."""
        from datetime import datetime, date
        import uuid
        from langchain_core.tools import BaseTool
        from langchain_core.runnables import Runnable
        
        if obj is None or isinstance(obj, (bool, int, float, str)):
            return obj
        elif isinstance(obj, (datetime, date)):
            return obj.isoformat()
        elif isinstance(obj, uuid.UUID):
            return str(obj)
        elif isinstance(obj, (list, tuple)):
            return [self._make_serializable(item) for item in obj]
        elif isinstance(obj, dict):
            if self._contains_complex_objects(obj):
                return self._filter_complex_objects(obj)
            return {k: self._make_serializable(v) for k, v in obj.items()}
        elif isinstance(obj, (BaseTool, Runnable)) or callable(obj):
            return f"<{obj.__class__.__name__}>"
        elif hasattr(obj, 'model_dump'):
            try:
                return obj.model_dump()
            except Exception:
                return str(obj)
        else:
            return str(obj)
    
    def _contains_complex_objects(self, obj):
        """Check if object contains complex LangChain objects that can't be serialized."""
        if isinstance(obj, dict):
            complex_keys = ['tools', 'tool_names', 'intermediate_steps', 'memory']
            return any(key in obj for key in complex_keys)
        return False
    
    def _filter_complex_objects(self, obj):
        """Filter out complex objects from Agent results, keeping only serializable data."""
        if not isinstance(obj, dict):
            return self._make_serializable(obj)
        
        filtered = {}
        for key, value in obj.items():
            if key in ['tools', 'intermediate_steps']:
                continue
            elif key == 'tool_names':
                if isinstance(value, list):
                    filtered[key] = [str(name) for name in value]
                else:
                    filtered[key] = str(value)
            elif key == 'memory':
                if hasattr(value, 'chat_memory') and hasattr(value.chat_memory, 'messages'):
                    filtered[key] = [msg.content if hasattr(msg, 'content') else str(msg)
                                   for msg in value.chat_memory.messages]
                else:
                    filtered[key] = str(value)
            else:
                filtered[key] = self._make_serializable(value)
        
        return filtered
    
    def get_execution_stats(self) -> Dict[str, Any]:
        """Get execution statistics."""
        return self._execution_stats.copy()
    
    def set_nodes_registry(self, nodes_registry: NodeInstanceRegistry) -> None:
        """Set the nodes registry for connection extraction."""
        # Store the registry locally
        self._nodes_registry = nodes_registry
        
        # This will be called by the main GraphBuilder to provide access to nodes
        if hasattr(self.connection_extractor, 'set_nodes_registry'):
            self.connection_extractor.set_nodes_registry(nodes_registry)
            
        logger.debug(f"🔧 NodeExecutor: nodes_registry set with {len(nodes_registry)} nodes")