"""
Central constants file for all environment variables.
All os.getenv calls should be defined here and imported from other files.
"""
import os
from dotenv import load_dotenv

load_dotenv()

# Core Application Settings
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
PORT = os.getenv("PORT", "8000")

# Database Settings
CREATE_DATABASE = os.getenv("CREATE_DATABASE")
DATABASE_URL = os.getenv("DATABASE_URL")
POSTGRES_DB = os.getenv("POSTGRES_DB")
POSTGRES_USER = os.getenv("POSTGRES_USER")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")
DATABASE_PORT = os.getenv("DATABASE_PORT")
DATABASE_HOST = os.getenv("DATABASE_HOST")
DATABASE_SSL = os.getenv("DATABASE_SSL")
DISABLE_DATABASE = os.getenv("DISABLE_DATABASE")
# Database Pool Settings
DB_POOL_SIZE = os.getenv("DB_POOL_SIZE", "5")
DB_MAX_OVERFLOW = os.getenv("DB_MAX_OVERFLOW", "2")
DB_POOL_TIMEOUT = os.getenv("DB_POOL_TIMEOUT", "5")
DB_POOL_RECYCLE = os.getenv("DB_POOL_RECYCLE", "1800")
DB_POOL_PRE_PING = os.getenv("DB_POOL_PRE_PING", "true")
# Redis Settings
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")
# API Keys
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GOOGLE_CSE_ID = os.getenv("GOOGLE_CSE_ID")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
COHERE_API_KEY = os.getenv("COHERE_API_KEY")
# Security
CREDENTIAL_MASTER_KEY = os.getenv("CREDENTIAL_MASTER_KEY")
# Logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
# LangSmith Settings
LANGCHAIN_TRACING_V2 = os.getenv("LANGCHAIN_TRACING_V2", "false")
LANGCHAIN_ENDPOINT = os.getenv("LANGCHAIN_ENDPOINT")
LANGCHAIN_API_KEY = os.getenv("LANGCHAIN_API_KEY")
LANGCHAIN_PROJECT = os.getenv("LANGCHAIN_PROJECT")
# Session Management
SESSION_TTL_MINUTES = os.getenv("SESSION_TTL_MINUTES", "30")
MAX_SESSIONS = os.getenv("MAX_SESSIONS", "1000")
# File Upload Settings
MAX_FILE_SIZE = os.getenv("MAX_FILE_SIZE", "10485760") # 10MB
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
# Rate Limiting
RATE_LIMIT_REQUESTS = os.getenv("RATE_LIMIT_REQUESTS", "100")
RATE_LIMIT_WINDOW = os.getenv("RATE_LIMIT_WINDOW", "60")
# Engine Settings
AF_USE_STUB_ENGINE = os.getenv("AF_USE_STUB_ENGINE", "false")

ASYNC_DATABASE_URL = os.getenv("ASYNC_DATABASE_URL")