# Barrel exports for all node types
# Enables clean imports like: from nodes import OpenAINode, ReactAgentNode

# Base Classes
from .base import BaseNode, ProviderNode, ProcessorNode, TerminatorNode

# LLM Nodes
from .llms.openai_node import OpenAINode
from .llms.gemini import GeminiNode
from .llms.anthropic_claude import ClaudeNode

# Agent Nodes
from .agents.react_agent import ReactAgentNode

# Chain Nodes
from .chains.conditional_chain import ConditionalChainNode, RouterChainNode
from .chains.sequential_chain import SequentialChainNode
from .chains.llm_chain import LLMChainNode
from .chains.map_reduce_chain import MapReduceChainNode

# Document Loaders
from .document_loaders.pdf_loader import PDFLoaderNode
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

# Public API - what gets imported when doing "from nodes import *"
__all__ = [
    # Base
    "BaseNode", "ProviderNode", "ProcessorNode", "TerminatorNode",
    
    # LLM
    "OpenAINode", "GeminiNode", "ClaudeNode",
    
    # Agents
    "ReactAgentNode",
    
    # Chains
    "ConditionalChainNode", "RouterChainNode", "SequentialChainNode", "LLMChainNode", "MapReduceChainNode",
    
    # Document Loaders
    "PDFLoaderNode", "WebLoaderNode", "SitemapLoaderNode", "YoutubeLoaderNode", "GitHubLoaderNode",
    
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
]

# Node registry for dynamic discovery
NODE_REGISTRY = {
    # LLM Nodes
    "openai": OpenAINode,
    "gemini": GeminiNode,
    "claude": ClaudeNode,
    
    # Agent Nodes
    "react_agent": ReactAgentNode,
    
    # Chain Nodes
    "conditional_chain": ConditionalChainNode,
    "router_chain": RouterChainNode,
    "sequential_chain": SequentialChainNode,
    "llm_chain": LLMChainNode,
    "map_reduce_chain": MapReduceChainNode,
    
    # Document Loaders
    "pdf_loader": PDFLoaderNode,
    "web_loader": WebLoaderNode,
    "sitemap_loader": SitemapLoaderNode,
    "youtube_loader": YoutubeLoaderNode,
    "github_loader": GitHubLoaderNode,
    
    # Embeddings
    "openai_embeddings": OpenAIEmbeddingsNode,
    "huggingface_embeddings": HuggingFaceEmbeddingsNode,
    "cohere_embeddings": CohereEmbeddingsNode,
    
    # Memory Nodes
    "conversation_memory": ConversationMemoryNode,
    "buffer_memory": BufferMemoryNode,
    "summary_memory": SummaryMemoryNode,
    
    # Output Parsers
    "pydantic_output_parser": PydanticOutputParserNode,
    "string_output_parser": StringOutputParserNode,
    
    # Prompt Nodes
    "prompt_template": PromptTemplateNode,
    "agent_prompt": AgentPromptNode,
    
    # Retriever Nodes
    "chroma_retriever": ChromaRetrieverNode,
    
    # Tool Nodes
    "google_search": GoogleSearchToolNode,
    "tavily_search": TavilySearchNode,
    "wikipedia": WikipediaToolNode,
    "json_parser": JSONParserToolNode,
    "web_browser": WebBrowserToolNode,
    "arxiv": ArxivToolNode,
    "wolfram_alpha": WolframAlphaToolNode,
    "requests_get": RequestsGetToolNode,
    "requests_post": RequestsPostToolNode,
    "write_file": WriteFileToolNode,
    "read_file": ReadFileToolNode,
    
    # Utility Nodes
    "calculator": CalculatorNode,
    "text_formatter": TextFormatterNode,
    
    # Text Splitter Nodes
    "character_splitter": CharacterTextSplitterNode,
    "recursive_splitter": RecursiveTextSplitterNode,
    "token_splitter": TokenTextSplitterNode,
    
    # Vector Store Nodes
    "pinecone": PineconeVectorStoreNode,
    "qdrant": QdrantVectorStoreNode,
    "faiss": FaissVectorStoreNode,
    "weaviate": WeaviateVectorStoreNode,
    
    # Cache Nodes
    "in_memory_cache": InMemoryCacheNode,
    "redis_cache": RedisCacheNode,
    
    # Test Node
    "test_hello": TestHelloNode,
    "test_processor": TestProcessorNode,
}

# Category mapping for UI organization
NODE_CATEGORIES = {
    "LLM": ["openai", "gemini", "claude"],
    "Agents": ["react_agent"],
    "Chains": ["conditional_chain", "router_chain", "sequential_chain", "llm_chain", "map_reduce_chain"],
    "Document Loaders": ["pdf_loader", "web_loader", "sitemap_loader", "youtube_loader", "github_loader"],
    "Embeddings": ["openai_embeddings", "huggingface_embeddings", "cohere_embeddings"],
    "Memory": ["conversation_memory", "buffer_memory", "summary_memory"],
    "Output Parsers": ["pydantic_output_parser", "string_output_parser"],
    "Prompts": ["prompt_template", "agent_prompt"],
    "Retrievers": ["chroma_retriever"],
    "Tools": ["google_search", "tavily_search", "wikipedia", "json_parser", "calculator", 
             "web_browser", "arxiv", "wolfram_alpha", "requests_get", "requests_post", 
             "write_file", "read_file"],
    "Utilities": ["text_formatter"],
    "Text Splitters": ["character_splitter", "recursive_splitter", "token_splitter"],
    "Vector Stores": ["pinecone", "qdrant", "faiss", "weaviate"],
    "Cache": ["in_memory_cache", "redis_cache"],
    "Test": ["test_hello", "test_processor"],
}
