"""
ChunkSplitter v2 - Advanced LangChain Text Splitters Integration
─────────────────────────────────────────────────────────────────
• Accepts List[Document] ➜ returns List[Document] (chunks) + stats + preview
• Multiple split strategies with dynamic UI configuration
• Real-time stats and preview for UI inspection
• Comprehensive chunk metadata and performance analytics
• Supports all major LangChain text splitters with advanced options
"""

from __future__ import annotations

import logging
import uuid
import statistics
from typing import List, Dict, Any, Optional
from datetime import datetime

from langchain_core.documents import Document
from langchain_text_splitters import (
    RecursiveCharacterTextSplitter,
    TokenTextSplitter, 
    CharacterTextSplitter,
    MarkdownHeaderTextSplitter,
    HTMLHeaderTextSplitter,
    PythonCodeTextSplitter,
    LatexTextSplitter,
)

from ..base import ProcessorNode, NodeInput, NodeOutput, NodeType
from app.models.node import NodeCategory

logger = logging.getLogger(__name__)

# Available splitter strategies and their classes
_SPLITTER_STRATEGIES = {
    "recursive_character": {
        "class": RecursiveCharacterTextSplitter,
        "name": "Recursive Character",
        "description": "Smart text splitting that tries to keep related content together",
        "supports_separators": True,
        "supports_headers": False,
    },
    "tokens": {
        "class": TokenTextSplitter,
        "name": "Token-Based",
        "description": "Splits text based on token count (best for LLM processing)",
        "supports_separators": False,
        "supports_headers": False,
    },
    "character": {
        "class": CharacterTextSplitter,
        "name": "Simple Character",
        "description": "Basic character-count splitting with custom separator",
        "supports_separators": True,
        "supports_headers": False,
    },
    "markdown_headers": {
        "class": MarkdownHeaderTextSplitter,
        "name": "Markdown Headers",
        "description": "Splits markdown content by header levels (# ## ###)",
        "supports_separators": False,
        "supports_headers": True,
    },
    "html_headers": {
        "class": HTMLHeaderTextSplitter,
        "name": "HTML Headers",
        "description": "Splits HTML content by header tags (h1, h2, h3)",
        "supports_separators": False,
        "supports_headers": True,
    },
    "python_code": {
        "class": PythonCodeTextSplitter,
        "name": "Python Code",
        "description": "Smart Python code splitting that preserves function/class structure",
        "supports_separators": False,
        "supports_headers": False,
    },
    "latex": {
        "class": LatexTextSplitter,
        "name": "LaTeX Document",
        "description": "Splits LaTeX documents while preserving document structure",
        "supports_separators": False,
        "supports_headers": False,
    },
}

