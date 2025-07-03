
from ..base import ProcessorNode, NodeInput, NodeType
from langchain_community.vectorstores import Chroma
from langchain_core.vectorstores import VectorStoreRetriever
from langchain_core.runnables import Runnable
from typing import Dict, Any

class ChromaRetrieverNode(ProcessorNode):
    _metadatas = {
        "name": "ChromaRetriever",
        "description": "A retriever that uses a Chroma vector store to retrieve documents.",
        "node_type": NodeType.PROCESSOR,
        "inputs": [
            NodeInput(
                name="collection_name",
                type="string",
                description="The name of the Chroma collection to use."
            ),
            NodeInput(
                name="embedding_function",
                type="object",
                description="The embedding function to use.",
                is_connection=True
            )
        ]
    }

    def _execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Runnable]) -> Runnable:
        collection_name = inputs.get("collection_name", "default_collection")
        embedding_function = connected_nodes.get("embedding_function")
        
        if not embedding_function:
            raise ValueError("Embedding function must be provided as connected node")
        
        vectorstore = Chroma(collection_name=collection_name, embedding_function=embedding_function)
        return vectorstore.as_retriever()
