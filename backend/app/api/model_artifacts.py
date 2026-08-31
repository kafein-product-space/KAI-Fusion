"""Authenticated API for model artifact sources used by Static model analysis nodes."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.auth.dependencies import get_current_user
from app.models.user import User
from app.services.model_artifact_store import (
    ManagedArtifactError,
    ManagedArtifactInsufficientDiskError,
    ManagedArtifactTooLargeError,
    configured_upload_max_bytes,
    managed_model_artifact_store,
)
from app.services.model_artifact_analysis_service import get_static_analysis_capabilities


logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/capabilities")
async def get_model_artifact_capabilities():
    """Return the installed Static model analysis extension registry for Local/ZIP inputs."""

    return get_static_analysis_capabilities()


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_model_artifact(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Stream a local browser upload into user-scoped managed artifact storage."""

    try:
        return await managed_model_artifact_store.save_upload(
            file,
            owner_id=current_user.id,
            max_bytes=configured_upload_max_bytes(),
        )
    except ManagedArtifactTooLargeError as exc:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=str(exc)) from exc
    except ManagedArtifactInsufficientDiskError as exc:
        raise HTTPException(status_code=507, detail=str(exc)) from exc
    except ManagedArtifactError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        logger.error(
            "Managed model artifact upload failed: user_id=%s error_type=%s",
            current_user.id,
            type(exc).__name__,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Model artifact could not be stored.",
        ) from exc


@router.delete("/{artifact_id}")
async def delete_model_artifact(
    artifact_id: str,
    current_user: User = Depends(get_current_user),
):
    """Delete one managed artifact owned by the authenticated user."""

    try:
        deleted = managed_model_artifact_store.delete(
            artifact_id, owner_id=current_user.id
        )
    except ManagedArtifactError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Managed model artifact was not found.",
        )
    return {"deleted": True, "artifact_id": artifact_id}
