from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict

from app.schemas.chat import ChatMessageResponse, ChatMessageUpdate, ChatMessageInput
from app.services.chat_service import ChatService
from app.core.database import get_db_session

router = APIRouter()

@router.get("/", response_model=Dict[UUID, List[ChatMessageResponse]])
async def get_all_chats(db: AsyncSession = Depends(get_db_session)):
    """
    Retrieves all chat conversations, grouped by their chatflow_id.
    """
    service = ChatService(db)
    return await service.get_all_chats_grouped()

@router.post("/", response_model=List[ChatMessageResponse], status_code=status.HTTP_201_CREATED)
async def start_new_chat(
    user_input: ChatMessageInput,
    db: AsyncSession = Depends(get_db_session)
):
    """
    Starts a new chat conversation.
    This creates a new chatflow_id, saves the user's first message,
    triggers an LLM response, and returns the initial exchange.
    """
    service = ChatService(db)
    return await service.start_new_chat(user_input=user_input.content)

@router.get("/{chatflow_id}", response_model=List[ChatMessageResponse])
async def get_chat_messages(
    chatflow_id: UUID,
    db: AsyncSession = Depends(get_db_session)
):
    service = ChatService(db)
    return await service.get_chat_messages(chatflow_id=chatflow_id)

@router.post("/{chatflow_id}/interact", response_model=List[ChatMessageResponse])
async def handle_chat_interaction(
    chatflow_id: UUID,
    user_input: ChatMessageInput,
    db: AsyncSession = Depends(get_db_session)
):
    service = ChatService(db)
    return await service.handle_chat_interaction(chatflow_id=chatflow_id, user_input=user_input.content)

@router.put("/{chat_message_id}", response_model=List[ChatMessageResponse])
async def update_chat_message(
    chat_message_id: UUID,
    chat_message_update: ChatMessageInput, # Changed to ChatMessageInput for simplicity
    db: AsyncSession = Depends(get_db_session)
):
    service = ChatService(db)
    # The service method now handles all logic and returns the full chat history
    updated_chat_history = await service.update_chat_message(
        chat_message_id, 
        ChatMessageUpdate(content=chat_message_update.content)
    )
    if updated_chat_history is None:
        raise HTTPException(status_code=404, detail="Chat message not found")
    return updated_chat_history

@router.delete("/{chat_message_id}", status_code=status.HTTP_200_OK)
async def delete_chat_message(
    chat_message_id: UUID,
    db: AsyncSession = Depends(get_db_session)
):
    service = ChatService(db)
    if not await service.delete_chat_message(chat_message_id):
        raise HTTPException(status_code=404, detail="Chat message not found")
    return {"detail": "Mesaj başarı ile silindi"} 