
import logging
from typing import Dict, Any

from fastapi import APIRouter

from app.core.node_registry import node_registry

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/")
async def get_all_nodes():
    """
    Retrieve the metadata for all registered nodes.
    This endpoint provides the frontend with all necessary information
    to render nodes and their configuration modals dynamically.
    """
    nodes_data: Dict[str, Any] = {}
    for name, node_class in node_registry.nodes.items():
        try:
            instance = node_class()
            nodes_data[name] = instance.metadata.dict()
        except Exception as e:
            logger.error(f"Failed to get metadata for node {name}: {e}", exc_info=True)
            # Optionally skip failing nodes in production
            # continue
    return nodes_data 