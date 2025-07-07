"""Database engine configuration for Agent-Flow V2.

Provides SQLAlchemy engine, session management, and database initialization
using async PostgreSQL with connection pooling and proper configuration.
"""

import logging
from typing import AsyncGenerator, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession, AsyncEngine, create_async_engine, async_sessionmaker

from sqlalchemy import text
from sqlmodel import SQLModel

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Global engine instance
engine: Optional[AsyncEngine] = None
SessionLocal: Optional[async_sessionmaker] = None

# Database configuration constants
DEFAULT_POOL_SIZE = 20
DEFAULT_MAX_OVERFLOW = 10
DEFAULT_POOL_TIMEOUT = 30
DEFAULT_POOL_RECYCLE = 3600  # 1 hour


def create_engine():
    """Create and configure the database engine."""
    global engine, SessionLocal
    
    if not settings.DATABASE_URL:
        raise ValueError("DATABASE_URL not configured")
    
    # Convert to async URL if needed
    database_url = settings.DATABASE_URL
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif database_url.startswith("sqlite:"):
        database_url = database_url.replace("sqlite:", "sqlite+aiosqlite:", 1)
    
    # Base engine configuration
    engine_kwargs: Dict[str, Any] = {
        "echo": settings.DEBUG,  # SQL logging in debug mode
        "future": True,
        "pool_pre_ping": True,  # Validate connections before use
    }
    
    # Add connection pool settings for PostgreSQL (async pools don't use QueuePool)
    if "postgresql" in database_url:
        engine_kwargs["pool_size"] = getattr(settings, "DB_POOL_SIZE", DEFAULT_POOL_SIZE)
        engine_kwargs["max_overflow"] = getattr(settings, "DB_POOL_MAX_OVERFLOW", DEFAULT_MAX_OVERFLOW)
        engine_kwargs["pool_timeout"] = getattr(settings, "DB_POOL_TIMEOUT", DEFAULT_POOL_TIMEOUT)
        engine_kwargs["pool_recycle"] = getattr(settings, "DB_POOL_RECYCLE", DEFAULT_POOL_RECYCLE)
    
    engine = create_async_engine(database_url, **engine_kwargs)
    
    SessionLocal = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=True,
        autocommit=False,
    )
    
    logger.info(f"Database engine created: {database_url.split('@')[-1] if '@' in database_url else database_url}")
    return engine


async def init_db() -> None:
    """Initialize database tables.
    
    Creates all tables defined in SQLModel metadata.
    Should be called once during application startup.
    """
    if not engine:
        create_engine()
    
    if not engine:
        raise RuntimeError("Database engine not initialized")
    
    try:
        # Import all models to ensure they're registered
        from app.db.models import (  # noqa: F401
            User, Workflow, Execution, Credential, Task, TaskLog, CustomNode
        )
        
        async with engine.begin() as conn:
            # Create all tables
            await conn.run_sync(SQLModel.metadata.create_all)
        
        logger.info("✅ Database tables initialized successfully")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize database: {e}")
        raise


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Get database session dependency for FastAPI.
    
    Yields:
        AsyncSession: Database session
        
    Usage:
        @app.get("/")
        async def endpoint(session: AsyncSession = Depends(get_session)):
            # Use session...
    """
    if not SessionLocal:
        create_engine()
    
    if not SessionLocal:
        raise RuntimeError("Database session factory not initialized")
    
    async with SessionLocal() as session:
        try:
            yield session
        except Exception as e:
            await session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            await session.close()


async def close_db() -> None:
    """Close database engine and cleanup connections.
    
    Should be called during application shutdown.
    """
    global engine
    
    if engine:
        await engine.dispose()
        logger.info("Database engine disposed")


# Context manager for manual session handling
class DatabaseSession:
    """Context manager for manual database session handling."""
    
    def __init__(self):
        if not SessionLocal:
            create_engine()
        self.session_factory = SessionLocal
    
    async def __aenter__(self) -> AsyncSession:
        if not self.session_factory:
            raise RuntimeError("Database session factory not initialized")
        
        self.session = self.session_factory()
        return self.session
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            await self.session.rollback()
        else:
            await self.session.commit()
        await self.session.close()


# Health check function
async def check_database_health() -> bool:
    """Check if database is healthy and accessible.
    
    Returns:
        bool: True if database is healthy, False otherwise
    """
    try:
        async with DatabaseSession() as session:
            # Simple query to test connection
            result = await session.execute(text("SELECT 1"))
            return result.scalar() == 1
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False


# Repository Factory
class RepositoryFactory:
    """Factory for creating repository instances with proper session management."""
    
    def __init__(self):
        if not SessionLocal:
            create_engine()
        self.session_factory = SessionLocal
    
    async def get_repositories(self, session: AsyncSession):
        """Get all repositories with the given session."""
        from .repositories import (
            UserRepository, WorkflowRepository, ExecutionRepository,
            CredentialRepository, TaskRepository, CustomNodeRepository
        )
        
        return {
            "user": UserRepository(),
            "workflow": WorkflowRepository(),
            "execution": ExecutionRepository(),
            "credential": CredentialRepository(),
            "task": TaskRepository(),
            "custom_node": CustomNodeRepository(),
        }

    # Individual repository getters for compatibility with ServiceFactory
    def get_user_repository(self):
        from .repositories import UserRepository
        return UserRepository()

    def get_workflow_repository(self):
        from .repositories import WorkflowRepository
        return WorkflowRepository()

    def get_execution_repository(self):
        from .repositories import ExecutionRepository
        return ExecutionRepository()

    def get_credential_repository(self):
        from .repositories import CredentialRepository
        return CredentialRepository()

    def get_task_repository(self):
        from .repositories import TaskRepository
        return TaskRepository()

    def get_custom_node_repository(self):
        from .repositories import CustomNodeRepository
        return CustomNodeRepository()


# Configuration management
def get_database_config() -> dict:
    """Get current database configuration."""
    return {
        "database_url": settings.DATABASE_URL,
        "debug": settings.DEBUG,
        "pool_size": getattr(settings, "DB_POOL_SIZE", DEFAULT_POOL_SIZE),
        "max_overflow": getattr(settings, "DB_POOL_MAX_OVERFLOW", DEFAULT_MAX_OVERFLOW),
        "pool_timeout": getattr(settings, "DB_POOL_TIMEOUT", DEFAULT_POOL_TIMEOUT),
        "pool_recycle": getattr(settings, "DB_POOL_RECYCLE", DEFAULT_POOL_RECYCLE),
    }


# Convenience exports
repository_factory = RepositoryFactory()

# Initialize engine on import (for convenience)
if not engine:
    try:
        create_engine()
    except Exception as e:
        logger.warning(f"Could not initialize database on import: {e}") 