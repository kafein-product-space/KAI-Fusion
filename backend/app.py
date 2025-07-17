

import os
import sys
import uvicorn
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

def main():
    print("📍 Backend will be available at: http://localhost:8001")
    print("📋 API Documentation: http://localhost:8001/docs")
    print("🔗 Frontend should connect to: http://localhost:8001/api/v1")
   
    
    try:
        # Import and run the FastAPI app
        # Production vs Development configuration
        is_production = os.getenv("ENVIRONMENT", "development").lower() == "production"
        port = int(os.getenv("PORT", "8001"))
        
        if is_production:
            # Production configuration
            uvicorn.run(
                "app.main:app",
                host="0.0.0.0",
                port=port,
                reload=False,
                log_level="info",
                access_log=True
            )
        else:
            # Development configuration
            uvicorn.run(
                "app.main:app",
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