"""
Retriever Provider Node
========================

This module provides a simplified provider node that creates and configures
retriever tools for use by agents in the workflow. Unlike full retrieval nodes,
this provider focuses solely on configuration without processing documents.

The provider follows the KAI-Fusion ProviderNode pattern, creating LangChain
tools from user inputs that can be consumed by agent nodes in the workflow.

Key Features:
- Minimal configuration surface for ease of use
- Direct integration with LangChain retrievers
- Support for database connection configuration
- Optional reranker integration
- Configurable search parameters

Usage Pattern:
--------------
The provider node is used at the beginning of workflows to create a shared
retriever tool that can be passed to agent nodes:

```python
# In workflow configuration
retriever_provider = RetrieverNode()
retriever_tool = retriever_provider.execute(
    database_connection="postgresql://user:pass@host:port/db",
    collection_name="my_collection",
    search_k=6,
    search_type="similarity",
    score_threshold=0.0
)

# The retriever tool can then be used by agents
agent = ReactAgentNode()
result = agent.execute(
    inputs={"input": "Find information about..."},
    connected_nodes={
        "llm": llm,
        "tools": [retriever_tool]
    }
)
```

Configuration Philosophy:
-------------------------
- Minimal parameters: Only what's needed to configure the retriever
- Clear error messages: Helpful feedback for configuration issues
- Flexible integration: Works with various database backends

Integration Points:
-------------------
This provider can be connected to:
- Agent nodes that need retrieval capabilities
- Any node requiring a configured retriever tool
"""

from typing import Dict, Any, Optional
from langchain_core.runnables import Runnable
from langchain_core.retrievers import BaseRetriever
from langchain_community.vectorstores import PGVector
from langchain.retrievers import ContextualCompressionRetriever

from ..base import ProviderNode, NodeType, NodeInput, NodeOutput


