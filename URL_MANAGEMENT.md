# URL Management Guide

## Canonical Production URLs

**These URLs should NEVER change:**

### Frontend
- **Production URL**: `https://aneya.vercel.app`
- **Vercel Project**: `aneya` (projectId: `prj_n8nxVyvKVaA9Kg2EcchVIAIUAx5f`)
- **Deploy from**: `/Users/dgordon/python/hackathons/aneya` (root directory, NOT /frontend)

### Backend
- **Production URL**: `https://aneya-backend-217191264902.europe-west2.run.app`
- **GCP Service**: `aneya-backend`
- **GCP Region**: `europe-west2`
- **GCP Project**: `217191264902`

---

## Why URLs Were Changing

### Frontend Issue: Wrong Vercel Project
**Problem**: Deploying from `/frontend` directory deploys to the wrong Vercel project.

```bash
# ❌ WRONG - Deploys to "frontend" project
cd /Users/dgordon/python/hackathons/aneya/frontend
vercel --prod

# ✅ CORRECT - Deploys to "aneya" project
cd /Users/dgordon/python/hackathons/aneya
vercel --prod
```

**Root Cause**: Two `.vercel/project.json` files exist:
- `/aneya/.vercel/project.json` → Points to "aneya" project (CORRECT)
- `/aneya/frontend/.vercel/project.json` → Points to "frontend" project (WRONG)

### Backend Issue: Region/Project Mismatch
**Problem**: Cloud Run URL contains the GCP project number. If you deploy to a different project or region, the URL changes.

The deployment script is correct:
- `SERVICE_NAME="aneya-backend"` is hardcoded
- `REGION="europe-west2"` is hardcoded
- Project ID comes from: `gcloud config get-value project`

**Old URL Format**: `https://aneya-backend-fhnsxp4nua-nw.a.run.app`
- This used a different region code (`nw` = northamerica-northeast1)
- The hash `fhnsxp4nua` suggests it was from a different deployment method

**Current URL Format**: `https://aneya-backend-217191264902.europe-west2.run.app`
- Uses the GCP project number (217191264902)
- Uses the correct region (europe-west2)
- This URL is **stable** and will not change as long as the service name and region remain the same

---

## Deployment Procedures

### Frontend Deployment (Correct Method)

```bash
# 1. Navigate to project ROOT (not /frontend)
cd /Users/dgordon/python/hackathons/aneya

# 2. Verify you're deploying to the correct project
vercel project ls  # Should show "aneya" project

# 3. Deploy to production
vercel --prod --yes

# 4. Verify the URL is correct
# Should output: https://aneya.vercel.app
```

### Backend Deployment (Correct Method)

```bash
# 1. Navigate to backend directory
cd /Users/dgordon/python/hackathons/aneya-backend

# 2. Verify GCP project is correct
gcloud config get-value project
# Should output: YOUR_PROJECT_ID (which resolves to project number 217191264902)

# 3. Set required environment variables
export ANTHROPIC_API_KEY="sk-ant-..."
export SCRAPEOPS_API_KEY="..."  # Optional but recommended

# 4. Run deployment script
./deploy-cloudrun.sh

# 5. The script will output the stable URL:
# Service URL: https://aneya-backend-217191264902.europe-west2.run.app
```

---

## Environment Variable Management

### Update Frontend to Point to Backend

```bash
# Navigate to project root
cd /Users/dgordon/python/hackathons/aneya

# Remove old environment variable (if exists)
vercel env rm VITE_API_URL production --yes

# Add the correct, stable backend URL
printf "https://aneya-backend-217191264902.europe-west2.run.app" | \
  vercel env add VITE_API_URL production

# Redeploy frontend to pick up new environment variable
vercel --prod --yes
```

**IMPORTANT**: Always use `printf` (not `echo`) to avoid trailing newlines.

---

## Automated Deployment Script

To prevent future mistakes, use this script:

