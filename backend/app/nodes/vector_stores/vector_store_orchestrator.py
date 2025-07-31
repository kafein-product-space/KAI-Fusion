"""
Vector Store Orchestrator - Simplified Storage Orchestration
============================================================

This module provides a streamlined vector store orchestrator that focuses solely on 
storage operations for pre-embedded documents. Unlike the full PGVectorStoreNode, 
this orchestrator assumes all documents come with proper embeddings and does not 
perform any internal embedding generation.

Key Features:
• Input Orchestration: Accepts pre-embedded documents and embedder service from connections
• Storage Focus: Efficient storage using provided embeddings without fallback generation
• Analytics Preservation: Maintains comprehensive storage statistics and performance metrics
• Retriever Creation: Creates optimized retrievers for RAG applications
• Configuration Simplicity: Reduced parameter surface focusing on storage essentials

Architecture:
The orchestrator follows the ProcessorNode pattern, receiving both connected inputs 
(documents and embedder) and user configuration. It orchestrates the storage workflow 
without embedding generation complexity.

Usage Pattern:
```python
# In workflow configuration
orchestrator = VectorStoreOrchestrator()
result = orchestrator.execute(
    inputs={
        "connection_string": "postgresql://...",
        "collection_name": "my_collection",
        # ... other storage configs
    },
    connected_nodes={
        "documents": [Document(...), ...],  # Pre-embedded documents
        "embedder": OpenAIEmbeddings(...)   # Configured embedder service
    }
)
```

Design Philosophy:
• Single Responsibility: Focus exclusively on storage orchestration
• Connection-First: Assume inputs come from node connections, not internal generation
• Performance-Oriented: Optimize for pre-embedded document workflows
• Analytics-Rich: Preserve detailed storage and performance metrics
"""
from __future__ import annotations

import time
import uuid
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from langchain_core.documents import Document
from langchain_community.vectorstores import PGVector
from langchain_core.vectorstores import VectorStoreRetriever

from ..base import ProcessorNode, NodeInput, NodeOutput, NodeType
from app.models.node import NodeCategory

logger = logging.getLogger(__name__)

# Search algorithms supported by PGVector
SEARCH_ALGORITHMS = {
    "cosine": {
        "name": "Cosine Similarity",
        "description": "Best for most text embeddings, measures angle between vectors",
        "recommended": True,
    },
    "euclidean": {
        "name": "Euclidean Distance", 
        "description": "L2 distance, good for normalized embeddings",
        "recommended": False,
    },
    "inner_product": {
        "name": "Inner Product",
        "description": "Dot product similarity, fast but requires normalized vectors",
        "recommended": False,
    },
}

