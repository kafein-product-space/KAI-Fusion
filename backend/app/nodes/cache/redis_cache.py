import os
from typing import Dict, Any
from ..base import ProviderNode, NodeInput, NodeOutput, NodeType
from langchain_core.runnables import Runnable, RunnableLambda
from langchain.globals import set_llm_cache
from langchain_community.cache import RedisCache
from langchain_community.cache import InMemoryCache

class RedisCacheNode(ProviderNode):
    """Redis cache for LLM responses"""
    
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "RedisCache",
            "display_name": "Redis Cache",
            "description": "Cache LLM responses in Redis",
            "category": "Cache",
            "node_type": NodeType.PROVIDER,
            "inputs": [
                NodeInput(name="redis_url", type="str", description="Redis connection URL", required=False),
                NodeInput(name="ttl", type="int", description="Cache TTL in seconds", default=3600),
            ],
            "outputs": [
                NodeOutput(name="output", type="cache", description="Cache instance")
            ]
        }

    def execute(self, **kwargs) -> Runnable:
        """Execute Redis cache node"""
        redis_url = kwargs.get("redis_url") or os.getenv("REDIS_URL", "redis://localhost:6379")
        ttl = kwargs.get("ttl", 3600)
        
        try:
            import redis
            
            # Create Redis client
            r = redis.Redis.from_url(redis_url)
            
            # Create cache
            cache = RedisCache(redis_=r, ttl=ttl)
            
            # Set as global LLM cache
            set_llm_cache(cache)
            
        except ImportError:
            print("Warning: Redis not available, using in-memory cache")
            set_llm_cache(InMemoryCache())
        
        # Return a runnable that passes through
        return RunnableLambda(lambda x: x)
