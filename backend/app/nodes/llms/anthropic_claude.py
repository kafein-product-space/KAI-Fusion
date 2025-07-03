import os
from typing import Optional
from ..base import ProviderNode, NodeInput, NodeType
from langchain_anthropic import ChatAnthropic
from langchain_core.runnables import Runnable

class ClaudeNode(ProviderNode):
    """Anthropic Claude chat model node"""
    
    _metadatas = {
        "name": "AnthropicClaude",
        "description": "Anthropic Claude chat model for conversational AI",
        "node_type": NodeType.PROVIDER,
        "inputs": [
            NodeInput(name="anthropic_api_key", type="string", description="Anthropic API Key", required=False),
            NodeInput(name="model_name", type="string", description="Model name", default="claude-3-haiku-20240307"),
            NodeInput(name="temperature", type="float", description="Temperature for response randomness", default=0.7),
            NodeInput(name="max_tokens", type="int", description="Maximum tokens to generate", default=1000),
        ]
    }

    def _execute(
        self, 
        anthropic_api_key: Optional[str] = None, 
        model_name: str = "claude-3-haiku-20240307", 
        temperature: float = 0.7,
        max_tokens: int = 1000
    ) -> Runnable:
        """Execute the Claude node and return a configured LLM instance"""
        
        # Use provided API key or fallback to environment variable
        api_key = anthropic_api_key or os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("Anthropic API Key is required. Set ANTHROPIC_API_KEY environment variable or provide anthropic_api_key parameter.")
        
        return ChatAnthropic(
            model_name=model_name,
            temperature=temperature,
            max_tokens_to_sample=max_tokens,
            api_key=api_key,
            timeout=60,
            stop=None
        ) 