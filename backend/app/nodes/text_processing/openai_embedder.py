"""
OpenAI Embedder Node - Advanced Document Embedding with GPT Models
──────────────────────────────────────────────────────────────────
• Input: List[Document] (from ChunkSplitter)  
• Process: Creates embeddings using OpenAI GPT embedding models
• Output: Enhanced documents + raw vectors + comprehensive analytics
• Features: Batch processing, cost estimation, rate limiting, error handling
• Integration: Ready for PGVector store and downstream processing
"""

from __future__ import annotations

import os
import time
import asyncio
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import statistics

from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings

from ..base import ProcessorNode, NodeInput, NodeOutput, NodeType
from app.models.node import NodeCategory

logger = logging.getLogger(__name__)

# OpenAI Embedding Models with specifications
OPENAI_EMBEDDING_MODELS = {
    "text-embedding-3-small": {
        "name": "Text Embedding 3 Small",
        "dimensions": 1536,
        "max_tokens": 8192,
        "cost_per_1k_tokens": 0.00002,
        "description": "Latest small model, good performance/cost ratio",
        "recommended": True,
    },
    "text-embedding-3-large": {
        "name": "Text Embedding 3 Large", 
        "dimensions": 3072,
        "max_tokens": 8192,
        "cost_per_1k_tokens": 0.00013,
        "description": "Latest large model, highest quality embeddings",
        "recommended": False,
    },
    "text-embedding-ada-002": {
        "name": "Text Embedding Ada 002",
        "dimensions": 1536,
        "max_tokens": 8192,
        "cost_per_1k_tokens": 0.0001,
        "description": "Legacy model, still reliable",
        "recommended": False,
    },
}

