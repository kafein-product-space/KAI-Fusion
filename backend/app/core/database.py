import time
import logging
from typing import Dict, Any, Optional
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.pool import QueuePool, NullPool
from sqlalchemy.engine import Engine
from app.core.constants import DB_POOL_SIZE, DB_MAX_OVERFLOW, DB_POOL_TIMEOUT, DB_POOL_RECYCLE, DB_POOL_PRE_PING, DATABASE_URL, ASYNC_DATABASE_URL
from app.core.logging_config import log_database_operation, log_performance

# Connection pooling configuration optimized for Supabase + Vercel
sync_connection_args = {
    "pool_size": int(DB_POOL_SIZE),
    "max_overflow": int(DB_MAX_OVERFLOW),
    "pool_timeout": int(DB_POOL_TIMEOUT),
    "pool_recycle": int(DB_POOL_RECYCLE),
    "pool_pre_ping": DB_POOL_PRE_PING if isinstance(DB_POOL_PRE_PING, bool) else DB_POOL_PRE_PING.lower() in ("true", "1", "t"),
    "poolclass": QueuePool,
    "echo": False,  # Disable in production for performance
    "connect_args": {"application_name": "kai-fusion"},
}

async_connection_args = {
    # Note: AsyncEngine automatically uses AsyncAdaptedQueuePool
    "pool_size": int(DB_POOL_SIZE),
    "max_overflow": int(DB_MAX_OVERFLOW),
    "pool_timeout": int(DB_POOL_TIMEOUT),
    "pool_recycle": int(DB_POOL_RECYCLE),
    "pool_pre_ping": DB_POOL_PRE_PING if isinstance(DB_POOL_PRE_PING, bool) else DB_POOL_PRE_PING.lower() in ("true", "1", "t"),
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
    DATABASE_URL, 
    **sync_connection_args
)

# Create an asynchronous engine for the main application
async_engine = create_async_engine(
    ASYNC_DATABASE_URL, 
    **async_connection_args
)

# Database logging will be initialized after setup_database_logging is defined

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

logger = logging.getLogger(__name__)

# Database monitoring variables
_query_stats = {
    "total_queries": 0,
    "slow_queries": 0,
    "failed_queries": 0,
    "total_duration": 0.0
}


def setup_database_logging():
    """Setup SQLAlchemy event listeners for comprehensive database logging."""
    
    @event.listens_for(Engine, "before_cursor_execute")
    def receive_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        """Log before SQL query execution."""
        context._query_start_time = time.time()
        
        # Log query start (truncate parameters for security)
        params_str = str(parameters)[:200] + "..." if len(str(parameters)) > 200 else str(parameters)
        
        logger.debug("Executing SQL query", extra={
            "sql_statement": statement[:500] + "..." if len(statement) > 500 else statement,
            "sql_parameters": params_str,
            "executemany": executemany,
            "connection_info": str(conn.info) if hasattr(conn, 'info') else None
        })
    
    @event.listens_for(Engine, "after_cursor_execute")
    def receive_after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        """Log after SQL query execution with timing."""
        if hasattr(context, '_query_start_time'):
            duration = time.time() - context._query_start_time
            
            # Update stats
            _query_stats["total_queries"] += 1
            _query_stats["total_duration"] += duration
            
            # Determine operation type
            operation = statement.strip().split()[0].upper() if statement.strip() else "UNKNOWN"
            
            # Extract table name (basic parsing)
            table_name = "unknown"
            try:
                if "FROM" in statement.upper():
                    parts = statement.upper().split("FROM")[1].strip().split()
                    if parts:
                        table_name = parts[0].strip()
                elif "INTO" in statement.upper():
                    parts = statement.upper().split("INTO")[1].strip().split()
                    if parts:
                        table_name = parts[0].strip()
                elif "UPDATE" in statement.upper():
                    parts = statement.upper().split("UPDATE")[1].strip().split()
                    if parts:
                        table_name = parts[0].strip()
            except Exception:
                table_name = "unknown"
            
            # Log slow queries
            if duration > 1.0:  # Queries taking more than 1 second
                _query_stats["slow_queries"] += 1
                logger.warning("Slow database query detected", extra={
                    "duration_seconds": round(duration, 4),
                    "sql_operation": operation,
                    "table_name": table_name,
                    "statement_preview": statement[:200] + "..." if len(statement) > 200 else statement
                })
            
            # Log operation with timing
            log_database_operation(
                operation=operation,
                table=table_name,
                duration=duration,
                row_count=cursor.rowcount if hasattr(cursor, 'rowcount') else None
            )
    
    @event.listens_for(Engine, "handle_error")
    def receive_handle_error(exception_context):
        """Log database errors."""
        _query_stats["failed_queries"] += 1
        
        logger.error("Database error occurred", extra={
            "error_type": type(exception_context.original_exception).__name__,
            "error_message": str(exception_context.original_exception),
            "sql_statement": str(exception_context.statement)[:500] if exception_context.statement else None,
            "sql_parameters": str(exception_context.parameters)[:200] if exception_context.parameters else None,
            "connection_info": str(exception_context.connection.info) if exception_context.connection else None
        })
    
    @event.listens_for(Engine, "connect")
    def receive_connect(dbapi_connection, connection_record):
        """Log database connections."""
        logger.info("New database connection established", extra={
            "connection_id": id(dbapi_connection),
            "connection_info": str(connection_record.info) if hasattr(connection_record, 'info') else None
        })
    
    @event.listens_for(Engine, "checkout")
    def receive_checkout(dbapi_connection, connection_record, connection_proxy):
        """Log connection checkout from pool."""
        try:
            pool_info = {}
            if hasattr(connection_proxy, 'pool'):
                pool = connection_proxy.pool
                pool_info = {
                    "pool_size": getattr(pool, 'size', lambda: 'unknown')(),
                    "checked_out_connections": getattr(pool, 'checkedout', lambda: 'unknown')()
                }
            
            logger.debug("Connection checked out from pool", extra={
                "connection_id": id(dbapi_connection),
                **pool_info
            })
        except Exception as e:
            logger.debug("Connection checked out from pool", extra={
                "connection_id": id(dbapi_connection),
                "pool_status_error": str(e)
            })
    
    @event.listens_for(Engine, "checkin")
    def receive_checkin(dbapi_connection, connection_record):
        """Log connection checkin to pool."""
        logger.debug("Connection checked in to pool", extra={
            "connection_id": id(dbapi_connection)
        })


