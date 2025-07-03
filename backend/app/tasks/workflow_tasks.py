from celery import current_task
from celery.exceptions import Retry
from app.core.celery_app import celery_app
from app.core.workflow_engine import workflow_engine
from app.database import db
from app.models.task import TaskStatus, TaskType, TaskResult
import asyncio
import time
import logging
from typing import Dict, Any, Optional
import traceback

logger = logging.getLogger(__name__)

class TaskProgressTracker:
    """Helper class for tracking task progress"""
    
    def __init__(self, task_id: str, db_task_id: str):
        self.task_id = task_id  # Celery task ID
        self.db_task_id = db_task_id  # Database task ID
        self.current_progress = 0
        
    async def update_progress(self, progress: int, current_step: str, message: Optional[str] = None):
        """Update task progress in database"""
        if db:
            await db.update_task(self.db_task_id, {
                'status': TaskStatus.PROGRESS,
                'progress': progress,
                'current_step': current_step
            })
            
            if message:
                await db.add_task_log(self.db_task_id, 'INFO', message)
        
        # Update Celery task state
        current_task.update_state(
            state='PROGRESS',
            meta={
                'progress': progress,
                'current_step': current_step,
                'message': message
            }
        )
        
        self.current_progress = progress
        
    async def update_status(self, status: TaskStatus, error: Optional[str] = None):
        """Update task status"""
        if db:
            update_data = {'status': status.value}
            if error:
                update_data['error'] = error
            await db.update_task(self.db_task_id, update_data)

