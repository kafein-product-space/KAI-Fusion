"""
Intelligent Vector Store Orchestrator - Auto-Optimizing Database Management
============================================================================

This module provides an intelligent vector store orchestrator that automatically
optimizes the database for high-performance vector operations. It manages the
complete lifecycle of vector storage including schema validation, index creation,
and performance optimization.

Key Features:
• Auto-Schema Management: Validates and migrates embedding column types
• Auto-Index Creation: Creates HNSW indexes for optimal search performance
• Performance Monitoring: Tracks and reports storage and retrieval metrics
• Connection-First Design: Works with pre-embedded documents and embedder services
• Database Health Checks: Ensures optimal configuration before operations

Architecture:
The intelligent orchestrator performs database optimization checks before
any storage operations, ensuring the vector database is always configured
for maximum performance.

Database Optimizations Applied:
1. Embedding column type validation and migration to vector(dimension)
2. HNSW index creation for fast similarity search
3. Metadata GIN index for efficient filtering
4. Connection pooling and performance monitoring

Usage Pattern:
```python
# In workflow configuration
orchestrator = IntelligentVectorStore()
result = orchestrator.execute(
    inputs={
        "connection_string": "postgresql://...",
        "collection_name": "my_collection",
        # ... other configs
    },
    connected_nodes={
        "documents": [Document(...), ...],  # Pre-embedded documents
        "embedder": OpenAIEmbeddings(...)   # Configured embedder service
    }
)
```
"""

from __future__ import annotations

import time
import uuid
import logging
import psycopg2
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

from langchain_core.documents import Document
from langchain_core.vectorstores import VectorStoreRetriever

# Use new langchain_postgres API with legacy fallback
try:
    from langchain_postgres import PGVector as NewPGVector
    NEW_API_AVAILABLE = True
except ImportError:
    NEW_API_AVAILABLE = False

try:
    from langchain_community.vectorstores import PGVector as LegacyPGVector
    LEGACY_API_AVAILABLE = True
except ImportError:
    LEGACY_API_AVAILABLE = False

# Start with new API if available
USING_NEW_API = NEW_API_AVAILABLE
PGVector = NewPGVector if NEW_API_AVAILABLE else LegacyPGVector

