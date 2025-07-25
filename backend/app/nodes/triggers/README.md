# Scheduler Trigger System 🕒

Complete workflow automation system with advanced scheduling capabilities, comprehensive monitoring, and full LangChain integration.

## 🏗️ System Architecture

```
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│  SchedulerTrigger   │    │  WorkflowExecutor    │    │  Analytics &        │
│      Node           │────│                      │────│  Monitoring         │
│                     │    │                      │    │                     │
│ • Cron Expressions  │    │ • Execution Management│    │ • Performance       │
│ • Interval Timing   │    │ • Error Handling     │    │ • Health Monitoring │
│ • One-time Schedule │    │ • Retry Logic        │    │ • Trend Analysis    │
│ • Manual Triggers   │    │ • State Tracking     │    │ • Dashboard         │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
```

## 🚀 Core Components

### 1. SchedulerTriggerNode

Advanced scheduler with multiple timing strategies:

```python
from app.nodes.triggers import SchedulerTriggerNode

# Create scheduler node
scheduler = SchedulerTriggerNode()

# Cron-based scheduling
result = scheduler.execute(
    schedule_type="cron",
    cron_expression="0 9 * * MON-FRI",  # 9 AM weekdays
    timezone="US/Eastern",
    max_executions=100
)

# Interval-based scheduling  
result = scheduler.execute(
    schedule_type="interval",
    interval_seconds=3600,  # Every hour
    max_executions=24
)

# One-time execution
result = scheduler.execute(
    schedule_type="once", 
    target_datetime="2025-01-25 14:30:00",
    timezone="UTC"
)

# Manual trigger
result = scheduler.execute(schedule_type="manual")
```

### 2. Workflow Execution System

Comprehensive workflow execution with monitoring:

```python
from app.nodes.triggers import ScheduledWorkflowExecutor, create_rag_workflow_runnable

# Create RAG workflow
rag_workflow = create_rag_workflow_runnable(
    webscraper_node=webscraper,
    chunksplitter_node=chunksplitter, 
    embedder_node=embedder,
    vectorstore_node=vectorstore,
    reranker_node=reranker,
    qa_node=qa,
    workflow_config=config
)

# Create executor with retry logic
executor = ScheduledWorkflowExecutor(
    workflow_runnable=rag_workflow,
    workflow_id="my_rag_pipeline",
    max_retries=3,
    retry_delay=60.0,
    enable_monitoring=True
)

# Execute on trigger
execution_result = await executor.execute_on_trigger(trigger_data)
```

### 3. Analytics & Monitoring

Real-time performance monitoring and analytics:

```python
from app.nodes.triggers import get_analytics_collector, get_monitoring_dashboard

# Get analytics collector
analytics = get_analytics_collector()

# Record execution
analytics.record_execution(
    execution_id="exec_123",
    workflow_id="my_workflow",
    trigger_type="cron",
    start_time=datetime.now(),
    end_time=datetime.now(),
    success=True
)

# Get performance metrics
metrics = analytics.get_workflow_performance("my_workflow")
print(f"Success rate: {metrics.success_rate}%")
print(f"Average duration: {metrics.average_duration}s")

# Get monitoring dashboard
dashboard = get_monitoring_dashboard()
dashboard_data = dashboard.get_dashboard_data()
```

## 📋 Scheduling Strategies

### Cron Expressions

Unix-style cron scheduling with full flexibility:

```python
# Examples
"0 9 * * MON-FRI"    # 9 AM weekdays
"*/15 * * * *"       # Every 15 minutes  
"0 0 1 * *"          # Monthly on 1st
"0 12 * * 0"         # Sundays at noon
"30 14 * * 1-5"      # 2:30 PM weekdays
```

### Interval Timing

Fixed time intervals:

```python
interval_seconds=60      # Every minute
interval_seconds=3600    # Every hour
interval_seconds=86400   # Daily
```

### One-time Execution

Execute once at specific date/time:

```python
target_datetime="2025-01-25 14:30:00"
target_datetime="2025-12-31 23:59:59"
```

## 🔄 Complete RAG Pipeline Integration

Seamless integration with the complete RAG pipeline:

