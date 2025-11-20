# Google Cloud Run Deployment Guide

Complete guide for deploying aneya's FastAPI backend to Google Cloud Run.

## Overview

aneya's backend is deployed as a containerized FastAPI application on Google Cloud Run with the following architecture:

```
┌─────────────────┐         ┌──────────────────────┐         ┌─────────────────────┐
│  Vercel         │ ───────▶│  Cloud Run           │ ───────▶│  MCP Servers        │
│  (Frontend)     │  HTTPS  │  (FastAPI Backend)   │ stdio   │  (5 servers)        │
│  Static React   │         │  europe-west2        │         │  In container       │
└─────────────────┘         └──────────────────────┘         └─────────────────────┘
```

**Region:** europe-west2 (London)
**Service Name:** aneya-backend
**Container Registry:** Google Artifact Registry

## Prerequisites

### 1. Google Cloud Setup

Install the Google Cloud SDK:
```bash
# macOS
brew install --cask google-cloud-sdk

# Or download from: https://cloud.google.com/sdk/docs/install
```

Login and set project:
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Or export environment variable
export GCP_PROJECT_ID=YOUR_PROJECT_ID
```

### 2. Required Environment Variables

```bash
# Google Cloud Project ID
export GCP_PROJECT_ID=your-gcp-project-id

# Anthropic API Key (REQUIRED)
export ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
```

Add to your `~/.zshrc` or `~/.bashrc` to persist:
```bash
echo 'export GCP_PROJECT_ID=your-gcp-project-id' >> ~/.zshrc
echo 'export ANTHROPIC_API_KEY=sk-ant-xxxxx' >> ~/.zshrc
source ~/.zshrc
```

### 3. Docker

Ensure Docker is installed and running:
```bash
docker --version
# Should output: Docker version 24.x.x or higher
```

## Quick Deploy

The easiest way to deploy:

```bash
# Ensure environment variables are set
export GCP_PROJECT_ID=your-project-id
export ANTHROPIC_API_KEY=sk-ant-xxxxx

# Run the deployment script
./deploy-cloudrun.sh
```

The script will:
1. ✅ Enable required Google Cloud APIs
2. ✅ Create Artifact Registry repository
3. ✅ Build Docker image (linux/amd64 platform)
4. ✅ Push to Artifact Registry
5. ✅ Deploy to Cloud Run
6. ✅ Output service URL

## Manual Deployment Steps

If you prefer to deploy manually or need more control:

### Step 1: Enable APIs

```bash
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    artifactregistry.googleapis.com
```

### Step 2: Create Artifact Registry Repository

```bash
gcloud artifacts repositories create aneya \
    --repository-format=docker \
    --location=europe-west2 \
    --description="aneya clinical decision support system"
```

### Step 3: Configure Docker Authentication

```bash
gcloud auth configure-docker europe-west2-docker.pkg.dev
```

### Step 4: Build Docker Image

```bash
# Set variables
PROJECT_ID=$(gcloud config get-value project)
IMAGE_TAG="europe-west2-docker.pkg.dev/${PROJECT_ID}/aneya/aneya-backend:latest"

# Build with correct platform
docker build \
    --platform linux/amd64 \
    -t "${IMAGE_TAG}" \
    -f Dockerfile \
    .
```

### Step 5: Push to Artifact Registry

```bash
docker push "${IMAGE_TAG}"
```

### Step 6: Deploy to Cloud Run

```bash
gcloud run deploy aneya-backend \
    --image="${IMAGE_TAG}" \
    --platform=managed \
    --region=europe-west2 \
    --allow-unauthenticated \
    --memory=2Gi \
    --cpu=2 \
    --timeout=300 \
    --max-instances=10 \
    --min-instances=0 \
    --set-env-vars="ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}" \
    --port=8080
```

### Step 7: Get Service URL

```bash
gcloud run services describe aneya-backend \
    --platform=managed \
    --region=europe-west2 \
    --format='value(status.url)'
```

## Configuration

### Cloud Run Service Configuration

| Setting | Value | Reason |
|---------|-------|--------|
| Memory | 2Gi | MCP servers + FastAPI + Claude API calls |
| CPU | 2 | Handle concurrent requests efficiently |
| Timeout | 300s | Claude API calls can take 30-60s |
| Max Instances | 10 | Cost control, sufficient for typical load |
| Min Instances | 0 | Scale to zero when idle (cost saving) |
| Port | 8080 | Standard Cloud Run port |

### Environment Variables

Required environment variables set via Cloud Run:

- `ANTHROPIC_API_KEY` - Anthropic API key (set via deployment script)
- `PORT` - Automatically set by Cloud Run to 8080

### CORS Configuration

After deployment, update `api.py` to include your Cloud Run URL:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Local development
        "https://*.vercel.app",  # Vercel deployments
        "https://aneya-backend-xxxxx-ew.a.run.app",  # Your Cloud Run URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Then redeploy.

## Post-Deployment Steps

### 1. Test the Deployment

```bash
# Get service URL
SERVICE_URL=$(gcloud run services describe aneya-backend \
    --platform=managed \
    --region=europe-west2 \
    --format='value(status.url)')

# Health check
curl ${SERVICE_URL}/health

# Expected response:
# {"status":"healthy","message":"All systems operational"}
```

### 2. Update Frontend API URL

Edit `frontend/src/App.tsx` and update the API URL:

```typescript
const API_URL = import.meta.env.PROD
  ? 'https://aneya-backend-xxxxx-ew.a.run.app'  // Your Cloud Run URL
  : 'http://localhost:8000';
