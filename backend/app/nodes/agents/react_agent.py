from ..base import ProcessorNode, NodeInput, NodeType
from typing import Dict, Any, Sequence
from langchain_core.runnables import Runnable
from langchain_core.language_models import BaseLanguageModel
from langchain_core.tools import BaseTool
from langchain_core.prompts import PromptTemplate
from langchain_core.memory import BaseMemory
from langchain.agents import AgentExecutor, create_react_agent

class ReactAgentNode(ProcessorNode):
    def __init__(self):
        super().__init__()
        self._metadatas = {
            "name": "ReactAgent",
            "description": "Creates a ReAct agent from an LLM, tools, and a prompt.",
            "node_type": NodeType.PROCESSOR,
            "inputs": [
                NodeInput(name="llm", type="BaseLanguageModel", description="The language model to use.", is_connection=True),
                NodeInput(name="tools", type="Sequence[BaseTool]", description="The tools for the agent to use.", is_connection=True),
                NodeInput(name="prompt", type="PromptTemplate", description="The prompt for the agent.", is_connection=True),
                NodeInput(name="memory", type="BaseMemory", description="The memory for the agent.", is_connection=True, required=False)
            ]
        }

    def _execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Runnable]) -> Runnable:
        """Execute with correct ProcessorNode signature"""
        llm_runnable = connected_nodes.get("llm")
        tools_runnable = connected_nodes.get("tools")
        prompt_runnable = connected_nodes.get("prompt")
        memory_runnable = connected_nodes.get("memory")  # Optional

        if not all([llm_runnable, tools_runnable, prompt_runnable]):
            raise ValueError("LLM, tools, and prompt must be provided to the ReactAgentNode.")

        # Type validation and casting for create_react_agent
        if not isinstance(llm_runnable, BaseLanguageModel):
            raise TypeError(f"LLM must be a BaseLanguageModel, got {type(llm_runnable)}")
        
        if not isinstance(tools_runnable, (list, tuple)) or not all(isinstance(tool, BaseTool) for tool in tools_runnable):
            raise TypeError(f"Tools must be a sequence of BaseTool objects, got {type(tools_runnable)}")
            
        if not isinstance(prompt_runnable, PromptTemplate):
            raise TypeError(f"Prompt must be a PromptTemplate, got {type(prompt_runnable)}")

        # Optional memory validation
        if memory_runnable is not None and not isinstance(memory_runnable, BaseMemory):
            raise TypeError(f"Memory must be a BaseMemory, got {type(memory_runnable)}")

        # Now we can safely pass the properly typed objects to create_react_agent
        agent = create_react_agent(llm_runnable, tools_runnable, prompt_runnable)
        
        agent_executor_kwargs = {
            "agent": agent,
            "tools": tools_runnable,
            "verbose": True,
            "handle_parsing_errors": True
        }
        
        # Add memory if provided
        if memory_runnable is not None:
            agent_executor_kwargs["memory"] = memory_runnable
        
        return AgentExecutor(**agent_executor_kwargs)
