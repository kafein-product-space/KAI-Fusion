import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from dotenv import load_dotenv
import logging
from pydantic import validator

load_dotenv()

class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "Flowise-FastAPI"
    VERSION: str = "2.0.0"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = True
    
    # API Settings
    API_V1_STR: str = "/api/v1"
    
    # Supabase Settings
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    SUPABASE_SERVICE_KEY: Optional[str] = os.getenv("SUPABASE_SERVICE_KEY")
    
    # OpenAI Settings
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    
    # Anthropic Settings
    ANTHROPIC_API_KEY: Optional[str] = os.getenv("ANTHROPIC_API_KEY")
    
    # Google Settings
    GOOGLE_API_KEY: Optional[str] = os.getenv("GOOGLE_API_KEY")
    GOOGLE_CSE_ID: Optional[str] = os.getenv("GOOGLE_CSE_ID")
    
    # Tavily Settings
    TAVILY_API_KEY: Optional[str] = os.getenv("TAVILY_API_KEY")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    CREDENTIAL_MASTER_KEY: Optional[str] = os.getenv("CREDENTIAL_MASTER_KEY")
    
    # CORS Settings
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000", 
        "http://localhost:3001",
        "http://localhost:5173",  # Vite dev server
        "http://localhost:8080"   # Alternative frontend port
    ]
    
    # Database Settings
    DATABASE_URL: Optional[str] = os.getenv("DATABASE_URL")
    
    # Redis Configuration
    REDIS_URL: Optional[str] = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
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
    
    # Database Configuration
    DB_USER: Optional[str] = None
    DB_PASSWORD: Optional[str] = None
    DB_HOST: Optional[str] = None
    DB_PORT: Optional[int] = None
    DB_NAME: Optional[str] = None
    
    @validator('ALLOWED_ORIGINS', pre=True)
    def parse_cors_origins(cls, v):
        """Parse CORS origins from string or list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    class Config:
        env_file = ".env"
        case_sensitive = True

# Global settings instance
_settings = None

def get_settings() -> Settings:
    """Get settings instance (singleton pattern)"""
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
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        warnings.append("Supabase credentials not set. Authentication and database features will not work.")
    
    # Optional API key validations
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

def get_database_url(settings: Settings) -> Optional[str]:
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
