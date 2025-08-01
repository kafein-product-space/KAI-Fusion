# 🚀 Backend Webhook Implementation Rehberi

> **Backend ekibi için unified webhook sisteminin implementasyonu**

## 📋 Backend'de Yapılması Gerekenler

### **1. 🗄️ Database Migration (Öncelik: Yüksek)**

#### **Migration Dosyası Oluştur**
```python
# migrations/001_webhook_unification.py
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

def upgrade():
    # webhook_endpoints tablosu
    op.create_table(
        'webhook_endpoints',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('webhook_id', sa.String(255), unique=True, nullable=False),
        sa.Column('workflow_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workflows.id', ondelete='CASCADE')),
        sa.Column('node_id', sa.String(255), nullable=False),
        sa.Column('endpoint_path', sa.String(500), nullable=False),
        sa.Column('secret_token', sa.String(255), nullable=False),
        sa.Column('config', postgresql.JSONB(), nullable=False, server_default=sa.text("'{\"authentication_required\": true, \"node_behavior\": \"auto\"}'")),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('node_behavior', sa.String(20), default='auto'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('last_triggered', sa.DateTime()),
        sa.Column('trigger_count', sa.BigInteger(), default=0),
        sa.Column('avg_response_time_ms', sa.Integer(), default=0),
        sa.Column('error_count', sa.BigInteger(), default=0)
    )
    
    # webhook_events tablosu
    op.create_table(
        'webhook_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('webhook_id', sa.String(255), sa.ForeignKey('webhook_endpoints.webhook_id')),
        sa.Column('event_type', sa.String(100), default='webhook.received'),
        sa.Column('payload', postgresql.JSONB(), nullable=False),
        sa.Column('correlation_id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()')),
        sa.Column('source_ip', postgresql.INET()),
        sa.Column('user_agent', sa.Text()),
        sa.Column('request_method', sa.String(10), default='POST'),
        sa.Column('request_headers', postgresql.JSONB()),
        sa.Column('response_status', sa.Integer()),
        sa.Column('response_body', postgresql.JSONB()),
        sa.Column('execution_time_ms', sa.Integer()),
        sa.Column('received_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('processed_at', sa.DateTime()),
        sa.Column('error_message', sa.Text()),
        sa.Column('retry_count', sa.Integer(), default=0)
    )
    
    # İndeksler
    op.create_index('idx_webhook_id', 'webhook_endpoints', ['webhook_id'])
    op.create_index('idx_webhook_workflow', 'webhook_endpoints', ['workflow_id'])
    op.create_index('idx_webhook_active', 'webhook_endpoints', ['is_active'])
    op.create_index('idx_webhook_behavior', 'webhook_endpoints', ['node_behavior'])
    
    op.create_index('idx_webhook_events_webhook_id', 'webhook_events', ['webhook_id'])
    op.create_index('idx_webhook_events_timestamp', 'webhook_events', ['received_at'])
    op.create_index('idx_webhook_events_event_type', 'webhook_events', ['event_type'])
    op.create_index('idx_webhook_events_correlation', 'webhook_events', ['correlation_id'])

def downgrade():
    op.drop_table('webhook_events')
    op.drop_table('webhook_endpoints')
```

### **2. 📊 Database Models (SQLAlchemy)**

