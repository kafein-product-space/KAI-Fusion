"""Execution Service for Agent-Flow V2.

Handles workflow execution tracking, status management,
result processing, and execution-related business logic.
"""

import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID
import json

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories import ExecutionRepository, WorkflowRepository
from app.db.models import (
    Execution, ExecutionCreate, ExecutionUpdate, 
    ExecutionStatus, Workflow
)
from .base import BaseService, ValidationError, NotFoundError, BusinessRuleError

logger = logging.getLogger(__name__)


class ExecutionService(BaseService):
    """Service for execution management and tracking."""
    
    def __init__(
        self, 
        execution_repository: ExecutionRepository,
        workflow_repository: WorkflowRepository
    ):
        super().__init__(execution_repository)
        self.workflow_repository = workflow_repository
        self.model_name = "Execution"
    
    # Execution Management
    
    async def get_execution_details(
        self,
        session: AsyncSession,
        execution_id: UUID,
        user_id: UUID
    ) -> Execution:
        """Get execution details with access control.
        
        Args:
            session: Database session
            execution_id: Execution ID
            user_id: User requesting access
            
        Returns:
            Execution instance
            
        Raises:
            NotFoundError: If execution not found
            ValidationError: If user lacks access
        """
        try:
            execution = await self.get_by_id(session, execution_id)
            
            # Check if user has access to this execution
            await self._check_execution_access(session, execution, user_id)
            
            return execution
            
        except (NotFoundError, ValidationError):
            raise
        except Exception as e:
            self.logger.error(f"Error getting execution details: {e}")
            raise ValidationError("Failed to get execution details")
    
    async def update_execution_status(
        self,
        session: AsyncSession,
        execution_id: UUID,
        status: ExecutionStatus,
        outputs: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None,
        progress: Optional[float] = None
    ) -> Execution:
        """Update execution status and results.
        
        Args:
            session: Database session
            execution_id: Execution ID
            status: New execution status
            outputs: Execution outputs (for completed executions)
            error: Error message (for failed executions)
            progress: Execution progress (0.0-1.0)
            
        Returns:
            Updated execution instance
        """
        try:
            execution = await self.get_by_id(session, execution_id)
            
            # Validate status transition
            await self._validate_status_transition(execution.status, status)
            
            # Prepare update data
            update_data = {
                'status': status,
                'updated_at': datetime.utcnow()
            }
            
            if outputs is not None:
                update_data['outputs'] = outputs
            
            if error is not None:
                update_data['error'] = error
                
            if progress is not None:
                # Validate progress value
                if not 0.0 <= progress <= 1.0:
                    raise ValidationError("Progress must be between 0.0 and 1.0")
                update_data['progress'] = progress
            
            # Set completion timestamp for final states
            if status in [ExecutionStatus.COMPLETED, ExecutionStatus.FAILED, ExecutionStatus.CANCELLED]:
                update_data['completed_at'] = datetime.utcnow()
                if progress is None:
                    update_data['progress'] = 1.0 if status == ExecutionStatus.COMPLETED else None
            
            # Set started timestamp if transitioning to running
            if status == ExecutionStatus.RUNNING and execution.status == ExecutionStatus.PENDING:
                update_data['started_at'] = datetime.utcnow()
            
            # Update execution
            updated_execution = await self.repository.update(
                session,
                db_obj=execution,
                obj_in=ExecutionUpdate(**update_data)
            )
            
            self.logger.info(f"Updated execution {execution_id} status to {status.value}")
            return updated_execution
            
        except ValidationError:
            raise
        except Exception as e:
            self.logger.error(f"Error updating execution status: {e}")
            raise ValidationError("Failed to update execution status")
    
    async def cancel_execution(
        self,
        session: AsyncSession,
        execution_id: UUID,
        user_id: UUID
    ) -> Execution:
        """Cancel a running execution.
        
        Args:
            session: Database session
            execution_id: Execution ID
            user_id: User requesting cancellation
            
        Returns:
            Updated execution instance
        """
        try:
            execution = await self.get_by_id(session, execution_id)
            
            # Check if user can cancel this execution
            await self._check_execution_access(session, execution, user_id)
            
            # Check if execution can be cancelled
            if execution.status not in [ExecutionStatus.PENDING, ExecutionStatus.RUNNING]:
                raise ValidationError("Cannot cancel execution in current state")
            
            # Update status to cancelled
            return await self.update_execution_status(
                session, 
                execution_id, 
                ExecutionStatus.CANCELLED
            )
            
        except ValidationError:
            raise
        except Exception as e:
            self.logger.error(f"Error cancelling execution: {e}")
            raise ValidationError("Failed to cancel execution")
    
    async def retry_execution(
        self,
        session: AsyncSession,
        execution_id: UUID,
        user_id: UUID,
        new_inputs: Optional[Dict[str, Any]] = None
    ) -> Execution:
        """Retry a failed execution.
        
        Args:
            session: Database session
            execution_id: Original execution ID
            user_id: User requesting retry
            new_inputs: Optional new inputs for retry
            
        Returns:
            New execution instance
        """
        try:
            original_execution = await self.get_by_id(session, execution_id)
            
            # Check access
            await self._check_execution_access(session, original_execution, user_id)
            
            # Check if execution can be retried
            if original_execution.status != ExecutionStatus.FAILED:
                raise ValidationError("Can only retry failed executions")
            
            # Use new inputs if provided, otherwise use original inputs
            inputs = new_inputs if new_inputs is not None else original_execution.inputs
            
            # Create new execution
            retry_data = {
                'workflow_id': original_execution.workflow_id,
                'user_id': original_execution.user_id,
                'inputs': inputs,
                'status': ExecutionStatus.PENDING,
                'created_at': datetime.utcnow()
            }
            
            new_execution = await self.repository.create(
                session, obj_in=ExecutionCreate(**retry_data)
            )
            
            self.logger.info(f"Created retry execution {new_execution.id} for {execution_id}")
            return new_execution
            
        except ValidationError:
            raise
        except Exception as e:
            self.logger.error(f"Error retrying execution: {e}")
            raise ValidationError("Failed to retry execution")
    
    # Execution Querying
    
    async def get_user_executions(
        self,
        session: AsyncSession,
        user_id: UUID,
        status: Optional[ExecutionStatus] = None,
        workflow_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Execution]:
        """Get executions for a user with optional filtering."""
        try:
            filters = {"user_id": str(user_id)}
            
            if status:
                filters["status"] = status.value
                
            if workflow_id:
                filters["workflow_id"] = str(workflow_id)
            
            return await self.repository.get_multi(
                session,
                skip=skip,
                limit=limit,
                filters=filters,
                order_by="created_at",
                order_desc=True
            )
            
        except Exception as e:
            self.logger.error(f"Error getting user executions: {e}")
            raise ValidationError("Failed to get user executions")
    
    async def get_workflow_executions(
        self,
        session: AsyncSession,
        workflow_id: UUID,
        user_id: UUID,
        status: Optional[ExecutionStatus] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Execution]:
        """Get executions for a specific workflow."""
        try:
            # Check if user has access to the workflow
            workflow = await self.workflow_repository.get(session, workflow_id)
            if not workflow:
                raise NotFoundError("Workflow not found")
            
            if str(workflow.user_id) != str(user_id) and not workflow.is_public:
                raise ValidationError("Access denied to workflow executions")
            
            filters = {"workflow_id": str(workflow_id)}
            
            if status:
                filters["status"] = status.value
            
            return await self.repository.get_multi(
                session,
                skip=skip,
                limit=limit,
                filters=filters,
                order_by="created_at",
                order_desc=True
            )
            
        except (NotFoundError, ValidationError):
            raise
        except Exception as e:
            self.logger.error(f"Error getting workflow executions: {e}")
            raise ValidationError("Failed to get workflow executions")
    
    async def get_execution_statistics(
        self,
        session: AsyncSession,
        user_id: UUID,
        workflow_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """Get execution statistics for a user or workflow."""
        try:
            filters = {"user_id": str(user_id)}
            if workflow_id:
                filters["workflow_id"] = str(workflow_id)
            
            # Get all executions
            executions = await self.repository.get_multi(
                session, 
                filters=filters,
                limit=1000  # Should use proper aggregation queries in production
            )
            
            # Calculate statistics
            total = len(executions)
            status_counts = {}
            
            for execution in executions:
                status = execution.status.value if hasattr(execution.status, 'value') else execution.status
                status_counts[status] = status_counts.get(status, 0) + 1
            
            # Calculate success rate
            completed = status_counts.get(ExecutionStatus.COMPLETED.value, 0)
            failed = status_counts.get(ExecutionStatus.FAILED.value, 0)
            success_rate = (completed / (completed + failed)) * 100 if (completed + failed) > 0 else 0
            
            return {
                "total_executions": total,
                "status_counts": status_counts,
                "success_rate": round(success_rate, 2),
                "completed": completed,
                "failed": failed,
                "running": status_counts.get(ExecutionStatus.RUNNING.value, 0),
                "pending": status_counts.get(ExecutionStatus.PENDING.value, 0),
                "cancelled": status_counts.get(ExecutionStatus.CANCELLED.value, 0)
            }
            
        except Exception as e:
            self.logger.error(f"Error getting execution statistics: {e}")
            raise ValidationError("Failed to get execution statistics")
    
    # Validation hooks implementation
    
    async def _validate_create(
        self, 
        session: AsyncSession, 
        obj_in: Any, 
        user_id: Optional[UUID]
    ) -> None:
        """Validate execution creation."""
        if hasattr(obj_in, 'workflow_id'):
            # Check if workflow exists and user has access
            workflow = await self.workflow_repository.get(session, obj_in.workflow_id)
            if not workflow:
                raise ValidationError("Workflow not found")
            
            if user_id and str(workflow.user_id) != str(user_id) and not workflow.is_public:
                raise ValidationError("Access denied to workflow")
    
    async def _validate_update(
        self,
        session: AsyncSession,
        model: Any,
        obj_in: Any,
        user_id: Optional[UUID]
    ) -> None:
        """Validate execution update."""
        # Only system or execution owner can update
        if user_id and str(model.user_id) != str(user_id):
            raise ValidationError("Can only update own executions")
    
    async def _validate_delete(
        self,
        session: AsyncSession,
        model: Any,
        user_id: Optional[UUID]
    ) -> None:
        """Validate execution deletion."""
        # Only allow deletion of completed/failed/cancelled executions
        if model.status in [ExecutionStatus.PENDING, ExecutionStatus.RUNNING]:
            raise BusinessRuleError("Cannot delete active execution")
    
    # Private utility methods
    
    async def _check_execution_access(
        self,
        session: AsyncSession,
        execution: Execution,
        user_id: UUID
    ) -> None:
        """Check if user has access to execution."""
        # User can access their own executions
        if str(execution.user_id) == str(user_id):
            return
        
        # Check if execution's workflow is public
        workflow = await self.workflow_repository.get(session, execution.workflow_id)
        if workflow and workflow.is_public:
            return
        
        raise ValidationError("Access denied to execution")
    
    async def _validate_status_transition(
        self,
        current_status: ExecutionStatus,
        new_status: ExecutionStatus
    ) -> None:
        """Validate execution status transition."""
        # Define valid transitions
        valid_transitions = {
            ExecutionStatus.PENDING: [ExecutionStatus.RUNNING, ExecutionStatus.CANCELLED],
            ExecutionStatus.RUNNING: [ExecutionStatus.COMPLETED, ExecutionStatus.FAILED, ExecutionStatus.CANCELLED],
            ExecutionStatus.COMPLETED: [],  # Terminal state
            ExecutionStatus.FAILED: [],     # Terminal state
            ExecutionStatus.CANCELLED: []   # Terminal state
        }
        
        if new_status not in valid_transitions.get(current_status, []):
            raise ValidationError(
                f"Invalid status transition from {current_status.value} to {new_status.value}"
            ) 