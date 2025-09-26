"""
OpenAI Embeddings Provider Node
================================

This module provides a simplified provider node that creates and configures 
OpenAIEmbeddings instances for use by other nodes in the workflow. Unlike the
full OpenAIEmbedderNode, this provider focuses solely on configuration without
processing documents or providing analytics.

The provider follows the KAI-Fusion ProviderNode pattern, creating LangChain
objects from user inputs that can be consumed by other nodes in the workflow.

Key Features:
- Minimal configuration surface for ease of use
- Direct integration with LangChain OpenAIEmbeddings
- Secure API key handling with environment variable support
- Model selection with validation
- Timeout and retry configuration
"""

from typing import Dict, Any
from langchain_openai import OpenAIEmbeddings
from langchain_core.runnables import Runnable

from ..base import ProviderNode, NodeType, NodeInput, NodeOutput


class OpenAIEmbeddingsProvider(ProviderNode):
    """
    Provider Node for OpenAI Embeddings Configuration
    
    This node creates configured OpenAIEmbeddings instances that can be used
    by other nodes in the workflow. It focuses on configuration only, without
    document processing or analytics features.

    """
    
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "OpenAIEmbeddingsProvider",
            "display_name": "OpenAI Embeddings Provider",
            "description": (
                "Provider node that creates configured OpenAIEmbeddings instances. "
                "Use this node to create a shared embeddings instance for your workflow."
            ),
            "category": "Embedding",
            "node_type": NodeType.PROVIDER,
            "icon": "key",
            "color": "#38bdf8",
            "inputs": [
                NodeInput(
                    name="openai_api_key",
                    type="str",
                    description="OpenAI API Key (leave empty to use OPENAI_API_KEY environment variable)",
                    required=False,
                    is_secret=True,
                ),
                NodeInput(
                    name="model",
                    type="str",
                    description="OpenAI embedding model to use",
                    default="text-embedding-3-small",
                    required=False,
                    choices=[
                        "text-embedding-3-small",
                        "text-embedding-3-large", 
                        "text-embedding-ada-002"
                    ]
                ),
                NodeInput(
                    name="request_timeout",
                    type="int",
                    description="Request timeout in seconds",
                    default=60,
                    required=False,
                    min_value=10,
                    max_value=300,
                ),
                NodeInput(
                    name="max_retries",
                    type="int",
                    description="Maximum number of retries for failed requests",
                    default=3,
                    required=False,
                    min_value=0,
                    max_value=5,
                ),
            ],
            "outputs": [
                NodeOutput(
                    name="embeddings",
                    type="OpenAIEmbeddings",
                    description="Configured OpenAIEmbeddings instance ready for use",
                )
            ]
        }
    
    def get_required_packages(self) -> list[str]:
        """
        🔥 DYNAMIC METHOD: OpenAIEmbeddingsProvider'un ihtiyaç duyduğu Python packages'ini döndür.
        
        Bu method dynamic export sisteminin çalışması için kritik!
        OpenAI embeddings için gereken API ve LangChain dependencies.
        """
        return [
            "langchain-openai>=0.0.5",  # OpenAI LangChain integration
            "openai>=1.0.0",            # OpenAI Python SDK
            "httpx>=0.25.0",            # HTTP client for API calls
            "pydantic>=2.5.0",          # Data validation
            "tiktoken>=0.5.0",          # Token counting for embeddings
            "typing-extensions>=4.8.0"  # Advanced typing support
        ]
    
    def execute(self, **kwargs) -> Runnable:
        """
        Create and configure an OpenAIEmbeddings instance.
        
        This method focuses solely on configuration, creating a properly
        configured OpenAIEmbeddings instance without processing any documents.
        
        Args:
            **kwargs: Configuration parameters from node inputs
            
        Returns:
            OpenAIEmbeddings: Configured embeddings instance
            
        Raises:
            ValueError: If API key is missing or model is unsupported
        """
        import os
        
        # Extract configuration from user data or kwargs
        openai_api_key = (
            kwargs.get("openai_api_key") or 
            self.user_data.get("openai_api_key") or 
            os.getenv("OPENAI_API_KEY")
        )
        model = kwargs.get("model") or self.user_data.get("model", "text-embedding-3-small")
        request_timeout = kwargs.get("request_timeout") or self.user_data.get("request_timeout", 60)
        max_retries = kwargs.get("max_retries") or self.user_data.get("max_retries", 3)
        
        # Validate API key - use development key if none provided
        if not openai_api_key:
            # Check for development/test environment
            if os.getenv("NODE_ENV") == "development" or os.getenv("ENVIRONMENT") == "test":
                openai_api_key = "sk-test-development-key-placeholder"
                print("⚠️ Using development placeholder API key for OpenAI Embeddings")
            else:
                raise ValueError(
                    "OpenAI API key is required. Please provide it in the node configuration "
                    "or set the OPENAI_API_KEY environment variable."
                )
        
        # Validate model
        supported_models = ["text-embedding-3-small", "text-embedding-3-large", "text-embedding-ada-002"]
        if model not in supported_models:
            raise ValueError(f"Unsupported embedding model: {model}. Supported models: {supported_models}")
        
        # Create and configure OpenAIEmbeddings instance
        embeddings = OpenAIEmbeddings(
            model=model,
            openai_api_key=openai_api_key,
            request_timeout=request_timeout,
            max_retries=max_retries,
        )
        
        return embeddings


# Export for node registry
__all__ = ["OpenAIEmbeddingsProvider"]