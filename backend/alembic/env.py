"""Alembic environment configuration for Agent-Flow V2.

Configured to work with SQLModel metadata and environment variables
for database connection. Supports both online and offline migrations.
"""

import asyncio
import os
import sys
from logging.config import fileConfig
from typing import Any, Dict

from sqlalchemy import create_engine, pool
from sqlalchemy.ext.asyncio import create_async_engine
from alembic import context

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import our application modules
try:
    from app.db.models import SQLModel
    target_metadata = SQLModel.metadata
    print("Successfully imported SQLModel metadata")
except ImportError as e:
    print(f"Warning: Could not import SQLModel: {e}")
    print("Using None for target_metadata - autogenerate will be disabled")
    target_metadata = None

# Try to import settings for database URL
try:
    from app.core.config import get_settings
    settings = get_settings()
except ImportError:
    print("Warning: Could not import settings, using environment variables")
    settings = None

# This is the Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# target_metadata is set above based on successful import

def get_database_url() -> str:
    """Get database URL from environment or settings."""
    # Try to get from environment first
    database_url = os.getenv("DATABASE_URL")
    
    # Fallback to settings if available
    if not database_url and settings:
        database_url = settings.DATABASE_URL
    
    # Final fallback for development
    if not database_url:
        database_url = "postgresql://agentflow:agentflow@localhost:5432/agentflow_dev"
        print(f"Warning: No DATABASE_URL found, using fallback: {database_url}")
    
    # Convert async URL to sync for Alembic
    if database_url.startswith("postgresql+asyncpg://"):
        database_url = database_url.replace("postgresql+asyncpg://", "postgresql://", 1)
    elif database_url.startswith("sqlite+aiosqlite://"):
        database_url = database_url.replace("sqlite+aiosqlite://", "sqlite://", 1)
    
    return database_url

def get_engine_config() -> Dict[str, Any]:
    """Get engine configuration for migrations."""
    database_url = get_database_url()
    
    config_dict = {
        "sqlalchemy.url": database_url,
        "sqlalchemy.poolclass": pool.NullPool,  # Disable connection pooling for migrations
    }
    
    # Add PostgreSQL-specific settings
    if "postgresql" in database_url:
        config_dict.update({
            "sqlalchemy.echo": False,  # Set to True for SQL debugging
            "sqlalchemy.future": True,
        })
    
    return config_dict

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL and not an Engine.
    Calls to context.execute() emit SQL strings to the script output.
    """
    url = get_database_url()
    
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,  # Compare column types
        compare_server_default=True,  # Compare server defaults
        include_object=include_object,  # Custom filter function
    )

    with context.begin_transaction():
        context.run_migrations()

def include_object(object, name, type_, reflected, compare_to):
    """Include object filter for migrations.
    
    Used to exclude certain tables or objects from autogeneration.
    """
    # Exclude Alembic's version table
    if type_ == "table" and name == "alembic_version":
        return False
    
    # Exclude any temporary or system tables
    if name.startswith("_"):
        return False
    
    # Include everything else
    return True

def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    Creates an Engine and associates a connection with the context.
    """
    # Get engine configuration
    configuration = get_engine_config()
    
    # Create engine
    connectable = create_engine(
        configuration["sqlalchemy.url"],
        poolclass=configuration["sqlalchemy.poolclass"],
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,  # Compare column types
            compare_server_default=True,  # Compare server defaults
            include_object=include_object,  # Custom filter function
        )

        with context.begin_transaction():
            context.run_migrations()

def run_async_migrations() -> None:
    """Run migrations with async engine (for async-only databases).
    
    NOTE: This function is not currently used but provided for future async support.
    Use run_migrations_online() for standard sync migrations.
    """
    
    def do_run_migrations(connection):
        """Run migrations synchronously within async context."""
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
            include_object=include_object,
        )

        with context.begin_transaction():
            context.run_migrations()

    async def async_main():
        """Main async function for migrations."""
        database_url = get_database_url()
        
        # Convert back to async URL if needed
        if database_url.startswith("postgresql://"):
            database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        elif database_url.startswith("sqlite://"):
            database_url = database_url.replace("sqlite://", "sqlite+aiosqlite://", 1)
        
        connectable = create_async_engine(database_url)
        
        async with connectable.connect() as connection:
            await connection.run_sync(do_run_migrations)
        
        await connectable.dispose()

    asyncio.run(async_main())

# Determine which migration mode to use
if context.is_offline_mode():
    print("Running migrations in offline mode...")
    run_migrations_offline()
else:
    print("Running migrations in online mode...")
    # Use sync migrations by default (more compatible)
    run_migrations_online()
    
    # Uncomment to use async migrations if needed:
    # run_async_migrations()
