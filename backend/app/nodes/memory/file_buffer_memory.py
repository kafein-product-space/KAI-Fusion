 
import os
from typing import Dict, Any

from ..base import ProviderNode, NodeInput, NodeType
from langchain_community.chat_message_histories import FileChatMessageHistory

class FileBufferMemory(ProviderNode):
    """
    Node that provides a file-backed conversation buffer memory.
    It returns a history object that can be used with chains that require memory.
    """
    def __init__(self):
        super().__init__()
        self._metadatas = {
            "name": "FileBufferMemory",
            "display_name": "File Buffer Memory",
            "description": "Provides a conversation buffer memory backed by a JSON file, persisting across sessions.",
            "category": "Memory",
            "node_type": NodeType.MEMORY,
            "inputs": [
                NodeInput(name="session_id", type="string", description="Unique ID for the conversation session.", default="default_session"),
                NodeInput(name="base_path", type="string", description="Directory to store memory files.", default="memory_logs"),
            ],
            "outputs": []
        }

    def execute(self, **kwargs) -> Any:
        """
        Creates and returns a FileChatMessageHistory object.
        """
        session_id = kwargs.get("session_id", "default_session")
        base_path = kwargs.get("base_path", "memory_logs")
        
        os.makedirs(base_path, exist_ok=True)
        
        file_path = os.path.join(base_path, f"{session_id}.json")

        return FileChatMessageHistory(file_path=file_path) 