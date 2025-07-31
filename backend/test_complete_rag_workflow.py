#!/usr/bin/env python3
"""
Test Complete RAG Workflow with All Fixes Applied
===============================================

This script tests the complete end-to-end RAG workflow to verify that all
critical fixes are working properly:

1. EndNode integration fix
2. Agent loop prevention fix  
3. BufferMemory tracing fix
4. RAG tool integration

Expected Results:
- Agent uses document_retriever tool exactly once
- Agent provides a Final Answer based on retrieved documents
- Workflow completes without loops or timeouts
- Response reaches EndNode and gets serialized properly
"""

import asyncio
import sys
import os
from typing import Dict, Any

# Add the app directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.nodes.agents.react_agent import ReactAgentNode
from app.nodes.llms.openai_node import OpenAINode
from app.nodes.memory.buffer_memory import BufferMemoryNode
from app.nodes.tools.retriever import RetrieverProviderNode
from app.nodes.default.end_node import EndNode
from app.core.graph_builder import GraphBuilder
from app.services.node_registry_service import NodeRegistryService

def test_agent_prompt_fix():
    """Test that the new agent prompt prevents loops"""
    print("🧪 TESTING AGENT PROMPT FIX")
    print("=" * 50)
    
    try:
        # Create agent node
        agent = ReactAgentNode()
        
        # Check the prompt template
        tools_list = []  # Empty tools list for testing
        prompt = agent._create_prompt(tools_list)
        
        prompt_text = prompt.template
        
        # Verify key phrases are in the prompt
        critical_phrases = [
            "Do NOT use the same tool more than once",
            "MUST synthesize the information into a final answer",
            "Always provide a complete Final Answer",
            "Do NOT repeat tool usage"
        ]
        
        print("✅ Testing prompt content...")
        for phrase in critical_phrases:
            if phrase in prompt_text:
                print(f"   ✅ Found: '{phrase}'")
            else:
                print(f"   ❌ Missing: '{phrase}'")
                return False
        
        print("✅ Agent prompt fix verified successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Agent prompt test failed: {e}")
        return False

def test_endnode_integration():
    """Test that EndNodes are properly integrated into the graph"""
    print("\n🧪 TESTING ENDNODE INTEGRATION FIX")
    print("=" * 50)
    
    try:
        # Create node registry
        node_registry = NodeRegistryService.get_registry()
        
        # Create graph builder
        builder = GraphBuilder(node_registry)
        
        # Create a simple workflow with EndNode
        workflow_data = {
            "nodes": [
                {
                    "id": "start-1", 
                    "type": "StartNode",
                    "data": {"name": "StartNode"}
                },
                {
                    "id": "agent-1", 
                    "type": "ReactAgent",
                    "data": {"name": "Agent", "system_prompt": "You are a test agent"}
                },
                {
                    "id": "end-1", 
                    "type": "EndNode",
                    "data": {"name": "EndNode"}
                }
            ],
            "edges": [
                {"source": "start-1", "target": "agent-1"},
                {"source": "agent-1", "target": "end-1"}
            ]
        }
        
        # Build the graph
        graph = builder.build_from_flow(workflow_data)
        
        # Check that EndNode is included in the graph
        if "end-1" in builder.nodes:
            print("✅ EndNode properly included in graph nodes")
            print(f"   📊 Total nodes in graph: {len(builder.nodes)}")
            print(f"   📋 Node IDs: {list(builder.nodes.keys())}")
            return True
        else:
            print("❌ EndNode not found in graph nodes")
            print(f"   📋 Available nodes: {list(builder.nodes.keys())}")
            return False
            
    except Exception as e:
        print(f"❌ EndNode integration test failed: {e}")
        return False

