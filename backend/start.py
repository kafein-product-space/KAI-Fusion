#!/usr/bin/env python3
"""
Agent-Flow V2 Backend Startup Script

Starts the FastAPI backend with proper configuration and environment setup.
For development mode, database functionality is temporarily disabled.
"""

import os
import sys
import uvicorn
from pathlib import Path

# Set environment variables for development mode
os.environ["DISABLE_DATABASE"] = "true"
os.environ["DEBUG"] = "true"
os.environ["LOG_LEVEL"] = "info"
# Use local SQLite file for development if DATABASE_URL not provided
os.environ.setdefault("DATABASE_URL", "sqlite:///./dev.db")

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

def main():
    """Main startup function."""
    print("🌊 Agent-Flow V2 Backend Starting...")
    print("📍 Backend will be available at: http://localhost:8001")
    print("📋 API Documentation: http://localhost:8001/docs")
    print("🔗 Frontend should connect to: http://localhost:8001/api/v1")
    print("🚀 Launch command equivalent: DISABLE_DATABASE=true uvicorn app.main:app --port 8001 --no-access-log")
    print("⚠️ Database functionality disabled for development")
    print()
    
    try:
        # Import and run the FastAPI app
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=8001,
            reload=True,
            log_level="info",
            access_log=False,
            reload_dirs=[str(backend_dir / "app")],
            reload_includes=["*.py"],
            reload_excludes=["*.pyc", "__pycache__"]
        )
    except KeyboardInterrupt:
        print("\n🛑 Backend stopped by user")
    except Exception as e:
        print(f"\n❌ Backend startup failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 