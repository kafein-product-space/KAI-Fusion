"""
KAI-Fusion Enhanced Graph Builder - Reliable Connection Management Integration
============================================================================

Enhanced GraphBuilder with improved connection mapping, error handling, and validation.
"""

from typing import Dict, Any, List, Optional, Union, AsyncGenerator
from dataclasses import dataclass
import logging
import time

from .graph_builder import GraphBuilder as BaseGraphBuilder
from .connection_manager import ConnectionManager, NodeConnectionMap
from .state import FlowState
from app.nodes.base import BaseNode

logger = logging.getLogger(__name__)


class EnhancedGraphBuilder(BaseGraphBuilder):
    """
    Enhanced GraphBuilder with reliable connection management.
    
    Improvements:
    - Robust connection mapping with validation
    - Enhanced error handling and recovery
    - Connection caching for performance
    - Comprehensive logging and monitoring
    """
    
    def __init__(self, node_registry: Dict[str, type[BaseNode]], checkpointer=None):
        super().__init__(node_registry, checkpointer)
        self.connection_manager = ConnectionManager()
        self._build_metrics = {}
    
    def _instantiate_nodes(self, nodes: List[Dict[str, Any]]):
        """Enhanced node instantiation with reliable connection mapping."""
        if nodes:
            logger.info(f"🏭 ENHANCED NODE INSTANTIATION ({len(nodes)} nodes)")
        
        start_time = time.time()
        
        # First pass: Create all node instances
        for node_def in nodes:
            node_id = node_def["id"]
            node_type = node_def["type"]
            user_data = node_def.get("data", {})

            if node_id in self.control_flow_nodes:
                continue  # Skip control flow nodes

            try:
                # Get node class and create instance
                node_cls = self.node_registry.get(node_type)
                if not node_cls:
                    available_types = list(self.node_registry.keys())
                    logger.error(f"❌ Unknown node type: {node_type}. Available: {available_types}")
                    raise ValueError(f"Unknown node type: {node_type}. Available types: {available_types}")

                instance = node_cls()
                instance.node_id = node_id
                instance.user_data = user_data

                # Create GraphNodeInstance
                from .graph_builder import GraphNodeInstance
                self.nodes[node_id] = GraphNodeInstance(
                    id=node_id,
                    type=node_type,
                    node_instance=instance,
                    metadata={},
                    user_data=user_data,
                )
                
                logger.info(f"   ✅ Created {node_id} ({node_type})")
                
            except Exception as e:
                logger.error(f"❌ Failed to create node {node_id}: {e}")
                raise ValueError(f"Failed to create node {node_id}: {e}") from e
        
        # Second pass: Build connection mappings using ConnectionManager
        try:
            logger.info("🔗 Building enhanced connection mappings")
            connection_mappings = self.connection_manager.build_connection_mappings(
                self.connections, 
                {node_id: gnode.node_instance for node_id, gnode in self.nodes.items()}
            )
            
            # Apply connection mappings to node instances
            self._apply_connection_mappings(connection_mappings)
            
            # Log connection statistics
            stats = self.connection_manager.get_connection_stats()
            logger.info(f"📊 Connection Stats: {stats}")
            
        except Exception as e:
            logger.error(f"❌ Connection mapping failed: {e}")
            raise ValueError(f"Connection mapping failed: {e}") from e
        
        # Record build metrics
        build_duration = time.time() - start_time
        self._build_metrics = {
            "node_count": len(nodes),
            "connection_count": len(self.connections),
            "build_duration": build_duration,
            "connection_stats": self.connection_manager.get_connection_stats()
        }
        
        logger.info(f"⚡ Enhanced instantiation completed in {build_duration:.3f}s")
    
    def _apply_connection_mappings(self, connection_mappings: Dict[str, NodeConnectionMap]):
        """Apply connection mappings to node instances."""
        for node_id, connection_map in connection_mappings.items():
            if node_id not in self.nodes:
                continue
            
            node_instance = self.nodes[node_id].node_instance
            
            # Convert ConnectionInfo objects to the format expected by nodes
            input_connections = {}
            output_connections = {}
            
            # Process input connections
            for handle, conn_info in connection_map.input_connections.items():
                input_connections[handle] = {
                    "source_node_id": conn_info.source_node_id,
                    "source_handle": conn_info.source_handle,
                    "data_type": conn_info.data_type,
                    "status": conn_info.status.value,
                    "validation_errors": conn_info.validation_errors
                }
                logger.debug(f"[ENHANCED] Input: {node_id}.{handle} <- {conn_info.source_node_id}.{conn_info.source_handle}")
            
            # Process output connections
            for handle, conn_list in connection_map.output_connections.items():
                output_connections[handle] = []
                for conn_info in conn_list:
                    output_connections[handle].append({
                        "target_node_id": conn_info.target_node_id,
                        "target_handle": conn_info.target_handle,
                        "data_type": conn_info.data_type,
                        "status": conn_info.status.value,
                        "validation_errors": conn_info.validation_errors
                    })
                    logger.debug(f"[ENHANCED] Output: {node_id}.{handle} -> {conn_info.target_node_id}.{conn_info.target_handle}")
            
            # Set enhanced connection mappings on node instance
            node_instance._input_connections = input_connections
            node_instance._output_connections = output_connections
            
            # Log connection summary
            input_count = len(input_connections)
            output_count = sum(len(conns) for conns in output_connections.values())
            logger.info(f"   🔗 {node_id}: {input_count} inputs, {output_count} outputs")
    
    def get_build_metrics(self) -> Dict[str, Any]:
        """Get detailed build metrics."""
        return self._build_metrics.copy()
    
    def validate_workflow(self, flow_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate workflow before building.
        
        Returns:
            Validation result with errors and warnings
        """
        logger.info("🔍 Validating workflow structure")
        
        validation_result = {
            "valid": True,
            "errors": [],
            "warnings": [],
            "node_count": 0,
            "connection_count": 0
        }
        
        nodes = flow_data.get("nodes", [])
        edges = flow_data.get("edges", [])
        
        validation_result["node_count"] = len(nodes)
        validation_result["connection_count"] = len(edges)
        
        # Validate nodes
        node_ids = set()
        start_node_ids = set()
        for node in nodes:
            node_id = node.get("id")
            node_type = node.get("type")
            
            if not node_id:
                validation_result["errors"].append("Node missing ID")
                continue
            
            if node_id in node_ids:
                validation_result["errors"].append(f"Duplicate node ID: {node_id}")
            node_ids.add(node_id)
            
            # Track StartNode IDs separately since they are filtered out during build
            if node_type == "StartNode":
                start_node_ids.add(node_id)
                continue
            
            if not node_type:
                validation_result["errors"].append(f"Node {node_id} missing type")
                continue
            
            if node_type not in self.node_registry:
                validation_result["errors"].append(f"Unknown node type: {node_type}")
        
        # Validate edges
        for edge in edges:
            source = edge.get("source")
            target = edge.get("target")
            
            if not source or not target:
                validation_result["errors"].append("Edge missing source or target")
                continue
            
            # Check if source is a StartNode, which is filtered out during build
            if source in start_node_ids:
                # StartNode edges are handled separately in the build process
                continue
            
            if source not in node_ids:
                validation_result["errors"].append(f"Edge references unknown source node: {source}")
            
            if target not in node_ids and target not in start_node_ids:
                validation_result["errors"].append(f"Edge references unknown target node: {target}")
        
        # Check for required StartNode and EndNode
        start_nodes = [n for n in nodes if n.get("type") == "StartNode"]
        end_nodes = [n for n in nodes if n.get("type") == "EndNode"]
        
        if not start_nodes:
            validation_result["errors"].append("Workflow must contain at least one StartNode")
        
        if not end_nodes:
            validation_result["warnings"].append("No EndNode found - virtual EndNode will be created")
        
        validation_result["valid"] = len(validation_result["errors"]) == 0
        
        logger.info(f"✅ Validation complete: {'VALID' if validation_result['valid'] else 'INVALID'}")
        if validation_result["errors"]:
            logger.error(f"❌ Validation errors: {validation_result['errors']}")
        if validation_result["warnings"]:
            logger.warning(f"⚠️ Validation warnings: {validation_result['warnings']}")
        
        return validation_result
    
    def build_from_flow(self, flow_data: Dict[str, Any], user_id: Optional[str] = None):
        """Enhanced build_from_flow with validation and error handling."""
        logger.info("🚀 Starting enhanced workflow build")
        
        # Pre-build validation
        validation_result = self.validate_workflow(flow_data)
        if not validation_result["valid"]:
            error_msg = f"Workflow validation failed: {validation_result['errors']}"
            logger.error(f"❌ {error_msg}")
            raise ValueError(error_msg)
        
        try:
            # Use parent implementation with enhanced connection handling
            result = super().build_from_flow(flow_data, user_id)
            
            # Log success metrics
            metrics = self.get_build_metrics()
            logger.info(f"✅ Enhanced build completed successfully")
            logger.info(f"📊 Build metrics: {metrics}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Enhanced build failed: {e}")
            # Clear any partial state
            self.nodes.clear()
            self.connections.clear()
            self.connection_manager.clear_cache()
            raise
    
    async def execute_with_monitoring(
        self,
        inputs: Dict[str, Any],
        session_id: Optional[str] = None,
        user_id: Optional[str] = None,
        workflow_id: Optional[str] = None,
        stream: bool = False,
    ) -> Union[Dict[str, Any], AsyncGenerator[Dict[str, Any], None]]:
        """Execute workflow with enhanced monitoring and error handling."""
        logger.info(f"🎯 Starting enhanced execution (session: {session_id})")
        
        execution_start = time.time()
        
        try:
            # Use parent execute method
            result = await self.execute(inputs, session_id, user_id, workflow_id, stream)
            
            execution_duration = time.time() - execution_start
            logger.info(f"✅ Enhanced execution completed in {execution_duration:.3f}s")
            
            return result
            
        except Exception as e:
            execution_duration = time.time() - execution_start
            logger.error(f"❌ Enhanced execution failed after {execution_duration:.3f}s: {e}")
            raise