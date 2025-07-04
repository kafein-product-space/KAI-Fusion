import asyncio
import json
import pytest
from app.core.workflow_runner import WorkflowRunner
from app.core.node_discovery import get_registry

# Simple Chat Workflow
simple_chat_workflow = {
    "nodes": [
        {
            "id": "openai_1",
            "type": "OpenAIChat",
            "data": {
                "model_name": "gpt-4",
                "temperature": 0.7
            },
            "position": {"x": 100, "y": 100}
        }
    ],
    "edges": []
}

# Agent Workflow
agent_workflow = {
    "nodes": [
        {
            "id": "openai_1",
            "type": "OpenAIChat",
            "data": {"model_name": "gpt-4"},
            "position": {"x": 100, "y": 100}
        },
        {
            "id": "search_1",
            "type": "GoogleSearch",
            "data": {"k": 5},
            "position": {"x": 100, "y": 300}
        },
        {
            "id": "wikipedia_1",
            "type": "Wikipedia",
            "data": {"top_k": 3},
            "position": {"x": 100, "y": 500}
        },
        {
            "id": "prompt_1",
            "type": "ReactAgentPrompt",
            "data": {},
            "position": {"x": 300, "y": 100}
        },
        {
            "id": "agent_1",
            "type": "ReactAgent",
            "data": {},
            "position": {"x": 500, "y": 300}
        }
    ],
    "edges": [
        {"id": "e1", "source": "openai_1", "target": "agent_1", "targetHandle": "llm"},
        {"id": "e2", "source": "search_1", "target": "agent_1", "targetHandle": "tools"},
        {"id": "e3", "source": "wikipedia_1", "target": "agent_1", "targetHandle": "tools"},
        {"id": "e4", "source": "prompt_1", "target": "agent_1", "targetHandle": "prompt"}
    ]
}

# Chain Workflow
chain_workflow = {
    "nodes": [
        {
            "id": "openai_1",
            "type": "OpenAIChat",
            "data": {"model_name": "gpt-3.5-turbo"},
            "position": {"x": 100, "y": 100}
        },
        {
            "id": "prompt_1",
            "type": "PromptTemplate",
            "data": {
                "template": "Translate the following text to French: {input}"
            },
            "position": {"x": 300, "y": 100}
        },
        {
            "id": "chain_1",
            "type": "LLMChain",
            "data": {},
            "position": {"x": 500, "y": 100}
        }
    ],
    "edges": [
        {"id": "e1", "source": "openai_1", "target": "chain_1", "targetHandle": "llm"},
        {"id": "e2", "source": "prompt_1", "target": "chain_1", "targetHandle": "prompt"}
    ]
}

@pytest.mark.asyncio
async def test_simple_chat():
    """Test simple chat workflow"""
    print("\n" + "="*50)
    print("Testing Simple Chat Workflow")
    print("="*50)
    
    runner = WorkflowRunner(get_registry())
    
    result = await runner.execute_workflow(
        simple_chat_workflow, 
        "Hello! Tell me a short joke about programming."
    )
    
    print(f"Status: {result['status']}")
    print(f"Result: {result.get('result', 'No result')}")
    print(f"Execution Order: {result.get('execution_order', [])}")
    
    if result.get('error'):
        print(f"Error: {result['error']}")

@pytest.mark.asyncio
async def test_chain_workflow():
    """Test chain workflow"""
    print("\n" + "="*50)
    print("Testing Chain Workflow")
    print("="*50)
    
    runner = WorkflowRunner(get_registry())
    
    result = await runner.execute_workflow(
        chain_workflow, 
        "Hello world, how are you today?"
    )
    
    print(f"Status: {result['status']}")
    print(f"Result: {result.get('result', 'No result')}")
    print(f"Execution Order: {result.get('execution_order', [])}")
    
    if result.get('error'):
        print(f"Error: {result['error']}")

@pytest.mark.asyncio
async def test_agent_workflow():
    """Test agent workflow"""
    print("\n" + "="*50)
    print("Testing Agent Workflow")
    print("="*50)
    
    runner = WorkflowRunner(get_registry())
    
    result = await runner.execute_workflow(
        agent_workflow, 
        "What is the current weather in Istanbul, Turkey?"
    )
    
    print(f"Status: {result['status']}")
    print(f"Result: {result.get('result', 'No result')}")
    print(f"Execution Order: {result.get('execution_order', [])}")
    
    if result.get('error'):
        print(f"Error: {result['error']}")

@pytest.mark.asyncio
async def test_streaming():
    """Test streaming execution"""
    print("\n" + "="*50)
    print("Testing Streaming Execution")
    print("="*50)
    
    runner = WorkflowRunner(get_registry())
    
    print("Streaming tokens:")
    async for chunk in runner.execute_workflow_stream(
        simple_chat_workflow,
        "Write a haiku about Python programming"
    ):
        if chunk["type"] == "token":
            print(chunk["content"], end="", flush=True)
        elif chunk["type"] == "status":
            print(f"\n[Status] {chunk['message']}")
        elif chunk["type"] == "result":
            print(f"\n\nFinal result: {chunk['result']}")
        elif chunk["type"] == "error":
            print(f"\n[Error] {chunk['error']}")

async def main():
    """Run all tests"""
    print("🚀 Starting Workflow Tests")
    print("=" * 60)
    
    # Test 1: Simple Chat
    try:
        await test_simple_chat()
    except Exception as e:
        print(f"❌ Simple chat test failed: {e}")
    
    # Test 2: Chain Workflow
    try:
        await test_chain_workflow()
    except Exception as e:
        print(f"❌ Chain workflow test failed: {e}")
    
    # Test 3: Agent Workflow
    try:
        await test_agent_workflow()
    except Exception as e:
        print(f"❌ Agent workflow test failed: {e}")
    
    # Test 4: Streaming
    try:
        await test_streaming()
    except Exception as e:
        print(f"❌ Streaming test failed: {e}")
    
    print("\n" + "="*60)
    print("✅ All tests completed!")

if __name__ == "__main__":
    asyncio.run(main())
