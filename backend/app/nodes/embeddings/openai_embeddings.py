import os
from ...core.constants import OPENAI_API_KEY
from typing import Optional
from ..base import ProviderNode, NodeInput, NodeOutput, NodeType
from langchain_openai import OpenAIEmbeddings
from langchain_core.runnables import Runnable

class OpenAIEmbeddingsNode(ProviderNode):
    """OpenAI embeddings model node"""
    
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "OpenAIEmbeddings",
            "display_name": "OpenAI Embeddings",

            "description": "OpenAI embeddings for converting text to vectors",
            "category": "Embeddings",
            "node_type": NodeType.PROVIDER,
            "inputs": [
                NodeInput(
                    name="model_name",
                    type="str",
                    description="OpenAI embedding model",
                    default="text-embedding-ada-002",
                    required=False
                ),
                NodeInput(
                    name="api_key",
                    type="str",
                    description="OpenAI API Key",
                    required=False
                ),
                NodeInput(
                    name="chunk_size",
                    type="int",
                    description="Chunk size for embedding",
                    default=1000,
                    required=False
                )
            ],
            "outputs": [
                NodeOutput(
                    name="output",
                    type="embeddings",
                    description="OpenAI Embeddings instance"
                )
            ]
        }

    def execute(self, **kwargs) -> Runnable:
        """Execute the OpenAI embeddings node"""
        api_key = kwargs.get("api_key") or OPENAI_API_KEY
        
        if not api_key:
            raise ValueError("OpenAI API Key is required")
        
        return OpenAIEmbeddings(
            model=kwargs.get("model_name", "text-embedding-ada-002"),
            openai_api_key=api_key,
            chunk_size=kwargs.get("chunk_size", 1000)
        )
