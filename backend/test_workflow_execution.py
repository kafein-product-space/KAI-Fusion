#!/usr/bin/env python3
"""
Test workflow execution with the fixes applied
"""
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.graph_builder import GraphBuilder
from app.core.node_registry import NodeRegistry

async def test_workflow():
    print('🚀 Testing workflow execution with fixes...')
    
    # Create a test workflow with DocumentLoader -> ChunkSplitter -> VectorStore
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
                    'chunk_size': 500,
                    'chunk_overlap': 50,
                    'separators': ['\n\n', '\n', ' ', '']
                }
            },
            {
                'id': 'vector-store',
                'type': 'VectorStoreOrchestrator',
                'position': {'x': 600, 'y': 0},
                'data': {
                    'operation': 'add',
                    'collection_name': 'test_collection'
                }
            },
            {
                'id': 'end',
                'type': 'EndNode',
                'position': {'x': 800, 'y': 0},
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
                'id': 'splitter-to-vector',
                'source': 'chunk-splitter',
                'target': 'vector-store',
                'sourceHandle': 'chunks',
                'targetHandle': 'documents'
            },
            {
                'id': 'vector-to-end',
                'source': 'vector-store',
                'target': 'end',
                'sourceHandle': 'output',
                'targetHandle': 'input'
            }
        ]
    }
    
    # Create test file
    with open('/tmp/test_doc.txt', 'w') as f:
        f.write('This is a test document for workflow execution. It contains multiple sentences and should be processed correctly by the document loader and chunk splitter.')
    
    try:
        registry = NodeRegistry()
        registry.discover_nodes()
        
        builder = GraphBuilder(registry.nodes)
        graph = builder.build_from_flow(workflow_def, user_id='test_user_123')
        
        result = await builder.execute(
            inputs={'input': 'Process this test document'},
            session_id='test_session_456',
            user_id='test_user_123',
            workflow_id='test_workflow_789'
        )
        
        print(f'✅ Workflow execution result: {result}')
        return result
        
    except Exception as e:
        print(f'❌ Workflow execution failed: {e}')
        import traceback
        traceback.print_exc()
        return None

if __name__ == '__main__':
    result = asyncio.run(test_workflow())
    if result:
        print("🎉 Test completed successfully!")
    else:
        print("💥 Test failed!")