```

### 3. Redeploy Frontend to Vercel

```bash
cd frontend
vercel --prod
```

## Monitoring and Logs

### View Logs

Real-time logs:
```bash
gcloud run services logs tail aneya-backend \
    --region=europe-west2 \
    --project=${GCP_PROJECT_ID}
```

Recent logs:
```bash
gcloud run services logs read aneya-backend \
    --region=europe-west2 \
    --limit=100
```

### Cloud Console

View in Google Cloud Console:
```bash
# Open Cloud Run service page
open "https://console.cloud.google.com/run/detail/europe-west2/aneya-backend"
```

### Metrics

Monitor:
- Request count
- Request latency
- Error rate
- CPU utilization
- Memory utilization
- Container instance count

Available in Cloud Run metrics dashboard.

## Updating the Deployment

### Quick Update

After making code changes:

```bash
./deploy-cloudrun.sh
```

This rebuilds, pushes, and redeploys automatically.

### Update Environment Variables Only

```bash
gcloud run services update aneya-backend \
    --region=europe-west2 \
    --set-env-vars="ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}"
```

### Update CORS Configuration

1. Edit `api.py` - add your Cloud Run URL to `allow_origins`
2. Redeploy: `./deploy-cloudrun.sh`

## Cost Optimization

### Current Configuration Costs

Cloud Run pricing (europe-west2):
- **CPU:** $0.00002400/vCPU-second (2 vCPUs)
- **Memory:** $0.00000250/GiB-second (2 GiB)
- **Requests:** $0.40 per million requests

**Estimated monthly cost (moderate usage):**
- 10,000 requests/month
- 30s average request duration
- ~$5-10/month

### Cost Saving Tips

1. **Scale to zero:** Current config has `--min-instances=0` ✅
2. **Reduce memory:** If usage is low, try `--memory=1Gi`
3. **Reduce CPU:** Try `--cpu=1` if performance is acceptable
4. **Set request timeout:** Current 300s is generous, can reduce if appropriate

Monitor usage in Cloud Console > Billing.

## Troubleshooting

### Deployment Fails

**Problem:** "Permission denied" error

**Solution:**
```bash
# Ensure you're authenticated
gcloud auth login

# Set correct project
gcloud config set project YOUR_PROJECT_ID

# Verify permissions
gcloud projects get-iam-policy YOUR_PROJECT_ID
```

### Service Returns 503

**Problem:** Container fails to start

**Solution:**
```bash
# Check logs
gcloud run services logs read aneya-backend --region=europe-west2 --limit=50

# Common issues:
# - ANTHROPIC_API_KEY not set
# - Port mismatch (ensure Dockerfile uses PORT env var)
# - Dependency installation failure
```

### CORS Errors in Frontend

**Problem:** Frontend can't call backend API

**Solution:**
1. Get your Cloud Run URL
2. Add it to `allow_origins` in `api.py`
3. Redeploy backend: `./deploy-cloudrun.sh`

### Timeout Errors

**Problem:** Requests timeout after 60s

**Solution:**
```bash
# Increase timeout (max 3600s)
gcloud run services update aneya-backend \
    --region=europe-west2 \
    --timeout=600
```

### High Costs

**Problem:** Unexpected high bills

**Solution:**
```bash
# Check metrics
gcloud run services describe aneya-backend --region=europe-west2

# Reduce resources if not needed
gcloud run services update aneya-backend \
    --region=europe-west2 \
    --memory=1Gi \
    --cpu=1 \
    --max-instances=3
```

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - id: auth
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1

      - name: Build and Deploy
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          gcloud auth configure-docker europe-west2-docker.pkg.dev
          ./deploy-cloudrun.sh
```

Required secrets in GitHub:
- `GCP_SA_KEY` - Service account JSON key
- `ANTHROPIC_API_KEY` - Anthropic API key

## Security Best Practices

### 1. Use Secret Manager (Recommended)

Instead of environment variables, use Google Secret Manager:

```bash
# Create secret
echo -n "${ANTHROPIC_API_KEY}" | gcloud secrets create anthropic-api-key \
    --data-file=- \
    --replication-policy="automatic"

# Grant Cloud Run access
gcloud secrets add-iam-policy-binding anthropic-api-key \
    --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

# Deploy with secret
gcloud run deploy aneya-backend \
    --set-secrets="ANTHROPIC_API_KEY=anthropic-api-key:latest" \
    ...other flags...
```

### 2. Authentication

For production, enable authentication:

```bash
gcloud run services update aneya-backend \
    --region=europe-west2 \
    --no-allow-unauthenticated
```

Then use Identity-Aware Proxy or API keys.

### 3. Rate Limiting

Implement rate limiting in `api.py` using `slowapi`:

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
```

## Additional Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Artifact Registry Documentation](https://cloud.google.com/artifact-registry/docs)
- [Cloud Run Pricing](https://cloud.google.com/run/pricing)
- [Best Practices for Cloud Run](https://cloud.google.com/run/docs/tips)

## Support

If you encounter issues:
1. Check logs: `gcloud run services logs read aneya-backend --region=europe-west2`
2. Verify environment variables are set correctly
3. Ensure ANTHROPIC_API_KEY is valid
4. Check Cloud Run quotas in Cloud Console
