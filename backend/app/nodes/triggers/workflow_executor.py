"""
Workflow Executor - Scheduled Workflow Execution Manager
─────────────────────────────────────────────────────────
• Purpose: Execute complete workflows on scheduled triggers
• Integration: Works with SchedulerTriggerNode and all RAG pipeline nodes
• Features: Error handling, retry logic, execution tracking, monitoring
• LangChain: Full Runnable integration with streaming and async support
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Callable, AsyncGenerator
import uuid

from langchain_core.runnables import Runnable, RunnablePassthrough, RunnableParallel
from langchain_core.runnables.config import RunnableConfig

logger = logging.getLogger(__name__)

class WorkflowExecutionResult:
    """Result of a workflow execution."""
    
    def __init__(self, 
                 execution_id: str,
                 workflow_id: str,
                 trigger_data: Dict[str, Any],
                 success: bool,
                 start_time: datetime,
                 end_time: datetime,
                 outputs: Optional[Dict[str, Any]] = None,
                 error: Optional[str] = None,
                 steps_completed: int = 0,
                 total_steps: int = 0):
        self.execution_id = execution_id
        self.workflow_id = workflow_id
        self.trigger_data = trigger_data
        self.success = success
        self.start_time = start_time
        self.end_time = end_time
        self.outputs = outputs or {}
        self.error = error
        self.steps_completed = steps_completed
        self.total_steps = total_steps
        self.duration = (end_time - start_time).total_seconds()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for logging/storage."""
        return {
            "execution_id": self.execution_id,
            "workflow_id": self.workflow_id,
            "trigger_data": self.trigger_data,
            "success": self.success,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat(),
            "duration_seconds": self.duration,
            "outputs": self.outputs,
            "error": self.error,
            "steps_completed": self.steps_completed,
            "total_steps": self.total_steps,
            "completion_rate": self.steps_completed / self.total_steps if self.total_steps > 0 else 0,
        }