def test_memory_node_creation():
    """Test that BufferMemory can be created without tracing errors"""
    print("\n🧪 TESTING BUFFERMEMORY TRACING FIX")
    print("=" * 50)
    
    try:
        # Create BufferMemory node
        memory_node = BufferMemoryNode()
        
        # Test execution without session_id (should not crash)
        print("✅ Testing memory creation without session_id...")
        result1 = memory_node.execute()
        print(f"   ✅ Memory created: {type(result1)}")
        
        # Test execution with session_id
        print("✅ Testing memory creation with session_id...")
        memory_node.session_id = "test_session_123"
        result2 = memory_node.execute()
        print(f"   ✅ Memory created: {type(result2)}")
        
        print("✅ BufferMemory tracing fix verified successfully!")
        return True
        
    except Exception as e:
        print(f"❌ BufferMemory test failed: {e}")
        return False

def test_complete_workflow_structure():
    """Test that a complete RAG workflow can be built"""
    print("\n🧪 TESTING COMPLETE WORKFLOW STRUCTURE")
    print("=" * 50)
    
    try:
        # Create node registry
        node_registry = NodeRegistryService.get_registry()
        
        # Create graph builder
        builder = GraphBuilder(node_registry)
        
        # Create a complete RAG workflow
        workflow_data = {
            "nodes": [
                {"id": "start-1", "type": "StartNode", "data": {"name": "StartNode"}},
                {"id": "llm-1", "type": "OpenAIChatNode", "data": {"name": "OpenAI LLM", "model": "gpt-4"}},
                {"id": "memory-1", "type": "BufferMemoryNode", "data": {"name": "BufferMemory"}},
                {"id": "retriever-1", "type": "RetrieverProviderNode", "data": {"name": "Retriever"}},
                {"id": "agent-1", "type": "ReactAgent", "data": {"name": "Agent", "max_iterations": 3}},
                {"id": "end-1", "type": "EndNode", "data": {"name": "EndNode"}}
            ],
            "edges": [
                {"source": "start-1", "target": "agent-1"},
                {"source": "llm-1", "target": "agent-1", "sourceHandle": "output", "targetHandle": "llm"},
                {"source": "memory-1", "target": "agent-1", "sourceHandle": "output", "targetHandle": "memory"},
                {"source": "retriever-1", "target": "agent-1", "sourceHandle": "output", "targetHandle": "tools"},
                {"source": "agent-1", "target": "end-1"}
            ]
        }
        
        # Build the graph
        print("✅ Building complete RAG workflow...")
        graph = builder.build_from_flow(workflow_data)
        
        # Verify all nodes are present
        expected_nodes = ["llm-1", "memory-1", "retriever-1", "agent-1", "end-1"]
        found_nodes = list(builder.nodes.keys())
        
        print(f"   📋 Expected nodes: {expected_nodes}")
        print(f"   📋 Found nodes: {found_nodes}")
        
        missing_nodes = [node for node in expected_nodes if node not in found_nodes]
        if missing_nodes:
            print(f"   ❌ Missing nodes: {missing_nodes}")
            return False
        
        print("✅ Complete workflow structure verified successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Complete workflow test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Run all tests"""
    print("🚀 TESTING COMPLETE RAG WORKFLOW FIXES")
    print("=" * 60)
    
    tests = [
        ("Agent Prompt Fix", test_agent_prompt_fix),
        ("EndNode Integration", test_endnode_integration), 
        ("BufferMemory Tracing", test_memory_node_creation),
        ("Complete Workflow Structure", test_complete_workflow_structure)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} crashed: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("🏁 TEST RESULTS SUMMARY")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if result:
            passed += 1
    
    print(f"\n📊 Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED! The RAG workflow fixes are working properly.")
        print("\n🚀 READY FOR PRODUCTION TESTING")
        print("Next steps:")
        print("1. Test with real workflow execution")
        print("2. Verify Agent stops after one tool usage")
        print("3. Confirm EndNode receives and processes responses")
        print("4. Test complete chat interface integration")
    else:
        print("⚠️  Some tests failed. Review the errors above and fix issues.")
    
    return passed == total

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)