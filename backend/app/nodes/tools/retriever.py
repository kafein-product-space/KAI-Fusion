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

from typing import Dict, Any, Optional, List
from langchain_core.runnables import Runnable
from langchain_core.retrievers import BaseRetriever
from langchain_core.documents import Document
# Auto-detect which API to use based on IntelligentVectorStore
try:
    from langchain_postgres import PGVector
    USING_NEW_API = True
except ImportError:
    import warnings
    with warnings.catch_warnings():
        warnings.filterwarnings("ignore", category=DeprecationWarning)
        from langchain_community.vectorstores import PGVector
    USING_NEW_API = False
from langchain.retrievers import ContextualCompressionRetriever

from ..base import ProviderNode, NodeType, NodeInput, NodeOutput


class MetadataFilterRetriever(BaseRetriever):
    """Custom retriever that applies metadata filtering to search results."""
    
    def __init__(self, base_retriever: BaseRetriever, metadata_filter: Dict[str, Any], filter_strategy: str = "exact"):
        super().__init__()
        self.base_retriever = base_retriever
        self.metadata_filter = metadata_filter
        self.filter_strategy = filter_strategy

    def _get_relevant_documents(self, query: str) -> List[Document]:
        """Retrieve documents and apply metadata filtering."""
        # Get base results
        documents = self.base_retriever.get_relevant_documents(query)
        
        if not self.metadata_filter:
            return documents
        
        # Apply metadata filtering
        filtered_docs = []
        for doc in documents:
            if self._matches_filter(doc.metadata):
                filtered_docs.append(doc)
        
        print(f"🔍 Metadata filter applied: {len(documents)} → {len(filtered_docs)} documents")
        return filtered_docs
    
    async def _aget_relevant_documents(self, query: str) -> List[Document]:
        """Async version of get_relevant_documents."""
        # Get base results
        documents = await self.base_retriever.aget_relevant_documents(query)
        
        if not self.metadata_filter:
            return documents
        
        # Apply metadata filtering
        filtered_docs = []
        for doc in documents:
            if self._matches_filter(doc.metadata):
                filtered_docs.append(doc)
        
        print(f"🔍 Metadata filter applied: {len(documents)} → {len(filtered_docs)} documents")
        return filtered_docs
    
    def _matches_filter(self, metadata: Dict[str, Any]) -> bool:
        """Check if document metadata matches the filter."""
        if self.filter_strategy == "exact":
            # All filter conditions must match exactly
            for key, value in self.metadata_filter.items():
                if key not in metadata or metadata[key] != value:
                    return False
            return True
            
        elif self.filter_strategy == "contains":
            # Metadata must contain filter values (useful for arrays/lists)
            for key, value in self.metadata_filter.items():
                if key not in metadata:
                    return False
                metadata_value = metadata[key]
                if isinstance(metadata_value, (list, tuple)):
                    if value not in metadata_value:
                        return False
                elif isinstance(metadata_value, str):
                    if str(value) not in metadata_value:
                        return False
                else:
                    if metadata_value != value:
                        return False
            return True
            
        elif self.filter_strategy == "or":
            # At least one filter condition must match
            for key, value in self.metadata_filter.items():
                if key in metadata and metadata[key] == value:
                    return True
            return False
            
        return False


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
                
                # Metadata Filtering
                NodeInput(
                    name="metadata_filter",
                    type="json",
                    description="Filter documents by metadata (JSON format)",
                    required=False,
                    default="{}",
                    placeholder='{"data_type": "products", "category": "electronics"}',
                ),
                NodeInput(
                    name="filter_strategy",
                    type="select",
                    description="How to apply metadata filters",
                    choices=[
                        {"value": "exact", "label": "Exact Match", "description": "All filter conditions must match exactly"},
                        {"value": "contains", "label": "Contains", "description": "Metadata must contain filter values (useful for arrays)"},
                        {"value": "or", "label": "Any Match (OR)", "description": "At least one filter condition must match"}
                    ],
                    default="exact",
                    required=False,
                ),
                NodeInput(
                    name="enable_metadata_filtering",
                    type="boolean",
                    description="Enable metadata-based filtering for search results",
                    default=False,
                    required=False,
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
        
        # Metadata filtering configuration
        enable_metadata_filtering = kwargs.get("enable_metadata_filtering") or self.user_data.get("enable_metadata_filtering", False)
        metadata_filter_str = kwargs.get("metadata_filter") or self.user_data.get("metadata_filter", "{}")
        filter_strategy = kwargs.get("filter_strategy") or self.user_data.get("filter_strategy", "exact")
        
        # Parse metadata filter
        metadata_filter = {}
        if enable_metadata_filtering and metadata_filter_str:
            try:
                import json
                metadata_filter = json.loads(metadata_filter_str) if isinstance(metadata_filter_str, str) else (metadata_filter_str or {})
                if metadata_filter:
                    print(f"🔍 Metadata filtering enabled: {metadata_filter} (strategy: {filter_strategy})")
            except (json.JSONDecodeError, TypeError) as e:
                print(f"⚠️ Invalid metadata_filter JSON: {e}, disabling filtering")
                metadata_filter = {}
                enable_metadata_filtering = False
        
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
            # Create vector store instance using auto-detected API
            if USING_NEW_API:
                # New langchain_postgres API with proper table creation
                vectorstore = PGVector(
                    embeddings=embedder,
                    connection=database_connection,
                    collection_name=collection_name,
                    use_jsonb=True,  # Use JSONB for better performance
                    pre_delete_collection=False,  # Don't delete existing data
                    create_extension=True,  # Ensure vector extension exists
                )
                print(f"📦 Created PGVector with new API for collection: {collection_name}")
                
                # Ensure the collection table is properly initialized
                try:
                    # This will create the table if it doesn't exist with proper schema
                    vectorstore._create_collection()
                except Exception as table_error:
                    print(f"⚠️ Collection creation info: {table_error}")
                    # Continue anyway as collection might already exist
                    
            else:
                # Legacy API
                vectorstore = PGVector(
                    collection_name=collection_name,
                    connection_string=database_connection,
                    embedding_function=embedder,
                )
                print(f"📦 Created PGVector with legacy API for collection: {collection_name}")
            
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
            
            # Apply metadata filtering if enabled
            if enable_metadata_filtering and metadata_filter:
                print(f"🔍 Applying metadata filter: {metadata_filter} (strategy: {filter_strategy})")
                filtered_retriever = MetadataFilterRetriever(
                    base_retriever=base_retriever,
                    metadata_filter=metadata_filter,
                    filter_strategy=filter_strategy
                )
            else:
                filtered_retriever = base_retriever
            
            # Apply reranker if provided
            if reranker:
                retriever = ContextualCompressionRetriever(
                    base_compressor=reranker,
                    base_retriever=filtered_retriever,
                )
            else:
                retriever = filtered_retriever
            
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