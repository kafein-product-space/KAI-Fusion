# ⏰ KAI-Fusion Timer Trigger Kullanım Kılavuzu

## 📋 İçindekiler
- [Genel Bakış](#genel-bakış)
- [Timer Oluşturma](#timer-oluşturma)
- [Workflow Bağlantısı](#workflow-bağlantısı)
- [Zamanlama Türleri](#zamanlama-türleri)
- [Otomatik Workflow Tetikleme](#otomatik-workflow-tetikleme)
- [Kullanım Örnekleri](#kullanım-örnekleri)
- [Timer Yönetimi](#timer-yönetimi)
- [Monitoring & İstatistikler](#monitoring--i̇statistikler)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Genel Bakış

KAI-Fusion Timer Trigger Node, belirli zaman aralıklarında veya programlanmış zamanlarda workflow'ları otomatik olarak başlatan gelişmiş bir tetikleme sistemidir. Timer expire olduğunda manuel start butonuna tıklanmış gibi workflow'u başlatır ve complete processing chain'i execute eder.

### ✨ Temel Özellikler
- ⏰ **Çoklu Zamanlama Modları**: Interval, Cron, Once, Manual
- 🚀 **Otomatik Workflow Tetikleme**: Start node'a bağlanarak workflow'u başlatır
- 🔄 **Otomatik Restart**: Recurring schedule'lar otomatik olarak yeniden başlar
- 📊 **İleri Düzey Monitoring**: Execution stats, timer status, performance metrics
- 🛡️ **Error Handling**: Retry logic, timeout handling, failure recovery
- ⚙️ **Esnek Konfigürasyon**: Max executions, timeout, retry settings
- 🎛️ **Manual Control**: Start/stop/trigger now functionality

---

## 🛠️ Timer Oluşturma

### 1. Node Ekleme
Workflow editörde **Timer Start** node'unu ekleyin:

```
Workflow: [Timer Start] → [Start Node] → [Processing...] → [End Node]
Position: Start node'undan ÖNCE (workflow entry point)
```

### 2. Temel Konfigürasyon

#### Interval Timer (Belirli Aralıklarla)
```json
{
  "schedule_type": "interval",
  "interval_seconds": 3600,          // 1 saat (min: 30 saniye, max: 1 hafta)
  "auto_trigger_workflow": true,     // Otomatik workflow tetikleme
  "enabled": true,                   // Timer aktif mi?
  "max_executions": 0,               // Sınırsız execution (0 = unlimited)
  "timeout_seconds": 300,            // Workflow timeout (5 dakika)
  "retry_on_failure": false,         // Hata durumunda retry
  "retry_count": 3                   // Retry sayısı
}
```

#### Cron Timer (Cron Expression ile)
```json
{
  "schedule_type": "cron",
  "cron_expression": "0 9 * * 1-5",  // Hafta içi her gün saat 09:00
  "timezone": "Europe/Istanbul",     // Timezone
  "auto_trigger_workflow": true,
  "enabled": true,
  "max_executions": 100
}
```

#### Once Timer (Tek Seferlik)
```json
{
  "schedule_type": "once",
  "scheduled_time": "2025-08-05T15:30:00+03:00",  // ISO format
  "timezone": "Europe/Istanbul",
  "auto_trigger_workflow": true,
  "enabled": true
}
```

#### Manual Timer (Manuel Tetikleme)
```json
{
  "schedule_type": "manual",
  "auto_trigger_workflow": false,    // Manuel control
  "enabled": true,
  "trigger_data": {                  // Timer tetiklendiğinde geçilecek data
    "message": "Manual timer triggered",
    "source": "admin_dashboard"
  }
}
```

### 3. Gelişmiş Ayarlar

#### Production Configuration
```json
{
  "schedule_type": "interval",
  "interval_seconds": 1800,          // 30 dakika
  "auto_trigger_workflow": true,
  "enabled": true,
  "max_executions": 1000,            // Günlük limit
  "timeout_seconds": 600,            // 10 dakika timeout
  "retry_on_failure": true,          // Production'da retry enable
  "retry_count": 3,
  "trigger_data": {
    "environment": "production",
    "priority": "high",
    "notification_channel": "alerts"
  }
}
```

---

## 🔗 Workflow Bağlantısı

### Connection Pattern
```
[Timer Start] ---> [Start Node] ---> [Processing Nodes] ---> [End Node]
       ↑               ↑                    ↑                   ↑
   Schedule Trigger  Workflow Entry    Processing Chain     Output Ready
```

### Bağlantı Kurma
1. **Timer Start** node'unun output'unu seçin
2. **Start Node**'un input'una bağlayın
3. Normal workflow chain'i oluşturun

### Data Flow
```javascript
// Timer Configuration
{
  "schedule_type": "interval",
  "interval_seconds": 3600,
  "trigger_data": {
    "batch_id": "daily_reports",
    "source": "automated_system"
  }
}

// ↓ Timer expires and triggers

// Start Node receives
{
  "message": "Timer workflow initialized (interval)",
  "timer_trigger": true,
  "timer_id": "timer_abc123",
  "execution_id": "exec_def456",
  "triggered_at": "2025-08-05T09:00:00.000Z",
  "batch_id": "daily_reports",
  "source": "automated_system"
}
```

---

## ⏰ Zamanlama Türleri

### 1. Interval Timer
Belirli zaman aralıklarında tekrar eden execution.

```json
{
  "schedule_type": "interval",
  "interval_seconds": 1800  // 30 dakika
}
```

**Kullanım Alanları:**
- Data synchronization (her 15 dakikada)
- Health checks (her 5 dakikada)
- Report generation (her saatte)
- Cache refresh (her 10 dakikada)

### 2. Cron Timer
Unix cron expression ile gelişmiş zamanlama.

```json
{
  "schedule_type": "cron",
  "cron_expression": "0 2 * * *",    // Her gün saat 02:00
  "timezone": "Europe/Istanbul"
}
```

**Cron Expression Örnekleri:**
```bash
"0 */6 * * *"      # Her 6 saatte bir
"0 9 * * 1-5"      # Hafta içi her gün saat 09:00
"0 0 1 * *"        # Her ayın 1'inde gece yarısı
"*/15 * * * *"     # Her 15 dakikada bir
"0 22 * * 0"       # Her pazar saat 22:00
```

### 3. Once Timer
Belirli bir zamanda tek seferlik execution.

```json
{
  "schedule_type": "once",
  "scheduled_time": "2025-08-05T15:30:00+03:00"
}
```

**Kullanım Alanları:**
- Scheduled maintenance
- One-time data migration
- Special event triggers
- Campaign launches

### 4. Manual Timer
Sadece manuel tetikleme ile çalışır.

```json
{
  "schedule_type": "manual",
  "auto_trigger_workflow": false
}
```

**Kullanım Alanları:**
- Admin operations
- Debug workflows
- On-demand processing
- Testing scenarios

---

## 🚀 Otomatik Workflow Tetikleme

### Tetikleme Mekanizması
Timer expire olduğunda:

1. **Timer Loop**: Background'da çalışan async timer loop
2. **Workflow Execution**: Engine üzerinden workflow execute edilir
3. **Execution Queue**: Execution slot acquire/release
4. **Error Handling**: Timeout, retry, failure recovery
5. **Statistics Update**: Execution count, last run time update

### Execution Context
```python
# Timer trigger execution inputs
execution_inputs = {
    "timer_trigger": True,
    "timer_id": "timer_abc123",
    "execution_id": "exec_def456",
    "triggered_at": "2025-08-05T09:00:00.000Z",
    **trigger_data  # User-defined trigger data
}

# User context
user_context = {
    "user_id": "user_789",
    "workflow_id": "workflow_123",
    "execution_id": "exec_def456",
    "trigger_type": "timer",
    "timer_id": "timer_abc123"
}
```

### Automatic Restart
Recurring timer'lar (interval, cron) otomatik olarak restart olur:

```python
# Interval timer restart logic
if schedule_type == "interval":
    next_run = last_execution + interval_seconds
    
# Cron timer restart logic  
if schedule_type == "cron":
    next_run = croniter(cron_expression, last_execution).get_next()
    
# Once timer - no restart
if schedule_type == "once":
    timer_stops_after_execution = True
```

---

## 📚 Kullanım Örnekleri

### 1. Daily Report Generation

#### Workflow Setup
```
[Timer Start] → [Start] → [Data Fetcher] → [Report Generator] → [Email Sender] → [End]
```

#### Configuration
```json
{
  "schedule_type": "cron",
  "cron_expression": "0 8 * * 1-5",  // Hafta içi her gün saat 08:00
  "timezone": "Europe/Istanbul",
  "auto_trigger_workflow": true,
  "enabled": true,
  "max_executions": 0,
  "timeout_seconds": 1800,           // 30 dakika timeout
  "retry_on_failure": true,
  "retry_count": 2,
  "trigger_data": {
    "report_type": "daily_summary",
    "recipients": ["admin@company.com"],
    "include_charts": true,
    "date_range": "yesterday"
  }
}
```

### 2. Data Synchronization

#### Workflow Setup
```
[Timer Start] → [Start] → [API Fetcher] → [Data Processor] → [Database Writer] → [End]
```

#### Configuration
```json
{
  "schedule_type": "interval",
  "interval_seconds": 900,           // 15 dakika
  "auto_trigger_workflow": true,
  "enabled": true,
  "max_executions": 0,
  "timeout_seconds": 300,
  "retry_on_failure": true,
  "retry_count": 3,
  "trigger_data": {
    "sync_type": "incremental",
    "data_sources": ["crm", "inventory", "orders"],
    "batch_size": 1000
  }
}
```

### 3. System Health Monitoring

#### Workflow Setup
```
[Timer Start] → [Start] → [Health Checker] → [Metrics Collector] → [Alert Processor] → [End]
```

#### Configuration
```json
{
  "schedule_type": "interval",
  "interval_seconds": 300,           // 5 dakika
  "auto_trigger_workflow": true,
  "enabled": true,
  "max_executions": 0,
  "timeout_seconds": 120,            // 2 dakika timeout
  "retry_on_failure": false,         // Health check failure'da retry yapmayalım
  "trigger_data": {
    "check_type": "full_system",
    "services": ["database", "redis", "elasticsearch", "api"],
    "alert_threshold": "warning",
    "notification_channels": ["slack", "email"]
  }
}
```

### 4. Content Processing Pipeline

#### Workflow Setup
```
[Timer Start] → [Start] → [Content Fetcher] → [Text Processor] → [Vector Store] → [End]
```

#### Configuration
```json
{
  "schedule_type": "cron",
  "cron_expression": "0 */4 * * *",  // Her 4 saatte bir
  "timezone": "UTC",
  "auto_trigger_workflow": true,
  "enabled": true,
  "max_executions": 6,               // Günde 6 kez (24/4)
  "timeout_seconds": 3600,           // 1 saat timeout
  "retry_on_failure": true,
  "retry_count": 2,
  "trigger_data": {
    "content_sources": [
      "https://tech-blog.com/feed.xml",
      "https://news-api.com/latest"
    ],
    "processing_options": {
      "extract_text": true,
      "generate_embeddings": true,
      "chunk_size": 1000,
      "overlap": 200
    },
    "output_collection": "tech_content"
  }
}
```

### 5. Backup & Cleanup Operations

#### Workflow Setup
```
[Timer Start] → [Start] → [Backup Creator] → [File Cleanup] → [Notification] → [End]
```

#### Configuration
```json
{
  "schedule_type": "cron",
  "cron_expression": "0 2 * * 0",    // Her pazar gece 02:00
  "timezone": "Europe/Istanbul",
  "auto_trigger_workflow": true,
  "enabled": true,
  "max_executions": 0,
  "timeout_seconds": 7200,           // 2 saat timeout
  "retry_on_failure": true,
  "retry_count": 1,
  "trigger_data": {
    "backup_type": "weekly_full",
    "backup_targets": ["database", "uploads", "logs"],
    "cleanup_older_than": "30_days",
    "compression": true,
    "encryption": true,
    "storage_location": "s3://backups/weekly/"
  }
}
```

---

## 🎛️ Timer Yönetimi

### Manual Control Interface

#### Start Timer
```python
timer_result = timer_node.start_timer()
# Returns: {"success": True, "message": "Timer timer_abc123 started"}
```

#### Stop Timer
```python
stop_result = timer_node.stop_timer()
# Returns: {"success": True, "message": "Timer timer_abc123 stopped"}
```

#### Trigger Now (Immediate Execution)
```python
trigger_result = await timer_node.trigger_now()
# Returns: {"success": True, "message": "Timer timer_abc123 triggered manually", "execution_id": "exec_xyz"}
```

#### Get Timer Status
```python
status = timer_node.get_timer_status()
# Returns:
{
  "timer_id": "timer_abc123",
  "is_active": True,
  "timer_stats": {
    "status": "running",
    "execution_count": 15,
    "last_execution": "2025-08-05T09:00:00.000Z",
    "next_execution": "2025-08-05T10:00:00.000Z"
  },
  "schedule_info": {
    "schedule_type": "interval",
    "interval_seconds": 3600,
    "enabled": True,
    "max_executions": 0
  }
}
```

### Global Timer Management

#### Get All Active Timers
```python
from app.nodes.triggers.timer_start_node import get_active_timers

active_timers = get_active_timers()
print(f"Active timers: {len(active_timers)}")
for timer_id, timer_info in active_timers.items():
    print(f"{timer_id}: {timer_info['status']}")
```

#### Stop All Timers
```python
from app.nodes.triggers.timer_start_node import stop_all_timers

stop_all_timers()
print("All timers stopped")
```

#### Cleanup Completed Timers
```python
from app.nodes.triggers.timer_start_node import cleanup_completed_timers

cleaned_count = cleanup_completed_timers()
print(f"Cleaned up {cleaned_count} completed timers")
```

---

## 📊 Monitoring & İstatistikler

### Timer Statistics
```python
timer_stats = timer_node._get_timer_stats()
```

**Available Metrics:**
```json
{
  "timer_id": "timer_abc123",
  "status": "running",                    // running, stopped, error, completed
  "created_at": "2025-08-05T08:00:00.000Z",
  "execution_count": 25,                  // Total executions
  "last_execution": "2025-08-05T09:00:00.000Z",
  "next_execution": "2025-08-05T10:00:00.000Z",
  "is_active": true,
  "workflow_id": "workflow_123",
  "user_id": "user_789"
}
```

### Schedule Information
```python
schedule_info = timer_node._get_schedule_info()
```

**Schedule Details:**
```json
{
  "schedule_type": "interval",
  "next_run": "2025-08-05T10:00:00.000Z",
  "interval_seconds": 3600,
  "cron_expression": null,
  "scheduled_time": null,
  "timezone": "UTC",
  "enabled": true,
  "auto_trigger_workflow": true,
  "max_executions": 0,
  "timeout_seconds": 300
}
```

### Performance Metrics
Timer node aşağıdaki metrikleri track eder:

- **Execution Count**: Toplam çalıştırma sayısı
- **Success Rate**: Başarılı execution oranı
- **Average Execution Time**: Ortalama execution süresi
- **Error Rate**: Hata oranı
- **Next Run Time**: Sonraki çalışma zamanı
- **Timer Status**: Aktif/pasif durumu

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Timer Not Starting
```
Error: Timer created but not executing automatically
```

**Çözüm:**
- `enabled: true` olduğunu kontrol edin
- `auto_trigger_workflow: true` olduğunu kontrol edin
- `schedule_type` değerinin "manual" olmadığını kontrol edin
- Workflow context (workflow_id, user_id) set edildiğini kontrol edin

#### 2. Cron Expression Invalid
```
Error: Invalid cron expression '0 25 * * *': Invalid minute value
```

**Çözüm:**
- Cron expression syntax'ını kontrol edin: `minute hour day month weekday`
- Online cron validator kullanın
- Timezone ayarlarını kontrol edin

#### 3. Workflow Execution Timeout
```
Error: Timer timer_abc123 workflow execution timed out: exec_def456
```

**Çözüm:**
- `timeout_seconds` değerini artırın
- Workflow node'larının performance'ını optimize edin
- Resource usage'ı kontrol edin

#### 4. Max Executions Reached
```
Info: Timer timer_abc123 reached max executions limit: 100
```

**Çözüm:**
- `max_executions` değerini artırın veya 0 yapın (unlimited)
- Timer'ı reset edin
- Execution history'yi temizleyin

#### 5. Timer Loop Error
```
Error: Timer timer_abc123 loop error: Connection to database lost
```

**Çözüm:**
- Database connection'ını kontrol edin
- `retry_on_failure: true` yapın
- Error logs'unu detaylı inceleyin

### Debug Commands

#### Test Timer Configuration
```python
# Test timer creation and configuration
timer_node = TimerStartNode()
timer_node.user_data = {
    "schedule_type": "interval",
    "interval_seconds": 60,
    "auto_trigger_workflow": True,
    "enabled": True
}

state = FlowState()
state.workflow_id = "test-workflow"
state.user_id = "test-user"

result = timer_node._execute(state)
print(f"Timer Status: {result['status']}")
print(f"Next Run: {result['schedule_info']['next_run']}")
```

#### Test Manual Trigger
```python
# Test manual workflow triggering
async def test_manual_trigger():
    trigger_result = await timer_node.trigger_now()
    print(f"Manual Trigger Result: {trigger_result}")

asyncio.run(test_manual_trigger())
```

#### Check Timer Health
```python
# Check timer health and status
status = timer_node.get_timer_status()
print(f"Timer Active: {status['is_active']}")
print(f"Execution Count: {status['timer_stats']['execution_count']}")
print(f"Last Execution: {status['timer_stats']['last_execution']}")
```

### Log Analysis
Timer node comprehensive logging sağlar:

```python
import logging
logging.getLogger('app.nodes.triggers.timer_start_node').setLevel(logging.DEBUG)
```

**Log Levels:**
- `INFO`: Timer start/stop, execution triggers
- `DEBUG`: Detailed execution flow, sleep times
- `WARNING`: Configuration issues, missing context
- `ERROR`: Execution failures, timeout errors

---

## 🚀 Production Deployment

### Environment Configuration
```bash
# Timer-specific environment variables
export TIMER_DEFAULT_TIMEOUT=300
export TIMER_MAX_CONCURRENT=10
export TIMER_CLEANUP_INTERVAL=3600

# LangChain integration
export LANGCHAIN_TRACING_V2="true"
export LANGCHAIN_PROJECT="kai-fusion-timers"
```

### Production Settings
```json
{
  "schedule_type": "interval",
  "interval_seconds": 1800,
  "auto_trigger_workflow": true,
  "enabled": true,
  "max_executions": 1000,           // Daily limit
  "timeout_seconds": 900,           // 15 minutes
  "retry_on_failure": true,
  "retry_count": 3,
  "trigger_data": {
    "environment": "production",
    "monitoring": true,
    "alerting": true
  }
}
```

### Monitoring & Alerting
```python
# Production monitoring setup
def setup_timer_monitoring():
    """Setup production monitoring for timers."""
    
    # Health check endpoint
    @app.get("/{API_START}/timers/health")
    async def timer_health_check():
        active_timers = get_active_timers()
        return {
            "status": "healthy",
            "active_timers": len(active_timers),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    # Timer statistics endpoint
    @app.get("/{API_START}/timers/stats")
    async def timer_statistics():
        return {
            "timers": get_active_timers(),
            "total_executions": sum(t["execution_count"] for t in active_timers.values()),
            "running_timers": len([t for t in active_timers.values() if t["status"] == "running"])
        }
```

---

## 📞 Support

### Documentation
- [Webhook Integration Guide](./WEBHOOK_USAGE_GUIDE.md)
- [API Reference](./api-reference.md)
- [Workflow Design Guide](./workflow-guide.md)

### Best Practices
- Timer'ları production'da dikkatli test edin
- Max executions limiti set edin
- Timeout değerlerini workflow complexity'e göre ayarlayın
- Error handling ve retry logic implement edin
- Monitoring ve alerting setup edin

### Contact
- GitHub Issues: [KAI-Fusion Issues](https://github.com/kai-fusion/issues)
- Email: support@kai-fusion.com
- Discord: KAI-Fusion Community

---

## 📈 Version History

- **v2.1.0**: Current version with enhanced automatic triggering
- **v2.0.0**: Complete rewrite with webhook-like functionality
- **v1.x**: Basic timer implementation (deprecated)

**Last Updated:** 2025-08-05  
**Status:** ✅ Production Ready

---

## 🎯 Quick Start Checklist

- [ ] Timer node workflow'a eklendi
- [ ] Start node'a bağlandı
- [ ] Schedule type seçildi (interval/cron/once/manual)
- [ ] `auto_trigger_workflow: true` set edildi
- [ ] `enabled: true` set edildi
- [ ] Timeout ve retry ayarları yapıldı
- [ ] Test edildi ve çalışıyor
- [ ] Production'da monitoring setup edildi

Timer trigger node artık webhook trigger gibi otomatik workflow tetikleme ile tam entegre çalışmaya hazır! 🚀