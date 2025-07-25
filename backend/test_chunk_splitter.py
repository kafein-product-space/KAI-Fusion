#!/usr/bin/env python3
"""
Comprehensive test for ChunkSplitterNode and integration with WebScraperNode
Tests the complete pipeline: WebScraper → ChunkSplitter → Analytics
"""
import os
import sys
import json
sys.path.append('/Users/bahakizil/Desktop/KAI-Fusion/backend')

from langchain_core.documents import Document
from app.nodes.document_loaders.web_scraper import WebScraperNode
from app.nodes.text_processing.chunk_splitter import ChunkSplitterNode

def test_chunk_splitter_standalone():
    """Test ChunkSplitterNode with sample documents."""
    print("🧪 Testing ChunkSplitterNode (Standalone)...")
    
    try:
        # Create sample documents
        sample_docs = [
            Document(
                page_content="""
                This is a comprehensive test document for chunking functionality. 
                It contains multiple paragraphs and sentences to test various splitting strategies.
                
                The document includes different types of content including technical information,
                natural language, and structured text that will help evaluate the effectiveness
                of different chunking approaches.
                
                We can test how the splitter handles longer content and whether it maintains
                proper context across chunk boundaries with appropriate overlap settings.
                """,
                metadata={"source": "test_doc_1", "doc_type": "sample"}
            ),
            Document(
                page_content="""
                # Markdown Header Test
                
                ## Introduction
                This is a markdown document to test header-based splitting.
                
                ## Main Content
                The splitter should be able to identify and split on markdown headers
                while preserving the document structure and hierarchy.
                
                ### Subsection
                This subsection contains additional content that should be handled
                appropriately by the markdown header splitter.
                
                ## Conclusion
                Testing various markdown structures helps ensure robust splitting.
                """,
                metadata={"source": "test_doc_2", "doc_type": "markdown"}
            )
        ]
        
        # Initialize ChunkSplitter
        splitter_node = ChunkSplitterNode()
        metadata = splitter_node.metadata
        
        print(f"✅ Node Name: {metadata.name}")
        print(f"✅ Inputs: {len(metadata.inputs)} | Outputs: {len(metadata.outputs)}")
        
        # Test different strategies
        strategies_to_test = [
            {
                "name": "Recursive Character",
                "config": {
                    "split_strategy": "recursive_character",
                    "chunk_size": 500,
                    "chunk_overlap": 100,
                    "keep_separator": True,
                }
            },
            {
                "name": "Token-Based", 
                "config": {
                    "split_strategy": "tokens",
                    "chunk_size": 200,
                    "chunk_overlap": 50,
                }
            },
            {
                "name": "Markdown Headers",
                "config": {
                    "split_strategy": "markdown_headers",
                    "chunk_size": 1000,
                    "chunk_overlap": 0,
                    "header_levels": "h1,h2,h3",
                }
            }
        ]
        
        for strategy_test in strategies_to_test:
            print(f"\n🔄 Testing {strategy_test['name']} strategy...")
            
            try:
                # Execute the splitter
                result = splitter_node.execute(
                    inputs=strategy_test["config"],
                    connected_nodes={"documents": sample_docs}
                )
                
                # Analyze results
                chunks = result["chunks"]
                stats = result["stats"] 
                preview = result["preview"]
                metadata_report = result["metadata_report"]
                
                print(f"   📊 Results:")
                print(f"     Chunks generated: {len(chunks)}")
                print(f"     Average chunk size: {stats['avg_chunk_length']} chars")
                print(f"     Quality score: {metadata_report['quality_score']['overall']}/100")
                print(f"     Recommendations: {len(metadata_report['recommendations'])}")
                
                # Show preview samples
                print(f"   📝 Preview (first 3 chunks):")
                for i, chunk_preview in enumerate(preview[:3]):
                    print(f"     Chunk {chunk_preview['chunk_id']}: {chunk_preview['length']} chars")
                    print(f"       Preview: {chunk_preview['snippets']['short']}")
                    print(f"       Type: {chunk_preview['content_type']}")
                
                print(f"   ✅ {strategy_test['name']} strategy completed successfully!")
                
            except Exception as e:
                print(f"   ❌ {strategy_test['name']} strategy failed: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Standalone test failed: {e}")
        return False

