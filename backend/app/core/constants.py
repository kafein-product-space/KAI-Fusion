"""
Central constants file for all environment variables.
All os.getenv calls should be defined here and imported from other files.
"""
import os
from dotenv import load_dotenv

load_dotenv()

# Core Application Settings
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production").strip()
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").strip()
PORT = os.getenv("PORT", "8000").strip()

# Database Settings
CREATE_DATABASE = os.getenv("CREATE_DATABASE").strip()
print("Create Database",CREATE_DATABASE)
DATABASE_URL = os.getenv("DATABASE_URL").strip()
print("Database URL",DATABASE_URL)
POSTGRES_DB = os.getenv("POSTGRES_DB").strip()
print("Postgres DB",POSTGRES_DB)
POSTGRES_USER = os.getenv("POSTGRES_USER").strip()
print("Postgres User",POSTGRES_USER)
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD").strip()
print("Postgres Password",POSTGRES_PASSWORD)
DATABASE_PORT = os.getenv("DATABASE_PORT").strip()
print("Database Port",DATABASE_PORT)
DATABASE_HOST = os.getenv("DATABASE_HOST").strip()
print("Database Host",DATABASE_HOST)
DATABASE_SSL = os.getenv("DATABASE_SSL").strip()
print("Database SSL",DATABASE_SSL)
DISABLE_DATABASE = os.getenv("DISABLE_DATABASE").strip()
print("Disable Database",DISABLE_DATABASE)
# Database Pool Settings
DB_POOL_SIZE = os.getenv("DB_POOL_SIZE", "5").strip()
print("DB Pool Size",DB_POOL_SIZE)
DB_MAX_OVERFLOW = os.getenv("DB_MAX_OVERFLOW", "2").strip()
print("DB Max Overflow",DB_MAX_OVERFLOW)
DB_POOL_TIMEOUT = os.getenv("DB_POOL_TIMEOUT", "5").strip()
print("DB Pool Timeout",DB_POOL_TIMEOUT)
DB_POOL_RECYCLE = os.getenv("DB_POOL_RECYCLE", "1800").strip()
print("DB Pool Recycle",DB_POOL_RECYCLE)
DB_POOL_PRE_PING = os.getenv("DB_POOL_PRE_PING", "true").strip()
print("DB Pool Pre Ping",DB_POOL_PRE_PING)
# Redis Settings
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0").strip()
print("Redis URL",REDIS_URL)
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0").strip()
print("Celery Broker URL",CELERY_BROKER_URL)
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0").strip()
print("Celery Result Backend",CELERY_RESULT_BACKEND)
# API Keys
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
print("OpenAI API Key",OPENAI_API_KEY)
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
print("Anthropic API Key",ANTHROPIC_API_KEY)
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
print("Google API Key",GOOGLE_API_KEY)
GOOGLE_CSE_ID = os.getenv("GOOGLE_CSE_ID")
print("Google CSE ID",GOOGLE_CSE_ID)
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
print("TAVILY API Key",TAVILY_API_KEY)
COHERE_API_KEY = os.getenv("COHERE_API_KEY")
print("Cohere API Key",COHERE_API_KEY)
# Security
CREDENTIAL_MASTER_KEY = os.getenv("CREDENTIAL_MASTER_KEY")
print("Credential Master Key",CREDENTIAL_MASTER_KEY)
# Logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").strip()
print("Log Level",LOG_LEVEL)
# LangSmith Settings
LANGCHAIN_TRACING_V2 = os.getenv("LANGCHAIN_TRACING_V2", "false").strip()
print("LangChain Tracing V2",LANGCHAIN_TRACING_V2)
LANGCHAIN_ENDPOINT = os.getenv("LANGCHAIN_ENDPOINT")
print("LangChain Endpoint",LANGCHAIN_ENDPOINT)
LANGCHAIN_API_KEY = os.getenv("LANGCHAIN_API_KEY")
print("LangChain API Key",LANGCHAIN_API_KEY)
LANGCHAIN_PROJECT = os.getenv("LANGCHAIN_PROJECT")
print("LangChain Project",LANGCHAIN_PROJECT)
# Session Management
SESSION_TTL_MINUTES = os.getenv("SESSION_TTL_MINUTES", "30").strip()
print("Session TTL Minutes",SESSION_TTL_MINUTES)
MAX_SESSIONS = os.getenv("MAX_SESSIONS", "1000").strip()
print("Max Sessions",MAX_SESSIONS)
# File Upload Settings
MAX_FILE_SIZE = os.getenv("MAX_FILE_SIZE", "10485760").strip() # 10MB
print("Max File Size",MAX_FILE_SIZE)
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads").strip()
print("Upload Dir",UPLOAD_DIR)
# Rate Limiting
RATE_LIMIT_REQUESTS = os.getenv("RATE_LIMIT_REQUESTS", "100").strip()
print("Rate Limit Requests",RATE_LIMIT_REQUESTS)
RATE_LIMIT_WINDOW = os.getenv("RATE_LIMIT_WINDOW", "60").strip()
print("Rate Limit Window",RATE_LIMIT_WINDOW)
# Engine Settings
AF_USE_STUB_ENGINE = os.getenv("AF_USE_STUB_ENGINE", "false")
print("AF Use Stub Engine",AF_USE_STUB_ENGINE)

ASYNC_DATABASE_URL = os.getenv("ASYNC_DATABASE_URL").strip()
print("Async Database URL",ASYNC_DATABASE_URL)