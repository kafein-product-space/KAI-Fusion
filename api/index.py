#!/usr/bin/env python3
"""
Vercel API entry point for KAI-Fusion Backend
"""

import os
import sys
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

# Set environment variables for production
os.environ["PYTHONPATH"] = "/var/task"
os.environ["ENVIRONMENT"] = "production"
os.environ["CREATE_DATABASE"] = "false"  # Disable database creation in serverless

# Import and expose the FastAPI app
from app.main import app

# This is the handler for Vercel
def handler(request, response):
    return app(request, response)

# For direct execution (testing)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)