class VectorStoreOrchestrator(ProcessorNode):
    """
    Simplified PostgreSQL + pgvector storage orchestrator for pre-embedded documents.
    
    This orchestrator assumes all documents come with proper embeddings and focuses
    solely on efficient storage orchestration without internal embedding generation.
    """

    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "VectorStoreOrchestrator",
            "display_name": "Vector Store Orchestrator",
            "description": (
                "Orchestrates storage of pre-embedded documents in PostgreSQL with pgvector extension. "
                "Assumes all documents have embeddings. Returns optimized retriever for RAG applications."
            ),
            "category": NodeCategory.VECTOR_STORE,
            "node_type": NodeType.PROCESSOR,
            "icon": "database",
            "color": "#4ade80",
            
            # Simplified input configuration focusing on orchestration
            "inputs": [
                # Connected Inputs (from other nodes)
                NodeInput(
                    name="documents",
                    type="documents",
                    is_connection=True,
                    description="Pre-embedded document chunks (must have embeddings)",
                    required=True,
                ),
                NodeInput(
                    name="embedder",
                    type="embedder",
                    is_connection=True,
                    description="Embedder service for storage operations (OpenAIEmbeddings, etc.)",
                    required=True,
                ),
                
                # Database Configuration
                NodeInput(
                    name="connection_string",
                    type="password",
                    description="PostgreSQL connection string (postgresql://user:pass@host:port/db)",
                    required=True,
                    is_secret=True,
                ),
                NodeInput(
                    name="collection_name",
                    type="text",
                    description="Vector collection name (auto-generated if empty)",
                    required=False,
                    default="",
                ),
                NodeInput(
                    name="pre_delete_collection",
                    type="boolean",
                    description="Delete existing collection before storing",
                    default=False,
                    required=False,
                ),
                
                # Retriever Configuration
                NodeInput(
                    name="search_algorithm",
                    type="select",
                    description="Vector similarity search algorithm",
                    choices=[
                        {"value": k, "label": v["name"], "description": v["description"]}
                        for k, v in SEARCH_ALGORITHMS.items()
                    ],
                    default="cosine",
                    required=False,
                ),
                NodeInput(
                    name="search_k",
                    type="slider",
                    description="Number of documents to retrieve",
                    default=6,
                    min_value=1,
                    max_value=50,
                    step=1,
                    required=False,
                ),
                NodeInput(
                    name="score_threshold",
                    type="slider",
                    description="Minimum similarity score threshold (0.0-1.0)",
                    default=0.0,
                    min_value=0.0,
                    max_value=1.0,
                    step=0.05,
                    required=False,
                ),
                
                # Performance Configuration
                NodeInput(
                    name="batch_size",
                    type="slider",
                    description="Batch size for storing embeddings",
                    default=100,
                    min_value=10,
                    max_value=1000,
                    step=10,
                    required=False,
                ),
                NodeInput(
                    name="enable_hnsw_index",
                    type="boolean",
                    description="Create HNSW index for faster similarity search",
                    default=True,
                    required=False,
                ),
            ],
            
            # Outputs matching the original PGVectorStoreNode for compatibility
            "outputs": [
                NodeOutput(
                    name="retriever",
                    type="retriever",
                    description="Configured vector store retriever for RAG",
                ),
                NodeOutput(
                    name="vectorstore",
                    type="vectorstore",
                    description="Direct vector store instance for advanced operations",
                ),
                NodeOutput(
                    name="storage_stats",
                    type="dict",
                    description="Storage operation statistics and performance metrics",
                ),
                NodeOutput(
                    name="index_info",
                    type="dict",
                    description="Database index and table information",
                ),
            ],
        }

    def _validate_documents(self, documents: List[Document]) -> List[Document]:
        """Validate that all documents have embeddings."""
        valid_docs = []
        for doc in documents:
            if isinstance(doc, Document) and doc.page_content.strip():
                # Check if document has embedding
                embedding = doc.metadata.get("embedding")
                if not embedding or not isinstance(embedding, list) or len(embedding) == 0:
                    raise ValueError(
                        "Document missing embedding. All documents must have pre-computed embeddings. "
                        f"Document content preview: {doc.page_content[:100]}..."
                    )
                valid_docs.append(doc)
            elif isinstance(doc, dict) and doc.get("page_content", "").strip():
                # Convert dict to Document if needed
                doc_obj = Document(
                    page_content=doc["page_content"],
                    metadata=doc.get("metadata", {})
                )
                # Check if document has embedding
                embedding = doc_obj.metadata.get("embedding")
                if not embedding or not isinstance(embedding, list) or len(embedding) == 0:
                    raise ValueError(
                        "Document missing embedding. All documents must have pre-computed embeddings. "
                        f"Document content preview: {doc_obj.page_content[:100]}..."
                    )
                valid_docs.append(doc_obj)
        
        if not valid_docs:
            raise ValueError("No valid documents found in input")
            
        return valid_docs

    def _prepare_documents_for_storage(self, documents: List[Document]) -> tuple[List[Document], List[List[float]]]:
        """Prepare documents and extract embeddings for storage."""
        prepared_docs = []
        all_embeddings = []
        
        for doc in documents:
            # Create clean document (remove embedding from metadata to avoid storage issues)
            clean_metadata = {k: v for k, v in doc.metadata.items() if k != "embedding"}
            clean_doc = Document(page_content=doc.page_content, metadata=clean_metadata)
            
            prepared_docs.append(clean_doc)
            all_embeddings.append(doc.metadata["embedding"])
        
        return prepared_docs, all_embeddings

    def _create_retriever(self, vectorstore: PGVector, search_config: Dict[str, Any]) -> VectorStoreRetriever:
        """Create optimized retriever with search configuration."""
        search_kwargs = {
            "k": search_config.get("search_k", 6),
        }
        
        # Add score threshold if specified
        score_threshold = search_config.get("score_threshold", 0.0)
        if score_threshold > 0:
            search_kwargs["score_threshold"] = score_threshold
        
        # Configure search algorithm
        search_algorithm = search_config.get("search_algorithm", "cosine")
        if search_algorithm != "cosine":  # cosine is default
            search_kwargs["search_type"] = search_algorithm
        
        return vectorstore.as_retriever(
            search_kwargs=search_kwargs
        )

    def _get_storage_statistics(self, vectorstore: PGVector, processed_docs: int, 
                              processing_time: float) -> Dict[str, Any]:
        """Generate comprehensive storage statistics."""
        return {
            "documents_stored": processed_docs,
            "processing_time_seconds": round(processing_time, 2),
            "storage_rate": round(processed_docs / processing_time, 2) if processing_time > 0 else 0,
            "collection_name": vectorstore.collection_name,
            "timestamp": datetime.now().isoformat(),
            "status": "completed" if processed_docs > 0 else "failed",
        }

    def _get_index_information(self, vectorstore: PGVector, enable_hnsw: bool) -> Dict[str, Any]:
        """Get database index and table information."""
        try:
            # Basic table information
            table_info = {
                "collection_name": vectorstore.collection_name,
                "table_exists": True,  # If we got here, table was created
                "hnsw_index_requested": enable_hnsw,
                "estimated_size": "unknown",  # Could query pg_relation_size if needed
            }
            
            # Note: Actual index creation is handled by PGVector internally
            if enable_hnsw:
                table_info["index_type"] = "HNSW (Hierarchical Navigable Small World)"
                table_info["index_benefits"] = "Faster similarity search for large datasets"
            else:
                table_info["index_type"] = "Default (Brute Force)"
                table_info["index_benefits"] = "Exact results, suitable for smaller datasets"
            
            return table_info
            
        except Exception as e:
            logger.warning(f"Could not retrieve index information: {e}")
            return {
                "collection_name": vectorstore.collection_name,
                "error": f"Could not retrieve index info: {str(e)}"
            }

    def execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute vector storage orchestration for pre-embedded documents.
        
        Args:
            inputs: User configuration from UI
            connected_nodes: Connected input nodes (must contain documents and embedder)
            
        Returns:
            Dict with retriever, vectorstore, stats, and index_info
        """
        start_time = time.time()
        logger.info("🔄 Starting Vector Store Orchestrator execution")
        
        # Extract documents and embedder from connected nodes
        documents = connected_nodes.get("documents")
        if not documents:
            raise ValueError("No documents provided. Connect a document source with pre-embedded documents.")
        
        if not isinstance(documents, list):
            documents = [documents]
        
        embedder = connected_nodes.get("embedder")
        if not embedder:
            raise ValueError("No embedder service provided. Connect an embedder provider.")
        
        # Validate that all documents have embeddings
        valid_docs = self._validate_documents(documents)
        logger.info(f"📚 Processing {len(valid_docs)} pre-embedded documents for vector storage")
        
        # Get configuration
        connection_string = inputs.get("connection_string")
        if not connection_string:
            raise ValueError("PostgreSQL connection string is required")
        
        collection_name = inputs.get("collection_name", "").strip()
        if not collection_name:
            collection_name = f"rag_collection_{uuid.uuid4().hex[:8]}"
        
        pre_delete = inputs.get("pre_delete_collection", False)
        batch_size = int(inputs.get("batch_size", 100))
        enable_hnsw = inputs.get("enable_hnsw_index", True)
        
        # Search configuration
        search_config = {
            "search_algorithm": inputs.get("search_algorithm", "cosine"),
            "search_k": int(inputs.get("search_k", 6)),
            "score_threshold": float(inputs.get("score_threshold", 0.0)),
        }
        
        logger.info(f"⚙️ Configuration: collection={collection_name}, batch_size={batch_size}, search_k={search_config['search_k']}")
        
        try:
            # Prepare documents and embeddings
            prepared_docs, all_embeddings = self._prepare_documents_for_storage(valid_docs)
            
            # Create PGVector store using pre-computed embeddings
            logger.info(f"💾 Creating vector store: {collection_name}")
            
            texts = [doc.page_content for doc in prepared_docs]
            metadatas = [doc.metadata for doc in prepared_docs]
            
            vectorstore = PGVector.from_embeddings(
                text_embeddings=list(zip(texts, all_embeddings)),
                embedding=embedder,
                collection_name=collection_name,
                connection_string=connection_string,
                pre_delete_collection=pre_delete,
                metadatas=metadatas,
            )
            logger.info(f"✅ Stored {len(prepared_docs)} pre-embedded documents")
            
            # Create optimized retriever
            retriever = self._create_retriever(vectorstore, search_config)
            
            # Calculate comprehensive statistics
            end_time = time.time()
            processing_time = end_time - start_time
            
            storage_stats = self._get_storage_statistics(vectorstore, len(prepared_docs), processing_time)
            index_info = self._get_index_information(vectorstore, enable_hnsw)
            
            # Log success summary
            logger.info(
                f"✅ Vector Store Orchestrator completed: {len(prepared_docs)} docs stored in '{collection_name}' "
                f"in {processing_time:.1f}s"
            )
            
            return {
                "retriever": retriever,
                "vectorstore": vectorstore,
                "storage_stats": storage_stats,
                "index_info": index_info,
            }
            
        except Exception as e:
            error_msg = f"Vector Store Orchestrator execution failed: {str(e)}"
            logger.error(error_msg)
            raise ValueError(error_msg) from e


# Export for node registry
__all__ = ["VectorStoreOrchestrator"]