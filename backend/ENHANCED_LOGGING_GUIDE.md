# KAI-Fusion Enhanced Logging System - Migration Guide

## Overview

The enhanced logging system addresses critical readability issues in KAI-Fusion workflow execution logs while maintaining backward compatibility with existing code.

## Problems Addressed

### Before (Problematic Patterns)
```python
# ❌ Raw embedding dumps (32KB+ of data)
logger.debug(f"Embedding data: {embedding_vector}")  # Dumps entire vector!

# ❌ Excessive DEBUG messages 
logger.debug(f"Processing event 1: on_chain_start")
logger.debug(f"Processing event 2: on_chain_start") 
# ... 273 events logged!

# ❌ Database errors mixed with normal flow
logger.error("Database error occurred")
logger.error("Error retrieving documents: (psycopg2.errors.UndefinedColumn)")

# ❌ No clear progress indication
# Hard to see what step we're on

# ❌ Memory addresses clutter logs
logger.info(f"Processing: <LLMNode object at 0x7f8b1c2d3e40>")
```

### After (Enhanced Patterns)
```python
# ✅ Clean embedding summaries
logger.log_embedding_operation("store", dimensions=1536, count=50, duration=0.234)
# Output: 🧠 Embedding store | 1536 dims | 50 vectors | 0.234s

# ✅ Smart event filtering (only important events logged)
# Reduced from 273 events to ~10 meaningful events

# ✅ Categorized database errors
logger.log_database_error(error, query_type="SELECT", table="embeddings")
# Output: 💥 Database Error (schema_error): UndefinedColumn

# ✅ Clear workflow progress
logger.start_workflow_phase(WorkflowPhase.EXECUTE, total_steps=5)
# Output: 🚀 WORKFLOW EXECUTE STARTED (5 steps)
#         [=====-----] 50% | Completed node_3

# ✅ Clean object representations
logger.log_node_execution("node_1", "OpenAINode", {"input": "text"})
# Output: 🎯 Node: node_1 (OpenAINode) | Inputs: input=str
```

## Quick Start

### 1. Basic Usage (No Code Changes Required)
The enhanced logging system is automatically enabled when the application starts:

```python
# In app/main.py (already added)
from app.core.enhanced_logging import auto_configure_enhanced_logging

@asynccontextmanager
async def lifespan(app: FastAPI):
    auto_configure_enhanced_logging()  # Automatically configures based on environment
    # ... rest of startup
```

### 2. Environment Configuration
Control logging behavior through environment variables:

```bash
# Enable debug logging for specific components
export KAI_FUSION_DEBUG_COMPONENTS="workflow_engine,database"

# Enable trace logging for deep debugging
export KAI_FUSION_TRACE_COMPONENTS="vector_store,memory_manager"

# Enable file logging (useful for production)
export KAI_FUSION_FILE_LOGGING=true

# Use minimal logging (errors/warnings only)
export KAI_FUSION_LOGGING_PRESET=minimal
```

### 3. Enhanced Logger Usage
For new code or when migrating existing code:

```python
from app.core.enhanced_logging import get_enhanced_logger

# Get enhanced logger for your component
logger = get_enhanced_logger("node_executor", workflow_id="wf_123")

# Log workflow phases with progress tracking
logger.start_workflow_phase(WorkflowPhase.BUILD, total_steps=10)
logger.update_progress(1, "Loaded configuration")
logger.end_workflow_phase(WorkflowPhase.BUILD, success=True)

# Log embedding operations cleanly
logger.log_embedding_operation("generate", dimensions=1536, count=100, duration=0.5)

# Log database operations with summaries
logger.log_database_query("SELECT", table="documents", rows=150, duration=0.045)

# Categorize database errors properly
logger.log_database_error(exception, query_type="INSERT", table="embeddings")
```

## Configuration Presets

### Development (Default for dev environment)
- Console logging with colors and emojis
- DEBUG level for workflow_engine
- Progress bars enabled
- No file logging

### Production (Default for production environment)  
- Structured JSON logging
- INFO level only
- File logging enabled
- No progress bars (less verbose)
- Aggressive data filtering

