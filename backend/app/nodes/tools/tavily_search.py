
import os
from typing import Dict, Any, Optional, List
from ..base import ProviderNode, NodeInput, NodeOutput, NodeType
from langchain_tavily import TavilySearch
from langchain_core.runnables import Runnable

class TavilySearchNode(ProviderNode):
    """
    A standardized, robust Tavily search node that directly uses the langchain_community tool.
    It ensures that the API key is handled exclusively from the node's configuration panel,
    as requested by the user.
    """
    
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "TavilySearch",
            "display_name": "Tavily Web Search",
            "description": "Performs a web search using the Tavily API.",
            "category": "Tools",
            "node_type": NodeType.PROVIDER,
            "inputs": [
                NodeInput(
                    name="tavily_api_key",
                    type="str",
                    description="Tavily API Key. If not provided, uses TAVILY_API_KEY environment variable.",
                    required=False,
                    is_secret=True
                ),
                NodeInput(name="max_results", type="int", default=5, description="The maximum number of results to return."),
                NodeInput(name="search_depth", type="str", default="basic", choices=["basic", "advanced"], description="The depth of the search."),
                NodeInput(name="include_domains", type="str", description="A comma-separated list of domains to include in the search.", required=False, default=""),
                NodeInput(name="exclude_domains", type="str", description="A comma-separated list of domains to exclude from the search.", required=False, default=""),
                NodeInput(name="include_answer", type="bool", default=True, description="Whether to include a direct answer in the search results."),
                NodeInput(name="include_raw_content", type="bool", default=False, description="Whether to include the raw content of the web pages in the search results."),
                NodeInput(name="include_images", type="bool", default=False, description="Whether to include images in the search results."),
            ],
            "outputs": [
                NodeOutput(
                    name="output",
                    type="tool",
                    description="A configured Tavily search tool instance."
                )
            ]
        }
    
    def execute(self, **kwargs) -> Runnable:
        """
        Creates and returns a configured TavilySearchResults tool.
        """
        print("🔧 Initializing Tavily Search Node...")

        # 1. Get API key using the same pattern as OpenAI node
        api_key = self.user_data.get("tavily_api_key")
        if not api_key:
            api_key = os.getenv("TAVILY_API_KEY")
        
        print(f"[DEBUG Tavily] user_data keys: {list(self.user_data.keys())}")
        print(f"[DEBUG Tavily] API key from user_data: {self.user_data.get('tavily_api_key') is not None}")
        print(f"[DEBUG Tavily] API key from env: {os.getenv('TAVILY_API_KEY') is not None}")
        print(f"[DEBUG Tavily] Final API key present: {api_key is not None}")
        if api_key:
            print(f"[DEBUG Tavily] API key prefix: {api_key[:10]}...")
        
        if not api_key:
            raise ValueError(
                "Tavily API key is required. Please provide it in the node configuration "
                "or set TAVILY_API_KEY environment variable."
            )

        # 2. Get all other parameters from user data with defaults.
        max_results = int(self.user_data.get("max_results", 5))
        search_depth = self.user_data.get("search_depth", "basic")
        include_answer = bool(self.user_data.get("include_answer", True))
        include_raw_content = bool(self.user_data.get("include_raw_content", False))
        include_images = bool(self.user_data.get("include_images", False))

        # 3. Safely parse domain lists.
        include_domains_str = self.user_data.get("include_domains", "")
        exclude_domains_str = self.user_data.get("exclude_domains", "")
        
        include_domains = [d.strip() for d in include_domains_str.split(",") if d.strip()]
        exclude_domains = [d.strip() for d in exclude_domains_str.split(",") if d.strip()]

        try:
            # 4. Instantiate the official Tavily tool.
            # Only include domain parameters if they have values
            tool_params = {
                "tavily_api_key": api_key,
                "max_results": max_results,
                "search_depth": search_depth,
                "include_answer": include_answer,
                "include_raw_content": include_raw_content,
                "include_images": include_images,
            }
            
            # Only add domain filters if they contain actual domains
            if include_domains:
                tool_params["include_domains"] = include_domains
            if exclude_domains:
                tool_params["exclude_domains"] = exclude_domains
                
            search_tool = TavilySearch(**tool_params)
            
            print("✅ Tavily Search Tool created successfully.")
            print(f"[DEBUG Tavily] Tool description: {search_tool.description}")
            print(f"[DEBUG Tavily] Tool name: {search_tool.name}")
            print(f"[DEBUG Tavily] Tool args schema: {search_tool.args_schema}")
            
            # Test the API connection with a simple query
            try:
                print("[DEBUG Tavily] Testing API connection...")
                test_result = search_tool.run("test query")
                print(f"[DEBUG Tavily] API test successful: {len(str(test_result))} chars")
            except Exception as test_error:
                print(f"[DEBUG Tavily] API test failed: {test_error}")
                print(f"[DEBUG Tavily] Test error type: {type(test_error).__name__}")
                if hasattr(test_error, 'response'):
                    print(f"[DEBUG Tavily] Test response status: {test_error.response.status_code}")
                    print(f"[DEBUG Tavily] Test response text: {test_error.response.text[:500]}")
            
            return search_tool
            
        except Exception as e:
            print(f"❌ Failed to create Tavily search tool: {e}")
            print(f"[DEBUG Tavily] Exception type: {type(e).__name__}")
            print(f"[DEBUG Tavily] Exception details: {str(e)}")
            
            # Try to get more details from the exception
            if hasattr(e, 'response'):
                print(f"[DEBUG Tavily] Response status: {e.response.status_code}")
                print(f"[DEBUG Tavily] Response text: {e.response.text}")
            
            # Propagate the error to be handled by the workflow engine.
            raise ValueError(f"Failed to initialize Tavily Search Tool: {e}") from e

# Alias for frontend compatibility
TavilyNode = TavilySearchNode
