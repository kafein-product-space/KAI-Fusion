

from ..base import ProcessorNode, NodeInput, NodeType, NodeOutput
from typing import Dict, Any, Sequence
from langchain_core.runnables import Runnable, RunnableLambda
from langchain_core.language_models import BaseLanguageModel
from langchain_core.tools import BaseTool
from langchain_core.prompts import PromptTemplate
from langchain_core.memory import BaseMemory
from langchain.agents import AgentExecutor, create_react_agent

class ReactAgentNode(ProcessorNode):
    """
    A sophisticated ReAct agent designed for robust orchestration of LLMs, tools, and memory.
    This agent uses a refined prompting strategy to improve its reasoning and tool utilization.
    """
    
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "Agent",
            "display_name": "Agent",
            "description": "Orchestrates LLM, tools, and memory for complex, multi-step tasks.",
            "category": "Agents",
            "node_type": NodeType.PROCESSOR,
            "inputs": [
                NodeInput(name="input", type="string", required=True, description="The user's input to the agent."),
                NodeInput(name="llm", type="BaseLanguageModel", required=True, description="The language model that the agent will use."),
                NodeInput(name="tools", type="Sequence[BaseTool]", required=False, description="The tools that the agent can use."),
                NodeInput(name="memory", type="BaseMemory", required=False, description="The memory that the agent can use."),
                NodeInput(name="max_iterations", type="int", default=15, description="The maximum number of iterations the agent can perform."),
                NodeInput(name="system_prompt", type="str", default="You are a helpful AI assistant.", description="The system prompt for the agent."),
                NodeInput(name="prompt_instructions", type="str", required=False, 
                         description="Custom prompt instructions for the agent. If not provided, uses smart orchestration defaults.",
                         default=""),
            ],
            "outputs": [NodeOutput(name="output", type="str", description="The final output from the agent.")]
        }

    def execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Runnable]) -> Runnable:
        """
        Sets up and returns a RunnableLambda that executes the agent.
        """
        def agent_executor_lambda(runtime_inputs: dict) -> dict:
            llm = connected_nodes.get("llm")
            tools = connected_nodes.get("tools")
            memory = connected_nodes.get("memory")

            if not isinstance(llm, BaseLanguageModel):
                raise ValueError("A valid LLM connection is required.")

            tools_list = self._prepare_tools(tools)

            agent_prompt = self._create_prompt(tools_list)

            agent = create_react_agent(llm, tools_list, agent_prompt)

            # Build executor config with conditional memory
            executor_config = {
                "agent": agent,
                "tools": tools_list,
                "verbose": True, # Essential for real-time debugging
                "handle_parsing_errors": "Check your output and make sure it conforms! If you need more iterations, provide your current best answer.",
                "max_iterations": self.user_data.get("max_iterations", 3),  # Further reduce iterations for efficiency
                "return_intermediate_steps": True,  # Capture tool usage for debugging
                "max_execution_time": 60,  # Increase execution time slightly
                "early_stopping_method": "force"  # Use supported method
            }
            
            # Only add memory if it exists
            if memory is not None:
                executor_config["memory"] = memory
                
            executor = AgentExecutor(**executor_config)

            # Enhanced logging
            print(f"\n🤖 REACT AGENT EXECUTION")
            print(f"   📝 Input: {str(runtime_inputs)[:60]}...")
            print(f"   🛠️  Tools: {[tool.name for tool in tools_list]}")
            
            # Memory context debug
            if memory and hasattr(memory, 'chat_memory') and hasattr(memory.chat_memory, 'messages'):
                messages = memory.chat_memory.messages
                print(f"   💭 Memory: {len(messages)} messages")
            else:
                print(f"   💭 Memory: None")
            
            # Handle runtime_inputs being either dict or string
            if isinstance(runtime_inputs, str):
                user_input = runtime_inputs
            elif isinstance(runtime_inputs, dict):
                user_input = runtime_inputs.get("input", inputs.get("input", ""))
            else:
                user_input = inputs.get("input", "")
            
            final_input = {
                "input": user_input,
                "tools": tools_list,  # LangChain create_react_agent için gerekli
                "tool_names": [tool.name for tool in tools_list]
            }
            
            print(f"   ⚙️  Executing with input: '{final_input['input'][:50]}...'")
            
            return executor.invoke(final_input)

        return RunnableLambda(agent_executor_lambda)

    def _prepare_tools(self, tools_input: Any) -> list[BaseTool]:
        """Ensures the tools are in the correct list format."""
        if not tools_input:
            return []
        if isinstance(tools_input, list):
            return tools_input
        if isinstance(tools_input, BaseTool):
            return [tools_input]
        return []

    def _create_prompt(self, tools: list[BaseTool]) -> PromptTemplate:
        """
        Creates a unified ReAct-compatible prompt that works with LangChain's create_react_agent.
        Uses custom prompt_instructions if provided, otherwise falls back to smart orchestration.
        """
        custom_instructions = self.user_data.get("prompt_instructions", "").strip()
        
        # Optimized system context with efficient tool usage
        base_system_context = """
Sen KAI-Fusion platformunda çalışan verimli bir AI asistanısın. 
Kullanıcının dilinde (Türkçe/İngilizce) hızlı ve yararlı cevaplar ver.

VERİMLİLİK KURALLARI:
- Basit sorularda (merhaba, nasılsın, teşekkür) araç kullanma
- Sadece güncel/yeni bilgi gerektiğinde araç kullan
- Araç kullanımından sonra hemen cevap ver, gereksiz araç kullanımı yapma
- Maksimum 2 araç kullanımı ile cevabını tamamla
- Eğer bilgin varsa araç kullanmadan cevapla
- Senin hafizan {memory}
"""
        
        # Build dynamic, intelligent prompt based on available components
        prompt_content = self._build_intelligent_prompt(custom_instructions, base_system_context)

        return PromptTemplate.from_template(prompt_content)

    def _build_intelligent_prompt(self, custom_instructions: str, base_system_context: str) -> str:
        """
        Builds an intelligent, dynamic system prompt that adapts to available tools, memory, and custom instructions.
        This creates a context-aware agent that understands its capabilities and constraints.
        """
        
        # === SIMPLE IDENTITY SECTION ===
        if custom_instructions:
            identity_section = f"{custom_instructions}\n\n{base_system_context}"
        else:
            identity_section = base_system_context

        # Minimal guidelines
        simplified_guidelines = "Kullanıcıya yardımcı ol ve gerektiğinde araçları kullan."

        # === OPTIMIZED REACT TEMPLATE ===
        react_template = """Answer the following questions efficiently. You have access to these tools:

{tools}

IMPORTANT: Be concise and efficient. Use tools only when necessary for current information.

Use this EXACT format:

Question: the input question you must answer
Thought: think about what to do (be concise)
Action: the tool to use, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this can repeat max 2 times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

For direct answers (no tools needed):
Thought: I can answer this directly
Final Answer: [your answer]

Be efficient - if you have enough information after 1 tool use, provide the final answer.

Begin!

Question: {input}
Thought:{agent_scratchpad}"""

        # === COMBINE ALL SECTIONS ===
        full_prompt = f"""
{identity_section}

{simplified_guidelines}

{react_template}
"""

        return full_prompt.strip()

# Alias for frontend compatibility
ToolAgentNode = ReactAgentNode
