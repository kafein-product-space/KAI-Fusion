#!/usr/bin/env python3
"""
Simple test script for WebScraperNode
"""
import os
import sys
sys.path.append('/Users/bahakizil/Desktop/KAI-Fusion/backend')

from app.nodes.document_loaders.web_scraper import WebScraperNode

def test_web_scraper():
    """Test the WebScraperNode with sample URLs."""
    print("🧪 Testing WebScraperNode...")
    
    # Check if Tavily API key is available
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        print("❌ TAVILY_API_KEY not found in environment variables")
        print("   Please set TAVILY_API_KEY to test the scraper functionality")
        return False
    
    try:
        # Initialize the node
        scraper_node = WebScraperNode()
        metadata = scraper_node.metadata
        
        # Test metadata
        print(f"✅ Node Name: {metadata.name}")
        print(f"✅ Display Name: {metadata.display_name}")
        print(f"✅ Category: {metadata.category}")
        print(f"✅ Inputs: {len(metadata.inputs)}")
        print(f"✅ Outputs: {len(metadata.outputs)}")
        
        # Test with sample URLs (using public, accessible sites)
        test_urls = """https://httpbin.org/html
https://example.com"""
        
        print(f"\n🔄 Testing with URLs:\n{test_urls}")
        
        # Execute the scraper
        documents = scraper_node.execute(
            urls=test_urls,
            tavily_api_key=api_key,
            min_content_length=10  # Lower threshold for test
        )
        
        print(f"\n📊 Results:")
        print(f"   Documents extracted: {len(documents)}")
        
        for i, doc in enumerate(documents, 1):
            print(f"   Doc {i}:")
            print(f"     Source: {doc.metadata.get('source', 'Unknown')}")
            print(f"     Length: {doc.metadata.get('content_length', 0)} chars")
            print(f"     Domain: {doc.metadata.get('domain', 'Unknown')}")
            print(f"     Preview: {doc.page_content[:100]}...")
            print()
        
        print("🎉 WebScraperNode test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

if __name__ == "__main__":
    success = test_web_scraper()
    sys.exit(0 if success else 1)