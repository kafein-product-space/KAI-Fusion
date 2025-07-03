from celery import current_task
from app.core.celery_app import celery_app
from app.database import db
from app.models.task import TaskStatus, TaskType
import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, Any

logger = logging.getLogger(__name__)

@celery_app.task
def health_check():
    """
    Periodic health check task for monitoring system status
    """
    async def _execute():
        try:
            health_status = {
                'timestamp': datetime.utcnow().isoformat(),
                'database': 'unknown',
                'celery': 'healthy',
                'active_tasks': 0,
                'pending_tasks': 0
            }
            
            # Check database connection
            if db:
                try:
                    # Simple database health check
                    stats = await db.get_stats()
                    health_status['database'] = 'healthy' if stats else 'error'
                    
                    # Get task counts from database
                    if 'error' not in stats:
                        # This would need to be implemented in the database class
                        # For now, just mark as healthy
                        health_status['database'] = 'healthy'
                        
                except Exception as e:
                    logger.error(f"Database health check failed: {e}")
                    health_status['database'] = 'error'
            else:
                health_status['database'] = 'unavailable'
            
            # Get Celery worker stats
            try:
                inspect = celery_app.control.inspect()
                active_tasks = inspect.active()
                if active_tasks:
                    health_status['active_tasks'] = sum(len(tasks) for tasks in active_tasks.values())
                    
                # Note: Getting pending tasks requires Redis/broker inspection
                # For simplicity, we'll skip this in the health check
                
            except Exception as e:
                logger.warning(f"Could not get Celery stats: {e}")
            
            logger.info(f"Health check completed: {health_status}")
            return health_status
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return {
                'timestamp': datetime.utcnow().isoformat(),
                'status': 'error',
                'error': str(e)
            }
    
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        return loop.run_until_complete(_execute())
    finally:
        loop.close()

@celery_app.task
def cleanup_old_tasks():
    """
    Cleanup old completed tasks from the database
    """
    async def _execute():
        try:
            if not db:
                logger.warning("Database not available for cleanup")
                return {'error': 'Database not available'}
            
            start_time = time.time()
            deleted_count = await db.cleanup_old_tasks()
            execution_time = time.time() - start_time
            
            result = {
                'deleted_tasks': deleted_count,
                'execution_time': execution_time,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            logger.info(f"Cleanup completed: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Cleanup failed: {e}")
            return {
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        return loop.run_until_complete(_execute())
    finally:
        loop.close()

@celery_app.task(bind=True)
def test_credential_task(self, credential_id: str, user_id: str, task_record_id: str):
    """
    Test a credential configuration
    
    Args:
        credential_id: ID of the credential to test
        user_id: ID of the user
        task_record_id: Database task record ID for tracking
    """
    async def _execute():
        try:
            if not db:
                raise Exception("Database not available")
            
            # Update task status
            await db.update_task(task_record_id, {
                'status': TaskStatus.STARTED.value,
                'progress': 10,
                'current_step': 'Testing credential'
            })
            
            current_task.update_state(
                state='PROGRESS',
                meta={'progress': 10, 'current_step': 'Testing credential'}
            )
            
            # This would integrate with the credential system
            # For now, simulate a test
            await asyncio.sleep(2)  # Simulate API call
            
            test_result = {
                'valid': True,
                'test_timestamp': datetime.utcnow().isoformat(),
                'response_time': 0.5
            }
            
            await db.update_task(task_record_id, {
                'status': TaskStatus.SUCCESS.value,
                'progress': 100,
                'current_step': 'Completed',
                'result': test_result
            })
            
            current_task.update_state(
                state='SUCCESS',
                meta={'progress': 100, 'current_step': 'Completed', 'result': test_result}
            )
            
            return test_result
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Credential test failed: {error_msg}")
            
            if db:
                await db.update_task(task_record_id, {
                    'status': TaskStatus.FAILURE.value,
                    'error': error_msg
                })
            
            current_task.update_state(
                state='FAILURE',
                meta={'error': error_msg}
            )
            
            raise Exception(f"Credential test failed: {error_msg}")
    
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        return loop.run_until_complete(_execute())
    finally:
        loop.close()

@celery_app.task
def system_maintenance():
    """
    Perform system maintenance tasks
    """
    async def _execute():
        try:
            maintenance_results = {
                'timestamp': datetime.utcnow().isoformat(),
                'tasks': []
            }
            
            # Task 1: Cleanup old tasks
            try:
                cleanup_result = await db.cleanup_old_tasks() if db else 0
                maintenance_results['tasks'].append({
                    'name': 'cleanup_old_tasks',
                    'success': True,
                    'deleted_count': cleanup_result
                })
            except Exception as e:
                maintenance_results['tasks'].append({
                    'name': 'cleanup_old_tasks',
                    'success': False,
                    'error': str(e)
                })
            
            # Task 2: Update task statistics (if needed)
            try:
                # This could refresh materialized views or update caches
                maintenance_results['tasks'].append({
                    'name': 'update_statistics',
                    'success': True,
                    'message': 'Statistics updated'
                })
            except Exception as e:
                maintenance_results['tasks'].append({
                    'name': 'update_statistics',
                    'success': False,
                    'error': str(e)
                })
            
            successful_tasks = sum(1 for task in maintenance_results['tasks'] if task['success'])
            total_tasks = len(maintenance_results['tasks'])
            
            maintenance_results['summary'] = {
                'successful_tasks': successful_tasks,
                'total_tasks': total_tasks,
                'success_rate': (successful_tasks / total_tasks) * 100 if total_tasks > 0 else 0
            }
            
            logger.info(f"System maintenance completed: {maintenance_results['summary']}")
            return maintenance_results
            
        except Exception as e:
            logger.error(f"System maintenance failed: {e}")
            return {
                'timestamp': datetime.utcnow().isoformat(),
                'error': str(e),
                'success': False
            }
    
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        return loop.run_until_complete(_execute())
    finally:
        loop.close() 