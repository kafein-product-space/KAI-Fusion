from typing import Dict, Any, Optional
import os
from langchain_openai import ChatOpenAI
from langchain_core.runnables import Runnable
from pydantic import SecretStr

from app.nodes.base import BaseNode, NodeType, NodeInput, NodeOutput

class OpenAINode(BaseNode):
    """OpenAI Chat completion node with direct API key configuration."""
    
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "OpenAIChat",
            "display_name": "OpenAI",
            "description": "OpenAI Chat completion using GPT models",
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
                    name="api_key",
                    type="str",
                    description="OpenAI API Key",
                    required=True
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
    
    def execute(self, **kwargs) -> Runnable:
        """Execute OpenAI node with direct API key access."""
        print(f"Gelen OpenAI config: {self.user_data}")
        
        # Get API key directly from user_data (frontend configuration)
        api_key = self.user_data.get("api_key")
        
        # Fallback to environment variable
        if not api_key:
            api_key = os.getenv("OPENAI_API_KEY")
        
        if not api_key:
            raise ValueError("OpenAI API key is required. Please provide it in the node configuration or set OPENAI_API_KEY environment variable.")
        
        # Create OpenAI Chat model (without max_tokens as it might not be supported)
        llm = ChatOpenAI(
            model=self.user_data.get("model_name", "gpt-3.5-turbo"),
            temperature=self.user_data.get("temperature", 0.7),
            api_key=SecretStr(str(api_key))
        )
        
        print(f"[DEBUG] OpenAI LLM created successfully with model: {llm.model_name}")
        return llm

# Add alias for frontend compatibility
OpenAIChatNode = OpenAINode 