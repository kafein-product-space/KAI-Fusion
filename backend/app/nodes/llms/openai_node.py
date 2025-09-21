"""
KAI-Fusion OpenAI LLM Integration - Enterprise-Grade AI Language Models
=====================================================================

This module provides sophisticated integration with OpenAI's language models,
offering enterprise-grade features, comprehensive model management, and
intelligent cost optimization. Built for production environments requiring
reliability, performance, and advanced configuration capabilities.


AUTHORS: KAI-Fusion Development Team
MAINTAINER: AI Infrastructure Team
VERSION: 2.1.0
LAST_UPDATED: 2025-07-26
LICENSE: Proprietary - KAI-Fusion Platform
"""

from typing import Dict, Any, Optional, List
import os
from langchain_openai import ChatOpenAI
from langchain_core.runnables import Runnable
from pydantic import SecretStr

from ..base import ProviderNode, NodeType, NodeInput, NodeOutput


# ================================================================================
# OPENAI NODE - ENTERPRISE AI LANGUAGE MODEL PROVIDER
# ================================================================================

class OpenAINode(ProviderNode):
    """
    Enterprise-Grade OpenAI Language Model Provider
    =============================================
    
    The OpenAINode represents the pinnacle of language model integration within
    the KAI-Fusion platform, providing seamless access to OpenAI's cutting-edge
    AI models with enterprise-grade reliability, security, and optimization.
    
    This node serves as the intelligent foundation for countless AI workflows,
    from simple text generation to complex reasoning tasks, all while maintaining
    production-level performance and cost efficiency.

    
    AUTHORS: KAI-Fusion AI Infrastructure Team
    MAINTAINER: OpenAI Integration Specialists  
    VERSION: 2.1.0
    LAST_UPDATED: 2025-07-26
    LICENSE: Proprietary - KAI-Fusion Platform
    """
    
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "OpenAIChat",
            "display_name": "OpenAI GPT",
            "description": "OpenAI Chat completion using latest GPT models with advanced configuration",
            "category": "LLM",
            "node_type": NodeType.PROVIDER,
            "inputs": [
                NodeInput(
                    name="model_name",
                    type="str",
                    description="OpenAI model to use",
                    default="gpt-4o",  # Changed default to gpt-4o
                    required=False,
                    choices=[
                        "o3-mini",
                        "o3",
                        "gpt-4o",
                        "gpt-4o-mini",
                        "gpt-4.1-nano",
                        "gpt-4-turbo",
                        "gpt-4-turbo-preview",
                        "gpt-4",
                        "gpt-4-32k"
                    ]
                ),
                NodeInput(
                    name="temperature",
                    type="float",
                    description="Sampling temperature (0.0-2.0) - Controls randomness",
                    default=0.1,  # Lower for faster, more consistent responses
                    required=False,
                    min_value=0.0,
                    max_value=2.0
                ),
                NodeInput(
                    name="max_tokens",
                    type="int",
                    description="Maximum tokens to generate (default: model limit)",
                    default=10000,  # Changed default to 10000 tokens
                    required=False,
                    min_value=1,
                    max_value=200000
                ),
                NodeInput(
                    name="top_p",
                    type="float",
                    description="Nucleus sampling parameter (0.0-1.0)",
                    default=1.0,
                    required=False,
                    min_value=0.0,
                    max_value=1.0
                ),
                NodeInput(
                    name="frequency_penalty",
                    type="float",
                    description="Frequency penalty (-2.0 to 2.0)",
                    default=0.0,
                    required=False,
                    min_value=-2.0,
                    max_value=2.0
                ),
                NodeInput(
                    name="presence_penalty",
                    type="float",
                    description="Presence penalty (-2.0 to 2.0)",
                    default=0.0,
                    required=False,
                    min_value=-2.0,
                    max_value=2.0
                ),
                NodeInput(
                    name="api_key",
                    type="str",
                    description="OpenAI API Key",
                    required=True,
                    is_secret=True
                ),
                NodeInput(
                    name="system_prompt",
                    type="str",
                    description="System prompt for the model",
                    default="You are a helpful, accurate, and intelligent AI assistant.",
                    required=False,
                    multiline=True
                ),
                NodeInput(
                    name="streaming",
                    type="bool",
                    description="Enable streaming responses",
                    default=False,
                    required=False
                ),
                NodeInput(
                    name="timeout",
                    type="int",
                    description="Request timeout in seconds",
                    default=60,
                    required=False,
                    min_value=1,
                    max_value=300
                )
            ],
            "outputs": [
                NodeOutput(
                    name="output",
                    type="llm",
                    description="OpenAI Chat LLM instance configured with specified parameters"
                ),
                NodeOutput(
                    name="model_info",
                    type="dict",
                    description="Model configuration information"
                ),
                NodeOutput(
                    name="usage_stats",
                    type="dict",
                    description="Token usage and cost information"
                )
            ]
        }
        
        # Model configurations and capabilities
        self.model_configs = {
            "o3-mini": {
                "max_tokens": 200000,
                "context_window": 200000,
                "description": "OpenAI's latest reasoning model (mini version) with enhanced capabilities",
                "cost_per_1k_tokens": {"input": 0.002, "output": 0.008},
                "supports_tools": True,
                "supports_vision": True,
                "reasoning_model": True
            },
            "o3": {
                "max_tokens": 200000,
                "context_window": 200000,
                "description": "OpenAI's most advanced reasoning model with superior problem-solving",
                "cost_per_1k_tokens": {"input": 0.015, "output": 0.045},
                "supports_tools": True,
                "supports_vision": True,
                "reasoning_model": True
            },
            "gpt-4o": {
                "max_tokens": 128000,
                "context_window": 128000,
                "description": "Most capable GPT-4 model, great for complex tasks",
                "cost_per_1k_tokens": {"input": 0.005, "output": 0.015},
                "supports_tools": True,
                "supports_vision": True
            },
            "gpt-4o-mini": {
                "max_tokens": 128000,
                "context_window": 128000,
                "description": "Faster, cheaper GPT-4 model for simpler tasks",
                "cost_per_1k_tokens": {"input": 0.00015, "output": 0.0006},
                "supports_tools": True,
                "supports_vision": True
            },
            "gpt-4.1-nano": {
                "max_tokens": 65536,
                "context_window": 65536,
                "description": "Ultra-fast nano model optimized for speed and efficiency",
                "cost_per_1k_tokens": {"input": 0.0001, "output": 0.0004},
                "supports_tools": True,
                "supports_vision": False
            },
            "gpt-4-turbo": {
                "max_tokens": 4096,
                "context_window": 128000,
                "description": "Latest GPT-4 Turbo with improved performance",
                "cost_per_1k_tokens": {"input": 0.01, "output": 0.03},
                "supports_tools": True,
                "supports_vision": True
            },
            "gpt-4-turbo-preview": {
                "max_tokens": 4096,
                "context_window": 128000,
                "description": "Preview version of GPT-4 Turbo",
                "cost_per_1k_tokens": {"input": 0.01, "output": 0.03},
                "supports_tools": True,
                "supports_vision": True
            },
            "gpt-4": {
                "max_tokens": 8192,
                "context_window": 8192,
                "description": "Original GPT-4 model, highly capable",
                "cost_per_1k_tokens": {"input": 0.03, "output": 0.06},
                "supports_tools": True,
                "supports_vision": False
            },
            "gpt-4-32k": {
                "max_tokens": 32768,
                "context_window": 32768,
                "description": "GPT-4 with extended 32k context window",
                "cost_per_1k_tokens": {"input": 0.06, "output": 0.12},
                "supports_tools": True,
                "supports_vision": False
            }
        }
    
    def get_required_packages(self) -> list[str]:
        """
        🔥 DYNAMIC METHOD: OpenAINode'un ihtiyaç duyduğu Python packages'ini döndür.
        
        Bu method dynamic export sisteminin çalışması için kritik!
        OpenAI LLM için gereken API ve LangChain dependencies.
        """
        return [
            "langchain-openai>=0.0.5",  # OpenAI LangChain integration
            "openai>=1.0.0",            # OpenAI Python SDK
            "httpx>=0.25.0",            # HTTP client for API calls
            "pydantic>=2.5.0",          # Data validation and SecretStr
            "tiktoken>=0.5.0",          # Token counting and encoding
            "typing-extensions>=4.8.0"  # Advanced typing support
        ]
    
    def execute(self, **kwargs) -> Runnable:
        """Execute OpenAI node with enhanced configuration and validation."""
        print(f"\n🤖 OPENAI LLM SETUP")
        
        # Get configuration from user_data
        model_name = self.user_data.get("model_name", "gpt-4o")
        temperature = float(self.user_data.get("temperature", 0.1))
        max_tokens = self.user_data.get("max_tokens", 10000)  # Default to 10000 tokens
        top_p = float(self.user_data.get("top_p", 1.0))
        frequency_penalty = float(self.user_data.get("frequency_penalty", 0.0))
        presence_penalty = float(self.user_data.get("presence_penalty", 0.0))
        streaming = bool(self.user_data.get("streaming", False))
        timeout = int(self.user_data.get("timeout", 60))
        
        # Get API key from user configuration (database/UI)
        api_key = self.user_data.get("api_key")
        
        if not api_key:
            raise ValueError(
                "OpenAI API key is required. Please provide it in the node configuration through the UI."
            )
        
        # Validate model and get config
        model_config = self.model_configs.get(model_name, self.model_configs["gpt-4o"])
        
        # Handle max_tokens intelligently
        if max_tokens is None:
            # Use default of 10000 tokens but cap at model limit
            max_tokens = min(10000, model_config["max_tokens"])
        elif max_tokens > model_config["max_tokens"]:
            print(f"⚠️  Requested max_tokens ({max_tokens}) exceeds model limit ({model_config['max_tokens']})")
            max_tokens = model_config["max_tokens"]
        
        # Build LLM configuration
        llm_config = {
            "model": model_name,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "top_p": top_p,
            "frequency_penalty": frequency_penalty,
            "presence_penalty": presence_penalty,
            "api_key": SecretStr(str(api_key)),
            "timeout": timeout,
            "streaming": streaming
        }
        
        # Create OpenAI Chat model
        try:
            llm = ChatOpenAI(**llm_config)
            
            # Log successful creation
            print(f"   ✅ Model: {model_name} | Temp: {temperature} | Max Tokens: {max_tokens}")
            print(f"   🔧 Features: Tools({model_config['supports_tools']}) | Vision({model_config['supports_vision']}) | Context({model_config['context_window']})")
            
            # Store model info for potential use
            self.model_info = {
                "model_name": model_name,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "context_window": model_config["context_window"],
                "supports_tools": model_config["supports_tools"],
                "supports_vision": model_config["supports_vision"],
                "cost_per_1k_tokens": model_config["cost_per_1k_tokens"],
                "description": model_config["description"]
            }
            
            return llm
            
        except Exception as e:
            error_msg = f"Failed to create OpenAI LLM: {str(e)}"
            print(f"❌ {error_msg}")
            raise ValueError(error_msg) from e
    
    def get_model_info(self) -> Optional[Dict[str, Any]]:
        """Get information about the configured model."""
        return getattr(self, 'model_info', None)
    
    def get_available_models(self) -> List[str]:
        """Get list of available models."""
        return list(self.model_configs.keys())
    
    def get_model_config(self, model_name: str) -> Optional[Dict[str, Any]]:
        """Get configuration for a specific model."""
        return self.model_configs.get(model_name)
    
    def estimate_cost(self, input_tokens: int, output_tokens: int, model_name: str = None) -> Dict[str, float]:
        """Estimate cost for given token usage."""
        if not model_name:
            model_name = self.user_data.get("model_name", "gpt-4o")
        
        config = self.model_configs.get(model_name)
        if not config:
            return {"error": "Model not found"}
        
        input_cost = (input_tokens / 1000) * config["cost_per_1k_tokens"]["input"]
        output_cost = (output_tokens / 1000) * config["cost_per_1k_tokens"]["output"]
        
        return {
            "input_cost": input_cost,
            "output_cost": output_cost,
            "total_cost": input_cost + output_cost,
            "model": model_name
        }


# Add alias for frontend compatibility
OpenAIChatNode = OpenAINode