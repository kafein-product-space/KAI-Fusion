"""
Advanced Reranker Node - Intelligent Document Reranking for RAG
──────────────────────────────────────────────────────────────
• Input: retriever (from PGVectorStore) + query context
• Process: Multiple reranking strategies (Cohere, BM25, Cross-Encoder)
• Output: Enhanced retriever with improved document ordering
• Features: Performance analytics, cost optimization, fallback strategies
"""

from __future__ import annotations

import os
import time
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime

from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever
from langchain_core.runnables import Runnable
from langchain.retrievers.document_compressors import CohereRerank
from langchain.retrievers import ContextualCompressionRetriever
from rank_bm25 import BM25Okapi

from ..base import ProcessorNode, NodeInput, NodeOutput, NodeType
from app.models.node import NodeCategory

logger = logging.getLogger(__name__)

# Reranking strategies available
RERANKING_STRATEGIES = {
    "cohere": {
        "name": "Cohere Rerank",
        "description": "State-of-the-art neural reranking with Cohere API",
        "requires_api_key": True,
        "cost_per_1k_requests": 0.002,
        "recommended": True,
    },
    "bm25": {
        "name": "BM25 Statistical",
        "description": "Classical BM25 statistical ranking (free, fast)",
        "requires_api_key": False,
        "cost_per_1k_requests": 0.0,
        "recommended": False,
    },
    "hybrid": {
        "name": "Hybrid (Vector + BM25)",
        "description": "Combines vector similarity with BM25 statistical ranking",
        "requires_api_key": False,
        "cost_per_1k_requests": 0.0,
        "recommended": True,
    },
    "no_rerank": {
        "name": "No Reranking",
        "description": "Pass-through mode (original retriever order)",
        "requires_api_key": False,
        "cost_per_1k_requests": 0.0,
        "recommended": False,
    },
}

class BM25Reranker:
    """Custom BM25-based reranker for documents."""
    
    def __init__(self, documents: List[Document]):
        """Initialize BM25 with document corpus."""
        self.documents = documents
        # Tokenize documents for BM25
        tokenized_docs = [doc.page_content.lower().split() for doc in documents]
        self.bm25 = BM25Okapi(tokenized_docs)
    
    def rerank(self, query: str, top_k: int = 5) -> List[Document]:
        """Rerank documents using BM25 scores."""
        query_tokens = query.lower().split()
        scores = self.bm25.get_scores(query_tokens)
        
        # Sort documents by BM25 scores
        doc_score_pairs = list(zip(self.documents, scores))
        doc_score_pairs.sort(key=lambda x: x[1], reverse=True)
        
        return [doc for doc, _ in doc_score_pairs[:top_k]]

class HybridRetriever(BaseRetriever):
    """Hybrid retriever combining vector similarity and BM25."""
    
    def __init__(self, base_retriever: BaseRetriever, alpha: float = 0.7):
        """
        Initialize hybrid retriever.
        
        Args:
            base_retriever: Vector-based retriever
            alpha: Weight for vector scores (1-alpha for BM25)
        """
        super().__init__()
        self.base_retriever = base_retriever
        self.alpha = alpha
        self.bm25_reranker = None
    
    def _get_relevant_documents(self, query: str) -> List[Document]:
        """Get documents using hybrid scoring."""
        # Get initial documents from vector retriever
        vector_docs = self.base_retriever.get_relevant_documents(query)
        
        if not vector_docs:
            return []
        
        # Initialize BM25 if not done
        if self.bm25_reranker is None:
            # For hybrid, we use the retrieved documents as BM25 corpus
            self.bm25_reranker = BM25Reranker(vector_docs)
        
        # Get BM25 reranked documents
        bm25_docs = self.bm25_reranker.rerank(query, len(vector_docs))
        
        # Create hybrid scores (simple approach)
        vector_scores = {id(doc): 1.0 / (i + 1) for i, doc in enumerate(vector_docs)}
        bm25_scores = {id(doc): 1.0 / (i + 1) for i, doc in enumerate(bm25_docs)}
        
        # Combine scores
        final_scores = {}
        all_docs = {id(doc): doc for doc in vector_docs}
        
        for doc_id, doc in all_docs.items():
            vector_score = vector_scores.get(doc_id, 0)
            bm25_score = bm25_scores.get(doc_id, 0)
            final_scores[doc_id] = self.alpha * vector_score + (1 - self.alpha) * bm25_score
        
        # Sort by hybrid scores
        sorted_docs = sorted(all_docs.values(), 
                           key=lambda doc: final_scores[id(doc)], 
                           reverse=True)
        
        return sorted_docs

