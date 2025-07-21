from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.pool import QueuePool, NullPool
from app.core.config import get_settings

settings = get_settings()

# Connection pooling configuration optimized for Supabase + Vercel
sync_connection_args = {
    "pool_size": settings.DB_POOL_SIZE,
    "max_overflow": settings.DB_MAX_OVERFLOW,
    "pool_timeout": settings.DB_POOL_TIMEOUT,
    "pool_recycle": settings.DB_POOL_RECYCLE,
    "pool_pre_ping": settings.DB_POOL_PRE_PING,
    "poolclass": QueuePool,
    "echo": False,  # Disable in production for performance
    "connect_args": {"application_name": "kai-fusion"},
}

async_connection_args = {
    # Note: AsyncEngine automatically uses AsyncAdaptedQueuePool
    "pool_size": settings.DB_POOL_SIZE,
    "max_overflow": settings.DB_MAX_OVERFLOW,
    "pool_timeout": settings.DB_POOL_TIMEOUT,
    "pool_recycle": settings.DB_POOL_RECYCLE,
    "pool_pre_ping": settings.DB_POOL_PRE_PING,
    "echo": False,  # Disable in production for performance
    "connect_args": {
        "server_settings": {"application_name": "kai-fusion"},
        "statement_cache_size": 1000,  # Enable prepared statements for better performance
        "prepared_statement_cache_size": 100,
        "command_timeout": 60,
    },
}

# Create a synchronous engine for tasks that require it (e.g., migrations)
sync_engine = create_engine(
    settings.DATABASE_URL, 
    **sync_connection_args
)

# Create an asynchronous engine for the main application
async_engine = create_async_engine(
    settings.ASYNC_DATABASE_URL, 
    **async_connection_args
)

# Create a sessionmaker for asynchronous sessions
AsyncSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False  # Important for serverless
)

async def get_db_session() -> AsyncSession:
    """Dependency to get a database session."""
    async with AsyncSessionLocal() as session:
        yield session

async def create_tables():
    """Create all tables in the database."""
    from app.models.base import Base
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all) 