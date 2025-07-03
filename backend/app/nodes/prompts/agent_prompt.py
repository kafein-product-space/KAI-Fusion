
from ..base import ProviderNode, NodeMetadata, NodeInput, NodeType
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import Runnable

# This is the default prompt for LangChain's ReAct agent.
# https://smith.langchain.com/hub/hwchase17/react
REACT_PROMPT = '''Answer the following questions as best you can. You have access to the following tools:

{tools}

Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

Begin!

Question: {input}
Thought:{agent_scratchpad}'''

class AgentPromptNode(ProviderNode):
    _metadatas = {
        "name": "AgentPrompt",
        "description": "Creates a standard prompt for a LangChain ReAct agent.",
        "node_type": NodeType.PROVIDER,
        "inputs": [
            NodeInput(
                name="system_message", 
                type="string", 
                description="The system message for the agent.",
                default=REACT_PROMPT
            ),
        ]
    }

    def _execute(self, system_message: str = REACT_PROMPT) -> Runnable:
        return ChatPromptTemplate.from_messages([
            ("system", system_message),
            ("human", "{input}"),
            ("ai", "{agent_scratchpad}")
        ])
