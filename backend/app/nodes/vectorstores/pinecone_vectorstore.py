import os
from typing import Dict, Any, Optional
from ..base import ProcessorNode, NodeInput, NodeOutput, NodeType
from langchain_community.vectorstores import Pinecone
from langchain_core.runnables import Runnable

class PineconeVectorStoreNode(ProcessorNode):
    """Pinecone vector store node"""
    
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "PineconeVectorStore",
            "display_name":"Pinecone Vector Store",
            "description": "Pinecone vector database for storing and retrieving embeddings",
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
                    name="index_name",
                    type="str",
                    description="Pinecone index name",
                    required=True
                ),
                NodeInput(
                    name="api_key",
                    type="str",
                    description="Pinecone API Key",
                    required=False
                ),
                NodeInput(
                    name="namespace",
                    type="str",
                    description="Namespace within the index",
                    default="",
                    required=False
                ),
                NodeInput(
                    name="text_key",
                    type="str",
                    description="Key to store document text",
                    default="text",
                    required=False
                )
            ],
            "outputs": [
                NodeOutput(
                    name="output",
                    type="vectorstore",
                    description="Pinecone vector store instance"
                )
            ]
        }

    def execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Runnable]) -> Runnable:
        """Execute the Pinecone vector store node"""
        embeddings = connected_nodes.get("embeddings")
        if not embeddings:
            raise ValueError("Embeddings connection is required")
        
        api_key = inputs.get("api_key") or os.getenv("PINECONE_API_KEY")
        if not api_key:
            raise ValueError("Pinecone API Key is required")
        
        return Pinecone(
            index_name=inputs["index_name"],
            embedding=embeddings,
            pinecone_api_key=api_key,
            namespace=inputs.get("namespace", ""),
            text_key=inputs.get("text_key", "text")
        )
