# AWS App Runner Deployment Guide

## 🚀 Backend Deployment to AWS App Runner (Free Tier)

### Prerequisites
- AWS Account (free tier eligible)
- GitHub repository with backend code

### Step 1: Access AWS App Runner
1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Search for "App Runner" in services
3. Click "Create service"

### Step 2: Configure Source
1. **Source type**: Repository
2. **Repository provider**: GitHub
3. **Connect to GitHub**: Authorize AWS App Runner access
4. **Repository**: `MetehanaydemirKafein/KAI-Fusion`
5. **Branch**: `main`
6. **Source directory**: `backend/`

### Step 3: Build Configuration
1. **Configuration source**: Use a configuration file
2. **Configuration file**: `apprunner.yaml` (already created)
3. **Build command**: Automatic (handled by apprunner.yaml)

### Step 4: Service Configuration
1. **Service name**: `kai-fusion-backend`
2. **vCPU**: 0.25 vCPU
3. **Memory**: 0.5 GB
4. **Environment variables**:
   ```
   DATABASE_URL=postgresql://postgres.xjwosoxtrzysncbjrwlt:flowisekafein1!@aws-0-eu-north-1.pooler.supabase.com:5432/postgres
   SUPABASE_URL=https://xjwosoxtrzysncbjrwlt.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhqd29zb3h0cnp5c25jYmpyd2x0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NTk4MjgsImV4cCI6MjA2ODIzNTgyOH0.Jtp38k50rscqZHx3JwIL-k7WrdrHx1QoU1OLG2H8qJo
   SECRET_KEY=+vi95oSRAkTn6KHTWMvpqBiGFqsfD33mg8WuHHH92qs=
   CREDENTIAL_MASTER_KEY=UFDCWBDvn3t7v2geBo6uQseSPkT07l5aPOOnZ9/MXnk=
   ```

### Step 5: Auto Scaling
1. **Min instances**: 1
2. **Max instances**: 10
3. **Concurrency**: 100

### Step 6: Security
1. **WAF**: Not required for free tier
2. **VPC**: Use default VPC
3. **IAM role**: Create new role (automatic)

### Step 7: Deploy
1. Review configuration
2. Click "Create & deploy"
3. Wait for deployment (~5-10 minutes)

### Step 8: Test Deployment
After deployment, you'll get a URL like:
```
https://xyz123.region.awsapprunner.com
```

Test endpoints:
- Health check: `https://xyz123.region.awsapprunner.com/health`
- API docs: `https://xyz123.region.awsapprunner.com/docs`

### Free Tier Limits
- **Compute**: 25 vCPU-hours/month
- **Memory**: 50 GB-hours/month
- **Build**: 100 build minutes/month
- **Requests**: Unlimited

### Next Steps
1. Get the App Runner URL
2. Update frontend API configuration
3. Test full-stack connection

### Troubleshooting
- Check App Runner logs in AWS Console
- Verify environment variables are set correctly
- Ensure GitHub connection is active
- Check health endpoint responds with 200

---

## 🌐 Frontend API Update

After backend deployment, update frontend API base URL:

```typescript
// client/app/lib/config.ts
export const API_BASE_URL = "https://YOUR-APPRUNNER-URL.region.awsapprunner.com/api/v1";
```

Then redeploy frontend to Vercel.