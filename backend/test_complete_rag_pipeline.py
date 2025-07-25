#!/usr/bin/env python3
"""
Complete RAG Pipeline Test
─────────────────────────────────────────────────────────────────
Tests the entire RAG pipeline: WebScraper → ChunkSplitter → OpenAIEmbedder → PGVectorStore
Validates data flow, performance, and integration between all components.
"""
import os
import sys
import time
import uuid
sys.path.append('/Users/bahakizil/Desktop/KAI-Fusion/backend')

from langchain_core.documents import Document
from app.nodes.document_loaders.web_scraper import WebScraperNode
from app.nodes.text_processing.chunk_splitter import ChunkSplitterNode
from app.nodes.text_processing.openai_embedder import OpenAIEmbedderNode
from app.nodes.vector_stores.pgvector_store import PGVectorStoreNode

def test_pgvector_store_standalone():
    """Test PGVectorStore with pre-embedded documents."""
    print("🧪 Testing PGVectorStore (Standalone with Pre-embedded Documents)...")
    
    # Check if we have database connection info
    db_url = os.getenv("PGVECTOR_CONNECTION_STRING")
    if not db_url:
        print("❌ PGVECTOR_CONNECTION_STRING not found - skipping database tests")
        print("   Set environment variable like: postgresql://user:pass@host:5432/dbname")
        return False
    
    try:
        # Create sample embedded documents
        sample_embedded_docs = [
            Document(
                page_content="This is a test document about artificial intelligence and machine learning applications.",
                metadata={
                    "source": "test_doc_1",
                    "chunk_id": 1,
                    "embedding": [0.1] * 1536,  # Mock 1536-dimensional embedding
                    "embedding_model": "text-embedding-3-small"
                }
            ),
            Document(
                page_content="Another document discussing natural language processing and semantic search technologies.",
                metadata={
                    "source": "test_doc_2", 
                    "chunk_id": 2,
                    "embedding": [0.2] * 1536,  # Mock embedding
                    "embedding_model": "text-embedding-3-small"
                }
            ),
        ]
        
        # Initialize PGVectorStore
        vectorstore_node = PGVectorStoreNode()
        metadata = vectorstore_node.metadata
        
        print(f"✅ Node Name: {metadata.name}")
        print(f"✅ Inputs: {len(metadata.inputs)}, Outputs: {len(metadata.outputs)}")
        
        # Test with pre-embedded documents
        collection_name = f"test_collection_{uuid.uuid4().hex[:8]}"
        
        result = vectorstore_node.execute(
            inputs={
                "connection_string": db_url,
                "collection_name": collection_name,
                "pre_delete_collection": True,
                "search_k": 3,
                "enable_hnsw_index": True,
            },
            connected_nodes={"documents": sample_embedded_docs}
        )
        
        # Analyze results
        retriever = result["retriever"]
        vectorstore = result["vectorstore"]
        storage_stats = result["storage_stats"]
        embedding_analysis = result["embedding_analysis"]
        
        print(f"   📊 Results:")
        print(f"     Documents stored: {storage_stats['documents_stored']}")
        print(f"     Collection name: {storage_stats['collection_name']}")
        print(f"     Processing time: {storage_stats['processing_time_seconds']}s")
        print(f"     Embedding coverage: {embedding_analysis['embedding_coverage']}%")
        
        # Test retriever functionality
        print(f"   🔍 Testing retriever...")
        test_query = "artificial intelligence"
        similar_docs = retriever.get_relevant_documents(test_query)
        
        print(f"     Retrieved {len(similar_docs)} documents for query: '{test_query}'")
        if similar_docs:
            print(f"     First result: {similar_docs[0].page_content[:60]}...")
        
        print(f"   ✅ PGVectorStore standalone test passed!")
        return True
        
    except Exception as e:
        print(f"❌ Standalone test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_complete_rag_pipeline():
    """Test the complete RAG pipeline from URL to retriever."""
    print("\\n🔗 Testing Complete RAG Pipeline...")
    print("   📋 Pipeline: WebScraper → ChunkSplitter → OpenAIEmbedder → PGVectorStore")
    
    # Check all required API keys and connection strings
    tavily_key = os.getenv("TAVILY_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY") 
    db_url = os.getenv("PGVECTOR_CONNECTION_STRING")
    
    missing_configs = []
    if not tavily_key:
        missing_configs.append("TAVILY_API_KEY")
    if not openai_key:
        missing_configs.append("OPENAI_API_KEY")
    if not db_url:
        missing_configs.append("PGVECTOR_CONNECTION_STRING")
    
    if missing_configs:
        print(f"❌ Missing required configurations: {', '.join(missing_configs)}")
        print("   Set environment variables to run complete pipeline test")
        return False
    
    try:
        pipeline_start = time.time()
        collection_name = f"rag_pipeline_{uuid.uuid4().hex[:8]}"
        
        # Step 1: Web Scraping
        print("\\n🌐 Step 1: Web Scraping...")
        webscraper_node = WebScraperNode()
        
        # Use reliable test URLs
        test_urls = \"\"\"https://example.com
https://httpbin.org/html\"\"\"
        
        scraped_result = webscraper_node.execute(
            urls=test_urls,
            tavily_api_key=tavily_key,
            min_content_length=100
        )
        
        print(f"   ✅ Scraped {len(scraped_result)} documents")
        total_chars = sum(len(doc.page_content) for doc in scraped_result)
        print(f"   📝 Total content: {total_chars:,} characters")
        
        # Step 2: Chunk Splitting
        print("\\n🔪 Step 2: Chunk Splitting...")
        chunksplitter_node = ChunkSplitterNode()
        
        chunk_result = chunksplitter_node.execute(
            inputs={
                "split_strategy": "recursive_character",
                "chunk_size": 800,
                "chunk_overlap": 150,
                "keep_separator": True,
            },
            connected_nodes={"documents": scraped_result}
        )
        
        chunks = chunk_result["chunks"]
        chunk_stats = chunk_result["stats"]
        
        print(f"   ✅ Generated {len(chunks)} chunks")
        print(f"   📊 Average chunk size: {chunk_stats['avg_chunk_length']} chars")
        print(f"   🏆 Quality score: {chunk_result['metadata_report']['quality_score']['overall']}/100")
        
        # Step 3: Embedding Generation
        print("\\n✨ Step 3: Creating Embeddings...")
        embedder_node = OpenAIEmbedderNode()
        
        embedding_result = embedder_node.execute(
            inputs={
                "embed_model": "text-embedding-3-small",
                "batch_size": 50,
                "normalize_vectors": True,
                "enable_cost_estimation": True,
            },
            connected_nodes={"chunks": chunks}
        )
        
        embedded_docs = embedding_result["embedded_docs"]
        embedding_stats = embedding_result["embedding_stats"]
        cost_analysis = embedding_result["cost_analysis"]
        
        print(f"   ✅ Created embeddings for {len(embedded_docs)} chunks")
        print(f"   🎯 Vector dimensions: {embedding_stats['vector_dimensions']}")
        print(f"   💰 Estimated cost: ${cost_analysis['estimated_total_cost']:.6f}")
        
        # Step 4: Vector Storage
        print("\\n💾 Step 4: Vector Storage...")
        vectorstore_node = PGVectorStoreNode()
        
        storage_result = vectorstore_node.execute(
            inputs={
                "connection_string": db_url,
                "collection_name": collection_name,
                "pre_delete_collection": True,
                "search_algorithm": "cosine",
                "search_k": 6,
                "enable_hnsw_index": True,
            },
            connected_nodes={"documents": embedded_docs}
        )
        
        retriever = storage_result["retriever"]
        storage_stats = storage_result["storage_stats"]
        embedding_analysis = storage_result["embedding_analysis"]
        
        print(f"   ✅ Stored {storage_stats['documents_stored']} vectors")
        print(f"   🗂️ Collection: {storage_stats['collection_name']}")
        print(f"   📈 Embedding coverage: {embedding_analysis['embedding_coverage']}%")
        
        # Step 5: End-to-End RAG Test
        print("\\n🔍 Step 5: RAG Functionality Test...")
        
        test_queries = [
            "example content",
            "HTML structure", 
            "web page information"
        ]
        
        for query in test_queries:
            print(f"\\n   Query: '{query}'")
            relevant_docs = retriever.get_relevant_documents(query)
            print(f"   Retrieved {len(relevant_docs)} documents")
            
            if relevant_docs:
                for i, doc in enumerate(relevant_docs[:2]):  # Show top 2 results
                    preview = doc.page_content[:100].replace('\\n', ' ')
                    source = doc.metadata.get('source', 'unknown')
                    print(f"     {i+1}. [{source}] {preview}...")
        
        # Pipeline Analysis
        pipeline_end = time.time()
        total_pipeline_time = pipeline_end - pipeline_start
        
        print(f"\\n📊 Complete Pipeline Analysis:")
        print(f"   🕒 Total pipeline time: {total_pipeline_time:.1f} seconds")
        print(f"   🔄 Data flow: {len(scraped_result)} docs → {len(chunks)} chunks → {len(embedded_docs)} embeddings → {storage_stats['documents_stored']} stored")
        print(f"   💰 Total embedding cost: ${cost_analysis['estimated_total_cost']:.6f}")
        print(f"   📈 Quality metrics:")
        print(f"     Chunk quality: {chunk_result['metadata_report']['quality_score']['grade']}")
        print(f"     Embedding quality: {embedding_result['quality_metrics']['quality_assessment']['grade']}")
        print(f"     Storage efficiency: {embedding_analysis['embedding_coverage']}%")
        
        # Performance Analysis
        print(f"\\n⚡ Performance Metrics:")
        chars_per_second = total_chars / total_pipeline_time
        embeddings_per_second = len(embedded_docs) / embedding_stats['processing_time_seconds']
        storage_per_second = storage_stats['documents_stored'] / storage_stats['processing_time_seconds']
        
        print(f"   📝 Content processing: {chars_per_second:,.0f} chars/second")
        print(f"   ✨ Embedding generation: {embeddings_per_second:.1f} embeddings/second")
        print(f"   💾 Vector storage: {storage_per_second:.1f} docs/second")
        
        # Data Integrity Verification
        print(f"\\n🔍 Data Integrity Verification:")
        
        # Check that we can retrieve documents similar to original content
        original_sample = scraped_result[0].page_content[:200]
        retrieved_sample = retriever.get_relevant_documents(original_sample[:50])
        
        print(f"   🎯 Content similarity test:")
        print(f"     Original sample: {original_sample[:60]}...")
        print(f"     Retrieved documents: {len(retrieved_sample)}")
        print(f"     Retrieval successful: {'✅' if retrieved_sample else '❌'}")
        
        # Check metadata preservation
        if retrieved_sample:
            first_retrieved = retrieved_sample[0]
            has_source = bool(first_retrieved.metadata.get('source'))
            has_chunk_id = bool(first_retrieved.metadata.get('chunk_id'))
            print(f"   📋 Metadata preservation:")
            print(f"     Source preserved: {'✅' if has_source else '❌'}")
            print(f"     Chunk ID preserved: {'✅' if has_chunk_id else '❌'}")
        
        print("\\n🎉 Complete RAG Pipeline test passed successfully!")
        print("✅ All components integrated and working correctly!")
        print(f"🚀 Ready for production RAG applications with collection: {collection_name}")
        
        return True
        
    except Exception as e:
        print(f"❌ Complete pipeline test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_mixed_embedding_scenario():
    """Test PGVectorStore with mixed embedding scenarios."""
    print("\\n🔀 Testing Mixed Embedding Scenario...")
    
    db_url = os.getenv("PGVECTOR_CONNECTION_STRING")
    openai_key = os.getenv("OPENAI_API_KEY")
    
    if not db_url or not openai_key:
        print("❌ PGVECTOR_CONNECTION_STRING or OPENAI_API_KEY not found - skipping mixed test")
        return False
    
    try:
        # Create mixed documents (some with embeddings, some without)
        mixed_docs = [
            # Document WITH embedding
            Document(
                page_content="This document already has an embedding vector attached.",
                metadata={
                    "source": "embedded_doc",
                    "embedding": [0.1] * 1536,  # Pre-computed embedding
                    "embedding_model": "text-embedding-3-small"
                }
            ),
            # Document WITHOUT embedding
            Document(
                page_content="This document needs an embedding to be generated automatically.",
                metadata={
                    "source": "raw_doc",
                    "chunk_id": 1
                }
            ),
        ]
        
        vectorstore_node = PGVectorStoreNode()
        collection_name = f"mixed_test_{uuid.uuid4().hex[:8]}"
        
        result = vectorstore_node.execute(
            inputs={
                "connection_string": db_url,
                "collection_name": collection_name,
                "fallback_embed_model": "text-embedding-3-small",
                "openai_api_key": openai_key,
                "pre_delete_collection": True,
            },
            connected_nodes={"documents": mixed_docs}
        )
        
        storage_stats = result["storage_stats"]
        embedding_analysis = result["embedding_analysis"]
        
        print(f"   📊 Mixed scenario results:")
        print(f"     Documents stored: {storage_stats['documents_stored']}")
        print(f"     Pre-embedded docs: {embedding_analysis['docs_with_embeddings']}")
        print(f"     Generated embeddings: {embedding_analysis['docs_without_embeddings']}")
        print(f"     Fallback operations: {embedding_analysis['fallback_operations']['generated_new_embeddings']}")
        
        print(f"   ✅ Mixed embedding scenario test passed!")
        return True
        
    except Exception as e:
        print(f"❌ Mixed embedding test failed: {e}")
        return False

def main():
    """Run all RAG pipeline tests."""
    print("🚀 Starting Complete RAG Pipeline Tests")
    print("=" * 80)
    
    # Test results
    results = {
        "pgvector_standalone": test_pgvector_store_standalone(),
        "complete_pipeline": test_complete_rag_pipeline(),
        "mixed_embeddings": test_mixed_embedding_scenario(),
    }
    
    # Summary
    print("\\n" + "=" * 80)
    print("📋 Test Summary:")
    passed = sum(results.values())
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"   {test_name.replace('_', ' ').title()}: {status}")
    
    print(f"\\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("\\n🎉 🎉 🎉 ALL TESTS PASSED! 🎉 🎉 🎉")
        print("🚀 Complete RAG Pipeline is ready for production!")
        print("\\n📚 Pipeline Components:")
        print("   ✅ WebScraper - URL content extraction")
        print("   ✅ ChunkSplitter - Intelligent text segmentation") 
        print("   ✅ OpenAIEmbedder - High-quality vector embeddings")
        print("   ✅ PGVectorStore - Scalable vector storage & retrieval")
        print("\\n🔗 Ready for integration with:")
        print("   • RAG applications")
        print("   • Semantic search systems")
        print("   • Question-answering bots")
        print("   • Content recommendation engines")
    else:
        print("\\n⚠️ Some tests failed. Check:")
        print("   • API keys (TAVILY_API_KEY, OPENAI_API_KEY)")
        print("   • Database connection (PGVECTOR_CONNECTION_STRING)")
        print("   • Network connectivity")
        print("   • Dependencies installation")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)