#### **app/models/webhook.py** - YENİ DOSYA
```python
from sqlalchemy import Column, String, Integer, Boolean, DateTime, BigInteger, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from app.models.base import BaseModel

class WebhookEndpoint(BaseModel):
    __tablename__ = "webhook_endpoints"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    webhook_id = Column(String(255), unique=True, nullable=False, index=True)
    workflow_id = Column(UUID(as_uuid=True), ForeignKey('workflows.id', ondelete='CASCADE'), index=True)
    node_id = Column(String(255), nullable=False)
    endpoint_path = Column(String(500), nullable=False)
    secret_token = Column(String(255), nullable=False)
    
    # Unified configuration
    config = Column(JSONB, nullable=False, default={
        "authentication_required": True,
        "allowed_event_types": [],
        "max_payload_size": 1024,
        "rate_limit_per_minute": 60,
        "webhook_timeout": 30,
        "enable_cors": True,
        "node_behavior": "auto"
    })
    
    # Status fields
    is_active = Column(Boolean, default=True, index=True)
    node_behavior = Column(String(20), default='auto', index=True)  # auto, start_only, trigger_only
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_triggered = Column(DateTime(timezone=True))
    
    # Statistics
    trigger_count = Column(BigInteger, default=0)
    avg_response_time_ms = Column(Integer, default=0)
    error_count = Column(BigInteger, default=0)
    
    # Relationships
    workflow = relationship("Workflow", back_populates="webhook_endpoints")
    events = relationship("WebhookEvent", back_populates="webhook_endpoint", cascade="all, delete-orphan")

class WebhookEvent(BaseModel):
    __tablename__ = "webhook_events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    webhook_id = Column(String(255), ForeignKey('webhook_endpoints.webhook_id'), index=True)
    
    # Event data
    event_type = Column(String(100), default='webhook.received', index=True)
    payload = Column(JSONB, nullable=False)
    correlation_id = Column(UUID(as_uuid=True), default=uuid.uuid4, index=True)
    
    # Request metadata
    source_ip = Column(INET)
    user_agent = Column(Text)
    request_method = Column(String(10), default='POST')
    request_headers = Column(JSONB)
    
    # Response data
    response_status = Column(Integer)
    response_body = Column(JSONB)
    execution_time_ms = Column(Integer)
    
    # Timestamps
    received_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    processed_at = Column(DateTime(timezone=True))
    
    # Error handling
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)
    
    # Relationships
    webhook_endpoint = relationship("WebhookEndpoint", back_populates="events")
```

### **3. 🔧 Webhook Service**

