"""Configuration management for Agent-Flow V2.

Handles environment variables and application settings using Pydantic Settings.
"""

import os
from typing import List, Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv
import logging
from pydantic import field_validator

load_dotenv()

class Settings(BaseSettings):
    """Application-wide settings"""

    # Core settings
    APP_NAME: str = "KAI Fusion"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
    API_V1_STR: str = "/api/v1"

    # Database settings
    CREATE_DATABASE: bool = os.getenv("CREATE_DATABASE", "false").lower() in ("true", "1", "t")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "flowise")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "flowise")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "flowisepassword")
    POSTGRES_PORT: int = int(os.getenv("DATABASE_PORT", 5432))
    POSTGRES_HOST: str = os.getenv("DATABASE_HOST", "localhost")
    DATABASE_SSL: bool = os.getenv("DATABASE_SSL", "false").lower() in ("true", "1", "t")

    @property
    def DATABASE_URL(self) -> str:
        """Construct the synchronous database URL from components."""
        return (
            f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@"
            f"{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def ASYNC_DATABASE_URL(self) -> str:
        """Construct the asynchronous database URL from components."""
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@"
            f"{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    # Agent Settings
    AGENT_NODE_ID: str = "agent"

    # Celery Settings
    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
    CELERY_RESULT_BACKEND: str = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")

    # OpenAI API Key
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")

    # Anthropic Settings
    ANTHROPIC_API_KEY: Optional[str] = os.getenv("ANTHROPIC_API_KEY")
    
    # Google Settings
    GOOGLE_API_KEY: Optional[str] = os.getenv("GOOGLE_API_KEY")
    GOOGLE_CSE_ID: Optional[str] = os.getenv("GOOGLE_CSE_ID")
    
    # Tavily Settings
    TAVILY_API_KEY: Optional[str] = os.getenv("TAVILY_API_KEY")
    
    # Security
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7  # Add this line
    CREDENTIAL_MASTER_KEY: Optional[str] = os.getenv("CREDENTIAL_MASTER_KEY")
    
    # CORS Settings
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000", 
        "http://localhost:3001",
        "http://localhost:5173",  # Vite dev server
        "http://localhost:8080"   # Alternative frontend port
    ]
    
    # Logging Settings
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # LangSmith Settings (Optional)
    LANGCHAIN_TRACING_V2: bool = os.getenv("LANGCHAIN_TRACING_V2", "false").lower() == "true"
    LANGCHAIN_ENDPOINT: Optional[str] = os.getenv("LANGCHAIN_ENDPOINT")
    LANGCHAIN_API_KEY: Optional[str] = os.getenv("LANGCHAIN_API_KEY")
    LANGCHAIN_PROJECT: Optional[str] = os.getenv("LANGCHAIN_PROJECT")
    
    # Session Management
    SESSION_TTL_MINUTES: int = int(os.getenv("SESSION_TTL_MINUTES", "30"))
    MAX_SESSIONS: int = int(os.getenv("MAX_SESSIONS", "1000"))
    
    # File Upload Settings
    MAX_FILE_SIZE: int = int(os.getenv("MAX_FILE_SIZE", "10485760"))  # 10MB
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = int(os.getenv("RATE_LIMIT_REQUESTS", "100"))
    RATE_LIMIT_WINDOW: int = int(os.getenv("RATE_LIMIT_WINDOW", "60"))
    
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
