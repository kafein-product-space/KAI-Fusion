
from ..base import ProviderNode, NodeMetadata, NodeInput, NodeType
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import Runnable

class PromptTemplateNode(ProviderNode):
    _metadatas = {
        "name": "PromptTemplate",
        "description": "Creates a chat prompt template from a string.",
        "node_type": NodeType.PROVIDER,
        "inputs": [
            NodeInput(name="template", type="string", description="The template string.", default="{input}")
        ]
    }

    def _execute(self, template: str = "{input}") -> Runnable:
        return ChatPromptTemplate.from_template(template)
