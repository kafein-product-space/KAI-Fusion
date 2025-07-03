
from typing import List
from langchain_community.document_loaders import PyPDFLoader
from langchain_core.documents import Document
from langchain_core.runnables import Runnable
from ..base import ProviderNode, NodeInput, NodeType

class PDFLoaderNode(ProviderNode):
    _metadatas = {
        "name": "PDFLoader",
        "description": "Loads a PDF file and extracts its content into documents.",
        "node_type": NodeType.PROVIDER,
        "inputs": [
            NodeInput(name="file_path", type="string", description="The absolute path to the PDF file.", required=True, is_connection=False),
        ],
        "outputs": [{"name": "documents", "type": "List[Document]", "description": "A list of documents extracted from the PDF."}]
    }

    def _execute(self, file_path: str = None) -> Runnable:
        if not file_path:
            raise ValueError("PDF file path is required.")
        
        # For security and practical reasons, we need to handle file uploads properly.
        # In a real web application, this would involve receiving a file stream,
        # saving it to a temporary location, and then passing that path to the loader.
        # For now, we'll assume the file path is accessible on the local filesystem.
        
        try:
            loader = PyPDFLoader(file_path)
            return loader
        except Exception as e:
            # Proper error handling is crucial.
            raise ValueError(f"Failed to load or process the PDF file at {file_path}. Error: {e}")

