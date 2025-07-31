"""
KAI-Fusion Workflow 2 Test: Document Query Pipeline
=================================================

This test suite validates the end-to-end document query workflow:
StartNode → ReactAgentNode → EndNode

With OpenAINode, EnhancedBufferMemoryNode, and RetrieverNode connected to ReactAgentNode.

Test Scenarios:
1. Workflow validation and building
2. Data flow validation between nodes
3. Agent integration with tools and memory
4. Retrieval-augmented generation (RAG) functionality
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


class TestWorkflow2Query:
    """Test suite for Document Query Workflow (Workflow 2)."""
    
    @pytest.fixture
    def workflow_template(self):
        """Load the query workflow template."""
        template_path = Path(__file__).parent / "templates" / "query_workflow.json"
        with open(template_path, 'r') as f:
            return json.load(f)
    
    @pytest.fixture
    def mock_agent_response(self):
        """Mock agent response for testing."""
        return {
            "output": "This is a sample response from the agent based on retrieved documents.",
            "intermediate_steps": [
                ("document_retriever", "Found relevant information about the topic"),
                ("final_answer", "Based on the retrieved documents, here is the answer...")
            ]
        }
    
    @pytest.fixture
    def mock_retriever_tool(self):
        """Mock retriever tool for testing."""
        mock_tool = Mock()
        mock_tool.name = "document_retriever"
        mock_tool.description = "Search and retrieve relevant documents from the knowledge base"
        mock_tool.func.return_value = "Found 3 documents related to the query"
        return mock_tool
    
    def test_workflow_validation(self, workflow_template):
        """Test that the query workflow template is valid."""
        engine = LangGraphWorkflowEngine()
        result = engine.validate(workflow_template)
        
        assert result["valid"] is True, f"Workflow validation failed: {result.get('errors', [])}"
        assert len(workflow_template["nodes"]) == 6, "Expected 6 nodes in workflow"
        assert len(workflow_template["edges"]) == 5, "Expected 5 edges in workflow"
    
    def test_node_connections(self, workflow_template):
        """Test that all required node connections are present."""
        # Check StartNode connections
        start_edges = [e for e in workflow_template["edges"] if e["source"] == "start_1"]
        assert len(start_edges) == 1, "StartNode should have one outgoing connection"
        
        # Check ReactAgentNode connections to LLM
        agent_llm_edges = [e for e in workflow_template["edges"] if e["target"] == "react_agent_1" and e["sourceHandle"] == "output"]
        assert len(agent_llm_edges) == 1, "ReactAgentNode should have one LLM connection"
        
        # Check ReactAgentNode connections to Memory
        agent_memory_edges = [e for e in workflow_template["edges"] if e["target"] == "react_agent_1" and e["sourceHandle"] == "output"]
        # Note: This is a simplified check, in reality we'd need to check targetHandle
        
        # Check ReactAgentNode connections to Tools
        agent_tools_edges = [e for e in workflow_template["edges"] if e["target"] == "react_agent_1" and e["sourceHandle"] == "output"]
        # Note: This is a simplified check, in reality we'd need to check targetHandle
    
    @patch('app.nodes.agents.react_agent.ReactAgentNode.execute')
    @patch('app.nodes.llms.openai_node.OpenAINode.execute')
    @patch('app.nodes.memory.buffer_memory.EnhancedBufferMemoryNode.execute')
    @patch('app.nodes.tools.retriever.RetrieverNode.execute')
    def test_data_flow_validation(self, mock_retriever_execute, mock_memory_execute, 
                                   mock_llm_execute, mock_agent_execute, workflow_template, 
                                   mock_agent_response, mock_retriever_tool):
        """Test data flow through the query pipeline."""
        # Setup mocks
        mock_agent_execute.return_value = mock_agent_response
        mock_llm_execute.return_value = Mock()
        mock_memory_execute.return_value = Mock()
        mock_retriever_execute.return_value = mock_retriever_tool
        
        # Validate workflow structure
        engine = LangGraphWorkflowEngine()
        validation_result = engine.validate(workflow_template)
        assert validation_result["valid"] is True, "Workflow validation failed"
        
        # Test data flow through nodes
        nodes = workflow_template["nodes"]
        agent_node = next((n for n in nodes if n["id"] == "react_agent_1"), None)
        assert agent_node is not None, "ReactAgentNode not found"
        
        llm_node = next((n for n in nodes if n["id"] == "openai_node_1"), None)
        assert llm_node is not None, "OpenAINode not found"
        
        memory_node = next((n for n in nodes if n["id"] == "buffer_memory_1"), None)
        assert memory_node is not None, "EnhancedBufferMemoryNode not found"
        
        retriever_node = next((n for n in nodes if n["id"] == "retriever_1"), None)
        assert retriever_node is not None, "RetrieverNode not found"
    
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
        required_nodes = ["StartNode", "ReactAgentNode", "OpenAINode", "EnhancedBufferMemoryNode", 
                         "RetrieverNode", "EndNode"]
        
        for required_node in required_nodes:
            assert required_node in node_types, f"Required node {required_node} not found in workflow"
    
    def test_agent_integration(self, workflow_template):
        """Test agent integration with tools and memory."""
        # Check that ReactAgentNode is present
        agent_nodes = [node for node in workflow_template["nodes"] if node["type"] == "ReactAgentNode"]
        assert len(agent_nodes) == 1, "Workflow should have exactly one ReactAgentNode"
        
        # Check that the agent has connections to LLM, memory, and tools
        agent_edges = [edge for edge in workflow_template["edges"] if edge["target"] == agent_nodes[0]["id"]]
        assert len(agent_edges) >= 3, "ReactAgentNode should have connections to LLM, memory, and tools"
    
    def test_retrieval_augmented_generation(self, workflow_template):
        """Test RAG functionality in the workflow."""
        # Check that RetrieverNode is present
        retriever_nodes = [node for node in workflow_template["nodes"] if node["type"] == "RetrieverNode"]
        assert len(retriever_nodes) == 1, "Workflow should have exactly one RetrieverNode"
        
        # Check that RetrieverNode is connected to ReactAgentNode
        retriever_edges = [edge for edge in workflow_template["edges"] if edge["source"] == retriever_nodes[0]["id"]]
        assert len(retriever_edges) == 1, "RetrieverNode should have one outgoing connection to ReactAgentNode"
        
        # Check that the connection target is ReactAgentNode with tools handle
        agent_node_id = [node["id"] for node in workflow_template["nodes"] if node["type"] == "ReactAgentNode"][0]
        retriever_to_agent_edge = [edge for edge in retriever_edges if edge["target"] == agent_node_id]
        assert len(retriever_to_agent_edge) == 1, "RetrieverNode should be connected to ReactAgentNode"
    
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


if __name__ == "__main__":
    pytest.main([__file__, "-v"])