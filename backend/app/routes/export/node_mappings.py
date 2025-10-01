# -*- coding: utf-8 -*-
"""Node name mappings and base class definitions for export system."""

import logging
from langchain_core.runnables import Runnable, RunnableLambda

logger = logging.getLogger(__name__)

# ================================================================================
# NODE NAME MAPPING - Frontend workflow names → Export class names
# ================================================================================

# Node name mapping table - Frontend workflow names → Export class names
NODE_NAME_MAPPINGS = {
    # LLM Nodes
    "OpenAIChat": "OpenAIChatNode",
    "OpenAI": "OpenAIChatNode",
    "gpt": "OpenAIChatNode",

    # Memory Nodes
    "BufferMemory": "BufferMemoryNode",
    "buffer_memory": "BufferMemoryNode",
    "ConversationMemory": "ConversationMemoryNode",
    "conversation_memory": "ConversationMemoryNode",

    # Agent Nodes
    "ReactAgent": "ReactAgentNode",
    "ToolAgent": "ToolAgentNode",
    "react_agent": "ReactAgentNode",

    # Tool Nodes
    "TavilyWebSearch": "TavilyWebSearchNode",
    "TavilySearch": "TavilyWebSearchNode",
    "HttpClient": "HttpClientNode",
    "CohereReranker": "CohereRerankerNode",
    "Retriever": "RetrieverNode",

    # Base Classes
    "MemoryNode": "MemoryNode",
    "ProcessorNode": "ProcessorNode",
    "ProviderNode": "ProviderNode",
    "TerminatorNode": "TerminatorNode"
}

def resolve_node_name(workflow_node_type: str) -> str:
    """🔥 Resolve workflow node type to export class name"""
    return NODE_NAME_MAPPINGS.get(workflow_node_type, f"{workflow_node_type}Node")

# ================================================================================
# MODULE-LEVEL BASE CLASS DEFINITIONS (for _register_critical_missing_classes)
# ================================================================================

class BaseNode:
    """🔥 Module-level BaseNode for inheritance in registration functions."""
    def __init__(self):
        self._metadata = {}
        self.user_data = {}
        self.node_type = "base"

    def execute(self, **kwargs) -> Runnable:
        def base_exec(input_data):
            return {"output": f"{self.__class__.__name__}: {input_data.get('input', '')}", "type": "base_result"}
        return RunnableLambda(base_exec)

class ProviderNode(BaseNode):
    """🔥 Module-level ProviderNode."""
    def __init__(self):
        super().__init__()
        self.node_type = "provider"

class ProcessorNode(BaseNode):
    """🔥 Module-level ProcessorNode."""
    def __init__(self):
        super().__init__()
        self.node_type = "processor"

class TerminatorNode(BaseNode):
    """🔥 Module-level TerminatorNode."""
    def __init__(self):
        super().__init__()
        self.node_type = "terminator"

class MemoryNode(BaseNode):
    """🔥 Module-level MemoryNode - Critical for inheritance."""
    def __init__(self):
        super().__init__()
        self.node_type = "memory"
        self._metadata = {"name": "MemoryNode", "node_type": "memory"}

__all__ = [
    'NODE_NAME_MAPPINGS',
    'resolve_node_name',
    'BaseNode',
    'ProviderNode',
    'ProcessorNode',
    'TerminatorNode',
    'MemoryNode'
]