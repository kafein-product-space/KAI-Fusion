from typing import List
from ..base import ProviderNode, NodeInput, NodeType
from langchain.text_splitter import TokenTextSplitter
from langchain_core.runnables import Runnable, RunnableLambda

class TokenTextSplitterNode(ProviderNode):
    """Token-based text splitter node"""
    
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "TokenTextSplitter",
            "description": "Split text based on token count",
            "category": "Text Splitters",
            "node_type": NodeType.PROVIDER,
            "inputs": [
                NodeInput(name="chunk_size", type="int", description="Maximum tokens per chunk", default=500),
                NodeInput(name="chunk_overlap", type="int", description="Token overlap between chunks", default=50),
                NodeInput(name="encoding_name", type="str", description="Encoding to use", default="cl100k_base"),
            ]
        }

    def execute(self, **kwargs) -> Runnable:
        """Execute the token text splitter"""
        chunk_size = kwargs.get("chunk_size", 500)
        chunk_overlap = kwargs.get("chunk_overlap", 50)
        encoding_name = kwargs.get("encoding_name", "cl100k_base")
        
        splitter = TokenTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            encoding_name=encoding_name
        )
        
        def split_text(input_text: str) -> List[str]:
            if not input_text:
                return []
            return splitter.split_text(input_text)
        
        return RunnableLambda(split_text)