#### **app/services/webhook_service.py** - YENİ DOSYA
```python
import uuid
import secrets
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from fastapi import HTTPException

from app.models.webhook import WebhookEndpoint, WebhookEvent
from app.core.database import get_db
from app.core.security import generate_webhook_token

class WebhookService:
    def __init__(self, db: Session):
        self.db = db
    
    def create_webhook_endpoint(
        self, 
        workflow_id: str, 
        node_id: str, 
        config: Dict[str, Any]
    ) -> WebhookEndpoint:
        """Yeni webhook endpoint oluştur"""
        
        # Unique webhook ID oluştur
        webhook_id = f"wh_{secrets.token_hex(12)}"
        endpoint_path = f"/api/webhooks/{webhook_id}"
        secret_token = f"wht_{secrets.token_hex(32)}"
        
        # Default config ile merge et
        default_config = {
            "authentication_required": True,
            "allowed_event_types": [],
            "max_payload_size": 1024,
            "rate_limit_per_minute": 60,
            "webhook_timeout": 30,
            "enable_cors": True,
            "node_behavior": "auto"
        }
        merged_config = {**default_config, **config}
        
        webhook_endpoint = WebhookEndpoint(
            webhook_id=webhook_id,
            workflow_id=workflow_id,
            node_id=node_id,
            endpoint_path=endpoint_path,
            secret_token=secret_token,
            config=merged_config,
            node_behavior=merged_config.get("node_behavior", "auto")
        )
        
        self.db.add(webhook_endpoint)
        self.db.commit()
        self.db.refresh(webhook_endpoint)
        
        return webhook_endpoint
    
    def get_webhook_endpoint(self, webhook_id: str) -> Optional[WebhookEndpoint]:
        """Webhook endpoint getir"""
        return self.db.query(WebhookEndpoint).filter(
            WebhookEndpoint.webhook_id == webhook_id,
            WebhookEndpoint.is_active == True
        ).first()
    
    def update_webhook_config(
        self, 
        webhook_id: str, 
        config: Dict[str, Any]
    ) -> WebhookEndpoint:
        """Webhook config güncelle"""
        webhook = self.get_webhook_endpoint(webhook_id)
        if not webhook:
            raise HTTPException(status_code=404, detail="Webhook not found")
        
        # Config merge et
        updated_config = {**webhook.config, **config}
        webhook.config = updated_config
        webhook.node_behavior = updated_config.get("node_behavior", webhook.node_behavior)
        
        self.db.commit()
        self.db.refresh(webhook)
        return webhook
    
    def log_webhook_event(
        self,
        webhook_id: str,
        event_type: str,
        payload: Dict[str, Any],
        source_ip: str,
        user_agent: str,
        request_method: str = "POST",
        request_headers: Dict[str, Any] = None,
        correlation_id: str = None
    ) -> WebhookEvent:
        """Webhook event logla"""
        
        event = WebhookEvent(
            webhook_id=webhook_id,
            event_type=event_type,
            payload=payload,
            source_ip=source_ip,
            user_agent=user_agent,
            request_method=request_method,
            request_headers=request_headers or {},
            correlation_id=correlation_id or str(uuid.uuid4())
        )
        
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)
        
        # Webhook istatistiklerini güncelle
        self._update_webhook_stats(webhook_id)
        
        return event
    
    def update_event_response(
        self,
        event_id: str,
        response_status: int,
        response_body: Dict[str, Any],
        execution_time_ms: int,
        error_message: str = None
    ):
        """Event response bilgilerini güncelle"""
        event = self.db.query(WebhookEvent).filter(WebhookEvent.id == event_id).first()
        if event:
            event.response_status = response_status
            event.response_body = response_body
            event.execution_time_ms = execution_time_ms
            event.processed_at = datetime.now(timezone.utc)
            event.error_message = error_message
            
            self.db.commit()
    
    def get_webhook_events(
        self, 
        webhook_id: str, 
        limit: int = 50,
        offset: int = 0
    ) -> List[WebhookEvent]:
        """Webhook events listesi"""
        return self.db.query(WebhookEvent).filter(
            WebhookEvent.webhook_id == webhook_id
        ).order_by(desc(WebhookEvent.received_at)).limit(limit).offset(offset).all()
    
    def get_webhook_stats(self, webhook_id: str) -> Dict[str, Any]:
        """Webhook istatistikleri"""
        webhook = self.get_webhook_endpoint(webhook_id)
        if not webhook:
            raise HTTPException(status_code=404, detail="Webhook not found")
        
        # Event sayısı ve istatistikler
        total_events = self.db.query(func.count(WebhookEvent.id)).filter(
            WebhookEvent.webhook_id == webhook_id
        ).scalar()
        
        avg_response_time = self.db.query(func.avg(WebhookEvent.execution_time_ms)).filter(
            WebhookEvent.webhook_id == webhook_id,
            WebhookEvent.execution_time_ms.isnot(None)
        ).scalar() or 0
        
        error_count = self.db.query(func.count(WebhookEvent.id)).filter(
            WebhookEvent.webhook_id == webhook_id,
            WebhookEvent.error_message.isnot(None)
        ).scalar()
        
        # Son 24 saatteki event sayısı
        last_24h = datetime.now(timezone.utc) - timedelta(hours=24)
        events_24h = self.db.query(func.count(WebhookEvent.id)).filter(
            WebhookEvent.webhook_id == webhook_id,
            WebhookEvent.received_at >= last_24h
        ).scalar()
        
        return {
            "webhook_id": webhook_id,
            "total_events": total_events,
            "avg_response_time": round(avg_response_time, 2),
            "error_count": error_count,
            "error_rate": round((error_count / total_events * 100) if total_events > 0 else 0, 2),
            "events_per_hour": round(events_24h / 24, 2),
            "last_triggered": webhook.last_triggered.isoformat() if webhook.last_triggered else None,
            "is_active": webhook.is_active,
            "config": webhook.config
        }
    
    def _update_webhook_stats(self, webhook_id: str):
        """Webhook istatistiklerini güncelle"""
        webhook = self.get_webhook_endpoint(webhook_id)
        if not webhook:
            return
        
        # Trigger count güncelle
        webhook.trigger_count = self.db.query(func.count(WebhookEvent.id)).filter(
            WebhookEvent.webhook_id == webhook_id
        ).scalar()
        
        # Son tetiklenme zamanı
        last_event = self.db.query(WebhookEvent).filter(
            WebhookEvent.webhook_id == webhook_id
        ).order_by(desc(WebhookEvent.received_at)).first()
        
        if last_event:
            webhook.last_triggered = last_event.received_at
        
        # Ortalama response time
        avg_time = self.db.query(func.avg(WebhookEvent.execution_time_ms)).filter(
            WebhookEvent.webhook_id == webhook_id,
            WebhookEvent.execution_time_ms.isnot(None)
        ).scalar()
        
        webhook.avg_response_time_ms = int(avg_time) if avg_time else 0
        
        # Error count
        webhook.error_count = self.db.query(func.count(WebhookEvent.id)).filter(
            WebhookEvent.webhook_id == webhook_id,
            WebhookEvent.error_message.isnot(None)
        ).scalar()
        
        self.db.commit()
    
    def cleanup_old_events(self, days_old: int = 30) -> int:
        """Eski event'leri temizle"""
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_old)
        
        deleted_count = self.db.query(WebhookEvent).filter(
            WebhookEvent.received_at < cutoff_date
        ).delete()
        
        self.db.commit()
        return deleted_count
    
    def delete_webhook_endpoint(self, webhook_id: str):
        """Webhook endpoint sil"""
        webhook = self.get_webhook_endpoint(webhook_id)
        if not webhook:
            raise HTTPException(status_code=404, detail="Webhook not found")
        
        # Soft delete
        webhook.is_active = False
        self.db.commit()

# Dependency injection için
def get_webhook_service(db: Session = Depends(get_db)) -> WebhookService:
    return WebhookService(db)
```

