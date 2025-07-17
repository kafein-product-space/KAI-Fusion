import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db_session
from app.auth.dependencies import get_current_user, get_optional_user
from app.models.user import User
from app.models.workflow import WorkflowTemplate, Workflow
from app.schemas.workflow import (
    WorkflowTemplateCreate,
    WorkflowTemplateResponse,
    WorkflowTemplateUpdate,
)
from app.services.workflow_service import WorkflowTemplateService
from app.services.dependencies import get_workflow_template_service_dep

router = APIRouter()


@router.get("/", response_model=List[WorkflowTemplateResponse])
async def get_workflow_templates(
    db: AsyncSession = Depends(get_db_session),
    template_service: WorkflowTemplateService = Depends(get_workflow_template_service_dep),
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    search: Optional[str] = None,
):
    """Get list of workflow templates"""
    if search:
        templates = await template_service.search(db, search, skip=skip, limit=limit)
    elif category:
        templates = await template_service.get_by_category(
            db, category, skip=skip, limit=limit
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
    return [
        WorkflowTemplateResponse.model_validate(template) for template in templates
    ]


@router.post("/", response_model=WorkflowTemplateResponse)
async def create_workflow_template(
    template_data: WorkflowTemplateCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new workflow template"""
    template = WorkflowTemplate(**template_data.model_dump(), author_id=current_user.id)
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return WorkflowTemplateResponse.model_validate(template)


@router.get("/{template_id}", response_model=WorkflowTemplateResponse)
async def get_workflow_template(
    template_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    template_service: WorkflowTemplateService = Depends(get_workflow_template_service_dep),
):
    """Get a specific workflow template"""
    template = await template_service.get_by_id(db, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return WorkflowTemplateResponse.model_validate(template)


@router.put("/{template_id}", response_model=WorkflowTemplateResponse)
async def update_workflow_template(
    template_id: uuid.UUID,
    template_data: WorkflowTemplateUpdate,
    db: AsyncSession = Depends(get_db_session),
    template_service: WorkflowTemplateService = Depends(get_workflow_template_service_dep),
    current_user: User = Depends(get_current_user),
):
    """Update a workflow template"""
    template = await template_service.get_by_id(db, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    if template.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this template")

    update_data = template_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(template, key, value)

    await db.commit()
    await db.refresh(template)
    return WorkflowTemplateResponse.model_validate(template)


@router.delete("/{template_id}")
async def delete_workflow_template(
    template_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    template_service: WorkflowTemplateService = Depends(get_workflow_template_service_dep),
    current_user: User = Depends(get_current_user),
):
    """Delete a workflow template"""
    template = await template_service.get_by_id(db, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    if template.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this template")

    await db.delete(template)
    await db.commit()
    return {"message": "Şablon başarıyla silindi."}

@router.post("/from-workflow/{workflow_id}", response_model=WorkflowTemplateResponse)
async def create_template_from_workflow(
    workflow_id: uuid.UUID,
    template_name: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    template_description: Optional[str] = None,
    category: str = "User Created",
):
    """Create a template from an existing workflow."""
    result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = result.scalars().first()

    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    if workflow.user_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to create a template from this workflow"
        )
    
    template = WorkflowTemplate(
        name=template_name,
        description=template_description or workflow.description,
        flow_data=workflow.flow_data,
        category=category,
        author_id=current_user.id,
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)

    return WorkflowTemplateResponse.model_validate(template)

@router.get("/categories/", response_model=List[str])
async def get_template_categories(
    db: AsyncSession = Depends(get_db_session),
    template_service: WorkflowTemplateService = Depends(get_workflow_template_service_dep),
):
    """Get list of template categories"""
    categories = await template_service.get_distinct_categories(db)
    return categories 