```bash
#!/bin/bash
# File: /Users/dgordon/python/hackathons/aneya/deploy-all.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Stable URLs
FRONTEND_URL="https://aneya.vercel.app"
BACKEND_URL="https://aneya-backend-217191264902.europe-west2.run.app"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Aneya Full Stack Deployment${NC}"
echo -e "${GREEN}========================================${NC}"

# Deploy backend
echo -e "${YELLOW}Step 1: Deploying backend...${NC}"
cd /Users/dgordon/python/hackathons/aneya-backend
./deploy-cloudrun.sh

# Get the actual backend URL from Cloud Run
ACTUAL_BACKEND_URL=$(gcloud run services describe aneya-backend \
    --platform=managed \
    --region=europe-west2 \
    --format='value(status.url)')

echo -e "${GREEN}✓ Backend deployed to: ${ACTUAL_BACKEND_URL}${NC}"

# Verify it matches expected URL
if [ "$ACTUAL_BACKEND_URL" != "$BACKEND_URL" ]; then
    echo -e "${YELLOW}⚠ WARNING: Backend URL changed!${NC}"
    echo -e "${YELLOW}  Expected: ${BACKEND_URL}${NC}"
    echo -e "${YELLOW}  Got:      ${ACTUAL_BACKEND_URL}${NC}"
    echo -e "${YELLOW}  Updating frontend environment variable...${NC}"

    cd /Users/dgordon/python/hackathons/aneya
    vercel env rm VITE_API_URL production --yes 2>/dev/null || true
    printf "${ACTUAL_BACKEND_URL}" | vercel env add VITE_API_URL production
fi

# Deploy frontend
echo -e "${YELLOW}Step 2: Deploying frontend...${NC}"
cd /Users/dgordon/python/hackathons/aneya
vercel --prod --yes

ACTUAL_FRONTEND_URL=$(vercel ls --prod 2>&1 | grep "aneya.vercel.app" | head -1 | awk '{print $1}')

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Frontend: ${ACTUAL_FRONTEND_URL}${NC}"
echo -e "${GREEN}Backend:  ${ACTUAL_BACKEND_URL}${NC}"
```

---

## Verification Checklist

After any deployment, verify URLs are correct:

```bash
# 1. Check frontend is on correct project
cd /Users/dgordon/python/hackathons/aneya
vercel ls --prod | grep aneya.vercel.app
# Should show: https://aneya.vercel.app

# 2. Check backend URL
gcloud run services describe aneya-backend \
  --region=europe-west2 \
  --format='value(status.url)'
# Should show: https://aneya-backend-217191264902.europe-west2.run.app

# 3. Check frontend environment variable
vercel env pull .env.production --environment production --yes
grep VITE_API_URL .env.production
# Should show: VITE_API_URL="https://aneya-backend-217191264902.europe-west2.run.app"

# 4. Test end-to-end
curl https://aneya-backend-217191264902.europe-west2.run.app/health
curl https://aneya.vercel.app
```

---

## Troubleshooting

### Frontend deploys to wrong URL
**Symptom**: URL is `frontend-*.vercel.app` instead of `aneya.vercel.app`

**Fix**:
```bash
cd /Users/dgordon/python/hackathons/aneya  # Go to ROOT, not /frontend
vercel --prod --yes
```

### Backend URL changed
**Symptom**: URL is different from `https://aneya-backend-217191264902.europe-west2.run.app`

**Possible Causes**:
1. Deployed to wrong region (check `deploy-cloudrun.sh` line 9: `REGION="europe-west2"`)
2. Deployed to wrong GCP project (check: `gcloud config get-value project`)
3. Changed service name (check `deploy-cloudrun.sh` line 10: `SERVICE_NAME="aneya-backend"`)

**Fix**: Ensure deployment script hasn't been modified and GCP project is correct.

---

## Key Takeaways

1. **Always deploy frontend from `/aneya` root directory**, never from `/aneya/frontend`
2. **Backend URL is stable** as long as service name (`aneya-backend`) and region (`europe-west2`) don't change
3. **Use `printf` not `echo`** when setting environment variables to avoid trailing newlines
4. **Verify URLs after deployment** using the checklist above
5. **These URLs should never change** - if they do, investigate immediately