### Debugging (For troubleshooting)
- Maximum verbosity
- DEBUG for workflow_engine, node_executor, database, vector_store
- TRACE for memory_manager, llm_client
- File logging enabled
- All monitoring enabled

### Minimal (For clean logs)
- WARNING level only
- No debug/trace
- No progress tracking
- Maximum data filtering

```bash
# Use a preset
export KAI_FUSION_LOGGING_PRESET=debugging

# Or configure manually
export KAI_FUSION_LOG_LEVEL=DEBUG
export KAI_FUSION_DEBUG_COMPONENTS="workflow_engine,database"
export KAI_FUSION_FILE_LOGGING=true
```

## Migration Examples

### Before and After Comparisons

#### Workflow Execution Logs

**Before:**
```
[DEBUG] Processing event 1: on_chain_start
[DEBUG] Processing event 2: on_chain_start  
[DEBUG] Processing event 3: on_chain_stream
...273 events...
[parameters: {'embedding_1': '[0.01457126997411251,-0.03490670397893...32KB of data...]
ERROR:app.core.database:Database error occurred
Error retrieving documents: (psycopg2.errors.UndefinedColumn) column langchain_pg_embedding.id does not exist
```

**After:**
```
🏗️ WORKFLOW BUILD STARTED (5 steps)
====================================================
   node_count: 5
   edge_count: 4  
   user_id: user_123...
====================================================
🔍 Validating workflow structure...
✅ Validation passed
🔧 Building graph structure...
✅ WORKFLOW BUILD COMPLETED in 0.12s
====================================================

🚀 WORKFLOW EXECUTE STARTED (5 steps)
====================================================
   execution_mode: synchronous
   input_keys: ['input']
====================================================
🎯 Node: start_node (StartNode) | Inputs: input=str
🧠 Embedding generate | 1536 dims | 50 vectors | 0.234s
💾 DB INSERT | table:langchain_pg_embedding | 50 rows | 0.156s
💥 Database Error (schema_error): UndefinedColumn
✅ WORKFLOW EXECUTE COMPLETED in 1.45s
====================================================
```

#### Node Execution Logs

**Before:**
```
logger.info(f"🔄 Executing node: {node_id} (type: {gnode.type})")
logger.debug(f"📊 Node input state: {getattr(state, 'current_input', 'N/A')}")
logger.debug(f"Raw embedding parameters: {parameters}")  # 32KB dump
```

**After:**
```python
logger.log_node_execution("llm_processor", "OpenAINode", {
    "prompt": "Analyze this document...",
    "model": "gpt-4",
    "embedding_vector": [0.1, 0.2, ...]  # Automatically filtered
})
# Output: 🎯 Node: llm_processor (OpenAINode) | Inputs: prompt=str, model=str, embedding_vector=<vector>
```

### Component Migration

#### Vector Store Operations

**Before:**
```python
logger.debug(f"Storing embeddings: {embeddings}")  # Dumps raw vectors
logger.info(f"Added {len(documents)} documents to vector store")
```

**After:**
```python
logger.log_embedding_operation(
    "store", 
    dimensions=1536,
    count=len(documents),
    duration=store_time,
    table="embeddings"
)
# Output: 🧠 Embedding store | 1536 dims | 50 vectors | 0.234s | table:embeddings
```

#### Database Operations

**Before:**
```python
logger.info(f"Executing query: {query}")
logger.error(f"Database error: {e}")
```

**After:**
```python
logger.log_database_query("SELECT", table="documents", rows=results.rowcount, duration=0.045)
logger.log_database_error(e, query_type="SELECT", table="documents")
# Output: 💾 DB SELECT | table:documents | 150 rows | 0.045s
# Output: 💥 Database Error (connection_error): ConnectionRefused
```

## Advanced Features

### Custom Component Types
```python
from app.core.logging_utils import ComponentType

# Define custom component type for your module
logger = get_enhanced_logger(ComponentType.CUSTOM, workflow_id="wf_123")
```

