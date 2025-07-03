from supabase import create_client, Client
from typing import Optional, List, Dict, Any
import json
import logging
from datetime import datetime
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

class Database:
    """Consolidated database handler for Supabase operations"""
    
    def __init__(self):
        if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
            logger.warning("Supabase credentials not configured. Database features will be disabled.")
            self.client = None
            return
            
        try:
            self.client: Client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_KEY
            )
            logger.info("✅ Supabase client initialized successfully")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Supabase client: {e}")
            self.client = None
    
    def _ensure_client(self):
        """Ensure database client is available"""
        if not self.client:
            raise ValueError("Database client not available. Check Supabase configuration.")
    
    # Workflow Management
    async def create_workflow(self, user_id: str, data: dict) -> dict:
        """Create a new workflow"""
        self._ensure_client()
        try:
            result = self.client.table('workflows').insert({
                'user_id': user_id,
                'name': data['name'],
                'description': data.get('description', ''),
                'flow_data': json.dumps(data['flow_data']),
                'is_public': data.get('is_public', False),
                'tags': data.get('tags', []),
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }).execute()
            
            if result.data:
                logger.info(f"✅ Created workflow: {data['name']} for user {user_id}")
                return result.data[0]
            else:
                raise ValueError("No data returned from workflow creation")
                
        except Exception as e:
            logger.error(f"❌ Failed to create workflow: {e}")
            raise

    async def get_workflows(self, user_id: str, include_public: bool = True) -> List[dict]:
        """Get workflows for a user"""
        self._ensure_client()
        try:
            query = self.client.table('workflows').select('*')
            
            if include_public:
                query = query.or_(f'user_id.eq.{user_id},is_public.eq.true')
            else:
                query = query.eq('user_id', user_id)
            
            result = query.order('updated_at', desc=True).execute()
            workflows = result.data or []
            
            # Parse flow_data JSON
            for workflow in workflows:
                if workflow.get('flow_data'):
                    try:
                        workflow['flow_data'] = json.loads(workflow['flow_data'])
                    except json.JSONDecodeError:
                        logger.warning(f"Invalid JSON in workflow {workflow.get('id')}")
                        workflow['flow_data'] = {}
            
            logger.debug(f"Retrieved {len(workflows)} workflows for user {user_id}")
            return workflows
            
        except Exception as e:
            logger.error(f"❌ Failed to get workflows: {e}")
            return []

    async def get_workflow(self, workflow_id: str, user_id: str) -> Optional[dict]:
        """Get a specific workflow"""
        self._ensure_client()
        try:
            result = self.client.table('workflows').select('*').eq('id', workflow_id).execute()
            
            if not result.data:
                return None
            
            workflow = result.data[0]
            
            # Check permissions
            if workflow['user_id'] != user_id and not workflow.get('is_public', False):
                logger.warning(f"Access denied to workflow {workflow_id} for user {user_id}")
                return None
            
            # Parse flow_data
            if workflow.get('flow_data'):
                try:
                    workflow['flow_data'] = json.loads(workflow['flow_data'])
                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON in workflow {workflow_id}")
                    workflow['flow_data'] = {}
            
            return workflow
            
        except Exception as e:
            logger.error(f"❌ Failed to get workflow {workflow_id}: {e}")
            return None

    async def update_workflow(self, workflow_id: str, user_id: str, data: dict) -> Optional[dict]:
        """Update a workflow"""
        self._ensure_client()
        try:
            update_data = {
                'updated_at': datetime.utcnow().isoformat()
            }
            
            # Add fields if provided
            for field in ['name', 'description', 'is_public', 'tags']:
                if field in data:
                    update_data[field] = data[field]
            
            if 'flow_data' in data:
                update_data['flow_data'] = json.dumps(data['flow_data'])
            
            result = self.client.table('workflows').update(update_data).eq('id', workflow_id).eq('user_id', user_id).execute()
            
            if result.data:
                logger.info(f"✅ Updated workflow {workflow_id}")
                return result.data[0]
            else:
                logger.warning(f"No workflow found to update: {workflow_id}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Failed to update workflow {workflow_id}: {e}")
            raise

    async def delete_workflow(self, workflow_id: str, user_id: str) -> bool:
        """Delete a workflow"""
        self._ensure_client()
        try:
            # First delete related executions
            await self._delete_workflow_executions(workflow_id, user_id)
            
            # Then delete the workflow
            result = self.client.table('workflows').delete().eq('id', workflow_id).eq('user_id', user_id).execute()
            
            logger.info(f"✅ Deleted workflow {workflow_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to delete workflow {workflow_id}: {e}")
            return False

    # Execution Management
    async def create_execution(self, workflow_id: str, user_id: str, inputs: dict) -> dict:
        """Create a workflow execution record"""
        self._ensure_client()
        try:
            result = self.client.table('executions').insert({
                'workflow_id': workflow_id,
                'user_id': user_id,
                'inputs': json.dumps(inputs),
                'status': 'running',
                'started_at': datetime.utcnow().isoformat()
            }).execute()
            
            if result.data:
                logger.info(f"✅ Created execution for workflow {workflow_id}")
                return result.data[0]
            else:
                raise ValueError("No data returned from execution creation")
                
        except Exception as e:
            logger.error(f"❌ Failed to create execution: {e}")
            raise

    async def update_execution(self, execution_id: str, status: str, outputs: dict = None, error: str = None):
        """Update execution status and results"""
        self._ensure_client()
        try:
            update_data = {
                'status': status,
                'completed_at': datetime.utcnow().isoformat()
            }
            
            if outputs:
                update_data['outputs'] = json.dumps(outputs)
            if error:
                update_data['error'] = error
                
            self.client.table('executions').update(update_data).eq('id', execution_id).execute()
            logger.debug(f"Updated execution {execution_id} with status {status}")
            
        except Exception as e:
            logger.error(f"❌ Failed to update execution {execution_id}: {e}")

    async def get_workflow_executions(self, workflow_id: str, user_id: str, limit: int = 10, offset: int = 0) -> List[dict]:
        """Get executions for a workflow"""
        self._ensure_client()
        try:
            result = self.client.table('executions').select('*').eq('workflow_id', workflow_id).eq('user_id', user_id).order('started_at', desc=True).range(offset, offset + limit - 1).execute()
            
            executions = result.data or []
            
            # Parse JSON fields
            for execution in executions:
                for field in ['inputs', 'outputs']:
                    if execution.get(field):
                        try:
                            execution[field] = json.loads(execution[field])
                        except json.JSONDecodeError:
                            execution[field] = {}
            
            return executions
            
        except Exception as e:
            logger.error(f"❌ Failed to get executions: {e}")
            return []

    async def _delete_workflow_executions(self, workflow_id: str, user_id: str):
        """Delete all executions for a workflow"""
        try:
            self.client.table('executions').delete().eq('workflow_id', workflow_id).eq('user_id', user_id).execute()
        except Exception as e:
            logger.warning(f"Failed to delete executions for workflow {workflow_id}: {e}")

    # Custom Nodes Management
    async def create_custom_node(self, user_id: str, data: dict) -> dict:
        """Create a custom node"""
        self._ensure_client()
        try:
            result = self.client.table('custom_nodes').insert({
                'user_id': user_id,
                'name': data['name'],
                'description': data['description'],
                'category': data['category'],
                'config': json.dumps(data['config']),
                'code': data['code'],
                'is_public': data.get('is_public', False),
                'version': data.get('version', '1.0.0'),
                'created_at': datetime.utcnow().isoformat()
            }).execute()
            
            if result.data:
                logger.info(f"✅ Created custom node: {data['name']}")
                return result.data[0]
            else:
                raise ValueError("No data returned from custom node creation")
                
        except Exception as e:
            logger.error(f"❌ Failed to create custom node: {e}")
            raise

    async def get_custom_nodes(self, user_id: str = None) -> List[dict]:
        """Get custom nodes (public and user's own)"""
        self._ensure_client()
        try:
            query = self.client.table('custom_nodes').select('*')
            
            if user_id:
                # Get user's nodes and public nodes
                query = query.or_(f'user_id.eq.{user_id},is_public.eq.true')
            else:
                # Get only public nodes
                query = query.eq('is_public', True)
            
            result = query.order('created_at', desc=True).execute()
            nodes = result.data or []
            
            # Parse config JSON
            for node in nodes:
                if node.get('config'):
                    try:
                        node['config'] = json.loads(node['config'])
                    except json.JSONDecodeError:
                        node['config'] = {}
            
            return nodes
            
        except Exception as e:
            logger.error(f"❌ Failed to get custom nodes: {e}")
            return []

    async def get_custom_node(self, node_id: str) -> Optional[dict]:
        """Get a specific custom node"""
        self._ensure_client()
        try:
            result = self.client.table('custom_nodes').select('*').eq('id', node_id).single().execute()
            
            if result.data:
                node = result.data
                if node.get('config'):
                    try:
                        node['config'] = json.loads(node['config'])
                    except json.JSONDecodeError:
                        node['config'] = {}
                return node
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Failed to get custom node {node_id}: {e}")
            return None

    async def delete_custom_node(self, node_id: str, user_id: str) -> bool:
        """Delete a custom node"""
        self._ensure_client()
        try:
            result = self.client.table('custom_nodes').delete().eq('id', node_id).eq('user_id', user_id).execute()
            logger.info(f"✅ Deleted custom node {node_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to delete custom node {node_id}: {e}")
            return False

    # Health and Statistics
    async def get_stats(self, user_id: str = None) -> Dict[str, Any]:
        """Get database statistics"""
        if not self.client:
            return {"error": "Database not available"}
        
        try:
            stats = {}
            
            if user_id:
                # User-specific stats
                workflows_result = self.client.table('workflows').select('id').eq('user_id', user_id).execute()
                executions_result = self.client.table('executions').select('id').eq('user_id', user_id).execute()
                nodes_result = self.client.table('custom_nodes').select('id').eq('user_id', user_id).execute()
                
                stats.update({
                    'user_workflows': len(workflows_result.data or []),
                    'user_executions': len(executions_result.data or []),
                    'user_custom_nodes': len(nodes_result.data or [])
                })
            
            # Global stats (if no user_id specified)
            if not user_id:
                total_workflows = self.client.table('workflows').select('id').execute()
                total_executions = self.client.table('executions').select('id').execute()
                total_nodes = self.client.table('custom_nodes').select('id').execute()
                
                stats.update({
                    'total_workflows': len(total_workflows.data or []),
                    'total_executions': len(total_executions.data or []),
                    'total_custom_nodes': len(total_nodes.data or [])
                })
            
            return stats
            
        except Exception as e:
            logger.error(f"❌ Failed to get stats: {e}")
            return {"error": str(e)}

    # === ASYNC TASK MANAGEMENT METHODS ===
    
    async def create_task(self, user_id: str, celery_task_id: str, task_type: str, data: dict) -> dict:
        """Create a new async task record"""
        self._ensure_client()
        try:
            task_data = {
                'celery_task_id': celery_task_id,
                'user_id': user_id,
                'task_type': task_type,
                'inputs': json.dumps(data.get('inputs', {})),
                'priority': data.get('priority', 5),
                'max_retries': data.get('max_retries', 3),
                'created_at': datetime.utcnow().isoformat()
            }
            
            if data.get('workflow_id'):
                task_data['workflow_id'] = data['workflow_id']
            if data.get('retry_policy'):
                task_data['retry_policy'] = json.dumps(data['retry_policy'])
            
            result = self.client.table('async_tasks').insert(task_data).execute()
            
            if result.data:
                task = result.data[0]
                # Parse JSON fields
                task['inputs'] = json.loads(task['inputs'])
                if task.get('retry_policy'):
                    task['retry_policy'] = json.loads(task['retry_policy'])
                logger.info(f"✅ Created task {task['id']} (Celery: {celery_task_id})")
                return task
            else:
                raise ValueError("No data returned from task creation")
                
        except Exception as e:
            logger.error(f"❌ Failed to create task: {e}")
            raise

    async def get_task_by_celery_id(self, celery_task_id: str) -> Optional[dict]:
        """Get task by Celery task ID"""
        self._ensure_client()
        try:
            result = self.client.table('async_tasks').select('*').eq('celery_task_id', celery_task_id).single().execute()
            
            if result.data:
                task = result.data
                # Parse JSON fields
                if task.get('inputs'):
                    task['inputs'] = json.loads(task['inputs'])
                if task.get('result'):
                    task['result'] = json.loads(task['result'])
                if task.get('retry_policy'):
                    task['retry_policy'] = json.loads(task['retry_policy'])
                return task
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Failed to get task by Celery ID {celery_task_id}: {e}")
            return None

    async def get_task(self, task_id: str, user_id: str) -> Optional[dict]:
        """Get task by ID"""
        self._ensure_client()
        try:
            result = self.client.table('async_tasks').select('*').eq('id', task_id).eq('user_id', user_id).single().execute()
            
            if result.data:
                task = result.data
                # Parse JSON fields
                if task.get('inputs'):
                    task['inputs'] = json.loads(task['inputs'])
                if task.get('result'):
                    task['result'] = json.loads(task['result'])
                if task.get('retry_policy'):
                    task['retry_policy'] = json.loads(task['retry_policy'])
                return task
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Failed to get task {task_id}: {e}")
            return None

    async def update_task(self, task_id: str, data: dict) -> bool:
        """Update task status and data"""
        self._ensure_client()
        try:
            update_data = {}
            
            # Handle simple fields
            for field in ['status', 'progress', 'current_step', 'error', 'retry_count']:
                if field in data:
                    update_data[field] = data[field]
            
            # Handle JSON fields
            if 'result' in data:
                update_data['result'] = json.dumps(data['result'])
            
            # Update timestamps based on status
            if 'status' in data:
                if data['status'] == 'started' and 'started_at' not in update_data:
                    update_data['started_at'] = datetime.utcnow().isoformat()
                elif data['status'] in ['success', 'failure', 'revoked']:
                    update_data['completed_at'] = datetime.utcnow().isoformat()
            
            result = self.client.table('async_tasks').update(update_data).eq('id', task_id).execute()
            logger.debug(f"Updated task {task_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to update task {task_id}: {e}")
            return False

    async def list_user_tasks(self, user_id: str, limit: int = 20, offset: int = 0, 
                             status: Optional[str] = None, task_type: Optional[str] = None) -> dict:
        """List user tasks with filtering and pagination"""
        self._ensure_client()
        try:
            query = self.client.table('async_tasks').select('*').eq('user_id', user_id)
            
            # Apply filters
            if status:
                query = query.eq('status', status)
            if task_type:
                query = query.eq('task_type', task_type)
            
            # Get total count for pagination
            count_result = self.client.table('async_tasks').select('id', count='exact').eq('user_id', user_id)
            if status:
                count_result = count_result.eq('status', status)
            if task_type:
                count_result = count_result.eq('task_type', task_type)
            count_result = count_result.execute()
            total = count_result.count
            
            # Get tasks with pagination
            result = query.order('created_at', desc=True).range(offset, offset + limit - 1).execute()
            tasks = result.data or []
            
            # Parse JSON fields
            for task in tasks:
                if task.get('inputs'):
                    task['inputs'] = json.loads(task['inputs'])
                if task.get('result'):
                    task['result'] = json.loads(task['result'])
                if task.get('retry_policy'):
                    task['retry_policy'] = json.loads(task['retry_policy'])
            
            return {
                'tasks': tasks,
                'total': total,
                'page': (offset // limit) + 1,
                'per_page': limit,
                'has_next': (offset + limit) < total
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to list tasks for user {user_id}: {e}")
            return {'tasks': [], 'total': 0, 'page': 1, 'per_page': limit, 'has_next': False}

    async def get_task_statistics(self, user_id: str, task_type: Optional[str] = None) -> dict:
        """Get task statistics for user"""
        self._ensure_client()
        try:
            query = self.client.table('task_statistics').select('*').eq('user_id', user_id)
            
            if task_type:
                query = query.eq('task_type', task_type)
            
            result = query.execute()
            
            if result.data:
                # Aggregate data if multiple task types
                stats = {
                    'total_tasks': sum(row['total_tasks'] for row in result.data),
                    'pending_tasks': sum(row['pending_tasks'] for row in result.data),
                    'running_tasks': sum(row['running_tasks'] for row in result.data),
                    'completed_tasks': sum(row['completed_tasks'] for row in result.data),
                    'failed_tasks': sum(row['failed_tasks'] for row in result.data),
                    'average_execution_time': None,
                    'success_rate': None
                }
                
                # Calculate weighted averages
                total_completed = stats['completed_tasks'] + stats['failed_tasks']
                if total_completed > 0:
                    weighted_exec_time = sum(
                        (row['avg_execution_time'] or 0) * (row['completed_tasks'] + row['failed_tasks'])
                        for row in result.data if row['avg_execution_time']
                    ) / total_completed if any(row['avg_execution_time'] for row in result.data) else None
                    
                    stats['average_execution_time'] = weighted_exec_time
                    stats['success_rate'] = (stats['completed_tasks'] / total_completed) * 100
                
                return stats
            else:
                # Return empty stats
                return {
                    'total_tasks': 0,
                    'pending_tasks': 0,
                    'running_tasks': 0,
                    'completed_tasks': 0,
                    'failed_tasks': 0,
                    'average_execution_time': None,
                    'success_rate': None
                }
                
        except Exception as e:
            logger.error(f"❌ Failed to get task statistics: {e}")
            return {
                'total_tasks': 0,
                'pending_tasks': 0,
                'running_tasks': 0,
                'completed_tasks': 0,
                'failed_tasks': 0,
                'average_execution_time': None,
                'success_rate': None
            }

    async def add_task_log(self, task_id: str, level: str, message: str, 
                          details: Optional[dict] = None, node_id: Optional[str] = None,
                          step_number: Optional[int] = None) -> bool:
        """Add log entry for task execution"""
        self._ensure_client()
        try:
            log_data = {
                'task_id': task_id,
                'level': level.upper(),
                'message': message,
                'created_at': datetime.utcnow().isoformat()
            }
            
            if details:
                log_data['details'] = json.dumps(details)
            if node_id:
                log_data['node_id'] = node_id
            if step_number is not None:
                log_data['step_number'] = step_number
            
            self.client.table('task_execution_logs').insert(log_data).execute()
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to add task log: {e}")
            return False

    async def get_task_logs(self, task_id: str, user_id: str, limit: int = 100) -> List[dict]:
        """Get execution logs for a task"""
        self._ensure_client()
        try:
            # Verify user owns the task
            task = await self.get_task(task_id, user_id)
            if not task:
                return []
            
            result = self.client.table('task_execution_logs').select('*').eq('task_id', task_id).order('created_at', desc=False).limit(limit).execute()
            
            logs = result.data or []
            
            # Parse details JSON
            for log in logs:
                if log.get('details'):
                    try:
                        log['details'] = json.loads(log['details'])
                    except json.JSONDecodeError:
                        log['details'] = {}
            
            return logs
            
        except Exception as e:
            logger.error(f"❌ Failed to get task logs: {e}")
            return []

    async def cleanup_old_tasks(self) -> int:
        """Clean up old completed tasks"""
        self._ensure_client()
        try:
            # Use the database function
            result = self.client.rpc('cleanup_old_tasks').execute()
            deleted_count = result.data if result.data is not None else 0
            logger.info(f"✅ Cleaned up {deleted_count} old tasks")
            return deleted_count
            
        except Exception as e:
            logger.error(f"❌ Failed to cleanup old tasks: {e}")
            return 0

# Global database instance
db = Database() if settings.SUPABASE_URL and settings.SUPABASE_KEY else None

# Export for backwards compatibility
__all__ = ['Database', 'db']
