from ..base import ProviderNode, NodeMetadata, NodeType
from langchain_community.tools import WikipediaQueryRun
from langchain_community.utilities import WikipediaAPIWrapper
from langchain_core.runnables import Runnable

class WikipediaToolNode(ProviderNode):
    def __init__(self):
        super().__init__()
        self._metadatas = {
            "name": "WikipediaTool",
            "description": "Provides a tool that queries Wikipedia.",
            "node_type": NodeType.PROVIDER,
        }

    def _execute(self, **kwargs) -> Runnable:
        """Execute with correct ProviderNode signature"""
        return WikipediaQueryRun(api_wrapper=WikipediaAPIWrapper())
