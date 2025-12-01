# Aneya Deployment Guide & Issue Prevention

This document provides comprehensive guidance on deploying Aneya and preventing common configuration issues.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Root Cause Analysis: November 2025 Incident](#root-cause-analysis)
3. [Prevention Strategies](#prevention-strategies)
4. [Deployment Checklist](#deployment-checklist)
5. [Verification Procedures](#verification-procedures)
6. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Production Architecture
```
┌─────────────────────────────────────────┐
│  Frontend (Vercel)                      │
│  https://aneya.vercel.app               │
│  - React + TypeScript + Vite            │
│  - Environment: VITE_API_URL            │
└──────────────┬──────────────────────────┘
               │ HTTPS
               │ CORS-protected
               ▼
┌─────────────────────────────────────────┐
│  Backend (Google Cloud Run)             │
│  https://aneya-backend-...run.app       │
│  - FastAPI + Python                     │
│  - Region: europe-west2 (London)        │
│  - MCP servers for clinical guidelines  │
└─────────────────────────────────────────┘
```

### Key Connection Points
1. **Frontend → Backend**: REST API over HTTPS
2. **Environment Variable**: `VITE_API_URL` must point to backend
3. **CORS**: Backend must whitelist frontend origin
4. **Health Checks**: `/api/health` endpoint for status verification

---

## Root Cause Analysis: November 2025 Incident

### Issue Description
Production frontend at `https://aneya.vercel.app` could not connect to the backend, resulting in failed API calls and non-functional application.

### Root Causes Identified

#### 1. **Critical: Trailing Newline in Environment Variable**
**Problem:**
```bash
# Vercel production environment variable contained:
VITE_API_URL="https://aneya-backend-217191264902.europe-west2.run.app\n"
                                                                    ^^^^
```

**Impact:**
- Literal `\n` character at end of URL
- All API requests became malformed: `https://...run.app%0A/api/health`
- URL-encoded newline (`%0A`) caused 404 errors
- Complete failure of all frontend-backend communication

**Lesson:** Environment variables must be set programmatically without shell interpretation of escape sequences.

#### 2. **Minor: Outdated Backend URL**
**Problem:**
- Environment variable pointed to old Cloud Run URL: `...217191264902.europe-west2.run.app`
- Current deployment is at: `...fhnsxp4nua-nw.a.run.app`

**Impact:**
- Still functional (Google maintains old URLs)
- Potential for confusion and maintenance issues
- Could break if old URL is deprecated

**Lesson:** Track current backend URLs and update references after deployments.

### What Was Working Correctly
✅ CORS configuration properly allowed `https://aneya.vercel.app`
✅ Backend health endpoints functioning correctly
✅ Local development environment configured correctly
✅ Frontend code properly reading environment variables

---

## Prevention Strategies

### 1. Environment Variable Management

#### Best Practices
```bash
# ❌ WRONG - Can introduce newlines
vercel env add VITE_API_URL production
# Then pasting URL followed by Enter creates: "url\n"

# ✅ CORRECT - Use printf to avoid trailing newline
printf "https://aneya-backend-fhnsxp4nua-nw.a.run.app" | vercel env add VITE_API_URL production

# ✅ ALTERNATIVE - Use echo -n
echo -n "https://aneya-backend-fhnsxp4nua-nw.a.run.app" | vercel env add VITE_API_URL production
```

#### Validation at Application Startup
The frontend now includes automatic validation (see `frontend/src/App.tsx`):
```typescript
const API_URL = (() => {
  const url = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Validate no newlines or invalid characters
  if (url.includes('\n') || url.includes('\r') || url.includes('%0A') || url.includes('%0D')) {
    throw new Error('Invalid API_URL configuration - contains newline characters');
  }

  // Validate URL format
  try {
    new URL(url);
  } catch (e) {
    throw new Error('Invalid API_URL configuration - not a valid URL');
  }

  console.log('✅ API_URL validated:', url);
  return url;
})();
```

**Impact:** Invalid configuration now fails fast with clear error message instead of silent failures.

### 2. Automated Verification Script

Use the provided verification script before and after deployments:
```bash
cd /Users/dgordon/python/hackathons/aneya
./scripts/verify-deployment.sh
```

The script checks:
- ✓ Environment variables are clean (no newlines)
- ✓ Backend health endpoint is responding
- ✓ CORS is properly configured
- ✓ Frontend is accessible
- ✓ API endpoints are functional

### 3. Backend URL Tracking

**Current Backend URL (as of November 2025):**
```
https://aneya-backend-fhnsxp4nua-nw.a.run.app
```

**Update locations after backend redeployment:**
1. Vercel environment variable: `VITE_API_URL`
2. Local `.env.production.local`
3. Backend README.md
4. This deployment guide

### 4. CORS Configuration

**Backend CORS settings** (`api.py`):
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Local dev
        "http://localhost:5174",  # Local dev alt
        "http://localhost:3000",  # Local dev alt
        "https://aneya.vercel.app",  # Production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Important:** After changing frontend domain, update CORS origins in backend and redeploy.

---

## Deployment Checklist

### Pre-Deployment
- [ ] Verify backend is running: `curl https://BACKEND_URL/api/health`
- [ ] Check environment variables: `vercel env pull /tmp/check.env --environment=production`
- [ ] Inspect for newlines: `grep VITE_API_URL /tmp/check.env | od -c`
- [ ] Review recent code changes for breaking API changes

### Frontend Deployment
```bash
cd /Users/dgordon/python/hackathons/aneya

# 1. Update environment variable if backend URL changed
vercel env rm VITE_API_URL production --yes
printf "https://NEW_BACKEND_URL" | vercel env add VITE_API_URL production

# 2. Deploy to production
vercel --prod --yes

# 3. Verify deployment
./scripts/verify-deployment.sh
```

### Backend Deployment
```bash
cd /Users/dgordon/python/hackathons/aneya-backend

# 1. Set environment variables
export GCP_PROJECT_ID=your-project-id
export ANTHROPIC_API_KEY=sk-ant-xxxxx

# 2. Deploy
./deploy-cloudrun.sh

# 3. Get new backend URL
gcloud run services describe aneya-backend --region=europe-west2 --format='value(status.url)'

# 4. Update frontend environment variable (see Frontend Deployment step 1)
```

### Post-Deployment
- [ ] Run verification script: `./scripts/verify-deployment.sh`
- [ ] Test frontend manually: https://aneya.vercel.app
- [ ] Submit test consultation and verify full workflow
- [ ] Check browser DevTools console for errors
- [ ] Verify no `%0A` in network request URLs

---

## Verification Procedures

### Manual Verification

#### 1. Environment Variable Inspection
```bash
# Pull production environment
vercel env pull /tmp/prod.env --environment=production

# Check VITE_API_URL value
grep VITE_API_URL /tmp/prod.env

# Inspect for hidden characters
grep VITE_API_URL /tmp/prod.env | od -c
# Should NOT see: \n, \r, or any escape sequences
```

#### 2. Backend Health Check
```bash
curl -s https://aneya-backend-fhnsxp4nua-nw.a.run.app/api/health | jq
# Expected: {"status":"healthy","message":"All systems operational"}
```

#### 3. CORS Verification
```bash
curl -I -X OPTIONS https://BACKEND_URL/api/health \
  -H "Origin: https://aneya.vercel.app" \
  -H "Access-Control-Request-Method: GET"

# Look for:
# access-control-allow-origin: https://aneya.vercel.app
# access-control-allow-credentials: true
```

#### 4. Frontend Build Check
```bash
# Check that Vite is using the correct environment variable
cd frontend
npm run build

# Inspect built files for API URL
grep -r "aneya-backend" dist/
# Should see correct backend URL without %0A
```

### Automated Verification
```bash
./scripts/verify-deployment.sh
```

---

## Troubleshooting

### Issue: "Unable to connect to backend"

**Symptoms:**
- Frontend shows connection error
- Browser DevTools shows failed requests
- Network tab shows URLs with `%0A`, `%0D`, or malformed paths

**Diagnosis:**
```bash
# Check environment variable
vercel env pull /tmp/debug.env --environment=production
grep VITE_API_URL /tmp/debug.env | od -c

# Look for:
- Literal \n or \r characters
- Encoded newlines (%0A, %0D)
- Spaces in URL
- Missing https://
```

**Fix:**
```bash
# Remove bad variable
vercel env rm VITE_API_URL production --yes

# Add correct variable (use printf!)
printf "https://aneya-backend-fhnsxp4nua-nw.a.run.app" | \
  vercel env add VITE_API_URL production

# Redeploy
vercel --prod --yes
```

### Issue: CORS errors

**Symptoms:**
- Browser console shows: "has been blocked by CORS policy"
- Preflight OPTIONS requests fail

**Diagnosis:**
```bash
# Test CORS
curl -I -X OPTIONS https://BACKEND_URL/api/health \
  -H "Origin: https://aneya.vercel.app"

# Check for access-control-allow-origin header
```

**Fix:**
1. Edit `api.py` in backend
2. Add frontend URL to `allow_origins` list
3. Redeploy backend: `./deploy-cloudrun.sh`

### Issue: Backend health check fails

**Symptoms:**
- Frontend shows "Backend unavailable"
- Health endpoint returns non-200 status

**Diagnosis:**
```bash
# Check backend status
curl -v https://BACKEND_URL/api/health

# Check Cloud Run logs
gcloud run services logs read aneya-backend --region=europe-west2 --limit=50
```

**Fix:**
1. Check Cloud Run deployment status
2. Verify environment variables in Cloud Run (ANTHROPIC_API_KEY)
3. Check for startup errors in logs
4. Redeploy if necessary

### Issue: Old backend URL

**Symptoms:**
- Frontend connects to old Cloud Run revision
- Inconsistent behavior between deployments

**Diagnosis:**
```bash
# Check current backend URL
gcloud run services describe aneya-backend \
  --region=europe-west2 \
  --format='value(status.url)'

# Compare with environment variable
vercel env pull /tmp/check.env --environment=production
grep VITE_API_URL /tmp/check.env
```

**Fix:**
Update environment variable to current backend URL (see deployment checklist).

---

## Best Practices Summary

### ✅ DO:
- Use `printf` or `echo -n` when setting environment variables via CLI
- Run verification script before and after deployments
- Keep backend URLs synchronized across all configuration files
- Test health endpoints before deploying frontend
- Use automated validation in application code
- Document backend URL changes
- Test CORS configuration after frontend domain changes

### ❌ DON'T:
- Paste URLs with Enter key when prompted by `vercel env add`
- Deploy frontend without verifying backend is healthy
- Skip the verification script
- Assume environment variables are clean without inspection
- Change backend URL without updating frontend environment
- Deploy without testing CORS configuration

---

## Emergency Rollback Procedure

If a deployment causes production issues:

```bash
# 1. Rollback frontend to previous deployment
vercel rollback

# 2. Or: Quickly fix environment variable
vercel env rm VITE_API_URL production --yes
printf "KNOWN_GOOD_BACKEND_URL" | vercel env add VITE_API_URL production
vercel --prod --yes

# 3. Verify rollback
./scripts/verify-deployment.sh
```

---

## Monitoring & Alerts

### Recommended Monitoring
1. **Backend Health**: Monitor `/api/health` endpoint (should always return 200)
2. **Frontend Availability**: Monitor https://aneya.vercel.app (should return 200)
3. **CORS Errors**: Track browser console errors in production
4. **API Response Times**: Monitor `/api/analyze` endpoint latency

### Setting Up Alerts
Consider using:
- **Google Cloud Monitoring**: Alert on Cloud Run errors/downtime
- **Vercel Analytics**: Monitor frontend errors and performance
- **Sentry or Similar**: Track frontend JavaScript errors

---

## Additional Resources

- **Backend Repository**: `/Users/dgordon/python/hackathons/aneya-backend`
- **Frontend Repository**: `/Users/dgordon/python/hackathons/aneya`
- **Verification Script**: `/Users/dgordon/python/hackathons/aneya/scripts/verify-deployment.sh`
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Google Cloud Console**: https://console.cloud.google.com/run

---

## Changelog

### November 29, 2025
- **Incident**: Production frontend unable to connect to backend
- **Root Cause**: Trailing `\n` in `VITE_API_URL` environment variable
- **Resolution**: Removed and re-added environment variable using `printf`
- **Prevention**:
  - Added environment variable validation to App.tsx
  - Created deployment verification script
  - Documented best practices in this guide

---

**Document Version**: 1.0
**Last Updated**: November 29, 2025
**Maintained By**: Aneya Development Team
