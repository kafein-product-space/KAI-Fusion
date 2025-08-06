#!/usr/bin/env python3
"""
Test Workflow Debug - RAG Pipeline Test
=======================================

Bu script RAG pipeline workflow'unu test eder ve debug yapar.
"""

import os
import asyncio
from app.core.graph_builder import GraphBuilder

# Set test API key
os.environ['OPENAI_API_KEY'] = 'sk-test-key-for-development-only'

async def test_rag_workflow():
    """Test basic RAG workflow"""
    
    # Workflow definition
    workflow_def = {
        "nodes": [
            {
                "id": "start_1",
                "type": "Start",
                "position": {"x": 100, "y": 200},
                "data": {"name": "Start"}
            },
            {
                "id": "webscraper_2", 
                "type": "WebScraper",
                "position": {"x": 300, "y": 200},
                "data": {
                    "name": "Web Scraper",
                    "urls": "https://www.bahakizil.com"
                }
            },
            {
                "id": "chunksplitter_3",
                "type": "ChunkSplitter", 
                "position": {"x": 500, "y": 200},
                "data": {
                    "name": "Chunk Splitter",
                    "chunk_size": 1000,
                    "chunk_overlap": 200
                }
            },
            {
                "id": "embeddings_4",
                "type": "OpenAIEmbeddingsProvider",
                "position": {"x": 500, "y": 100},
                "data": {
                    "name": "OpenAI Embeddings",
                    "openai_api_key": "sk-test-key-123",
                    "model": "text-embedding-3-small"
                }
            },
            {
                "id": "vectorstore_5",
                "type": "VectorStoreOrchestrator",
                "position": {"x": 700, "y": 200}, 
                "data": {
                    "name": "Vector Store",
                    "connection_string": "postgresql://postgres:password@localhost:5432/kai_fusion",
                    "collection_name": "test_collection",
                    "pre_delete_collection": True
                }
            },
            {
                "id": "end_6",
                "type": "End",
                "position": {"x": 900, "y": 200},
                "data": {"name": "End"}
            }
        ],
        "edges": [
            {"id": "e1", "source": "start_1", "target": "webscraper_2"},
            {"id": "e2", "source": "webscraper_2", "target": "chunksplitter_3"},
            {"id": "e3", "source": "chunksplitter_3", "target": "vectorstore_5"},
            {"id": "e4", "source": "embeddings_4", "target": "vectorstore_5"},
            {"id": "e5", "source": "vectorstore_5", "target": "end_6"}
        ]
    }
    
    print("🚀 Testing RAG Workflow with Debug")
    print("=" * 50)
    
    try:
        # Build workflow
        builder = GraphBuilder()
        graph = builder.build_graph(workflow_def, user_id="test-user")
        
        print("✅ Graph built successfully")
        
        # Test execution
        result = await graph.ainvoke({"input": "Test RAG workflow"})
        print(f"✅ Workflow executed: {type(result)}")
        
        if isinstance(result, dict):
            print(f"Result keys: {list(result.keys())}")
        
    except Exception as e:
        print(f"❌ Workflow failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_rag_workflow())