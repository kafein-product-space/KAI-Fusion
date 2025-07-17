# Supabase Setup Guide for KAI-Fusion

## 1. Supabase Project Setup

### Create New Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose organization and name your project
4. Select region (choose closest to your users)
5. Generate a strong database password

### Enable Required Features
1. **Database**: Already enabled by default
2. **Authentication**: Enable if needed for user management
3. **Storage**: Enable for file uploads
4. **Realtime**: Enable for live updates

## 2. Database Configuration

### Connection Settings
Supabase provides two connection methods:

#### 🚀 **Connection Pooling (RECOMMENDED for Vercel)**
```bash
# Use this URL format for Vercel serverless functions
DATABASE_URL=postgresql://postgres.xxxx:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

#### ⚠️ **Direct Connection (NOT recommended for serverless)**
```bash
# Only for long-running servers
DATABASE_URL=postgresql://postgres.xxxx:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
```

### Why Connection Pooling?
- **Serverless Compatible**: Vercel functions don't maintain persistent connections
- **Better Performance**: Shared connection pool across all functions
- **Higher Concurrency**: Up to 60 concurrent connections vs 20 direct
- **Automatic Timeout**: Handles connection cleanup automatically

## 3. Environment Variables

### Supabase Dashboard → Project Settings → API

Copy these values to your environment:

```bash
# Database (Connection Pooling)
DATABASE_URL=postgresql://postgres.xxxx:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# Supabase API
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Connection Pool Settings
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=0
DB_POOL_TIMEOUT=30
DB_POOL_RECYCLE=3600
```

### Vercel Environment Variables
Add these in Vercel Dashboard → Project → Settings → Environment Variables:

```bash
DATABASE_URL=postgresql://postgres.xxxx:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CREATE_DATABASE=false
```

## 4. Database Schema Setup

### Option 1: Automatic (Recommended)
Let the application create tables automatically:

```python
# In your main.py or startup
from app.core.database import create_tables

@app.on_event("startup")
async def startup():
    await create_tables()
```

### Option 2: Manual SQL
Run these commands in Supabase SQL Editor:

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create your tables
-- (Your existing table creation scripts)
```

## 5. Supabase Features Integration

### Vector Search (Optional)
Enable pgvector for AI embeddings:

```sql
-- In Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS vector;
```

### Real-time Features
Enable real-time for tables:

```sql
-- Enable real-time for specific tables
ALTER TABLE workflows REPLICA IDENTITY FULL;
ALTER TABLE executions REPLICA IDENTITY FULL;
```

### Row Level Security (RLS)
Enable RLS for multi-tenant applications:

```sql
-- Enable RLS
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can only see their own workflows" ON workflows
  FOR ALL USING (user_id = auth.uid());
```

## 6. Monitoring & Optimization

### Database Performance
1. **Connection Pooling**: Use pooled connections (port 6543)
2. **Indexes**: Add indexes for frequent queries
3. **Query Optimization**: Use EXPLAIN ANALYZE for slow queries

### Supabase Dashboard Monitoring
- **Database**: Check connection count and performance
- **Logs**: Monitor database logs for errors
- **Metrics**: Track API usage and database load

### Connection Pool Monitoring
```python
# Add to your health check
async def check_db_pool():
    engine = get_engine()
    pool = engine.pool
    return {
        "pool_size": pool.size(),
        "checked_in": pool.checkedin(),
        "checked_out": pool.checkedout(),
        "overflow": pool.overflow(),
        "invalid": pool.invalid()
    }
```

## 7. Security Best Practices

### API Keys
- **Never commit** service role keys to Git
- Use **anon key** for client-side operations
- Use **service role key** for admin operations

### Database Security
- Enable RLS (Row Level Security)
- Use prepared statements (SQLAlchemy handles this)
- Validate all inputs
- Limit database privileges

### Environment Variables
```bash
# Production
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO

# Development
ENVIRONMENT=development
DEBUG=true
LOG_LEVEL=DEBUG
```

## 8. Troubleshooting

### Common Issues

#### Connection Timeout
```python
# Increase pool timeout
DB_POOL_TIMEOUT=60
```

#### Too Many Connections
```python
# Reduce pool size
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=5
```

#### SSL Issues
```python
# For Supabase, SSL is handled automatically
# No additional SSL configuration needed
```

### Debug Connection
```python
import asyncio
from app.core.database import async_engine

async def test_connection():
    async with async_engine.connect() as conn:
        result = await conn.execute("SELECT 1")
        print(f"Connection successful: {result.scalar()}")

# Run test
asyncio.run(test_connection())
```

## 9. Migration from Local PostgreSQL

### Data Migration
1. **Export** existing data using `pg_dump`
2. **Import** to Supabase using SQL Editor or CLI
3. **Update** connection strings
4. **Test** all functionality

### Schema Migration
```sql
-- Example migration script
-- Run in Supabase SQL Editor

-- Your existing CREATE TABLE statements
-- Your existing indexes
-- Your existing constraints
```

## 10. Cost Optimization

### Supabase Free Tier Limits
- **Database**: 500MB storage
- **API Requests**: 50,000 per month
- **Auth Users**: 50,000 per month
- **Storage**: 1GB

### Optimization Tips
- Use connection pooling (reduces connection overhead)
- Optimize queries with indexes
- Use LIMIT/OFFSET for pagination
- Cache frequently accessed data
- Monitor usage in Supabase dashboard

## Summary

For **KAI-Fusion on Vercel**, use:
- ✅ **Connection Pooling** (port 6543)
- ✅ **Supabase API integration**
- ✅ **Environment variables in Vercel**
- ✅ **Monitoring and optimization**
- ❌ **Direct connections** (port 5432)