class ScheduledWorkflowExecutor:
    """
    Executes workflows on scheduled triggers with comprehensive monitoring.
    """
    
    def __init__(self, 
                 workflow_runnable: Runnable,
                 workflow_id: str = None,
                 max_retries: int = 3,
                 retry_delay: float = 60.0,
                 enable_monitoring: bool = True):
        """
        Initialize workflow executor.
        
        Args:
            workflow_runnable: LangChain Runnable representing the complete workflow
            workflow_id: Unique identifier for the workflow
            max_retries: Maximum number of retry attempts on failure
            retry_delay: Delay between retries in seconds
            enable_monitoring: Enable execution monitoring and logging
        """
        self.workflow_runnable = workflow_runnable
        self.workflow_id = workflow_id or f"workflow_{uuid.uuid4().hex[:8]}"
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.enable_monitoring = enable_monitoring
        
        # Execution tracking
        self.execution_history: List[WorkflowExecutionResult] = []
        self.current_execution: Optional[WorkflowExecutionResult] = None
        
        logger.info(f"🔧 Workflow executor initialized: {self.workflow_id}")
    
    async def execute_on_trigger(self, trigger_data: Dict[str, Any]) -> WorkflowExecutionResult:
        """
        Execute workflow when triggered.
        
        Args:
            trigger_data: Data from the scheduler trigger
            
        Returns:
            WorkflowExecutionResult with execution details
        """
        execution_id = f"exec_{uuid.uuid4().hex[:8]}"
        start_time = datetime.now(timezone.utc)
        
        logger.info(f"🚀 Starting workflow execution: {execution_id}")
        logger.info(f"📋 Trigger: {trigger_data.get('trigger_type', 'unknown')}")
        
        retries = 0
        last_error = None
        
        while retries <= self.max_retries:
            try:
                # Execute workflow
                if asyncio.iscoroutinefunction(self.workflow_runnable.invoke):
                    outputs = await self.workflow_runnable.ainvoke(trigger_data)
                else:
                    outputs = self.workflow_runnable.invoke(trigger_data)
                
                # Success
                end_time = datetime.now(timezone.utc)
                result = WorkflowExecutionResult(
                    execution_id=execution_id,
                    workflow_id=self.workflow_id,
                    trigger_data=trigger_data,
                    success=True,
                    start_time=start_time,
                    end_time=end_time,
                    outputs=outputs,
                    steps_completed=1,  # Simplified - could be enhanced with step tracking
                    total_steps=1,
                )
                
                if self.enable_monitoring:
                    self.execution_history.append(result)
                
                logger.info(f"✅ Workflow execution completed successfully: {execution_id} ({result.duration:.2f}s)")
                return result
                
            except Exception as e:
                last_error = str(e)
                retries += 1
                
                logger.error(f"❌ Workflow execution failed (attempt {retries}/{self.max_retries + 1}): {last_error}")
                
                if retries <= self.max_retries:
                    logger.info(f"⏳ Retrying in {self.retry_delay} seconds...")
                    await asyncio.sleep(self.retry_delay)
        
        # All retries failed
        end_time = datetime.now(timezone.utc)
        result = WorkflowExecutionResult(
            execution_id=execution_id,
            workflow_id=self.workflow_id,
            trigger_data=trigger_data,
            success=False,
            start_time=start_time,
            end_time=end_time,
            error=last_error,
            steps_completed=0,
            total_steps=1,
        )
        
        if self.enable_monitoring:
            self.execution_history.append(result)
        
        logger.error(f"💥 Workflow execution failed permanently: {execution_id}")
        return result
    
    def create_scheduled_workflow(self, scheduler_runnable: Runnable) -> Runnable:
        """
        Create a complete scheduled workflow by combining scheduler and executor.
        
        Args:
            scheduler_runnable: Scheduler trigger runnable
            
        Returns:
            Combined runnable that schedules and executes workflows
        """
        async def scheduled_execution_stream(input_data):
            """Stream scheduled executions."""
            async for trigger_data in scheduler_runnable.astream(input_data):
                logger.info(f"🔥 Trigger fired: {trigger_data.get('trigger_type', 'unknown')}")
                
                # Execute workflow on trigger
                execution_result = await self.execute_on_trigger(trigger_data)
                
                # Yield combined result
                yield {
                    "trigger_data": trigger_data,
                    "execution_result": execution_result.to_dict(),
                    "workflow_id": self.workflow_id,
                }
        
        async def scheduled_execution_invoke(input_data):
            """Single scheduled execution."""
            trigger_data = await scheduler_runnable.ainvoke(input_data)
            execution_result = await self.execute_on_trigger(trigger_data)
            
            return {
                "trigger_data": trigger_data,
                "execution_result": execution_result.to_dict(),
                "workflow_id": self.workflow_id,
            }
        
        from langchain_core.runnables import RunnableLambda
        
        return RunnableLambda(
            scheduled_execution_invoke,
            name=f"ScheduledWorkflow_{self.workflow_id}",
            # Add streaming support
            func=lambda x: scheduled_execution_invoke(x),
            afunc=scheduled_execution_invoke,
            astream_func=scheduled_execution_stream,
        )
    
    def get_execution_stats(self) -> Dict[str, Any]:
        """Get execution statistics."""
        if not self.execution_history:
            return {
                "total_executions": 0,
                "successful_executions": 0,
                "failed_executions": 0,
                "success_rate": 0.0,
                "average_duration": 0.0,
            }
        
        total = len(self.execution_history)
        successful = len([r for r in self.execution_history if r.success])
        failed = total - successful
        success_rate = (successful / total) * 100 if total > 0 else 0
        avg_duration = sum(r.duration for r in self.execution_history) / total if total > 0 else 0
        
        return {
            "workflow_id": self.workflow_id,
            "total_executions": total,
            "successful_executions": successful,
            "failed_executions": failed,
            "success_rate": round(success_rate, 2),
            "average_duration": round(avg_duration, 2),
            "last_execution": self.execution_history[-1].to_dict() if self.execution_history else None,
            "execution_history": [r.to_dict() for r in self.execution_history[-10:]],  # Last 10
        }