class OpenAIEmbedderNode(ProcessorNode):
    """
    Advanced OpenAI embedding processor with comprehensive analytics and optimization.
    Transforms document chunks into high-quality vector embeddings for semantic search.
    """

    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "OpenAIEmbedder",
            "display_name": "OpenAI Document Embedder",
            "description": (
                "Creates high-quality embeddings for document chunks using OpenAI's "
                "latest embedding models. Includes batch processing, cost estimation, "
                "and comprehensive analytics."
            ),
            "category": NodeCategory.EMBEDDING,
            "node_type": NodeType.PROCESSOR,
            "icon": "sparkles",
            "color": "#38bdf8",
            
            # Advanced input configuration
            "inputs": [
                NodeInput(
                    name="chunks",
                    type="documents",
                    is_connection=True,
                    description="Document chunks to embed (from ChunkSplitter)",
                    required=True,
                ),
                NodeInput(
                    name="embed_model",
                    type="select",
                    description="OpenAI embedding model to use",
                    choices=[
                        {
                            "value": model_id,
                            "label": f"{info['name']} ({'⭐ Recommended' if info['recommended'] else 'Legacy'})",
                            "description": f"{info['description']} • {info['dimensions']}D • ${info['cost_per_1k_tokens']:.5f}/1K tokens"
                        }
                        for model_id, info in OPENAI_EMBEDDING_MODELS.items()
                    ],
                    default="text-embedding-3-small",
                    required=True,
                ),
                NodeInput(
                    name="openai_api_key",
                    type="password",
                    description="OpenAI API Key (leave empty to use environment variable)",
                    required=False,
                    is_secret=True,
                ),
                NodeInput(
                    name="batch_size",
                    type="slider",
                    description="Number of chunks to process in each batch",
                    default=100,
                    min_value=1,
                    max_value=500,
                    step=10,
                    required=False,
                ),
                NodeInput(
                    name="max_retries",
                    type="number",
                    description="Maximum number of retries for failed requests",
                    default=3,
                    min_value=0,
                    max_value=5,
                    required=False,
                ),
                NodeInput(
                    name="request_timeout",
                    type="number", 
                    description="Request timeout in seconds",
                    default=60,
                    min_value=10,
                    max_value=300,
                    required=False,
                ),
                NodeInput(
                    name="include_metadata_in_embedding",
                    type="boolean",
                    description="Include chunk metadata in the embedding text",
                    default=False,
                    required=False,
                ),
                NodeInput(
                    name="normalize_vectors",
                    type="boolean",
                    description="Normalize embedding vectors to unit length",
                    default=True,
                    required=False,
                ),
                NodeInput(
                    name="enable_cost_estimation",
                    type="boolean",
                    description="Calculate and display embedding cost estimates",
                    default=True,
                    required=False,
                ),
            ],
            
            # Multiple outputs for different use cases
            "outputs": [
                NodeOutput(
                    name="embedded_docs",
                    type="documents",
                    description="Documents enriched with embedding vectors in metadata",
                ),
                NodeOutput(
                    name="vectors",
                    type="list",
                    description="Raw embedding vectors (ready for vector store)",
                ),
                NodeOutput(
                    name="embedding_stats",
                    type="dict",
                    description="Comprehensive embedding statistics and performance metrics",
                ),
                NodeOutput(
                    name="cost_analysis",
                    type="dict",
                    description="Detailed cost breakdown and usage analytics",
                ),
                NodeOutput(
                    name="quality_metrics",
                    type="dict", 
                    description="Vector quality analysis and similarity metrics",
                ),
            ],
        }

    def _estimate_token_count(self, text: str) -> int:
        """Estimate token count for cost calculation (rough approximation)."""
        # GPT tokenizer approximation: ~0.75 tokens per word, ~4 chars per token
        return max(1, len(text) // 4)

    def _calculate_costs(self, documents: List[Document], model_id: str) -> Dict[str, Any]:
        """Calculate comprehensive cost analysis."""
        model_info = OPENAI_EMBEDDING_MODELS[model_id]
        
        total_chars = sum(len(doc.page_content) for doc in documents)
        estimated_tokens = sum(self._estimate_token_count(doc.page_content) for doc in documents)
        
        cost_per_token = model_info["cost_per_1k_tokens"] / 1000
        estimated_cost = estimated_tokens * cost_per_token
        
        return {
            "model": model_id,
            "model_display_name": model_info["name"],
            "total_documents": len(documents),
            "total_characters": total_chars,
            "estimated_tokens": estimated_tokens,
            "cost_per_1k_tokens": model_info["cost_per_1k_tokens"],
            "estimated_total_cost": round(estimated_cost, 6),
            "cost_per_document": round(estimated_cost / len(documents), 6) if documents else 0,
            "avg_chars_per_doc": int(total_chars / len(documents)) if documents else 0,
            "avg_tokens_per_doc": int(estimated_tokens / len(documents)) if documents else 0,
        }

    def _normalize_vector(self, vector: List[float]) -> List[float]:
        """Normalize vector to unit length."""
        import math
        magnitude = math.sqrt(sum(x * x for x in vector))
        if magnitude == 0:
            return vector
        return [x / magnitude for x in vector]

    def _calculate_vector_quality_metrics(self, vectors: List[List[float]]) -> Dict[str, Any]:
        """Calculate quality metrics for the embedding vectors."""
        if not vectors:
            return {"error": "No vectors to analyze"}
        
        # Vector dimensions and basic stats
        dimensions = len(vectors[0]) if vectors else 0
        
        # Calculate vector magnitudes
        magnitudes = []
        for vector in vectors:
            magnitude = sum(x * x for x in vector) ** 0.5
            magnitudes.append(magnitude)
        
        # Calculate average pairwise cosine similarity (sample for performance)
        sample_size = min(50, len(vectors))
        sample_vectors = vectors[:sample_size]
        similarities = []
        
        for i in range(len(sample_vectors)):
            for j in range(i + 1, len(sample_vectors)):
                vec1, vec2 = sample_vectors[i], sample_vectors[j]
                # Cosine similarity
                dot_product = sum(a * b for a, b in zip(vec1, vec2))
                magnitude1 = sum(x * x for x in vec1) ** 0.5
                magnitude2 = sum(x * x for x in vec2) ** 0.5
                
                if magnitude1 > 0 and magnitude2 > 0:
                    similarity = dot_product / (magnitude1 * magnitude2)
                    similarities.append(similarity)
        
        # Calculate metrics
        quality_metrics = {
            "vector_dimensions": dimensions,
            "total_vectors": len(vectors),
            "magnitude_stats": {
                "mean": round(statistics.mean(magnitudes), 4),
                "median": round(statistics.median(magnitudes), 4),
                "std_dev": round(statistics.stdev(magnitudes), 4) if len(magnitudes) > 1 else 0,
                "min": round(min(magnitudes), 4),
                "max": round(max(magnitudes), 4),
            },
            "similarity_analysis": {
                "sample_size": len(similarities),
                "avg_similarity": round(statistics.mean(similarities), 4) if similarities else 0,
                "similarity_std": round(statistics.stdev(similarities), 4) if len(similarities) > 1 else 0,
                "diversity_score": round(1 - statistics.mean(similarities), 4) if similarities else 1,
            },
            "quality_assessment": self._assess_vector_quality(magnitudes, similarities),
        }
        
        return quality_metrics

    def _assess_vector_quality(self, magnitudes: List[float], similarities: List[float]) -> Dict[str, Any]:
        """Assess overall quality of embedding vectors."""
        # Magnitude consistency (should be relatively consistent)
        magnitude_consistency = 1 - (statistics.stdev(magnitudes) / statistics.mean(magnitudes)) if magnitudes else 0
        magnitude_consistency = max(0, min(1, magnitude_consistency))
        
        # Diversity (lower average similarity indicates more diverse embeddings)
        diversity = 1 - statistics.mean(similarities) if similarities else 1
        diversity = max(0, min(1, diversity))
        
        # Overall quality score
        overall_score = (magnitude_consistency * 0.3 + diversity * 0.7) * 100
        
        # Quality grade
        if overall_score >= 90:
            grade = "A"
        elif overall_score >= 80:
            grade = "B"
        elif overall_score >= 70:
            grade = "C"
        elif overall_score >= 60:
            grade = "D"
        else:
            grade = "F"
        
        return {
            "overall_score": round(overall_score, 1),
            "grade": grade,
            "magnitude_consistency": round(magnitude_consistency * 100, 1),
            "diversity_score": round(diversity * 100, 1),
            "assessment": self._get_quality_assessment_text(grade, overall_score),
        }

    def _get_quality_assessment_text(self, grade: str, score: float) -> str:
        """Get human-readable quality assessment."""
        if grade == "A":
            return "Excellent embedding quality with high diversity and consistency"
        elif grade == "B":
            return "Good embedding quality suitable for most applications"
        elif grade == "C":
            return "Average embedding quality, consider reviewing chunk content"
        elif grade == "D":
            return "Below average quality, may affect search performance"
        else:
            return "Poor embedding quality, check input documents and chunking strategy"

    def _process_batch(self, embedder: OpenAIEmbeddings, documents: List[Document], 
                      batch_start: int, include_metadata: bool) -> Tuple[List[List[float]], List[str]]:
        """Process a batch of documents and return vectors and any errors."""
        texts = []
        for doc in documents:
            text = doc.page_content
            if include_metadata and doc.metadata:
                # Add key metadata to embedding text
                metadata_parts = []
                for key, value in doc.metadata.items():
                    if key not in ["embedding", "chunk_uuid"] and value:
                        metadata_parts.append(f"{key}: {value}")
                if metadata_parts:
                    text = f"{text}\n\nMetadata: {'; '.join(metadata_parts)}"
            texts.append(text)
        
        try:
            vectors = embedder.embed_documents(texts)
            return vectors, []
        except Exception as e:
            error_msg = f"Batch {batch_start}-{batch_start + len(documents)}: {str(e)}"
            logger.error(f"[OpenAIEmbedder] {error_msg}")
            return [], [error_msg]

    def execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute embedding process with comprehensive analytics and error handling.
        
        Args:
            inputs: User configuration from UI
            connected_nodes: Connected input nodes (should contain chunks)
            
        Returns:
            Dict with embedded_docs, vectors, stats, cost_analysis, and quality_metrics
        """
        start_time = time.time()
        logger.info("🔄 Starting OpenAI Embedder execution")
        
        # Extract documents from connected nodes
        documents = connected_nodes.get("chunks")
        if not documents:
            raise ValueError("No document chunks provided. Connect a ChunkSplitter or document source.")
        
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
            raise ValueError("No valid document chunks found in input")
        
        logger.info(f"📚 Processing {len(valid_docs)} document chunks")
        
        # Get configuration
        model_id = inputs.get("embed_model", "text-embedding-3-small")
        api_key = inputs.get("openai_api_key") or os.getenv("OPENAI_API_KEY")
        batch_size = int(inputs.get("batch_size", 100))
        max_retries = int(inputs.get("max_retries", 3))
        request_timeout = int(inputs.get("request_timeout", 60))
        include_metadata = inputs.get("include_metadata_in_embedding", False)
        normalize_vectors = inputs.get("normalize_vectors", True)
        enable_cost_estimation = inputs.get("enable_cost_estimation", True)
        
        if not api_key:
            raise ValueError(
                "OpenAI API key is required. Please provide it in the node configuration "
                "or set OPENAI_API_KEY environment variable."
            )
        
        if model_id not in OPENAI_EMBEDDING_MODELS:
            raise ValueError(f"Unsupported embedding model: {model_id}")
        
        model_info = OPENAI_EMBEDDING_MODELS[model_id]
        logger.info(f"⚙️ Configuration: {model_info['name']} | batch_size={batch_size} | normalize={normalize_vectors}")
        
        try:
            # Initialize OpenAI Embeddings
            embedder = OpenAIEmbeddings(
                model=model_id,
                openai_api_key=api_key,
                request_timeout=request_timeout,
                max_retries=max_retries,
                show_progress_bar=True,
            )
            
            # Calculate costs if enabled
            cost_analysis = {}
            if enable_cost_estimation:
                cost_analysis = self._calculate_costs(valid_docs, model_id)
                logger.info(f"💰 Estimated cost: ${cost_analysis['estimated_total_cost']:.4f}")
            
            # Process documents in batches
            all_vectors = []
            processing_errors = []
            processed_count = 0
            
            for i in range(0, len(valid_docs), batch_size):
                batch_docs = valid_docs[i:i + batch_size]
                batch_num = (i // batch_size) + 1
                total_batches = (len(valid_docs) + batch_size - 1) // batch_size
                
                logger.info(f"🔄 Processing batch {batch_num}/{total_batches} ({len(batch_docs)} chunks)")
                
                batch_vectors, batch_errors = self._process_batch(
                    embedder, batch_docs, i, include_metadata
                )
                
                if batch_vectors:
                    all_vectors.extend(batch_vectors)
                    processed_count += len(batch_docs)
                
                if batch_errors:
                    processing_errors.extend(batch_errors)
                
                # Small delay between batches to avoid rate limiting
                if i + batch_size < len(valid_docs):
                    time.sleep(0.1)
            
            if not all_vectors:
                raise ValueError(f"Failed to generate embeddings. Errors: {'; '.join(processing_errors)}")
            
            # Normalize vectors if requested
            if normalize_vectors:
                logger.info("🔧 Normalizing embedding vectors")
                all_vectors = [self._normalize_vector(vec) for vec in all_vectors]
            
            # Enrich documents with embeddings
            embedded_docs = []
            for doc, vector in zip(valid_docs[:len(all_vectors)], all_vectors):
                # Create a copy to avoid modifying original
                enhanced_doc = Document(
                    page_content=doc.page_content,
                    metadata={
                        **doc.metadata,
                        "embedding": vector,
                        "embedding_model": model_id,
                        "embedding_dimensions": len(vector),
                        "embedding_timestamp": datetime.now().isoformat(),
                        "embedding_normalized": normalize_vectors,
                    }
                )
                embedded_docs.append(enhanced_doc)
            
            # Calculate comprehensive statistics
            end_time = time.time()
            processing_time = end_time - start_time
            
            embedding_stats = {
                "total_documents": len(valid_docs),
                "successfully_embedded": len(all_vectors),
                "failed_embeddings": len(valid_docs) - len(all_vectors),
                "processing_time_seconds": round(processing_time, 2),
                "embeddings_per_second": round(len(all_vectors) / processing_time, 2),
                "model_used": model_id,
                "model_display_name": model_info["name"],
                "vector_dimensions": len(all_vectors[0]) if all_vectors else 0,
                "batch_size": batch_size,
                "batches_processed": (len(all_vectors) + batch_size - 1) // batch_size,
                "normalization_applied": normalize_vectors,
                "metadata_included": include_metadata,
                "errors": processing_errors,
                "timestamp": datetime.now().isoformat(),
            }
            
            # Calculate vector quality metrics
            quality_metrics = self._calculate_vector_quality_metrics(all_vectors)
            
            # Update cost analysis with actual results
            if enable_cost_estimation:
                cost_analysis.update({
                    "actual_documents_processed": len(all_vectors),
                    "processing_efficiency": round(len(all_vectors) / len(valid_docs) * 100, 1),
                })
            
            # Log summary
            logger.info(
                f"✅ OpenAI Embedder completed: {len(all_vectors)}/{len(valid_docs)} chunks embedded "
                f"in {processing_time:.1f}s using {model_info['name']} "
                f"(Quality: {quality_metrics['quality_assessment']['grade']})"
            )
            
            return {
                "embedded_docs": embedded_docs,
                "vectors": all_vectors,
                "embedding_stats": embedding_stats,
                "cost_analysis": cost_analysis,
                "quality_metrics": quality_metrics,
            }
            
        except Exception as e:
            error_msg = f"OpenAI Embedder execution failed: {str(e)}"
            logger.error(error_msg)
            raise ValueError(error_msg) from e


# Export for node registry
__all__ = ["OpenAIEmbedderNode"]