from typing import Any
from ..base import ProviderNode, NodeInput, NodeType
from langchain_community.tools import ArxivQueryRun
from langchain_community.utilities import ArxivAPIWrapper
from langchain_core.runnables import Runnable

class ArxivToolNode(ProviderNode):
    """Arxiv research paper search tool"""
    
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "ArxivTool",
            "description": "Search and retrieve academic papers from arXiv",
            "category": "Tools",
            "node_type": NodeType.PROVIDER,
            "inputs": [
                NodeInput(
                    name="max_results",
                    type="int",
                    description="Maximum number of results to return",
                    default=3,
                    required=False
                )
            ]
        }

    def execute(self, **kwargs) -> Runnable:
        """Execute the Arxiv tool node"""
        max_results = kwargs.get("max_results", 3)
        
        api_wrapper = ArxivAPIWrapper(
            top_k_results=max_results,
            doc_content_chars_max=2000
        )
        
        return ArxivQueryRun(api_wrapper=api_wrapper)
