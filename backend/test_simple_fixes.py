"""
Simple Fixes Verification Test
==============================

This test verifies the critical fixes work without requiring database connections
or API keys. It focuses on parameter validation and basic functionality.
"""

import sys
import traceback

# Add the app directory to Python path
sys.path.append('/Users/bahakizil/Desktop/KAI-Fusion/backend')
sys.path.append('/Users/bahakizil/Desktop/KAI-Fusion/backend/app')

def test_cohere_reranker_import_and_params():
    """Test that CohereReranker can be imported and configured without max_chunks_per_doc."""
    print("🧪 Testing CohereReranker import and parameter validation...")
    
    try:
        from app.nodes.tools.cohere_reranker import CohereRerankerNode
        
        # Create node
        reranker_node = CohereRerankerNode()
        
        # Check metadata - max_chunks_per_doc should NOT be in inputs
        inputs = reranker_node._metadata.get("inputs", [])
        input_names = [inp.name for inp in inputs]
        
        if "max_chunks_per_doc" in input_names:
            print("❌ FAILED: max_chunks_per_doc still in input parameters")
            return False
        
        # Check that valid parameters are present
        expected_params = ["cohere_api_key", "model", "top_n"]
        for param in expected_params:
            if param not in input_names:
                print(f"❌ FAILED: Missing expected parameter: {param}")
                return False
        
        print("✅ SUCCESS: CohereReranker parameters are correctly configured")
        print(f"   Available parameters: {input_names}")
        return True
        
    except Exception as e:
        print(f"❌ ERROR: Failed to test CohereReranker: {str(e)}")
        print(traceback.format_exc())
        return False

def test_intelligent_vector_store_import():
    """Test that IntelligentVectorStore can be imported and has expected functionality."""
    print("🧪 Testing IntelligentVectorStore import and configuration...")
    
    try:
        from app.nodes.vector_stores.intelligent_vector_store import IntelligentVectorStore
        
        # Create node
        intelligent_store = IntelligentVectorStore()
        
        # Check metadata for auto-optimization features
        inputs = intelligent_store._metadata.get("inputs", [])
        input_names = [inp.name for inp in inputs]
        
        # Check for key optimization parameters
        expected_optimization_params = ["auto_optimize", "embedding_dimension"]
        for param in expected_optimization_params:
            if param not in input_names:
                print(f"❌ FAILED: Missing optimization parameter: {param}")
                return False
        
        # Check for database optimization methods
        if not hasattr(intelligent_store, '_optimize_database_schema'):
            print("❌ FAILED: Missing database optimization method")
            return False
        
        if not hasattr(intelligent_store, '_detect_embedding_dimension'):
            print("❌ FAILED: Missing dimension detection method")
            return False
        
        print("✅ SUCCESS: IntelligentVectorStore has all optimization features")
        print(f"   Auto-optimization parameters: {[p for p in input_names if 'auto' in p or 'dimension' in p]}")
        return True
        
    except Exception as e:
        print(f"❌ ERROR: Failed to test IntelligentVectorStore: {str(e)}")
        print(traceback.format_exc())
        return False

def test_node_registry_imports():
    """Test that all nodes can be imported from the main registry."""
    print("🧪 Testing node registry imports...")
    
    try:
        from app.nodes import (
            CohereRerankerNode, 
            VectorStoreOrchestrator, 
            IntelligentVectorStore,
            RetrieverNode
        )
        
        # Test that each node can be instantiated
        nodes_to_test = [
            ("CohereRerankerNode", CohereRerankerNode),
            ("VectorStoreOrchestrator", VectorStoreOrchestrator),
            ("IntelligentVectorStore", IntelligentVectorStore),
            ("RetrieverNode", RetrieverNode),
        ]
        
        for node_name, node_class in nodes_to_test:
            try:
                node_instance = node_class()
                if not hasattr(node_instance, '_metadata'):
                    print(f"❌ FAILED: {node_name} missing metadata")
                    return False
                print(f"   ✓ {node_name}: OK")
            except Exception as e:
                print(f"❌ FAILED: {node_name} instantiation failed: {str(e)}")
                return False
        
        print("✅ SUCCESS: All nodes can be imported and instantiated")
        return True
        
    except Exception as e:
        print(f"❌ ERROR: Failed to test node registry: {str(e)}")
        print(traceback.format_exc())
        return False

def test_frontend_modal_compatibility():
    """Test that the CohereReranker frontend modal no longer sends invalid parameters."""
    print("🧪 Testing frontend modal parameter compatibility...")
    
    try:
        # Read the modal file to check it doesn't reference max_chunks_per_doc
        modal_path = "/Users/bahakizil/Desktop/KAI-Fusion/client/app/components/modals/tools/CohereRerankerConfigModal.tsx"
        
        with open(modal_path, 'r') as f:
            modal_content = f.read()
        
        # Check that max_chunks_per_doc is not referenced
        if "max_chunks_per_doc" in modal_content.lower() or "maxchunksperdoc" in modal_content.lower():
            print("❌ FAILED: Frontend modal still references max_chunks_per_doc")
            return False
        
        # Check that valid parameters are present
        if "top_n" not in modal_content.lower() and "topn" not in modal_content.lower():
            print("❌ FAILED: Frontend modal missing top_n parameter")
            return False
        
        print("✅ SUCCESS: Frontend modal parameters are correctly configured")
        return True
        
    except Exception as e:
        print(f"❌ ERROR: Failed to test frontend modal: {str(e)}")
        return False

def main():
    """Run all simple verification tests."""
    print("=" * 80)
    print("🔧 KAI-Fusion Simple Fixes Verification")
    print("=" * 80)
    print()
    
    tests = [
        ("CohereReranker Parameter Fix", test_cohere_reranker_import_and_params),
        ("IntelligentVectorStore Features", test_intelligent_vector_store_import),
        ("Node Registry Imports", test_node_registry_imports),
        ("Frontend Modal Compatibility", test_frontend_modal_compatibility),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n{'-' * 60}")
        success = test_func()
        results.append((test_name, success))
        print()
    
    # Summary
    print("=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    for test_name, success in results:
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status} {test_name}")
    
    print(f"\nOverall: {passed}/{total} tests passed ({(passed/total)*100:.1f}%)")
    
    if passed == total:
        print("\n🎉 ALL FIXES VERIFIED SUCCESSFULLY!")
        print("\n📝 Summary of fixes:")
        print("   • CohereReranker no longer uses invalid max_chunks_per_doc parameter")
        print("   • Frontend modal updated to match backend parameters")
        print("   • IntelligentVectorStore provides automatic database optimization")
        print("   • All nodes properly registered and importable")
        return 0
    else:
        print(f"\n⚠️  {total - passed} TESTS FAILED - Please review the issues above")
        return 1

if __name__ == "__main__":
    sys.exit(main())