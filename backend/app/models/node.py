from enum import Enum

class NodeCategory(str, Enum):
    """Node category enumeration"""
    LLM = "llm"
    TOOL = "tool"
    AGENT = "agent"
    CHAIN = "chain"
    MEMORY = "memory"
    VECTOR_STORE = "vector_store"
    DOCUMENT_LOADER = "document_loader"
    TEXT_SPLITTER = "text_splitter"
    EMBEDDING = "embedding"
    TRIGGER = "trigger"
    UTILITY = "utility"
    INTEGRATION = "integration"
    CUSTOM = "custom" 