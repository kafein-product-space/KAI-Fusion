"""Configuration management for Agent-Flow V2.

Handles environment variables and application settings using Pydantic Settings.
"""

from typing import List, Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv
import logging
from pydantic import field_validator
from .constants import *

load_dotenv()

class Settings(BaseSettings):
    """Application-wide settings"""

    # Core settings
    APP_NAME: str = "KAI Fusion"
    SECRET_KEY: str = SECRET_KEY
    API_V1_STR: str = "/api/v1"

    # Database settings
    CREATE_DATABASE: bool = CREATE_DATABASE.lower() in ("true", "1", "t")
    DATABASE_URL: str = DATABASE_URL
    
    # PostgreSQL settings for Supabase
    POSTGRES_DB: str = POSTGRES_DB
    POSTGRES_USER: str = POSTGRES_USER
    POSTGRES_PASSWORD: str = POSTGRES_PASSWORD
    POSTGRES_PORT: int = int(DATABASE_PORT)
    POSTGRES_HOST: str = DATABASE_HOST
    DATABASE_SSL: bool = DATABASE_SSL.lower() in ("true", "1", "t")
    
    # Connection pooling settings for Supabase/Vercel (optimized for serverless)
    DB_POOL_SIZE: int = int(DB_POOL_SIZE)
    DB_MAX_OVERFLOW: int = int(DB_MAX_OVERFLOW)
    DB_POOL_TIMEOUT: int = int(DB_POOL_TIMEOUT)
    DB_POOL_RECYCLE: int = int(DB_POOL_RECYCLE)
    DB_POOL_PRE_PING: bool = DB_POOL_PRE_PING.lower() in ("true", "1", "t")

    # Agent Settings
    AGENT_NODE_ID: str = "agent"

    # Celery Settings
    CELERY_BROKER_URL: str = CELERY_BROKER_URL
    CELERY_RESULT_BACKEND: str = CELERY_RESULT_BACKEND

    # OpenAI API Key
    OPENAI_API_KEY: Optional[str] = OPENAI_API_KEY

    # Anthropic Settings
    ANTHROPIC_API_KEY: Optional[str] = ANTHROPIC_API_KEY
    
    # Google Settings
    GOOGLE_API_KEY: Optional[str] = GOOGLE_API_KEY
    GOOGLE_CSE_ID: Optional[str] = GOOGLE_CSE_ID
    
    # Tavily Settings
    TAVILY_API_KEY: Optional[str] = TAVILY_API_KEY
    
    # Security
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7  # Add this line
    CREDENTIAL_MASTER_KEY: Optional[str] = CREDENTIAL_MASTER_KEY
    
    # CORS Settings
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000", 
        "http://localhost:3001",
        "http://localhost:5173",  # Vite dev server
        "http://localhost:8080",  # Alternative frontend port
        "https://*.vercel.app",   # Vercel deployments
        "https://*.supabase.co"   # Supabase dashboard
    ]
    
    # Logging Settings
    LOG_LEVEL: str = LOG_LEVEL
    
    # LangSmith Settings (Optional)
    LANGCHAIN_TRACING_V2: bool = LANGCHAIN_TRACING_V2.lower() == "true"
    LANGCHAIN_ENDPOINT: Optional[str] = LANGCHAIN_ENDPOINT
    LANGCHAIN_API_KEY: Optional[str] = LANGCHAIN_API_KEY
    LANGCHAIN_PROJECT: Optional[str] = LANGCHAIN_PROJECT
    
    # Session Management
    SESSION_TTL_MINUTES: int = int(SESSION_TTL_MINUTES)
    MAX_SESSIONS: int = int(MAX_SESSIONS)
    
    # File Upload Settings
    MAX_FILE_SIZE: int = int(MAX_FILE_SIZE)  # 10MB
    UPLOAD_DIR: str = UPLOAD_DIR
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = int(RATE_LIMIT_REQUESTS)
    RATE_LIMIT_WINDOW: int = int(RATE_LIMIT_WINDOW)
    
    @field_validator('ALLOWED_ORIGINS', mode='before')
    def parse_cors_origins(cls, v):  # noqa: N805 – Pydantic validator signature
        """Parse CORS origins from a comma-separated string to list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(',')]
        return v

    def get_warnings(self) -> List[str]:
        """Get a list of configuration-related warnings."""
        warnings = []
        if self.SECRET_KEY == "your-secret-key-here-change-in-production":
            warnings.append("SECRET_KEY is not set, using default. THIS IS NOT SAFE FOR PRODUCTION.")

        if not self.OPENAI_API_KEY:
            warnings.append(
                "OPENAI_API_KEY is not set. OpenAI-related features will not work."
            )

        if not self.GOOGLE_API_KEY:
            warnings.append("Google API key not set. Google Search tools will not work.")
        
        if not self.TAVILY_API_KEY:
            warnings.append("Tavily API key not set. Tavily search tools will not work.")
        
        if not self.ANTHROPIC_API_KEY:
            warnings.append("Anthropic API key not set. Claude LLM nodes will not work.")

        return warnings

# Global settings instance
_settings: Optional[Settings] = None

def get_settings() -> Settings:
    """Get application settings instance."""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings

def setup_logging(settings: Settings):
    """Setup logging configuration"""
    logging.basicConfig(
        level=getattr(logging, settings.LOG_LEVEL),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler("app.log") if not settings.DEBUG else logging.NullHandler()
        ]
    )
    
    # Set specific loggers
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("fastapi").setLevel(logging.INFO)
    
    if settings.DEBUG:
        logging.getLogger("app").setLevel(logging.DEBUG)

def setup_langsmith(settings: Settings):
    """Setup LangSmith tracing if enabled"""
    if settings.LANGCHAIN_TRACING_V2:
        os.environ["LANGCHAIN_TRACING_V2"] = "true"
        if settings.LANGCHAIN_ENDPOINT:
            os.environ["LANGCHAIN_ENDPOINT"] = settings.LANGCHAIN_ENDPOINT
        if settings.LANGCHAIN_API_KEY:
            os.environ["LANGCHAIN_API_KEY"] = settings.LANGCHAIN_API_KEY
        if settings.LANGCHAIN_PROJECT:
            os.environ["LANGCHAIN_PROJECT"] = settings.LANGCHAIN_PROJECT
        logging.info("✅ LangSmith tracing enabled")

def validate_api_keys(settings: Settings) -> List[str]:
    """Validate API keys and return warnings"""
    warnings = []
    
    # Critical validations
    if not settings.OPENAI_API_KEY:
        warnings.append("OpenAI API key not set. OpenAI LLM nodes will not work.")
    
    if not settings.GOOGLE_API_KEY:
        warnings.append("Google API key not set. Google Search tools will not work.")
    
    if not settings.TAVILY_API_KEY:
        warnings.append("Tavily API key not set. Tavily search tools will not work.")
    
    if not settings.ANTHROPIC_API_KEY:
        warnings.append("Anthropic API key not set. Claude LLM nodes will not work.")
    
    # Security validations
    if settings.SECRET_KEY == "your-secret-key-here-change-in-production":
        warnings.append("Default secret key detected. Change SECRET_KEY in production.")
    
    # Log warnings
    for warning in warnings:
        logging.warning(warning)
    
    return warnings

def create_directories(settings: Settings):
    """Create necessary directories"""
    if not os.path.exists(settings.UPLOAD_DIR):
        os.makedirs(settings.UPLOAD_DIR)
        logging.info(f"Created upload directory: {settings.UPLOAD_DIR}")

def get_database_url(settings: Settings) -> str:
    """Get database URL for direct connections"""
    return settings.DATABASE_URL

def get_cors_origins(settings: Settings) -> List[str]:
    """Get CORS origins"""
    origins = settings.ALLOWED_ORIGINS.copy()
    
    # Add dynamic origins based on environment
    if settings.DEBUG:
        origins.extend([
            "http://localhost:*",
            "https://localhost:*"
        ])
    
    return origins
