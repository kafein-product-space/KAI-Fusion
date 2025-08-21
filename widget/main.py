#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KAI-Fusion Standalone Chatbot Widget Server
"""

import os
import logging
import uuid
import httpx
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import openai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="KAI-Fusion Chatbot Widget",
    description="Standalone chatbot widget service for KAI-Fusion workflows",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Request/Response models
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    api_key: Optional[str] = None
    api_url: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str
    timestamp: str
    type: str = "success"
    model: Optional[str] = None

# Health check
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "kai-fusion-chatbot-widget",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

# Main chat endpoint
@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Process chat message and return AI response."""
    try:
        # Generate session ID if not provided
        session_id = request.session_id or f"session_{str(uuid.uuid4())[:8]}"
        
        # Try external API first if provided
        if request.api_url:
            try:
                response = await call_external_api(request.api_url, request.message, request.api_key)
                return ChatResponse(
                    response=response,
                    session_id=session_id,
                    timestamp=datetime.now().isoformat(),
                    model="external-api"
                )
            except Exception as e:
                logger.warning(f"External API failed: {e}, falling back to OpenAI")
        
        # Use OpenAI as fallback or primary
        api_key = request.api_key or os.getenv("OPENAI_API_KEY")
        if not api_key:
            return ChatResponse(
                response="🤖 Demo Mode: Hello! This is a demo response. To get real AI responses, please configure an OpenAI API key or external API URL.",
                session_id=session_id,
                timestamp=datetime.now().isoformat(),
                model="demo-mode"
            )
        
        try:
            client = openai.OpenAI(api_key=api_key)
            completion = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a helpful AI assistant integrated with KAI-Fusion workflow system. Provide helpful and accurate responses."},
                    {"role": "user", "content": request.message}
                ],
                temperature=0.7,
                max_tokens=1000
            )
            
            response_text = completion.choices[0].message.content
            
            return ChatResponse(
                response=response_text,
                session_id=session_id,
                timestamp=datetime.now().isoformat(),
                model="gpt-3.5-turbo"
            )
            
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            return ChatResponse(
                response=f"🤖 Demo Fallback: I received your message '{request.message}'. This is a demo response due to API issues. Please check your API configuration.",
                session_id=session_id,
                timestamp=datetime.now().isoformat(),
                model="demo-fallback"
            )
    
    except Exception as e:
        logger.error(f"Chat processing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def call_external_api(api_url: str, message: str, api_key: Optional[str] = None) -> str:
    """Call external KAI-Fusion API endpoint."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        
        # Try different endpoint formats
        endpoints_to_try = [
            f"{api_url}/api/workflow/execute",
            f"{api_url}/api/v1/workflow/execute",
            f"{api_url}/chat",
            f"{api_url}/api/chat"
        ]
        
        for endpoint in endpoints_to_try:
            try:
                payload = {"input_data": {"input": message, "message": message}}
                response = await client.post(endpoint, json=payload, headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    # Extract response from different possible formats
                    if "result" in data and "response" in data["result"]:
                        return data["result"]["response"]
                    elif "response" in data:
                        return data["response"]
                    elif "message" in data:
                        return data["message"]
                    else:
                        return str(data)
                        
            except Exception as e:
                logger.debug(f"Failed endpoint {endpoint}: {e}")
                continue
        
        raise Exception("All external API endpoints failed")

# Serve main chat interface
@app.get("/", response_class=HTMLResponse)
async def serve_chat_interface():
    """Serve the main chat interface."""
    try:
        with open("static/chat.html", "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    except FileNotFoundError:
        return HTMLResponse(
            content="""
            <html>
                <head><title>KAI-Fusion Chat Widget</title></head>
                <body>
                    <h1>KAI-Fusion Chat Widget</h1>
                    <p>Static files not found. Please ensure all widget files are properly deployed.</p>
                    <p><a href="/test-widget">Test Widget</a></p>
                </body>
            </html>
            """,
            status_code=200
        )

@app.get("/chat", response_class=HTMLResponse)
async def serve_chat_page():
    """Serve chat interface for iframe embedding."""
    try:
        with open("static/chat.html", "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    except FileNotFoundError:
        return HTMLResponse(content="<html><body><h1>Chat interface not found</h1></body></html>")

# Serve widget test page
@app.get("/test-widget", response_class=HTMLResponse)
async def serve_test_widget():
    """Serve the widget test page."""
    try:
        with open("test-widget.html", "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    except FileNotFoundError:
        return HTMLResponse(
            content="""
            <!DOCTYPE html>
            <html>
            <head>
                <title>KAI-Fusion Widget Test</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; }
                    .container { max-width: 800px; margin: 0 auto; }
                    .test-button { 
                        background: #2563eb; color: white; 
                        padding: 12px 24px; border: none; 
                        border-radius: 8px; cursor: pointer; 
                        font-size: 16px; margin: 10px 0;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🤖 KAI-Fusion Widget Test</h1>
                    <p>This page tests the standalone chatbot widget functionality.</p>
                    <button class="test-button" onclick="testWidget()">Test Widget</button>
                    <div id="status"></div>
                </div>
                
                <script>
                async function testWidget() {
                    const status = document.getElementById('status');
                    status.innerHTML = 'Testing...';
                    
                    try {
                        const response = await fetch('/api/chat', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ message: 'Hello, test message!' })
                        });
                        
                        const data = await response.json();
                        status.innerHTML = `
                            <h3>✅ Widget Test Successful</h3>
                            <p><strong>Response:</strong> ${data.response}</p>
                            <p><strong>Session ID:</strong> ${data.session_id}</p>
                            <p><strong>Model:</strong> ${data.model}</p>
                        `;
                    } catch (error) {
                        status.innerHTML = `<h3>❌ Test Failed</h3><p>${error.message}</p>`;
                    }
                }
                </script>
            </body>
            </html>
            """,
            status_code=200
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)