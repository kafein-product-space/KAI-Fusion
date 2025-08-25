import sys
import uvicorn
import logging
from pathlib import Path
from app.core.constants import ENVIRONMENT, PORT

# Get the backend directory path
backend_dir = Path(__file__).parent.absolute()
parent_dir = backend_dir.parent

# Add parent directory to sys.path so we can import backend.app.main
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

def main():
    # Initialize enterprise-grade comprehensive logging system
    try:
        from app.core.config import setup_logging
        setup_logging()
        logger = logging.getLogger(__name__)
        logger.info("🎯 KAI Fusion Enterprise Backend starting up...")
        logger.info("📍 Backend will be available at: http://localhost:8000")
        logger.info("📋 API Documentation: http://localhost:8000/docs")
        logger.info("🔗 Frontend should connect to: http://localhost:8000/api/v1")
        logger.info("📊 Comprehensive logging system initialized")
    except Exception as e:
        # Graceful fallback to basic logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s | %(levelname)-8s | %(name)s | %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        logger = logging.getLogger(__name__)
        logger.error(f"⚠️ Comprehensive logging failed, using fallback: {e}")
        logger.info("🎯 KAI Fusion Backend starting up...")
        logger.info("📍 Backend will be available at: http://localhost:8000")
        logger.info("📋 API Documentation: http://localhost:8000/docs")
        logger.info("🔗 Frontend should connect to: http://localhost:8000/api/v1")
   
    
    try:
        # Import and run the FastAPI app
        # Production vs Development configuration
        is_production = ENVIRONMENT.lower() == "production"
        port = int(PORT)
        
        logger.info(f"🚀 Starting server in {ENVIRONMENT} mode on port {port}")
        
        if is_production:
            # Production configuration
            logger.info("🏭 Using production configuration with optimized settings")
            uvicorn.run(
                "backend.app.main:app",
                host="0.0.0.0",
                port=port,
                reload=False,
                log_level="info",
                access_log=True
            )
        else:
            # Development configuration
            logger.info("⚡ Using development configuration with auto-reload and enhanced debugging")
            uvicorn.run(
                "backend.app.main:app",
                host="0.0.0.0",
                port=port,
                reload=True,
                log_level="info",
                access_log=False,
                reload_dirs=[str(backend_dir / "app")],
                reload_includes=["*.py"],
                reload_excludes=["*.pyc", "__pycache__"]
            )
    except KeyboardInterrupt:
        logger.info("👋 Received keyboard interrupt, shutting down gracefully...")
        print("\n👋 Exiting gracefully.")
    except Exception as e:
        logger.error(f"💥 An unexpected error occurred: {e}", exc_info=True)
        print(f"💥 An unexpected error occurred: {e}")
 
if __name__ == "__main__":
    main() 