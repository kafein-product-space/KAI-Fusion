import os
from typing import Any
from ..base import ProviderNode, NodeInput, NodeType
from langchain_community.tools import WolframAlphaQueryRun
from langchain_community.utilities import WolframAlphaAPIWrapper
from langchain_core.runnables import Runnable

class WolframAlphaToolNode(ProviderNode):
    """Wolfram Alpha computational tool"""
    
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "WolframAlphaTool",
            "display_name": "Wolfram Alpha Tool",
            "description": "Computational knowledge engine for math, science, and data analysis",
            "category": "Tools",
            "node_type": NodeType.PROVIDER,
            "inputs": [
                NodeInput(
                    name="wolfram_alpha_appid",
                    type="str",
                    description="Wolfram Alpha App ID",
                    required=False
                )
            ]
        }

    def execute(self, **kwargs) -> Runnable:
        """Execute the Wolfram Alpha tool node"""
        app_id = kwargs.get("wolfram_alpha_appid") or os.getenv("WOLFRAM_ALPHA_APPID")
        
        if not app_id:
            # Return mock tool for testing
            from langchain.tools import Tool
            
            def mock_wolfram(query: str) -> str:
                return f"MOCK_WOLFRAM_RESULT for '{query}'"
            
            return Tool(
                name="WolframAlpha",
                description="Mock Wolfram Alpha tool",
                func=mock_wolfram
            )
        
        api_wrapper = WolframAlphaAPIWrapper(wolfram_alpha_appid=app_id)
        return WolframAlphaQueryRun(api_wrapper=api_wrapper)
