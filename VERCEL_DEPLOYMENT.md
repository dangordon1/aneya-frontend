# Deploying Clara to Vercel

This guide walks you through deploying the Clara Clinical Decision Support application to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI** (optional but recommended): Install with `npm install -g vercel`
3. **Anthropic API Key**: Get one from [console.anthropic.com](https://console.anthropic.com)
4. **Promo Code**: `HEIDI-HACK-V0-2` (for Vercel credits)

## Project Structure (Vercel-Ready)

```
heidi/
├── api/
│   └── index.py              # Serverless FastAPI backend
├── frontend/
│   ├── src/                  # React source code
│   ├── dist/                 # Build output (generated)
│   └── package.json          # Frontend dependencies
├── servers/                  # MCP servers (imported by api)
│   ├── clinical_decision_support_client.py
│   ├── nice_guidelines_server.py
│   ├── bnf_server.py
│   └── ...
├── requirements.txt          # Python dependencies for Vercel
├── vercel.json              # Vercel configuration
└── .vercelignore            # Files to exclude from deployment
```

## Deployment Methods

### Method 1: Vercel CLI (Recommended)

#### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

#### Step 2: Login to Vercel

```bash
vercel login
```

#### Step 3: Deploy from Project Root

```bash
cd /Users/dgordon/python/hackathons/heidi
vercel
```

The CLI will:
1. Ask if you want to set up a new project (select **Yes**)
2. Ask for project settings (accept defaults)
3. Deploy your application

#### Step 4: Add Environment Variables

After the first deployment, add your environment variables:

```bash
vercel env add ANTHROPIC_API_KEY
```

When prompted:
- **Value**: Paste your Anthropic API key
- **Environments**: Select **Production**, **Preview**, and **Development**

#### Step 5: Redeploy with Environment Variables

```bash
vercel --prod
```

### Method 2: GitHub Integration (Alternative)

#### Step 1: Push to GitHub

```bash
cd /Users/dgordon/python/hackathons/heidi
git init
git add .
git commit -m "Initial commit for Vercel deployment"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

#### Step 2: Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import Git Repository**
3. Select your GitHub repository
4. Configure project:
   - **Framework Preset**: Other
   - **Root Directory**: Leave as `./`
   - **Build Command**: Auto-detected
   - **Output Directory**: Auto-detected

#### Step 3: Add Environment Variables

In the Vercel project settings:
1. Go to **Settings** → **Environment Variables**
2. Add `ANTHROPIC_API_KEY` with your API key
3. Select all environments (Production, Preview, Development)

#### Step 4: Redeploy

Vercel will automatically redeploy when you push to GitHub.

## Apply Promo Code

To apply the Vercel credits:

1. Go to [vercel.com/account/billing](https://vercel.com/account/billing)
2. Click **Add Promo Code**
3. Enter: `HEIDI-HACK-V0-2`
4. Click **Apply**

## Verifying Deployment

### Check API Health

Once deployed, your API will be available at:
```
https://<your-project>.vercel.app/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "message": "All systems operational"
}
```

### Check Frontend

Visit your Vercel app URL:
```
https://<your-project>.vercel.app
```

You should see the Clara interface.

## Configuration Details

### vercel.json

The `vercel.json` file configures:
- **Build Command**: Builds the React frontend
- **Output Directory**: Frontend build output location
- **Rewrites**: Routes API requests to the Python serverless function
- **Environment Variables**: References to secrets

### API Structure

The API is serverless-adapted:
- **Cold Starts**: First request may be slower (3-5 seconds) as MCP servers initialize
- **Warm Instances**: Subsequent requests reuse initialized client (faster)
- **Timeout**: Vercel has a 60-second timeout (Pro plan) or 10 seconds (Hobby plan)

## Troubleshooting

### Issue: API Returns 500 Error

**Check**: Environment variables are set correctly

```bash
vercel env ls
```

**Solution**: Add missing `ANTHROPIC_API_KEY`:

```bash
vercel env add ANTHROPIC_API_KEY
vercel --prod
```

### Issue: "Module not found" Error

**Check**: All dependencies are in `requirements.txt`

**Solution**: Redeploy:

```bash
vercel --prod --force
```

### Issue: Frontend Can't Reach API

**Check**: API routes in `vercel.json`

**Solution**: Ensure rewrites are configured:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/index.py"
    }
  ]
}
```

### Issue: Timeout Error (Function Execution Timeout)

**Cause**: Analysis takes longer than Vercel's timeout (10s Hobby, 60s Pro)

**Solutions**:
1. Upgrade to Vercel Pro (60s timeout)
2. Optimize MCP server initialization
3. Add request timeout handling in frontend

### Issue: Cold Start Slowness

**Cause**: Serverless functions initialize on each cold start

**Solutions**:
1. Accept slower first request (normal for serverless)
2. Keep instance warm with scheduled pings (requires cron job)
3. Optimize import statements to reduce startup time

## Local Development vs Production

### Local Development

```bash
# Terminal 1: Backend
python api.py

# Terminal 2: Frontend
cd frontend
npm run dev
```

Visit: `http://localhost:5173`

### Production (Vercel)

Visit: `https://<your-project>.vercel.app`

Both use the **same codebase** thanks to:
- Relative API paths (`/api/...`)
- Vite proxy in development
- Vercel rewrites in production

## Monitoring and Logs

### View Function Logs

```bash
vercel logs <deployment-url>
```

Or via Vercel Dashboard:
1. Go to your project
2. Click **Deployments**
3. Click on a deployment
4. Click **Functions** → **View Logs**

### Monitor Performance

In Vercel Dashboard:
1. Go to **Analytics**
2. View request counts, latency, errors

## Updating the Deployment

### Via CLI

```bash
git add .
git commit -m "Update"
vercel --prod
```

### Via GitHub

```bash
git add .
git commit -m "Update"
git push
```

Vercel auto-deploys on push!

## Cost Considerations

### Vercel Pricing

- **Hobby Plan** (Free):
  - 100 GB bandwidth/month
  - 100 hours serverless function execution/month
  - 10-second function timeout

- **Pro Plan** ($20/month):
  - 1 TB bandwidth/month
  - 1000 hours serverless function execution/month
  - 60-second function timeout

### Recommendations

- **Development/Testing**: Hobby plan is sufficient
- **Production**: Upgrade to Pro for 60-second timeout (clinical analysis can take 30-60s)

## Security Best Practices

1. **Never commit `.env` file**: Already in `.gitignore`
2. **Use Vercel environment variables**: Set via dashboard or CLI
3. **Restrict CORS**: Update `api/index.py` to restrict allowed origins in production
4. **Monitor usage**: Check Vercel analytics for unusual activity

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel CLI Reference](https://vercel.com/docs/cli)
- [Vercel Python Runtime](https://vercel.com/docs/functions/serverless-functions/runtimes/python)
- [FastAPI on Vercel](https://vercel.com/guides/deploying-fastapi-with-vercel)

## Support

If you encounter issues:

1. Check Vercel function logs: `vercel logs`
2. Check environment variables: `vercel env ls`
3. Review deployment logs in Vercel dashboard
4. Test API endpoint directly: `https://<your-project>.vercel.app/api/health`

## Next Steps

After successful deployment:

1. **Custom Domain**: Add a custom domain in Vercel project settings
2. **Analytics**: Enable Vercel Analytics for usage insights
3. **Testing**: Test with all example cases (pediatric croup, pneumonia, etc.)
4. **Optimization**: Monitor cold start times and optimize if needed
5. **Monitoring**: Set up alerts for errors and timeouts