### **4. 🌐 API Endpoints**

#### **app/api/webhooks.py** - YENİ DOSYA
```python
from fastapi import APIRouter, HTTPException, Depends, Request, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
import time
import json

from app.services.webhook_service import WebhookService, get_webhook_service
from app.models.webhook import WebhookEndpoint, WebhookEvent
from app.core.rate_limiter import RateLimiter
from app.core.auth import get_current_user

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])
security = HTTPBearer(auto_error=False)
rate_limiter = RateLimiter()

# Pydantic Models
class WebhookCreateRequest(BaseModel):
    workflow_id: str
    node_id: str
    config: Dict[str, Any] = {}

class WebhookUpdateRequest(BaseModel):
    config: Dict[str, Any]

class WebhookPayload(BaseModel):
    event_type: str = "webhook.received"
    data: Dict[str, Any] = {}
    source: Optional[str] = None
    timestamp: Optional[str] = None
    correlation_id: Optional[str] = None

class WebhookResponse(BaseModel):
    success: bool
    message: str
    webhook_id: str
    received_at: str
    correlation_id: Optional[str] = None

# Webhook Management Endpoints
@router.post("/endpoints", response_model=WebhookEndpoint)
async def create_webhook_endpoint(
    request: WebhookCreateRequest,
    webhook_service: WebhookService = Depends(get_webhook_service),
    current_user = Depends(get_current_user)
):
    """Yeni webhook endpoint oluştur"""
    try:
        webhook = webhook_service.create_webhook_endpoint(
            workflow_id=request.workflow_id,
            node_id=request.node_id,
            config=request.config
        )
        return webhook
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/endpoints/{webhook_id}")
async def get_webhook_endpoint(
    webhook_id: str,
    webhook_service: WebhookService = Depends(get_webhook_service),
    current_user = Depends(get_current_user)
):
    """Webhook endpoint bilgilerini getir"""
    webhook = webhook_service.get_webhook_endpoint(webhook_id)
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    return webhook

@router.put("/endpoints/{webhook_id}")
async def update_webhook_endpoint(
    webhook_id: str,
    request: WebhookUpdateRequest,
    webhook_service: WebhookService = Depends(get_webhook_service),
    current_user = Depends(get_current_user)
):
    """Webhook endpoint güncelle"""
    try:
        webhook = webhook_service.update_webhook_config(webhook_id, request.config)
        return webhook
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/endpoints/{webhook_id}")
async def delete_webhook_endpoint(
    webhook_id: str,
    webhook_service: WebhookService = Depends(get_webhook_service),
    current_user = Depends(get_current_user)
):
    """Webhook endpoint sil"""
    try:
        webhook_service.delete_webhook_endpoint(webhook_id)
        return {"message": "Webhook deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Webhook Trigger Endpoint (Public)
@router.post("/{webhook_id}", response_model=WebhookResponse)
async def trigger_webhook(
    webhook_id: str,
    payload: WebhookPayload,
    request: Request,
    background_tasks: BackgroundTasks,
    webhook_service: WebhookService = Depends(get_webhook_service),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """Webhook'u tetikle - PUBLIC ENDPOINT"""
    start_time = time.time()
    
    # Webhook endpoint'i getir
    webhook = webhook_service.get_webhook_endpoint(webhook_id)
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    # Rate limiting kontrolü
    client_ip = request.client.host
    if not rate_limiter.is_allowed(
        f"webhook:{webhook_id}:{client_ip}", 
        webhook.config.get("rate_limit_per_minute", 60)
    ):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    
    # Authentication kontrolü
    if webhook.config.get("authentication_required", True):
        if not credentials or credentials.credentials != webhook.secret_token:
            raise HTTPException(status_code=401, detail="Invalid authentication token")
    
    # Event type kontrolü
    allowed_types = webhook.config.get("allowed_event_types", [])
    if allowed_types and payload.event_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Event type '{payload.event_type}' not allowed"
        )
    
    # Payload size kontrolü
    max_size_kb = webhook.config.get("max_payload_size", 1024)
    payload_size = len(json.dumps(payload.data).encode('utf-8')) / 1024
    if payload_size > max_size_kb:
        raise HTTPException(
            status_code=413, 
            detail=f"Payload size {payload_size:.1f}KB exceeds limit {max_size_kb}KB"
        )
    
    # Event logla
    correlation_id = payload.correlation_id or str(uuid.uuid4())
    event = webhook_service.log_webhook_event(
        webhook_id=webhook_id,
        event_type=payload.event_type,
        payload=payload.data,
        source_ip=client_ip,
        user_agent=request.headers.get("user-agent", ""),
        request_method=request.method,
        request_headers=dict(request.headers),
        correlation_id=correlation_id
    )
    
    # Background task ile workflow'u tetikle
    background_tasks.add_task(
        trigger_workflow_execution,
        webhook.workflow_id,
        webhook.node_id,
        payload.data,
        event.id
    )
    
    # Response zamanını hesapla
    execution_time = int((time.time() - start_time) * 1000)
    
    # Event response güncelle
    webhook_service.update_event_response(
        event_id=event.id,
        response_status=200,
        response_body={"success": True, "message": "Webhook processed"},
        execution_time_ms=execution_time
    )
    
    return WebhookResponse(
        success=True,
        message="Webhook received and processed successfully",
        webhook_id=webhook_id,
        received_at=datetime.now().isoformat(),
        correlation_id=correlation_id
    )

# Monitoring Endpoints
@router.get("/{webhook_id}/events")
async def get_webhook_events(
    webhook_id: str,
    limit: int = 50,
    offset: int = 0,
    webhook_service: WebhookService = Depends(get_webhook_service),
    current_user = Depends(get_current_user)
):
    """Webhook events listesi"""
    events = webhook_service.get_webhook_events(webhook_id, limit, offset)
    return events

@router.get("/{webhook_id}/stats")
async def get_webhook_stats(
    webhook_id: str,
    webhook_service: WebhookService = Depends(get_webhook_service),
    current_user = Depends(get_current_user)
):
    """Webhook istatistikleri"""
    stats = webhook_service.get_webhook_stats(webhook_id)
    return stats

@router.post("/{webhook_id}/test")
async def test_webhook(
    webhook_id: str,
    test_payload: Dict[str, Any],
    webhook_service: WebhookService = Depends(get_webhook_service),
    current_user = Depends(get_current_user)
):
    """Webhook test et"""
    webhook = webhook_service.get_webhook_endpoint(webhook_id)
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    # Test payload ile webhook'u tetikle
    payload = WebhookPayload(
        event_type="webhook.test",
        data=test_payload,
        source="test_interface"
    )
    
    # Burada gerçek webhook endpoint'ine istek at
    import httpx
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"http://localhost:8000{webhook.endpoint_path}",
            json=payload.dict(),
            headers={"Authorization": f"Bearer {webhook.secret_token}"}
        )
    
    return {
        "test_successful": response.status_code == 200,
        "response_status": response.status_code,
        "response_body": response.json() if response.status_code == 200 else response.text
    }

# Background Tasks
async def trigger_workflow_execution(
    workflow_id: str, 
    node_id: str, 
    webhook_data: Dict[str, Any],
    event_id: str
):
    """Workflow'u tetikle - background task"""
    try:
        from app.services.workflow_service import WorkflowService
        from app.core.database import get_db
        
        db = next(get_db())
        workflow_service = WorkflowService(db)
        
        # Workflow'u webhook data ile çalıştır
        result = await workflow_service.execute_workflow(
            workflow_id=workflow_id,
            initial_data=webhook_data,
            trigger_node_id=node_id
        )
        
        print(f"✅ Webhook triggered workflow {workflow_id}: {result}")
        
    except Exception as e:
        print(f"❌ Webhook workflow execution failed: {str(e)}")
        
        # Error'u event'e logla
        webhook_service = WebhookService(db)
        webhook_service.update_event_response(
            event_id=event_id,
            response_status=500,
            response_body={"error": str(e)},
            execution_time_ms=0,
            error_message=str(e)
        )
```

