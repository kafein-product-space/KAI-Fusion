"""Workflow Service for Agent-Flow V2.

Handles workflow creation, management, execution orchestration,
sharing, versioning, and workflow-related business logic.
"""

import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4
import json

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories import WorkflowRepository, ExecutionRepository
from app.db.models import (
    Workflow, WorkflowCreate, WorkflowUpdate, 
    Execution, ExecutionCreate, ExecutionStatus
)
from .base import BaseService, ValidationError, NotFoundError, BusinessRuleError

logger = logging.getLogger(__name__)


class WorkflowService(BaseService):
    """Service for workflow management and execution."""
    
    def __init__(
        self, 
        workflow_repository: WorkflowRepository,
        execution_repository: ExecutionRepository
    ):
        super().__init__(workflow_repository)
        self.execution_repository = execution_repository
        self.model_name = "Workflow"
    
    # Workflow CRUD Operations
    
    async def create_workflow(
        self,
        session: AsyncSession,
        workflow_create: WorkflowCreate,
        user_id: UUID
    ) -> Workflow:
        """Create a new workflow.
        
        Args:
            session: Database session
            workflow_create: Workflow creation data
            user_id: Owner user ID
            
        Returns:
            Created workflow instance
        """
        try:
            # Validate flow data
            await self._validate_flow_data(workflow_create.flow_data)
            
            # Set workflow defaults
            workflow_data = workflow_create.model_dump()
            workflow_data.update({
                'user_id': str(user_id),
                'version': 1,
                'is_public': workflow_data.get('is_public', False),
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            })
            
            # Create workflow through repository
            workflow = await self.repository.create(session, obj_in=WorkflowCreate(**workflow_data))
            
            self.logger.info(f"Created workflow {workflow.name} for user {user_id}")
            return workflow
            
        except ValidationError:
            raise
        except Exception as e:
            self.logger.error(f"Error creating workflow: {e}")
            raise ValidationError("Failed to create workflow")
    
    async def get_user_workflows(
        self,
        session: AsyncSession,
        user_id: UUID,
        skip: int = 0,
        limit: int = 100,
        include_public: bool = False
    ) -> List[Workflow]:
        """Get workflows for a user.
        
        Args:
            session: Database session
            user_id: User ID
            skip: Number of records to skip
            limit: Maximum records to return
            include_public: Whether to include public workflows
            
        Returns:
            List of user workflows
        """
        filters = {"user_id": str(user_id)}
        
        if include_public:
            # Get both user workflows and public workflows
            user_workflows = await self.repository.get_multi(
                session, skip=skip, limit=limit, filters=filters
            )
            public_workflows = await self.repository.get_multi(
                session, skip=0, limit=50, filters={"is_public": True}
            )
            
            # Combine and deduplicate
            all_workflows = {w.id: w for w in user_workflows + public_workflows}
            return list(all_workflows.values())[:limit]
        
        return await self.repository.get_multi(
            session, skip=skip, limit=limit, filters=filters
        )
    
    async def get_public_workflows(
        self,
        session: AsyncSession,
        skip: int = 0,
        limit: int = 100
    ) -> List[Workflow]:
        """Get public workflows."""
        return await self.repository.get_multi(
            session, 
            skip=skip, 
            limit=limit, 
            filters={"is_public": True}
        )
    
    async def update_workflow(
        self,
        session: AsyncSession,
        workflow_id: UUID,
        workflow_update: WorkflowUpdate,
        user_id: UUID
    ) -> Workflow:
        """Update workflow."""
        try:
            # Get workflow with ownership check
            workflow = await self.get_by_id(session, workflow_id, user_id)
            
            # Validate flow data if provided
            if hasattr(workflow_update, 'flow_data') and workflow_update.flow_data:
                await self._validate_flow_data(workflow_update.flow_data)
            
            # Update timestamp
            update_data = workflow_update.model_dump(exclude_unset=True)
            update_data['updated_at'] = datetime.utcnow()
            
            # If flow_data changed, increment version
            if 'flow_data' in update_data:
                update_data['version'] = workflow.version + 1
            
            updated_workflow = await self.repository.update(
                session, 
                db_obj=workflow, 
                obj_in=WorkflowUpdate(**update_data)
            )
            
            self.logger.info(f"Updated workflow {workflow_id}")
            return updated_workflow
            
        except (NotFoundError, ValidationError):
            raise
        except Exception as e:
            self.logger.error(f"Error updating workflow: {e}")
            raise ValidationError("Failed to update workflow")
    
    async def clone_workflow(
        self,
        session: AsyncSession,
        workflow_id: UUID,
        user_id: UUID,
        new_name: Optional[str] = None
    ) -> Workflow:
        """Clone a workflow.
        
        Args:
            session: Database session
            workflow_id: Source workflow ID
            user_id: New owner user ID
            new_name: Optional new name for cloned workflow
            
        Returns:
            Cloned workflow instance
        """
        try:
            # Get source workflow (check if public or owned)
            workflow = await self.get_by_id(session, workflow_id)
            
            # Check if user can clone (owns it or it's public)
            if str(workflow.user_id) != str(user_id) and not workflow.is_public:
                raise ValidationError("Cannot clone private workflow")
            
            # Manual clone implementation
            clone_data = {
                'name': new_name or f"{workflow.name} (Copy)",
                'description': workflow.description,
                'flow_data': workflow.flow_data,
                'user_id': str(user_id),
                'version': 1,
                'is_public': False,  # Clones are private by default
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            }
            cloned_workflow = await self.repository.create(
                session, obj_in=WorkflowCreate(**clone_data)
            )
            
            self.logger.info(f"Cloned workflow {workflow_id} to {cloned_workflow.id}")
            return cloned_workflow
            
        except ValidationError:
            raise
        except Exception as e:
            self.logger.error(f"Error cloning workflow: {e}")
            raise ValidationError("Failed to clone workflow")
    
    async def share_workflow(
        self,
        session: AsyncSession,
        workflow_id: UUID,
        user_id: UUID,
        is_public: bool = True
    ) -> Workflow:
        """Share or unshare a workflow.
        
        Args:
            session: Database session
            workflow_id: Workflow ID
            user_id: Owner user ID
            is_public: Whether to make public
            
        Returns:
            Updated workflow
        """
        try:
            workflow_update = WorkflowUpdate(is_public=is_public)
            return await self.update_workflow(session, workflow_id, workflow_update, user_id)
            
        except Exception as e:
            self.logger.error(f"Error sharing workflow: {e}")
            raise ValidationError("Failed to update workflow sharing")
    
    # Workflow Execution
    
    async def execute_workflow(
        self,
        session: AsyncSession,
        workflow_id: UUID,
        inputs: Dict[str, Any],
        user_id: UUID
    ) -> Execution:
        """Start workflow execution.
        
        Args:
            session: Database session
            workflow_id: Workflow ID to execute
            inputs: Execution inputs
            user_id: User starting execution
            
        Returns:
            Created execution instance
        """
        try:
            # Get workflow and check access
            workflow = await self.get_by_id(session, workflow_id)
            if str(workflow.user_id) != str(user_id) and not workflow.is_public:
                raise ValidationError("Cannot execute private workflow")
            
            # Validate inputs against workflow requirements
            await self._validate_execution_inputs(workflow, inputs)
            
            # Create execution record
            execution_data = {
                'workflow_id': str(workflow_id),
                'user_id': str(user_id),
                'inputs': inputs,
                'status': ExecutionStatus.PENDING,
                'created_at': datetime.utcnow()
            }
            
            execution = await self.execution_repository.create(
                session, obj_in=ExecutionCreate(**execution_data)
            )
            
            # TODO: Queue execution task for background processing
            # await self._queue_execution_task(execution.id)
            
            self.logger.info(f"Started execution {execution.id} for workflow {workflow_id}")
            return execution
            
        except ValidationError:
            raise
        except Exception as e:
            self.logger.error(f"Error executing workflow: {e}")
            raise ValidationError("Failed to start workflow execution")
    
    async def get_workflow_executions(
        self,
        session: AsyncSession,
        workflow_id: UUID,
        user_id: UUID,
        skip: int = 0,
        limit: int = 100
    ) -> List[Execution]:
        """Get executions for a workflow."""
        try:
            # Check workflow access
            workflow = await self.get_by_id(session, workflow_id)
            if str(workflow.user_id) != str(user_id) and not workflow.is_public:
                raise ValidationError("Cannot access private workflow executions")
            
            return await self.execution_repository.get_multi(
                session,
                skip=skip,
                limit=limit,
                filters={"workflow_id": str(workflow_id)},
                order_by="created_at",
                order_desc=True
            )
            
        except ValidationError:
            raise
        except Exception as e:
            self.logger.error(f"Error getting workflow executions: {e}")
            raise ValidationError("Failed to get workflow executions")
    
    async def get_user_executions(
        self,
        session: AsyncSession,
        user_id: UUID,
        skip: int = 0,
        limit: int = 100
    ) -> List[Execution]:
        """Get all executions for a user."""
        return await self.execution_repository.get_multi(
            session,
            skip=skip,
            limit=limit,
            filters={"user_id": str(user_id)},
            order_by="created_at",
            order_desc=True
        )
    
    # Workflow Search and Discovery
    
    async def search_workflows(
        self,
        session: AsyncSession,
        query: str,
        user_id: Optional[UUID] = None,
        public_only: bool = False,
        limit: int = 50
    ) -> List[Workflow]:
        """Search workflows by name and description."""
        try:
            filters: Dict[str, Any] = {}
            
            if public_only or not user_id:
                filters["is_public"] = True
            elif user_id:
                # Get both user workflows and public workflows
                user_filters = {"user_id": str(user_id)}
                public_filters = {"is_public": True}
                
                # Simple search implementation
                # In production, you'd want full-text search
                user_workflows = await self.repository.get_multi(
                    session, limit=limit//2, filters=user_filters
                )
                public_workflows = await self.repository.get_multi(
                    session, limit=limit//2, filters=public_filters
                )
                
                # Filter by query
                all_workflows = user_workflows + public_workflows
                results = []
                for workflow in all_workflows:
                    if (query.lower() in workflow.name.lower() or 
                        (workflow.description and query.lower() in workflow.description.lower())):
                        results.append(workflow)
                
                return results[:limit]
            
            # For public-only search
            workflows = await self.repository.get_multi(
                session, limit=limit * 2, filters=filters
            )
            
            # Filter by query
            results = []
            for workflow in workflows:
                if (query.lower() in workflow.name.lower() or 
                    (workflow.description and query.lower() in workflow.description.lower())):
                    results.append(workflow)
            
            return results[:limit]
            
        except Exception as e:
            self.logger.error(f"Error searching workflows: {e}")
            raise ValidationError("Failed to search workflows")
    
    # Validation hooks implementation
    
    async def _validate_create(
        self, 
        session: AsyncSession, 
        obj_in: Any, 
        user_id: Optional[UUID]
    ) -> None:
        """Validate workflow creation."""
        if hasattr(obj_in, 'flow_data'):
            await self._validate_flow_data(obj_in.flow_data)
        
        if hasattr(obj_in, 'name'):
            # Check for duplicate workflow names for user
            if user_id:
                existing = await self.repository.get_multi(
                    session, 
                    filters={"user_id": str(user_id), "name": obj_in.name}
                )
                if existing:
                    raise ValidationError("Workflow name already exists")
    
    async def _validate_update(
        self,
        session: AsyncSession,
        model: Any,
        obj_in: Any,
        user_id: Optional[UUID]
    ) -> None:
        """Validate workflow update."""
        if hasattr(obj_in, 'flow_data') and obj_in.flow_data:
            await self._validate_flow_data(obj_in.flow_data)
    
    async def _validate_delete(
        self,
        session: AsyncSession,
        model: Any,
        user_id: Optional[UUID]
    ) -> None:
        """Validate workflow deletion."""
        # Check for active executions
        active_executions = await self.execution_repository.get_multi(
            session,
            filters={
                "workflow_id": str(model.id),
                "status": ExecutionStatus.RUNNING.value
            }
        )
        
        if active_executions:
            raise BusinessRuleError("Cannot delete workflow with active executions")
    
    # Private utility methods
    
    async def _validate_flow_data(self, flow_data: Dict[str, Any]) -> None:
        """Validate workflow flow data structure."""
        if not isinstance(flow_data, dict):
            raise ValidationError("Flow data must be a valid JSON object")
        
        # Basic structure validation
        required_fields = ["nodes", "edges"]
        for field in required_fields:
            if field not in flow_data:
                raise ValidationError(f"Flow data missing required field: {field}")
        
        # Validate nodes
        nodes = flow_data.get("nodes", [])
        if not isinstance(nodes, list):
            raise ValidationError("Flow data 'nodes' must be a list")
        
        if not nodes:
            raise ValidationError("Workflow must have at least one node")
        
        # Validate each node
        for i, node in enumerate(nodes):
            if not isinstance(node, dict):
                raise ValidationError(f"Node {i} must be an object")
            
            if "id" not in node:
                raise ValidationError(f"Node {i} missing required 'id' field")
            
            if "type" not in node:
                raise ValidationError(f"Node {i} missing required 'type' field")
        
        # Validate edges
        edges = flow_data.get("edges", [])
        if not isinstance(edges, list):
            raise ValidationError("Flow data 'edges' must be a list")
        
        # Validate each edge
        node_ids = {node["id"] for node in nodes}
        for i, edge in enumerate(edges):
            if not isinstance(edge, dict):
                raise ValidationError(f"Edge {i} must be an object")
            
            required_edge_fields = ["source", "target"]
            for field in required_edge_fields:
                if field not in edge:
                    raise ValidationError(f"Edge {i} missing required '{field}' field")
            
            # Check that source and target nodes exist
            if edge["source"] not in node_ids:
                raise ValidationError(f"Edge {i} references unknown source node: {edge['source']}")
            
            if edge["target"] not in node_ids:
                raise ValidationError(f"Edge {i} references unknown target node: {edge['target']}")
    
    async def _validate_execution_inputs(
        self, 
        workflow: Workflow, 
        inputs: Dict[str, Any]
    ) -> None:
        """Validate execution inputs against workflow requirements."""
        # Extract input requirements from flow data
        flow_data = workflow.flow_data
        if not flow_data:
            return
        
        # Look for start nodes that require inputs
        start_nodes = [
            node for node in flow_data.get("nodes", [])
            if node.get("type") == "start" or node.get("data", {}).get("isStart")
        ]
        
        for start_node in start_nodes:
            node_data = start_node.get("data", {})
            required_inputs = node_data.get("requiredInputs", [])
            
            for required_input in required_inputs:
                if required_input not in inputs:
                    raise ValidationError(f"Missing required input: {required_input}")
    
    async def _queue_execution_task(self, execution_id: UUID) -> None:
        """Queue workflow execution task for background processing."""
        # TODO: Implement task queuing with Celery or similar
        # This would integrate with the existing task system
        pass 