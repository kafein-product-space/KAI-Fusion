import os
from typing import Dict, Any, Optional
from ..base import ProcessorNode, NodeInput, NodeOutput, NodeType
from langchain_community.vectorstores import Weaviate
from langchain_core.runnables import Runnable

class WeaviateVectorStoreNode(ProcessorNode):
    """Weaviate vector store node"""
    
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "WeaviateVectorStore",
            "description": "Weaviate vector database for storing and retrieving embeddings",
            "category": "Vector Stores",
            "node_type": NodeType.PROCESSOR,
            "inputs": [
                NodeInput(
                    name="embeddings",
                    type="embeddings",
                    description="Embedding model to use",
                    is_connection=True,
                    required=True
                ),
                NodeInput(
                    name="url",
                    type="str",
                    description="Weaviate server URL",
                    default="http://localhost:8080",
                    required=False
                ),
                NodeInput(
                    name="api_key",
                    type="str",
                    description="Weaviate API Key",
                    required=False
                ),
                NodeInput(
                    name="index_name",
                    type="str",
                    description="Weaviate class/index name",
                    default="LangChain",
                    required=False
                ),
                NodeInput(
                    name="text_key",
                    type="str",
                    description="Property name for text content",
                    default="text",
                    required=False
                )
            ],
            "outputs": [
                NodeOutput(
                    name="output",
                    type="vectorstore",
                    description="Weaviate vector store instance"
                )
            ]
        }

    def execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Runnable]) -> Runnable:
        """Execute the Weaviate vector store node"""
        import weaviate
        
        embeddings = connected_nodes.get("embeddings")
        if not embeddings:
            raise ValueError("Embeddings connection is required")
        
        # Create Weaviate client
        auth_config = None
        if inputs.get("api_key"):
            auth_config = weaviate.AuthApiKey(api_key=inputs["api_key"])
        
        client = weaviate.Client(
            url=inputs.get("url", "http://localhost:8080"),
            auth_client_secret=auth_config
        )
        
        return Weaviate(
            client=client,
            embedding=embeddings,
            index_name=inputs.get("index_name", "LangChain"),
            text_key=inputs.get("text_key", "text")
        )