### **5. 🔒 Rate Limiter**

#### **app/core/rate_limiter.py** - YENİ DOSYA
```python
import time
from typing import Dict, Tuple
from collections import defaultdict, deque

class RateLimiter:
    def __init__(self):
        # Key: identifier, Value: (request_times, window_start)
        self.requests: Dict[str, deque] = defaultdict(deque)
    
    def is_allowed(self, identifier: str, max_requests: int, window_seconds: int = 60) -> bool:
        """Rate limiting kontrolü"""
        if max_requests <= 0:  # No limit
            return True
        
        current_time = time.time()
        window_start = current_time - window_seconds
        
        # Eski request'leri temizle
        request_times = self.requests[identifier]
        while request_times and request_times[0] < window_start:
            request_times.popleft()
        
        # Limit kontrolü
        if len(request_times) >= max_requests:
            return False
        
        # Yeni request'i ekle
        request_times.append(current_time)
        return True
    
    def get_remaining_requests(self, identifier: str, max_requests: int, window_seconds: int = 60) -> int:
        """Kalan request sayısı"""
        if max_requests <= 0:
            return float('inf')
        
        current_time = time.time()
        window_start = current_time - window_seconds
        
        request_times = self.requests[identifier]
        # Eski request'leri say
        current_requests = sum(1 for t in request_times if t >= window_start)
        
        return max(0, max_requests - current_requests)
```