# Initialize database logging now that the function is defined
setup_database_logging()


def get_database_stats() -> Dict[str, Any]:
    """Get current database statistics."""
    try:
        avg_duration = _query_stats["total_duration"] / max(_query_stats["total_queries"], 1)
        
        # Safely get pool statuses
        sync_pool_status = {"status": "not_available"}
        async_pool_status = {"status": "not_available"}
        
        try:
            sync_pool_status = get_sync_pool_status()
        except Exception as e:
            logger.debug(f"Failed to get sync pool status: {e}")
            sync_pool_status = {"status": "error", "error": str(e)}
        
        try:
            async_pool_status = get_async_pool_status()
        except Exception as e:
            logger.debug(f"Failed to get async pool status: {e}")
            async_pool_status = {"status": "error", "error": str(e)}
        
        return {
            "total_queries": _query_stats["total_queries"],
            "slow_queries": _query_stats["slow_queries"],
            "failed_queries": _query_stats["failed_queries"],
            "total_duration_seconds": round(_query_stats["total_duration"], 2),
            "average_query_duration_ms": round(avg_duration * 1000, 2),
            "sync_pool_status": sync_pool_status,
            "async_pool_status": async_pool_status
        }
    except Exception as e:
        logger.error(f"Failed to get database stats: {e}")
        return {
            "error": str(e),
            "total_queries": 0,
            "slow_queries": 0,
            "failed_queries": 0,
            "total_duration_seconds": 0,
            "average_query_duration_ms": 0,
            "sync_pool_status": {"status": "error"},
            "async_pool_status": {"status": "error"}
        }


def get_sync_pool_status() -> Dict[str, Any]:
    """Get synchronous connection pool status."""
    if sync_engine and hasattr(sync_engine, 'pool'):
        pool = sync_engine.pool
        return {
            "size": pool.size(),
            "checked_out": pool.checkedout(),
            "overflow": pool.overflow(),
            "checked_in": pool.checkedin()
        }
    return {"status": "not_available"}


def get_async_pool_status() -> Dict[str, Any]:
    """Get asynchronous connection pool status."""
    try:
        if async_engine:
            # For async engines, access the underlying sync engine's pool
            if hasattr(async_engine, 'sync_engine') and hasattr(async_engine.sync_engine, 'pool'):
                pool = async_engine.sync_engine.pool
                return {
                    "size": pool.size(),
                    "checked_out": pool.checkedout(),
                    "overflow": pool.overflow(),
                    "checked_in": pool.checkedin()
                }
            # Alternative approach: try accessing pool directly
            elif hasattr(async_engine, 'pool'):
                pool = async_engine.pool
                return {
                    "size": getattr(pool, 'size', lambda: 0)(),
                    "checked_out": getattr(pool, 'checkedout', lambda: 0)(),
                    "overflow": getattr(pool, 'overflow', lambda: 0)(),
                    "checked_in": getattr(pool, 'checkedin', lambda: 0)()
                }
    except Exception as e:
        logger.warning(f"Could not get async pool status: {e}")
        return {"status": "error", "error": str(e)}
    
    return {"status": "not_available"}


async def check_database_health() -> Dict[str, Any]:
    """
    Perform a comprehensive database health check.
    
    Returns:
        Dict containing health check results
    """
    start_time = time.time()
    health_status = {
        "healthy": False,
        "connection_test": False,
        "query_test": False,
        "response_time_ms": 0,
        "error": None
    }
    
    try:
        # Test database connection and basic query
        async with AsyncSessionLocal() as session:
            # Simple query to test connection
            from sqlalchemy import text
            result = await session.execute(text("SELECT 1 as health_check"))
            row = result.fetchone()
            
            if row and row[0] == 1:
                health_status["connection_test"] = True
                health_status["query_test"] = True
                health_status["healthy"] = True
            
        response_time = (time.time() - start_time) * 1000
        health_status["response_time_ms"] = round(response_time, 2)
        
        logger.info("Database health check completed", extra={
            "healthy": health_status["healthy"],
            "response_time_ms": health_status["response_time_ms"]
        })
        
    except Exception as e:
        health_status["error"] = str(e)
        logger.error("Database health check failed", extra={
            "error": str(e),
            "error_type": type(e).__name__
        })
    
    return health_status


async def create_tables():
    """Create all tables in the database."""
    start_time = time.time()
    try:
        from app.models.base import Base
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        duration = time.time() - start_time
        log_performance("create_tables", duration, operation="schema_creation")
        logger.info("Database tables created successfully", extra={
            "duration_seconds": round(duration, 4)
        })
        
    except Exception as e:
        duration = time.time() - start_time
        logger.error("Failed to create database tables", extra={
            "error": str(e),
            "error_type": type(e).__name__,
            "duration_seconds": round(duration, 4)
        })
        raise 