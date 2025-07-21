
import json
import logging
import uuid
from typing import Any, Dict, Optional, AsyncGenerator, List

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc

from app.core.engine_v2 import get_engine
from app.core.database import get_db_session
from app.auth.dependencies import get_current_user, get_optional_user
from app.models.user import User
from app.models.workflow import Workflow, WorkflowTemplate
from app.schemas.workflow import (
    WorkflowCreate, 
    WorkflowUpdate, 
    WorkflowResponse,
    WorkflowTemplateCreate,
    WorkflowTemplateResponse
)
from app.services.workflow_service import WorkflowService, WorkflowTemplateService
from app.services.dependencies import get_workflow_service_dep, get_workflow_template_service_dep
from app.services.chat_service import ChatService
from app.schemas.chat import ChatMessageCreate

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=List[WorkflowResponse])
async def get_workflows(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    workflow_service: WorkflowService = Depends(get_workflow_service_dep),
    skip: int = 0,
    limit: int = 100
):
    """
    Get list of workflows for the current user.
    """
    try:
        user_id = current_user.id  # Cache user ID
        # Get user's workflows, ordered by updated_at descending
        query = (
            select(Workflow)
            .filter_by(user_id=user_id)
            .order_by(desc(Workflow.updated_at))
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(query)
        workflows = result.scalars().all()
        
        return [WorkflowResponse.model_validate(workflow) for workflow in workflows]
    except Exception as e:
        logger.error(f"Error fetching workflows: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch workflows")


@router.post("/", response_model=WorkflowResponse)
async def create_workflow(
    workflow_data: WorkflowCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    """Create a new workflow"""
    try:
        user_id = current_user.id  # Cache user ID before potential session issues
        workflow = Workflow(
            user_id=user_id,
            name=workflow_data.name,
            description=workflow_data.description,
            is_public=workflow_data.is_public,
            flow_data=workflow_data.flow_data
        )
        
        db.add(workflow)
        await db.commit()
        await db.refresh(workflow)
        
        logger.info(f"Created workflow {workflow.id} for user {user_id}")
        return WorkflowResponse.model_validate(workflow)
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating workflow: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create workflow")


@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    workflow_service: WorkflowService = Depends(get_workflow_service_dep)
):
    """Get specific workflow with full flow data"""
    try:
        workflow = await workflow_service.get_by_id(db, workflow_id, current_user.id)
        
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        # Check if user has access (owner or public workflow)
        user_id = current_user.id  # Cache user ID
        if workflow.user_id != user_id and not workflow.is_public:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return WorkflowResponse.model_validate(workflow)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching workflow {workflow_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch workflow")


@router.put("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: uuid.UUID,
    workflow_data: WorkflowUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    workflow_service: WorkflowService = Depends(get_workflow_service_dep)
):
    """Update an existing workflow"""
    try:
        user_id = current_user.id  # Cache user ID
        workflow = await workflow_service.get_by_id(db, workflow_id, user_id)
        
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        # Only owner can update
        if workflow.user_id != user_id:
            raise HTTPException(status_code=403, detail="Only workflow owner can update")
        
        # Update fields that are provided
        update_data = workflow_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(workflow, field, value)
        
        # Increment version if flow_data is updated
        if 'flow_data' in update_data:
            workflow.version += 1
        
        await db.commit()
        await db.refresh(workflow)
        
        logger.info(f"Updated workflow {workflow_id} for user {user_id}")
        return WorkflowResponse.model_validate(workflow)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating workflow {workflow_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update workflow")


@router.delete("/{workflow_id}")
async def delete_workflow(
    workflow_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    workflow_service: WorkflowService = Depends(get_workflow_service_dep)
):
    """Delete a workflow"""
    try:
        user_id = current_user.id  # Cache user ID
        workflow = await workflow_service.get_by_id(db, workflow_id, user_id)
        
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        # Only owner can delete
        if workflow.user_id != user_id:
            raise HTTPException(status_code=403, detail="Only workflow owner can delete")
        
        await db.delete(workflow)
        await db.commit()
        
        logger.info(f"Deleted workflow {workflow_id} for user {user_id}")
        return {"message": f"Workflow {workflow_id} deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting workflow {workflow_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete workflow")


@router.post("/validate")
async def validate_workflow(
    request_data: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Validate workflow structure without executing"""
    engine = get_engine()
    
    # Extract flow_data from request
    flow_data = request_data.get("flow_data", request_data)
    
    try:
        validation_result = engine.validate(flow_data)
        return {
            "valid": validation_result["valid"],
            "errors": validation_result["errors"],
            "warnings": validation_result["warnings"],
            "node_count": len(flow_data.get("nodes", [])),
            "edge_count": len(flow_data.get("edges", []))
        }
    except Exception as e:
        logger.error(f"Validation error: {e}")
        return {
            "valid": False,
            "errors": [str(e)],
            "warnings": [],
            "node_count": 0,
            "edge_count": 0
        }


@router.get("/public/", response_model=List[WorkflowResponse])
async def get_public_workflows(
    db: AsyncSession = Depends(get_db_session),
    workflow_service: WorkflowService = Depends(get_workflow_service_dep),
    current_user: Optional[User] = Depends(get_optional_user),
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None
):
    """
    Get list of public workflows.
    """
    try:
        sanitized_search = None
        if search:
            # Sanitize search parameter to prevent injection attacks
            if len(search.strip()) == 0:
                sanitized_search = None
            elif len(search) > 200:
                raise HTTPException(status_code=400, detail="Search query too long")
            else:
                # Remove potentially dangerous characters
                import re
                sanitized_search = re.sub(r'[^\w\s\-_]', '', search.strip())
        
        workflows = await workflow_service.get_public_workflows(
            db, skip=skip, limit=limit, search=sanitized_search
        )
        return [WorkflowResponse.model_validate(workflow) for workflow in workflows]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching public workflows: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch public workflows")


@router.get("/search/", response_model=List[WorkflowResponse])
async def search_workflows(
    q: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    workflow_service: WorkflowService = Depends(get_workflow_service_dep),
    skip: int = 0,
    limit: int = 100
):
    """
    Search user's workflows by name or description.
    """
    try:
        # Sanitize search parameter to prevent injection attacks
        if len(q.strip()) == 0:
            raise HTTPException(status_code=400, detail="Search query cannot be empty")
        if len(q) > 200:
            raise HTTPException(status_code=400, detail="Search query too long")
        
        # Remove potentially dangerous characters
        import re
        sanitized_q = re.sub(r'[^\w\s\-_]', '', q.strip())
        
        user_id = current_user.id  # Cache user ID
        workflows = await workflow_service.get_user_workflows(
            db, user_id, skip=skip, limit=limit, search=sanitized_q
        )
        return [WorkflowResponse.model_validate(workflow) for workflow in workflows]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching workflows: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to search workflows")


@router.post("/{workflow_id}/duplicate", response_model=WorkflowResponse)
async def duplicate_workflow(
    workflow_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    workflow_service: WorkflowService = Depends(get_workflow_service_dep),
    new_name: Optional[str] = None
):
    """
    Duplicate a workflow (accessible to user).
    """
    try:
        user_id = current_user.id  # Cache user ID
        duplicated = await workflow_service.duplicate_workflow(
            db, workflow_id, user_id, new_name
        )
        
        if not duplicated:
            raise HTTPException(status_code=404, detail="Workflow not found or not accessible")
        
        logger.info(f"Duplicated workflow {workflow_id} to {duplicated.id} for user {user_id}")
        return WorkflowResponse.model_validate(duplicated)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error duplicating workflow {workflow_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to duplicate workflow")


@router.patch("/{workflow_id}/visibility")
async def update_workflow_visibility(
    workflow_id: uuid.UUID,
    is_public: bool,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    workflow_service: WorkflowService = Depends(get_workflow_service_dep)
):
    """
    Update workflow visibility (public/private).
    """
    try:
        user_id = current_user.id  # Cache user ID
        workflow = await workflow_service.update_workflow_visibility(
            db, workflow_id, user_id, is_public
        )
        
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        logger.info(f"Updated workflow {workflow_id} visibility to {'public' if is_public else 'private'}")
        return {"message": f"Workflow visibility updated to {'public' if is_public else 'private'}"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating workflow visibility {workflow_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update workflow visibility")


@router.get("/stats/")
async def get_workflow_stats(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    workflow_service: WorkflowService = Depends(get_workflow_service_dep)
):
    """
    Get workflow statistics for the current user.
    """
    try:
        user_id = current_user.id  # Cache user ID
        total_count = await workflow_service.count_user_workflows(db, user_id)
        return {
            "total_workflows": total_count,
            "user_id": str(user_id)
        }
    except Exception as e:
        logger.error(f"Error fetching workflow stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch workflow statistics")


# Template endpoints
@router.get("/templates/", response_model=List[WorkflowTemplateResponse])
async def get_workflow_templates(
    db: AsyncSession = Depends(get_db_session),
    template_service: WorkflowTemplateService = Depends(get_workflow_template_service_dep),
    current_user: Optional[User] = Depends(get_optional_user),
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    search: Optional[str] = None
):
    """Get list of workflow templates"""
    try:
        # Sanitize search and category parameters
        sanitized_search = None
        sanitized_category = None
        
        if search:
            if len(search.strip()) == 0:
                sanitized_search = None
            elif len(search) > 200:
                raise HTTPException(status_code=400, detail="Search query too long")
            else:
                import re
                sanitized_search = re.sub(r'[^\w\s\-_]', '', search.strip())
        
        if category:
            if len(category) > 100:
                raise HTTPException(status_code=400, detail="Category name too long")
            import re
            sanitized_category = re.sub(r'[^\w\s\-_]', '', category.strip())
        
        if sanitized_search:
            templates = await template_service.search_templates(
                db, sanitized_search, skip=skip, limit=limit
            )
        elif sanitized_category:
            templates = await template_service.get_templates_by_category(
                db, sanitized_category, skip=skip, limit=limit
            )
        else:
            query = (
                select(WorkflowTemplate)
                .order_by(WorkflowTemplate.created_at.desc())
                .offset(skip)
                .limit(limit)
            )
            result = await db.execute(query)
            templates = result.scalars().all()
        
        return [WorkflowTemplateResponse.model_validate(template) for template in templates]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching workflow templates: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch workflow templates")


@router.get("/templates/categories/")
async def get_template_categories(
    db: AsyncSession = Depends(get_db_session),
    template_service: WorkflowTemplateService = Depends(get_workflow_template_service_dep),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Get list of template categories"""
    try:
        categories = await template_service.get_categories(db)
        return {"categories": categories}
    except Exception as e:
        logger.error(f"Error fetching template categories: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch template categories")


@router.post("/templates/", response_model=WorkflowTemplateResponse)
async def create_workflow_template(
    template_data: WorkflowTemplateCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    """Create a new workflow template"""
    try:
        template = WorkflowTemplate(
            name=template_data.name,
            description=template_data.description,
            category=template_data.category,
            flow_data=template_data.flow_data
        )
        
        db.add(template)
        await db.commit()
        await db.refresh(template)
        
        user_id = current_user.id  # Cache user ID  
        logger.info(f"Created workflow template {template.id} by user {user_id}")
        return WorkflowTemplateResponse.model_validate(template)
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating workflow template: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create workflow template")


@router.post("/{workflow_id}/create-template", response_model=WorkflowTemplateResponse)
async def create_template_from_workflow(
    workflow_id: uuid.UUID,
    template_name: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    template_service: WorkflowTemplateService = Depends(get_workflow_template_service_dep),
    template_description: Optional[str] = None,
    category: str = "User Created"
):
    """
    Create a template from an existing workflow.
    """
    try:
        template = await template_service.create_from_workflow(
            db, workflow_id, template_name, template_description, category
        )
        
        if not template:
            raise HTTPException(status_code=404, detail="Workflow not found or not accessible")
        
        logger.info(f"Created template {template.id} from workflow {workflow_id}")
        return WorkflowTemplateResponse.model_validate(template)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating template from workflow {workflow_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create template from workflow")


class AdhocExecuteRequest(BaseModel):
    flow_data: Dict[str, Any]
    input_text: str = "Hello"
    session_id: Optional[str] = None
    chatflow_id: Optional[str] = None  # Yeni eklenen alan


def _make_chunk_serializable(obj):
    """Convert any object to a JSON-serializable format."""
    from datetime import datetime, date
    import uuid as uuid_mod
    if obj is None or isinstance(obj, (bool, int, float, str)):
        return obj
    elif isinstance(obj, (datetime, date)):
        return obj.isoformat()
    elif isinstance(obj, uuid_mod.UUID):
        return str(obj)
    elif isinstance(obj, (list, tuple)):
        return [_make_chunk_serializable(item) for item in obj]
    elif isinstance(obj, dict):
        return {k: _make_chunk_serializable(v) for k, v in obj.items()}
    elif hasattr(obj, 'model_dump'):
        try:
            return obj.model_dump()
        except Exception:
            return str(obj)
    else:
        return str(obj)

@router.post("/execute")
async def execute_adhoc_workflow(
    req: AdhocExecuteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)  # DB session ekle
):
    """
    Execute a workflow directly from flow data and stream the output.
    This is the primary endpoint for running workflows from the frontend.
    """
    engine = get_engine()
    # Use chatflow_id as session_id for memory persistence
    chatflow_id = uuid.UUID(req.chatflow_id) if req.chatflow_id else uuid.uuid4()
    session_id = req.session_id or str(chatflow_id)
    user_id = current_user.id  # Cache user ID
    user_email = current_user.email  # Cache user email
    user_context = {
        "session_id": session_id,
        "user_id": str(user_id),
        "user_email": user_email
    }

    # --- CHAT ENTEGRASYONU ---
    # chatflow_id already defined above
    chat_service = ChatService(db)
    # Kullanıcı mesajını kaydet
    await chat_service.create_chat_message(ChatMessageCreate(
        role="user",
        content=req.input_text,
        chatflow_id=chatflow_id
    ))

    try:
        engine.build(flow_data=req.flow_data, user_context=user_context)
        result_stream = await engine.execute(
            inputs={"input": req.input_text},
            stream=True,
            user_context=user_context,
        )
    except Exception as e:
        logger.error(f"Error during graph build or execution: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Failed to run workflow: {e}")

    # LLM cevabını almak için ilk chunk'ı yakala ve chat'e kaydet
    async def event_generator():
        llm_output = ""
        try:
            if not isinstance(result_stream, AsyncGenerator):
                raise TypeError("Expected an async generator from the engine for streaming.")

            async for chunk in result_stream:
                if isinstance(chunk, dict):
                    if chunk.get("type") == "token":
                        llm_output += chunk.get("content", "")
                    elif chunk.get("type") == "output":
                        llm_output += chunk.get("output", "")
                    elif chunk.get("type") == "complete":
                        result = chunk.get("result")
                        if isinstance(result, str):
                            llm_output += result
                        elif isinstance(result, dict) and "output" in result:
                            llm_output += result["output"]
                # Make chunk serializable before JSON conversion
                try:
                    serialized_chunk = _make_chunk_serializable(chunk)
                    yield f"data: {json.dumps(serialized_chunk)}\n\n"
                except (TypeError, ValueError) as e:
                    logger.warning(f"Non-serializable chunk: {e}")
                    safe_chunk = {"type": "error", "error": f"Serialization error: {str(e)}", "original_type": type(chunk).__name__}
                    yield f"data: {json.dumps(safe_chunk)}\n\n"
        except Exception as e:
            logger.error(f"Streaming execution error: {e}", exc_info=True)
            error_data = {"event": "error", "data": str(e)}
            yield f"data: {json.dumps(error_data)}\n\n"
        finally:
            # LLM cevabını chat'e kaydet
            if llm_output:
                await chat_service.create_chat_message(ChatMessageCreate(
                    role="assistant",
                    content=llm_output,
                    chatflow_id=chatflow_id
                ))

    return StreamingResponse(event_generator(), media_type="text/event-stream")
