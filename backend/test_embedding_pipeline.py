#!/usr/bin/env python3
"""
Comprehensive test for the complete pipeline: WebScraper → ChunkSplitter → OpenAIEmbedder
Tests the full document processing workflow from URL to embeddings.
"""
import os
import sys
import json
import time
sys.path.append('/Users/bahakizil/Desktop/KAI-Fusion/backend')

from langchain_core.documents import Document
from app.nodes.document_loaders.web_scraper import WebScraperNode
from app.nodes.text_processing.chunk_splitter import ChunkSplitterNode
from app.nodes.text_processing.openai_embedder import OpenAIEmbedderNode

def test_openai_embedder_standalone():
    """Test OpenAIEmbedder with sample chunks."""
    print("🧪 Testing OpenAIEmbedder (Standalone)...")
    
    # Check API key
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("❌ OPENAI_API_KEY not found - skipping OpenAI tests")
        return False
    
    try:
        # Create sample chunks
        sample_chunks = [
            Document(
                page_content="This is the first chunk of a test document. It contains information about artificial intelligence and machine learning applications.",
                metadata={"source": "test_doc", "chunk_id": 1, "total_chunks": 3}
            ),
            Document(
                page_content="The second chunk discusses natural language processing and how it can be used for document analysis and understanding.",
                metadata={"source": "test_doc", "chunk_id": 2, "total_chunks": 3}
            ),
            Document(
                page_content="The final chunk explores the applications of embeddings in semantic search and retrieval systems for enterprise applications.",
                metadata={"source": "test_doc", "chunk_id": 3, "total_chunks": 3}
            ),
        ]
        
        # Initialize OpenAIEmbedder
        embedder_node = OpenAIEmbedderNode()
        metadata = embedder_node.metadata
        
        print(f"✅ Node Name: {metadata.name}")
        print(f"✅ Model Options: {len([inp for inp in metadata.inputs if inp.name == 'embed_model'][0].choices)} models available")
        print(f"✅ Outputs: {len(metadata.outputs)}")
        
        # Test with different configurations
        test_configs = [
            {
                "name": "Small Model (Cost Effective)",
                "config": {
                    "embed_model": "text-embedding-3-small",
                    "batch_size": 10,
                    "normalize_vectors": True,
                    "enable_cost_estimation": True,
                }
            }
        ]
        
        for config_test in test_configs:
            print(f"\n🔄 Testing {config_test['name']}...")
            
            try:
                # Execute the embedder
                result = embedder_node.execute(
                    inputs=config_test["config"],
                    connected_nodes={"chunks": sample_chunks}
                )
                
                # Analyze results
                embedded_docs = result["embedded_docs"]
                vectors = result["vectors"]
                stats = result["embedding_stats"]
                cost_analysis = result["cost_analysis"]
                quality_metrics = result["quality_metrics"]
                
                print(f"   📊 Results:")
                print(f"     Documents embedded: {len(embedded_docs)}")
                print(f"     Vector dimensions: {stats['vector_dimensions']}")
                print(f"     Processing time: {stats['processing_time_seconds']}s")
                print(f"     Embeddings/second: {stats['embeddings_per_second']}")
                
                print(f"   💰 Cost Analysis:")
                print(f"     Estimated cost: ${cost_analysis['estimated_total_cost']:.6f}")
                print(f"     Cost per document: ${cost_analysis['cost_per_document']:.6f}")
                print(f"     Total tokens: {cost_analysis['estimated_tokens']}")
                
                print(f"   📈 Quality Metrics:")
                print(f"     Overall score: {quality_metrics['quality_assessment']['overall_score']}/100")
                print(f"     Grade: {quality_metrics['quality_assessment']['grade']}")
                print(f"     Diversity score: {quality_metrics['quality_assessment']['diversity_score']}/100")
                
                # Check embedding metadata
                first_doc = embedded_docs[0]
                print(f"   🔍 Sample embedding metadata:")
                print(f"     Embedding length: {len(first_doc.metadata['embedding'])}")
                print(f"     Model used: {first_doc.metadata['embedding_model']}")
                print(f"     Normalized: {first_doc.metadata['embedding_normalized']}")
                
                print(f"   ✅ {config_test['name']} completed successfully!")
                
            except Exception as e:
                print(f"   ❌ {config_test['name']} failed: {e}")
                return False
        
        return True
        
    except Exception as e:
        print(f"❌ Standalone test failed: {e}")
        return False