@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def execute_workflow_task(self, workflow_id: str, user_id: str, inputs: Dict[str, Any], task_record_id: str):
    """
    Execute a workflow asynchronously with progress tracking
    
    Args:
        workflow_id: ID of the workflow to execute
        user_id: ID of the user executing the workflow
        inputs: Input data for the workflow
        task_record_id: Database task record ID for tracking
    """
    start_time = time.time()
    tracker = TaskProgressTracker(self.request.id, task_record_id)
    
    async def _execute():
        try:
            logger.info(f"🚀 Starting workflow execution: {workflow_id}")
            
            # Update task status to started
            await tracker.update_status(TaskStatus.STARTED)
            await tracker.update_progress(5, "Initializing workflow execution", "Loading workflow configuration...")
            
            if not db:
                raise Exception("Database not available")
            
            # Get workflow details
            workflow = await db.get_workflow(workflow_id, user_id)
            if not workflow:
                raise Exception(f"Workflow {workflow_id} not found")
            
            await tracker.update_progress(15, "Workflow loaded", f"Executing workflow: {workflow['name']}")
            
            # Execute the workflow
            result = await workflow_engine.execute_workflow(
                workflow_id=workflow_id,
                user_id=user_id,
                inputs=inputs,
                save_execution=True
            )
            
            await tracker.update_progress(90, "Workflow execution completed", "Processing results...")
            
            # Prepare task result
            execution_time = time.time() - start_time
            task_result = TaskResult(
                success=result['success'],
                result=result.get('results'),
                execution_time=execution_time,
                node_count=result.get('results', {}).get('node_count'),
                nodes_executed=result.get('results', {}).get('execution_order', [])
            )
            
            # Update task with final result
            if db:
                await db.update_task(task_record_id, {
                    'status': TaskStatus.SUCCESS,
                    'progress': 100,
                    'current_step': 'Completed',
                    'result': task_result.dict()
                })
                
                await db.add_task_log(
                    task_record_id, 
                    'INFO', 
                    f"Workflow execution completed successfully in {execution_time:.2f}s",
                    details={'execution_time': execution_time, 'node_count': task_result.node_count}
                )
            
            await tracker.update_progress(100, "Completed", "Workflow execution finished successfully")
            
            logger.info(f"✅ Workflow {workflow_id} executed successfully in {execution_time:.2f}s")
            return task_result.dict()
            
        except Exception as e:
            error_msg = str(e)
            error_type = type(e).__name__
            execution_time = time.time() - start_time
            
            logger.error(f"❌ Workflow execution failed: {error_msg}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            
            # Update task with error
            if db:
                await db.update_task(task_record_id, {
                    'status': TaskStatus.FAILURE,
                    'error': error_msg
                })
                
                await db.add_task_log(
                    task_record_id,
                    'ERROR',
                    f"Workflow execution failed: {error_msg}",
                    details={'error_type': error_type, 'traceback': traceback.format_exc()}
                )
            
            await tracker.update_status(TaskStatus.FAILURE, error_msg)
            
            # Retry logic
            if self.request.retries < self.max_retries:
                logger.info(f"🔄 Retrying workflow execution (attempt {self.request.retries + 1}/{self.max_retries})")
                raise self.retry(countdown=60 * (self.request.retries + 1), exc=e)
            
            # Final failure
            task_result = TaskResult(
                success=False,
                error=error_msg,
                error_type=error_type,
                execution_time=execution_time
            )
            
            raise Exception(f"Workflow execution failed after {self.max_retries} retries: {error_msg}")
    
    # Run the async function
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        return loop.run_until_complete(_execute())
    finally:
        loop.close()

@celery_app.task(bind=True, max_retries=2)
def bulk_execute_workflows_task(self, workflow_configs: list, user_id: str, task_record_id: str):
    """
    Execute multiple workflows in parallel
    
    Args:
        workflow_configs: List of {workflow_id, inputs} configurations
        user_id: ID of the user executing the workflows
        task_record_id: Database task record ID for tracking
    """
    start_time = time.time()
    tracker = TaskProgressTracker(self.request.id, task_record_id)
    
    async def _execute():
        try:
            await tracker.update_status(TaskStatus.STARTED)
            await tracker.update_progress(5, "Starting bulk execution", f"Executing {len(workflow_configs)} workflows")
            
            results = []
            total_workflows = len(workflow_configs)
            
            for i, config in enumerate(workflow_configs):
                workflow_id = config['workflow_id']
                inputs = config.get('inputs', {})
                
                progress = int(10 + (i / total_workflows) * 80)
                await tracker.update_progress(
                    progress, 
                    f"Executing workflow {i+1}/{total_workflows}",
                    f"Processing workflow: {workflow_id}"
                )
                
                try:
                    result = await workflow_engine.execute_workflow(
                        workflow_id=workflow_id,
                        user_id=user_id,
                        inputs=inputs,
                        save_execution=True
                    )
                    results.append({
                        'workflow_id': workflow_id,
                        'success': True,
                        'result': result
                    })
                except Exception as e:
                    logger.error(f"Failed to execute workflow {workflow_id}: {e}")
                    results.append({
                        'workflow_id': workflow_id,
                        'success': False,
                        'error': str(e)
                    })
            
            execution_time = time.time() - start_time
            successful_count = sum(1 for r in results if r['success'])
            
            task_result = TaskResult(
                success=True,
                result={'results': results, 'successful_count': successful_count, 'total_count': total_workflows},
                execution_time=execution_time
            )
            
            if db:
                await db.update_task(task_record_id, {
                    'status': TaskStatus.SUCCESS,
                    'progress': 100,
                    'current_step': 'Completed',
                    'result': task_result.dict()
                })
            
            await tracker.update_progress(100, "Completed", f"Bulk execution finished: {successful_count}/{total_workflows} successful")
            
            return task_result.dict()
            
        except Exception as e:
            error_msg = str(e)
            execution_time = time.time() - start_time
            
            logger.error(f"❌ Bulk execution failed: {error_msg}")
            
            if db:
                await db.update_task(task_record_id, {
                    'status': TaskStatus.FAILURE,
                    'error': error_msg
                })
            
            await tracker.update_status(TaskStatus.FAILURE, error_msg)
            
            if self.request.retries < self.max_retries:
                raise self.retry(countdown=120, exc=e)
            
            raise Exception(f"Bulk execution failed: {error_msg}")
    
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        return loop.run_until_complete(_execute())
    finally:
        loop.close()

@celery_app.task(bind=True, max_retries=1)
def validate_workflow_task(self, workflow_id: str, user_id: str, task_record_id: str):
    """
    Validate a workflow configuration
    
    Args:
        workflow_id: ID of the workflow to validate
        user_id: ID of the user
        task_record_id: Database task record ID for tracking
    """
    start_time = time.time()
    tracker = TaskProgressTracker(self.request.id, task_record_id)
    
    async def _execute():
        try:
            await tracker.update_status(TaskStatus.STARTED)
            await tracker.update_progress(10, "Starting validation", "Loading workflow configuration")
            
            if not db:
                raise Exception("Database not available")
            
            workflow = await db.get_workflow(workflow_id, user_id)
            if not workflow:
                raise Exception(f"Workflow {workflow_id} not found")
            
            await tracker.update_progress(30, "Workflow loaded", "Validating nodes and connections")
            
            flow_data = workflow['flow_data']
            
            # Basic validation checks
            validation_results = {
                'valid': True,
                'errors': [],
                'warnings': [],
                'node_count': len(flow_data.get('nodes', [])),
                'edge_count': len(flow_data.get('edges', []))
            }
            
            await tracker.update_progress(60, "Checking nodes", "Validating node configurations")
            
            # Validate nodes
            nodes = flow_data.get('nodes', [])
            for node in nodes:
                node_type = node.get('type')
                if not node_type:
                    validation_results['errors'].append(f"Node {node.get('id', 'unknown')} missing type")
                    validation_results['valid'] = False
            
            await tracker.update_progress(80, "Checking connections", "Validating node connections")
            
            # Validate edges
            edges = flow_data.get('edges', [])
            node_ids = {node['id'] for node in nodes}
            for edge in edges:
                source = edge.get('source')
                target = edge.get('target')
                if source not in node_ids:
                    validation_results['errors'].append(f"Edge references unknown source node: {source}")
                    validation_results['valid'] = False
                if target not in node_ids:
                    validation_results['errors'].append(f"Edge references unknown target node: {target}")
                    validation_results['valid'] = False
            
            execution_time = time.time() - start_time
            
            task_result = TaskResult(
                success=True,
                result=validation_results,
                execution_time=execution_time
            )
            
            if db:
                await db.update_task(task_record_id, {
                    'status': TaskStatus.SUCCESS,
                    'progress': 100,
                    'current_step': 'Completed',
                    'result': task_result.dict()
                })
            
            status_msg = "Valid" if validation_results['valid'] else f"Invalid ({len(validation_results['errors'])} errors)"
            await tracker.update_progress(100, "Validation completed", f"Workflow validation: {status_msg}")
            
            return task_result.dict()
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"❌ Validation failed: {error_msg}")
            
            if db:
                await db.update_task(task_record_id, {
                    'status': TaskStatus.FAILURE,
                    'error': error_msg
                })
            
            await tracker.update_status(TaskStatus.FAILURE, error_msg)
            raise Exception(f"Validation failed: {error_msg}")
    
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        return loop.run_until_complete(_execute())
    finally:
        loop.close() 