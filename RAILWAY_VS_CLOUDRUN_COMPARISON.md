# Railway vs Google Cloud Run - BNF Lookup Comparison

This document compares BNF website access between Railway and Google Cloud Run hosting platforms to determine if Railway can bypass the IP blocking issue.

## Problem Statement

**Issue:** Google Cloud Run IPs appear to be blocked or rate-limited by the BNF website (`bnf.nice.org.uk`), resulting in failed drug lookup requests.

**Hypothesis:** Railway uses different IP ranges that may not be blocked by BNF's infrastructure.

## Test Configuration

### Test Request
```json
{
  "consultation": "prescribe amoxicillin for bacterial infection",
  "patient_id": "TEST"
}
```

### Expected Behavior
When BNF lookups work correctly:
- `bnf_summaries`: Array with treatment summary articles (usually 1-3 items)
- `bnf_prescribing_guidance`: Array with detailed prescribing info (usually 1+ items)
- `bnf_debug_info`: Object showing successful HTTP requests with status codes

### Failure Indicators
When BNF lookups fail:
- `bnf_summaries`: Empty array `[]`
- `bnf_prescribing_guidance`: Empty array `[]`
- `bnf_debug_info`: May show HTTP errors, timeouts, or connection issues

## Test Results

### ✅ Localhost (Baseline - Control)
**Status:** BNF lookups WORK ✅

- **Environment:** Local development machine
- **BNF Summaries:** Multiple results returned
- **BNF Prescribing Guidance:** Detailed prescribing info available
- **Conclusion:** Code and BNF server are functional

### ❌ Google Cloud Run (Current Production)
**Status:** BNF lookups FAIL ❌

- **URL:** `https://aneya-backend-fhnsxp4nua-nw.a.run.app`
- **Region:** europe-west2 (London)
- **Test Date:** 2025-11-20
- **BNF Summaries:** `[]` (empty)
- **BNF Prescribing Guidance:** `[]` (empty)
- **IP Range:** Google Cloud europe-west2 egress IPs
- **Conclusion:** Cloud Run IPs are blocked/rate-limited by BNF

**Test Evidence:**
```bash
$ grep -o '"bnf_summaries":\[[^]]*\]' /tmp/cloudrun-debug-test.json
"bnf_summaries":[]
```

### ❌ Railway (Testing Alternative)
**Status:** DEPLOYMENT FAILED - ABANDONED ❌

- **URL:** https://web-production-f055b.up.railway.app/
- **Region:** Railway europe-west4
- **Final Status:** Persistent PORT environment variable injection issue
- **Commits Attempted:** 59f2514, 988dfb4 (shell form, exec form)
- **Deployment Attempts:** 6+ with various CMD configurations

**Final Error:**
```
Error: Invalid value for '--port': '$PORT' is not a valid integer.
```

**Troubleshooting Steps Completed:**
1. ✅ Removed PORT variable from Dockerfile
2. ✅ Removed conflicting startCommand from railway.toml
3. ✅ Removed Docker HEALTHCHECK
4. ✅ Tried shell form CMD: `CMD uvicorn...`
5. ✅ Tried exec form CMD: `CMD ["uvicorn", ...]`
6. ✅ Multiple cache-busting rebuilds
7. ❌ Railway still injecting $PORT variable into container

**Root Cause:** Railway's build system appears to have a bug where it injects a PORT environment variable that conflicts with Docker CMD, even with exec form (JSON array) syntax that should prevent variable expansion.

**Conclusion:** Moving to Render.com instead - see `RENDER_DEPLOYMENT.md`

### ⏳ Render.com (New Alternative)
**Status:** READY TO DEPLOY ⏳

- **URL:** TBD (will be `https://aneya-backend.onrender.com`)
- **Region:** Oregon (US West)
- **Deployment Guide:** `RENDER_DEPLOYMENT.md`
- **Configuration:** `render.yaml`
- **Advantages:**
  - Mature Docker support (no PORT issues)
  - Free tier: 750 hours/month
  - Different IP ranges (may bypass BNF blocking)
  - Excellent logging and monitoring

