from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/test", tags=["Test"])

class TestRequest(BaseModel):
    message: Optional[str] = "Hello World"
    name: Optional[str] = "User"

class TestResponse(BaseModel):
    status: str
    message: str
    received_data: dict
    timestamp: str

@router.get("", response_model=TestResponse)
async def test_get():
    """Basit GET endpoint - print döner"""
    import datetime
    
    response_data = {
        "status": "success",
        "message": "GET request received successfully!",
        "received_data": {"method": "GET", "endpoint": "/api/v1/test/"},
        "timestamp": datetime.datetime.now().isoformat()
    }
    
    # Print to console
    print(f"🔵 GET Request received at {response_data['timestamp']}")
    print(f"📝 Response: {response_data}")
    
    # Log to file
    logger.info(f"GET request received: {response_data}")
    
    return TestResponse(**response_data)

@router.get("/hello/{name}", response_model=TestResponse)
async def test_get_with_param(name: str):
    """Parametreli GET endpoint"""
    import datetime
    
    response_data = {
        "status": "success",
        "message": f"Hello {name}!",
        "received_data": {"method": "GET", "name": name, "endpoint": f"/api/v1/test/hello/{name}"},
        "timestamp": datetime.datetime.now().isoformat()
    }
    
    # Print to console
    print(f"🔵 GET Request with param received at {response_data['timestamp']}")
    print(f"👋 Hello {name}!")
    print(f"📝 Response: {response_data}")
    
    # Log to file
    logger.info(f"GET request with param received: {response_data}")
    
    return TestResponse(**response_data)

@router.get("/status/{status_code}")
async def test_status_code(status_code: int):
    """Status code test endpoint"""
    import datetime
    
    if status_code < 100 or status_code > 599:
        raise HTTPException(status_code=400, detail="Invalid status code")
    
    response_data = {
        "status": "success",
        "message": f"Status code {status_code} returned",
        "received_data": {"method": "GET", "status_code": status_code, "endpoint": f"/api/v1/test/status/{status_code}"},
        "timestamp": datetime.datetime.now().isoformat()
    }
    
    # Print to console
    print(f"🔵 GET Request with status code {status_code} received at {response_data['timestamp']}")
    print(f"📝 Response: {response_data}")
    
    # Log to file
    logger.info(f"GET request with status code received: {response_data}")
    
    return response_data

@router.get("/delay/{seconds}")
async def test_delay(seconds: int):
    """Delay test endpoint"""
    import datetime
    import asyncio
    
    if seconds < 0 or seconds > 60:
        raise HTTPException(status_code=400, detail="Delay must be between 0 and 60 seconds")
    
    print(f"⏳ Starting delay of {seconds} seconds...")
    await asyncio.sleep(seconds)
    
    response_data = {
        "status": "success",
        "message": f"Delay completed after {seconds} seconds",
        "received_data": {"method": "GET", "delay_seconds": seconds, "endpoint": f"/api/v1/test/delay/{seconds}"},
        "timestamp": datetime.datetime.now().isoformat()
    }
    
    # Print to console
    print(f"✅ Delay completed at {response_data['timestamp']}")
    print(f"📝 Response: {response_data}")
    
    # Log to file
    logger.info(f"Delay request completed: {response_data}")
    
    return response_data

# Basit webhook endpoint'i (authentication olmadan)
@router.post("/webhook")
async def test_webhook(request: TestRequest):
    """Basit webhook endpoint - authentication olmadan"""
    import datetime
    
    response_data = {
        "status": "success",
        "message": "Webhook received successfully!",
        "received_data": {
            "method": "POST",
            "endpoint": "/api/v1/test/webhook",
            "message": request.message,
            "name": request.name
        },
        "timestamp": datetime.datetime.now().isoformat()
    }
    
    # Print to console
    print(f"🔵 Webhook POST Request received at {response_data['timestamp']}")
    print(f"📨 Message: {request.message}")
    print(f"👤 Name: {request.name}")
    print(f"📝 Response: {response_data}")
    
    # Log to file
    logger.info(f"Webhook request received: {response_data}")
    
    return response_data

# Authentication ile webhook endpoint'i
@router.post("/webhook-auth")
async def test_webhook_with_auth(request: TestRequest):
    """Authentication ile webhook endpoint"""
    import datetime
    
    response_data = {
        "status": "success",
        "message": "Authenticated webhook received successfully!",
        "received_data": {
            "method": "POST",
            "endpoint": "/api/v1/test/webhook-auth",
            "message": request.message,
            "name": request.name,
            "authenticated": True
        },
        "timestamp": datetime.datetime.now().isoformat()
    }
    
    # Print to console
    print(f"🔵 Authenticated Webhook POST Request received at {response_data['timestamp']}")
    print(f"🔐 Authentication: Required")
    print(f"📨 Message: {request.message}")
    print(f"👤 Name: {request.name}")
    print(f"📝 Response: {response_data}")
    
    # Log to file
    logger.info(f"Authenticated webhook request received: {response_data}")
    
    return response_data 