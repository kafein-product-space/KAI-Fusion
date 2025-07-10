from typing import Dict, Any, Optional
from ..base import ProcessorNode, NodeInput, NodeOutput, NodeType
from langchain_community.vectorstores import FAISS
from langchain_core.runnables import Runnable

class FaissVectorStoreNode(ProcessorNode):
    """FAISS vector store node"""
    
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "FaissVectorStore",
            "display_name":"Faiss Vector Store",
            "description": "FAISS vector store for efficient similarity search",
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
                    description="Name for the FAISS index",
                    default="faiss_index",
                    required=False
                ),
                NodeInput(
                    name="save_local",
                    type="bool",
                    description="Save index to local disk",
                    default=False,
                    required=False
                ),
                NodeInput(
                    name="folder_path",
                    type="str",
                    description="Folder path to save/load index",
                    default="./faiss_index",
                    required=False
                )
            ],
            "outputs": [
                NodeOutput(
                    name="output",
                    type="vectorstore",
                    description="FAISS vector store instance"
                )
            ]
        }

    def execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Runnable]) -> Runnable:
        """Execute the FAISS vector store node"""
        embeddings = connected_nodes.get("embeddings")
        if not embeddings:
            raise ValueError("Embeddings connection is required")
        
        # Try to load existing index
        if inputs.get("folder_path"):
            try:
                return FAISS.load_local(
                    folder_path=inputs["folder_path"],
                    embeddings=embeddings,
                    index_name=inputs.get("index_name", "faiss_index")
                )
            except:
                pass  # If loading fails, create new
        
        # Create new FAISS index
        return FAISS.from_texts(
            texts=[""],  # Empty initial text
            embedding=embeddings
        )
