# Barrel exports for all node types
# Enables clean imports like: from nodes import OpenAINode, ReactAgentNode

# Base Classes
from .base import BaseNode, ProviderNode, ProcessorNode, TerminatorNode

# LLM Nodes
from .llms.openai_node import OpenAINode, OpenAIChatNode
# Agent Nodes
from .agents.react_agent import ReactAgentNode, ToolAgentNode

# Embeddings
from .embeddings.openai_embeddings import OpenAIEmbeddingsNode

# Memory Nodes
from .memory.conversation_memory import ConversationMemoryNode
from .memory.buffer_memory import BufferMemoryNode

# Tool Nodes
from .tools.tavily_search import TavilySearchNode

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
    
    
    # Embedding
    "OpenAIEmbeddingsNode",
    
    # Memory
    "ConversationMemoryNode", "BufferMemoryNode",
    
    # Tools
    "TavilySearchNode",
    
    # Default
    "StartNode", "EndNode",
]
