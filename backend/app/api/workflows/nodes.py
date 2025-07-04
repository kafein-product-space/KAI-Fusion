from fastapi import APIRouter, HTTPException, Depends
from app.core.security import get_current_user
from app.core.db import get_db
from app.models.workflow import WorkflowNode
from app.schemas.workflow import NodeConfigUpdate

router = APIRouter()

@router.post("/{node_id}/config")
async def update_node_config(
    node_id: str,
    config: NodeConfigUpdate,
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    try:
        # Node'u bul
        node = db.query(WorkflowNode).filter(WorkflowNode.id == node_id).first()
        if not node:
            raise HTTPException(status_code=404, detail="Node not found")

        # Config'u güncelle
        node.config = config.dict()
        db.commit()

        return {"message": "Node config updated successfully"}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
