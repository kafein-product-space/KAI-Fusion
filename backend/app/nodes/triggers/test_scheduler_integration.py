"""
Comprehensive Integration Test - Scheduler Trigger with RAG Pipeline
──────────────────────────────────────────────────────────────────
• Purpose: Test complete workflow automation with scheduler trigger
• Integration: SchedulerTrigger → Complete RAG Pipeline → Results
• Features: Multiple schedule types, error handling, performance monitoring
• Validation: End-to-end workflow execution and result verification
"""

import asyncio
import logging
import os
from datetime import datetime, timedelta
from typing import Dict, Any, List
import uuid

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Mock imports for testing (replace with actual imports in production)
class MockDocument:
    def __init__(self, content: str, metadata: Dict[str, Any] = None):
        self.page_content = content
        self.metadata = metadata or {}

class MockRetriever:
    def __init__(self, docs: List[MockDocument]):
        self.docs = docs
    
    def get_relevant_documents(self, query: str) -> List[MockDocument]:
        return self.docs[:3]  # Return top 3 for testing

# Mock Node Classes (replace with actual imports)
class MockWebScraperNode:
    def execute(self, **kwargs) -> List[MockDocument]:
        urls = kwargs.get("urls", ["https://example.com"])
        return [MockDocument(f"Content from {url}", {"source": url}) for url in urls]

class MockChunkSplitterNode:
    def execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Any]) -> Dict[str, Any]:
        docs = connected_nodes.get("documents", [])
        chunks = []
        for doc in docs:
            # Split into smaller chunks
            words = doc.page_content.split()
            for i in range(0, len(words), 50):  # 50-word chunks
                chunk_text = " ".join(words[i:i+50])
                chunks.append(MockDocument(chunk_text, doc.metadata))
        
        return {
            "chunks": chunks,
            "total_chunks": len(chunks),
            "processing_stats": {"strategy": "mock", "chunk_size": 50}
        }

class MockOpenAIEmbedderNode:
    def execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Any]) -> Dict[str, Any]:
        chunks = connected_nodes.get("chunks", [])
        embedded_docs = []
        
        for chunk in chunks:
            # Mock embedding (in reality, this would call OpenAI)
            embedded_docs.append({
                "document": chunk,
                "embedding": [0.1] * 1536,  # Mock 1536-dim embedding
                "embedding_model": "text-embedding-ada-002"
            })
        
        return {
            "embedded_docs": embedded_docs,
            "embedding_stats": {
                "documents_processed": len(chunks),
                "total_tokens": len(chunks) * 100,  # Mock token count
                "cost_estimate": len(chunks) * 0.0001
            }
        }

class MockPGVectorStoreNode:
    def execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Any]) -> Dict[str, Any]:
        embedded_docs = connected_nodes.get("documents", [])
        
        # Mock vector storage
        retriever = MockRetriever([doc["document"] for doc in embedded_docs])
        
        return {
            "retriever": retriever,
            "vectorstore": "mock_pgvector",
            "storage_stats": {
                "documents_stored": len(embedded_docs),
                "collection_name": "test_collection",
                "index_type": "ivfflat"
            }
        }

class MockRerankerNode:
    def execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Any]) -> Dict[str, Any]:
        retriever = connected_nodes.get("retriever")
        
        return {
            "reranked_retriever": retriever,  # Mock: return same retriever
            "reranking_stats": {
                "strategy": "cohere",
                "relevance_boost": 0.15
            }
        }

class MockRetrievalQANode:
    def execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Any]) -> Dict[str, Any]:
        retriever = connected_nodes.get("retriever")
        question = inputs.get("question", "What is this document about?")
        
        # Mock QA response
        docs = retriever.get_relevant_documents(question) if retriever else []
        
        return {
            "answer": f"Based on {len(docs)} retrieved documents, this appears to be about mock content for testing the RAG pipeline.",
            "sources": [{"content": doc.page_content[:100], "metadata": doc.metadata} for doc in docs],
            "qa_stats": {
                "model": "gpt-4",
                "tokens_used": 250,
                "retrieval_score": 0.85
            }
        }

