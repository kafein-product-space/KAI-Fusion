from ..base import ProviderNode, NodeMetadata, NodeType
from langchain_community.tools import GoogleSearchRun
from langchain_community.utilities import GoogleSearchAPIWrapper
from langchain_core.runnables import Runnable

class GoogleSearchToolNode(ProviderNode):
    def __init__(self):
        super().__init__()
        self._metadatas = {
            "name": "GoogleSearchTool",
            "description": "Provides a tool that queries Google Search. Requires SERPAPI_API_KEY environment variable.",
            "node_type": NodeType.PROVIDER,
        }

    def _execute(self, **kwargs) -> Runnable:
        """Execute with correct ProviderNode signature"""
        return GoogleSearchRun(api_wrapper=GoogleSearchAPIWrapper())
