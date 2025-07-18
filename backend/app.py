

import sys
import uvicorn
from pathlib import Path
from app.core.constants import ENVIRONMENT, PORT

# Get the backend directory path
backend_dir = Path(__file__).parent.absolute()
parent_dir = backend_dir.parent

# Add parent directory to sys.path so we can import backend.app.main
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

def main():
    print("📍 Backend will be available at: http://localhost:8000")
    print("📋 API Documentation: http://localhost:8000/docs")
    print("🔗 Frontend should connect to: http://localhost:8000/api/v1")
   
    
    try:
        # Import and run the FastAPI app
        # Production vs Development configuration
        is_production = ENVIRONMENT.lower() == "production"
        port = int(PORT)
        
        if is_production:
            # Production configuration
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
        print("\n👋 Exiting gracefully.")
    except Exception as e:
        print(f"💥 An unexpected error occurred: {e}")
 
if __name__ == "__main__":
    main() 