# Epic 4: Async Execution with Celery + Redis

**Status**: ✅ **COMPLETED**

This epic implements production-grade asynchronous task execution using Celery and Redis, replacing the basic FastAPI BackgroundTasks with a robust, scalable solution suitable for a Flowise alternative.

## 🚀 Overview

The async execution system provides:

- **Scalable Task Processing**: Celery workers can be distributed across multiple machines
- **Task Progress Tracking**: Real-time progress updates and detailed logging
- **Fault Tolerance**: Automatic retries, error handling, and task recovery
- **Monitoring & Management**: Web APIs for task status, cancellation, and statistics
- **Queue Management**: Priority-based task queuing with different worker pools

## 🏗️ Architecture Components

### 1. Celery Configuration (`app/core/celery_app.py`)
- Redis broker and result backend configuration
- Task routing to specific queues (workflows, monitoring)
- Production-optimized settings (prefetch, timeouts, retries)
- Event handlers for task lifecycle monitoring

### 2. Task Models (`app/models/task.py`)
- Comprehensive task status tracking (pending, started, progress, success, failure, revoked)
- Task types (workflow_execution, bulk_execution, validation, credential_test)
- Progress tracking with percentage and current step
- Result and error handling structures

### 3. Database Schema (`supabase/migrations/003_async_tasks_table.sql`)
- `async_tasks` table with full audit trail
- `task_execution_logs` for detailed logging
- Optimized indexes for performance
- Row Level Security (RLS) for user isolation
- Automatic cleanup functions

### 4. Celery Tasks

#### Workflow Tasks (`app/tasks/workflow_tasks.py`)
- `execute_workflow_task`: Single workflow execution with progress tracking
- `bulk_execute_workflows_task`: Parallel execution of multiple workflows
- `validate_workflow_task`: Workflow configuration validation

#### Monitoring Tasks (`app/tasks/monitoring_tasks.py`)
- `health_check`: System health monitoring
- `cleanup_old_tasks`: Automatic cleanup of completed tasks
- `test_credential_task`: Credential validation
- `system_maintenance`: Periodic maintenance operations

### 5. Task Management API (`app/api/tasks.py`)
- **POST** `/tasks/workflow/{id}/execute` - Start async workflow execution
- **POST** `/tasks/workflows/bulk-execute` - Bulk workflow execution
- **POST** `/tasks/workflow/{id}/validate` - Async workflow validation
- **GET** `/tasks/` - List user tasks with filtering and pagination
- **GET** `/tasks/{id}` - Get detailed task information
- **POST** `/tasks/{id}/cancel` - Cancel running tasks
- **POST** `/tasks/{id}/retry` - Retry failed tasks
- **GET** `/tasks/statistics/overview` - Task statistics and metrics
- **GET** `/tasks/{id}/logs` - Task execution logs
- **GET** `/tasks/celery/status` - Celery worker status

## 📋 Prerequisites

### 1. Redis Server
```bash
# Install Redis (macOS)
brew install redis

# Install Redis (Ubuntu)
sudo apt update
sudo apt install redis-server

# Start Redis
redis-server

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

### 2. Python Dependencies
Already included in `requirements.txt`:
```
celery[redis]>=5.3.0
redis>=5.0.0
```

## 🔧 Setup & Configuration

### 1. Environment Variables
Add to your `.env` file:
```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# Celery Configuration (optional)
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Worker Configuration
CONCURRENCY=4
MAX_TASKS_PER_CHILD=1000
LOG_LEVEL=info
QUEUES=workflows,monitoring
```

### 2. Database Migration
Apply the async tasks migration:
```bash
# Using Supabase CLI
supabase migration up

# Or manually execute the SQL in:
# backend/supabase/migrations/003_async_tasks_table.sql
```

### 3. Start the System

#### Terminal 1: FastAPI Server
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8001
```

#### Terminal 2: Celery Worker
```bash
cd backend
./start-worker.sh development

# Or for production:
./start-worker.sh production
```

#### Terminal 3: Celery Beat (Optional - for periodic tasks)
```bash
cd backend
celery -A app.core.celery_app beat --loglevel=info
```

## 📊 Usage Examples

