from ..base import ProcessorNode, ProviderNode, NodeInput, NodeOutput, NodeType
from langchain.chains import LLMChain
from langchain_core.language_models import BaseLanguageModel
from langchain_core.prompts import BasePromptTemplate
from langchain_core.runnables import Runnable
from typing import Dict, Any

class LLMChainNode(ProcessorNode):
    """Wraps LangChain's LLMChain (llm + prompt)"""

    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "LLMChain",
            "description": "Combines an LLM and a prompt into an executable chain.",
            "category": "Chains",
            "node_type": NodeType.PROCESSOR,
            "inputs": [
                NodeInput(name="llm", type="BaseLanguageModel", description="Language model", is_connection=True),
                NodeInput(name="prompt", type="BasePromptTemplate", description="Prompt", is_connection=True),
                NodeInput(name="output_key", type="string", description="Key for chain output", default="output", required=False),
            ],
            "outputs": [
                NodeOutput(name="output", type="chain", description="LLMChain instance"),
            ],
        }

    def execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Runnable]) -> Runnable:
        llm = connected_nodes.get("llm")
        prompt = connected_nodes.get("prompt")
        output_key = inputs.get("output_key", "output")

        if not isinstance(llm, BaseLanguageModel):
            raise ValueError("LLM connection is required and must be a BaseLanguageModel")
        if not isinstance(prompt, BasePromptTemplate):
            raise ValueError("Prompt connection is required and must be a BasePromptTemplate")

        return LLMChain(llm=llm, prompt=prompt, output_key=output_key) 