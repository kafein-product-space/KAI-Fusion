from typing import Dict, Any, Optional
from ..base import ProcessorNode, NodeInput, NodeOutput, NodeType
from langchain_community.vectorstores import Qdrant
from langchain_core.runnables import Runnable

class QdrantVectorStoreNode(ProcessorNode):
    """Qdrant vector store node"""
    
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "QdrantVectorStore",
            "description": "Qdrant vector database for storing and retrieving embeddings",
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
                    name="collection_name",
                    type="str",
                    description="Qdrant collection name",
                    required=True
                ),
                NodeInput(
                    name="url",
                    type="str",
                    description="Qdrant server URL",
                    default="http://localhost:6333",
                    required=False
                ),
                NodeInput(
                    name="api_key",
                    type="str",
                    description="Qdrant API Key (if using cloud)",
                    required=False
                ),
                NodeInput(
                    name="path",
                    type="str",
                    description="Local path for Qdrant (alternative to URL)",
                    required=False
                )
            ],
            "outputs": [
                NodeOutput(
                    name="output",
                    type="vectorstore",
                    description="Qdrant vector store instance"
                )
            ]
        }

    def execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Runnable]) -> Runnable:
        """Execute the Qdrant vector store node"""
        embeddings = connected_nodes.get("embeddings")
        if not embeddings:
            raise ValueError("Embeddings connection is required")
        
        # Create Qdrant client
        if inputs.get("path"):
            # Local Qdrant
            return Qdrant.from_texts(
                texts=[""],  # Empty initial text
                embedding=embeddings,
                path=inputs["path"],
                collection_name=inputs["collection_name"]
            )
        else:
            # Remote Qdrant
            from qdrant_client import QdrantClient
            
            client = QdrantClient(
                url=inputs.get("url", "http://localhost:6333"),
                api_key=inputs.get("api_key")
            )
            
            return Qdrant(
                client=client,
                collection_name=inputs["collection_name"],
                embeddings=embeddings
            )
