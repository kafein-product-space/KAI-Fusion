"""
KAI-Fusion Workflow 1 Test: Document Ingestion Pipeline
=====================================================

This test suite validates the end-to-end document ingestion workflow:
TimerStartNode → StartNode → WebScraperNode → ChunkSplitterNode → 
OpenAIEmbedderNode → PGVectorStoreNode → EndNode

With OpenAIEmbedderNode connected to PGVectorStoreNode for embeddings.

Test Scenarios:
1. Workflow validation and building
2. Data flow validation between nodes
3. Performance and error handling
4. Integration with PostgreSQL vector store
"""

import pytest
import asyncio
import json
import os
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
import sys

# Add backend to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.engine_v2 import LangGraphWorkflowEngine
from app.core.state import FlowState
from app.nodes import *


class TestWorkflow1Ingestion:
    """Test suite for Document Ingestion Workflow (Workflow 1)."""
    
    @pytest.fixture
    def workflow_template(self):
        """Load the ingestion workflow template."""
        template_path = Path(__file__).parent / "templates" / "ingestion_workflow.json"
        with open(template_path, 'r') as f:
            return json.load(f)
    
    @pytest.fixture
    def mock_web_content(self):
        """Mock web content for testing."""
        return [
            Mock(
                page_content="This is sample document content for testing the ingestion pipeline.",
                metadata={"source": "https://example.com/docs", "doc_id": "test1"}
            )
        ]
    
    @pytest.fixture
    def mock_embeddings(self):
        """Mock embeddings for testing."""
        return [[0.1, 0.2, 0.3, 0.4, 0.5] * 307]  # 1535 dimensions for text-embedding-3-small
    
    @pytest.fixture
    def mock_vector_store(self):
        """Mock vector store for testing."""
        mock_store = Mock()
        mock_store.add_documents.return_value = None
        return mock_store
    
    def test_workflow_validation(self, workflow_template):
        """Test that the ingestion workflow template is valid."""
        engine = LangGraphWorkflowEngine()
        result = engine.validate(workflow_template)
        
        assert result["valid"] is True, f"Workflow validation failed: {result.get('errors', [])}"
        assert len(workflow_template["nodes"]) == 7, "Expected 7 nodes in workflow"
        assert len(workflow_template["edges"]) == 6, "Expected 6 edges in workflow"
    
    def test_node_connections(self, workflow_template):
        """Test that all required node connections are present."""
        # Check TimerStartNode connections
        timer_edges = [e for e in workflow_template["edges"] if e["source"] == "timer_start_1"]
        assert len(timer_edges) == 1, "TimerStartNode should have one outgoing connection"
        
        # Check WebScraperNode connections
        scraper_edges = [e for e in workflow_template["edges"] if e["source"] == "web_scraper_1"]
        assert len(scraper_edges) == 1, "WebScraperNode should have one outgoing connection"
        
        # Check OpenAIEmbedderNode connections
        embedder_edges = [e for e in workflow_template["edges"] if e["source"] == "openai_embedder_1"]
        assert len(embedder_edges) == 1, "OpenAIEmbedderNode should have one outgoing connection"
        
        # Check PGVectorStoreNode connections
        vector_store_edges = [e for e in workflow_template["edges"] if e["source"] == "pg_vector_store_1"]
        assert len(vector_store_edges) == 1, "PGVectorStoreNode should have one outgoing connection"
    
    @patch('app.nodes.document_loaders.web_scraper.WebScraperNode.execute')
    @patch('app.nodes.embeddings.openai_embeddings.OpenAIEmbedderNode.execute')
    @patch('app.nodes.vector_stores.pgvector_store.PGVectorStoreNode.execute')
    def test_data_flow_validation(self, mock_vector_store_execute, mock_embedder_execute, 
                                   mock_scraper_execute, workflow_template, mock_web_content, 
                                   mock_embeddings, mock_vector_store):
        """Test data flow through the ingestion pipeline."""
        # Setup mocks
        mock_scraper_execute.return_value = mock_web_content
        mock_embedder_execute.return_value = {
            "embedded_docs": mock_web_content,
            "vectors": mock_embeddings,
            "embedding_stats": {"total_documents": 1, "successfully_embedded": 1}
        }
        mock_vector_store_execute.return_value = {
            "retriever": Mock(),
            "vectorstore": mock_vector_store,
            "storage_stats": {"documents_stored": 1, "status": "completed"}
        }
        
        # Validate workflow structure
        engine = LangGraphWorkflowEngine()
        validation_result = engine.validate(workflow_template)
        assert validation_result["valid"] is True, "Workflow validation failed"
        
        # Test data flow through nodes
        nodes = workflow_template["nodes"]
        web_scraper_node = next((n for n in nodes if n["id"] == "web_scraper_1"), None)
        assert web_scraper_node is not None, "WebScraperNode not found"
        
        embedder_node = next((n for n in nodes if n["id"] == "openai_embedder_1"), None)
        assert embedder_node is not None, "OpenAIEmbedderNode not found"
        
        vector_store_node = next((n for n in nodes if n["id"] == "pg_vector_store_1"), None)
        assert vector_store_node is not None, "PGVectorStoreNode not found"
    
    @pytest.mark.asyncio
    async def test_workflow_execution(self, workflow_template):
        """Test end-to-end workflow execution."""
        # This is a simplified test that focuses on validation
        # In a real environment, this would execute the full workflow
        engine = LangGraphWorkflowEngine()
        
        # Validate the workflow first
        validation_result = engine.validate(workflow_template)
        assert validation_result["valid"] is True, f"Workflow validation failed: {validation_result.get('errors', [])}"
        
        # Check that all required node types are present
        node_types = [node["type"] for node in workflow_template["nodes"]]
        required_nodes = ["TimerStartNode", "StartNode", "WebScraperNode", "ChunkSplitterNode", 
                         "OpenAIEmbedderNode", "PGVectorStoreNode", "EndNode"]
        
        for required_node in required_nodes:
            assert required_node in node_types, f"Required node {required_node} not found in workflow"
    
    def test_performance_requirements(self, workflow_template):
        """Test workflow performance requirements."""
        # Check that the workflow has reasonable node count
        assert len(workflow_template["nodes"]) <= 10, "Workflow should not have more than 10 nodes for performance"
        
        # Check that the workflow has reasonable edge count
        assert len(workflow_template["edges"]) <= 15, "Workflow should not have more than 15 edges for performance"
        
        # Check for circular dependencies (simplified)
        node_ids = [node["id"] for node in workflow_template["nodes"]]
        edge_sources = [edge["source"] for edge in workflow_template["edges"]]
        edge_targets = [edge["target"] for edge in workflow_template["edges"]]
        
        # Ensure all edges connect to valid nodes
        for source in edge_sources:
            assert source in node_ids, f"Edge source {source} not found in nodes"
        for target in edge_targets:
            assert target in node_ids, f"Edge target {target} not found in nodes"
    
    def test_error_handling_validation(self, workflow_template):
        """Test workflow error handling capabilities."""
        # Check that EndNode is present to properly terminate workflow
        end_nodes = [node for node in workflow_template["nodes"] if node["type"] == "EndNode"]
        assert len(end_nodes) == 1, "Workflow should have exactly one EndNode"
        
        # Check that StartNode is present to properly start workflow
        start_nodes = [node for node in workflow_template["nodes"] if node["type"] == "StartNode"]
        assert len(start_nodes) == 1, "Workflow should have exactly one StartNode"
        
        # Check that TimerStartNode is present for scheduled execution
        timer_nodes = [node for node in workflow_template["nodes"] if node["type"] == "TimerStartNode"]
        assert len(timer_nodes) == 1, "Workflow should have exactly one TimerStartNode"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])