#!/bin/bash

# Flowise FastAPI Backend Start Script
# Production and Development Deployment

echo "🚀 Starting Flowise FastAPI Backend..."
echo "📍 Backend will be available at: http://localhost:8001"
echo "📋 API Documentation: http://localhost:8001/docs"
echo "🔗 Frontend should connect to: http://localhost:8001/api/v1"
echo ""

# Check for .env file
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found"
    echo "   Copy .env.example to .env and configure your settings"
    echo ""
fi

# Check essential environment variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
    echo "⚠️  Warning: SUPABASE_URL or SUPABASE_KEY not found"
    echo "   Authentication and database features may not work"
    echo ""
fi

if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  Warning: OPENAI_API_KEY not found"
    echo "   OpenAI LLM nodes will not work without API key"
    echo ""
fi

# Start server based on environment
if [ "$NODE_ENV" = "production" ]; then
    echo "🎯 Starting in PRODUCTION mode..."
    uvicorn app.main:app --host 0.0.0.0 --port 8001 --workers 4
else
    echo "🔧 Starting in DEVELOPMENT mode with auto-reload..."
    uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
fi 