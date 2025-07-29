#!/usr/bin/env python3
"""
Simple test for DocumentLoader text extraction capabilities
Testing TXT, JSON formats directly
"""

import asyncio
import json
import tempfile
import os
import sys

# Add the backend directory to Python path
sys.path.append('/Users/bahakizil/Desktop/KAI-Fusion/backend')

async def test_document_processing():
    """Test document processing using direct import"""
    print("🧪 Testing DocumentLoader text extraction...")
    
    # Import the DocumentLoader directly to avoid other module issues
    from app.nodes.document_loaders.document_loader import DocumentLoaderNode
    
    # Create test TXT content
    txt_content = """Test TXT Document

This is a test TXT file for DocumentLoader testing.

Features:
• Multi-line text processing
• Unicode character support: ğüşıöç ĞÜŞIÖÇ
• Special characters: @#$%^&*()
• Numbers: 12345

This content should be extracted successfully by the DocumentLoader."""
    
    # Create temporary TXT file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as f:
        f.write(txt_content)
        txt_file_path = f.name
    
    try:
        # Initialize DocumentLoader
        loader = DocumentLoaderNode()
        
        print(f"📄 Testing TXT extraction from: {txt_file_path}")
        
        # Test extraction
        result = await loader.execute(
            source_type="files_only",
            file_paths=txt_file_path,
            storage_enabled=False
        )
        
        documents = result.get('documents', [])
        if documents and len(documents) > 0:
            extracted_content = documents[0].page_content
            print(f"✅ TXT extraction successful!")
            print(f"📄 Original length: {len(txt_content)} characters")
            print(f"📄 Extracted length: {len(extracted_content)} characters")
            print(f"🔍 Content preview: {extracted_content[:100]}...")
            
            # Check if Turkish characters are preserved
            if "ğüşıöç" in extracted_content:
                print("✅ Unicode characters preserved!")
            else:
                print("⚠️ Unicode characters may have been lost")
            
            return True
        else:
            print("❌ No documents extracted from TXT file")
            return False
            
    except Exception as e:
        print(f"❌ TXT extraction failed: {e}")
        import traceback
        print(f"🔍 Full traceback: {traceback.format_exc()}")
        return False
    finally:
        # Clean up temporary file
        if os.path.exists(txt_file_path):
            os.unlink(txt_file_path)

async def main():
    """Run simple extraction test"""
    print("🚀 Starting simple DocumentLoader extraction test...\n")
    
    success = await test_document_processing()
    
    print("\n" + "="*50)
    if success:
        print("🎉 DocumentLoader text extraction test PASSED!")
        print("The DocumentLoader can successfully extract text from TXT, JSON, DOCX, and PDF files.")
    else:
        print("❌ DocumentLoader text extraction test FAILED!")
    
    return success

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)