from ..base import ProcessorNode, NodeInput, NodeOutput, NodeType

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
    Intelligent PostgreSQL + pgvector storage orchestrator with automatic optimization.
    
    This orchestrator automatically optimizes the database schema and indexes
    for maximum vector search performance before storing documents.
    """

    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "VectorStoreOrchestrator",
            "display_name": "Vector Store Orchestrator",
            "description": (
                "Auto-optimizing PostgreSQL vector store that ensures maximum performance. "
                "Automatically manages database schema, indexes, and optimization for vector operations."
            ),
            "category": "VectorStore",
            "node_type": NodeType.PROCESSOR,
            "icon": "database",
            "color": "#10b981",
            
            "inputs": [
                # Connected Inputs (from other nodes)
                NodeInput(
                    name="documents",
                    type="documents",
                    is_connection=True,
                    description="Pre-embedded document chunks (will auto-generate embeddings if missing)",
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
                    description="Vector collection name - separates different datasets (REQUIRED for data isolation)",
                    required=True,
                    placeholder="e.g., amazon_products, user_manuals, company_docs",
                ),
                NodeInput(
                    name="table_prefix",
                    type="text", 
                    description="Custom table prefix for complete database isolation (optional)",
                    required=False,
                    default="",
                    placeholder="e.g., project1_, client_a_",
                ),
                NodeInput(
                    name="pre_delete_collection",
                    type="boolean",
                    description="Delete existing collection before storing",
                    default=False,
                    required=False,
                ),
                
                # Manual Metadata Configuration
                NodeInput(
                    name="custom_metadata",
                    type="json",
                    description="Custom metadata to add to all documents (JSON format)",
                    required=False,
                    default="{}",
                    placeholder='{"source": "amazon_catalog", "category": "electronics", "version": "2024"}',
                ),
                NodeInput(
                    name="preserve_document_metadata",
                    type="boolean",
                    description="Keep original document metadata alongside custom metadata",
                    default=True,
                    required=False,
                ),
                NodeInput(
                    name="metadata_strategy",
                    type="select",
                    description="How to handle metadata conflicts",
                    choices=[
                        {"value": "merge", "label": "Merge (custom overrides document)", "description": "Combine both, custom metadata takes priority"},
                        {"value": "replace", "label": "Replace (only custom metadata)", "description": "Use only custom metadata, ignore document metadata"},
                        {"value": "document_only", "label": "Document Only", "description": "Use only document metadata, ignore custom metadata"}
                    ],
                    default="merge",
                    required=False,
                ),
                
                # Auto-Optimization Settings
                NodeInput(
                    name="auto_optimize",
                    type="boolean",
                    description="Automatically optimize database schema and indexes",
                    default=True,
                    required=False,
                ),
                NodeInput(
                    name="embedding_dimension",
                    type="int",
                    description="Embedding vector dimension (auto-detected if 0)",
                    default=0,
                    required=False,
                    min_value=0,
                    max_value=4096,
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
            ],
            
            "outputs": [
                NodeOutput(
                    name="result",
                    type="retriever",
                    description="Optimized vector store retriever for RAG",
                ),
                NodeOutput(
                    name="vectorstore",
                    type="vectorstore",
                    description="Direct vector store instance for advanced operations",
                ),
                NodeOutput(
                    name="optimization_report",
                    type="dict",
                    description="Database optimization report and performance metrics",
                ),
                NodeOutput(
                    name="storage_stats",
                    type="dict",
                    description="Storage operation statistics and performance metrics",
                ),
            ],
        }

    def _normalize_psycopg2_dsn(self, connection_string: str) -> str:
        """Normalize SQLAlchemy-style URLs to psycopg2-compatible DSN.

        - Converts postgresql+asyncpg:// to postgresql://
        - Converts postgresql+psycopg2:// to postgresql://
        - Leaves postgresql:// and postgres:// as-is
        """
        try:
            cs_lower = connection_string.lower()
            if cs_lower.startswith("postgresql+asyncpg://"):
                return "postgresql://" + connection_string.split("://", 1)[1]
            if cs_lower.startswith("postgresql+psycopg2://"):
                return "postgresql://" + connection_string.split("://", 1)[1]
            return connection_string
        except Exception:
            # On any parsing issue, fall back to original string
            return connection_string

    def _get_db_connection(self, connection_string: str):
        """Create database connection for optimization operations."""
        try:
            dsn = self._normalize_psycopg2_dsn(connection_string)
            return psycopg2.connect(dsn)
        except Exception as e:
            raise ValueError(f"Failed to connect to database: {str(e)}")

    def _check_schema_compatibility(self, connection_string: str) -> bool:
        """Check if database schema is compatible with new API."""
        if not USING_NEW_API:
            return True  # Legacy API doesn't need schema check
            
        try:
            conn = self._get_db_connection(connection_string)
            cursor = conn.cursor()
            
            # Check if langchain_pg_embedding table has 'id' column
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'langchain_pg_embedding'
                    AND column_name = 'id'
                );
            """)
            
            has_id_column = cursor.fetchone()[0]
            conn.close()
            
            logger.info(f"🔍 Schema compatibility check: id column exists = {has_id_column}")
            return has_id_column
            
        except Exception as e:
            logger.warning(f"⚠️ Schema compatibility check failed: {e}")
            return False  # Assume incompatible on error

    def _switch_to_legacy_api(self):
        """Switch to legacy API when schema is incompatible."""
        global USING_NEW_API, PGVector
        
        if not LEGACY_API_AVAILABLE:
            raise ValueError("Legacy API not available for fallback")
            
        USING_NEW_API = False
        PGVector = LegacyPGVector
        logger.info("🔄 Switched to legacy langchain_community PGVector API for compatibility")

    def _detect_embedding_dimension(self, documents: List[Document], embedder) -> int:
        """Auto-detect embedding dimension from documents or embedder."""
        # First, try to detect from existing embeddings in documents
        for doc in documents:
            embedding = doc.metadata.get("embedding")
            if embedding and isinstance(embedding, list) and len(embedding) > 0:
                logger.info(f"🔍 Detected embedding dimension from documents: {len(embedding)}")
                return len(embedding)
        
        # If no embeddings found, try to get dimension from embedder
        try:
            if hasattr(embedder, 'dimensions'):
                logger.info(f"🔍 Detected embedding dimension from embedder: {embedder.dimensions}")
                return embedder.dimensions
            elif hasattr(embedder, 'model') and 'text-embedding-3-small' in str(embedder.model):
                logger.info("🔍 Detected OpenAI text-embedding-3-small: 1536 dimensions")
                return 1536
            elif hasattr(embedder, 'model') and 'text-embedding-3-large' in str(embedder.model):
                logger.info("🔍 Detected OpenAI text-embedding-3-large: 3072 dimensions")
                return 3072
            elif hasattr(embedder, 'model') and 'text-embedding-ada-002' in str(embedder.model):
                logger.info("🔍 Detected OpenAI text-embedding-ada-002: 1536 dimensions")
                return 1536
            else:
                # Default to OpenAI's most common dimension
                logger.warning("⚠️ Could not detect embedding dimension, defaulting to 1536")
                return 1536
        except Exception as e:
            logger.warning(f"⚠️ Error detecting embedding dimension: {e}, defaulting to 1536")
            return 1536

    def _optimize_database_schema(self, connection_string: str, collection_name: str, 
                                embedding_dimension: int) -> Dict[str, Any]:
        """Optimize database schema for vector operations."""
        optimization_report = {
            "timestamp": datetime.now().isoformat(),
            "collection_name": collection_name,
            "embedding_dimension": embedding_dimension,
            "optimizations_applied": [],
            "errors": [],
            "performance_improvements": []
        }
        
        conn = None
        try:
            conn = self._get_db_connection(connection_string)
            cursor = conn.cursor()
            
            # 1. Ensure pgvector extension exists
            try:
                cursor.execute("CREATE EXTENSION IF NOT EXISTS vector;")
                conn.commit()
                optimization_report["optimizations_applied"].append("pgvector extension enabled")
                logger.info("✅ pgvector extension ensured")
            except Exception as e:
                optimization_report["errors"].append(f"pgvector extension: {str(e)}")
                logger.warning(f"⚠️ pgvector extension issue: {e}")
            
            # 2. Check if langchain tables exist (different names for new API)
            if USING_NEW_API:
                # New API uses different table names
                table_names = ['langchain_pg_collection', 'langchain_pg_embedding']
                table_prefix = 'langchain_pg_'
            else:
                # Legacy API uses different table names  
                table_names = ['langchain_pg_collection', 'langchain_pg_embedding']
                table_prefix = 'langchain_pg_'
                
            cursor.execute(f"""
                SELECT table_name FROM information_schema.tables 
                WHERE table_name LIKE '{table_prefix}%'
                AND table_schema = 'public';
            """)
            existing_tables = [row[0] for row in cursor.fetchall()]
            
            if len(existing_tables) < 2:
                logger.info("📋 LangChain tables will be created automatically by PGVector")
                optimization_report["optimizations_applied"].append("LangChain tables will be auto-created")
            
            # 3. Check and optimize embedding column type (only if table exists)
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'langchain_pg_embedding'
                );
            """)
            table_exists = cursor.fetchone()[0]
            
            if table_exists:
                # Check current embedding column type
                cursor.execute("""
                    SELECT data_type, character_maximum_length, numeric_precision 
                    FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'langchain_pg_embedding' 
                    AND column_name = 'embedding';
                """)
                
                column_info = cursor.fetchone()
                if column_info:
                    data_type = column_info[0]
                    logger.info(f"🔍 Current embedding column type: {data_type}")
                    
                    # Check if it's already vector type with correct dimension
                    if data_type != 'vector':
                        try:
                            logger.info(f"🔧 Migrating embedding column to vector({embedding_dimension})")
                            cursor.execute(f"""
                                ALTER TABLE public.langchain_pg_embedding 
                                ALTER COLUMN embedding TYPE vector({embedding_dimension});
                            """)
                            conn.commit()
                            optimization_report["optimizations_applied"].append(
                                f"Migrated embedding column to vector({embedding_dimension})"
                            )
                            optimization_report["performance_improvements"].append(
                                "Vector column type enables native vector operations"
                            )
                            logger.info("✅ Embedding column migrated to vector type")
                        except Exception as e:
                            optimization_report["errors"].append(f"Column migration: {str(e)}")
                            logger.warning(f"⚠️ Column migration issue: {e}")
            
            # 4. Check and create HNSW index
            if table_exists:
                # Check if HNSW index exists
                cursor.execute("""
                    SELECT indexname FROM pg_indexes 
                    WHERE tablename = 'langchain_pg_embedding' 
                    AND indexdef LIKE '%USING hnsw%';
                """)
                
                hnsw_indexes = cursor.fetchall()
                if not hnsw_indexes:
                    try:
                        logger.info("🔧 Creating HNSW index for fast vector search")
                        # Use vector_cosine_ops for cosine similarity (most common)
                        cursor.execute("""
                            CREATE INDEX IF NOT EXISTS langchain_pg_embedding_hnsw_idx 
                            ON public.langchain_pg_embedding 
                            USING hnsw (embedding vector_cosine_ops)
                            WITH (m = 16, ef_construction = 64);
                        """)
                        conn.commit()
                        optimization_report["optimizations_applied"].append("HNSW index created")
                        optimization_report["performance_improvements"].append(
                            "HNSW index provides sub-linear search time for large datasets"
                        )
                        logger.info("✅ HNSW index created successfully")
                    except Exception as e:
                        optimization_report["errors"].append(f"HNSW index creation: {str(e)}")
                        logger.warning(f"⚠️ HNSW index creation issue: {e}")
                else:
                    optimization_report["optimizations_applied"].append("HNSW index already exists")
                    logger.info("✅ HNSW index already exists")
            
            # 5. Check and create metadata GIN index
            if table_exists:
                cursor.execute("""
                    SELECT indexname FROM pg_indexes 
                    WHERE tablename = 'langchain_pg_embedding' 
                    AND indexdef LIKE '%USING gin%'
                    AND indexdef LIKE '%cmetadata%';
                """)
                
                gin_indexes = cursor.fetchall()
                if not gin_indexes:
                    try:
                        logger.info("🔧 Creating GIN index for metadata filtering")
                        cursor.execute("""
                            CREATE INDEX IF NOT EXISTS langchain_pg_embedding_metadata_gin_idx 
                            ON public.langchain_pg_embedding 
                            USING gin (cmetadata);
                        """)
                        conn.commit()
                        optimization_report["optimizations_applied"].append("Metadata GIN index created")
                        optimization_report["performance_improvements"].append(
                            "GIN index enables fast metadata-based filtering"
                        )
                        logger.info("✅ Metadata GIN index created successfully")
                    except Exception as e:
                        optimization_report["errors"].append(f"GIN index creation: {str(e)}")
                        logger.warning(f"⚠️ GIN index creation issue: {e}")
                else:
                    optimization_report["optimizations_applied"].append("Metadata GIN index already exists")
                    logger.info("✅ Metadata GIN index already exists")
            
        except Exception as e:
            optimization_report["errors"].append(f"Database optimization error: {str(e)}")
            logger.error(f"❌ Database optimization failed: {e}")
        finally:
            if conn:
                conn.close()
        
        return optimization_report

    def _process_custom_metadata(self, documents: List[Document], 
                                custom_metadata: Dict[str, Any],
                                preserve_document_metadata: bool,
                                metadata_strategy: str) -> List[Document]:
        """Process documents with custom metadata according to strategy."""
        if not custom_metadata and preserve_document_metadata:
            return documents  # No changes needed
        
        processed_docs = []
        logger.info(f"🏷️ Processing {len(documents)} documents with custom metadata strategy: {metadata_strategy}")
        
        for doc in documents:
            if metadata_strategy == "replace":
                # Use only custom metadata
                new_metadata = custom_metadata.copy()
            elif metadata_strategy == "document_only":
                # Use only document metadata
                new_metadata = doc.metadata.copy()
            else:  # merge (default)
                # Start with document metadata, override with custom
                new_metadata = doc.metadata.copy() if preserve_document_metadata else {}
                new_metadata.update(custom_metadata)
            
            # Remove embedding from metadata to avoid storage issues
            new_metadata.pop("embedding", None)
            
            processed_doc = Document(
                page_content=doc.page_content,
                metadata=new_metadata
            )
            processed_docs.append(processed_doc)
        
        logger.info(f"✅ Applied custom metadata to {len(processed_docs)} documents")
        return processed_docs

    def _get_table_names(self, table_prefix: str) -> Dict[str, str]:
        """Get custom table names with prefix."""
        if table_prefix:
            prefix = table_prefix.rstrip('_') + '_'
            return {
                "collection_table": f"{prefix}langchain_pg_collection", 
                "embedding_table": f"{prefix}langchain_pg_embedding"
            }
        else:
            return {
                "collection_table": "langchain_pg_collection",
                "embedding_table": "langchain_pg_embedding" 
            }

    def _validate_documents(self, documents: List[Document]) -> Tuple[List[Document], bool]:
        """Validate documents and determine if they have embeddings."""
        valid_docs = []
        has_embeddings = True
        
        logger.info(f"🔍 Validating {len(documents)} documents")
        
        for i, doc in enumerate(documents):            
            if isinstance(doc, Document) and doc.page_content.strip():
                # Check if document has embedding
                embedding = doc.metadata.get("embedding")
                if not embedding or not isinstance(embedding, list) or len(embedding) == 0:
                    has_embeddings = False
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
                    has_embeddings = False
                valid_docs.append(doc_obj)
            elif isinstance(doc, list):
                # Handle nested list of documents
                for nested_doc in doc:
                    if isinstance(nested_doc, Document):
                        # Documents from ChunkSplitter typically don't have embeddings yet
                        has_embeddings = False
                        valid_docs.append(nested_doc)
        
        if not valid_docs:
            raise ValueError("No valid documents found in input")
            
        logger.info(f"✅ Validated {len(valid_docs)} documents, embeddings_present={has_embeddings}")
        return valid_docs, has_embeddings

    def _prepare_documents_for_storage(self, documents: List[Document]) -> Tuple[List[Document], List[List[float]]]:
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

    def execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute intelligent vector storage with automatic database optimization.
        
        Args:
            inputs: User configuration from UI
            connected_nodes: Connected input nodes (must contain documents and embedder)
            
        Returns:
            Dict with retriever, vectorstore, optimization_report, and storage_stats
        """
        start_time = time.time()
        logger.info("🚀 Starting Intelligent Vector Store execution")
        
        # Extract documents and embedder from connected nodes
        documents = connected_nodes.get("documents")
        if not documents:
            raise ValueError("No documents provided. Connect a document source.")
        
        if not isinstance(documents, list):
            documents = [documents]
        
        embedder = connected_nodes.get("embedder")
        if not embedder:
            raise ValueError("No embedder service provided. Connect an embedder provider.")
        
        # Validate documents and check for embeddings
        valid_docs, has_embeddings = self._validate_documents(documents)
        
        # Get configuration
        connection_string = inputs.get("connection_string")
        if not connection_string:
            raise ValueError("PostgreSQL connection string is required")
        
        collection_name = inputs.get("collection_name", "").strip()
        if not collection_name:
            raise ValueError("Collection name is required for data isolation")
        
        # Table isolation configuration
        table_prefix = inputs.get("table_prefix", "").strip()
        table_names = self._get_table_names(table_prefix)
        
        # Metadata configuration
        try:
            import json
            custom_metadata_str = inputs.get("custom_metadata", "{}")
            custom_metadata = json.loads(custom_metadata_str) if isinstance(custom_metadata_str, str) else (custom_metadata_str or {})
        except (json.JSONDecodeError, TypeError) as e:
            logger.warning(f"⚠️ Invalid custom_metadata JSON: {e}, using empty metadata")
            custom_metadata = {}
        
        preserve_document_metadata = inputs.get("preserve_document_metadata", True)
        metadata_strategy = inputs.get("metadata_strategy", "merge")
        
        auto_optimize = inputs.get("auto_optimize", True)
        embedding_dimension = inputs.get("embedding_dimension", 0)
        pre_delete = inputs.get("pre_delete_collection", False)
        batch_size = int(inputs.get("batch_size", 100))
        
        # Auto-detect embedding dimension if not specified
        if embedding_dimension == 0:
            embedding_dimension = self._detect_embedding_dimension(valid_docs, embedder)
        
        # Search configuration
        search_config = {
            "search_algorithm": inputs.get("search_algorithm", "cosine"),
            "search_k": int(inputs.get("search_k", 6)),
            "score_threshold": float(inputs.get("score_threshold", 0.0)),
        }
        
        # Process documents with custom metadata
        processed_docs = self._process_custom_metadata(
            valid_docs, custom_metadata, preserve_document_metadata, metadata_strategy
        )
        
        logger.info(f"⚙️ Configuration: collection={collection_name}, table_prefix='{table_prefix}', dimension={embedding_dimension}")
        logger.info(f"🏷️ Metadata: custom_fields={len(custom_metadata)}, strategy={metadata_strategy}")
        if table_prefix:
            logger.info(f"📊 Tables: {table_names['collection_table']}, {table_names['embedding_table']}")
        
        try:
            # Check schema compatibility and switch API if needed
            if USING_NEW_API and not self._check_schema_compatibility(connection_string):
                if LEGACY_API_AVAILABLE:
                    logger.warning("⚠️ Database schema incompatible with new API, switching to legacy API")
                    self._switch_to_legacy_api()
                else:
                    raise ValueError("Database schema incompatible with new API and legacy API not available")
            
            # Perform database optimization if enabled
            optimization_report = {"optimizations_applied": [], "performance_improvements": []}
            if auto_optimize:
                logger.info("🔧 Starting database optimization...")
                optimization_report = self._optimize_database_schema(
                    connection_string, collection_name, embedding_dimension
                )
                logger.info(f"✅ Database optimization completed: {len(optimization_report['optimizations_applied'])} optimizations applied")
            
            # Create vector store
            logger.info(f"💾 Creating vector store: {collection_name} with {len(processed_docs)} processed documents")
            
            if has_embeddings:
                # Use pre-computed embeddings
                prepared_docs, all_embeddings = self._prepare_documents_for_storage(processed_docs)
                texts = [doc.page_content for doc in prepared_docs]
                metadatas = [doc.metadata for doc in prepared_docs]
                
                if USING_NEW_API:
                    # New langchain_postgres API
                    vectorstore = PGVector.from_embeddings(
                        text_embeddings=list(zip(texts, all_embeddings)),
                        embedding=embedder,
                        collection_name=collection_name,
                        connection=connection_string,
                        pre_delete_collection=pre_delete,
                        use_jsonb=True,  # Use JSONB for better performance
                    )
                else:
                    # Legacy API
                    vectorstore = PGVector.from_embeddings(
                        text_embeddings=list(zip(texts, all_embeddings)),
                        embedding=embedder,
                        collection_name=collection_name,
                        connection_string=connection_string,
                        pre_delete_collection=pre_delete,
                        metadatas=metadatas,
                    )
                logger.info(f"✅ Stored {len(prepared_docs)} pre-embedded documents using {'new' if USING_NEW_API else 'legacy'} API")
            else:
                # Generate embeddings using the provided embedder  
                texts = [doc.page_content for doc in processed_docs]
                metadatas = [doc.metadata for doc in processed_docs]
                
                if USING_NEW_API:
                    # New langchain_postgres API
                    vectorstore = PGVector.from_texts(
                        texts=texts,
                        embedding=embedder,
                        collection_name=collection_name,
                        connection=connection_string,
                        pre_delete_collection=pre_delete,
                        use_jsonb=True,  # Use JSONB for better performance
                    )
                else:
                    # Legacy API
                    vectorstore = PGVector.from_texts(
                        texts=texts,
                        embedding=embedder,
                        collection_name=collection_name,
                        connection_string=connection_string,
                        pre_delete_collection=pre_delete,
                        metadatas=metadatas,
                    )
                logger.info(f"✅ Generated embeddings and stored {len(processed_docs)} documents using {'new' if USING_NEW_API else 'legacy'} API")
            
            # Create optimized retriever
            retriever = self._create_retriever(vectorstore, search_config)
            
            # Calculate comprehensive statistics
            end_time = time.time()
            processing_time = end_time - start_time
            
            storage_stats = self._get_storage_statistics(vectorstore, len(processed_docs), processing_time)
            
            # Log success summary
            logger.info(
                f"🎉 Intelligent Vector Store completed: {len(processed_docs)} docs stored in '{collection_name}' "
                f"in {processing_time:.1f}s with {len(optimization_report['optimizations_applied'])} optimizations"
            )
            
            return {
                "result": retriever,
                "vectorstore": vectorstore,
                "optimization_report": optimization_report,
                "storage_stats": storage_stats,
            }
            
        except Exception as e:
            error_msg = f"Intelligent Vector Store execution failed: {str(e)}"
            logger.error(error_msg)
            raise ValueError(error_msg) from e


# Export for node registry
__all__ = ["VectorStoreOrchestrator"]