#!/usr/bin/env python3
"""
Test the data flow fix between DocumentLoader and ChunkSplitter
"""
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.graph_builder import GraphBuilder
from app.core.node_registry import NodeRegistry
from langchain_core.documents import Document

async def test_data_flow_fix():
    print('🧪 Testing data flow fix...')
    
    # Create test file
    with open('/tmp/test_doc.txt', 'w') as f:
        f.write('This is a test document with enough content to pass minimum length requirements. It should be processed correctly through the document loader and chunk splitter pipeline.')
    
    try:
        registry = NodeRegistry()
        registry.discover_nodes()
        
        builder = GraphBuilder(registry.nodes)
        
        # Simple workflow: DocumentLoader -> ChunkSplitter
        workflow_def = {
            'nodes': [
                {
                    'id': 'start',
                    'type': 'StartNode',
                    'position': {'x': 0, 'y': 0},
                    'data': {}
                },
                {
                    'id': 'doc-loader',
                    'type': 'DocumentLoader',
                    'position': {'x': 200, 'y': 0},
                    'data': {
                        'file_paths': '/tmp/test_doc.txt',
                        'supported_formats': ['txt'],
                        'quality_threshold': 0.3
                    }
                },
                {
                    'id': 'chunk-splitter',
                    'type': 'ChunkSplitter', 
                    'position': {'x': 400, 'y': 0},
                    'data': {
                        'chunk_size': 100,
                        'chunk_overlap': 20,
                        'separators': ['\n\n', '\n', ' ', '']
                    }
                },
                {
                    'id': 'end',
                    'type': 'EndNode',
                    'position': {'x': 600, 'y': 0},
                    'data': {}
                }
            ],
            'edges': [
                {
                    'id': 'start-to-loader',
                    'source': 'start',
                    'target': 'doc-loader',
                    'sourceHandle': 'output',
                    'targetHandle': 'input'
                },
                {
                    'id': 'loader-to-splitter',
                    'source': 'doc-loader',
                    'target': 'chunk-splitter',
                    'sourceHandle': 'documents',
                    'targetHandle': 'documents'
                },
                {
                    'id': 'splitter-to-end',
                    'source': 'chunk-splitter',
                    'target': 'end',
                    'sourceHandle': 'chunks',
                    'targetHandle': 'input'
                }
            ]
        }
        
        print("Building graph...")
        graph = builder.build_from_flow(workflow_def, user_id='test_user_123')
        
        print("Executing workflow...")
        result = await builder.execute(
            inputs={'input': 'Process this test document'},
            session_id='test_session_456',
            user_id='test_user_123',
            workflow_id='test_workflow_789'
        )
        
        print(f'✅ Workflow result: {result.get("success", False)}')
        
        if result.get("success"):
            print("🎉 Data flow fix successful!")
            return True
        else:
            print(f'❌ Workflow failed: {result.get("error", "Unknown error")}')
            return False
            
    except Exception as e:
        print(f'❌ Test failed with exception: {e}')
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    result = asyncio.run(test_data_flow_fix())
    if result:
        print("🎯 Data flow fix test PASSED!")
    else:
        print("💥 Data flow fix test FAILED!")