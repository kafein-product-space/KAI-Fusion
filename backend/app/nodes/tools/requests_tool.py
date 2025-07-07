from typing import Any, Dict
from ..base import ProviderNode, NodeInput, NodeType
from langchain.tools import Tool
from langchain_core.runnables import Runnable
import requests
import json

class RequestsGetToolNode(ProviderNode):
    """HTTP GET request tool"""
    
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "RequestsGetTool",
            "display_name": "Requests Get Tool",

            "description": "Make HTTP GET requests to APIs",
            "category": "Tools",
            "node_type": NodeType.PROVIDER,
            "inputs": [
                NodeInput(
                    name="headers",
                    type="dict",
                    description="Default headers for requests",
                    default={},
                    required=False
                ),
                NodeInput(
                    name="timeout",
                    type="int",
                    description="Request timeout in seconds",
                    default=10,
                    required=False
                )
            ]
        }

    def execute(self, **kwargs) -> Runnable:
        """Execute the GET request tool node"""
        default_headers = kwargs.get("headers", {})
        timeout = kwargs.get("timeout", 10)
        
        def make_get_request(url: str) -> str:
            """Make a GET request to the specified URL"""
            try:
                response = requests.get(url, headers=default_headers, timeout=timeout)
                response.raise_for_status()
                
                # Try to parse as JSON
                try:
                    data = response.json()
                    return json.dumps(data, indent=2)
                except:
                    return response.text
                    
            except Exception as e:
                return f"Error making GET request: {str(e)}"
        
        return Tool(
            name="RequestsGet",
            description="Useful for making GET requests to APIs. Input should be a URL.",
            func=make_get_request
        )

class RequestsPostToolNode(ProviderNode):
    """HTTP POST request tool"""
    
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "RequestsPostTool",
            "display_name": "Requests Post Tool",

            "description": "Make HTTP POST requests to APIs",
            "category": "Tools",
            "node_type": NodeType.PROVIDER,
            "inputs": [
                NodeInput(
                    name="headers",
                    type="dict",
                    description="Default headers for requests",
                    default={"Content-Type": "application/json"},
                    required=False
                ),
                NodeInput(
                    name="timeout",
                    type="int",
                    description="Request timeout in seconds",
                    default=10,
                    required=False
                )
            ]
        }

    def execute(self, **kwargs) -> Runnable:
        """Execute the POST request tool node"""
        default_headers = kwargs.get("headers", {"Content-Type": "application/json"})
        timeout = kwargs.get("timeout", 10)
        
        def make_post_request(request_str: str) -> str:
            """Make a POST request. Input should be 'URL|JSON_DATA'"""
            try:
                # Parse input
                parts = request_str.split('|', 1)
                if len(parts) != 2:
                    return "Error: Input should be in format 'URL|JSON_DATA'"
                
                url, data_str = parts
                
                # Parse JSON data
                try:
                    data = json.loads(data_str)
                except:
                    data = data_str  # Send as plain text if not JSON
                
                response = requests.post(
                    url.strip(), 
                    json=data if isinstance(data, dict) else None,
                    data=data if isinstance(data, str) else None,
                    headers=default_headers, 
                    timeout=timeout
                )
                response.raise_for_status()
                
                # Try to parse response as JSON
                try:
                    result = response.json()
                    return json.dumps(result, indent=2)
                except:
                    return response.text
                    
            except Exception as e:
                return f"Error making POST request: {str(e)}"
        
        return Tool(
            name="RequestsPost",
            description="Make POST requests. Input format: 'URL|JSON_DATA'",
            func=make_post_request
        )