**Test Results:** (To be completed after deployment)
- BNF Summaries:
- BNF Prescribing Guidance:
- IP Range:
- Conclusion:

## Analysis

### Root Cause Investigation

The BNF website blocking could be due to:

1. **IP Reputation** - Cloud providers' IP ranges may be on blocklists due to abuse
2. **Geographic Restrictions** - Some CDNs block cloud provider IPs
3. **Rate Limiting** - Aggressive rate limiting on known cloud IP ranges
4. **Bot Detection** - WAF/security systems flagging automated requests from cloud IPs

### Why Railway Might Work

Railway's infrastructure differs from major cloud providers:
- **Smaller platform** - IPs less likely to be on general blocklists
- **Different IP ranges** - Not part of GCP/AWS/Azure known ranges
- **Lower abuse profile** - Smaller user base = less spam/abuse from their IPs

### Alternative Solutions (If Railway Also Fails)

If Railway IPs are also blocked:

1. **Residential Proxy Service** - Use ScraperAPI premium (requires subscription)
2. **API Gateway** - Deploy through Cloudflare Workers (different IP pools)
3. **Hybrid Architecture** - Use a small VPS (Digital Ocean, Linode) specifically for BNF lookups
4. **BNF API Access** - Contact NICE/BNF to request official API access or whitelist
5. **Caching Strategy** - Aggressive caching to minimize BNF requests

## Testing Instructions

### Test Railway Deployment

Once Railway is running with correct environment variables:

```bash
# Run automated test script
./test-railway-bnf.sh

# Or test manually
curl -X POST https://[your-railway-url].up.railway.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"consultation": "prescribe amoxicillin", "patient_id": "RAILWAY_TEST"}'
```

### Interpreting Results

**Success Indicators:**
- JSON response contains non-empty `bnf_summaries` array
- `bnf_prescribing_guidance` contains detailed medication info
- HTTP 200 status code
- Response time < 60 seconds

**Failure Indicators:**
- Empty arrays: `"bnf_summaries": []`
- HTTP errors (403, 429, 503)
- Timeout after 60+ seconds
- `bnf_debug_info` shows connection errors

## Deployment Configuration Comparison

| Feature | Cloud Run | Railway |
|---------|-----------|---------|
| **Docker Support** | ✅ Yes | ✅ Yes |
| **Auto-scaling** | ✅ Yes (0-10 instances) | ✅ Yes |
| **Health Checks** | ✅ `/health` endpoint | ✅ `/health` endpoint |
| **Region** | europe-west2 (London) | Default (US/EU) |
| **Cold Start** | ~2-5 seconds | ~3-7 seconds |
| **Cost** | Pay per request | $5-20/month flat |
| **Configuration** | `deploy-cloudrun.sh` | `railway.toml` |
| **Environment Variables** | Via gcloud CLI | Via web dashboard |

## Current Status

**Date:** 2025-11-20

**Railway Deployment:**
- ✅ Configuration files created (`railway.toml`)
- ✅ Deployment guide created (`RAILWAY_DEPLOYMENT.md`)
- ✅ Code pushed to GitHub
- ✅ Railway deployment triggered
- ⏳ **BLOCKED:** Health checks failing - missing `ANTHROPIC_API_KEY` env var
- ⏳ **WAITING:** User needs to add environment variable in Railway dashboard

**Next Action:** Add environment variable to trigger automatic redeploy, then run `./test-railway-bnf.sh`

## Conclusion

**To be completed after Railway testing**

Once Railway testing is complete, we will know:
1. Whether Railway IPs can access BNF website successfully
2. If Railway is a viable production hosting alternative to Cloud Run
3. Whether we need to pursue proxy/VPS solutions for BNF access

---

**Last Updated:** 2025-11-20
**Tester:** Claude Code
**Status:** Testing in progress
