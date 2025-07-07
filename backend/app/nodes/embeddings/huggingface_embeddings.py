from ..base import ProviderNode, NodeInput, NodeOutput, NodeType
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.runnables import Runnable

class HuggingFaceEmbeddingsNode(ProviderNode):
    """HuggingFace embeddings model node"""
    
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "HuggingFaceEmbeddings",
            "description": "HuggingFace embeddings for converting text to vectors",
            "category": "Embeddings",
            "node_type": NodeType.PROVIDER,
            "inputs": [
                NodeInput(
                    name="model_name",
                    type="str",
                    description="HuggingFace model name",
                    default="sentence-transformers/all-MiniLM-L6-v2",
                    required=False
                ),
                NodeInput(
                    name="cache_folder",
                    type="str",
                    description="Path to store models",
                    required=False
                ),
                NodeInput(
                    name="encode_kwargs",
                    type="dict",
                    description="Encoding options",
                    default={"normalize_embeddings": False},
                    required=False
                )
            ],
            "outputs": [
                NodeOutput(
                    name="output",
                    type="embeddings",
                    description="HuggingFace Embeddings instance"
                )
            ]
        }

    def execute(self, **kwargs) -> Runnable:
        """Execute the HuggingFace embeddings node"""
        return HuggingFaceEmbeddings(
            model_name=kwargs.get("model_name", "sentence-transformers/all-MiniLM-L6-v2"),
            cache_folder=kwargs.get("cache_folder"),
            encode_kwargs=kwargs.get("encode_kwargs", {"normalize_embeddings": False})
        )
