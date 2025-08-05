"""
Enhanced Logging Demonstration Node - Shows Best Practices for Clean Logging
===========================================================================

This demo node demonstrates how to use the enhanced logging system to replace
the problematic logging patterns identified in the current system. It shows
best practices for embedding operations, database queries, and workflow progress.

Problems Addressed:
1. Raw embedding dumps → Clean summaries
2. Excessive DEBUG messages → Smart filtering
3. Database errors mixed with normal flow → Proper categorization
4. No progress indication → Structured phases
5. Memory addresses in logs → Clean representations

Usage in Workflows:
This node can be connected to any workflow to demonstrate clean logging patterns.
It simulates common operations like embedding generation, database queries, and
memory operations while showing how they should be logged.
"""

import time
import asyncio
import random
from typing import Dict, Any, List, Optional
from datetime import datetime

from ..base import ProcessorNode, NodeInput, NodeOutput, NodeType
from ...core.enhanced_logging import get_enhanced_logger
from ...core.logging_utils import ComponentType


class EnhancedLoggingDemoNode(ProcessorNode):
    """Demonstration node showing enhanced logging best practices."""
    
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "EnhancedLoggingDemo",
            "display_name": "Enhanced Logging Demo",
            "description": (
                "Demonstrates clean, readable logging patterns for AI workflows. "
                "Shows how to properly log embeddings, database operations, and progress tracking."
            ),
            "category": "Demo",
            "node_type": NodeType.PROCESSOR,
            "icon": "activity",
            "color": "#6366f1",
            
            "inputs": [
                NodeInput(
                    name="demo_type",
                    type="select", 
                    description="Type of logging demonstration to run",
                    choices=[
                        {"value": "embedding_ops", "label": "Embedding Operations", "description": "Show clean embedding logging"},
                        {"value": "database_ops", "label": "Database Operations", "description": "Show database error categorization"},
                        {"value": "workflow_progress", "label": "Workflow Progress", "description": "Show structured progress tracking"},
                        {"value": "all_patterns", "label": "All Patterns", "description": "Demonstrate all logging patterns"}
                    ],
                    default="all_patterns",
                    required=True
                ),
                NodeInput(
                    name="simulate_errors",
                    type="boolean",
                    description="Simulate various error conditions for error logging demo",
                    default=False,
                    required=False
                ),
                NodeInput(
                    name="verbose_level",
                    type="select",
                    description="Logging verbosity level for demonstration",
                    choices=[
                        {"value": "info", "label": "INFO - Normal workflow progress"},
                        {"value": "debug", "label": "DEBUG - Detailed debugging info"},
                        {"value": "trace", "label": "TRACE - Ultra-verbose for deep debugging"}
                    ],
                    default="info",
                    required=False
                )
            ],
            
            "outputs": [
                NodeOutput(
                    name="demo_results",
                    type="object",
                    description="Results of the logging demonstration"
                )
            ]
        }
    
    async def process(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Process the logging demonstration."""
        demo_type = inputs.get("demo_type", "all_patterns")
        simulate_errors = inputs.get("simulate_errors", False)
        verbose_level = inputs.get("verbose_level", "info")
        
        # Get enhanced logger for this node
        logger = get_enhanced_logger(
            "node_executor",
            workflow_id=self.get_workflow_id(),
            session_id=self.get_session_id()
        )
        
        logger.info(f"🎯 Starting Enhanced Logging Demo: {demo_type}")
        
        results = {
            "demo_type": demo_type,
            "demonstrations": [],
            "logging_patterns_shown": [],
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Run selected demonstrations
        if demo_type == "embedding_ops" or demo_type == "all_patterns":
            await self._demo_embedding_operations(logger, results, simulate_errors)
        
        if demo_type == "database_ops" or demo_type == "all_patterns":
            await self._demo_database_operations(logger, results, simulate_errors)
        
        if demo_type == "workflow_progress" or demo_type == "all_patterns":
            await self._demo_workflow_progress(logger, results)
        
        logger.info(f"✅ Enhanced Logging Demo completed: {len(results['demonstrations'])} patterns demonstrated")
        
        return {"demo_results": results}
    
    async def _demo_embedding_operations(self, logger, results: Dict[str, Any], simulate_errors: bool):
        """Demonstrate clean embedding operation logging."""
        logger.info("🧠 === EMBEDDING OPERATIONS LOGGING DEMO ===")
        
        # Simulate generating embeddings (this would normally dump 32KB of vector data)
        logger.info("Generating embeddings for document chunks...")
        
        # OLD WAY (problematic):
        # logger.debug(f"Raw embedding data: {[0.1234, -0.5678, ...]} (32KB of data)")
        
        # NEW WAY (clean):
        logger.log_embedding_operation(
            "generate",
            dimensions=1536,
            count=50,
            duration=0.234,
            size_mb=1.2
        )
        
        # Simulate storing embeddings
        await asyncio.sleep(0.1)  # Simulate processing time
        logger.log_embedding_operation(
            "store", 
            dimensions=1536,
            count=50,
            duration=0.156,
            table="documents"
        )
        
        # Simulate similarity search
        await asyncio.sleep(0.05)
        logger.log_embedding_operation(
            "search",
            dimensions=1536,
            query_vector="<1536-dim query>",
            results_count=10,
            duration=0.087
        )
        
        if simulate_errors:
            # Demonstrate error handling for embedding operations
            try:
                raise ValueError("Embedding dimension mismatch: expected 1536, got 768")
            except Exception as e:
                logger.error("❌ Embedding operation failed", error=e,
                           operation="dimension_validation",
                           expected_dims=1536,
                           actual_dims=768)
        
        results["demonstrations"].append("embedding_operations")
        results["logging_patterns_shown"].extend([
            "clean_embedding_summaries",
            "performance_metrics",
            "error_categorization"
        ])
    
    async def _demo_database_operations(self, logger, results: Dict[str, Any], simulate_errors: bool):
        """Demonstrate clean database operation logging."""
        logger.info("💾 === DATABASE OPERATIONS LOGGING DEMO ===")
        
        # Simulate various database operations
        
        # 1. Successful query
        logger.log_database_query(
            "SELECT",
            table="langchain_pg_embedding", 
            rows=150,
            duration=0.045,
            conditions=["metadata->>'source' = 'docs'"]
        )
        
        # 2. Insert operation
        await asyncio.sleep(0.02)
        logger.log_database_query(
            "INSERT",
            table="langchain_pg_embedding",
            rows=25,
            duration=0.123
        )
        
        # 3. Index creation (long operation)
        await asyncio.sleep(0.1)
        logger.log_database_query(
            "CREATE INDEX",
            table="langchain_pg_embedding",
            duration=2.341,
            index_type="HNSW"
        )
        
        if simulate_errors:
            # Demonstrate different types of database errors with proper categorization
            
            # Schema error (recoverable)
            try:
                raise Exception("(psycopg2.errors.UndefinedColumn) column langchain_pg_embedding.id does not exist")
            except Exception as e:
                logger.log_database_error(e, query_type="SELECT", table="langchain_pg_embedding")
            
            # Connection error (serious)
            try:
                raise Exception("connection to server at 'localhost' failed: Connection refused")
            except Exception as e:
                logger.log_database_error(e, query_type="CONNECT")
            
            # Generic database error
            try:
                raise Exception("deadlock detected")
            except Exception as e:
                logger.log_database_error(e, query_type="UPDATE", table="documents")
        
        results["demonstrations"].append("database_operations")
        results["logging_patterns_shown"].extend([
            "clean_database_summaries",
            "error_categorization", 
            "performance_tracking"
        ])
    
    async def _demo_workflow_progress(self, logger, results: Dict[str, Any]):
        """Demonstrate structured workflow progress tracking."""
        logger.info("📊 === WORKFLOW PROGRESS TRACKING DEMO ===")
        
        from ...core.logging_utils import WorkflowPhase
        
        # Start a simulated sub-workflow
        logger.start_workflow_phase(
            WorkflowPhase.EXECUTE,
            total_steps=5,
            operation="document_processing",
            input_count=100
        )
        
        # Simulate processing steps with progress updates
        steps = [
            "Loading documents",
            "Chunking text",
            "Generating embeddings", 
            "Storing vectors",
            "Creating index"
        ]
        
        for i, step in enumerate(steps, 1):
            logger.info(f"🔄 Step {i}/5: {step}")
            await asyncio.sleep(0.1)  # Simulate work
            
            # Update progress
            logger.update_progress(1, step)
            
            # Simulate some performance metrics
            duration = random.uniform(0.05, 0.3)
            logger.log_performance_metric(
                f"step_{i}_{step.lower().replace(' ', '_')}", 
                duration,
                items_processed=random.randint(10, 30)
            )
        
        # End the workflow phase
        logger.end_workflow_phase(
            WorkflowPhase.EXECUTE,
            success=True,
            total_items_processed=100,
            total_duration=sum(random.uniform(0.05, 0.3) for _ in range(5))
        )
        
        results["demonstrations"].append("workflow_progress")
        results["logging_patterns_shown"].extend([
            "structured_progress_tracking",
            "phase_visualization",
            "performance_monitoring"
        ])
    
    def get_workflow_id(self) -> Optional[str]:
        """Get workflow ID from context."""
        return getattr(self, 'workflow_id', None) or "demo_workflow"
    
    def get_session_id(self) -> Optional[str]:
        """Get session ID from context."""
        return getattr(self, 'session_id', None) or "demo_session"
    
    @property
    def metadata(self) -> Dict[str, Any]:
        """Return node metadata."""
        return self._metadata