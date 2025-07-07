from typing import Dict, Any, Optional, Iterator, Tuple, Union
import json
import uuid
from datetime import datetime

from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.checkpoint.base import CheckpointTuple, Checkpoint
from sqlalchemy import create_engine, Column, String, DateTime, Text, MetaData, Table, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import UUID

from app.core.config import get_settings

# Define the flow_states table schema
metadata = MetaData()

flow_states_table = Table(
    'flow_states',
    metadata,
    Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column('thread_id', String(255), nullable=False, index=True),
    Column('checkpoint_id', String(255), nullable=False),
    Column('parent_checkpoint_id', String(255), nullable=True),
    Column('checkpoint_data', Text, nullable=False),  # JSON serialized checkpoint
    Column('metadata', Text, nullable=True),  # JSON serialized metadata
    Column('created_at', DateTime, default=datetime.utcnow),
    Column('updated_at', DateTime, default=datetime.utcnow, onupdate=datetime.utcnow),
)


class PostgresCheckpointer(BaseCheckpointSaver):
    """
    PostgreSQL-based checkpointer for LangGraph state persistence
    This enables conversation/session continuity across requests
    """
    
    def __init__(self, connection_string: Optional[str] = None):
        super().__init__()
        
        # Get database URL from settings if not provided
        if connection_string:
            self.engine = create_engine(connection_string)
        else:
            settings = get_settings()
            if settings.DATABASE_URL:
                # Only enable for real Postgres connections; skip for SQLite
                if settings.DATABASE_URL.startswith("sqlite"):
                    import warnings
                    warnings.warn("Skipping Postgres checkpointer for SQLite DATABASE_URL")
                    self.engine = None
                    self.session_factory = None
                    return
                self.engine = create_engine(settings.DATABASE_URL)
            else:
                # Checkpointer not available without proper database URL
                # This is OK - the application can still run without checkpointing
                import warnings
                warnings.warn("PostgreSQL checkpointer not available: no DATABASE_URL configured")
                self.engine = None
                self.session_factory = None
                return
        
        self.session_factory = sessionmaker(bind=self.engine)
        
        # Create table if it doesn't exist
        try:
            metadata.create_all(self.engine)
        except Exception as e:
            import warnings
            warnings.warn(f"Could not create checkpoint tables: {e}")
    
    def is_available(self) -> bool:
        """Check if the checkpointer is available (has a valid database connection)"""
        return (
            self.engine is not None
            and self.session_factory is not None
            and self.engine.dialect.name == "postgresql"
        )
    
    def put(
        self,
        config: Dict[str, Any],
        checkpoint: Checkpoint,
        metadata: Optional[Dict[str, Any]] = None,
        new_versions: Optional[Any] = None,  # noqa: ANN401 – opaque to us
    ) -> None:
        """Save a checkpoint to PostgreSQL"""
        if not self.is_available():
            return  # Silently skip if checkpointer not available
            
        thread_id = self._get_thread_id(config)
        if not thread_id:
            raise ValueError("thread_id is required in config")
        
        checkpoint_id = checkpoint.get("id", str(uuid.uuid4()))
        parent_id = checkpoint.get("parent_id")
        
        # Serialize checkpoint data
        checkpoint_json = json.dumps(checkpoint, default=str)
        metadata_json = json.dumps(metadata or {}, default=str)
        
        with self.session_factory() as session:  # type: ignore
            try:
                # Use SQLAlchemy text() for raw SQL
                insert_stmt = text("""
                INSERT INTO flow_states (thread_id, checkpoint_id, parent_checkpoint_id, checkpoint_data, metadata)
                VALUES (:thread_id, :checkpoint_id, :parent_id, :checkpoint_data, :metadata)
                ON CONFLICT (thread_id, checkpoint_id) 
                DO UPDATE SET 
                    checkpoint_data = EXCLUDED.checkpoint_data,
                    metadata = EXCLUDED.metadata,
                    updated_at = NOW()
                """)
                
                session.execute(insert_stmt, {
                    "thread_id": thread_id,
                    "checkpoint_id": checkpoint_id,
                    "parent_id": parent_id,
                    "checkpoint_data": checkpoint_json,
                    "metadata": metadata_json
                })
                session.commit()
                
            except Exception as e:
                session.rollback()
                raise e
    
    def get(
        self,
        config: Dict[str, Any]
    ) -> Optional[CheckpointTuple]:
        """Get the latest checkpoint for a thread"""
        if not self.is_available():
            return None
            
        thread_id = self._get_thread_id(config)
        if not thread_id:
            return None
        
        with self.session_factory() as session:  # type: ignore
            try:
                # Get the most recent checkpoint for this thread
                query = text("""
                SELECT checkpoint_id, parent_checkpoint_id, checkpoint_data, metadata
                FROM flow_states 
                WHERE thread_id = :thread_id
                ORDER BY created_at DESC
                LIMIT 1
                """)
                
                result = session.execute(query, {"thread_id": thread_id}).fetchone()
                
                if not result:
                    return None
                
                checkpoint_id, parent_id, checkpoint_data, metadata = result
                
                # Deserialize data
                checkpoint = json.loads(checkpoint_data)
                metadata_dict = json.loads(metadata or '{}')
                
                # Create config dictionaries that match RunnableConfig structure
                current_config: Dict[str, Any] = {"thread_id": thread_id}
                parent_config: Optional[Dict[str, Any]] = None
                if parent_id:
                    parent_config = {"thread_id": thread_id, "checkpoint_id": parent_id}
                
                return CheckpointTuple(
                    config=current_config,  # type: ignore
                    checkpoint=checkpoint,
                    metadata=metadata_dict,
                    parent_config=parent_config  # type: ignore
                )
                
            except Exception as e:
                print(f"Error getting checkpoint: {e}")
                return None
    
    def list(
        self,
        config: Dict[str, Any],
        limit: Optional[int] = None,
        before: Optional[str] = None
    ) -> Iterator[CheckpointTuple]:
        """List checkpoints for a thread"""
        if not self.is_available():
            return iter([])
            
        thread_id = self._get_thread_id(config)
        if not thread_id:
            return iter([])
        
        with self.session_factory() as session:  # type: ignore
            try:
                # Build query
                query_str = "SELECT checkpoint_id, parent_checkpoint_id, checkpoint_data, metadata FROM flow_states WHERE thread_id = :thread_id"
                params = {"thread_id": thread_id}
                
                if before:
                    query_str += " AND created_at < :before"
                    params["before"] = before
                
                query_str += " ORDER BY created_at DESC"
                
                if limit:
                    query_str += " LIMIT :limit"
                    params["limit"] = limit
                
                query = text(query_str)
                results = session.execute(query, params).fetchall()
                
                for checkpoint_id, parent_id, checkpoint_data, metadata in results:
                    checkpoint = json.loads(checkpoint_data)
                    metadata_dict = json.loads(metadata or '{}')
                    
                    current_config: Dict[str, Any] = {"thread_id": thread_id, "checkpoint_id": checkpoint_id}
                    parent_config: Optional[Dict[str, Any]] = None
                    if parent_id:
                        parent_config = {"thread_id": thread_id, "checkpoint_id": parent_id}
                    
                    yield CheckpointTuple(
                        config=current_config,  # type: ignore
                        checkpoint=checkpoint,
                        metadata=metadata_dict,
                        parent_config=parent_config  # type: ignore
                    )
                    
            except Exception as e:
                print(f"Error listing checkpoints: {e}")
                return iter([])
    
    async def aget_tuple(self, config: Dict[str, Any]) -> Optional[CheckpointTuple]:
        """Async wrapper around ``get_tuple``."""
        # In real production we would run in thread-pool; for tests we block.
        return self.get(config)

    async def aput(
        self,
        config: Dict[str, Any],
        checkpoint: Checkpoint,
        metadata: Optional[Dict[str, Any]] = None,
        new_versions: Optional[Any] = None,  # noqa: ANN401
    ) -> None:
        """Async wrapper around ``put`` with forward-compat signature."""
        self.put(config, checkpoint, metadata, new_versions)

    def get_tuple(self, config: Dict[str, Any]) -> Optional[CheckpointTuple]:
        """Get a specific checkpoint by config."""
        return self.get(config)
    
    def put_writes(self, config: Dict[str, Any], writes: list, task_id: str) -> None:  # type: ignore
        """Store pending writes (for advanced use cases)"""
        # This can be implemented later for more advanced scenarios
        pass
    
    def delete(self, config: Dict[str, Any]) -> None:
        """Delete checkpoints for a thread"""
        if not self.is_available():
            return
            
        thread_id = self._get_thread_id(config)
        if not thread_id:
            return
        
        with self.session_factory() as session:  # type: ignore
            try:
                query = text("DELETE FROM flow_states WHERE thread_id = :thread_id")
                session.execute(query, {"thread_id": thread_id})
                session.commit()
            except Exception as e:
                session.rollback()
                print(f"Error deleting checkpoints: {e}")
    
    def cleanup_old_checkpoints(self, days_old: int = 30) -> int:
        """Clean up old checkpoints to prevent database bloat"""
        with self.session_factory() as session:  # type: ignore
            try:
                query = text("""
                DELETE FROM flow_states 
                WHERE created_at < NOW() - INTERVAL ':days days'
                """)
                result = session.execute(query, {"days": days_old})
                session.commit()
                return getattr(result, 'rowcount', 0) or 0
            except Exception as e:
                session.rollback()
                print(f"Error cleaning up checkpoints: {e}")
                return 0

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _get_thread_id(cfg: Dict[str, Any]) -> Optional[str]:
        """Extract ``thread_id`` from either top-level or configurable dict."""
        return cfg.get("thread_id") or cfg.get("configurable", {}).get("thread_id")


# Global instance - instantiate lazily to avoid import errors
_postgres_checkpointer = None

def get_postgres_checkpointer() -> PostgresCheckpointer:
    """Get the global PostgreSQL checkpointer instance"""
    global _postgres_checkpointer
    if _postgres_checkpointer is None:
        _postgres_checkpointer = PostgresCheckpointer()
    return _postgres_checkpointer

# For backwards compatibility
postgres_checkpointer = None  # Will be set when first accessed 