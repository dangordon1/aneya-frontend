# BNF Proxy Setup Guide

## Problem
Google Cloud Run IPs are blocked by bnf.nice.org.uk, preventing BNF drug lookups.

## Solution
Route BNF requests through an HTTP proxy service with residential IPs.

## Proxy Service Options

### 1. ScraperAPI (Recommended for Testing)
- **Free Tier**: 1,000 requests/month
- **Cost**: $49/month for 100K requests
- **Setup**:
  ```bash
  # Sign up at https://www.scraperapi.com/
  # Get your API key
  export BNF_PROXY_URL="http://scraperapi:YOUR_API_KEY@proxy-server.scraperapi.com:8001"
  ```

### 2. WebShare (Cheapest)
- **Cost**: $2.99/month for 250 GB
- **Type**: Residential proxies
- **Setup**:
  ```bash
  # Sign up at https://www.webshare.io/
  # Get proxy credentials
  export BNF_PROXY_URL="http://username:password@proxy.webshare.io:80"
  ```

### 3. Bright Data (Enterprise)
- **Cost**: ~$500+/month
- **Quality**: Best success rate
- **Setup**:
  ```bash
  export BNF_PROXY_URL="http://username:password@zproxy.lum-superproxy.io:22225"
  ```

### 4. SmartProxy
- **Cost**: $50/month for 5 GB
- **Type**: Residential + Datacenter
- **Setup**:
  ```bash
  export BNF_PROXY_URL="http://username:password@gate.smartproxy.com:7000"
  ```

## Deployment

### Option A: Test Locally First
```bash
# Set proxy URL
export BNF_PROXY_URL="http://your-proxy-service"
export ANTHROPIC_API_KEY="sk-ant-xxxxx"

# Run API
python api.py

# Test
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"consultation": "3-year-old with croup", "patient_id": "TEST"}'
```

### Option B: Deploy to Cloud Run
```bash
# Set both environment variables
export BNF_PROXY_URL="http://your-proxy-service"
export ANTHROPIC_API_KEY="sk-ant-xxxxx"

# Deploy
./deploy-cloudrun.sh
```

The deployment script will automatically include BNF_PROXY_URL if set.

## Verification

Check Cloud Run logs for:
```
🔄 BNF server using proxy: proxy-service.com:8001
```

Instead of:
```
📡 BNF server using direct connection (no proxy)
```

## Cost Estimate

For typical usage (10 analyses/day, 2 BNF requests each):
- **Monthly requests**: ~600
- **ScraperAPI free tier**: ✅ Covers it
- **WebShare**: $2.99/month ✅ More than enough
- **SmartProxy**: $50/month (overkill)

## Recommendation

**Start with ScraperAPI free tier**:
1. Sign up at https://www.scraperapi.com/
2. Get your API key from dashboard
3. Set environment variable:
   ```bash
   export BNF_PROXY_URL="http://scraperapi:YOUR_API_KEY@proxy-server.scraperapi.com:8001"
   ```
4. Deploy and test

If you exceed 1,000 requests/month, switch to WebShare ($2.99/month).

## Troubleshooting

### Proxy connection fails
- Check proxy URL format: `http://user:pass@host:port`
- Verify credentials are correct
- Test proxy with curl:
  ```bash
  curl -x "http://user:pass@proxy:port" https://bnf.nice.org.uk/treatment-summaries/
  ```

### BNF still returns 0 results
- Check Cloud Run logs for proxy message
- Verify BNF_PROXY_URL is set in Cloud Run environment
- Try different proxy service (some may also be blocked)
