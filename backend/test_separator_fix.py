#!/usr/bin/env python3
"""
Test separator fix for ChunkSplitter
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.nodes.splitters.chunk_splitter import ChunkSplitterNode
from langchain_core.documents import Document

def test_separator_fix():
    print('🧪 Testing separator fix...')
    
    # Create a test document
    test_doc = Document(
        page_content="This is a test document with enough content to test the separator handling.",
        metadata={"source": "test"}
    )
    
    # Test ChunkSplitter with list separators (this was causing the issue)
    splitter = ChunkSplitterNode()
    
    try:
        result = splitter.execute(
            inputs={
                'split_strategy': 'recursive_character',
                'chunk_size': 50,
                'chunk_overlap': 10,
                'separators': ['\n\n', '\n', ' ', '']  # List format - this was the problem
            },
            connected_nodes={
                'documents': [test_doc]
            }
        )
        
        print(f'✅ ChunkSplitter succeeded with list separators!')
        print(f'📊 Generated {len(result["chunks"])} chunks')
        return True
        
    except Exception as e:
        print(f'❌ ChunkSplitter failed: {e}')
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    result = test_separator_fix()
    if result:
        print("🎯 Separator fix test PASSED!")
    else:
        print("💥 Separator fix test FAILED!")