class ChunkSplitterNode(ProcessorNode):
    """
    Advanced document chunking with comprehensive configuration and real-time analytics.
    Provides multiple splitting strategies with UI-friendly controls and detailed feedback.
    """

    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "ChunkSplitter",
            "display_name": "Document Chunk Splitter",
            "description": (
                "Advanced text splitter with multiple strategies, real-time preview, "
                "and comprehensive analytics. Splits documents into optimized chunks "
                "for embedding and processing."
            ),
            "category": NodeCategory.TEXT_SPLITTER,
            "node_type": NodeType.PROCESSOR,
            "icon": "scissors",
            "color": "#facc15",
            
            # Input configuration with advanced UI controls
            "inputs": [
                NodeInput(
                    name="documents",
                    type="documents",
                    is_connection=True,
                    description="List of documents to split into chunks",
                    required=True,
                ),
                NodeInput(
                    name="split_strategy",
                    type="select",
                    description="Text splitting strategy to use",
                    choices=[
                        {"value": k, "label": v["name"], "description": v["description"]}
                        for k, v in _SPLITTER_STRATEGIES.items()
                    ],
                    default="recursive_character",
                    required=True,
                ),
                NodeInput(
                    name="chunk_size",
                    type="slider",
                    description="Maximum size of each chunk (characters or tokens)",
                    default=1000,
                    min_value=100,
                    max_value=8000,
                    step=100,
                    required=True,
                ),
                NodeInput(
                    name="chunk_overlap",
                    type="slider", 
                    description="Overlap between consecutive chunks (helps maintain context)",
                    default=200,
                    min_value=0,
                    max_value=2000,
                    step=25,
                    required=True,
                ),
                NodeInput(
                    name="separators",
                    type="text",
                    description="Custom separators (comma-separated, for character splitters)",
                    default="\\n\\n,\\n, ,.",
                    required=False,
                ),
                NodeInput(
                    name="header_levels",
                    type="text",
                    description="Header levels to split on (for markdown/html, e.g., 'h1,h2,h3')",
                    default="h1,h2,h3",
                    required=False,
                ),
                NodeInput(
                    name="keep_separator",
                    type="boolean",
                    description="Keep separator in chunks (helps maintain formatting)",
                    default=True,
                    required=False,
                ),
                NodeInput(
                    name="strip_whitespace",
                    type="boolean",
                    description="Strip leading/trailing whitespace from chunks",
                    default=True,
                    required=False,
                ),
                NodeInput(
                    name="length_function",
                    type="select",
                    description="How to measure chunk length",
                    choices=[
                        {"value": "len", "label": "Characters", "description": "Count characters"},
                        {"value": "tokens", "label": "Tokens", "description": "Count tokens (approximate)"},
                    ],
                    default="len",
                    required=False,
                ),
            ],
            
            # Multiple outputs for different use cases
            "outputs": [
                NodeOutput(
                    name="chunks",
                    type="documents",
                    description="Complete list of document chunks ready for embedding",
                ),
                NodeOutput(
                    name="stats",
                    type="dict",
                    description="Comprehensive chunking statistics and analytics",
                ),
                NodeOutput(
                    name="preview",
                    type="list", 
                    description="Preview of first 10 chunks for UI inspection",
                ),
                NodeOutput(
                    name="metadata_report",
                    type="dict",
                    description="Detailed metadata analysis and quality metrics",
                ),
            ],
        }

    def _create_splitter(self, strategy: str, **config) -> Any:
        """Create the appropriate text splitter based on strategy and configuration."""
        if strategy not in _SPLITTER_STRATEGIES:
            raise ValueError(f"Unsupported split strategy: {strategy}")
        
        splitter_info = _SPLITTER_STRATEGIES[strategy]
        SplitterClass = splitter_info["class"]
        
        # Base parameters
        splitter_params = {
            "chunk_size": config.get("chunk_size", 1000),
            "chunk_overlap": config.get("chunk_overlap", 200),
        }
        
        # Add strategy-specific parameters
        if splitter_info["supports_separators"] and config.get("separators"):
            # Parse separators, handling escape sequences
            separators_str = config["separators"]
            separators = [s.strip().replace("\\n", "\n").replace("\\t", "\t") 
                         for s in separators_str.split(",") if s.strip()]
            if separators:
                splitter_params["separators"] = separators
        
        if splitter_info["supports_headers"] and config.get("header_levels"):
            # Parse header levels for markdown/html splitters
            headers = [h.strip() for h in config["header_levels"].split(",") if h.strip()]
            if strategy == "markdown_headers":
                # Markdown headers use # syntax
                splitter_params["headers_to_split_on"] = [(f"#{h}", h) for h in headers if h.startswith("#")]
                if not splitter_params["headers_to_split_on"]:
                    # Default markdown headers
                    splitter_params["headers_to_split_on"] = [("#", "Header 1"), ("##", "Header 2"), ("###", "Header 3")]
            elif strategy == "html_headers":
                # HTML headers use tag syntax
                splitter_params["headers_to_split_on"] = [(h, h.upper()) for h in headers]
        
        # Additional parameters for specific splitters
        if config.get("keep_separator") is not None:
            splitter_params["keep_separator"] = config["keep_separator"]
        
        if config.get("strip_whitespace") is not None:
            splitter_params["strip_whitespace"] = config["strip_whitespace"]
        
        # Length function for certain splitters
        if config.get("length_function") == "tokens" and hasattr(SplitterClass, "length_function"):
            try:
                import tiktoken
                def token_len(text: str) -> int:
                    encoding = tiktoken.get_encoding("cl100k_base")
                    return len(encoding.encode(text))
                splitter_params["length_function"] = token_len
            except ImportError:
                logger.warning("tiktoken not available, falling back to character count")
        
        return SplitterClass(**splitter_params)

    def _calculate_comprehensive_stats(self, chunks: List[Document], original_docs: List[Document], 
                                      config: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate comprehensive statistics about the chunking process."""
        if not chunks:
            return {
                "total_chunks": 0,
                "total_original_docs": len(original_docs),
                "processing_time": 0,
                "error": "No chunks generated"
            }
        
        # Basic chunk statistics
        chunk_lengths = [len(chunk.page_content) for chunk in chunks]
        original_lengths = [len(doc.page_content) for doc in original_docs]
        
        # Calculate compression and efficiency metrics
        total_original_chars = sum(original_lengths)
        total_chunk_chars = sum(chunk_lengths)
        
        stats = {
            # Basic counts
            "total_chunks": len(chunks),
            "total_original_docs": len(original_docs),
            "chunks_per_doc": round(len(chunks) / len(original_docs), 2) if original_docs else 0,
            
            # Length statistics
            "avg_chunk_length": int(statistics.mean(chunk_lengths)),
            "median_chunk_length": int(statistics.median(chunk_lengths)),
            "min_chunk_length": min(chunk_lengths),
            "max_chunk_length": max(chunk_lengths),
            "std_chunk_length": int(statistics.stdev(chunk_lengths)) if len(chunk_lengths) > 1 else 0,
            
            # Original document statistics
            "avg_original_length": int(statistics.mean(original_lengths)) if original_lengths else 0,
            "total_original_chars": total_original_chars,
            "total_chunk_chars": total_chunk_chars,
            
            # Efficiency metrics
            "character_efficiency": round((total_chunk_chars / total_original_chars * 100), 2) if total_original_chars > 0 else 0,
            "avg_overlap_ratio": round((config.get("chunk_overlap", 0) / config.get("chunk_size", 1000) * 100), 2),
            
            # Configuration used
            "strategy": config.get("split_strategy", "unknown"),
            "chunk_size": config.get("chunk_size", 0),
            "chunk_overlap": config.get("chunk_overlap", 0),
            "timestamp": datetime.now().isoformat(),
        }
        
        # Length distribution
        length_ranges = {
            "very_short": len([l for l in chunk_lengths if l < config.get("chunk_size", 1000) * 0.3]),
            "short": len([l for l in chunk_lengths if config.get("chunk_size", 1000) * 0.3 <= l < config.get("chunk_size", 1000) * 0.7]),
            "optimal": len([l for l in chunk_lengths if config.get("chunk_size", 1000) * 0.7 <= l <= config.get("chunk_size", 1000)]),
            "oversized": len([l for l in chunk_lengths if l > config.get("chunk_size", 1000)]),
        }
        stats["length_distribution"] = length_ranges
        
        return stats

    def _generate_preview(self, chunks: List[Document], limit: int = 15) -> List[Dict[str, Any]]:
        """Generate a detailed preview of chunks for UI inspection."""
        preview_chunks = chunks[:limit]
        
        preview = []
        for i, chunk in enumerate(preview_chunks):
            # Create a rich preview with multiple snippet lengths
            content = chunk.page_content
            
            # Different snippet sizes for different UI contexts
            snippets = {
                "micro": content[:50] + ("…" if len(content) > 50 else ""),
                "short": content[:150] + ("…" if len(content) > 150 else ""),
                "medium": content[:300] + ("…" if len(content) > 300 else ""),
                "long": content[:600] + ("…" if len(content) > 600 else ""),
            }
            
            # Extract key metrics
            word_count = len(content.split())
            line_count = len(content.splitlines())
            
            # Analyze content type
            content_type = "text"
            if any(marker in content.lower() for marker in ["def ", "class ", "import ", "from "]):
                content_type = "code"
            elif any(marker in content for marker in ["#", "##", "###"]):
                content_type = "markdown"
            elif any(marker in content for marker in ["<", ">", "</"]):
                content_type = "html"
            
            chunk_preview = {
                "chunk_id": chunk.metadata.get("chunk_id", i + 1),
                "index": i,
                "length": len(content),
                "word_count": word_count,
                "line_count": line_count,
                "content_type": content_type,
                "snippets": snippets,
                "metadata": {
                    k: v for k, v in chunk.metadata.items() 
                    if k not in ["page_content"]  # Exclude large content
                },
                "starts_with": content[:20].strip(),
                "ends_with": content[-20:].strip() if len(content) > 20 else content.strip(),
            }
            
            preview.append(chunk_preview)
        
        return preview

    def _generate_metadata_report(self, chunks: List[Document], original_docs: List[Document]) -> Dict[str, Any]:
        """Generate a detailed metadata analysis report."""
        # Analyze metadata consistency and quality
        all_metadata_keys = set()
        for chunk in chunks:
            all_metadata_keys.update(chunk.metadata.keys())
        
        metadata_analysis = {}
        for key in all_metadata_keys:
            values = [chunk.metadata.get(key) for chunk in chunks if key in chunk.metadata]
            metadata_analysis[key] = {
                "present_in_chunks": len(values),
                "coverage_percent": round(len(values) / len(chunks) * 100, 2),
                "unique_values": len(set(str(v) for v in values if v is not None)),
                "sample_values": list(set(str(v) for v in values[:5] if v is not None)),
            }
        
        # Source document analysis
        source_analysis = {}
        if original_docs:
            sources = [doc.metadata.get("source", "unknown") for doc in original_docs] 
            unique_sources = list(set(sources))
            
            for source in unique_sources:
                chunks_from_source = [c for c in chunks if c.metadata.get("source") == source]
                source_analysis[source] = {
                    "chunks_generated": len(chunks_from_source),
                    "avg_chunk_size": int(statistics.mean([len(c.page_content) for c in chunks_from_source])) if chunks_from_source else 0,
                }
        
        return {
            "metadata_keys": list(all_metadata_keys),
            "metadata_analysis": metadata_analysis,
            "source_analysis": source_analysis,
            "quality_score": self._calculate_quality_score(chunks),
            "recommendations": self._generate_recommendations(chunks, metadata_analysis),
        }

    def _calculate_quality_score(self, chunks: List[Document]) -> Dict[str, Any]:
        """Calculate a quality score for the chunking process."""
        if not chunks:
            return {"overall": 0, "factors": {}}
        
        factors = {}
        
        # Length consistency (prefer chunks close to target size)
        lengths = [len(chunk.page_content) for chunk in chunks]
        length_variance = statistics.variance(lengths) if len(lengths) > 1 else 0
        factors["length_consistency"] = max(0, 100 - (length_variance / 1000))  # Normalize to 0-100
        
        # Content diversity (prefer varied content)
        unique_starts = len(set(chunk.page_content[:50] for chunk in chunks))
        factors["content_diversity"] = min(100, (unique_starts / len(chunks)) * 100)
        
        # Metadata completeness
        metadata_scores = []
        for chunk in chunks:
            score = len([v for v in chunk.metadata.values() if v is not None]) * 10
            metadata_scores.append(min(100, score))
        factors["metadata_completeness"] = statistics.mean(metadata_scores) if metadata_scores else 0
        
        # Overall score (weighted average)
        overall = (
            factors["length_consistency"] * 0.4 +
            factors["content_diversity"] * 0.3 + 
            factors["metadata_completeness"] * 0.3
        )
        
        return {
            "overall": round(overall, 1),
            "factors": {k: round(v, 1) for k, v in factors.items()},
            "grade": "A" if overall >= 90 else "B" if overall >= 80 else "C" if overall >= 70 else "D" if overall >= 60 else "F"
        }

    def _generate_recommendations(self, chunks: List[Document], metadata_analysis: Dict) -> List[str]:
        """Generate actionable recommendations for improving chunking."""
        recommendations = []
        
        if not chunks:
            return ["No chunks generated. Check input documents and configuration."]
        
        # Length-based recommendations
        lengths = [len(chunk.page_content) for chunk in chunks]
        avg_length = statistics.mean(lengths)
        
        if avg_length < 200:
            recommendations.append("Consider increasing chunk_size for better context preservation")
        elif avg_length > 2000:
            recommendations.append("Consider decreasing chunk_size for more focused chunks")
        
        # Overlap recommendations
        if len(chunks) > 1:
            # Estimate overlap effectiveness
            overlap_score = len([c for c in chunks if len(c.page_content) > 500]) / len(chunks)
            if overlap_score < 0.5:
                recommendations.append("Consider increasing chunk_overlap to maintain better context continuity")
        
        # Metadata recommendations
        required_keys = ["source", "chunk_id", "total_chunks"]
        missing_keys = [key for key in required_keys if key not in metadata_analysis or metadata_analysis[key]["coverage_percent"] < 90]
        if missing_keys:
            recommendations.append(f"Ensure all chunks have complete metadata: {', '.join(missing_keys)}")
        
        # Strategy recommendations
        code_chunks = len([c for c in chunks if any(marker in c.page_content for marker in ["def ", "class ", "import "])])
        if code_chunks > len(chunks) * 0.3:
            recommendations.append("Consider using 'python_code' splitter for better code structure preservation")
        
        markdown_chunks = len([c for c in chunks if any(marker in c.page_content for marker in ["#", "##", "###"])])
        if markdown_chunks > len(chunks) * 0.3:
            recommendations.append("Consider using 'markdown_headers' splitter for better document structure")
        
        return recommendations

    def execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the chunk splitting with comprehensive analytics and preview generation.
        
        Args:
            inputs: User configuration from UI
            connected_nodes: Connected input nodes (should contain documents)
            
        Returns:
            Dict with chunks, stats, preview, and metadata_report
        """
        logger.info("🔄 Starting ChunkSplitter execution")
        
        # Extract documents from connected nodes
        documents = connected_nodes.get("documents")
        if not documents:
            raise ValueError("No documents provided. Connect a document loader or document source.")
        
        if not isinstance(documents, list):
            documents = [documents]
        
        # Validate documents
        doc_objects = []
        for doc in documents:
            if isinstance(doc, Document):
                doc_objects.append(doc)
            elif isinstance(doc, dict) and "page_content" in doc:
                # Convert dict to Document if needed
                doc_objects.append(Document(
                    page_content=doc["page_content"],
                    metadata=doc.get("metadata", {})
                ))
            else:
                logger.warning(f"Skipping invalid document: {type(doc)}")
        
        if not doc_objects:
            raise ValueError("No valid documents found in input")
        
        logger.info(f"📚 Processing {len(doc_objects)} documents")
        
        # Get configuration
        config = {
            "split_strategy": inputs.get("split_strategy", "recursive_character"),
            "chunk_size": int(inputs.get("chunk_size", 1000)),
            "chunk_overlap": int(inputs.get("chunk_overlap", 200)),
            "separators": inputs.get("separators", ""),
            "header_levels": inputs.get("header_levels", ""),
            "keep_separator": inputs.get("keep_separator", True),
            "strip_whitespace": inputs.get("strip_whitespace", True),
            "length_function": inputs.get("length_function", "len"),
        }
        
        logger.info(f"⚙️ Configuration: {config['split_strategy']} | size={config['chunk_size']} | overlap={config['chunk_overlap']}")
        
        try:
            # Create the appropriate splitter
            splitter = self._create_splitter(config["split_strategy"], **config)
            
            # Split the documents
            chunks = splitter.split_documents(doc_objects)
            
            # Add comprehensive metadata to each chunk
            total_chunks = len(chunks)
            for idx, chunk in enumerate(chunks, 1):
                chunk.metadata.update({
                    "chunk_id": idx,
                    "total_chunks": total_chunks,
                    "splitter_strategy": config["split_strategy"],
                    "chunk_size_config": config["chunk_size"],
                    "chunk_overlap_config": config["chunk_overlap"],
                    "actual_length": len(chunk.page_content),
                    "word_count": len(chunk.page_content.split()),
                    "processing_timestamp": datetime.now().isoformat(),
                    "chunk_uuid": str(uuid.uuid4())[:8],
                })
            
            # Generate comprehensive analytics
            stats = self._calculate_comprehensive_stats(chunks, doc_objects, config)
            preview = self._generate_preview(chunks, limit=15)
            metadata_report = self._generate_metadata_report(chunks, doc_objects)
            
            # Log summary
            logger.info(
                f"✅ ChunkSplitter completed: {config['split_strategy']} strategy produced "
                f"{total_chunks} chunks (avg {stats['avg_chunk_length']} chars, "
                f"quality score: {metadata_report['quality_score']['overall']}/100)"
            )
            
            return {
                "chunks": chunks,
                "stats": stats,
                "preview": preview,
                "metadata_report": metadata_report,
            }
            
        except Exception as e:
            error_msg = f"ChunkSplitter execution failed: {str(e)}"
            logger.error(error_msg)
            raise ValueError(error_msg) from e


# Export for node registry
__all__ = ["ChunkSplitterNode"]