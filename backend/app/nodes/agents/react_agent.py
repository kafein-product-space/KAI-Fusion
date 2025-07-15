from ..base import ProcessorNode, NodeInput, NodeType, NodeOutput
from typing import Dict, Any, Sequence, Optional
from langchain_core.runnables import Runnable, RunnableLambda
from langchain_core.language_models import BaseLanguageModel
from langchain_core.tools import BaseTool
from langchain_core.prompts import PromptTemplate, BasePromptTemplate
from langchain_core.memory import BaseMemory
from langchain.agents import AgentExecutor, create_react_agent
from langchain.memory import ConversationBufferMemory

class ReactAgentNode(ProcessorNode):
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "ReactAgent",
            "display_name": "ReAct Agent",
            "description": "Advanced ReAct agent that orchestrates LLM, tools, and memory for continuous conversations",
            "category": "Agents",
            "node_type": NodeType.PROCESSOR,
            "inputs": [
                NodeInput(
                    name="input", 
                    type="string", 
                    description="User input for the agent", 
                    is_connection=True, 
                    required=True
                ),
                NodeInput(
                    name="llm", 
                    type="BaseLanguageModel", 
                    description="The language model to use", 
                    is_connection=True,
                    required=True
                ),
                NodeInput(
                    name="chat_model", 
                    type="BaseLanguageModel", 
                    description="The language model to use (legacy name)", 
                    is_connection=True,
                    required=False
                ),
                NodeInput(
                    name="tools", 
                    type="Sequence[BaseTool]", 
                    description="The tools for the agent to use", 
                    is_connection=True,
                    required=False
                ),
                NodeInput(
                    name="tool", 
                    type="BaseTool", 
                    description="Single tool for the agent (legacy name)", 
                    is_connection=True,
                    required=False
                ),
                NodeInput(
                    name="memory", 
                    type="BaseMemory", 
                    description="Memory object for the agent", 
                    is_connection=True, 
                    required=False
                ),
                NodeInput(
                    name="max_iterations",
                    type="int",
                    description="Maximum iterations for agent",
                    default=10,
                    required=False
                ),
                NodeInput(
                    name="system_prompt",
                    type="str",
                    description="System prompt for the agent",
                    default="You are a helpful AI assistant. Use available tools when needed. Always provide helpful and informative responses.",
                    required=False
                ),
                NodeInput(
                    name="enable_memory",
                    type="bool",
                    description="Enable conversation memory",
                    default=True,
                    required=False
                ),
            ],
            "outputs": [
                NodeOutput(
                    name="output",
                    type="str",
                    description="Agent response"
                ),
                NodeOutput(
                    name="agent_executor",
                    type="AgentExecutor",
                    description="Agent executor for advanced usage"
                )
            ]
        }
        # Persistent memory across calls for the same session
        self._session_memories: Dict[str, BaseMemory] = {}

    def execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Runnable]) -> Runnable:
        """Enhanced execute with proper memory management and orchestration"""
        print(f"🤖 ReAct Agent executing with inputs: {list(inputs.keys())}")
        print(f"🔗 Connected nodes: {list(connected_nodes.keys())}")
        
        # Get connected components (with backward compatibility)
        llm_node = connected_nodes.get("llm") or connected_nodes.get("chat_model")
        tools_node = connected_nodes.get("tools") or connected_nodes.get("tool")
        memory_node = connected_nodes.get("memory")
        
        # Get configuration
        input_text = inputs.get("input", "")
        max_iterations = self.user_data.get("max_iterations", 10)
        system_prompt = self.user_data.get("system_prompt", 
            "You are a helpful AI assistant. Use available tools when needed to answer questions. "
            "If you have access to memory, use it to maintain conversation context. "
            "Always provide helpful and informative responses.")
        enable_memory = self.user_data.get("enable_memory", True)
        
        # Validate required components
        if not llm_node:
            raise ValueError("LLM connection is required for ReAct Agent")
        
        if not isinstance(llm_node, BaseLanguageModel):
            raise TypeError("LLM connection must be a BaseLanguageModel")

        print(f"✅ LLM validated: {type(llm_node).__name__}")

        # Handle tools - can be empty list
        tools_list = []
        if tools_node:
            if isinstance(tools_node, BaseTool):
                tools_list = [tools_node]
            elif isinstance(tools_node, (list, tuple)):
                tools_list = list(tools_node)
            else:
                print(f"⚠️  Tools type not recognized: {type(tools_node)}, ignoring")
        
        print(f"🔧 Tools available: {len(tools_list)}")
        for tool in tools_list:
            print(f"  - {tool.name}: {tool.description}")

        # Handle memory with session persistence
        memory = None
        session_id = getattr(self, 'session_id', 'default_session')
        
        if enable_memory:
            if memory_node and isinstance(memory_node, BaseMemory):
                # Use connected memory
                memory = memory_node
                print(f"💭 Using connected memory: {type(memory).__name__}")
            else:
                # Use persistent session memory
                if session_id not in self._session_memories:
                    self._session_memories[session_id] = ConversationBufferMemory(
                        memory_key="chat_history",
                        return_messages=True,
                        input_key="input",
                        output_key="output"
                    )
                    print(f"💭 Created new session memory for: {session_id}")
                memory = self._session_memories[session_id]
                print(f"💭 Using persistent session memory: {session_id}")

        # Create enhanced prompt template
        if tools_list:
            prompt_template = f"""{system_prompt}

You have access to the following tools:
{{tools}}

Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{{tool_names}}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

Begin!

{{chat_history}}

Question: {{input}}
Thought:"""
        else:
            prompt_template = f"""{system_prompt}

{{chat_history}}

User: {{input}}
Assistant: I'll help you with that. Let me provide a helpful response:"""

        try:
            prompt = PromptTemplate.from_template(prompt_template)
            print(f"📝 Prompt template created")

            if tools_list:
                # Create ReAct agent with tools
                agent = create_react_agent(llm_node, tools_list, prompt)
                print(f"🤖 ReAct agent created with {len(tools_list)} tools")
            else:
                # Create simple conversational agent without tools
                def simple_agent_func(agent_input):
                    print(f"🔧 simple_agent_func called with: {agent_input}")
                    
                    # Extract the actual user input
                    current_input = agent_input.get("input", "") if isinstance(agent_input, dict) else str(agent_input)
                    print(f"🔧 Extracted current_input: '{current_input}'")
                    
                    # Get chat history from memory safely
                    chat_history = ""
                    if memory:
                        # Try different memory types
                        if hasattr(memory, 'buffer'):
                            chat_history = getattr(memory, 'buffer', "")
                        elif hasattr(memory, 'chat_memory'):
                            chat_memory = getattr(memory, 'chat_memory', None)
                            if chat_memory and hasattr(chat_memory, 'messages'):
                                messages = getattr(chat_memory, 'messages', [])
                                chat_history = "\n".join([f"{getattr(msg, 'type', 'message')}: {getattr(msg, 'content', str(msg))}" for msg in messages])
                    
                    print(f"🔧 Chat history length: {len(chat_history)}")
                    
                    formatted_prompt = prompt.format(
                        chat_history=chat_history,
                        input=current_input
                    )
                    print(f"🔧 Formatted prompt: '{formatted_prompt[:200]}...'")
                    
                    response = llm_node.invoke(formatted_prompt)
                    simple_output = response.content if hasattr(response, 'content') else str(response)
                    
                    print(f"🔧 LLM response: '{simple_output[:100]}...'")
                    
                    # Update memory if available
                    if memory:
                        print(f"🔧 Saving to memory: input='{current_input}', output='{simple_output[:50]}...'")
                        memory.save_context(
                            {"input": current_input}, 
                            {"output": simple_output}
                        )
                    
                    return {
                        "output": simple_output
                    }
                
                agent = RunnableLambda(simple_agent_func)
                print(f"🤖 Simple conversational agent created (no tools)")

            # Create executor
            if tools_list:
                executor = AgentExecutor(
                    agent=agent,
                    tools=tools_list,
                    verbose=self.user_data.get("verbose", True),
                    handle_parsing_errors=True,
                    memory=memory,
                    max_iterations=max_iterations,
                    return_intermediate_steps=False,
                )
                print(f"⚡ Agent executor created with memory: {memory is not None}")
            else:
                executor = agent

            # Create wrapper function that maintains conversation context
            def conversation_wrapper(_input) -> Dict[str, Any]:
                """Wrapper that handles conversation flow and memory management"""
                try:
                    print(f"💬 conversation_wrapper called with input type: {type(_input)}")
                    print(f"💬 conversation_wrapper input: {_input}")
                    
                    # Extract the actual input text from runtime input (this is what user types)
                    if isinstance(_input, dict):
                        runtime_input = _input.get("input", str(_input))
                    else:
                        runtime_input = str(_input)
                        
                    print(f"💬 Processing runtime input: '{runtime_input[:100]}...'")
                    
                    if tools_list:
                        # Use agent executor for tools with runtime input
                        result = executor.invoke({"input": runtime_input})
                        output = result.get("output", str(result))
                    else:
                        # Use simple agent with runtime input
                        result = executor.invoke({"input": runtime_input})
                        output = result.get("output", str(result))
                    
                    print(f"✅ Agent response generated: {len(output)} characters")
                    print(f"🎯 Final output: '{output[:100]}...'")
                    
                    return {
                        "output": output,
                        "session_id": session_id,
                        "has_memory": memory is not None,
                        "tools_used": len(tools_list) > 0
                    }
                    
                except Exception as e:
                    error_msg = f"Agent execution error: {str(e)}"
                    print(f"❌ {error_msg}")
                    return {
                        "output": f"I apologize, but I encountered an error: {str(e)}",
                        "error": error_msg,
                        "session_id": session_id
                    }

            return RunnableLambda(conversation_wrapper)
            
        except Exception as e:
            error_msg = f"Failed to create ReAct agent: {str(e)}"
            print(f"❌ {error_msg}")
            raise ValueError(error_msg) from e

    def get_session_memory(self, session_id: str) -> Optional[BaseMemory]:
        """Get memory for a specific session"""
        return self._session_memories.get(session_id)
    
    def clear_session_memory(self, session_id: str):
        """Clear memory for a specific session"""
        if session_id in self._session_memories:
            del self._session_memories[session_id]
            print(f"🗑️ Cleared session memory: {session_id}")

# Add alias for frontend compatibility
ToolAgentNode = ReactAgentNode
