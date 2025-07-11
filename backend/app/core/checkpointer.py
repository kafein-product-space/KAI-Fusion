"""
Checkpointing module for LangGraph workflows.

This module provides checkpointing functionality to persist workflow state
across executions. It supports both PostgreSQL for production and in-memory
storage for development/testing.
"""

import os
import warnings
from typing import Optional
from langgraph.checkpoint.memory import MemorySaver
from langgraph.checkpoint.base import BaseCheckpointSaver

try:
    from langgraph.checkpoint.postgres import PostgresSaver  # type: ignore[import-untyped]
    _POSTGRES_AVAILABLE = True
except ImportError:
    _POSTGRES_AVAILABLE = False
    PostgresSaver = None  # type: ignore[assignment]


def create_checkpointer(
    database_url: Optional[str] = None,
    use_memory: bool = False
) -> BaseCheckpointSaver:
    """
    Create an appropriate checkpointer based on configuration.
    
    Args:
        database_url: PostgreSQL connection URL (optional)
        use_memory: Force use of in-memory checkpointer
    
    Returns:
        BaseCheckpointSaver: Configured checkpointer instance
    """
    # Check if database is disabled via environment variable
    database_disabled = os.getenv("DISABLE_DATABASE", "false").lower() == "true"
    
    if use_memory or database_disabled or not database_url or not _POSTGRES_AVAILABLE:
        print("🧠 Using in-memory checkpointer for development")
        return MemorySaver()
    
    try:
        print("🗄️  Attempting to create PostgreSQL checkpointer...")
        if PostgresSaver is None:
            raise ImportError("PostgresSaver not available")
        
        checkpointer = PostgresSaver.from_conn_string(database_url)
        
        # Test connection silently
        checkpointer.setup()
        print("✅ PostgreSQL checkpointer initialized successfully")
        return checkpointer
        
    except Exception as e:
        if not database_disabled:  # Only warn if database was expected to work
            warnings.warn(f"Could not create PostgreSQL checkpointer: {e}")
        
        print("🧠 Falling back to in-memory checkpointer")
        return MemorySaver()


def get_default_checkpointer() -> BaseCheckpointSaver:
    """
    Get the default checkpointer for the application.
    
    Returns:
        BaseCheckpointSaver: Default checkpointer instance
    """
    database_url = os.getenv("DATABASE_URL")
    return create_checkpointer(database_url) 