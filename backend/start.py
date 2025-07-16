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
os.environ["DISABLE_DATABASE"] = "false"
os.environ["DEBUG"] = "true"
os.environ["LOG_LEVEL"] = "info"
# Database creation is disabled by default (set CREATE_DATABASE=true to enable)
os.environ.setdefault("CREATE_DATABASE", "false")

# If CREATE_DATABASE is enabled, don't disable database functionality
create_db = os.getenv("CREATE_DATABASE", "false").lower() in ("true", "1", "t")
if create_db:
    os.environ["DISABLE_DATABASE"] = "false"
    print("💾 Database functionality enabled (CREATE_DATABASE=true)")
else:
    os.environ["DISABLE_DATABASE"] = "true"
    print("💾 Database functionality disabled (CREATE_DATABASE=false)")
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
    create_db_status = os.getenv("CREATE_DATABASE", "false")
    disable_db_status = os.getenv("DISABLE_DATABASE", "true")
    print(f"🚀 Launch command equivalent: CREATE_DATABASE={create_db_status} uvicorn app.main:app --port 8001 --no-access-log")
    if create_db_status.lower() in ("true", "1", "t"):
        print("✅ Database functionality enabled")
        print("💾 Database creation/validation enabled")
    else:
        print("⚠️ Database functionality disabled for development")
        print("💾 Database creation/validation disabled (set CREATE_DATABASE=true to enable)")
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