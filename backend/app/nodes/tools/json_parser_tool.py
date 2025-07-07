import json
from typing import Any
from ..base import ProviderNode, NodeInput, NodeType
from langchain.tools import Tool
from langchain_core.runnables import Runnable

class JSONParserToolNode(ProviderNode):
    """JSON parsing and manipulation tool node"""
    
    def __init__(self):
        super().__init__()
        self._metadatas = {
            "name": "JSONParser",
            "description": "Parse and manipulate JSON data",
            "category": "Tools",
            "node_type": NodeType.PROVIDER,
            "inputs": []
        }

    def _execute(self, **kwargs) -> Runnable:
        """Execute the JSON Parser node and return a JSON tool"""
        
        def parse_json(json_string: str) -> str:
            """Parse JSON string and return formatted output"""
            try:
                # Try to parse the JSON
                parsed_data = json.loads(json_string)
                
                # Return prettified JSON
                return json.dumps(parsed_data, indent=2, ensure_ascii=False)
                
            except json.JSONDecodeError as e:
                return f"Error: Invalid JSON format - {str(e)}"
            except Exception as e:
                return f"Error: {str(e)}"
        
        return Tool(
            name="JSONParser",
            description="Useful for parsing and formatting JSON data. Input should be a JSON string.",
            func=parse_json
        ) 