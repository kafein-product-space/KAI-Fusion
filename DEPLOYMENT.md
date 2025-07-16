# KAI-Fusion Deployment Guide

## Environment Setup

### Required GitHub Secrets

Add these secrets to your GitHub repository (`Settings > Secrets and variables > Actions`):

```bash
# Vercel Deployment
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-vercel-org-id
VERCEL_PROJECT_ID=your-vercel-project-id

# Slack Notifications (Optional)
SLACK_WEBHOOK_URL=your-slack-webhook-url
```

### Vercel Environment Variables

Configure these in your Vercel project dashboard:

#### Production Environment
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db
CREATE_DATABASE=true

# Redis
REDIS_URL=redis://host:6379/0

# Security
SECRET_KEY=your-production-secret-key
ENVIRONMENT=production

# API Keys
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
GOOGLE_API_KEY=your-google-api-key
TAVILY_API_KEY=your-tavily-api-key

# Vector Databases (Optional)
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=your-pinecone-environment
```

#### Staging Environment
Same as production but with staging database URLs and API keys.

## CI/CD Pipeline

### Workflow Files

1. **`.github/workflows/ci.yml`** - Main CI/CD pipeline
2. **`.github/workflows/pr-checks.yml`** - Pull request validation
3. **`.github/workflows/deploy.yml`** - Production deployment
4. **`.github/workflows/staging.yml`** - Staging deployment

### Branch Strategy

- `main` → Production deployment
- `develop` → Staging deployment
- Pull requests → Automated testing and validation

### Deployment Process

1. **Push to develop** → Deploy to staging
2. **Pull request to main** → Run tests and validation
3. **Merge to main** → Deploy to production
4. **Tag release** → Create GitHub release

## Manual Deployment

### Prerequisites

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

### Deploy to Production

```bash
# Build and deploy
vercel --prod

# Or with environment
vercel --prod --env NODE_ENV=production
```

### Deploy to Staging

```bash
# Deploy to preview
vercel

# Or specific environment
vercel --env NODE_ENV=staging
```

## Monitoring

### Health Checks

- Health check endpoint: `/api/cron-health-check`
- Runs every 5 minutes via Vercel Cron Jobs
- Monitors database connectivity and system status

### Cleanup Tasks

- Cleanup endpoint: `/api/cron-cleanup`
- Runs hourly via Vercel Cron Jobs
- Removes old completed tasks

### Logging

- Application logs available in Vercel dashboard
- Structured logging with different levels (INFO, ERROR, DEBUG)
- Error tracking with Sentry (if configured)

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check environment variables
   - Verify Python/Node.js versions
   - Review build logs in CI/CD

2. **Database Connection**
   - Verify DATABASE_URL format
   - Check database permissions
   - Ensure database is accessible from Vercel

3. **API Key Issues**
   - Verify all required API keys are set
   - Check API key permissions and quotas
   - Ensure keys are properly formatted

### Debug Commands

```bash
# Check Vercel project settings
vercel env ls

# View deployment logs
vercel logs

# Test local build
vercel build
```

## Security

- All secrets stored in GitHub Secrets
- Environment variables encrypted in Vercel
- Regular security scanning via Trivy
- Dependency vulnerability checks

## Performance

- Serverless functions for API endpoints
- Static file serving via Vercel CDN
- Database connection pooling
- Redis caching for session management