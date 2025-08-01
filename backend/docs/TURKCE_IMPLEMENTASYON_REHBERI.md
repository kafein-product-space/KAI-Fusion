# 🚀 KAI-Fusion Webhook Birleştirme - Türkçe İmplementasyon Rehberi

> **Webhook node'larının birleştirilmesi sonrası UI ve Database ekipleri için detaylı görev listesi**

[![KAI-Fusion](https://img.shields.io/badge/Platform-KAI--Fusion-blue.svg)](https://github.com/KAI-Fusion)
[![Webhook](https://img.shields.io/badge/Feature-Unified%20Webhook-green.svg)](./)
[![Status](https://img.shields.io/badge/Status-Implementation%20Ready-orange.svg)](./)

## 📋 İçindekiler

- [Değişiklik Özeti](#değişiklik-özeti)
- [Database Ekibi Görevleri](#database-ekibi-görevleri)
- [UI/Frontend Ekibi Görevleri](#uifrontend-ekibi-görevleri)
- [Backend Entegrasyon](#backend-entegrasyon)
- [Test Senaryoları](#test-senaryoları)
- [Migration Planı](#migration-planı)

---

## 🔄 Değişiklik Özeti

### **Ne Değişti?**
- **WebhookStartNode** ve **WebhookTriggerNode** birleştirildi
- Artık tek bir **WebhookTrigger** node'u var
- Bu node hem workflow başlatabilir hem de ara adımda kullanılabilir
- Daha gelişmiş güvenlik ve performans özellikleri eklendi

### **Neden Birleştirildi?**
- UI'da duplicate nodes sorunu vardı
- Kod tekrarını önlemek için
- Daha güçlü ve esnek webhook sistemi için
- Kullanıcı deneyimini iyileştirmek için

---

## 🗄️ Database Ekibi Görevleri

### **1. Yeni Tablolar Oluşturun**

#### **webhook_endpoints Tablosu**
```sql
CREATE TABLE webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id VARCHAR(255) UNIQUE NOT NULL, -- örnek: wh_abc123def456
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    node_id VARCHAR(255) NOT NULL, -- Frontend'den gelen node ID
    endpoint_path VARCHAR(500) NOT NULL, -- /api/webhooks/wh_abc123def456
    secret_token VARCHAR(255) NOT NULL, -- Güvenlik token'ı
    
    -- Birleşik Konfigürasyon (JSON formatında)
    config JSONB NOT NULL DEFAULT '{
        "authentication_required": true,
        "allowed_event_types": [],
        "max_payload_size": 1024,
        "rate_limit_per_minute": 60,
        "webhook_timeout": 30,
        "enable_cors": true,
        "node_behavior": "auto"
    }',
    
    -- Durum ve Meta Veriler
    is_active BOOLEAN DEFAULT true,
    node_behavior VARCHAR(20) DEFAULT 'auto', -- auto, start_only, trigger_only
    created_at TIMESTAMP DEFAULT NOW(),
    last_triggered TIMESTAMP,
    trigger_count BIGINT DEFAULT 0,
    
    -- Performans Takibi
    avg_response_time_ms INTEGER DEFAULT 0,
    error_count BIGINT DEFAULT 0
);

-- Performans İçin İndeksler
CREATE INDEX idx_webhook_id ON webhook_endpoints(webhook_id);
CREATE INDEX idx_webhook_workflow ON webhook_endpoints(workflow_id);
CREATE INDEX idx_webhook_active ON webhook_endpoints(is_active);
CREATE INDEX idx_webhook_behavior ON webhook_endpoints(node_behavior);
```

#### **webhook_events Tablosu**
```sql
CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id VARCHAR(255) REFERENCES webhook_endpoints(webhook_id),
    
    -- Event Verileri
    event_type VARCHAR(100) DEFAULT 'webhook.received',
    payload JSONB NOT NULL,
    correlation_id UUID DEFAULT gen_random_uuid(),
    
    -- İstek Meta Verileri
    source_ip INET,
    user_agent TEXT,
    request_method VARCHAR(10) DEFAULT 'POST',
    request_headers JSONB,
    
    -- Yanıt Verileri
    response_status INTEGER,
    response_body JSONB,
    execution_time_ms INTEGER,
    
    -- Zaman Damgaları
    received_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    
    -- Hata Takibi
    error_message TEXT,
    retry_count INTEGER DEFAULT 0
);

-- Performans İndeksleri
CREATE INDEX idx_webhook_events_webhook_id ON webhook_events(webhook_id);
CREATE INDEX idx_webhook_events_timestamp ON webhook_events(received_at);
CREATE INDEX idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX idx_webhook_events_correlation ON webhook_events(correlation_id);
```

### **2. Node Registry Güncellemesi**
```sql
-- Node kategorisine TRIGGER ekleyin
-- app/models/node.py dosyasında NodeCategory enum'ına TRIGGER = "trigger" eklendi
-- Bu değişiklik backend'de yapıldı, database'de extra işlem gerekmiyor
```

### **3. Migration Script Hazırlayın**

#### **migration_001_webhook_unification.sql**
```sql
-- Eski WebhookStartNode verilerini yeni sisteme taşı
BEGIN;

-- Eğer eski webhook tabloları varsa, verilerini aktar
INSERT INTO webhook_endpoints (webhook_id, workflow_id, node_id, endpoint_path, secret_token, config, is_active, created_at)
SELECT 
    COALESCE(old_webhook_id, 'wh_' || substr(md5(random()::text), 1, 12)),
    workflow_id,
    node_id,
    COALESCE(endpoint_path, '/api/webhooks/' || old_webhook_id),
    COALESCE(security_token, 'wht_' || substr(md5(random()::text), 1, 32)),
    '{"authentication_required": true, "node_behavior": "auto"}',
    true,
    COALESCE(created_at, NOW())
FROM old_webhook_table 
WHERE old_webhook_table.id IS NOT NULL;

-- Eski tabloları yedekle (gerekirse)
-- DROP TABLE old_webhook_table; -- Dikkatli ol!

COMMIT;
```

### **4. Database Bakım Görevleri**

#### **Otomatik Temizlik Job'ı**
```sql
-- Eski webhook event'leri temizle (30 günden eski)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM webhook_events 
    WHERE received_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup
    INSERT INTO system_logs (level, message, created_at)
    VALUES ('INFO', 'Cleaned up ' || deleted_count || ' old webhook events', NOW());
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Günlük çalışacak şekilde cron job kur
-- SELECT cron.schedule('cleanup-webhooks', '0 2 * * *', 'SELECT cleanup_old_webhook_events();');
```

---

## 🎨 UI/Frontend Ekibi Görevleri

### **1. WebhookTrigger Node Component Oluşturun**

#### **components/nodes/WebhookTriggerNode.tsx**
```typescript
import React, { useState, useEffect } from 'react';
import { Node, Handle, Position } from 'reactflow';
import { Copy, Eye, EyeOff, Settings } from 'lucide-react';

interface WebhookTriggerData {
  webhook_endpoint?: string;
  webhook_token?: string;
  authentication_required: boolean;
  allowed_event_types: string;
  max_payload_size: number;
  rate_limit_per_minute: number;
  webhook_timeout: number;
  enable_cors: boolean;
  node_behavior: 'auto' | 'start_only' | 'trigger_only';
}

const WebhookTriggerNode: React.FC<Node<WebhookTriggerData>> = ({ data, id }) => {
  const [showToken, setShowToken] = useState(false);
  const [config, setConfig] = useState<WebhookTriggerData>(data);

  // Webhook URL'i kopyala
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Toast notification göster
  };

  return (
    <div className="webhook-trigger-node">
      {/* Node Header */}
      <div className="node-header">
        <div className="node-icon">🔗</div>
        <div className="node-title">Webhook Trigger</div>
        <div className="node-status">
          {data.webhook_endpoint ? (
            <span className="status-active">🟢 Active</span>
          ) : (
            <span className="status-inactive">🔴 Inactive</span>
          )}
        </div>
      </div>

      {/* Auto-Generated Fields */}
      <div className="auto-fields">
        <div className="field-group">
          <label>Webhook URL</label>
          <div className="url-field">
            <input 
              type="text" 
              value={data.webhook_endpoint || 'https://api.kai-fusion.com/api/webhooks/wh_generating...'} 
              readOnly 
              className="readonly-input"
            />
            <button 
              onClick={() => copyToClipboard(data.webhook_endpoint || '')}
              className="copy-btn"
            >
              <Copy size={16} />
            </button>
          </div>
        </div>

        <div className="field-group">
          <label>Webhook Token</label>
          <div className="token-field">
            <input 
              type={showToken ? "text" : "password"} 
              value={data.webhook_token || 'wht_generating...'} 
              readOnly 
              className="readonly-input"
            />
            <button 
              onClick={() => setShowToken(!showToken)}
              className="toggle-btn"
            >
              {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button 
              onClick={() => copyToClipboard(data.webhook_token || '')}
              className="copy-btn"
            >
              <Copy size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Configuration Fields */}
      <div className="config-fields">
        <div className="field-group">
          <label>Node Behavior</label>
          <select 
            value={config.node_behavior} 
            onChange={(e) => setConfig({...config, node_behavior: e.target.value as any})}
          >
            <option value="auto">Auto (start if no inputs)</option>
            <option value="start_only">Start workflows only</option>
            <option value="trigger_only">Mid-flow trigger only</option>
          </select>
        </div>

        <div className="field-group">
          <label>
            <input 
              type="checkbox" 
              checked={config.authentication_required}
              onChange={(e) => setConfig({...config, authentication_required: e.target.checked})}
            />
            Require Authentication
          </label>
        </div>

        <div className="field-group">
          <label>Allowed Event Types</label>
          <input 
            type="text" 
            placeholder="webhook.received,user.created"
            value={config.allowed_event_types}
            onChange={(e) => setConfig({...config, allowed_event_types: e.target.value})}
          />
          <small>Comma-separated (empty = all allowed)</small>
        </div>

        <div className="field-group">
          <label>Max Payload Size (KB)</label>
          <input 
            type="number" 
            min="1" 
            max="10240"
            value={config.max_payload_size}
            onChange={(e) => setConfig({...config, max_payload_size: parseInt(e.target.value)})}
          />
        </div>

        <div className="field-group">
          <label>Rate Limit (per minute)</label>
          <input 
            type="number" 
            min="0" 
            max="1000"
            value={config.rate_limit_per_minute}
            onChange={(e) => setConfig({...config, rate_limit_per_minute: parseInt(e.target.value)})}
          />
          <small>0 = no limit</small>
        </div>

        <div className="field-group">
          <label>
            <input 
              type="checkbox" 
              checked={config.enable_cors}
              onChange={(e) => setConfig({...config, enable_cors: e.target.checked})}
            />
            Enable CORS
          </label>
        </div>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{ visibility: config.node_behavior !== 'start_only' ? 'visible' : 'hidden' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="webhook_data"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="webhook_config"
      />
    </div>
  );
};

export default WebhookTriggerNode;
```

### **2. Node Registry'ye Ekleyin**

#### **utils/nodeRegistry.ts güncelleme**
```typescript
import WebhookTriggerNode from '../components/nodes/WebhookTriggerNode';

export const nodeTypes = {
  // ... diğer node'lar
  WebhookTrigger: WebhookTriggerNode,
  // WebhookStartNode: ... // KALDIR!
};

export const nodeCategories = {
  triggers: [
    {
      type: 'WebhookTrigger',
      label: 'Webhook Trigger',
      description: 'Unified webhook node (start workflows or trigger mid-flow)',
      icon: '🔗',
      color: '#3b82f6'
    },
    // {
    //   type: 'WebhookStartNode', // KALDIR!
    //   ...
    // },
    {
      type: 'TimerStartNode',
      label: 'Timer Start',
      description: 'Schedule workflows with cron/intervals',
      icon: '⏰',
      color: '#9C27B0'
    }
  ]
};
```

### **3. API Servisleri Ekleyin**

#### **services/webhookService.ts**
```typescript
import { apiClient } from './apiClient';

export interface WebhookEndpoint {
  id: string;
  webhook_id: string;
  workflow_id: string;
  endpoint_path: string;
  secret_token: string;
  config: {
    authentication_required: boolean;
    allowed_event_types: string[];
    max_payload_size: number;
    rate_limit_per_minute: number;
    webhook_timeout: number;
    enable_cors: boolean;
    node_behavior: string;
  };
  is_active: boolean;
  created_at: string;
  last_triggered?: string;
  trigger_count: number;
}

export interface WebhookEvent {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: any;
  correlation_id: string;
  source_ip: string;
  received_at: string;
  execution_time_ms: number;
}

class WebhookService {
  // Webhook endpoint oluştur
  async createWebhookEndpoint(workflowId: string, nodeId: string, config: any): Promise<WebhookEndpoint> {
    const response = await apiClient.post('/webhooks/endpoints', {
      workflow_id: workflowId,
      node_id: nodeId,
      config
    });
    return response.data;
  }

  // Webhook endpoint güncelle
  async updateWebhookEndpoint(webhookId: string, config: any): Promise<WebhookEndpoint> {
    const response = await apiClient.put(`/webhooks/endpoints/${webhookId}`, { config });
    return response.data;
  }

  // Webhook endpoint sil
  async deleteWebhookEndpoint(webhookId: string): Promise<void> {
    await apiClient.delete(`/webhooks/endpoints/${webhookId}`);
  }

  // Webhook events listesi al
  async getWebhookEvents(webhookId: string, limit: number = 50): Promise<WebhookEvent[]> {
    const response = await apiClient.get(`/webhooks/${webhookId}/events?limit=${limit}`);
    return response.data;
  }

  // Webhook istatistikleri al
  async getWebhookStats(webhookId: string): Promise<any> {
    const response = await apiClient.get(`/webhooks/${webhookId}/stats`);
    return response.data;
  }

  // Webhook test et
  async testWebhook(webhookId: string, testPayload: any): Promise<any> {
    const response = await apiClient.post(`/webhooks/${webhookId}/test`, testPayload);
    return response.data;
  }
}

export const webhookService = new WebhookService();
```

### **4. Webhook Monitoring Dashoard**

#### **components/webhooks/WebhookMonitor.tsx**
```typescript
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { webhookService, WebhookEvent } from '../../services/webhookService';

interface WebhookMonitorProps {
  webhookId: string;
}

const WebhookMonitor: React.FC<WebhookMonitorProps> = ({ webhookId }) => {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWebhookData();
    const interval = setInterval(loadWebhookData, 5000); // 5 saniyede bir güncelle
    return () => clearInterval(interval);
  }, [webhookId]);

  const loadWebhookData = async () => {
    try {
      const [eventsData, statsData] = await Promise.all([
        webhookService.getWebhookEvents(webhookId, 100),
        webhookService.getWebhookStats(webhookId)
      ]);
      setEvents(eventsData);
      setStats(statsData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading webhook data:', error);
      setLoading(false);
    }
  };

  const chartData = events.slice(-20).map(event => ({
    time: new Date(event.received_at).toLocaleTimeString(),
    response_time: event.execution_time_ms,
    success: event.execution_time_ms < 1000 ? 1 : 0
  }));

  if (loading) return <div>Loading webhook monitor...</div>;

  return (
    <div className="webhook-monitor">
      <div className="monitor-header">
        <h3>Webhook Monitor: {webhookId}</h3>
        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-number">{stats.total_events || 0}</div>
            <div className="stat-label">Total Events</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.avg_response_time || 0}ms</div>
            <div className="stat-label">Avg Response Time</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.error_rate || 0}%</div>
            <div className="stat-label">Error Rate</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.events_per_hour || 0}</div>
            <div className="stat-label">Events/Hour</div>
          </div>
        </div>
      </div>

      <div className="monitor-chart">
        <h4>Response Time Trend</h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="response_time" stroke="#3b82f6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="recent-events">
        <h4>Recent Events</h4>
        <div className="events-table">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Event Type</th>
                <th>Source IP</th>
                <th>Response Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {events.slice(0, 10).map(event => (
                <tr key={event.id}>
                  <td>{new Date(event.received_at).toLocaleString()}</td>
                  <td>{event.event_type}</td>
                  <td>{event.source_ip}</td>
                  <td>{event.execution_time_ms}ms</td>
                  <td>
                    <span className={`status ${event.execution_time_ms < 1000 ? 'success' : 'warning'}`}>
                      {event.execution_time_ms < 1000 ? '✅ Success' : '⚠️ Slow'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WebhookMonitor;
```

### **5. CSS Stilleri**

#### **styles/webhookTrigger.css**
```css
.webhook-trigger-node {
  background: white;
  border: 2px solid #3b82f6;
  border-radius: 8px;
  padding: 16px;
  min-width: 320px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.node-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.node-icon {
  font-size: 20px;
  margin-right: 8px;
}

.node-title {
  font-weight: 600;
  color: #1f2937;
  flex: 1;
}

.status-active {
  color: #10b981;
  font-size: 12px;
}

.status-inactive {
  color: #ef4444;
  font-size: 12px;
}

.auto-fields, .config-fields {
  margin-bottom: 12px;
}

.field-group {
  margin-bottom: 8px;
}

.field-group label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 4px;
}

.url-field, .token-field {
  display: flex;
  align-items: center;
  gap: 4px;
}

.readonly-input {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: #f9fafb;
  font-size: 12px;
  color: #6b7280;
}

.copy-btn, .toggle-btn {
  padding: 6px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.copy-btn:hover, .toggle-btn:hover {
  background: #f3f4f6;
}

.webhook-monitor {
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin: 16px 0;
}

.stat-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 12px;
  text-align: center;
}

.stat-number {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
}

.stat-label {
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
}

.events-table table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;
}

.events-table th,
.events-table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
  font-size: 14px;
}

.events-table th {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
}

.status.success {
  color: #10b981;
}

.status.warning {
  color: #f59e0b;
}
```

---

## 🔧 Backend Entegrasyon

### **API Endpoint'leri (Backend ekibine not)**

```python
# app/api/webhooks.py
from fastapi import APIRouter, HTTPException, Depends
from app.services.webhook_service import WebhookService

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])

@router.post("/endpoints")
async def create_webhook_endpoint(request: WebhookCreateRequest):
    """Yeni webhook endpoint oluştur"""
    pass

@router.put("/endpoints/{webhook_id}")
async def update_webhook_endpoint(webhook_id: str, config: dict):
    """Webhook endpoint güncelle"""
    pass

@router.delete("/endpoints/{webhook_id}")
async def delete_webhook_endpoint(webhook_id: str):
    """Webhook endpoint sil"""
    pass

@router.get("/{webhook_id}/events")
async def get_webhook_events(webhook_id: str, limit: int = 50):
    """Webhook events listesi"""
    pass

@router.get("/{webhook_id}/stats")
async def get_webhook_stats(webhook_id: str):
    """Webhook istatistikleri"""
    pass

@router.post("/{webhook_id}/test")
async def test_webhook(webhook_id: str, payload: dict):
    """Webhook test et"""
    pass
```

---

## 🧪 Test Senaryoları

### **Database Testleri**
```sql
-- 1. Webhook endpoint oluşturma testi
INSERT INTO webhook_endpoints (webhook_id, workflow_id, node_id, endpoint_path, secret_token)
VALUES ('wh_test123', '550e8400-e29b-41d4-a716-446655440000', 'node_1', '/api/webhooks/wh_test123', 'wht_secret123');

-- 2. Webhook event ekleme testi
INSERT INTO webhook_events (webhook_id, event_type, payload, source_ip)
VALUES ('wh_test123', 'webhook.received', '{"message": "test"}', '192.168.1.1');

-- 3. Performance query testi
SELECT 
    webhook_id, 
    COUNT(*) as event_count,
    AVG(execution_time_ms) as avg_response_time,
    MAX(received_at) as last_event
FROM webhook_events 
WHERE webhook_id = 'wh_test123'
GROUP BY webhook_id;
```

### **Frontend Testleri**
```typescript
// 1. Node oluşturma testi
const testWebhookNode = {
  id: 'webhook_1',
  type: 'WebhookTrigger',
  position: { x: 100, y: 100 },
  data: {
    authentication_required: true,
    node_behavior: 'auto',
    max_payload_size: 1024
  }
};

// 2. API çağrı testi
const testWebhookAPI = async () => {
  const endpoint = await webhookService.createWebhookEndpoint(
    'workflow_123',
    'node_456',
    { authentication_required: true }
  );
  console.log('Created webhook:', endpoint);
};

// 3. Monitoring testi
const testMonitoring = async () => {
  const events = await webhookService.getWebhookEvents('wh_test123');
  console.log('Webhook events:', events);
};
```

---

## 📅 Migration Planı

### **Faz 1: Database (1-2 gün)**
- [x] Yeni tabloları oluştur
- [x] İndeksleri ekle
- [x] Migration script hazırla
- [ ] Test ortamında test et
- [ ] Production'a migrate et

### **Faz 2: Backend API (2-3 gün)**
- [ ] Webhook service güncelle
- [ ] API endpoint'leri ekle
- [ ] Rate limiting ekle
- [ ] Authentication middleware
- [ ] Unit testler

### **Faz 3: Frontend (3-4 gün)**
- [ ] WebhookTrigger component
- [ ] API servisleri
- [ ] Monitoring dashboard
- [ ] CSS stilleri
- [ ] Integration testleri

### **Faz 4: Test & Deploy (1-2 gün)**
- [ ] End-to-end testleri
- [ ] Performance testleri
- [ ] Security testleri
- [ ] Production deployment
- [ ] Documentation güncelle

---

## ⚠️ Dikkat Edilmesi Gerekenler

### **Database Ekibi İçin**
1. **Performance**: webhook_events tablosu çok büyüyebilir, partitioning düşünün
2. **Backup**: Migration öncesi mutlaka backup alın
3. **Indexing**: Query performance için doğru indeksleri oluşturun
4. **Cleanup**: Eski event'leri temizleyecek job kurun

### **Frontend Ekibi İçin**
1. **Responsive**: Webhook monitoring mobilde de çalışmalı
2. **Real-time**: WebSocket ile real-time updates ekleyin
3. **Error Handling**: API hataları için proper error handling
4. **Accessibility**: Screen reader uyumluluğu
5. **Performance**: Büyük event listleri için pagination

### **Güvenlik**
1. **Token Güvenliği**: Webhook token'ları hiçbir zaman log'a yazmayın
2. **Rate Limiting**: DDoS saldırılarına karşı korunun
3. **Input Validation**: Tüm webhook payload'larını validate edin
4. **CORS**: Sadece gerekli origin'lere izin verin

---

## 📞 İletişim & Destek

Bu implementation sırasında sorular için:
- **Database sorular**: @database-team
- **Frontend sorular**: @frontend-team  
- **Backend entegrasyon**: @backend-team
- **Genel mimari**: @architecture-team

---

**Son Güncelleme**: {{ CURRENT_DATE }}
**Sorumlu**: Backend Architecture Team
**Öncelik**: Yüksek 🔥