```python
# Complete automated RAG workflow
workflow_config = {
    "webscraper": {
        "urls": ["https://docs.example.com", "https://api.example.com"],
        "max_depth": 2,
        "extract_strategy": "content_focused"
    },
    "chunksplitter": {
        "strategy": "recursive_character",
        "chunk_size": 1000,
        "chunk_overlap": 200
    },
    "embedder": {
        "model": "text-embedding-ada-002",
        "batch_size": 100
    },
    "vectorstore": {
        "collection_name": "automated_docs",
        "similarity_metric": "cosine"
    },
    "reranker": {
        "strategy": "cohere",
        "top_k": 10
    },
    "qa": {
        "question": "What are the latest API changes?",
        "model": "gpt-4",
        "temperature": 0.1
    }
}

# Schedule to run daily at 6 AM
scheduler_result = scheduler.execute(
    schedule_type="cron",
    cron_expression="0 6 * * *",
    timezone="UTC"
)

scheduler_runnable = scheduler_result["scheduler_runnable"]
scheduled_workflow = executor.create_scheduled_workflow(scheduler_runnable)

# Run automated workflow
async for result in scheduled_workflow.astream(workflow_config):
    print(f"✅ Workflow completed: {result['execution_result']['success']}")
```

## 📊 Analytics Dashboard

Comprehensive monitoring capabilities:

### System Health Metrics
- ✅ **Healthy**: >95% success rate
- ⚠️ **Warning**: 75-95% success rate  
- 🚨 **Critical**: <75% success rate

### Performance Analytics
- Execution frequency and patterns
- Duration trends and outliers
- Error categorization and patterns
- Resource usage monitoring

### Trend Analysis
- Daily/weekly execution patterns
- Success rate trends
- Performance degradation detection
- Capacity planning insights

## 🧪 Testing

Comprehensive integration tests included:

```bash
# Run integration tests
cd /backend/app/nodes/triggers
python test_scheduler_integration.py
```

Test coverage includes:
- ✅ Manual trigger workflow
- ✅ Interval trigger workflow  
- ✅ Cron expression validation
- ✅ One-time trigger workflow
- ✅ Error handling and retries
- ✅ Performance monitoring
- ✅ Analytics collection

## 🎯 UI Integration Points

### Scheduler Configuration
```typescript
interface SchedulerConfig {
  schedule_type: 'cron' | 'interval' | 'once' | 'manual'
  cron_expression?: string
  interval_seconds?: number
  target_datetime?: string
  timezone?: string
  max_executions?: number
  enable_tracing?: boolean
  jitter_seconds?: number
}
```

### Real-time Monitoring
```typescript
interface DashboardData {
  system_health: SystemHealth
  recent_executions: ExecutionMetrics[]
  active_workflows: WorkflowSummary[]
  performance_alerts: Alert[]
  quick_stats: QuickStats
}
```

## 🔧 Configuration

### Environment Variables
```bash
# LangSmith tracing
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_api_key

# Analytics settings
SCHEDULER_MAX_HISTORY=10000
SCHEDULER_CACHE_TTL=300
```

### Timezone Support
Full timezone support with common timezone mappings:
- UTC, US/Eastern, US/Pacific
- Europe/London, Europe/Paris
- Asia/Tokyo, Australia/Sydney

## 📈 Performance Optimization

### Best Practices
1. **Batch Operations**: Group multiple operations where possible
2. **Async Execution**: All operations are async-first
3. **Memory Management**: Configurable history limits
4. **Caching**: Intelligent metrics caching
5. **Error Recovery**: Comprehensive retry logic

### Monitoring Recommendations
- Set up alerts for success rate drops
- Monitor execution duration trends
- Track system resource usage
- Regular analytics report generation

## 🎉 Success Metrics

The complete scheduler trigger system provides:

✅ **Full LangChain Integration** - Native Runnable pattern support  
✅ **4 Scheduling Strategies** - Cron, Interval, Once, Manual  
✅ **Comprehensive Monitoring** - Real-time analytics and health metrics  
✅ **Error Resilience** - Retry logic and failure recovery  
✅ **Performance Analytics** - Trend analysis and optimization insights  
✅ **UI Ready** - Complete frontend integration points  
✅ **Production Ready** - Comprehensive testing and validation

The system enables complete workflow automation with enterprise-grade reliability and monitoring capabilities! 🚀