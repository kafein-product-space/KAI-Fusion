from typing import List
from ..base import ProviderNode, NodeInput, NodeType
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.runnables import Runnable, RunnableLambda

class RecursiveTextSplitterNode(ProviderNode):
    """Recursive character text splitter node"""
    
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "RecursiveTextSplitter",
            "display_name": "Recursive Text Splitter",

            "description": "Split text recursively with multiple separators",
            "category": "Text Splitters",
            "node_type": NodeType.PROVIDER,
            "inputs": [
                NodeInput(name="chunk_size", type="int", description="Maximum chunk size", default=1000),
                NodeInput(name="chunk_overlap", type="int", description="Overlap between chunks", default=200),
                NodeInput(name="separators", type="list", description="List of separators", default=["\n\n", "\n", " ", ""]),
            ]
        }

    def execute(self, **kwargs) -> Runnable:
        """Execute the recursive text splitter"""
        chunk_size = kwargs.get("chunk_size", 1000)
        chunk_overlap = kwargs.get("chunk_overlap", 200)
        separators = kwargs.get("separators", ["\n\n", "\n", " ", ""])
        
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=separators
        )
        
        def split_text(input_text: str) -> List[str]:
            if not input_text:
                return []
            return splitter.split_text(input_text)
        
        return RunnableLambda(split_text)
