from typing import Dict, Any, Optional, List
import os
from langchain_openai import ChatOpenAI
from langchain_core.runnables import Runnable
from pydantic import SecretStr

from app.nodes.base import BaseNode, NodeType, NodeInput, NodeOutput


class OpenAINode(BaseNode):
    """Enhanced OpenAI Chat completion node with comprehensive model selection and smart configuration."""
    
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
                    default="gpt-4o-mini",  # Changed default to faster model
                    required=False,
                    choices=[
                        "gpt-4o-mini",  # Moved to top for speed
                        "gpt-4o",
                        "gpt-4-turbo",
                        "gpt-4-turbo-preview",
                        "gpt-4",
                        "gpt-4-32k",
                        "gpt-3.5-turbo",
                        "gpt-3.5-turbo-16k",
                        "gpt-3.5-turbo-0125",
                        "gpt-3.5-turbo-1106"
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
                    default=300,  # Set lower default for faster responses
                    required=False,
                    min_value=1,
                    max_value=32768
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
                )
            ]
        }
        
        # Model configurations and capabilities
        self.model_configs = {
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
            "gpt-4-turbo": {
                "max_tokens": 4096,
                "context_window": 128000,
                "description": "Latest GPT-4 Turbo with improved performance",
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
            "gpt-3.5-turbo": {
                "max_tokens": 4096,
                "context_window": 16385,
                "description": "Fast and efficient for most conversational tasks",
                "cost_per_1k_tokens": {"input": 0.0005, "output": 0.0015},
                "supports_tools": True,
                "supports_vision": False
            }
        }
    
    def execute(self, **kwargs) -> Runnable:
        """Execute OpenAI node with enhanced configuration and validation."""
        print(f"🤖 OpenAI Node executing with config: {list(self.user_data.keys())}")
        
        # Get configuration from user_data
        model_name = self.user_data.get("model_name", "gpt-4o")
        temperature = float(self.user_data.get("temperature", 0.1))
        max_tokens = self.user_data.get("max_tokens")
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
            # Use model's default max tokens but cap at reasonable limit
            max_tokens = min(model_config["max_tokens"], 4096)
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
            print(f"✅ OpenAI LLM created successfully:")
            print(f"   Model: {model_name}")
            print(f"   Temperature: {temperature}")
            print(f"   Max Tokens: {max_tokens}")
            print(f"   Context Window: {model_config['context_window']}")
            print(f"   Supports Tools: {model_config['supports_tools']}")
            print(f"   Supports Vision: {model_config['supports_vision']}")
            
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