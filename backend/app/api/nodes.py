from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from app.auth.dependencies import get_current_user, get_optional_user
from app.core.node_registry import node_registry
from app.database import db
from app.nodes.base import NodeMetadata
from app.models.node import NodeCategory
from pydantic import BaseModel

router = APIRouter()

class CustomNodeCreate(BaseModel):
    name: str
    description: str
    category: NodeCategory
    config: dict
    code: str
    is_public: bool = False

class CustomNodeResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: str
    category: str
    config: dict
    code: str
    is_public: bool
    created_at: str
    updated_at: Optional[str] = None

@router.get("/", response_model=List[NodeMetadata])
async def list_nodes(
    category: Optional[NodeCategory] = None,
    current_user: Optional[dict] = Depends(get_optional_user)
):
    """List all available nodes"""
    if category:
        nodes = node_registry.get_nodes_by_category(category)
    else:
        nodes = node_registry.get_all_nodes()
    
    return nodes

@router.get("/categories")
async def list_categories():
    """List all node categories"""
    return [
        {
            "name": category.value,
            "display_name": category.value.replace("_", " ").title(),
            "icon": get_category_icon(category)
        }
        for category in NodeCategory
    ]

@router.post("/custom", response_model=CustomNodeResponse)
async def create_custom_node(
    node: CustomNodeCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a custom node"""
    result = await db.create_custom_node(current_user["id"], node.dict())
    return result

@router.get("/custom", response_model=List[CustomNodeResponse])
async def list_custom_nodes(
    current_user: Optional[dict] = Depends(get_optional_user)
):
    """List custom nodes (public and user's own)"""
    user_id = current_user["id"] if current_user else None
    nodes = await db.get_custom_nodes(user_id)
    return nodes

@router.get("/custom/{node_id}", response_model=CustomNodeResponse)
async def get_custom_node(
    node_id: str,
    current_user: Optional[dict] = Depends(get_optional_user)
):
    """Get a custom node by ID"""
    node = await db.get_custom_node(node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Custom node not found")
    
    # Check access permissions
    if not node['is_public'] and (not current_user or node['user_id'] != current_user['id']):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return node

@router.delete("/custom/{node_id}")
async def delete_custom_node(
    node_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a custom node"""
    node = await db.get_custom_node(node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Custom node not found")
    
    if node['user_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.delete_custom_node(node_id, current_user['id'])
    return {"success": True, "message": "Custom node deleted successfully"}

def get_category_icon(category: NodeCategory) -> str:
    """Get icon for node category"""
    icons = {
        NodeCategory.LLM: "🧠",
        NodeCategory.TOOL: "🔧",
        NodeCategory.AGENT: "🤖",
        NodeCategory.CHAIN: "⛓️",
        NodeCategory.MEMORY: "💾",
        NodeCategory.VECTOR_STORE: "📊",
        NodeCategory.DOCUMENT_LOADER: "📄",
        NodeCategory.TEXT_SPLITTER: "✂️",
        NodeCategory.EMBEDDING: "🔢",
        NodeCategory.UTILITY: "⚙️",
        NodeCategory.INTEGRATION: "🔗",
        NodeCategory.CUSTOM: "🎨"
    }
    return icons.get(category, "📋") 