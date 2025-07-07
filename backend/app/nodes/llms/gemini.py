import os
from typing import Optional
from ..base import ProviderNode, NodeInput, NodeType
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.runnables import Runnable

class GeminiNode(ProviderNode):
    """Google Gemini chat model node"""
    
    def __init__(self):
        super().__init__()
        self._metadatas = {
            "name": "GoogleGemini",
            "description": "Google Gemini chat model for conversational AI",
            "category": "LLM",
            "node_type": NodeType.PROVIDER,
            "inputs": [
                NodeInput(name="google_api_key", type="string", description="Google API Key", required=False),
                NodeInput(name="model_name", type="string", description="Model name", default="gemini-1.5-flash"),
                NodeInput(name="temperature", type="float", description="Temperature for response randomness", default=0.7),
                NodeInput(name="max_tokens", type="int", description="Maximum tokens to generate", default=1000),
            ]
        }

    def _execute(self, **kwargs) -> Runnable:
        """Execute the Gemini node and return a configured LLM instance"""
        google_api_key = kwargs.get("google_api_key")
        model_name = kwargs.get("model_name", "gemini-1.5-flash")
        temperature = kwargs.get("temperature", 0.7)
        max_tokens = kwargs.get("max_tokens", 1000)
        
        # Use provided API key or fallback to environment variable
        api_key = google_api_key or os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("Google API Key is required. Set GOOGLE_API_KEY environment variable or provide google_api_key parameter.")
        
        return ChatGoogleGenerativeAI(
            model=model_name,
            temperature=temperature,
            max_tokens=max_tokens,
            google_api_key=api_key
        ) 