import os
from ..base import ProviderNode, NodeInput, NodeType
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_core.runnables import Runnable

class TavilySearchNode(ProviderNode):
    def __init__(self):
        super().__init__()
        self._metadatas = {
            "name": "TavilySearch",
            "display_name": "In Memory Cache",

            "description": "Provides a tool that uses the Tavily search API.",
            "category": "Tools",
            "node_type": NodeType.PROVIDER,
            "inputs": [
                NodeInput(
                    name="tavily_api_key",
                    type="string",
                    description="Tavily API Key. If not provided, it will be taken from the TAVILY_API_KEY environment variable.",
                    required=False
                )
            ]
        }

    def _execute(self, **kwargs) -> Runnable:
        """Execute with correct ProviderNode signature"""
        tavily_api_key = kwargs.get("tavily_api_key")
        api_key = tavily_api_key or os.getenv("TAVILY_API_KEY")
        if not api_key:
            raise ValueError("Tavily API Key is required.")
        return TavilySearchResults(api_key=api_key)
