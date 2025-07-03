"""
Integration tests for the dynamic workflow system
"""
import pytest
import asyncio
from app.core.workflow_runner import WorkflowRunner
from app.core.node_discovery import get_registry
from app.core.auto_connector import AutoConnector
from app.core.session_manager import SessionManager

class TestIntegration:
    
    @pytest.fixture
    def runner(self):
        return WorkflowRunner(get_registry())
    
    @pytest.fixture
    def auto_connector(self):
        return AutoConnector(get_registry())
    
    @pytest.fixture
    def session_manager(self):
        return SessionManager()
    
    @pytest.mark.asyncio
    async def test_complex_agent_workflow(self, runner):
        """Test a complex agent workflow with memory and tools"""
        workflow = {
            "nodes": [
                {
                    "id": "llm_1",
                    "type": "OpenAIChat",
                    "data": {
                        "model_name": "gpt-4",
                        "temperature": 0.7
                    }
                },
                {
                    "id": "memory_1",
                    "type": "BufferMemory",
                    "data": {
                        "memory_key": "chat_history",
                        "return_messages": True
                    }
                },
                {
                    "id": "search_tool",
                    "type": "GoogleSearch",
                    "data": {}
                },
                {
                    "id": "wiki_tool",
                    "type": "Wikipedia",
                    "data": {}
                },
                {
                    "id": "calc_tool",
                    "type": "Calculator",
                    "data": {}
                },
                {
                    "id": "agent_prompt",
                    "type": "ReactAgentPrompt",
                    "data": {}
                },
                {
                    "id": "agent_1",
                    "type": "ReactAgent",
                    "data": {}
                }
            ],
            "edges": [
                {"source": "llm_1", "target": "agent_1", "targetHandle": "llm"},
                {"source": "memory_1", "target": "agent_1", "targetHandle": "memory"},
                {"source": "search_tool", "target": "agent_1", "targetHandle": "tools"},
                {"source": "wiki_tool", "target": "agent_1", "targetHandle": "tools"},
                {"source": "calc_tool", "target": "agent_1", "targetHandle": "tools"},
                {"source": "agent_prompt", "target": "agent_1", "targetHandle": "prompt"}
            ]
        }
        
        # Validate workflow
        validation = runner.validate_workflow(workflow)
        assert validation["valid"], f"Workflow validation failed: {validation['errors']}"
        
        # Execute workflow
        result = await runner.execute_workflow(
            workflow,
            "What is the population of Tokyo? Calculate the square root of that number."
        )
        
        print(f"\nAgent Result: {result}")
        assert result["status"] == "completed"
        assert result["result"] is not None
    
    @pytest.mark.asyncio
    async def test_sequential_chain_workflow(self, runner):
        """Test sequential chain with multiple steps"""
        workflow = {
            "nodes": [
                {
                    "id": "llm_1",
                    "type": "OpenAIChat",
                    "data": {"model_name": "gpt-3.5-turbo"}
                },
                {
                    "id": "translate_prompt",
                    "type": "PromptTemplate",
                    "data": {
                        "template": "Translate this to French: {input}",
                        "input_variables": ["input"]
                    }
                },
                {
                    "id": "summarize_prompt",
                    "type": "PromptTemplate",
                    "data": {
                        "template": "Summarize this in one sentence: {french}",
                        "input_variables": ["french"]
                    }
                },
                {
                    "id": "translate_chain",
                    "type": "LLMChain",
                    "data": {"output_key": "french"}
                },
                {
                    "id": "summarize_chain",
                    "type": "LLMChain",
                    "data": {"output_key": "summary"}
                },
                {
                    "id": "sequential",
                    "type": "SequentialChain",
                    "data": {
                        "input_variables": ["input"],
                        "output_variables": ["french", "summary"],
                        "return_all": True
                    }
                }
            ],
            "edges": [
                {"source": "llm_1", "target": "translate_chain", "targetHandle": "llm"},
                {"source": "translate_prompt", "target": "translate_chain", "targetHandle": "prompt"},
                {"source": "llm_1", "target": "summarize_chain", "targetHandle": "llm"},
                {"source": "summarize_prompt", "target": "summarize_chain", "targetHandle": "prompt"},
                {"source": "translate_chain", "target": "sequential", "targetHandle": "chains"},
                {"source": "summarize_chain", "target": "sequential", "targetHandle": "chains"}
            ]
        }
        
        result = await runner.execute_workflow(
            workflow,
            "The quick brown fox jumps over the lazy dog."
        )
        
        print(f"\nSequential Chain Result: {result}")
        assert result["status"] == "completed"
    
    @pytest.mark.asyncio
    async def test_conditional_routing(self, runner):
        """Test conditional chain routing"""
        workflow = {
            "nodes": [
                {
                    "id": "llm_1",
                    "type": "OpenAIChat",
                    "data": {"model_name": "gpt-3.5-turbo"}
                },
                {
                    "id": "technical_prompt",
                    "type": "PromptTemplate",
                    "data": {
                        "template": "Provide a technical explanation: {input}"
                    }
                },
                {
                    "id": "simple_prompt",
                    "type": "PromptTemplate",
                    "data": {
                        "template": "Explain this simply for a child: {input}"
                    }
                },
                {
                    "id": "technical_chain",
                    "type": "LLMChain",
                    "data": {}
                },
                {
                    "id": "simple_chain",
                    "type": "LLMChain",
                    "data": {}
                },
                {
                    "id": "router",
                    "type": "ConditionalChain",
                    "data": {
                        "condition_chains": {
                            "technical": "technical_chain",
                            "simple": "simple_chain"
                        },
                        "condition_type": "contains"
                    }
                }
            ],
            "edges": [
                {"source": "llm_1", "target": "technical_chain", "targetHandle": "llm"},
                {"source": "technical_prompt", "target": "technical_chain", "targetHandle": "prompt"},
                {"source": "llm_1", "target": "simple_chain", "targetHandle": "llm"},
                {"source": "simple_prompt", "target": "simple_chain", "targetHandle": "prompt"},
                {"source": "simple_chain", "target": "router", "targetHandle": "default_chain"},
                {"source": "technical_chain", "target": "router", "targetHandle": "technical_chain"}
            ]
        }
        
        # Test technical route
        result = await runner.execute_workflow(
            workflow,
            "Explain technical details of quantum computing"
        )
        print(f"\nTechnical Route Result: {result}")
        assert result["status"] == "completed"
        
        # Test simple route
        result = await runner.execute_workflow(
            workflow,
            "Explain in simple terms what a computer is"
        )
        print(f"\nSimple Route Result: {result}")
        assert result["status"] == "completed"
    
    @pytest.mark.asyncio
    async def test_auto_connection_suggestions(self, auto_connector):
        """Test auto-connection system"""
        nodes = [
            {"id": "llm_1", "type": "OpenAIChat"},
            {"id": "prompt_1", "type": "PromptTemplate"},
            {"id": "tool_1", "type": "GoogleSearch"},
            {"id": "agent_1", "type": "ReactAgent"},
            {"id": "chain_1", "type": "LLMChain"}
        ]
        
        suggestions = auto_connector.suggest_connections(nodes)
        
        print("\nConnection Suggestions:")
        for suggestion in suggestions[:10]:  # Top 10 suggestions
            print(f"  {suggestion.source_id}.{suggestion.source_handle} → "
                  f"{suggestion.target_id}.{suggestion.target_handle} "
                  f"(confidence: {suggestion.confidence:.0%})")
        
        assert len(suggestions) > 0
        assert suggestions[0].confidence >= 0.5
    
    @pytest.mark.asyncio
    async def test_session_management(self, runner, session_manager):
        """Test session management with conversation history"""
        workflow = {
            "nodes": [
                {
                    "id": "llm_1",
                    "type": "OpenAIChat",
                    "data": {"model_name": "gpt-3.5-turbo"}
                }
            ],
            "edges": []
        }
        
        # Create session
        session_id = await session_manager.create_session("test_workflow", "test_user")
        
        # First message
        result1 = await runner.execute_workflow(
            workflow,
            "My name is Alice. Remember this.",
            await session_manager.get_session_context(session_id)
        )
        
        # Update session
        await session_manager.update_session(
            session_id,
            human_message="My name is Alice. Remember this.",
            ai_message=result1["result"]
        )
        
        # Second message with context
        result2 = await runner.execute_workflow(
            workflow,
            "What is my name?",
            await session_manager.get_session_context(session_id)
        )
        
        print(f"\nSession Test - First: {result1['result'][:100]}...")
        print(f"Session Test - Second: {result2['result'][:100]}...")
        
        # Check session stats
        stats = session_manager.get_stats()
        assert stats["total_sessions"] == 1
        
        # Cleanup
        await session_manager.delete_session(session_id)