### Performance Monitoring
```python
# Automatic performance tracking with trend analysis
with logger.timed_operation("document_processing"):
    result = process_documents(docs)
# Output: ⚡ NORMAL document_processing: 0.234s (avg: 0.198s)
```

### Progress Tracking
```python
logger.start_workflow_phase(WorkflowPhase.EXECUTE, total_steps=100)
for i, item in enumerate(items):
    process_item(item)
    if i % 10 == 0:  # Update every 10 items
        logger.update_progress(10, f"Processed {i} items")
# Output: 📊 Progress: [=====-----] 50% | Processed 50 items
```

### Error Analysis
```python
# Automatic error pattern tracking
logger.error("Processing failed", error=exception, node_id="node_1")
# Tracks error patterns and shows frequency of similar errors
```

## Backward Compatibility

The enhanced logging system maintains full backward compatibility:

1. **Existing logger calls continue to work** - No code changes required
2. **Gradual migration** - Convert code to enhanced logging over time
3. **Environment toggles** - Can disable enhanced features if needed
4. **Fallback modes** - Degrades gracefully if enhanced features fail

## Best Practices

### DO's
✅ Use `get_enhanced_logger()` for new code
✅ Log workflow phases with progress tracking
✅ Use specialized logging methods (`log_embedding_operation`, `log_database_query`)
✅ Include relevant context (workflow_id, session_id)
✅ Use appropriate log levels (INFO for progress, DEBUG for debugging)

### DON'Ts
❌ Don't log raw embedding vectors or large data structures
❌ Don't use DEBUG level for every single event
❌ Don't mix different error severities
❌ Don't log memory addresses or object representations
❌ Don't create excessive log noise

### Example Node Implementation
```python
class MyProcessorNode(ProcessorNode):
    async def process(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Get enhanced logger
        logger = get_enhanced_logger(
            "node_executor", 
            workflow_id=self.get_workflow_id()
        )
        
        # Log node execution start
        logger.log_node_execution(self.node_id, self.__class__.__name__, inputs)
        
        try:
            # Process with progress updates
            logger.info("🔄 Starting document processing...")
            
            with logger.timed_operation("document_analysis"):
                result = await self.analyze_documents(inputs["documents"])
            
            # Log success
            logger.info("✅ Processing completed successfully",
                       output_count=len(result),
                       processing_time=timer.elapsed)
            
            return {"output": result}
            
        except Exception as e:
            logger.error("❌ Processing failed", error=e, node_id=self.node_id)
            raise
```

## Troubleshooting

### Too Verbose Logs
```bash
# Reduce verbosity
export KAI_FUSION_LOGGING_PRESET=minimal
# or
export KAI_FUSION_LOG_LEVEL=WARNING
```

### Missing Debug Information  
```bash
# Enable debug for specific components
export KAI_FUSION_DEBUG_COMPONENTS="workflow_engine,node_executor"
```

### Performance Impact
```bash
# Disable progress tracking and use minimal logging
export KAI_FUSION_PROGRESS_LOGGING=false
export KAI_FUSION_LOGGING_PRESET=minimal
```

### File Logging Issues
```bash
# Enable file logging with proper permissions
export KAI_FUSION_FILE_LOGGING=true
# Make sure logs/ directory is writable
mkdir -p logs && chmod 755 logs
```

## Testing the Enhanced Logging

Use the provided demo node to test logging patterns:

```python
# In a workflow, add the EnhancedLoggingDemoNode
{
    "nodes": [
        {
            "id": "logging_demo",
            "type": "EnhancedLoggingDemo", 
            "data": {
                "demo_type": "all_patterns",
                "simulate_errors": true,
                "verbose_level": "debug"
            }
        }
    ]
}
```

This will demonstrate all the enhanced logging patterns and show the difference from the old system.

## Summary

The enhanced logging system provides:

- **90% reduction in log noise** through smart filtering
- **Clear workflow progress** with visual indicators  
- **Proper error categorization** for faster debugging
- **Performance monitoring** with trend analysis
- **Zero breaking changes** to existing code
- **Environment-based configuration** for different use cases

The system automatically activates when the application starts and immediately improves log readability without requiring any code changes.