### 1. Execute Workflow Asynchronously
```python
import httpx

# Start async execution
response = httpx.post("http://localhost:8001/api/v1/workflows/workflow-id/execute", 
    json={
        "inputs": {"user_input": "Hello AI!"},
        "async_execution": True
    },
    headers={"Authorization": "Bearer YOUR_TOKEN"}
)

result = response.json()
task_id = result["results"]["task_id"]
print(f"Task started: {task_id}")
```

### 2. Monitor Task Progress
```python
# Check task status
response = httpx.get(f"http://localhost:8001/api/v1/tasks/{task_id}",
    headers={"Authorization": "Bearer YOUR_TOKEN"}
)

task = response.json()
print(f"Status: {task['status']}")
print(f"Progress: {task['progress']}%")
print(f"Current Step: {task['current_step']}")
```

### 3. Get Task Statistics
```python
# Get user task statistics
response = httpx.get("http://localhost:8001/api/v1/tasks/statistics/overview",
    headers={"Authorization": "Bearer YOUR_TOKEN"}
)

stats = response.json()
print(f"Total Tasks: {stats['total_tasks']}")
print(f"Success Rate: {stats['success_rate']}%")
```

### 4. Bulk Workflow Execution
```python
# Execute multiple workflows
response = httpx.post("http://localhost:8001/api/v1/tasks/workflows/bulk-execute",
    json={
        "workflow_configs": [
            {"workflow_id": "workflow-1", "inputs": {"input": "Test 1"}},
            {"workflow_id": "workflow-2", "inputs": {"input": "Test 2"}},
        ],
        "priority": 3
    },
    headers={"Authorization": "Bearer YOUR_TOKEN"}
)
```

## 🔍 Monitoring & Debugging

### 1. Worker Status
```bash
# Check worker status via API
curl http://localhost:8001/api/v1/tasks/celery/status

# Or using Celery commands
celery -A app.core.celery_app inspect active
celery -A app.core.celery_app inspect scheduled
celery -A app.core.celery_app inspect stats
```

### 2. Task Logs
```python
# Get detailed task logs
response = httpx.get(f"http://localhost:8001/api/v1/tasks/{task_id}/logs",
    headers={"Authorization": "Bearer YOUR_TOKEN"}
)

logs = response.json()["logs"]
for log in logs:
    print(f"[{log['level']}] {log['message']}")
```

### 3. Redis Monitoring
```bash
# Monitor Redis in real-time
redis-cli monitor

# Check queue lengths
redis-cli llen celery
redis-cli llen workflows
redis-cli llen monitoring
```

## 🛠️ Production Deployment

### 1. Docker Compose Example
```yaml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  app:
    build: .
    ports:
      - "8001:8001"
    environment:
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - redis

  worker:
    build: .
    command: ./start-worker.sh production
    environment:
      - REDIS_URL=redis://redis:6379/0
      - CONCURRENCY=8
    depends_on:
      - redis
    deploy:
      replicas: 2

  beat:
    build: .
    command: celery -A app.core.celery_app beat --loglevel=info
    environment:
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - redis

volumes:
  redis_data:
```

