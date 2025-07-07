from typing import Any, Optional
from ..base import ProviderNode, NodeInput, NodeType
from langchain_core.runnables import Runnable, RunnableLambda

class TextFormatterNode(ProviderNode):
    """Text formatting utility node"""
    
    def __init__(self):
        super().__init__()
        self._metadatas = {
            "name": "TextFormatter",
            "description": "Format text with various transformations",
            "category": "Utilities",
            "node_type": NodeType.PROVIDER,
            "inputs": [
                NodeInput(name="text", type="string", description="Text to format", required=True),
                NodeInput(name="operation", type="string", description="Format operation (uppercase, lowercase, title, capitalize, strip, reverse)", default="uppercase"),
            ]
        }

    def _execute(self, **kwargs) -> Runnable:
        """Execute the text formatting operation and return a runnable"""
        text = kwargs.get("text", "")
        operation = kwargs.get("operation", "uppercase")
        
        def format_text(input_text: str) -> str:
            if not input_text:
                return ""
            
            if operation == "uppercase":
                return input_text.upper()
            elif operation == "lowercase":
                return input_text.lower()
            elif operation == "title":
                return input_text.title()
            elif operation == "capitalize":
                return input_text.capitalize()
            elif operation == "strip":
                return input_text.strip()
            elif operation == "reverse":
                return input_text[::-1]
            else:
                return input_text
        
        # Return a runnable that formats the provided text or uses the input if no text provided
        if text:
            return RunnableLambda(lambda x: format_text(text))
        else:
            return RunnableLambda(format_text) 