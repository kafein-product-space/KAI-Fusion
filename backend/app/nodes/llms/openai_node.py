from ..base import ProviderNode, NodeInput, NodeOutput, NodeType
from langchain_openai import ChatOpenAI
from langchain_core.runnables import Runnable
from typing import Dict, Any
import os
import asyncio
from pydantic import SecretStr

from app.core.credential_provider import get_openai_credential

class OpenAINode(ProviderNode):
    _metadatas = {
        "name": "OpenAIChat",
        "description": "OpenAI Chat Model for text generation",
        "category": "LLM",
        "node_type": NodeType.PROVIDER,
        "inputs": [
            NodeInput(
                name="model_name",
                type="str",
                description="OpenAI model to use",
                default="gpt-3.5-turbo",
                required=False
            ),
            NodeInput(
                name="temperature",
                type="float",
                description="Sampling temperature (0-2)",
                default=0.7,
                required=False
            ),
            NodeInput(
                name="max_tokens",
                type="int",
                description="Maximum tokens to generate",
                default=500,
                required=False
            ),
            NodeInput(
                name="credential_name",
                type="str",
                description="Name of OpenAI credential to use (optional)",
                required=False
            ),
            NodeInput(
                name="api_key",
                type="str", 
                description="Direct API Key (fallback, not recommended for production)",
                required=False
            )
        ],
        "outputs": [
            NodeOutput(
                name="output",
                type="llm",
                description="OpenAI Chat LLM instance"
            )
        ]
    }

    def _execute(self, **kwargs) -> Runnable:
        """
        Execute OpenAI node with secure credential management
        """
        api_key = None
        
        # Try to get API key from CredentialProvider first
        credential_name = kwargs.get("credential_name")
        
        # Get context_id from state (this would be set by GraphBuilder)
        context_id = getattr(self, 'context_id', None)
        
        if context_id:
            try:
                # Try to get credential from provider
                api_key = asyncio.run(get_openai_credential(context_id, credential_name))
            except Exception as e:
                print(f"Warning: Could not fetch OpenAI credential: {e}")
        
        # Fallback to direct API key if provided
        if not api_key:
            api_key = kwargs.get("api_key")
        
        # Fallback to environment variable
        if not api_key:
            api_key = os.getenv("OPENAI_API_KEY")
        
        if not api_key:
            raise ValueError(
                "OpenAI API key not available. Please either:\n"
                "1. Set up an OpenAI credential via /credentials endpoint\n"
                "2. Provide api_key parameter\n"
                "3. Set OPENAI_API_KEY environment variable"
            )
        
        # Create and return LLM with secure API key
        return ChatOpenAI(
            model=kwargs.get("model_name", "gpt-3.5-turbo"),
            temperature=kwargs.get("temperature", 0.7),
            max_tokens=kwargs.get("max_tokens", 500),
            api_key=SecretStr(api_key)  # Pass API key as SecretStr
        ) 