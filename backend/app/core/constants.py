"""
Central constants file for all environment variables.
All os.getenv calls should be defined here and imported from other files.
"""
import os

# Core Application Settings
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
ENVIRONMENT = "development"
PORT = "8000"

# Database Settings
DATABASE_URL = os.getenv("DATABASE_URL")
POSTGRES_DB = os.getenv("POSTGRES_DB")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")
DISABLE_DATABASE = os.getenv("DISABLE_DATABASE", "false")
# Database Pool Settings
DB_POOL_SIZE = "30"
DB_MAX_OVERFLOW = "10"
DB_POOL_TIMEOUT = "10"
DB_POOL_RECYCLE = "1800"
DB_POOL_PRE_PING = "true"

CREDENTIAL_MASTER_KEY = "1234567890"
# Logging
LOG_LEVEL = "INFO"
DEBUG = os.getenv("DEBUG", "false").lower() in ("true", "1", "t")

# CORS Settings
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*")
# LangSmith Settings
LANGCHAIN_TRACING_V2 = os.getenv("LANGCHAIN_TRACING_V2", "true")
LANGCHAIN_ENDPOINT = os.getenv("LANGCHAIN_ENDPOINT")
LANGCHAIN_API_KEY = os.getenv("LANGCHAIN_API_KEY")
LANGCHAIN_PROJECT = os.getenv("LANGCHAIN_PROJECT")
# Workflow Tracing
ENABLE_WORKFLOW_TRACING = "true"
TRACE_AGENT_REASONING ="true"
TRACE_MEMORY_OPERATIONS = "true"

ALGORITHM = "HS256"

# Session Management
SESSION_TTL_MINUTES = "30"
MAX_SESSIONS = "1000"
# File Upload Settings
MAX_FILE_SIZE = "10485760" # 10MB
UPLOAD_DIR = "uploads"
# Rate Limiting
RATE_LIMIT_REQUESTS = "100"
RATE_LIMIT_WINDOW = "60"
# Engine Settings
AF_USE_STUB_ENGINE = "false"

ASYNC_DATABASE_URL = os.getenv("ASYNC_DATABASE_URL")

ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7