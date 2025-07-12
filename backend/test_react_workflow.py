#!/usr/bin/env python3
"""
Test ReAct Agent Workflow with OpenAI LLM and Buffer Memory
This script demonstrates the continuous conversation capability.
"""

import asyncio
import os
import json
from typing import Dict, Any

# Ensure we can import from the app
import sys
sys.path.append('.')

from app.core.engine_v2 import get_engine

# Test workflow definition
REACT_WORKFLOW = {
    "nodes": [
        {
            "id": "openai-llm",
            "type": "OpenAIChat",
            "position": {"x": 100, "y": 100},
            "data": {
                "model_name": "gpt-3.5-turbo",
                "temperature": 0.7,
                "api_key": os.getenv("OPENAI_API_KEY", "your-api-key-here")
            }
        },
        {
            "id": "buffer-memory",
            "type": "BufferMemory",
            "position": {"x": 100, "y": 200},
            "data": {
                "memory_key": "chat_history",
                "return_messages": True,
                "input_key": "input",
                "output_key": "output"
            }
        },
        {
            "id": "react-agent",
            "type": "ReactAgent",
            "position": {"x": 300, "y": 150},
            "data": {
                "system_prompt": "You are a helpful AI assistant. You can have continuous conversations and remember previous interactions. Always be friendly and helpful.",
                "enable_memory": True,
                "max_iterations": 10,
                "verbose": True
            }
        }
    ],
    "edges": [
        {
            "id": "edge1",
            "source": "openai-llm",
            "target": "react-agent",
            "sourceHandle": "output",
            "targetHandle": "llm"
        },
        {
            "id": "edge2", 
            "source": "buffer-memory",
            "target": "react-agent",
            "sourceHandle": "output",
            "targetHandle": "memory"
        }
    ]
}

async def test_continuous_conversation():
    """Test continuous conversation with ReAct Agent"""
    print("🚀 Starting ReAct Agent Continuous Conversation Test")
    print("=" * 60)
    
    # Check API key
    if not os.getenv("OPENAI_API_KEY"):
        print("❌ OPENAI_API_KEY environment variable not set!")
        print("Please set your OpenAI API key:")
        print("export OPENAI_API_KEY='your-api-key-here'")
        return
    
    # Get engine and build workflow
    engine = get_engine()
    
    try:
        print("🔨 Building workflow...")
        engine.build(REACT_WORKFLOW, user_context={"user_id": "test_user"})
        print("✅ Workflow built successfully!")
        
        # Test conversation
        session_id = f"test_session_{int(asyncio.get_event_loop().time())}"
        conversation = [
            "Merhaba! Benim adım Ali. Sen kimsin?",
            "Hangi programlama dillerini biliyorsun?",
            "Peki benim adım neydi?",
            "Python hakkında kısa bir bilgi verebilir misin?",
            "Daha önce konuştuklarımızı hatırlıyor musun?",
        ]
        
        print(f"💬 Starting conversation (Session: {session_id})")
        print("-" * 60)
        
        for i, user_input in enumerate(conversation, 1):
            print(f"\n[{i}] 👤 USER: {user_input}")
            
            # Execute workflow with session context
            result = await engine.execute(
                inputs={
                    "input": user_input,
                    "session_id": session_id,
                    "conversation_mode": True
                },
                stream=False,
                user_context={"user_id": "test_user", "session_id": session_id}
            )
            
            # Extract response
            if result.get("success"):
                agent_response = result.get("result", "No response")
                if isinstance(agent_response, dict) and "output" in agent_response:
                    agent_response = agent_response["output"]
                elif isinstance(agent_response, dict):
                    agent_response = str(agent_response)
                
                print(f"[{i}] 🤖 AGENT: {agent_response}")
            else:
                error = result.get("error", "Unknown error")
                print(f"[{i}] ❌ ERROR: {error}")
            
            # Small delay between messages
            await asyncio.sleep(1)
        
        print("\n" + "=" * 60)
        print("✅ Continuous conversation test completed!")
        print("🧠 The agent should remember previous interactions")
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()

async def test_streaming_conversation():
    """Test streaming conversation"""
    print("\n🚀 Testing Streaming Mode")
    print("=" * 60)
    
    engine = get_engine()
    
    try:
        print("🔨 Building workflow...")
        engine.build(REACT_WORKFLOW, user_context={"user_id": "test_user"})
        
        user_input = "Bana Python programlama hakkında kısa bir açıklama yap"
        print(f"👤 USER: {user_input}")
        print("🤖 AGENT (Streaming):")
        
        # Execute with streaming
        stream = await engine.execute(
            inputs={"input": user_input},
            stream=True,
            user_context={"user_id": "test_user"}
        )
        
        async for event in stream:
            event_type = event.get("type", "unknown")
            if event_type == "token":
                print(event.get("content", ""), end="", flush=True)
            elif event_type == "complete":
                print(f"\n✅ Final result: {event.get('result', '')}")
            elif event_type == "error":
                print(f"\n❌ Error: {event.get('error', '')}")
                
    except Exception as e:
        print(f"❌ Streaming test failed: {str(e)}")

def print_workflow_info():
    """Print workflow information"""
    print("\n📋 Workflow Configuration:")
    print("-" * 30)
    print("Nodes:")
    for node in REACT_WORKFLOW["nodes"]:
        print(f"  • {node['id']} ({node['type']})")
    
    print("\nConnections:")
    for edge in REACT_WORKFLOW["edges"]:
        print(f"  • {edge['source']} → {edge['target']}")
    
    print("\nFeatures:")
    print("  ✅ ReAct Agent orchestration")
    print("  ✅ OpenAI LLM integration")
    print("  ✅ Buffer Memory for conversation history")
    print("  ✅ Session-based persistence")
    print("  ✅ Continuous conversation support")

if __name__ == "__main__":
    print("🤖 ReAct Agent Continuous Conversation Test")
    print("==========================================")
    
    print_workflow_info()
    
    # Run tests
    asyncio.run(test_continuous_conversation())
    
    # Uncomment to test streaming
    # asyncio.run(test_streaming_conversation()) 