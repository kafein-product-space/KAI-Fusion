from typing import Dict, Any
from ..base import ProviderNode, NodeInput, NodeOutput, NodeType
from langchain_core.runnables import Runnable, RunnableLambda
from langchain.globals import set_llm_cache
from langchain.cache import InMemoryCache

class InMemoryCacheNode(ProviderNode):
    """In-memory cache for LLM responses"""
    
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "InMemoryCache",
            "description": "Cache LLM responses in memory",
            "category": "Cache",
            "node_type": NodeType.PROVIDER,
            "inputs": [
                NodeInput(name="max_size", type="int", description="Maximum cache size", default=100),
            ],
            "outputs": [
                NodeOutput(name="output", type="cache", description="Cache instance")
            ]
        }

    def execute(self, **kwargs) -> Runnable:
        """Execute in-memory cache node"""
        cache = InMemoryCache()
        
        # Set as global LLM cache
        set_llm_cache(cache)
        
        # Return a runnable that passes through
        return RunnableLambda(lambda x: x)
