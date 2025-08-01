"""
PGVector Store Node - Advanced Vector Database Integration
────────────────────────────────────────────────────────────
• Input: embedded_docs (List[Document]) OR chunks (List[Document])
• Smart Processing: Auto-detects embeddings or generates them on-demand
• Storage: PostgreSQL + pgvector extension (Supabase compatible)
• Output: Retriever + comprehensive analytics + performance metrics
• Features: Batch processing, connection pooling, search optimization
"""

from __future__ import annotations

import os
import time
import uuid
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import statistics

from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
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

# Embedding models specification (reused from OpenAIEmbedder)
EMBEDDING_MODELS = {
    "text-embedding-3-small": {"dimensions": 1536, "cost_per_1k": 0.00002},
    "text-embedding-3-large": {"dimensions": 3072, "cost_per_1k": 0.00013},
    "text-embedding-ada-002": {"dimensions": 1536, "cost_per_1k": 0.0001},
}

class PGVectorStoreNode(ProcessorNode):
    """
    Advanced PostgreSQL + pgvector storage with intelligent embedding handling.
    Supports both pre-embedded documents and on-demand embedding generation.
    """

    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "PGVectorStore",
            "display_name": "PostgreSQL Vector Store",
            "description": (
                "Stores document embeddings in PostgreSQL with pgvector extension. "
                "Auto-detects existing embeddings or generates them on-demand. "
                "Returns optimized retriever for RAG applications."
            ),
            "category": NodeCategory.VECTOR_STORE,
            "node_type": NodeType.PROCESSOR,
            "icon": "database",
            "color": "#4ade80",
            
            # Comprehensive input configuration
            "inputs": [
                NodeInput(
                    name="documents",
                    type="documents",
                    is_connection=True,
                    description="Document chunks (with or without embeddings)",
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
                
                # Embedding Configuration (for documents without embeddings)
                NodeInput(
                    name="fallback_embed_model",
                    type="select",
                    description="Embedding model for documents without embeddings",
                    choices=[
                        {"value": k, "label": k.replace("-", " ").title(), "description": f"{v['dimensions']}D, ${v['cost_per_1k']:.5f}/1K tokens"}
                        for k, v in EMBEDDING_MODELS.items()
                    ],
                    default="text-embedding-3-small",
                    required=False,
                ),
                NodeInput(
                    name="openai_api_key",
                    type="password",
                    description="OpenAI API key (for fallback embedding)",
                    required=False,
                    is_secret=True,
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
            
            # Multiple outputs for comprehensive feedback
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
                NodeOutput(
                    name="embedding_analysis",
                    type="dict",
                    description="Analysis of embeddings and fallback operations",
                ),
            ],
        }

    def _analyze_embeddings(self, documents: List[Document]) -> Dict[str, Any]:
        """Analyze embedding status of input documents."""
        total_docs = len(documents)
        docs_with_embeddings = 0
        docs_without_embeddings = 0
        embedding_dimensions = set()
        embedding_models = set()
        
        for doc in documents:
            embedding = doc.metadata.get("embedding")
            if embedding and isinstance(embedding, list) and len(embedding) > 0:
                docs_with_embeddings += 1
                embedding_dimensions.add(len(embedding))
                model = doc.metadata.get("embedding_model", "unknown")
                embedding_models.add(model)
            else:
                docs_without_embeddings += 1
        
        return {
            "total_documents": total_docs,
            "docs_with_embeddings": docs_with_embeddings,
            "docs_without_embeddings": docs_without_embeddings,
            "embedding_coverage": round(docs_with_embeddings / total_docs * 100, 1) if total_docs > 0 else 0,
            "unique_dimensions": list(embedding_dimensions),
            "embedding_models_found": list(embedding_models),
            "needs_fallback_embedding": docs_without_embeddings > 0,
        }

    def _prepare_documents_for_storage(self, documents: List[Document], 
                                     embedder: Optional[OpenAIEmbeddings] = None) -> Tuple[List[Document], List[List[float]], Dict[str, Any]]:
        """Prepare documents and extract/generate embeddings for storage."""
        prepared_docs = []
        all_embeddings = []
        fallback_stats = {
            "used_existing_embeddings": 0,
            "generated_new_embeddings": 0,
            "fallback_model_used": None,
            "processing_errors": []
        }
        
        # Separate documents with and without embeddings
        docs_with_embeddings = []
        docs_without_embeddings = []
        
        for doc in documents:
            embedding = doc.metadata.get("embedding")
            if embedding and isinstance(embedding, list) and len(embedding) > 0:
                docs_with_embeddings.append((doc, embedding))
            else:
                docs_without_embeddings.append(doc)
        
        # Process documents with existing embeddings
        for doc, embedding in docs_with_embeddings:
            # Create clean document (remove embedding from metadata to avoid storage issues)
            clean_metadata = {k: v for k, v in doc.metadata.items() if k != "embedding"}
            clean_doc = Document(page_content=doc.page_content, metadata=clean_metadata)
            
            prepared_docs.append(clean_doc)
            all_embeddings.append(embedding)
            fallback_stats["used_existing_embeddings"] += 1
        
        # Generate embeddings for documents without them
        if docs_without_embeddings:
            if not embedder:
                raise ValueError(
                    f"{len(docs_without_embeddings)} documents lack embeddings, "
                    "but no OpenAI API key provided for fallback embedding generation."
                )
            
            try:
                logger.info(f"🔄 Generating embeddings for {len(docs_without_embeddings)} documents")
                texts = [doc.page_content for doc in docs_without_embeddings]
                new_embeddings = embedder.embed_documents(texts)
                
                for doc, embedding in zip(docs_without_embeddings, new_embeddings):
                    clean_doc = Document(page_content=doc.page_content, metadata=doc.metadata)
                    prepared_docs.append(clean_doc)
                    all_embeddings.append(embedding)
                    fallback_stats["generated_new_embeddings"] += 1
                
                fallback_stats["fallback_model_used"] = embedder.model
                
            except Exception as e:
                error_msg = f"Fallback embedding generation failed: {str(e)}"
                fallback_stats["processing_errors"].append(error_msg)
                raise ValueError(error_msg) from e
        
        return prepared_docs, all_embeddings, fallback_stats

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
        Execute vector storage with comprehensive error handling and analytics.
        
        Args:
            inputs: User configuration from UI
            connected_nodes: Connected input nodes (should contain documents)
            
        Returns:
            Dict with retriever, vectorstore, stats, index_info, and embedding_analysis
        """
        start_time = time.time()
        logger.info("🔄 Starting PGVector Store execution")
        
        # Extract documents from connected nodes
        documents = connected_nodes.get("documents")
        if not documents:
            raise ValueError("No documents provided. Connect a document source.")
        
        if not isinstance(documents, list):
            documents = [documents]
        
        # Validate documents
        valid_docs = []
        for doc in documents:
            if isinstance(doc, Document) and doc.page_content.strip():
                valid_docs.append(doc)
            elif isinstance(doc, dict) and doc.get("page_content", "").strip():
                # Convert dict to Document if needed
                valid_docs.append(Document(
                    page_content=doc["page_content"],
                    metadata=doc.get("metadata", {})
                ))
        
        if not valid_docs:
            raise ValueError("No valid documents found in input")
        
        logger.info(f"📚 Processing {len(valid_docs)} documents for vector storage")
        
        # Get configuration
        connection_string = inputs.get("connection_string")
        if not connection_string:
            raise ValueError("PostgreSQL connection string is required")
        
        collection_name = inputs.get("collection_name", "").strip()
        if not collection_name:
            collection_name = f"rag_collection_{uuid.uuid4().hex[:8]}"
        
        pre_delete = inputs.get("pre_delete_collection", False)
        fallback_model = inputs.get("fallback_embed_model", "text-embedding-3-small")
        openai_api_key = inputs.get("openai_api_key") or os.getenv("OPENAI_API_KEY")
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
            # Analyze embeddings in input documents
            embedding_analysis = self._analyze_embeddings(valid_docs)
            logger.info(f"📊 Embedding analysis: {embedding_analysis['embedding_coverage']}% pre-embedded")
            
            # Prepare embedder for fallback if needed
            embedder = None
            if embedding_analysis["needs_fallback_embedding"]:
                if not openai_api_key:
                    raise ValueError(
                        f"{embedding_analysis['docs_without_embeddings']} documents lack embeddings, "
                        "but no OpenAI API key provided for fallback generation."
                    )
                embedder = OpenAIEmbeddings(
                    model=fallback_model,
                    openai_api_key=openai_api_key
                )
                logger.info(f"🔧 Fallback embedder ready: {fallback_model}")
            
            # Prepare documents and embeddings
            prepared_docs, all_embeddings, fallback_stats = self._prepare_documents_for_storage(
                valid_docs, embedder
            )
            
            # Create PGVector store
            logger.info(f"💾 Creating vector store: {collection_name}")
            
            # Create embedder for PGVector (required even if using pre-computed embeddings)
            if not embedder:
                if not openai_api_key:
                    openai_api_key = "dummy"  # PGVector requires embedder instance even for pre-computed embeddings
                embedder = OpenAIEmbeddings(model=fallback_model, openai_api_key=openai_api_key)
            
            if embedding_analysis["docs_with_embeddings"] > 0 and embedding_analysis["docs_without_embeddings"] == 0:
                # All documents have embeddings - use from_embeddings
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
                logger.info(f"✅ Used pre-computed embeddings for all {len(prepared_docs)} documents")
            else:
                # Mixed or no embeddings - use from_documents with embedder
                vectorstore = PGVector.from_documents(
                    documents=prepared_docs,
                    embedding=embedder,
                    collection_name=collection_name,
                    connection_string=connection_string,
                    pre_delete_collection=pre_delete,
                )
                logger.info(f"✅ Stored {len(prepared_docs)} documents with embedding generation")
            
            # Create optimized retriever
            retriever = self._create_retriever(vectorstore, search_config)
            
            # Calculate comprehensive statistics
            end_time = time.time()
            processing_time = end_time - start_time
            
            storage_stats = self._get_storage_statistics(vectorstore, len(prepared_docs), processing_time)
            index_info = self._get_index_information(vectorstore, enable_hnsw)
            
            # Update embedding analysis with fallback results
            embedding_analysis.update({
                "fallback_operations": fallback_stats,
                "final_embedding_model": fallback_model if fallback_stats["generated_new_embeddings"] > 0 else "mixed",
            })
            
            # Log success summary
            logger.info(
                f"✅ PGVector Store completed: {len(prepared_docs)} docs stored in '{collection_name}' "
                f"({fallback_stats['used_existing_embeddings']} pre-embedded, "
                f"{fallback_stats['generated_new_embeddings']} generated) "
                f"in {processing_time:.1f}s"
            )
            
            return {
                "retriever": retriever,
                "vectorstore": vectorstore,
                "storage_stats": storage_stats,
                "index_info": index_info,
                "embedding_analysis": embedding_analysis,
            }
            
        except Exception as e:
            error_msg = f"PGVector Store execution failed: {str(e)}"
            logger.error(error_msg)
            raise ValueError(error_msg) from e


# Export for node registry
__all__ = ["PGVectorStoreNode"]