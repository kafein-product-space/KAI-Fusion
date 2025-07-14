
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
    nodes_list = []
    for name, node_class in node_registry.nodes.items():
        try:
            instance = node_class()
            metadata = instance.metadata.dict()
            # Add the node name to the metadata
            metadata["name"] = name
            nodes_list.append(metadata)
        except Exception as e:
            logger.error(f"Failed to get metadata for node {name}: {e}", exc_info=True)
            # Optionally skip failing nodes in production
            # continue
    return nodes_list

@router.get("/categories")
async def get_node_categories():
    """
    Retrieve all available node categories.
    """
    categories = set()
    for name, node_class in node_registry.nodes.items():
        try:
            instance = node_class()
            metadata_dict = instance.metadata.dict()
            category = metadata_dict.get("category", "Other")
            categories.add(category)
        except Exception as e:
            logger.error(f"Failed to get category for node {name}: {e}", exc_info=True)
    
    # Convert to list of category objects
    categories_list = [
        {
            "name": category,
            "display_name": category.replace("_", " ").title(),
            "description": f"Nodes in the {category} category"
        }
        for category in sorted(categories)
    ]
    
    return categories_list 