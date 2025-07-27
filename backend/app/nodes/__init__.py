# Barrel exports for all node types
# Enables clean imports like: from nodes import OpenAINode, ReactAgentNode

# Base Classes
from .base import BaseNode, ProviderNode, ProcessorNode, TerminatorNode

# LLM Nodes
from .llms.openai_node import OpenAINode, OpenAIChatNode

# Agent Nodes
from .agents.react_agent import ReactAgentNode, ToolAgentNode

# Embedding Nodes
from .embeddings.openai_embeddings import OpenAIEmbedderNode

# Memory Nodes
from .memory.conversation_memory import ConversationMemoryNode
from .memory.buffer_memory import BufferMemoryNode

# Tool Nodes
from .tools.tavily_search import TavilySearchNode
from .tools.reranker import RerankerNode 
from .tools.http_client import HttpClientNode

# Document Loaders
from .document_loaders.web_scraper import WebScraperNode

# Splitters (moved from text_processing)
from .splitters.chunk_splitter import ChunkSplitterNode

# Vector Stores
from .vector_stores.pgvector_store import PGVectorStoreNode

# Chains
from .chains.retrieval_qa import RetrievalQANode

# Default Nodes (including new trigger nodes)
from .default.start_node import StartNode
from .default.end_node import EndNode
from .default.webhook_start_node import WebhookStartNode
from .default.timer_start_node import TimerStartNode


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
    
    # Embeddings
    "OpenAIEmbedderNode",
    
    # Memory
    "ConversationMemoryNode", "BufferMemoryNode",
    
    # Tools
    "TavilySearchNode", "RerankerNode", "HttpClientNode",
    
    # Document Loaders
    "WebScraperNode",
    
    # Splitters
    "ChunkSplitterNode",
    
    # Vector Stores
    "PGVectorStoreNode",
    
    # Chains
    "RetrievalQANode",
    
    # Default & Triggers
    "StartNode", "EndNode", "WebhookStartNode", "TimerStartNode",
]
