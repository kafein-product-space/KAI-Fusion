import uuid
import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.variable import Variable
from app.schemas.variable import (
    VariableCreate,
    VariableUpdate,
    VariableResponse
)
from app.services.variable_service import VariableService
from app.services.dependencies import get_variable_service_dep

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("", response_model=List[VariableResponse])
async def get_variables(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    variable_service: VariableService = Depends(get_variable_service_dep),
    skip: int = 0,
    limit: int = 100
):
    """
    Get list of all variables for the current user.
    """
    try:
        variables = await variable_service.get_all(db, skip=skip, limit=limit, user_id=current_user.id)
        return variables
    except Exception as e:
        logger.error(f"Error fetching variables: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{variable_id}", response_model=VariableResponse)
async def get_variable(
    variable_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    variable_service: VariableService = Depends(get_variable_service_dep)
):
    """
    Get a specific variable by ID.
    """
    try:
        variable = await variable_service.get(db, variable_id)
        if not variable:
            raise HTTPException(status_code=404, detail="Variable not found")
        return variable
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching variable {variable_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/name/{variable_name}", response_model=VariableResponse)
async def get_variable_by_name(
    variable_name: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    variable_service: VariableService = Depends(get_variable_service_dep)
):
    """
    Get a specific variable by name.
    """
    try:
        variable = await variable_service.get_by_name(db, variable_name)
        if not variable:
            raise HTTPException(status_code=404, detail="Variable not found")
        return variable
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching variable {variable_name}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/type/{variable_type}", response_model=List[VariableResponse])
async def get_variables_by_type(
    variable_type: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    variable_service: VariableService = Depends(get_variable_service_dep)
):
    """
    Get all variables by type.
    """
    try:
        variables = await variable_service.get_by_type(db, variable_type)
        return variables
    except Exception as e:
        logger.error(f"Error fetching variables by type {variable_type}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("", response_model=VariableResponse)
async def create_variable(
    variable_data: VariableCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    variable_service: VariableService = Depends(get_variable_service_dep)
):
    """
    Create a new variable.
    """
    try:
        # Check if variable with same name already exists for this user
        existing_variable = await variable_service.get_by_name_and_user(db, variable_data.name, current_user.id)
        if existing_variable:
            raise HTTPException(
                status_code=400, 
                detail=f"Variable with name '{variable_data.name}' already exists"
            )
        
        variable = await variable_service.create_variable(db, variable_data, current_user.id)
        return variable
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating variable: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/{variable_id}", response_model=VariableResponse)
async def update_variable(
    variable_id: uuid.UUID,
    variable_data: VariableUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    variable_service: VariableService = Depends(get_variable_service_dep)
):
    """
    Update a variable.
    """
    try:
        variable = await variable_service.get(db, variable_id)
        if not variable:
            raise HTTPException(status_code=404, detail="Variable not found")
        
        # Check if user owns this variable
        if variable.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to update this variable")
        
        # Check if name is being changed and if new name already exists for this user
        if variable_data.name and variable_data.name != variable.name:
            existing_variable = await variable_service.get_by_name_and_user(db, variable_data.name, current_user.id)
            if existing_variable:
                raise HTTPException(
                    status_code=400,
                    detail=f"Variable with name '{variable_data.name}' already exists"
                )
        
        updated_variable = await variable_service.update_variable(db, variable, variable_data)
        return updated_variable
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating variable {variable_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/{variable_id}")
async def delete_variable(
    variable_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    variable_service: VariableService = Depends(get_variable_service_dep)
):
    """
    Delete a variable.
    """
    try:
        variable = await variable_service.get(db, variable_id)
        if not variable:
            raise HTTPException(status_code=404, detail="Variable not found")
        
        # Check if user owns this variable
        if variable.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this variable")
        
        await variable_service.remove(db, id=variable_id)
        return {"message": "Variable deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting variable {variable_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/name/{variable_name}")
async def delete_variable_by_name(
    variable_name: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    variable_service: VariableService = Depends(get_variable_service_dep)
):
    """
    Delete a variable by name.
    """
    try:
        variable = await variable_service.delete_by_name(db, variable_name)
        if not variable:
            raise HTTPException(status_code=404, detail="Variable not found")
        
        return {"message": f"Variable '{variable_name}' deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting variable {variable_name}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error") 