### **6. 🔧 Node Registry Güncelleme**

#### **app/core/node_registry.py dosyasına ekle**
```python
# Existing code'a ek olarak...

def register_webhook_trigger_node(self):
    """WebhookTrigger node'unu register et"""
    from app.nodes.triggers.webhook_trigger import WebhookTriggerNode
    
    # Eski WebhookStartNode referanslarını kaldır
    if "WebhookStartNode" in self.nodes:
        del self.nodes["WebhookStartNode"]
        del self.node_configs["WebhookStartNode"]
        print("🗑️  Removed deprecated WebhookStartNode")
    
    # WebhookTrigger'ı register et
    if "WebhookTrigger" not in self.nodes:
        self.register_node(WebhookTriggerNode)
        print("✅ Registered unified WebhookTrigger node")
```

### **7. 📦 Main App Integration**

#### **app/main.py güncellemesi**
```python
# Existing imports'a ekle
from app.api import webhooks
from app.nodes.triggers.webhook_trigger import webhook_router

# Router'ı ekle
app.include_router(webhooks.router)
app.include_router(webhook_router)  # Dynamic webhook endpoints

# Startup event'e ekle
@app.on_event("startup")
async def startup_event():
    # Existing startup code...
    
    # Webhook cleanup job başlat
    from app.services.webhook_service import WebhookService
    from app.core.database import get_db
    
    db = next(get_db())
    webhook_service = WebhookService(db)
    
    # Eski event'leri temizle
    cleaned_count = webhook_service.cleanup_old_events(days_old=30)
    print(f"🧹 Cleaned up {cleaned_count} old webhook events")
```

