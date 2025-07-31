#!/usr/bin/env python3
"""
Test script to verify BufferMemory and Agent connection fixes
"""

import sys
import os
import asyncio
from typing import Dict, Any

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '.'))

from app.nodes.memory.buffer_memory import BufferMemoryNode
from app.nodes.agents.react_agent import ReactAgentNode
from app.nodes.llms.openai_chat import OpenAIChatNode
from langchain_core.runnables import RunnableLambda

def test_buffer_memory_node():
    """Test BufferMemory node creation and basic functionality"""
    print("🧪 Testing BufferMemory Node...")
    
    try:
        # Create BufferMemory node
        buffer_node = BufferMemoryNode()
        buffer_node.session_id = "test_session_123"
        
        # Execute the node
        memory_runnable = buffer_node.execute(
            memory_key="memory",
            return_messages=True,
            input_key="input",
            output_key="output"
        )
        
        print("✅ BufferMemory node created successfully")
        print(f"   Type: {type(memory_runnable)}")
        
        # Test if memory has required methods
        if hasattr(memory_runnable, 'load_memory_variables'):
            test_vars = memory_runnable.load_memory_variables({})
            print(f"   Memory variables: {list(test_vars.keys())}")
            print("✅ BufferMemory is functional")
        else:
            print("❌ BufferMemory missing required methods")
            return False
            
        return True
        
    except Exception as e:
        print(f"❌ BufferMemory test failed: {e}")
        return False

def test_agent_without_memory():
    """Test Agent node without memory connection"""
    print("\n🧪 Testing Agent Node (without memory)...")
    
    try:
        # Create mock LLM for testing
        def mock_llm_invoke(inputs):
            return {"output": "Test response from mock LLM"}
        
        mock_llm = RunnableLambda(mock_llm_invoke)
        
        # Create Agent node
        agent_node = ReactAgentNode()
        agent_node.user_data = {
            "max_iterations": 1,
            "system_prompt": "You are a test assistant.",
            "prompt_instructions": ""
        }
        
        # Test without memory
        connected_nodes = {"llm": mock_llm}
        
        try:
            agent_runnable = agent_node.execute(
                inputs={"input": "Hello, this is a test"},
                connected_nodes=connected_nodes
            )
            print("✅ Agent node created successfully without memory")
            return True
        except Exception as e:
            print(f"❌ Agent creation failed: {e}")
            return False
            
    except Exception as e:
        print(f"❌ Agent test failed: {e}")
        return False

def test_agent_with_memory():
    """Test Agent node with memory connection"""
    print("\n🧪 Testing Agent Node (with memory)...")
    
    try:
        # Create BufferMemory
        buffer_node = BufferMemoryNode()
        buffer_node.session_id = "test_session_456"
        memory = buffer_node.execute()
        
        # Create mock LLM
        def mock_llm_invoke(inputs):
            return {"output": "Test response with memory from mock LLM"}
        
        mock_llm = RunnableLambda(mock_llm_invoke)
        
        # Create Agent node
        agent_node = ReactAgentNode()
        agent_node.user_data = {
            "max_iterations": 1,
            "system_prompt": "You are a test assistant.",
            "prompt_instructions": ""
        }
        
        # Test with memory
        connected_nodes = {"llm": mock_llm, "memory": memory}
        
        try:
            agent_runnable = agent_node.execute(
                inputs={"input": "Hello, this is a test with memory"},
                connected_nodes=connected_nodes
            )
            print("✅ Agent node created successfully with memory")
            return True
        except Exception as e:
            print(f"❌ Agent with memory creation failed: {e}")
            return False
            
    except Exception as e:
        print(f"❌ Agent with memory test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🔧 Testing BufferMemory and Agent Connection Fixes")
    print("=" * 50)
    
    results = []
    
    # Test 1: BufferMemory Node
    results.append(test_buffer_memory_node())
    
    # Test 2: Agent without memory
    results.append(test_agent_without_memory())
    
    # Test 3: Agent with memory
    results.append(test_agent_with_memory())
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Results Summary:")
    test_names = [
        "BufferMemory Node",
        "Agent without Memory",
        "Agent with Memory"
    ]
    
    passed = 0
    for i, result in enumerate(results):
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {test_names[i]}: {status}")
        if result:
            passed += 1
    
    print(f"\n🎯 Overall: {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("🎉 All tests passed! The fixes are working correctly.")
        return True
    else:
        print("⚠️  Some tests failed. Please check the errors above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)