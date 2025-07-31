"""
KAI-Fusion Workflow Validation Functions
========================================

This module contains validation functions for testing data flow and integrity
across both workflows:

1. Ingestion Workflow: TimerStartNode → StartNode → WebScraperNode → 
   ChunkSplitterNode → OpenAIEmbedderNode → PGVectorStoreNode → EndNode

2. Query Workflow: StartNode → ReactAgentNode → EndNode with 
   OpenAINode, EnhancedBufferMemoryNode, and RetrieverNode connected to ReactAgentNode

These functions are used to verify that data flows correctly between nodes
and that the expected outputs are produced at each step.
"""

from typing import Dict, Any, List, Optional
from langchain_core.documents import Document
import logging

logger = logging.getLogger(__name__)


def validate_ingestion_data_flow(
    web_scraper_output: List[Document],
    chunk_splitter_output: List[Document],
    embedder_output: Dict[str, Any],
    vector_store_output: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Validate data flow through the ingestion pipeline.
    
    Args:
        web_scraper_output: Output from WebScraperNode
        chunk_splitter_output: Output from ChunkSplitterNode
        embedder_output: Output from OpenAIEmbedderNode
        vector_store_output: Output from PGVectorStoreNode
        
    Returns:
        Dict containing validation results and any errors found
    """
    validation_results = {
        "valid": True,
        "errors": [],
        "warnings": [],
        "details": {}
    }
    
    try:
        # Validate WebScraper output
        if not web_scraper_output:
            validation_results["errors"].append("WebScraper produced no output")
            validation_results["valid"] = False
        else:
            validation_results["details"]["web_scraper_documents"] = len(web_scraper_output)
            for i, doc in enumerate(web_scraper_output):
                if not hasattr(doc, 'page_content') or not doc.page_content.strip():
                    validation_results["errors"].append(f"WebScraper document {i} has no content")
                    validation_results["valid"] = False
                if not hasattr(doc, 'metadata'):
                    validation_results["warnings"].append(f"WebScraper document {i} has no metadata")
        
        # Validate ChunkSplitter output
        if not chunk_splitter_output:
            validation_results["errors"].append("ChunkSplitter produced no output")
            validation_results["valid"] = False
        else:
            validation_results["details"]["chunk_splitter_chunks"] = len(chunk_splitter_output)
            # Check that chunks are smaller than original documents (if any were long enough)
            if web_scraper_output and chunk_splitter_output:
                orig_len = len(web_scraper_output[0].page_content) if web_scraper_output[0].page_content else 0
                chunk_len = len(chunk_splitter_output[0].page_content) if chunk_splitter_output[0].page_content else 0
                if orig_len > 0 and chunk_len > 0 and chunk_len >= orig_len:
                    validation_results["warnings"].append("Chunks may not be smaller than original documents")
        
        # Validate Embedder output
        if not embedder_output:
            validation_results["errors"].append("OpenAIEmbedder produced no output")
            validation_results["valid"] = False
        else:
            # Check required keys in embedder output
            required_keys = ["embedded_docs", "vectors", "embedding_stats"]
            for key in required_keys:
                if key not in embedder_output:
                    validation_results["errors"].append(f"OpenAIEmbedder missing required key: {key}")
                    validation_results["valid"] = False
            
            if "embedding_stats" in embedder_output:
                stats = embedder_output["embedding_stats"]
                validation_results["details"]["embedded_documents"] = stats.get("total_documents", 0)
                validation_results["details"]["successfully_embedded"] = stats.get("successfully_embedded", 0)
                
                if stats.get("successfully_embedded", 0) == 0:
                    validation_results["errors"].append("No documents were successfully embedded")
                    validation_results["valid"] = False
        
        # Validate Vector Store output
        if not vector_store_output:
            validation_results["errors"].append("PGVectorStore produced no output")
            validation_results["valid"] = False
        else:
            # Check required keys in vector store output
            required_keys = ["retriever", "vectorstore", "storage_stats"]
            for key in required_keys:
                if key not in vector_store_output:
                    validation_results["errors"].append(f"PGVectorStore missing required key: {key}")
                    validation_results["valid"] = False
            
            if "storage_stats" in vector_store_output:
                stats = vector_store_output["storage_stats"]
                validation_results["details"]["stored_documents"] = stats.get("documents_stored", 0)
                validation_results["details"]["storage_status"] = stats.get("status", "unknown")
                
                if stats.get("status") != "completed":
                    validation_results["warnings"].append(f"Vector store storage status: {stats.get('status')}")
        
        # Cross-validation between nodes
        if (web_scraper_output and chunk_splitter_output and 
            len(web_scraper_output) > 0 and len(chunk_splitter_output) > 0):
            # Check that we have more chunks than original documents (in most cases)
            if len(chunk_splitter_output) <= len(web_scraper_output):
                validation_results["warnings"].append(
                    f"Chunk count ({len(chunk_splitter_output)}) <= document count ({len(web_scraper_output)})"
                )
        
        if (embedder_output and "embedding_stats" in embedder_output and
            vector_store_output and "storage_stats" in vector_store_output):
            embedded_count = embedder_output["embedding_stats"].get("successfully_embedded", 0)
            stored_count = vector_store_output["storage_stats"].get("documents_stored", 0)
            
            if embedded_count != stored_count:
                validation_results["warnings"].append(
                    f"Embedded count ({embedded_count}) != stored count ({stored_count})"
                )
        
    except Exception as e:
        validation_results["errors"].append(f"Exception during validation: {str(e)}")
        validation_results["valid"] = False
    
    return validation_results


def validate_query_data_flow(
    agent_input: str,
    agent_output: Dict[str, Any],
    memory_state: Any,
    retriever_output: Any
) -> Dict[str, Any]:
    """
    Validate data flow through the query pipeline.
    
    Args:
        agent_input: Input to the ReactAgentNode
        agent_output: Output from ReactAgentNode
        memory_state: State of the conversation memory
        retriever_output: Output from RetrieverNode
        
    Returns:
        Dict containing validation results and any errors found
    """
    validation_results = {
        "valid": True,
        "errors": [],
        "warnings": [],
        "details": {}
    }
    
    try:
        # Validate agent input
        if not agent_input or not agent_input.strip():
            validation_results["errors"].append("Agent received empty or invalid input")
            validation_results["valid"] = False
        else:
            validation_results["details"]["agent_input_length"] = len(agent_input)
        
        # Validate agent output
        if not agent_output:
            validation_results["errors"].append("ReactAgent produced no output")
            validation_results["valid"] = False
        else:
            # Check for required keys in agent output
            if "output" not in agent_output:
                validation_results["errors"].append("ReactAgent output missing 'output' key")
                validation_results["valid"] = False
            else:
                output = agent_output["output"]
                validation_results["details"]["agent_output_length"] = len(str(output)) if output else 0
                
                # Check for reasonable output length
                if output and len(str(output)) < 10:
                    validation_results["warnings"].append("Agent output is unusually short")
            
            # Check for intermediate steps
            if "intermediate_steps" in agent_output:
                steps = agent_output["intermediate_steps"]
                validation_results["details"]["intermediate_steps_count"] = len(steps) if steps else 0
            else:
                validation_results["warnings"].append("No intermediate steps recorded")
        
        # Validate memory state
        if memory_state is not None:
            validation_results["details"]["memory_available"] = True
            # Try to get message count if possible
            try:
                if hasattr(memory_state, 'chat_memory') and hasattr(memory_state.chat_memory, 'messages'):
                    message_count = len(memory_state.chat_memory.messages)
                    validation_results["details"]["memory_message_count"] = message_count
            except Exception:
                pass
        else:
            validation_results["warnings"].append("No memory state provided")
        
        # Validate retriever output
        if retriever_output is not None:
            validation_results["details"]["retriever_available"] = True
            # Check if it's a tool
            if hasattr(retriever_output, 'name') and hasattr(retriever_output, 'func'):
                validation_results["details"]["retriever_tool_name"] = getattr(retriever_output, 'name', 'unknown')
        else:
            validation_results["warnings"].append("No retriever output provided")
        
        # Cross-validation
        # Check that agent input was processed (basic check)
        if agent_input and agent_output and "output" in agent_output:
            # This is a very basic check - in reality, we'd want more sophisticated validation
            if agent_output["output"] == agent_input:
                validation_results["warnings"].append("Agent output identical to input - may indicate no processing")
        
    except Exception as e:
        validation_results["errors"].append(f"Exception during validation: {str(e)}")
        validation_results["valid"] = False
    
    return validation_results


def validate_workflow_integrity(
    workflow_data: Dict[str, Any],
    expected_node_sequence: List[str]
) -> Dict[str, Any]:
    """
    Validate the overall integrity of a workflow.
    
    Args:
        workflow_data: Complete workflow data including nodes and edges
        expected_node_sequence: Expected sequence of node types
        
    Returns:
        Dict containing validation results and any errors found
    """
    validation_results = {
        "valid": True,
        "errors": [],
        "warnings": [],
        "details": {}
    }
    
    try:
        # Validate workflow structure
        if "nodes" not in workflow_data:
            validation_results["errors"].append("Workflow data missing 'nodes' key")
            validation_results["valid"] = False
            return validation_results
            
        if "edges" not in workflow_data:
            validation_results["errors"].append("Workflow data missing 'edges' key")
            validation_results["valid"] = False
            return validation_results
        
        nodes = workflow_data["nodes"]
        edges = workflow_data["edges"]
        
        validation_results["details"]["node_count"] = len(nodes)
        validation_results["details"]["edge_count"] = len(edges)
        
        # Validate node types
        node_types = [node["type"] for node in nodes]
        validation_results["details"]["node_types"] = node_types
        
        # Check for required nodes
        required_nodes = ["StartNode", "EndNode"]
        for required_node in required_nodes:
            if required_node not in node_types:
                validation_results["errors"].append(f"Required node type '{required_node}' not found")
                validation_results["valid"] = False
        
        # Validate expected sequence
        if expected_node_sequence:
            # This is a simplified check - in reality, we'd need to trace the actual path
            for expected_node in expected_node_sequence:
                if expected_node not in node_types:
                    validation_results["warnings"].append(f"Expected node type '{expected_node}' not found in sequence")
        
        # Validate connections
        node_ids = [node["id"] for node in nodes]
        
        # Check that all edge sources and targets exist
        for edge in edges:
            if "source" in edge and edge["source"] not in node_ids:
                validation_results["errors"].append(f"Edge source '{edge['source']}' not found in nodes")
                validation_results["valid"] = False
            if "target" in edge and edge["target"] not in node_ids:
                validation_results["errors"].append(f"Edge target '{edge['target']}' not found in nodes")
                validation_results["valid"] = False
        
        # Check for disconnected nodes (simplified)
        connected_nodes = set()
        for edge in edges:
            if "source" in edge:
                connected_nodes.add(edge["source"])
            if "target" in edge:
                connected_nodes.add(edge["target"])
        
        disconnected_nodes = set(node_ids) - connected_nodes
        if disconnected_nodes:
            validation_results["warnings"].append(f"Disconnected nodes: {list(disconnected_nodes)}")
        
        # Check for start and end nodes
        start_nodes = [node for node in nodes if node["type"] == "StartNode"]
        end_nodes = [node for node in nodes if node["type"] == "EndNode"]
        
        if not start_nodes:
            validation_results["errors"].append("No StartNode found")
            validation_results["valid"] = False
        elif len(start_nodes) > 1:
            validation_results["warnings"].append(f"Multiple StartNodes found: {len(start_nodes)}")
        
        if not end_nodes:
            validation_results["errors"].append("No EndNode found")
            validation_results["valid"] = False
        elif len(end_nodes) > 1:
            validation_results["warnings"].append(f"Multiple EndNodes found: {len(end_nodes)}")
            
    except Exception as e:
        validation_results["errors"].append(f"Exception during workflow integrity validation: {str(e)}")
        validation_results["valid"] = False
    
    return validation_results


# Export validation functions
__all__ = [
    "validate_ingestion_data_flow",
    "validate_query_data_flow",
    "validate_workflow_integrity"
]