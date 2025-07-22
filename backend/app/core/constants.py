"""
Central constants file for all environment variables.
All os.getenv calls should be defined here and imported from other files.
"""
import os
from dotenv import load_dotenv

load_dotenv()

# Core Application Settings
APP_NAME = "KAI Fusion"
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
API_V1_STR = "/api/v1"
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
PORT = os.getenv("PORT", "8000")
DEBUG = os.getenv("DEBUG", "false").lower() in ("true", "1", "t")

# Database Settings
CREATE_DATABASE = os.getenv("CREATE_DATABASE", "false").lower() in ("true", "1", "t")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres.xjwosoxtrzysncbjrwlt:flowisekafein1!@aws-0-eu-north-1.pooler.supabase.com:5432/postgres")
POSTGRES_DB = os.getenv("POSTGRES_DB", "postgres")
POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "flowisekafein1!")
DATABASE_PORT = int(os.getenv("DATABASE_PORT", "5432"))
DATABASE_HOST = os.getenv("DATABASE_HOST", "aws-0-eu-north-1.pooler.supabase.com")
DATABASE_SSL = os.getenv("DATABASE_SSL", "true").lower() in ("true", "1", "t")
DISABLE_DATABASE = os.getenv("DISABLE_DATABASE", "false").lower() in ("true", "1", "t")

# Database Pool Settings
DB_POOL_SIZE = int(os.getenv("DB_POOL_SIZE", "5"))
DB_MAX_OVERFLOW = int(os.getenv("DB_MAX_OVERFLOW", "2"))
DB_POOL_TIMEOUT = int(os.getenv("DB_POOL_TIMEOUT", "5"))
DB_POOL_RECYCLE = int(os.getenv("DB_POOL_RECYCLE", "1800"))
DB_POOL_PRE_PING = os.getenv("DB_POOL_PRE_PING", "true").lower() in ("true", "1", "t")

# Supabase specific settings
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Agent Settings
AGENT_NODE_ID = "agent"

# Celery Settings
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")

# API Keys for Services
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GOOGLE_CSE_ID = os.getenv("GOOGLE_CSE_ID")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")

# Security
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
CREDENTIAL_MASTER_KEY = os.getenv("CREDENTIAL_MASTER_KEY")

# CORS Settings
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001,http://localhost:5173,http://localhost:8080,https://*.vercel.app,https://*.supabase.co")

# Logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# LangSmith Settings
LANGCHAIN_TRACING_V2 = os.getenv("LANGCHAIN_TRACING_V2", "false").lower() == "true"
LANGCHAIN_ENDPOINT = os.getenv("LANGCHAIN_ENDPOINT")
LANGCHAIN_API_KEY = os.getenv("LANGCHAIN_API_KEY")
LANGCHAIN_PROJECT = os.getenv("LANGCHAIN_PROJECT")
ENABLE_WORKFLOW_TRACING = os.getenv("ENABLE_WORKFLOW_TRACING", "false").lower() == "true"
TRACE_MEMORY_OPERATIONS = os.getenv("TRACE_MEMORY_OPERATIONS", "false").lower() == "true"
TRACE_AGENT_REASONING = os.getenv("TRACE_AGENT_REASONING", "false").lower() == "true"

# Session Management
SESSION_TTL_MINUTES = int(os.getenv("SESSION_TTL_MINUTES", "30"))
MAX_SESSIONS = int(os.getenv("MAX_SESSIONS", "1000"))

# File Upload Settings
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", "10485760"))  # 10MB
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")

# Rate Limiting
RATE_LIMIT_REQUESTS = int(os.getenv("RATE_LIMIT_REQUESTS", "100"))
RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW", "60"))

# Engine Settings
AF_USE_STUB_ENGINE = os.getenv("AF_USE_STUB_ENGINE", "false").lower() == "true"

# Async Database URL
def get_async_database_url():
    """Construct the asynchronous database URL from DATABASE_URL."""
    if DATABASE_URL.startswith("postgresql://"):
        return DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
    return DATABASE_URL

ASYNC_DATABASE_URL = os.getenv("ASYNC_DATABASE_URL")