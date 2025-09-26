# Barrel exports for all node types
# Enables clean imports like: from nodes import OpenAINode, ReactAgentNode

# Base Classes
from .base import BaseNode, ProviderNode, ProcessorNode, TerminatorNode, NodeMetadata, NodeInput, NodeOutput, NodeType

# LLM Nodes
from .llms.openai_node import OpenAINode, OpenAIChatNode

# Agent Nodes
from .agents.react_agent import ReactAgentNode, ToolAgentNode

# Embedding Nodes
from .embeddings.openai_embeddings_provider import OpenAIEmbeddingsProvider

# Memory Nodes
from .memory.conversation_memory import ConversationMemoryNode
from .memory.buffer_memory import BufferMemoryNode

# Tool Nodes
from .tools.tavily_search import TavilySearchNode
from .tools.http_client import HttpClientNode
from .tools.cohere_reranker import CohereRerankerNode
from .tools.retriever import RetrieverProvider

# Document Loaders
from .document_loaders.web_scraper import WebScraperNode

# Splitters (moved from text_processing)
from .splitters.chunk_splitter import ChunkSplitterNode

# Vector Stores
from .vector_stores.vector_store_orchestrator import VectorStoreOrchestrator

# Default Nodes
from .default.start_node import StartNode
from .default.end_node import EndNode

# Trigger Nodes
from .triggers.webhook_trigger import WebhookTriggerNode
from .triggers.timer_start_node import TimerStartNode

# Text Processing Nodes
from .text_processing.string_input_node import StringInputNode


# ================================================================
# DEPRECATED: Legacy node registry systems - kept for compatibility
# New code should use the metadata-based node discovery system
# in app.core.node_registry instead of these static mappings
# ================================================================

# Public API - what gets imported when doing "from nodes import *"
__all__ = [
    # Base
    "BaseNode", "ProviderNode", "ProcessorNode", "TerminatorNode",
    "NodeMetadata", "NodeInput", "NodeOutput", "NodeType",
    
    # LLM
    "OpenAINode", "OpenAIChatNode",
    
    # Agents
    "ReactAgentNode", "ToolAgentNode",
    
    # Embeddings
    "OpenAIEmbeddingsProvider",
    
    # Memory
    "ConversationMemoryNode", "BufferMemoryNode",
    
    # Tools
    "TavilySearchNode", "HttpClientNode", "CohereRerankerNode", "RetrieverProvider",
    
    # Document Loaders
    "WebScraperNode",
    
    # Splitters
    "ChunkSplitterNode",
    
    # Vector Stores
    "VectorStoreOrchestrator",
    
    # Default & Triggers
    "StartNode", "EndNode", "WebhookTriggerNode", "TimerStartNode",
]
