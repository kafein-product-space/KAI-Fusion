"""
Workflow Executor Service
=========================

Centralized service for workflow execution that can be used by both API endpoints
and webhook triggers. Provides common functionality for:
- User context management
- Execution record management
- Workflow execution (build + execute)
- Error handling and status updates
"""

import logging
import secrets
import string
import time
import uuid
from datetime import datetime
from typing import Any, Dict, Optional, Union, AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.workflow import Workflow
from app.models.user import User
from app.models.execution import WorkflowExecution
from app.schemas.execution import WorkflowExecutionCreate, WorkflowExecutionUpdate
from app.schemas.auth import UserSignUpData
from app.services.user_service import UserService
from app.services.execution_service import ExecutionService

logger = logging.getLogger(__name__)


# Webhook user email for webhook-triggered executions
WEBHOOK_USER_EMAIL = "webhook@kai-fusion.ai"


class WorkflowExecutionContext:
    """Context object for workflow execution"""
    
    def __init__(
        self,
        workflow: Workflow,
        user: User,
        session_id: str,
        user_context: Dict[str, Any],
        execution_inputs: Dict[str, Any],
        execution_id: Optional[uuid.UUID] = None,
    ):
        self.workflow = workflow
        self.user = user
        self.session_id = session_id
        self.user_context = user_context
        self.execution_inputs = execution_inputs
        self.execution_id = execution_id


class WorkflowExecutionResult:
    """Result object for workflow execution"""
    
    def __init__(
        self,
        execution_id: Optional[uuid.UUID] = None,
        success: bool = True,
        error: Optional[str] = None,
        result: Optional[Any] = None,
    ):
        self.execution_id = execution_id
        self.success = success
        self.error = error
        self.result = result


