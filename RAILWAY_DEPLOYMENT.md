# Railway Deployment Guide for Clara Backend

Railway is being tested as an alternative to Google Cloud Run to see if BNF website lookups work without IP blocking.

## Quick Deploy via Web Dashboard (Easiest Method)

### Step 1: Go to Railway
1. Visit https://railway.app
2. Click "Start a New Project"
3. Sign up/Login with GitHub

### Step 2: Deploy from GitHub
1. Click "Deploy from GitHub repo"
2. Select your repository
3. Railway auto-detects `Dockerfile` and `railway.toml`

### Step 3: Set Environment Variable
In Railway dashboard → Variables tab:
```
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```
(Use your actual Anthropic API key - check your `.env` file or Anthropic dashboard)

### Step 4: Test BNF Lookups
After deployment completes, test:
```bash
curl https://your-railway-url.up.railway.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"consultation": "prescribe amoxicillin", "patient_id": "TEST"}'
```

Check the logs in Railway dashboard for BNF `debug_info` showing success or failure details!

## Why Railway?

**Problem:** Google Cloud Run IPs are blocked by BNF website
**Solution:** Railway may use different IP ranges that aren't blocked

