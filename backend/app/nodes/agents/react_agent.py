from ..base import ProcessorNode, NodeInput, NodeType
from typing import Dict, Any, Sequence
from langchain_core.runnables import Runnable, RunnableLambda
from langchain_core.language_models import BaseLanguageModel
from langchain_core.tools import BaseTool
from langchain_core.prompts import PromptTemplate, BasePromptTemplate
from langchain_core.memory import BaseMemory
from langchain.agents import AgentExecutor, create_react_agent

class ReactAgentNode(ProcessorNode):
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "ReactAgent",
            "display_name": "ReAct Agent",
            "description": "Creates a ReAct agent from an LLM, tools, and a custom prompt.",
            "category": "Agents",
            "node_type": NodeType.PROCESSOR,
            "inputs": [
                NodeInput(name="input", type="string", description="User input for the agent", is_connection=True, required=True),
                NodeInput(name="llm", type="BaseLanguageModel", description="The language model to use", is_connection=True),
                NodeInput(name="tools", type="Sequence[BaseTool]", description="The tools for the agent to use", is_connection=True),
                NodeInput(name="memory", type="BaseMemory", description="Memory object for the agent", is_connection=True, required=False),
            ],
        }

    def execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Runnable]) -> Runnable:
        llm = connected_nodes.get("llm")
        tools = connected_nodes.get("tools")
        memory = connected_nodes.get("memory", None)
        input_text = inputs.get("input", "")
        prompt_str = self.user_data.get("prompt_template", "You are a helpful assistant. Use tools if needed to answer: {input}")

        if not llm or not tools or not prompt_str:
            raise ValueError("LLM, tools, and prompt_template are required.")

        # Ensure tools is a list
        if isinstance(tools, BaseTool):
            tools = [tools]
        if not isinstance(tools, (list, tuple)):
            raise TypeError("Tools must be a list or tuple of BaseTool")

        prompt = PromptTemplate.from_template(prompt_str)
        agent = create_react_agent(llm, tools, prompt)

        executor = AgentExecutor(
            agent=agent,
            tools=tools,
            verbose=self.user_data.get("verbose", True),
            handle_parsing_errors=self.user_data.get("handle_parsing_errors", True),
            memory=memory,
        )

        return RunnableLambda(lambda _input: executor.invoke({"input": _input}))
