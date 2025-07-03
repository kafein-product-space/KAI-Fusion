#!/usr/bin/env python3
"""
Start script for Flowise FastAPI Backend
"""
import uvicorn
import os

if __name__ == "__main__":
    print("🚀 Starting Flowise FastAPI Backend...")
    print("📍 Backend will be available at: http://localhost:8001")
    print("📋 API Documentation: http://localhost:8001/docs")
    print("🔗 Frontend should connect to: http://localhost:8001/api/v1")
    print("")
    
    # Check if we have essential environment variables
    if not os.getenv("OPENAI_API_KEY"):
        print("⚠️  Warning: OPENAI_API_KEY not found in environment variables")
        print("   Some LLM nodes may not work without API keys")
        print("")
    
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=8001, 
        reload=True,
        log_level="info"
    ) 