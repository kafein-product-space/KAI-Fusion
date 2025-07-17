# Barrel exports for all node types
# Enables clean imports like: from nodes import OpenAINode, ReactAgentNode

# Base Classes
from .base import BaseNode, ProviderNode, ProcessorNode, TerminatorNode

# LLM Nodes
from .llms.openai_node import OpenAINode, OpenAIChatNode

# Agent Nodes
from .agents.react_agent import ReactAgentNode, ToolAgentNode

# Chain Nodes
from .chains.conditional_chain import ConditionalChainNode, RouterChainNode

# Document Loaders
from .document_loaders.text_loader import TextDataLoaderNode, TextLoaderNode

# Embeddings
from .embeddings.openai_embeddings import OpenAIEmbeddingsNode
from .embeddings.cohere_embeddings import CohereEmbeddingsNode

# Memory Nodes
from .memory.conversation_memory import ConversationMemoryNode
from .memory.buffer_memory import BufferMemoryNode

# Tool Nodes
from .tools.tavily_search import TavilySearchNode

# Cache Nodes
from .cache.redis_cache import RedisCacheNode

# Default Nodes
from .default.start_node import StartNode
from .default.end_node import EndNode


# ================================================================
# DEPRECATED: Legacy node registry systems - kept for compatibility
# New code should use the metadata-based node discovery system
# in app.core.node_registry instead of these static mappings
# ================================================================

# Public API - what gets imported when doing "from nodes import *"
__all__ = [
    # Base
    "BaseNode", "ProviderNode", "ProcessorNode", "TerminatorNode",
    
    # LLM
    "OpenAINode", "OpenAIChatNode",
    
    # Agents
    "ReactAgentNode", "ToolAgentNode",
    
    # Chains
    "ConditionalChainNode", "RouterChainNode",
    
    # Document Loaders
    "TextDataLoaderNode", "TextLoaderNode",
    
    # Embeddings
    "OpenAIEmbeddingsNode", "CohereEmbeddingsNode",
    
    # Memory
    "ConversationMemoryNode", "BufferMemoryNode",
    
    # Tools
    "TavilySearchNode",
    
    # Cache
    "RedisCacheNode",
    
    # Default
    "StartNode", "EndNode",
]
