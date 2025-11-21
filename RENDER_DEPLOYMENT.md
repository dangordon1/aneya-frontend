# Render.com Deployment Guide for Clara Backend

Render.com is a modern hosting platform with excellent Docker support and may have different IP ranges that work with BNF website lookups.

## Why Render.com?

**Advantages over Railway:**
- More mature Docker support
- Clear PORT handling (automatically provides PORT env var correctly)
- Free tier available
- Good logging and monitoring
- Different IP ranges (may bypass BNF blocking)

## Quick Deploy via Web Dashboard

### Step 1: Sign Up / Login
1. Visit https://render.com
2. Sign up or login with GitHub

### Step 2: Create New Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Select the repository: `dangordon1/aneya`

### Step 3: Configure Service
Render should auto-detect the `render.yaml` configuration, but verify these settings:

**Basic Settings:**
- **Name:** `aneya-backend`
- **Region:** Oregon (US West) - different IPs than GCP Europe
- **Branch:** `main`
- **Runtime:** Docker
- **Dockerfile Path:** `./Dockerfile`

**Instance Settings:**
- **Plan:** Free (or Starter $7/month for better reliability)

**Environment Variables:**
Click **"Advanced"** → **"Add Environment Variable"**:
```
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```
(Use your actual Anthropic API key)

**Health Check:**
- **Path:** `/health`
- Auto-configured from `render.yaml`

### Step 4: Deploy
1. Click **"Create Web Service"**
2. Render will automatically:
   - Clone your repo
   - Build the Docker image
   - Deploy the container
   - Assign a public URL

### Step 5: Monitor Deployment
Watch the logs in real-time:
- Build logs show Docker image creation
- Deploy logs show container startup
- Look for: `INFO:     Uvicorn running on http://0.0.0.0:8080`

## Expected Deployment URL

Your service will be available at:
```
https://aneya-backend.onrender.com
```
(exact URL shown in Render dashboard after deployment)

## Testing BNF Lookups

Once deployed, test if Render's IPs work with BNF:

```bash
# Test health endpoint
curl https://aneya-backend.onrender.com/health

# Test BNF lookup
curl -X POST https://aneya-backend.onrender.com/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "consultation": "prescribe amoxicillin 500mg for bacterial infection",
    "patient_id": "RENDER_TEST"
  }'
```

### Success Indicators:
```json
{
  "bnf_summaries": [...],  // Should have 1-3 items
  "bnf_prescribing_guidance": [...],  // Should have prescribing details
  "diagnoses": [...],
  "medications_analyzed": [...]
}
```

### Failure Indicators:
```json
{
  "bnf_summaries": [],  // Empty - BNF blocked
  "bnf_prescribing_guidance": [],  // Empty - BNF blocked
}
```

## Render.com vs Railway Differences

| Feature | Render.com | Railway |
|---------|------------|---------|
| **Docker Support** | Mature, well-documented | Newer, PORT issues |
| **Free Tier** | ✅ 750 hours/month | ✅ $5 credit/month |
| **Auto-deploy** | ✅ Yes | ✅ Yes |
| **Health Checks** | ✅ Built-in | ✅ Built-in |
| **PORT Variable** | Properly handled | Problematic |
| **Logging** | Excellent real-time | Good |
| **IP Ranges** | US West (Oregon) | US/EU regions |

## Advantages of Render

1. **No PORT variable issues** - Render properly handles Docker EXPOSE
2. **Better documentation** - Clear guides for Docker deployments
3. **Predictable behavior** - More mature platform
4. **Free tier** - 750 hours/month (enough for testing)
5. **Different IPs** - May bypass BNF blocking

## Configuration Files

This deployment uses:
- **render.yaml** - Service configuration
- **Dockerfile** - Container definition (with exec form CMD)
- **.dockerignore** - Excludes unnecessary files

## Troubleshooting

### If deployment fails:

**Check Build Logs:**
- Go to Render dashboard → Your service → Events
- Look for Docker build errors
- Verify all dependencies install correctly

**Check Deploy Logs:**
- Look for `Uvicorn running on...`
- Check for Python errors or import failures
- Verify ANTHROPIC_API_KEY is set

### If health checks fail:

1. Check that `/health` endpoint returns 200
2. Verify app is listening on `0.0.0.0:8080`
3. Check logs for connection errors

### If BNF lookups still fail:

If Render's IPs are also blocked by BNF:
1. **Option 1:** Use ScraperAPI proxy (set `BNF_PROXY_URL` env var)
2. **Option 2:** Try Fly.io (global edge network, different IPs)
3. **Option 3:** Contact NICE/BNF for API access

## Cost Comparison

**Free Tier:**
- 750 hours/month
- Automatic sleep after 15 min inactivity
- Slow cold starts (~30 seconds)

**Starter Plan ($7/month):**
- Always-on (no sleep)
- Faster deploys
- Better for production

## Next Steps After Deployment

1. **Test BNF access** - Run test curl command above
2. **Update frontend** - Point Vercel frontend to new Render URL
3. **Monitor performance** - Check Render dashboard metrics
4. **Consider upgrade** - If free tier sleep is too slow

## Alternative: Keep Cloud Run + Proxy

**Important consideration:** Your Google Cloud Run deployment works perfectly. The only issue is BNF IP blocking. A pragmatic solution might be to:

1. Keep backend on Cloud Run (reliable, fast, proven to work)
2. Enable ScraperAPI proxy for BNF lookups only
3. Set environment variable:
   ```
   BNF_PROXY_URL=http://scraperapi:YOUR_KEY@proxy-server.scraperapi.com:8001
   ```
4. Cost: ~$20/month for ScraperAPI

This approach leverages your working Cloud Run infrastructure while solving the BNF access issue.

---

**Last Updated:** 2025-11-21
**Status:** Ready to deploy
**Recommended:** Deploy to Render and test BNF access