### **8. 🧪 Background Jobs**

#### **app/jobs/webhook_cleanup.py** - YENİ DOSYA
```python
import asyncio
from datetime import datetime, timedelta
from app.services.webhook_service import WebhookService
from app.core.database import get_db

async def cleanup_webhook_events():
    """Günlük webhook event temizleme job'ı"""
    while True:
        try:
            db = next(get_db())
            webhook_service = WebhookService(db)
            
            # 30 günden eski event'leri sil
            deleted_count = webhook_service.cleanup_old_events(days_old=30)
            
            if deleted_count > 0:
                print(f"🧹 Webhook cleanup: {deleted_count} old events deleted")
            
            # 24 saat bekle
            await asyncio.sleep(24 * 60 * 60)
            
        except Exception as e:
            print(f"❌ Webhook cleanup error: {str(e)}")
            await asyncio.sleep(60 * 60)  # 1 saat bekle ve tekrar dene

# Job'ı başlat
asyncio.create_task(cleanup_webhook_events())
```

---

## 🚀 Implementation Sırası

### **1. Database (1 gün)**
- [ ] Migration dosyası oluştur
- [ ] Models tanımla
- [ ] Test ortamında migrate et

### **2. Core Services (2 gün)**
- [ ] WebhookService implement et
- [ ] RateLimiter ekle
- [ ] Background jobs

### **3. API Endpoints (1 gün)**
- [ ] Webhook API routes
- [ ] Authentication middleware
- [ ] Error handling

### **4. Integration (1 gün)**
- [ ] Main app'e entegre et
- [ ] Node registry güncelle
- [ ] Test et

### **5. Testing (1 gün)**
- [ ] Unit testler
- [ ] Integration testler
- [ ] Load testing

---

## 🧪 Test Komutları

```bash
# Migration çalıştır
alembic upgrade head

# Test endpoints
curl -X POST http://localhost:8000/api/webhooks/endpoints \
  -H "Content-Type: application/json" \
  -d '{"workflow_id": "test-123", "node_id": "node-456", "config": {}}'

# Webhook tetikle
curl -X POST http://localhost:8000/api/webhooks/wh_test123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-webhook-token" \
  -d '{"event_type": "test.event", "data": {"message": "hello"}}'

# Stats kontrol et
curl http://localhost:8000/api/webhooks/wh_test123/stats
```

Bu implementation ile webhook sistemi tamamen unified olacak ve hem başlangıç hem de ara node olarak çalışabilecek! 🎉