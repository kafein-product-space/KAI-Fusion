from ..base import ProviderNode, NodeMetadata, NodeInput, NodeType
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import Runnable

class PromptTemplateNode(ProviderNode):
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "PromptTemplate",
            "description": "Creates a chat prompt template from a string.",
            "node_type": NodeType.PROVIDER,
            "category": "Prompts",
            "inputs": [
                NodeInput(name="template", type="string", description="The template string.", default="{input}")
            ]
        }

    def execute(self, **kwargs) -> Runnable:
        """Execute with correct ProviderNode signature"""
        template = kwargs.get("template", "{input}")
        return ChatPromptTemplate.from_template(template)