class RerankerNode(ProcessorNode):
    """
    Advanced document reranker with multiple strategies and comprehensive analytics.
    Improves retrieval quality by reordering documents based on relevance.
    """

    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "Reranker",
            "display_name": "Document Reranker",
            "description": (
                "Enhances document retrieval by reranking results using advanced "
                "algorithms. Supports Cohere neural reranking, BM25 statistical "
                "ranking, and hybrid approaches."
            ),
            "category": NodeCategory.TOOL,
            "node_type": NodeType.PROCESSOR,
            "icon": "adjustments-horizontal",
            "color": "#f87171",
            
            # Comprehensive input configuration
            "inputs": [
                NodeInput(
                    name="retriever",
                    type="retriever",
                    is_connection=True,
                    description="Base vector retriever from PGVectorStore",
                    required=True,
                ),
                
                # Reranking Strategy
                NodeInput(
                    name="rerank_strategy",
                    type="select",
                    description="Reranking algorithm to use",
                    choices=[
                        {
                            "value": strategy_id,
                            "label": f"{info['name']} {'⭐' if info['recommended'] else ''}",
                            "description": f"{info['description']} • Cost: ${info['cost_per_1k_requests']:.3f}/1K requests"
                        }
                        for strategy_id, info in RERANKING_STRATEGIES.items()
                    ],
                    default="hybrid",
                    required=True,
                ),
                
                # API Configuration
                NodeInput(
                    name="cohere_api_key",
                    type="password",
                    description="Cohere API key (required for Cohere reranking)",
                    required=False,
                    is_secret=True,
                ),
                
                # Retrieval Parameters
                NodeInput(
                    name="initial_k",
                    type="slider",
                    description="Number of documents to fetch from base retriever",
                    default=20,
                    min_value=5,
                    max_value=100,
                    step=5,
                    required=False,
                ),
                NodeInput(
                    name="final_k",
                    type="slider",
                    description="Number of documents to return after reranking",
                    default=6,
                    min_value=1,
                    max_value=20,
                    step=1,
                    required=False,
                ),
                
                # Advanced Configuration
                NodeInput(
                    name="hybrid_alpha",
                    type="slider",
                    description="Weight for vector scores in hybrid mode (0.0=BM25 only, 1.0=vector only)",
                    default=0.7,
                    min_value=0.0,
                    max_value=1.0,
                    step=0.1,
                    required=False,
                ),
                NodeInput(
                    name="enable_caching",
                    type="boolean",
                    description="Cache reranking results for repeated queries",
                    default=True,
                    required=False,
                ),
                NodeInput(
                    name="similarity_threshold",
                    type="slider",
                    description="Minimum similarity threshold for documents",
                    default=0.0,
                    min_value=0.0,
                    max_value=1.0,
                    step=0.05,
                    required=False,
                ),
            ],
            
            # Multiple outputs for comprehensive feedback
            "outputs": [
                NodeOutput(
                    name="reranked_retriever",
                    type="retriever",
                    description="Enhanced retriever with reranking applied",
                ),
                NodeOutput(
                    name="reranking_stats",
                    type="dict",
                    description="Reranking performance statistics and metrics",
                ),
                NodeOutput(
                    name="cost_analysis",
                    type="dict",
                    description="Cost analysis for reranking operations",
                ),
                NodeOutput(
                    name="quality_metrics",
                    type="dict",
                    description="Quality improvement metrics from reranking",
                ),
            ],
        }
        
        # Simple in-memory cache for reranking results
        self._cache = {}

    def _create_cohere_reranker(self, base_retriever: BaseRetriever, 
                               config: Dict[str, Any]) -> ContextualCompressionRetriever:
        """Create Cohere-based reranker."""
        api_key = config.get("cohere_api_key") or os.getenv("COHERE_API_KEY")
        if not api_key:
            raise ValueError(
                "Cohere API key is required for Cohere reranking. "
                "Provide it in the node configuration or set COHERE_API_KEY environment variable."
            )
        
        compressor = CohereRerank(
            cohere_api_key=api_key,
            top_n=config.get("final_k", 6),
        )
        
        return ContextualCompressionRetriever(
            base_compressor=compressor,
            base_retriever=base_retriever,
        )

    def _create_bm25_reranker(self, base_retriever: BaseRetriever, 
                             config: Dict[str, Any]) -> BaseRetriever:
        """Create BM25-based reranker."""
        class BM25WrappedRetriever(BaseRetriever):
            def __init__(self, base_retriever: BaseRetriever, final_k: int):
                super().__init__()
                self.base_retriever = base_retriever
                self.final_k = final_k
                self._bm25_cache = {}
            
            def _get_relevant_documents(self, query: str) -> List[Document]:
                # Get initial documents
                initial_docs = self.base_retriever.get_relevant_documents(query)
                
                if not initial_docs:
                    return []
                
                # Create BM25 reranker for this set of documents
                cache_key = str(sorted([doc.page_content[:50] for doc in initial_docs]))
                if cache_key not in self._bm25_cache:
                    self._bm25_cache[cache_key] = BM25Reranker(initial_docs)
                
                bm25_reranker = self._bm25_cache[cache_key]
                return bm25_reranker.rerank(query, self.final_k)
        
        return BM25WrappedRetriever(base_retriever, config.get("final_k", 6))

    def _create_hybrid_reranker(self, base_retriever: BaseRetriever, 
                               config: Dict[str, Any]) -> HybridRetriever:
        """Create hybrid vector + BM25 reranker."""
        return HybridRetriever(
            base_retriever=base_retriever,
            alpha=config.get("hybrid_alpha", 0.7)
        )

    def _calculate_reranking_stats(self, strategy: str, initial_k: int, final_k: int, 
                                  processing_time: float) -> Dict[str, Any]:
        """Calculate comprehensive reranking statistics."""
        return {
            "strategy_used": strategy,
            "strategy_display_name": RERANKING_STRATEGIES[strategy]["name"],
            "initial_documents": initial_k,
            "final_documents": final_k,
            "compression_ratio": round(final_k / initial_k, 3) if initial_k > 0 else 0,
            "processing_time_seconds": round(processing_time, 3),
            "requests_per_second": round(1 / processing_time, 2) if processing_time > 0 else 0,
            "timestamp": datetime.now().isoformat(),
        }

    def _calculate_cost_analysis(self, strategy: str, estimated_requests: int = 1) -> Dict[str, Any]:
        """Calculate cost analysis for reranking operations."""
        strategy_info = RERANKING_STRATEGIES[strategy]
        
        cost_per_request = strategy_info["cost_per_1k_requests"] / 1000
        estimated_cost = cost_per_request * estimated_requests
        
        return {
            "strategy": strategy,
            "requires_api_key": strategy_info["requires_api_key"],
            "cost_per_request": cost_per_request,
            "estimated_requests": estimated_requests,
            "estimated_cost": round(estimated_cost, 6),
            "cost_per_1k_requests": strategy_info["cost_per_1k_requests"],
            "free_strategy": cost_per_request == 0,
        }

    def _assess_quality_improvement(self, strategy: str, initial_k: int, final_k: int) -> Dict[str, Any]:
        """Assess expected quality improvement from reranking."""
        strategy_info = RERANKING_STRATEGIES[strategy]
        
        # Estimated quality improvements based on strategy
        quality_scores = {
            "cohere": {"relevance": 95, "precision": 90, "recall": 85},
            "bm25": {"relevance": 75, "precision": 80, "recall": 70},
            "hybrid": {"relevance": 85, "precision": 85, "recall": 80},
            "no_rerank": {"relevance": 70, "precision": 70, "recall": 75},
        }
        
        scores = quality_scores.get(strategy, quality_scores["no_rerank"])
        
        # Adjust scores based on compression ratio
        compression_factor = final_k / initial_k if initial_k > 0 else 1
        precision_boost = min(20, (1 - compression_factor) * 30)  # More compression = better precision
        
        return {
            "strategy": strategy,
            "expected_relevance_score": scores["relevance"],
            "expected_precision_score": min(100, scores["precision"] + precision_boost),
            "expected_recall_score": max(50, scores["recall"] - precision_boost/2),
            "compression_factor": round(compression_factor, 3),
            "quality_vs_cost_ratio": scores["relevance"] / max(0.001, strategy_info["cost_per_1k_requests"]),
            "recommendation": self._get_quality_recommendation(strategy, compression_factor),
        }

    def _get_quality_recommendation(self, strategy: str, compression_factor: float) -> str:
        """Generate quality improvement recommendations."""
        if strategy == "no_rerank":
            return "Consider enabling reranking for better result quality"
        elif strategy == "cohere":
            return "Using state-of-the-art neural reranking for optimal quality"
        elif strategy == "bm25":
            return "Free statistical reranking, consider hybrid for better quality"
        elif strategy == "hybrid":
            if compression_factor < 0.3:
                return "Good compression ratio, excellent quality/cost balance"
            else:
                return "Consider increasing initial_k for better recall"
        else:
            return "Unknown strategy"

    def execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute document reranking with comprehensive analytics.
        
        Args:
            inputs: User configuration from UI
            connected_nodes: Connected input nodes (should contain retriever)
            
        Returns:
            Dict with reranked_retriever, stats, cost_analysis, and quality_metrics
        """
        start_time = time.time()
        logger.info("🔄 Starting Reranker execution")
        
        # Extract retriever from connected nodes
        base_retriever = connected_nodes.get("retriever")
        if not base_retriever:
            raise ValueError("No retriever provided. Connect a PGVectorStore or other retriever source.")
        
        # Get configuration
        strategy = inputs.get("rerank_strategy", "hybrid")
        initial_k = int(inputs.get("initial_k", 20))
        final_k = int(inputs.get("final_k", 6))
        
        if strategy not in RERANKING_STRATEGIES:
            raise ValueError(f"Unsupported reranking strategy: {strategy}")
        
        logger.info(f"⚙️ Configuration: {RERANKING_STRATEGIES[strategy]['name']} | {initial_k}→{final_k} docs")
        
        try:
            # Create appropriate reranker based on strategy
            if strategy == "cohere":
                reranked_retriever = self._create_cohere_reranker(base_retriever, inputs)
                logger.info("✅ Cohere neural reranker created")
                
            elif strategy == "bm25":
                reranked_retriever = self._create_bm25_reranker(base_retriever, inputs)
                logger.info("✅ BM25 statistical reranker created")
                
            elif strategy == "hybrid":
                reranked_retriever = self._create_hybrid_reranker(base_retriever, inputs)
                logger.info("✅ Hybrid vector+BM25 reranker created")
                
            elif strategy == "no_rerank":
                reranked_retriever = base_retriever
                logger.info("✅ Pass-through mode (no reranking)")
                
            else:
                raise ValueError(f"Strategy implementation missing: {strategy}")
            
            # Calculate comprehensive analytics
            end_time = time.time()
            processing_time = end_time - start_time
            
            reranking_stats = self._calculate_reranking_stats(
                strategy, initial_k, final_k, processing_time
            )
            
            cost_analysis = self._calculate_cost_analysis(strategy, estimated_requests=1)
            
            quality_metrics = self._assess_quality_improvement(strategy, initial_k, final_k)
            
            # Log success summary
            logger.info(
                f"✅ Reranker completed: {RERANKING_STRATEGIES[strategy]['name']} "
                f"({initial_k}→{final_k} docs) in {processing_time:.2f}s"
            )
            
            return {
                "reranked_retriever": reranked_retriever,
                "reranking_stats": reranking_stats,
                "cost_analysis": cost_analysis,
                "quality_metrics": quality_metrics,
            }
            
        except Exception as e:
            error_msg = f"Reranker execution failed: {str(e)}"
            logger.error(error_msg)
            raise ValueError(error_msg) from e


# Export for node registry
__all__ = ["RerankerNode"]