def create_rag_workflow_runnable(
    webscraper_node,
    chunksplitter_node, 
    embedder_node,
    vectorstore_node,
    reranker_node,
    qa_node,
    workflow_config: Dict[str, Any]
) -> Runnable:
    """
    Create a complete RAG workflow runnable from individual nodes.
    
    This creates a full pipeline: WebScraper → ChunkSplitter → OpenAIEmbedder → PGVectorStore → Reranker → RetrievalQA
    
    Args:
        webscraper_node: WebScraperNode instance
        chunksplitter_node: ChunkSplitterNode instance
        embedder_node: OpenAIEmbedderNode instance
        vectorstore_node: PGVectorStoreNode instance
        reranker_node: RerankerNode instance
        qa_node: RetrievalQANode instance
        workflow_config: Configuration for each node
        
    Returns:
        Runnable representing the complete RAG workflow
    """
    async def rag_workflow_execution(trigger_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute complete RAG workflow."""
        workflow_start = datetime.now()
        results = {"trigger_data": trigger_data}
        
        try:
            # Step 1: Web Scraping
            logger.info("🌐 Step 1: Web Scraping...")
            scraper_config = workflow_config.get("webscraper", {})
            scraped_docs = webscraper_node.execute(**scraper_config)
            results["scraped_documents"] = len(scraped_docs)
            
            # Step 2: Chunk Splitting
            logger.info("🔪 Step 2: Chunk Splitting...")
            splitter_config = workflow_config.get("chunksplitter", {})
            chunk_result = chunksplitter_node.execute(
                inputs=splitter_config,
                connected_nodes={"documents": scraped_docs}
            )
            chunks = chunk_result["chunks"]
            results["chunks_generated"] = len(chunks)
            
            # Step 3: Embedding Generation
            logger.info("✨ Step 3: Creating Embeddings...")
            embedder_config = workflow_config.get("embedder", {})
            embedding_result = embedder_node.execute(
                inputs=embedder_config,
                connected_nodes={"chunks": chunks}
            )
            embedded_docs = embedding_result["embedded_docs"]
            results["embeddings_created"] = len(embedded_docs)
            
            # Step 4: Vector Storage
            logger.info("💾 Step 4: Vector Storage...")
            vectorstore_config = workflow_config.get("vectorstore", {})
            storage_result = vectorstore_node.execute(
                inputs=vectorstore_config,
                connected_nodes={"documents": embedded_docs}
            )
            retriever = storage_result["retriever"]
            results["vectors_stored"] = storage_result["storage_stats"]["documents_stored"]
            
            # Step 5: Document Reranking
            logger.info("🔄 Step 5: Document Reranking...")
            reranker_config = workflow_config.get("reranker", {})
            rerank_result = reranker_node.execute(
                inputs=reranker_config,
                connected_nodes={"retriever": retriever}
            )
            reranked_retriever = rerank_result["reranked_retriever"]
            
            # Step 6: Question Answering
            logger.info("💬 Step 6: RAG Question Answering...")
            qa_config = workflow_config.get("qa", {})
            qa_result = qa_node.execute(
                inputs=qa_config,
                connected_nodes={"retriever": reranked_retriever}
            )
            results["answer"] = qa_result["answer"]
            results["sources_used"] = len(qa_result["sources"])
            
            # Workflow completion
            workflow_end = datetime.now()
            results["success"] = True
            results["duration_seconds"] = (workflow_end - workflow_start).total_seconds()
            results["completed_at"] = workflow_end.isoformat()
            
            logger.info(f"✅ Complete RAG workflow executed successfully in {results['duration_seconds']:.1f}s")
            return results
            
        except Exception as e:
            workflow_end = datetime.now()
            error_msg = f"RAG workflow execution failed: {str(e)}"
            logger.error(error_msg)
            
            results.update({
                "success": False,
                "error": error_msg,
                "duration_seconds": (workflow_end - workflow_start).total_seconds(),
                "failed_at": workflow_end.isoformat(),
            })
            return results
    
    from langchain_core.runnables import RunnableLambda
    
    return RunnableLambda(
        rag_workflow_execution,
        name="CompleteRAGWorkflow",
    )

# Export for use
__all__ = [
    "ScheduledWorkflowExecutor", 
    "WorkflowExecutionResult", 
    "create_rag_workflow_runnable"
]