### 2. Systemd Service (Linux)
```ini
# /etc/systemd/system/flows-worker.service
[Unit]
Description=Flows FastAPI Celery Worker
After=network.target

[Service]
Type=simple
User=flows
WorkingDirectory=/opt/flows-fastapi/backend
Environment=PATH=/opt/flows-fastapi/venv/bin
ExecStart=/opt/flows-fastapi/backend/start-worker.sh production
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 3. Process Management with Supervisor
```ini
# /etc/supervisor/conf.d/flows-worker.conf
[program:flows-worker]
command=/opt/flows-fastapi/backend/start-worker.sh production
directory=/opt/flows-fastapi/backend
user=flows
autostart=true
autorestart=true
stdout_logfile=/var/log/flows/worker.log
stderr_logfile=/var/log/flows/worker-error.log
```

## 🔧 Configuration Options

### Worker Configuration
```bash
# Environment variables for worker tuning
CONCURRENCY=8                    # Number of worker processes
MAX_TASKS_PER_CHILD=1000        # Tasks before worker restart
QUEUES=workflows,monitoring      # Queues to process
LOG_LEVEL=info                  # Logging level
TIME_LIMIT=3600                 # Hard task timeout (seconds)
SOFT_TIME_LIMIT=3300           # Soft task timeout (seconds)
```

### Celery Beat Schedule
Periodic tasks are configured in `app/core/celery_app.py`:
```python
beat_schedule = {
    "cleanup-old-tasks": {
        "task": "app.tasks.monitoring_tasks.cleanup_old_tasks",
        "schedule": 3600.0,  # Run every hour
    },
    "health-check": {
        "task": "app.tasks.monitoring_tasks.health_check",
        "schedule": 300.0,  # Run every 5 minutes
    },
}
```

## 📈 Performance Considerations

### 1. Scaling Workers
- **CPU-bound tasks**: Set concurrency = CPU cores
- **I/O-bound tasks**: Set concurrency = 2-4 × CPU cores
- **Mixed workloads**: Use separate queues with different worker pools

### 2. Memory Management
- Set `MAX_TASKS_PER_CHILD` to prevent memory leaks
- Monitor worker memory usage
- Use `worker_disable_rate_limits=True` for high throughput

### 3. Database Optimization
- Regular cleanup of old task records
- Index optimization for task queries
- Connection pooling for high concurrency

## 🚨 Troubleshooting

### Common Issues

1. **Redis Connection Errors**
   ```bash
   # Check Redis is running
   redis-cli ping
   
   # Check connection settings
   echo $REDIS_URL
   ```

2. **Worker Not Starting**
   ```bash
   # Check Python path
   export PYTHONPATH="$PYTHONPATH:$(pwd)"
   
   # Check dependencies
   python -c "import celery; import redis"
   ```

3. **Tasks Stuck in Pending**
   ```bash
   # Check worker status
   celery -A app.core.celery_app inspect active
   
   # Restart workers
   pkill -f celery
   ./start-worker.sh development
   ```

4. **High Memory Usage**
   ```bash
   # Reduce max tasks per child
   export MAX_TASKS_PER_CHILD=100
   
   # Monitor memory
   ps aux | grep celery
   ```

### Logging and Debugging

1. **Enable Debug Logging**
   ```bash
   export LOG_LEVEL=debug
   ./start-worker.sh development
   ```

2. **Task Tracing**
   ```python
   # In task code
   logger.info(f"Processing task {self.request.id}")
   logger.debug(f"Task args: {args}, kwargs: {kwargs}")
   ```

3. **Database Query Debugging**
   ```sql
   -- Check active tasks
   SELECT * FROM async_tasks WHERE status IN ('pending', 'started', 'progress');
   
   -- Check task statistics
   SELECT * FROM task_statistics;
   ```

## ✅ Epic 4 Completion Checklist

- [x] **Celery Configuration**: Redis broker, task routing, production settings
- [x] **Task Models**: Comprehensive status tracking and validation
- [x] **Database Schema**: Tables, indexes, RLS, cleanup functions
- [x] **Workflow Tasks**: Execute, bulk execute, validation with progress tracking
- [x] **Monitoring Tasks**: Health checks, cleanup, credential testing
- [x] **Task Management API**: Full CRUD operations, monitoring, statistics
- [x] **Updated Workflow API**: Integrated async execution with Celery
- [x] **Worker Script**: Production-ready startup script with monitoring
- [x] **FastAPI Integration**: Routes registered and documented

## 🎯 Next Steps & Enhancements

1. **WebSocket Integration**: Real-time task progress updates
2. **Task Scheduling**: Cron-like scheduling for periodic workflows
3. **Resource Management**: CPU/memory limits per task
4. **Advanced Monitoring**: Prometheus metrics, Grafana dashboards
5. **Task Chaining**: Complex workflow dependencies
6. **Result Storage**: File-based results for large outputs
7. **Worker Auto-scaling**: Dynamic worker management based on queue length

---

🎉 **Epic 4 Implementation Complete!** 

Your FastAPI application now has production-grade asynchronous execution capabilities, bringing it one step closer to being a full-featured Flowise alternative with enterprise-ready task management. 