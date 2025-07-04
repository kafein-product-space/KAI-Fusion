import os
from ..base import ProviderNode, NodeInput, NodeOutput, NodeType
from langchain_community.embeddings import CohereEmbeddings
from langchain_core.runnables import Runnable

class CohereEmbeddingsNode(ProviderNode):
    """Cohere embeddings model node"""
    
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "CohereEmbeddings",
            "description": "Cohere embeddings for converting text to vectors",
            "category": "Embeddings",
            "node_type": NodeType.PROVIDER,
            "inputs": [
                NodeInput(
                    name="model",
                    type="str",
                    description="Cohere embedding model",
                    default="embed-english-v2.0",
                    required=False
                ),
                NodeInput(
                    name="api_key",
                    type="str",
                    description="Cohere API Key",
                    required=False
                )
            ],
            "outputs": [
                NodeOutput(
                    name="output",
                    type="embeddings",
                    description="Cohere Embeddings instance"
                )
            ]
        }

    def execute(self, **kwargs) -> Runnable:
        """Execute the Cohere embeddings node"""
        api_key = kwargs.get("api_key") or os.getenv("COHERE_API_KEY")
        
        if not api_key:
            raise ValueError("Cohere API Key is required")
        
        return CohereEmbeddings(
            model=kwargs.get("model", "embed-english-v2.0"),
            cohere_api_key=api_key
        )