class WorkflowExecutor:
    """
    Centralized executor for workflow execution.
    
    This service provides common functionality for executing workflows from
    different entry points (API endpoints, webhook triggers, etc.).
    """
    
    def __init__(self):
        self.user_service = UserService()
        self.execution_service = ExecutionService()
        # Don't initialize workflow_enhancer at init time to avoid circular imports
        self._workflow_enhancer = None
    
    @property
    def workflow_enhancer(self):
        """Lazy property to get workflow enhancer (avoids circular imports)"""
        if self._workflow_enhancer is None:
            from app.core.workflow_enhancer import get_workflow_enhancer
            self._workflow_enhancer = get_workflow_enhancer()
        return self._workflow_enhancer
    
    async def get_or_create_master_user(self, db: AsyncSession) -> User:
        """
        Get or create master user for system operations (e.g., webhook executions).
        
        Args:
            db: Database session
            
        Returns:
            User object for master account
        """
        user = await self.user_service.get_by_email(db, email=WEBHOOK_USER_EMAIL)
        
        if not user:
            # Create master user if not exists
            random_password = "".join(
                secrets.choice(string.ascii_letters + string.digits) for _ in range(32)
            )
            user = await self.user_service.create_user(
                db,
                UserSignUpData(
                    email=WEBHOOK_USER_EMAIL,
                    name="Master API Key",
                    credential=random_password,
                ),
            )
            logger.info(f"Created master user for system operations: {WEBHOOK_USER_EMAIL}")
        else:
            logger.debug(f"Using existing master user: {WEBHOOK_USER_EMAIL}")
        
        return user
    
    def prepare_user_context(
        self,
        user: User,
        session_id: str,
        workflow_id: Optional[uuid.UUID] = None,
        is_webhook: bool = False,
        owner_id: Optional[uuid.UUID] = None,
    ) -> Dict[str, Any]:
        """
        Prepare user context for workflow execution.
        
        Args:
            user: User object
            session_id: Session identifier
            workflow_id: Optional workflow ID
            is_webhook: Whether this is a webhook-triggered execution
            owner_id: Optional owner ID (defaults to user.id)
            
        Returns:
            User context dictionary
        """
        return {
            "session_id": session_id,
            "user_id": str(user.id),
            "owner_id": str(owner_id or user.id),
            "user_email": user.email,
            "workflow_id": str(workflow_id) if workflow_id else None,
            "is_webhook": is_webhook,
        }
    
    async def create_execution_record(
        self,
        db: AsyncSession,
        workflow: Workflow,
        user: User,
        execution_inputs: Dict[str, Any],
        clean_pending: bool = True,
    ) -> WorkflowExecution:
        """
        Create execution record in database.
        
        Args:
            db: Database session
            workflow: Workflow object
            user: User object
            execution_inputs: Input data for execution
            clean_pending: Whether to clean up pending/running executions first
            
        Returns:
            Created WorkflowExecution object
        """
        # Clean up pending/running executions if requested
        if clean_pending:
            try:
                existing_execution_query = select(WorkflowExecution).filter(
                    WorkflowExecution.workflow_id == workflow.id,
                    WorkflowExecution.user_id == user.id,
                    WorkflowExecution.status.in_(["pending", "running"])
                ).order_by(WorkflowExecution.created_at.desc())
                
                existing_result = await db.execute(existing_execution_query)
                existing_executions = existing_result.scalars().all()
                
                for old_execution in existing_executions:
                    try:
                        await db.delete(old_execution)
                    except Exception as delete_error:
                        logger.warning(f"Failed to delete old execution {old_execution.id}: {delete_error}")
                
                await db.commit()
            except Exception as e:
                logger.warning(f"Error cleaning up old executions: {e}")
                await db.rollback()
        
        # Create new execution record
        execution_create = WorkflowExecutionCreate(
            workflow_id=workflow.id,
            user_id=user.id,
            status="pending",
            inputs=execution_inputs,
        )
        
        execution = await self.execution_service.create_execution(db, execution_in=execution_create)
        logger.info(f"Created execution record: {execution.id} for workflow {workflow.id}")
        
        return execution
    
    async def update_execution_status(
        self,
        db: AsyncSession,
        execution_id: uuid.UUID,
        status: str,
        error_message: Optional[str] = None,
        outputs: Optional[Dict[str, Any]] = None,
        started_at: Optional[datetime] = None,
        completed_at: Optional[datetime] = None,
    ) -> WorkflowExecution:
        """
        Update execution record status.
        
        Args:
            db: Database session
            execution_id: Execution ID
            status: New status (e.g., "running", "completed", "failed")
            error_message: Optional error message
            outputs: Optional output data
            started_at: Optional start timestamp
            completed_at: Optional completion timestamp
            
        Returns:
            Updated WorkflowExecution object
        """
        update_data = WorkflowExecutionUpdate(
            status=status,
            error_message=error_message,
            outputs=outputs,
            started_at=started_at,
            completed_at=completed_at,
        )
        
        execution = await self.execution_service.update_execution(
            db, execution_id, update_data
        )
        logger.debug(f"Updated execution {execution_id} status to {status}")
        
        return execution
    
    async def prepare_execution_context(
        self,
        db: AsyncSession,
        workflow: Workflow,
        execution_inputs: Dict[str, Any],
        user: Optional[User] = None,
        session_id: Optional[str] = None,
        is_webhook: bool = False,
        owner_id: Optional[uuid.UUID] = None,
    ) -> WorkflowExecutionContext:
        """
        Prepare complete execution context.
        
        Args:
            db: Database session
            workflow: Workflow object
            execution_inputs: Input data for execution
            user: Optional user (will use master user if not provided and is_webhook)
            session_id: Optional session ID (will generate if not provided)
            is_webhook: Whether this is a webhook-triggered execution
            owner_id: Optional owner ID
            
        Returns:
            WorkflowExecutionContext object
        """
        # Get or create user
        if not user:
            if is_webhook:
                user = await self.get_or_create_master_user(db)
            else:
                raise ValueError("User must be provided for non-webhook executions")
        
        # Generate session_id if not provided
        if not session_id:
            if is_webhook:
                session_id = f"webhook_{workflow.id}_{int(time.time())}"
            else:
                session_id = str(uuid.uuid4())
        
        # Prepare user context
        user_context = self.prepare_user_context(
            user=user,
            session_id=session_id,
            workflow_id=workflow.id,
            is_webhook=is_webhook,
            owner_id=owner_id or workflow.user_id,
        )
        
        return WorkflowExecutionContext(
            workflow=workflow,
            user=user,
            session_id=session_id,
            user_context=user_context,
            execution_inputs=execution_inputs,
        )
    
    async def execute_workflow(
        self,
        ctx: WorkflowExecutionContext,
        db: AsyncSession,
        stream: bool = False,
    ) -> Union[Dict[str, Any], AsyncGenerator]:
        """
        Execute workflow using the engine.
        Always creates and tracks execution records in the database.
        
        Args:
            ctx: WorkflowExecutionContext containing workflow, user, and execution inputs
            db: Database session (required for execution tracking)
            stream: Whether to stream results (default: False)
            
        Returns:
            Execution result (dict if stream=False, AsyncGenerator if stream=True)
            
        Raises:
            RuntimeError: If workflow execution fails
        """
        execution_id = ctx.execution_id
        
        # Create execution record if not already exists
        if not execution_id:
            execution = await self.create_execution_record(
                db,
                ctx.workflow,
                ctx.user,
                ctx.execution_inputs,
                clean_pending=True,
            )
            execution_id = execution.id
            ctx.execution_id = execution_id
        
        # Update status to running
        try:
            await self.update_execution_status(
                db,
                execution_id,
                status="running",
                started_at=datetime.utcnow(),
            )
        except Exception as e:
            logger.error(f"Failed to update execution status to running: {e}")
            # Continue execution even if status update fails
        
        try:
            # Build workflow using enhancer
            self.workflow_enhancer.enhanced_build(
                flow_data=ctx.workflow.flow_data,
                user_context=ctx.user_context,
            )
            
            # Execute workflow using enhancer
            logger.info(f"Starting workflow execution: workflow={ctx.workflow.id}, session={ctx.session_id}")
            
            result = await self.workflow_enhancer.enhanced_execute(
                inputs=ctx.execution_inputs,
                stream=stream,
                user_context=ctx.user_context,
            )
            
            logger.info(f"Workflow execution completed: workflow={ctx.workflow.id}")
            
            # Update execution status to completed
            try:
                # For streaming results, we might want to handle this differently
                # For now, update when execution completes
                outputs = result if isinstance(result, dict) and not stream else {"result": "streamed"}
                
                await self.update_execution_status(
                    db,
                    execution_id,
                    status="completed",
                    outputs=outputs,
                    completed_at=datetime.utcnow(),
                )
            except Exception as e:
                logger.error(f"Failed to update execution status to completed: {e}")
            
            return result
            
        except Exception as e:
            logger.error(f"Workflow execution failed: {e}", exc_info=True)
            
            # Update execution status to failed
            try:
                await self.update_execution_status(
                    db,
                    execution_id,
                    status="failed",
                    error_message=str(e),
                    completed_at=datetime.utcnow(),
                )
            except Exception as update_error:
                logger.error(f"Failed to update execution status to failed: {update_error}")
            
            raise


# Global instance for dependency injection
_workflow_executor = None


def get_workflow_executor() -> WorkflowExecutor:
    """Get global workflow executor instance"""
    global _workflow_executor
    if _workflow_executor is None:
        _workflow_executor = WorkflowExecutor()
    return _workflow_executor

