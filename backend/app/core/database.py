from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from app.core.config import get_settings

settings = get_settings()

# Create a synchronous engine for tasks that require it (e.g., migrations)
sync_engine = create_engine(settings.DATABASE_URL, echo=True)

# Create an asynchronous engine for the main application
async_engine = create_async_engine(settings.ASYNC_DATABASE_URL, echo=True)

# Create a sessionmaker for asynchronous sessions
AsyncSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=async_engine,
    class_=AsyncSession
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