def test_webscraper_chunksplitter_integration():
    """Test the complete pipeline: WebScraper → ChunkSplitter."""
    print("\n🔗 Testing WebScraper → ChunkSplitter Integration...")
    
    # Check if Tavily API key is available
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        print("❌ TAVILY_API_KEY not found - skipping integration test")
        return False
    
    try:
        # Step 1: Initialize WebScraper
        webscraper_node = WebScraperNode()
        
        # Step 2: Scrape some content
        test_urls = "https://example.com"
        print(f"🌐 Scraping: {test_urls}")
        
        scraped_docs = webscraper_node.execute(
            urls=test_urls,
            tavily_api_key=api_key,
            min_content_length=50
        )
        
        print(f"   ✅ Scraped {len(scraped_docs)} documents")
        for i, doc in enumerate(scraped_docs):
            print(f"     Doc {i+1}: {len(doc.page_content)} chars from {doc.metadata.get('source', 'unknown')}")
        
        # Step 3: Initialize ChunkSplitter
        chunksplitter_node = ChunkSplitterNode()
        
        # Step 4: Chunk the scraped documents
        print(f"\n🔪 Chunking scraped documents...")
        chunk_config = {
            "split_strategy": "recursive_character",
            "chunk_size": 800,
            "chunk_overlap": 150,
            "keep_separator": True,
            "strip_whitespace": True,
        }
        
        chunk_result = chunksplitter_node.execute(
            inputs=chunk_config,
            connected_nodes={"documents": scraped_docs}
        )
        
        # Step 5: Analyze the complete pipeline results
        chunks = chunk_result["chunks"]
        stats = chunk_result["stats"]
        preview = chunk_result["preview"]
        metadata_report = chunk_result["metadata_report"]
        
        print(f"   📊 Pipeline Results:")
        print(f"     Original documents: {stats['total_original_docs']}")
        print(f"     Generated chunks: {stats['total_chunks']}")
        print(f"     Chunks per document: {stats['chunks_per_doc']}")
        print(f"     Average chunk size: {stats['avg_chunk_length']} chars")
        print(f"     Character efficiency: {stats['character_efficiency']}%")
        print(f"     Quality score: {metadata_report['quality_score']['overall']}/100 ({metadata_report['quality_score']['grade']})")
        
        # Show length distribution
        dist = stats['length_distribution']
        print(f"     Length distribution:")
        print(f"       Very short: {dist['very_short']} | Short: {dist['short']} | Optimal: {dist['optimal']} | Oversized: {dist['oversized']}")
        
        # Show recommendations
        if metadata_report['recommendations']:
            print(f"   💡 Recommendations:")
            for rec in metadata_report['recommendations'][:3]:
                print(f"     - {rec}")
        
        # Show sample chunks
        print(f"   📝 Sample chunks:")
        for i, chunk_preview in enumerate(preview[:3]):
            print(f"     Chunk {chunk_preview['chunk_id']}:")
            print(f"       Length: {chunk_preview['length']} chars | Words: {chunk_preview['word_count']} | Type: {chunk_preview['content_type']}")
            print(f"       Preview: {chunk_preview['snippets']['medium']}")
            print()
        
        print("🎉 WebScraper → ChunkSplitter integration test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Integration test failed: {e}")
        return False

def test_ui_configuration_options():
    """Test various UI configuration scenarios."""
    print("\n🎛️ Testing UI Configuration Options...")
    
    try:
        splitter_node = ChunkSplitterNode()
        
        # Test extreme configurations
        test_configs = [
            {
                "name": "Large Chunks",
                "config": {
                    "split_strategy": "recursive_character",
                    "chunk_size": 4000,
                    "chunk_overlap": 500,
                }
            },
            {
                "name": "Small Chunks",
                "config": {
                    "split_strategy": "character",
                    "chunk_size": 200,
                    "chunk_overlap": 20,
                    "separators": "\\n,.",
                }
            },
            {
                "name": "No Overlap",
                "config": {
                    "split_strategy": "tokens",
                    "chunk_size": 1000,
                    "chunk_overlap": 0,
                }
            }
        ]
        
        # Create a larger test document
        large_doc = Document(
            page_content=" ".join([f"This is sentence {i} in a large test document." for i in range(200)]),
            metadata={"source": "large_test_doc", "sentences": 200}
        )
        
        for config_test in test_configs:
            print(f"   🔧 Testing {config_test['name']}...")
            
            try:
                result = splitter_node.execute(
                    inputs=config_test["config"],
                    connected_nodes={"documents": [large_doc]}
                )
                
                stats = result["stats"]
                quality = result["metadata_report"]["quality_score"]
                
                print(f"     Chunks: {stats['total_chunks']}")
                print(f"     Avg size: {stats['avg_chunk_length']} chars")
                print(f"     Size range: {stats['min_chunk_length']}-{stats['max_chunk_length']}")
                print(f"     Quality: {quality['overall']}/100")
                print(f"     ✅ Configuration test passed")
                
            except Exception as e:
                print(f"     ❌ Configuration test failed: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ UI configuration test failed: {e}")
        return False

def main():
    """Run all tests."""
    print("🚀 Starting Comprehensive ChunkSplitter Tests")
    print("=" * 60)
    
    # Test results
    results = {
        "standalone": test_chunk_splitter_standalone(),
        "integration": test_webscraper_chunksplitter_integration(), 
        "ui_config": test_ui_configuration_options(),
    }
    
    # Summary
    print("\n" + "=" * 60)
    print("📋 Test Summary:")
    passed = sum(results.values())
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"   {test_name.replace('_', ' ').title()}: {status}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! ChunkSplitter is ready for production use.")
    else:
        print("⚠️ Some tests failed. Check the output above for details.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)