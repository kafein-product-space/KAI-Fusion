# Barrel exports for all node types
# Enables clean imports like: from nodes import OpenAINode, ReactAgentNode

# Base Classes
from .base import BaseNode, ProviderNode, ProcessorNode, TerminatorNode

# LLM Nodes
from .llms.openai_node import OpenAINode, OpenAIChatNode
from .llms.gemini import GeminiNode
from .llms.anthropic_claude import ClaudeNode

# Agent Nodes
from .agents.react_agent import ReactAgentNode, ToolAgentNode

# Chain Nodes
from .chains.conditional_chain import ConditionalChainNode, RouterChainNode
from .chains.sequential_chain import SequentialChainNode
from .chains.llm_chain import LLMChainNode
from .chains.map_reduce_chain import MapReduceChainNode

# Document Loaders
from .document_loaders.pdf_loader import PDFLoaderNode
from .document_loaders.text_loader import TextDataLoaderNode, TextLoaderNode
from .document_loaders.web_loader import WebLoaderNode, SitemapLoaderNode, YoutubeLoaderNode, GitHubLoaderNode

# Embeddings
from .embeddings.openai_embeddings import OpenAIEmbeddingsNode
from .embeddings.huggingface_embeddings import HuggingFaceEmbeddingsNode
from .embeddings.cohere_embeddings import CohereEmbeddingsNode

# Memory Nodes
from .memory.conversation_memory import ConversationMemoryNode
from .memory.buffer_memory import BufferMemoryNode
from .memory.summary_memory import SummaryMemoryNode

# Output Parsers
from .output_parsers.pydantic_output_parser import PydanticOutputParserNode
from .output_parsers.string_output_parser import StringOutputParserNode

# Prompt Nodes
from .prompts.prompt_template import PromptTemplateNode
from .prompts.agent_prompt import AgentPromptNode

# Retriever Nodes
from .retrievers.chroma_retriever import ChromaRetrieverNode

# Tool Nodes
from .tools.google_search_tool import GoogleSearchToolNode
from .tools.tavily_search import TavilySearchNode
from .tools.wikipedia_tool import WikipediaToolNode
from .tools.json_parser_tool import JSONParserToolNode
from .tools.web_browser import WebBrowserToolNode
from .tools.arxiv_tool import ArxivToolNode
from .tools.wolfram_alpha import WolframAlphaToolNode
from .tools.requests_tool import RequestsGetToolNode, RequestsPostToolNode
from .tools.file_tools import WriteFileToolNode, ReadFileToolNode

# Utility Nodes
from .utilities.calculator import CalculatorNode
from .utilities.text_formatter import TextFormatterNode

# Text Splitter Nodes
from .text_splitters.character_splitter import CharacterTextSplitterNode
from .text_splitters.recursive_splitter import RecursiveTextSplitterNode
from .text_splitters.token_splitter import TokenTextSplitterNode

# Vector Store Nodes
from .vectorstores.pinecone_vectorstore import PineconeVectorStoreNode
from .vectorstores.qdrant_vectorstore import QdrantVectorStoreNode
from .vectorstores.faiss_vectorstore import FaissVectorStoreNode
from .vectorstores.weaviate_vectorstore import WeaviateVectorStoreNode

# Cache Nodes
from .cache.in_memory_cache import InMemoryCacheNode
from .cache.redis_cache import RedisCacheNode

# Test Node
from .test_node import TestHelloNode, TestProcessorNode

# Other Nodes
from .other.condition_node import ConditionNode
from .other.generic_node import GenericNode

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
    "OpenAINode", "OpenAIChatNode", "GeminiNode", "ClaudeNode",
    
    # Agents
    "ReactAgentNode", "ToolAgentNode",
    
    # Chains
    "ConditionalChainNode", "RouterChainNode", "SequentialChainNode", "LLMChainNode", "MapReduceChainNode",
    
    # Document Loaders
    "PDFLoaderNode", "TextDataLoaderNode", "TextLoaderNode", "WebLoaderNode", "SitemapLoaderNode", "YoutubeLoaderNode", "GitHubLoaderNode",
    
    # Embeddings
    "OpenAIEmbeddingsNode", "HuggingFaceEmbeddingsNode", "CohereEmbeddingsNode",
    
    # Memory
    "ConversationMemoryNode", "BufferMemoryNode", "SummaryMemoryNode",
    
    # Output Parsers
    "PydanticOutputParserNode", "StringOutputParserNode",
    
    # Prompts
    "PromptTemplateNode", "AgentPromptNode",
    
    # Retrievers
    "ChromaRetrieverNode",
    
    # Tools
    "GoogleSearchToolNode", "TavilySearchNode", "WikipediaToolNode", "JSONParserToolNode",
    "WebBrowserToolNode", "ArxivToolNode", "WolframAlphaToolNode", 
    "RequestsGetToolNode", "RequestsPostToolNode", "WriteFileToolNode", "ReadFileToolNode",
    
    # Utilities
    "CalculatorNode", "TextFormatterNode",
    
    # Text Splitters
    "CharacterTextSplitterNode", "RecursiveTextSplitterNode", "TokenTextSplitterNode",
    
    # Vector Stores
    "PineconeVectorStoreNode", "QdrantVectorStoreNode", "FaissVectorStoreNode", "WeaviateVectorStoreNode",
    
    # Cache
    "InMemoryCacheNode", "RedisCacheNode",
    
    # Test
    "TestHelloNode", "TestProcessorNode",
    
    # Other
    "ConditionNode", "GenericNode",
]
