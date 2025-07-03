from typing import List
from ..base import ProviderNode, NodeInput, NodeType
from langchain.text_splitter import CharacterTextSplitter
from langchain_core.runnables import Runnable, RunnableLambda

class CharacterTextSplitterNode(ProviderNode):
    """Character-based text splitter node"""
    
    def __init__(self):
        super().__init__()
        self._metadatas = {
            "name": "CharacterTextSplitter",
            "description": "Split text into chunks based on character count",
            "node_type": NodeType.PROVIDER,
            "inputs": [
                NodeInput(name="text", type="string", description="Text to split", required=True),
                NodeInput(name="chunk_size", type="int", description="Maximum chunk size", default=1000),
                NodeInput(name="chunk_overlap", type="int", description="Overlap between chunks", default=200),
                NodeInput(name="separator", type="string", description="Separator character", default="\n\n"),
            ]
        }

    def _execute(self, **kwargs) -> Runnable:
        """Execute the text splitter and return a runnable"""
        text = kwargs.get("text", "")
        chunk_size = kwargs.get("chunk_size", 1000)
        chunk_overlap = kwargs.get("chunk_overlap", 200)
        separator = kwargs.get("separator", "\n\n")
        
        splitter = CharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separator=separator
        )
        
        # Return a RunnableLambda that performs the text splitting
        def split_text(input_text: str) -> List[str]:
            if not input_text:
                return []
            return splitter.split_text(input_text)
        
        # Create a runnable that splits the provided text or uses the input if no text provided
        if text:
            return RunnableLambda(lambda x: split_text(text))
        else:
            return RunnableLambda(split_text) 