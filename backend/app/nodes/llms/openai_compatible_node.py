"""
KAI-Fusion OpenAI Compatible Node
===============================

This module provides a universal node for connecting to any OpenAI-compatible API 
(OpenRouter, LocalAI, vLLM, DeepSeek, Groq, etc.). It allows users to specify 
a custom base URL and model name, enabling access to a vast ecosystem of models.

KEY FEATURES:
- Universal Base URL support
- Flexible Model Name input
- Automatic Header management for specific providers (e.g. OpenRouter)
- Standard OpenAI parameter support
"""

from typing import Dict, Any, Optional, List
from langchain_openai import ChatOpenAI
from langchain_core.runnables import Runnable
from pydantic import SecretStr

from ..base import BaseNode, NodeType, NodeInput, NodeOutput, NodeProperty, NodePropertyType, NodePosition

class OpenAICompatibleNode(BaseNode):
    """
    Universal OpenAI-Compatible LLM Provider
    ======================================
    
    This node serves as a bridge to any service that implements the OpenAI Chat Completion API.
    It can connect to commercial providers like OpenRouter, Groq, DeepSeek or local 
    inference servers like LocalAI, vLLM, and Ollama (via compatibility mode).
    
    CONFIGURATION:
    -------------
    - Base URL: The API endpoint (e.g. https://openrouter.ai/api/v1, http://localhost:8080/v1)
    - Model Name: The specific model identifier
    - API Key: Authentication token for the service (optional for some local servers)
    """
    
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "OpenAICompatibleNode",
            "display_name": "OpenAI Compatible",
            "description": "Connect to any OpenAI-compatible API (OpenRouter, LocalAI, vLLM, Groq, etc.)",
            "category": "LLM",
            "node_type": NodeType.PROVIDER,
            "icon": {"name": "openai", "path": "icons/openai.svg", "alt": "openaiicons"},
            "colors": ["blue-500", "cyan-600"],
            "inputs": [
                NodeInput(
                    name="base_url",
                    type="str",
                    description="API Base URL (e.g. https://api.groq.com/openai/v1)",
                    default="https://openrouter.ai/api/v1",
                    required=True,
                ),
                NodeInput(
                    name="model_name",
                    type="str",
                    description="Model identifier (e.g. llama3-70b-8192)",
                    default="anthropic/claude-3.5-sonnet",
                    required=True,
                ),
                NodeInput(
                    name="temperature",
                    type="float",
                    description="Sampling temperature (0.0-2.0)",
                    default=0.7,
                    required=False,
                ),
                NodeInput(
                    name="max_tokens",
                    type="int",
                    description="Maximum tokens to generate",
                    default=4096,
                    required=False,
                ),
                NodeInput(
                    name="top_p",
                    type="float",
                    description="Nucleus sampling parameter (0.0-1.0)",
                    default=1.0,
                    required=False,
                ),
                NodeInput(
                    name="system_prompt",
                    type="str",
                    description="System prompt for the model",
                    default="You are a helpful AI assistant.",
                    required=False,
                ),
                NodeInput(
                    name="streaming",
                    type="bool",
                    description="Enable streaming responses",
                    default=False,
                    required=False
                ),
                # OpenRouter specific optional inputs
                NodeInput(
                    name="site_url",
                    type="str",
                    description="Your site URL (for OpenRouter rankings)",
                    default="",
                    required=False
                ),
                NodeInput(
                    name="site_name",
                    type="str",
                    description="Your site name (for OpenRouter rankings)",
                    default="KAI-Fusion",
                    required=False
                )
            ],
            "outputs": [
                NodeOutput(
                    name="llm",
                    displayName="LLM",
                    type="llm",
                    description="Configured LLM instance",
                    is_connection=True,
                    direction=NodePosition.TOP
                ),
                NodeOutput(
                    name="config_info",
                    type="dict",
                    description="Applied configuration details"
                )
            ],
            "properties": [
                NodeProperty(
                    name="credential_id",
                    displayName="API Key (Credential)",
                    type=NodePropertyType.CREDENTIAL_SELECT,
                    placeholder="Select API Key",
                    required=False, # Some local servers don't need keys
                    hint="Required for commercial providers, optional for some local servers"
                ),
                NodeProperty(
                    name="base_url",
                    displayName="Base URL",
                    type=NodePropertyType.TEXT,
                    default="https://openrouter.ai/api/v1",
                    placeholder="https://api.openai.com/v1",
                    description="The API endpoint URL",
                    required=True
                ),
                NodeProperty(
                    name="model_name",
                    displayName="Model Name",
                    type=NodePropertyType.TEXT,
                    default="anthropic/claude-3.5-sonnet",
                    placeholder="e.g. meta-llama/llama-3-70b-instruct",
                    description="Enter the exact model ID from the provider",
                    required=True
                ),
                NodeProperty(
                    name="temperature",
                    displayName="Temperature",
                    type=NodePropertyType.RANGE,
                    default=0.7,
                    min=0.0,
                    max=2.0,
                    step=0.1,
                    required=True
                ),
                NodeProperty(
                    name="max_tokens",
                    displayName="Max Tokens",
                    type=NodePropertyType.NUMBER,
                    default=4096,
                    min=1,
                    max=200000,
                    required=True
                )
            ]
        }

    def get_required_packages(self) -> list[str]:
        return [
            "langchain-openai>=0.0.5",
            "openai>=1.0.0"
        ]

    def execute(self, **kwargs) -> Runnable:
        """Execute Node to create the ChatOpenAI instance."""
        print(f"\nOPENAI COMPATIBLE NODE SETUP")
        
        # Extract configuration
        base_url = self.user_data.get("base_url", "https://openrouter.ai/api/v1")
        model_name = self.user_data.get("model_name", "anthropic/claude-3.5-sonnet")
        temperature = float(self.user_data.get("temperature", 0.7))
        max_tokens = int(self.user_data.get("max_tokens", 4096))
        top_p = float(self.user_data.get("top_p", 1.0))
        streaming = bool(self.user_data.get("streaming", False))
        
        # OpenRouter specific params
        site_url = self.user_data.get("site_url", "")
        site_name = self.user_data.get("site_name", "KAI-Fusion")
        
        # Get API Key
        credential_id = self.user_data.get("credential_id")
        api_key_value = ""
        if credential_id:
            cred = self.get_credential(credential_id)
            if cred and cred.get('secret'):
                api_key_value = cred.get('secret').get('api_key')
        
        if not api_key_value:
             # Some local endpoints might not require a key.
             # We provide a dummy key because langchain/openai usually expects one.
             api_key_value = "sk-no-key-required"
             print("INFO: No API Key provided. Using placeholder key.")
        
        # Prepare Extra Headers
        extra_headers = {}
        
        # Add OpenRouter specific headers if connecting to OpenRouter
        if "openrouter.ai" in base_url:
            if site_url:
                extra_headers["HTTP-Referer"] = site_url
            if site_name:
                extra_headers["X-Title"] = site_name

        # Build LLM Configuration
        llm_config = {
            "model": model_name,
            "openai_api_base": base_url,
            "openai_api_key": SecretStr(api_key_value),
            "temperature": temperature,
            "max_tokens": max_tokens,
            "top_p": top_p,
            "streaming": streaming,
            "model_kwargs": {
                "extra_headers": extra_headers
            } if extra_headers else {}
        }
        
        try:
            llm = ChatOpenAI(**llm_config)
            
            print(f"   Provider Base: {base_url}")
            print(f"   Model: {model_name} | Temp: {temperature}")
            
            return llm
            
        except Exception as e:
            error_msg = f"Failed to create OpenAI Compatible LLM: {str(e)}"
            print(f"ERROR: {error_msg}")
            raise ValueError(error_msg) from e

