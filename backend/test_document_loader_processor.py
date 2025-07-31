"""
Test script for DocumentLoaderNode ProcessorNode implementation
"""
import asyncio
import os
from langchain_core.documents import Document

# Add the backend directory to the Python path
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from app.nodes.document_loaders.document_loader import DocumentLoaderNode

async def test_document_loader_with_connected_documents():
    """Test DocumentLoaderNode with connected documents"""
    print("Testing DocumentLoaderNode with connected documents...")
    
    # Create a document loader node
    loader = DocumentLoaderNode()
    
    # Create some test documents
    connected_docs = [
        Document(
            page_content="This is a test document from another node.",
            metadata={"source": "connected_node", "format": "txt"}
        ),
        Document(
            page_content="This is another test document from another node.",
            metadata={"source": "connected_node", "format": "txt"}
        )
    ]
    
    # Test with connected documents only
    try:
        result = await loader.execute(
            inputs={
                "file_paths": "",
                "supported_formats": ["txt"],
                "min_content_length": 10,
                "max_file_size_mb": 50,
                "storage_enabled": False,
                "deduplicate": False,
                "quality_threshold": 0.1
            },
            connected_nodes={
                "input_documents": connected_docs
            }
        )
        
        print(f"✅ Successfully processed {len(result['documents'])} connected documents")
        print(f"📊 Stats: {result['stats']}")
        
        # Verify the documents are processed correctly
        assert len(result['documents']) == 2, "Should have 2 documents"
        assert result['documents'][0].page_content == "This is a test document from another node."
        assert result['documents'][1].page_content == "This is another test document from another node."
        
        print("✅ Connected documents test passed")
        
    except Exception as e:
        print(f"❌ Error testing connected documents: {e}")
        raise

async def test_document_loader_with_local_files():
    """Test DocumentLoaderNode with local files"""
    print("\nTesting DocumentLoaderNode with local files...")
    
    # Create a test file
    test_file_path = "test_document.txt"
    with open(test_file_path, "w") as f:
        f.write("This is a test document for local file processing.")
    
    try:
        # Create a document loader node
        loader = DocumentLoaderNode()
        
        # Test with local files only
        result = await loader.execute(
            inputs={
                "file_paths": test_file_path,
                "supported_formats": ["txt"],
                "min_content_length": 10,
                "max_file_size_mb": 50,
                "storage_enabled": False,
                "deduplicate": False,
                "quality_threshold": 0.1
            },
            connected_nodes={}
        )
        
        print(f"✅ Successfully processed {len(result['documents'])} local files")
        print(f"📊 Stats: {result['stats']}")
        
        # Verify the documents are processed correctly
        assert len(result['documents']) == 1, "Should have 1 document"
        assert "This is a test document for local file processing." in result['documents'][0].page_content
        
        print("✅ Local files test passed")
        
    except Exception as e:
        print(f"❌ Error testing local files: {e}")
        raise
    finally:
        # Clean up test file
        if os.path.exists(test_file_path):
            os.remove(test_file_path)

async def test_document_loader_with_both_sources():
    """Test DocumentLoaderNode with both connected documents and local files"""
    print("\nTesting DocumentLoaderNode with both connected documents and local files...")
    
    # Create a test file
    test_file_path = "test_document_mixed.txt"
    with open(test_file_path, "w") as f:
        f.write("This is a test document from a local file.")
    
    # Create some test documents
    connected_docs = [
        Document(
            page_content="This is a test document from another node.",
            metadata={"source": "connected_node", "format": "txt"}
        )
    ]
    
    try:
        # Create a document loader node
        loader = DocumentLoaderNode()
        
        # Test with both connected documents and local files
        result = await loader.execute(
            inputs={
                "file_paths": test_file_path,
                "supported_formats": ["txt"],
                "min_content_length": 10,
                "max_file_size_mb": 50,
                "storage_enabled": False,
                "deduplicate": False,
                "quality_threshold": 0.1
            },
            connected_nodes={
                "input_documents": connected_docs
            }
        )
        
        print(f"✅ Successfully processed {len(result['documents'])} documents from both sources")
        print(f"📊 Stats: {result['stats']}")
        
        # Verify the documents are processed correctly
        assert len(result['documents']) == 2, "Should have 2 documents"
        assert result['stats']['connected_sources'] == 1, "Should have 1 connected source"
        assert result['stats']['file_sources'] == 1, "Should have 1 file source"
        
        print("✅ Mixed sources test passed")
        
    except Exception as e:
        print(f"❌ Error testing mixed sources: {e}")
        raise
    finally:
        # Clean up test file
        if os.path.exists(test_file_path):
            os.remove(test_file_path)

async def main():
    """Run all tests"""
    print("Running DocumentLoaderNode ProcessorNode tests...")
    
    try:
        await test_document_loader_with_connected_documents()
        await test_document_loader_with_local_files()
        await test_document_loader_with_both_sources()
        
        print("\n🎉 All tests passed!")
        
    except Exception as e:
        print(f"\n💥 Test failed: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main())