class SchedulerTriggerIntegrationTest:
    """
    Comprehensive test suite for scheduler trigger integration.
    """
    
    def __init__(self):
        self.test_results: List[Dict[str, Any]] = []
        
        # Initialize mock nodes
        self.webscraper_node = MockWebScraperNode()
        self.chunksplitter_node = MockChunkSplitterNode()
        self.embedder_node = MockOpenAIEmbedderNode()
        self.vectorstore_node = MockPGVectorStoreNode()
        self.reranker_node = MockRerankerNode()
        self.qa_node = MockRetrievalQANode()
        
        logger.info("🧪 Scheduler Trigger Integration Test initialized")
    
    async def test_manual_trigger_workflow(self) -> Dict[str, Any]:
        """Test immediate manual trigger execution."""
        logger.info("🔧 Testing Manual Trigger Workflow...")
        
        from .scheduler_trigger import SchedulerTriggerNode, ManualRunnable
        from .workflow_executor import ScheduledWorkflowExecutor, create_rag_workflow_runnable
        
        # Create scheduler trigger
        scheduler_node = SchedulerTriggerNode()
        scheduler_result = scheduler_node.execute(
            schedule_type="manual",
            enable_tracing=False
        )
        
        scheduler_runnable = scheduler_result["scheduler_runnable"]
        
        # Create RAG workflow
        workflow_config = {
            "webscraper": {"urls": ["https://example.com", "https://test.com"]},
            "chunksplitter": {"strategy": "recursive", "chunk_size": 500},
            "embedder": {"model": "text-embedding-ada-002"},
            "vectorstore": {"collection_name": "test_manual_trigger"},
            "reranker": {"strategy": "cohere", "top_k": 5},
            "qa": {"question": "What are the main topics in these documents?", "model": "gpt-4"}
        }
        
        rag_workflow = create_rag_workflow_runnable(
            self.webscraper_node,
            self.chunksplitter_node,
            self.embedder_node,
            self.vectorstore_node,
            self.reranker_node,
            self.qa_node,
            workflow_config
        )
        
        # Create scheduled workflow executor
        executor = ScheduledWorkflowExecutor(
            workflow_runnable=rag_workflow,
            workflow_id="manual_trigger_test",
            enable_monitoring=True
        )
        
        # Execute manual trigger
        trigger_data = await scheduler_runnable.ainvoke(None)
        execution_result = await executor.execute_on_trigger(trigger_data)
        
        test_result = {
            "test_name": "manual_trigger_workflow",
            "success": execution_result.success,
            "execution_time": execution_result.duration,
            "trigger_data": trigger_data,
            "outputs": execution_result.outputs,
            "error": execution_result.error
        }
        
        logger.info(f"✅ Manual trigger test completed: {execution_result.success}")
        return test_result
    
    async def test_interval_trigger_workflow(self) -> Dict[str, Any]:
        """Test interval-based trigger with short duration."""
        logger.info("🔧 Testing Interval Trigger Workflow...")
        
        from .scheduler_trigger import SchedulerTriggerNode, IntervalRunnable
        from .workflow_executor import ScheduledWorkflowExecutor, create_rag_workflow_runnable
        
        # Create scheduler trigger (5-second interval, max 3 executions)
        scheduler_node = SchedulerTriggerNode()
        scheduler_result = scheduler_node.execute(
            schedule_type="interval",
            interval_seconds=5,
            max_executions=3,
            enable_tracing=False
        )
        
        scheduler_runnable = scheduler_result["scheduler_runnable"]
        
        # Create minimal RAG workflow for faster testing
        workflow_config = {
            "webscraper": {"urls": ["https://test.com"]},
            "chunksplitter": {"strategy": "simple", "chunk_size": 100},
            "embedder": {"model": "text-embedding-ada-002"},
            "vectorstore": {"collection_name": "test_interval_trigger"},
            "reranker": {"strategy": "bm25"},
            "qa": {"question": "Test question for interval execution", "model": "gpt-3.5-turbo"}
        }
        
        rag_workflow = create_rag_workflow_runnable(
            self.webscraper_node,
            self.chunksplitter_node,
            self.embedder_node,
            self.vectorstore_node,
            self.reranker_node,
            self.qa_node,
            workflow_config
        )
        
        # Create scheduled workflow executor
        executor = ScheduledWorkflowExecutor(
            workflow_runnable=rag_workflow,
            workflow_id="interval_trigger_test",
            enable_monitoring=True
        )
        
        # Create and run scheduled workflow for short duration
        scheduled_workflow = executor.create_scheduled_workflow(scheduler_runnable)
        
        execution_results = []
        start_time = datetime.now()
        
        # Run for 20 seconds or until max executions
        async for result in scheduled_workflow.astream({}):
            execution_results.append(result)
            
            elapsed = (datetime.now() - start_time).total_seconds()
            if elapsed > 20 or len(execution_results) >= 3:  # 20 second timeout
                break
        
        test_result = {
            "test_name": "interval_trigger_workflow",
            "success": len(execution_results) > 0,
            "total_executions": len(execution_results),
            "execution_results": execution_results,
            "test_duration": (datetime.now() - start_time).total_seconds()
        }
        
        logger.info(f"✅ Interval trigger test completed: {len(execution_results)} executions")
        return test_result
    
    async def test_cron_trigger_validation(self) -> Dict[str, Any]:
        """Test cron expression validation and next execution calculation."""
        logger.info("🔧 Testing Cron Trigger Validation...")
        
        from .scheduler_trigger import SchedulerTriggerNode
        
        scheduler_node = SchedulerTriggerNode()
        
        # Test valid cron expressions
        valid_tests = [
            ("0 9 * * MON-FRI", "9 AM weekdays"),
            ("*/15 * * * *", "Every 15 minutes"),
            ("0 0 1 * *", "Monthly on 1st"),
            ("0 12 * * 0", "Sundays at noon")
        ]
        
        # Test invalid cron expressions
        invalid_tests = [
            ("invalid cron", "Invalid format"),
            ("60 * * * *", "Invalid minute"),
            ("* * 32 * *", "Invalid day"),
            ("", "Empty expression")
        ]
        
        validation_results = {
            "valid_expressions": [],
            "invalid_expressions": []
        }
        
        # Test valid expressions
        for cron_expr, description in valid_tests:
            try:
                result = scheduler_node.execute(
                    schedule_type="cron",
                    cron_expression=cron_expr,
                    timezone="UTC",
                    max_executions=5
                )
                
                validation_results["valid_expressions"].append({
                    "expression": cron_expr,
                    "description": description,
                    "success": True,
                    "next_executions": result["next_executions"][:3]  # First 3
                })
                
            except Exception as e:
                validation_results["valid_expressions"].append({
                    "expression": cron_expr,
                    "description": description,
                    "success": False,
                    "error": str(e)
                })
        
        # Test invalid expressions
        for cron_expr, description in invalid_tests:
            try:
                scheduler_node.execute(
                    schedule_type="cron",
                    cron_expression=cron_expr,
                    timezone="UTC"
                )
                
                validation_results["invalid_expressions"].append({
                    "expression": cron_expr,
                    "description": description,
                    "should_fail": True,
                    "actually_failed": False
                })
                
            except Exception as e:
                validation_results["invalid_expressions"].append({
                    "expression": cron_expr,
                    "description": description,
                    "should_fail": True,
                    "actually_failed": True,
                    "error": str(e)
                })
        
        test_result = {
            "test_name": "cron_trigger_validation",
            "success": len([r for r in validation_results["valid_expressions"] if r["success"]]) == len(valid_tests),
            "validation_results": validation_results
        }
        
        logger.info(f"✅ Cron validation test completed")
        return test_result
    
    async def test_once_trigger_workflow(self) -> Dict[str, Any]:
        """Test one-time execution trigger."""
        logger.info("🔧 Testing One-time Trigger Workflow...")
        
        from .scheduler_trigger import SchedulerTriggerNode
        from .workflow_executor import ScheduledWorkflowExecutor, create_rag_workflow_runnable
        
        # Set target time 3 seconds in the future
        target_time = datetime.now() + timedelta(seconds=3)
        target_time_str = target_time.strftime("%Y-%m-%d %H:%M:%S")
        
        # Create scheduler trigger
        scheduler_node = SchedulerTriggerNode()
        scheduler_result = scheduler_node.execute(
            schedule_type="once",
            target_datetime=target_time_str,
            timezone="UTC",
            enable_tracing=False
        )
        
        scheduler_runnable = scheduler_result["scheduler_runnable"]
        
        # Create simple RAG workflow
        workflow_config = {
            "webscraper": {"urls": ["https://once-test.com"]},
            "chunksplitter": {"strategy": "simple"},
            "embedder": {"model": "text-embedding-ada-002"},
            "vectorstore": {"collection_name": "test_once_trigger"},
            "reranker": {"strategy": "simple"},
            "qa": {"question": "Test question for one-time execution"}
        }
        
        rag_workflow = create_rag_workflow_runnable(
            self.webscraper_node,
            self.chunksplitter_node,
            self.embedder_node,
            self.vectorstore_node,
            self.reranker_node,
            self.qa_node,
            workflow_config
        )
        
        # Create executor
        executor = ScheduledWorkflowExecutor(
            workflow_runnable=rag_workflow,
            workflow_id="once_trigger_test",
            enable_monitoring=True
        )
        
        # Record start time
        start_time = datetime.now()
        
        # Execute once trigger (should wait ~3 seconds)
        execution_result = None
        async for trigger_data in scheduler_runnable.astream(None):
            execution_result = await executor.execute_on_trigger(trigger_data)
            break  # Should only execute once
        
        execution_duration = (datetime.now() - start_time).total_seconds()
        
        test_result = {
            "test_name": "once_trigger_workflow",
            "success": execution_result.success if execution_result else False,
            "target_time": target_time_str,
            "actual_duration": execution_duration,
            "expected_duration": 3.0,
            "execution_result": execution_result.to_dict() if execution_result else None
        }
        
        logger.info(f"✅ Once trigger test completed: waited {execution_duration:.1f}s")
        return test_result
    
    async def test_error_handling_and_retries(self) -> Dict[str, Any]:
        """Test error handling and retry mechanisms."""
        logger.info("🔧 Testing Error Handling and Retries...")
        
        from .scheduler_trigger import SchedulerTriggerNode
        from .workflow_executor import ScheduledWorkflowExecutor
        from langchain_core.runnables import RunnableLambda
        
        # Create a workflow that fails intentionally
        def failing_workflow(input_data):
            raise ValueError("Simulated workflow failure for testing")
        
        failing_runnable = RunnableLambda(failing_workflow, name="FailingWorkflow")
        
        # Create executor with retry settings
        executor = ScheduledWorkflowExecutor(
            workflow_runnable=failing_runnable,
            workflow_id="error_handling_test",
            max_retries=2,
            retry_delay=1.0,  # 1 second delay
            enable_monitoring=True
        )
        
        # Create manual trigger
        scheduler_node = SchedulerTriggerNode()
        scheduler_result = scheduler_node.execute(schedule_type="manual")
        scheduler_runnable = scheduler_result["scheduler_runnable"]
        
        # Execute and expect failure after retries
        trigger_data = await scheduler_runnable.ainvoke(None)
        start_time = datetime.now()
        execution_result = await executor.execute_on_trigger(trigger_data)
        total_duration = (datetime.now() - start_time).total_seconds()
        
        test_result = {
            "test_name": "error_handling_and_retries",
            "success": not execution_result.success,  # Should fail as expected
            "execution_failed_as_expected": not execution_result.success,
            "error_message": execution_result.error,
            "retry_duration": total_duration,
            "expected_min_duration": 2.0,  # Should take at least 2 seconds (2 retries × 1s delay)
            "stats": executor.get_execution_stats()
        }
        
        logger.info(f"✅ Error handling test completed: failed as expected in {total_duration:.1f}s")
        return test_result
    
    async def run_all_tests(self) -> Dict[str, Any]:
        """Run comprehensive integration test suite."""
        logger.info("🚀 Starting Comprehensive Scheduler Integration Tests...")
        
        test_results = {}
        start_time = datetime.now()
        
        try:
            # Run all test cases
            test_results["manual_trigger"] = await self.test_manual_trigger_workflow()
            test_results["cron_validation"] = await self.test_cron_trigger_validation()
            test_results["once_trigger"] = await self.test_once_trigger_workflow()
            test_results["error_handling"] = await self.test_error_handling_and_retries()
            
            # Run interval test last (takes longer)
            test_results["interval_trigger"] = await self.test_interval_trigger_workflow()
            
        except Exception as e:
            logger.error(f"❌ Test suite failed: {str(e)}")
            test_results["suite_error"] = str(e)
        
        total_duration = (datetime.now() - start_time).total_seconds()
        
        # Calculate summary
        successful_tests = len([t for t in test_results.values() 
                              if isinstance(t, dict) and t.get("success", False)])
        total_tests = len([t for t in test_results.values() 
                          if isinstance(t, dict) and "test_name" in t])
        
        summary = {
            "test_suite": "Scheduler Trigger Integration Tests",
            "total_duration": total_duration,
            "successful_tests": successful_tests,
            "total_tests": total_tests,
            "success_rate": (successful_tests / total_tests * 100) if total_tests > 0 else 0,
            "test_results": test_results,
            "timestamp": datetime.now().isoformat()
        }
        
        logger.info(f"📊 Test Suite Complete: {successful_tests}/{total_tests} tests passed ({summary['success_rate']:.1f}%)")
        return summary

# Async execution function
async def main():
    """Run the integration test suite."""
    tester = SchedulerTriggerIntegrationTest()
    results = await tester.run_all_tests()
    
    print("\n" + "="*80)
    print("SCHEDULER TRIGGER INTEGRATION TEST RESULTS")
    print("="*80)
    print(f"Duration: {results['total_duration']:.1f} seconds")
    print(f"Success Rate: {results['success_rate']:.1f}% ({results['successful_tests']}/{results['total_tests']})")
    print("\nTest Details:")
    
    for test_name, result in results["test_results"].items():
        if isinstance(result, dict) and "success" in result:
            status = "✅ PASS" if result["success"] else "❌ FAIL"
            print(f"  {status} {test_name}")
            if not result["success"] and "error" in result:
                print(f"    Error: {result['error']}")
    
    print("="*80)
    return results

if __name__ == "__main__":
    # Run the test suite
    asyncio.run(main())