class RetrieverNode(ProviderNode):
    """
    Provider Node for Retriever Tool Configuration
    
    This node creates configured retriever tools that can be used
    by agent nodes in the workflow. It focuses on configuration only, without
    document processing or analytics features.
    """
    
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "RetrieverProvider",
            "display_name": "Retriever Provider",
            "description": (
                "Provider node that creates configured retriever tools for agents. "
                "Connect to a vector database and embeddings provider to create a "
                "search tool for your agents."
            ),
            "category": "Tool",
            "node_type": NodeType.PROVIDER,
            "icon": "search",
            "color": "#818cf8",
            "inputs": [
                # Database Configuration
                NodeInput(
                    name="database_connection",
                    type="str",
                    description="Database connection string (postgresql://user:pass@host:port/db)",
                    required=True,
                    is_secret=False,
                ),
                NodeInput(
                    name="collection_name",
                    type="str",
                    description="Vector collection name in the database",
                    required=True,
                ),
                
                # Search Configuration
                NodeInput(
                    name="search_k",
                    type="int",
                    description="Number of documents to retrieve",
                    default=6,
                    required=False,
                    min_value=1,
                    max_value=50,
                ),
                NodeInput(
                    name="search_type",
                    type="str",
                    description="Search type for retrieval",
                    default="similarity",
                    required=False,
                    choices=[
                        "similarity",
                        "mmr"
                    ]
                ),
                NodeInput(
                    name="score_threshold",
                    type="float",
                    description="Minimum similarity score threshold (0.0-1.0)",
                    default=0.0,
                    required=False,
                    min_value=0.0,
                    max_value=1.0,
                ),
                
                # Connected Inputs (from other nodes)
                NodeInput(
                    name="embedder",
                    type="embedder",
                    is_connection=True,
                    description="Embedder service for retrieval (OpenAIEmbeddings, etc.)",
                    required=True,
                ),
                NodeInput(
                    name="reranker",
                    type="reranker",
                    is_connection=True,
                    description="Optional reranker service for enhanced retrieval (CohereReranker, etc.)",
                    required=False,
                ),
            ],
            "outputs": [
                NodeOutput(
                    name="retriever_tool",
                    type="BaseTool",
                    description="Configured retriever tool ready for use with agents",
                )
            ]
        }
    
    def _create_retriever_tool(self, name: str, description: str, retriever: BaseRetriever) -> Runnable:
        """
        Create a retriever tool compatible with ReactAgentNode.
        
        This is a simplified version of the create_retriever_tool function from react_agent.py
        to ensure compatibility with the agent's _prepare_tools method.
        """
        from langchain_core.tools import Tool
        
        def retrieve_func(query: str) -> str:
            """Core retrieval function."""
            try:
                if not query or not query.strip():
                    return "Invalid query: Please provide a non-empty search query."
                
                # Clean and optimize query for retrieval
                cleaned_query = query.strip()
                
                # Execute retrieval with the underlying retriever
                docs = retriever.invoke(cleaned_query)
                
                # Handle empty results gracefully
                if not docs:
                    return (
                        f"No relevant documents found for query: '{cleaned_query}'. "
                        "Try rephrasing your search terms or using different keywords."
                    )
                
                # Format and optimize results for agent consumption
                results = []
                for i, doc in enumerate(docs[:5]):  # Limit to top 5 results for performance
                    try:
                        # Extract and clean content
                        content = doc.page_content if hasattr(doc, 'page_content') else str(doc)
                        
                        # Smart content truncation with context preservation
                        if len(content) > 500:
                            # Try to truncate at sentence boundary
                            truncated = content[:500]
                            last_period = truncated.rfind('.')
                            last_space = truncated.rfind(' ')
                            
                            if last_period > 400:  # Good sentence boundary found
                                content = truncated[:last_period + 1] + "..."
                            elif last_space > 400:  # Good word boundary found
                                content = truncated[:last_space] + "..."
                            else:  # Hard truncation
                                content = truncated + "..."
                        
                        # Extract metadata if available
                        metadata_info = ""
                        if hasattr(doc, 'metadata') and doc.metadata:
                            source = doc.metadata.get('source', '')
                            if source:
                                metadata_info = f" (Source: {source})"
                        
                        # Format individual result
                        result_text = f"Document {i+1}{metadata_info}:\n{content}"
                        results.append(result_text)
                        
                    except Exception as doc_error:
                        # Handle individual document processing errors
                        results.append(f"Document {i+1}: Error processing document - {str(doc_error)}")
                
                # Combine all results with clear separation
                final_result = "\n\n".join(results)
                
                # Add result summary for agent context
                result_summary = f"Found {len(docs)} documents, showing top {len(results)} results:\n\n{final_result}"
                
                return result_summary
                
            except Exception as e:
                # Comprehensive error handling with actionable feedback
                error_msg = (
                    f"Error retrieving documents for query '{query}': {str(e)}. "
                    "This might be due to retriever configuration issues or temporary service unavailability. "
                    "Try rephrasing your query or contact system administrator if the issue persists."
                )
                
                return error_msg
        
        # Create and return the configured tool
        return Tool(
            name=name,
            description=description,
            func=retrieve_func
        )
    
    def execute(self, **kwargs) -> Runnable:
        """
        Create and configure a retriever tool instance.
        
        This method focuses solely on configuration, creating a properly
        configured retriever tool instance without processing any documents.
        
        Args:
            **kwargs: Configuration parameters from node inputs
            
        Returns:
            BaseTool: Configured retriever tool instance
            
        Raises:
            ValueError: If required configuration is missing or invalid
        """
        # Extract configuration from user data or kwargs
        database_connection = kwargs.get("database_connection") or self.user_data.get("database_connection")
        collection_name = kwargs.get("collection_name") or self.user_data.get("collection_name")
        search_k = kwargs.get("search_k") or self.user_data.get("search_k", 6)
        search_type = kwargs.get("search_type") or self.user_data.get("search_type", "similarity")
        score_threshold = kwargs.get("score_threshold") or self.user_data.get("score_threshold", 0.0)
        
        # Validate required configuration
        if not database_connection:
            raise ValueError("Database connection string is required")
        
        if not collection_name:
            raise ValueError("Collection name is required")
        
        # Get connected embedder (required)
        embedder = kwargs.get("embedder")
        if not embedder:
            raise ValueError("Embedder service is required. Connect an embeddings provider.")
        
        # Get optional reranker
        reranker = kwargs.get("reranker")
        
        # Validate search parameters
        if not isinstance(search_k, int) or search_k < 1 or search_k > 50:
            raise ValueError("search_k must be an integer between 1 and 50")
        
        if search_type not in ["similarity", "mmr"]:
            raise ValueError("search_type must be either 'similarity' or 'mmr'")
        
        if not isinstance(score_threshold, (int, float)) or score_threshold < 0.0 or score_threshold > 1.0:
            raise ValueError("score_threshold must be a float between 0.0 and 1.0")
        
        try:
            # Create vector store instance
            vectorstore = PGVector(
                collection_name=collection_name,
                connection_string=database_connection,
                embedding_function=embedder,
            )
            
            # Configure search parameters
            search_kwargs = {
                "k": search_k,
            }
            
            # Add score threshold if specified
            if score_threshold > 0:
                search_kwargs["score_threshold"] = score_threshold
            
            # Create base retriever
            base_retriever = vectorstore.as_retriever(
                search_type=search_type,
                search_kwargs=search_kwargs
            )
            
            # Apply reranker if provided
            if reranker:
                retriever = ContextualCompressionRetriever(
                    base_compressor=reranker,
                    base_retriever=base_retriever,
                )
            else:
                retriever = base_retriever
            
            # Create retriever tool compatible with agents
            retriever_tool = self._create_retriever_tool(
                name="document_retriever",
                description="Search and retrieve relevant documents from the knowledge base",
                retriever=retriever
            )
            
            return retriever_tool
            
        except Exception as e:
            raise ValueError(f"Failed to create retriever: {str(e)}") from e


# Export for node registry
__all__ = ["RetrieverNode"]