def test_full_pipeline():
    """Test the complete pipeline: WebScraper → ChunkSplitter → OpenAIEmbedder."""
    print("\n🔗 Testing Full Pipeline: WebScraper → ChunkSplitter → OpenAIEmbedder...")
    
    # Check API keys
    tavily_key = os.getenv("TAVILY_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")
    
    if not tavily_key:
        print("❌ TAVILY_API_KEY not found - skipping full pipeline test")
        return False
    
    if not openai_key:
        print("❌ OPENAI_API_KEY not found - skipping full pipeline test")
        return False
    
    try:
        pipeline_start = time.time()
        
        # Step 1: Web Scraping
        print("🌐 Step 1: Web Scraping...")
        webscraper_node = WebScraperNode()
        
        scraped_result = webscraper_node.execute(
            urls="https://example.com\\nhttps://httpbin.org/html",
            tavily_api_key=tavily_key,
            min_content_length=100
        )
        
        print(f"   ✅ Scraped {len(scraped_result)} documents")
        total_scraped_chars = sum(len(doc.page_content) for doc in scraped_result)
        print(f"   📝 Total content: {total_scraped_chars} characters")
        
        # Step 2: Chunk Splitting
        print("\\n🔪 Step 2: Chunk Splitting...")
        chunksplitter_node = ChunkSplitterNode()
        
        chunk_result = chunksplitter_node.execute(
            inputs={
                "split_strategy": "recursive_character",
                "chunk_size": 600,
                "chunk_overlap": 100,
                "keep_separator": True,
            },
            connected_nodes={"documents": scraped_result}
        )
        
        chunks = chunk_result["chunks"]
        chunk_stats = chunk_result["stats"]
        
        print(f"   ✅ Generated {len(chunks)} chunks")
        print(f"   📊 Average chunk size: {chunk_stats['avg_chunk_length']} chars")
        print(f"   🏆 Quality score: {chunk_result['metadata_report']['quality_score']['overall']}/100")
        
        # Step 3: Embedding
        print("\\n✨ Step 3: Creating Embeddings...")
        embedder_node = OpenAIEmbedderNode()
        
        embedding_result = embedder_node.execute(
            inputs={
                "embed_model": "text-embedding-3-small",
                "batch_size": 20,
                "normalize_vectors": True,
                "enable_cost_estimation": True,
                "include_metadata_in_embedding": False,
            },
            connected_nodes={"chunks": chunks}
        )
        
        embedded_docs = embedding_result["embedded_docs"]
        vectors = embedding_result["vectors"]
        embedding_stats = embedding_result["embedding_stats"]
        cost_analysis = embedding_result["cost_analysis"]
        quality_metrics = embedding_result["quality_metrics"]
        
        print(f"   ✅ Created embeddings for {len(embedded_docs)} chunks")
        print(f"   🎯 Vector dimensions: {embedding_stats['vector_dimensions']}")
        print(f"   ⚡ Processing speed: {embedding_stats['embeddings_per_second']} embeddings/sec")
        
        # Step 4: Pipeline Analysis
        pipeline_end = time.time()
        total_pipeline_time = pipeline_end - pipeline_start
        
        print(f"\\n📊 Complete Pipeline Analysis:")
        print(f"   🕒 Total pipeline time: {total_pipeline_time:.1f} seconds")
        print(f"   📄 Documents: {len(scraped_result)} → {len(chunks)} chunks → {len(embedded_docs)} embeddings")
        print(f"   💰 Total estimated cost: ${cost_analysis['estimated_total_cost']:.6f}")
        print(f"   📈 Overall quality: {quality_metrics['quality_assessment']['grade']} ({quality_metrics['quality_assessment']['overall_score']}/100)")
        
        # Data flow verification
        print(f"\\n🔍 Data Flow Verification:")
        
        # Check data integrity through pipeline
        first_chunk = chunks[0]
        corresponding_embedded = embedded_docs[0]
        corresponding_vector = vectors[0]
        
        print(f"   📝 Original chunk content matches: {first_chunk.page_content == corresponding_embedded.page_content}")
        print(f"   🔢 Vector dimensions consistent: {len(corresponding_vector)} dimensions")
        print(f"   🏷️ Metadata preserved: {bool(corresponding_embedded.metadata.get('source'))}")
        print(f"   ✨ Embedding added: {bool(corresponding_embedded.metadata.get('embedding'))}")
        
        # Sample the first few vector values to verify they look reasonable
        sample_vector_values = corresponding_vector[:5]
        print(f"   🎯 Sample vector values: {[round(v, 4) for v in sample_vector_values]}")
        
        # Cost efficiency analysis
        cost_per_char = cost_analysis['estimated_total_cost'] / total_scraped_chars if total_scraped_chars > 0 else 0
        print(f"   💵 Cost efficiency: ${cost_per_char:.8f} per character")
        
        print("\\n🎉 Full pipeline test completed successfully!")
        print("✅ Ready for PGVector store integration!")
        
        return True
        
    except Exception as e:
        print(f"❌ Full pipeline test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_error_handling():
    """Test error handling and edge cases."""
    print("\\n🚨 Testing Error Handling...")
    
    try:
        embedder_node = OpenAIEmbedderNode()
        
        # Test with empty input
        try:
            embedder_node.execute(
                inputs={"embed_model": "text-embedding-3-small"},
                connected_nodes={}
            )
            print("   ❌ Should have failed with empty input")
            return False
        except ValueError as e:
            print(f"   ✅ Correctly caught empty input error: {str(e)[:50]}...")
        
        # Test with invalid API key
        try:
            sample_doc = [Document(page_content="Test content", metadata={})]
            embedder_node.execute(
                inputs={
                    "embed_model": "text-embedding-3-small",
                    "openai_api_key": "invalid_key_12345"
                },
                connected_nodes={"chunks": sample_doc}
            )
            print("   ❌ Should have failed with invalid API key")
            return False
        except ValueError as e:
            print(f"   ✅ Correctly caught invalid API key error: {str(e)[:50]}...")
        
        print("   🎯 Error handling tests passed!")
        return True
        
    except Exception as e:
        print(f"   ❌ Error handling test failed: {e}")
        return False

def main():
    """Run all tests."""
    print("🚀 Starting Comprehensive Embedding Pipeline Tests")
    print("=" * 70)
    
    # Test results
    results = {
        "standalone_embedder": test_openai_embedder_standalone(),
        "full_pipeline": test_full_pipeline(),
        "error_handling": test_error_handling(),
    }
    
    # Summary
    print("\\n" + "=" * 70)
    print("📋 Test Summary:")
    passed = sum(results.values())
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"   {test_name.replace('_', ' ').title()}: {status}")
    
    print(f"\\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Embedding pipeline is ready for production!")
        print("📚 Next steps: Create PGVector store node for vector storage")
    else:
        print("⚠️ Some tests failed. Check API keys and network connectivity.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)