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

# Document Loaders
from .document_loaders.pdf_loader import PDFLoaderNode
from .document_loaders.web_loader import WebLoaderNode, SitemapLoaderNode, YoutubeLoaderNode, GitHubLoaderNode

# Memory Nodes
from .memory.conversation_memory import ConversationMemoryNode

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

# Utility Nodes
from .utilities.calculator import CalculatorNode
from .utilities.text_formatter import TextFormatterNode

# Text Splitter Nodes
from .text_splitters.character_splitter import CharacterTextSplitterNode



# Test Node
from .test_node import TestHelloNode

# Public API - what gets imported when doing "from nodes import *"
__all__ = [
    # Base
    "BaseNode", "ProviderNode", "ProcessorNode", "TerminatorNode",
    
    # LLM
    "OpenAINode", "GeminiNode", "ClaudeNode",
    
    # Agents
    "ReactAgentNode",
    
    # Chains
    "ConditionalChainNode", "RouterChainNode", "SequentialChainNode",
    
    # Document Loaders
    "PDFLoaderNode", "WebLoaderNode", "SitemapLoaderNode", "YoutubeLoaderNode", "GitHubLoaderNode",
    
    # Memory
    "ConversationMemoryNode",
    
    # Output Parsers
    "PydanticOutputParserNode", "StringOutputParserNode",
    
    # Prompts
    "PromptTemplateNode", "AgentPromptNode",
    
    # Retrievers
    "ChromaRetrieverNode",
    
    # Tools
    "GoogleSearchToolNode", "TavilySearchNode", "WikipediaToolNode", "JSONParserToolNode",
    
    # Utilities
    "CalculatorNode", "TextFormatterNode",
    
    # Text Splitters
    "CharacterTextSplitterNode",
    

    
    # Test
    "TestHelloNode",
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
    
    # Document Loaders
    "pdf_loader": PDFLoaderNode,
    "web_loader": WebLoaderNode,
    "sitemap_loader": SitemapLoaderNode,
    "youtube_loader": YoutubeLoaderNode,
    "github_loader": GitHubLoaderNode,
    
    # Memory Nodes
    "conversation_memory": ConversationMemoryNode,
    
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
    
    # Utility Nodes
    "calculator": CalculatorNode,
    "text_formatter": TextFormatterNode,
    
    # Text Splitter Nodes
    "character_splitter": CharacterTextSplitterNode,
    

    
    # Test Node
    "test_hello": TestHelloNode,
}

# Category mapping for UI organization
NODE_CATEGORIES = {
    "LLM": ["openai", "gemini", "claude"],
    "Agents": ["react_agent"],
    "Chains": ["conditional_chain", "router_chain", "sequential_chain"],
    "Document Loaders": ["pdf_loader", "web_loader", "sitemap_loader", "youtube_loader", "github_loader"],
    "Memory": ["conversation_memory"],
    "Output Parsers": ["pydantic_output_parser", "string_output_parser"],
    "Prompts": ["prompt_template", "agent_prompt"],
    "Retrievers": ["chroma_retriever"],
    "Tools": ["google_search", "tavily_search", "wikipedia", "json_parser", "calculator"],
    "Utilities": ["text_formatter"],
    "Text Splitters": ["character_splitter"],
    "Test": ["test_hello"],
}
