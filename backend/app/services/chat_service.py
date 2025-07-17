import uuid
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import delete, select
from app.models.chat import ChatMessage
from app.schemas.chat import ChatMessageCreate, ChatMessageUpdate
from collections import defaultdict

# TODO: Import the actual engine and workflow execution services
# from app.core.engine_v2 import get_engine
# from app.services.execution_service import ExecutionService

class ChatService:
    def __init__(self, db: Session):
        self.db = db

    async def create_chat_message(self, chat_message: ChatMessageCreate) -> ChatMessage:
        db_chat_message = ChatMessage(
            role=chat_message.role,
            chatflow_id=chat_message.chatflow_id,
            content=chat_message.content,
            source_documents=chat_message.source_documents,
        )
        self.db.add(db_chat_message)
        await self.db.commit()
        await self.db.refresh(db_chat_message)
        return db_chat_message

    async def get_all_chats_grouped(self) -> dict[UUID, list[ChatMessage]]:
        """
        Retrieves all chat messages from the database and groups them by chatflow_id.
        """
        stmt = select(ChatMessage).order_by(ChatMessage.chatflow_id, ChatMessage.created_at)
        result = await self.db.execute(stmt)
        all_messages = result.scalars().all()
        
        # Group messages by chatflow_id
        grouped_chats = defaultdict(list)
        for message in all_messages:
            grouped_chats[message.chatflow_id].append(message)
            
        return grouped_chats

    async def get_chat_messages(self, chatflow_id: UUID) -> list[ChatMessage]:
        result = await self.db.execute(
            select(ChatMessage).filter(ChatMessage.chatflow_id == chatflow_id)
        )
        return result.scalars().all()

    async def update_chat_message(self, chat_message_id: UUID, chat_message_update: ChatMessageUpdate) -> list[ChatMessage]:
        result = await self.db.execute(select(ChatMessage).filter(ChatMessage.id == chat_message_id))
        db_chat_message = result.scalars().first()

        if not db_chat_message:
            return None

        # If the message is not from a user, just update it simply and return the full chat.
        if db_chat_message.role != 'user':
            update_data = chat_message_update.dict(exclude_unset=True)
            for key, value in update_data.items():
                setattr(db_chat_message, key, value)
            await self.db.commit()
            return await self.get_chat_messages(db_chat_message.chatflow_id)

        # --- Logic for cascading update on a user message ---
        chatflow_id = db_chat_message.chatflow_id
        original_timestamp = db_chat_message.created_at

        # 1. Delete all subsequent messages in the same conversation
        delete_stmt = delete(ChatMessage).where(
            ChatMessage.chatflow_id == chatflow_id,
            ChatMessage.created_at > original_timestamp
        )
        await self.db.execute(delete_stmt)

        # 2. Update the user's message content
        new_content = chat_message_update.content
        if new_content is not None:
            db_chat_message.content = new_content

        # 3. Regenerate a new response from the LLM (placeholder)
        llm_response_content = f"This is a regenerated response to: '{new_content}'"
        llm_message = ChatMessage(
            role="assistant",
            content=llm_response_content,
            chatflow_id=chatflow_id
        )
        self.db.add(llm_message)

        await self.db.commit()

        # 4. Return the new state of the conversation
        return await self.get_chat_messages(chatflow_id)

    async def delete_chat_message(self, chat_message_id: UUID) -> bool:
        result = await self.db.execute(select(ChatMessage).filter(ChatMessage.id == chat_message_id))
        db_chat_message = result.scalars().first()

        if not db_chat_message:
            return False

        # If a user's message is deleted, cascade delete all subsequent messages
        if db_chat_message.role == 'user':
            delete_stmt = delete(ChatMessage).where(
                ChatMessage.chatflow_id == db_chat_message.chatflow_id,
                ChatMessage.created_at > db_chat_message.created_at
            )
            await self.db.execute(delete_stmt)

        # Delete the target message itself
        await self.db.delete(db_chat_message)
        await self.db.commit()
        return True

    async def start_new_chat(self, user_input: str) -> list[ChatMessage]:
        # 1. Generate a new chatflow_id for the new conversation
        chatflow_id = uuid.uuid4()

        # 2. Save user's message
        user_message = ChatMessageCreate(
            role="user",
            content=user_input,
            chatflow_id=chatflow_id
        )
        await self.create_chat_message(user_message)

        # 3. Trigger the LLM workflow (placeholder)
        llm_response_content = f"This is a simulated LLM response to your first message: '{user_input}'"

        # 4. Save LLM's response
        llm_message = ChatMessageCreate(
            role="assistant",
            content=llm_response_content,
            chatflow_id=chatflow_id
        )
        await self.create_chat_message(llm_message)
        
        # 5. Return all messages for the newly created chatflow
        return await self.get_chat_messages(chatflow_id)

    async def handle_chat_interaction(self, chatflow_id: UUID, user_input: str) -> list[ChatMessage]:
        # 1. Save user's message
        user_message = ChatMessageCreate(
            role="user",
            content=user_input,
            chatflow_id=chatflow_id
        )
        await self.create_chat_message(user_message)

        # 2. Trigger the LLM workflow (placeholder)
        # In a real scenario, you would use your engine to run a workflow
        # that takes the user_input and returns an LLM response.
        # execution_service = ExecutionService(self.db)
        # llm_response_content = execution_service.run_workflow(workflow_id, {"input": user_input})
        llm_response_content = f"This is a simulated LLM response to: '{user_input}'"

        # 3. Save LLM's response
        llm_message = ChatMessageCreate(
            role="assistant",
            content=llm_response_content,
            chatflow_id=chatflow_id
        )
        await self.create_chat_message(llm_message)
        
        # 4. Return all messages for the chatflow
        return await self.get_chat_messages(chatflow_id) 