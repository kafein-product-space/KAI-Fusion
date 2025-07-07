from typing import Any
from ..base import ProviderNode, NodeInput, NodeType
from langchain.tools import Tool
from langchain_core.runnables import Runnable
import requests
from bs4 import BeautifulSoup

class WebBrowserToolNode(ProviderNode):
    """Web browser tool for fetching and parsing web content"""
    
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "WebBrowserTool",
            "description": "Browse web pages and extract text content",
            "category": "Tools",
            "node_type": NodeType.PROVIDER,
            "inputs": [
                NodeInput(
                    name="headers",
                    type="dict",
                    description="Custom HTTP headers",
                    default={"User-Agent": "Mozilla/5.0"},
                    required=False
                )
            ]
        }

    def execute(self, **kwargs) -> Runnable:
        """Execute the web browser tool node"""
        headers = kwargs.get("headers", {"User-Agent": "Mozilla/5.0"})
        
        def browse_web(url: str) -> str:
            """Browse a web page and extract text content"""
            try:
                response = requests.get(url, headers=headers, timeout=10)
                response.raise_for_status()
                
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Remove script and style elements
                for script in soup(["script", "style"]):
                    script.decompose()
                
                # Get text
                text = soup.get_text()
                
                # Break into lines and remove leading/trailing space
                lines = (line.strip() for line in text.splitlines())
                # Break multi-headlines into a line each
                chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
                # Drop blank lines
                text = '\n'.join(chunk for chunk in chunks if chunk)
                
                return f"Content from {url}:\n{text[:2000]}..."  # Limit response size
                
            except Exception as e:
                return f"Error browsing {url}: {str(e)}"
        
        return Tool(
            name="WebBrowser",
            description="Useful for browsing web pages. Input should be a URL.",
            func=browse_web
        )