async def main():
    """Run all integration tests"""
    print("🚀 Running Integration Tests")
    print("=" * 60)
    
    test = TestIntegration()
    runner = test.runner()
    auto_connector = test.auto_connector()
    session_manager = test.session_manager()
    
    # Test 1: Complex Agent
    try:
        print("\n📋 Test 1: Complex Agent Workflow")
        await test.test_complex_agent_workflow(runner)
        print("✅ PASSED")
    except Exception as e:
        print(f"❌ FAILED: {e}")
    
    # Test 2: Sequential Chain
    try:
        print("\n📋 Test 2: Sequential Chain Workflow")
        await test.test_sequential_chain_workflow(runner)
        print("✅ PASSED")
    except Exception as e:
        print(f"❌ FAILED: {e}")
    
    # Test 3: Conditional Routing
    try:
        print("\n📋 Test 3: Conditional Routing")
        await test.test_conditional_routing(runner)
        print("✅ PASSED")
    except Exception as e:
        print(f"❌ FAILED: {e}")
    
    # Test 4: Auto Connections
    try:
        print("\n📋 Test 4: Auto Connection Suggestions")
        await test.test_auto_connection_suggestions(auto_connector)
        print("✅ PASSED")
    except Exception as e:
        print(f"❌ FAILED: {e}")
    
    # Test 5: Session Management
    try:
        print("\n📋 Test 5: Session Management")
        await test.test_session_management(runner, session_manager)
        print("✅ PASSED")
    except Exception as e:
        print(f"❌ FAILED: {e}")
    
    print("\n" + "=" * 60)
    print("✅ Integration tests completed!")

if __name__ == "__main__":
    asyncio.run(main())
