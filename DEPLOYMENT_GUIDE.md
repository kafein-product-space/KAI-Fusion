# Supabase + Vercel Deployment Guide

## Overview
This guide covers deploying KAI-Fusion to Vercel with Supabase as the PostgreSQL database provider.

## Supabase Configuration

### Database Connection Details
- **Host**: `aws-0-eu-north-1.pooler.supabase.com`
- **Port**: `5432` (Session pooling mode)
- **Database**: `postgres`
- **User**: `postgres.xjwosoxtrzysncbjrwlt`
- **Connection String**: `postgresql://postgres.xjwosoxtrzysncbjrwlt:flowisekafein1!@aws-0-eu-north-1.pooler.supabase.com:5432/postgres`

### Connection Pooling
Using Supabase's connection pooler in **Session Mode** (port 5432) for better compatibility with prepared statements and SQLAlchemy.

## Vercel Environment Variables

Set these environment variables in your Vercel project:

### Database
```bash
DATABASE_URL=postgresql://postgres.xjwosoxtrzysncbjrwlt:flowisekafein1!@aws-0-eu-north-1.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://xjwosoxtrzysncbjrwlt.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Connection Pooling (Optimized for Serverless)
```bash
DB_POOL_SIZE=5
DB_MAX_OVERFLOW=2
DB_POOL_TIMEOUT=5
DB_POOL_RECYCLE=1800
DB_POOL_PRE_PING=true
DATABASE_SSL=true
```

### Security
```bash
SECRET_KEY=your-production-secret-key-here
CREDENTIAL_MASTER_KEY=your-credential-master-key
```

### API Keys
```bash
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
GOOGLE_API_KEY=your-google-api-key
TAVILY_API_KEY=your-tavily-api-key
```

## Deployment Steps

### 1. Prepare Environment
```bash
# Copy production environment file
cp .env.production .env

# Install dependencies
pip install -r requirements.txt
```

### 2. Test Database Connection
```bash
# Test connection before deployment
python test_connection.py
```

### 3. Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### 4. Set Environment Variables
```bash
# Set each environment variable
vercel env add DATABASE_URL production
vercel env add SUPABASE_URL production
vercel env add SUPABASE_ANON_KEY production
# ... continue for all variables
```

## Configuration Files

### vercel.json
The project is configured for:
- Python 3.11 runtime
- Optimized connection pooling
- Proper routing for API and frontend
- Environment variable mapping

### Connection Optimization
- **Pool Size**: 5 connections (reduced for serverless)
- **Max Overflow**: 2 additional connections
- **Pool Timeout**: 5 seconds
- **Pool Recycle**: 1800 seconds (30 minutes)
- **Pre-ping**: Enabled for connection validation

## Troubleshooting

### Common Issues

1. **Prepared Statement Errors**: Using Session Mode (port 5432) instead of Transaction Mode (port 6543)
2. **Connection Pool Exhaustion**: Reduced pool size for serverless environment
3. **SSL Issues**: Enabled SSL by default for Supabase connections

### Health Check
```bash
# Check database connection
python test_connection.py

# Check application health
curl https://your-app.vercel.app/health
```

## Performance Optimization

### Database
- Using Supabase's connection pooler for better performance
- Session pooling mode for prepared statement compatibility
- Optimized pool settings for serverless functions

### Vercel
- Function memory: 1024MB
- Max duration: 30 seconds
- Python 3.11 runtime for better performance

## Security Considerations

- Environment variables stored securely in Vercel
- SSL encryption enabled for database connections
- Separate keys for anon and service role access
- Master key for credential encryption

## Next Steps

1. Set up monitoring and logging
2. Configure automatic backups
3. Set up staging environment
4. Implement CI/CD pipeline
5. Add performance monitoring