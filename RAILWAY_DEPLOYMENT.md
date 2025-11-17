# Deploying Clara Backend to Railway

## Prerequisites

1. Railway account - Sign up at [railway.app](https://railway.app)
2. Railway CLI (optional): `npm install -g @railway/cli`

## Deployment Steps

### Method 1: GitHub Integration (Recommended)

#### 1. Push to GitHub

```bash
cd /Users/dgordon/python/hackathons/heidi
git add .
git commit -m "Prepare for Railway deployment"
git push
```

#### 2. Deploy on Railway

1. Go to [railway.app/new](https://railway.app/new)
2. Click **Deploy from GitHub repo**
3. Select your `heidi` repository
4. Railway will auto-detect Python and use:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: From `Procfile`

#### 3. Set Environment Variables

In Railway dashboard:
1. Go to **Variables** tab
2. Add: `ANTHROPIC_API_KEY` = `your-api-key`
3. Railway will automatically restart

#### 4. Get Your Backend URL

Railway will provide a URL like: `https://heidi-production.up.railway.app`

### Method 2: Railway CLI

```bash
# Login
railway login

# Link to project (or create new)
railway init

# Set environment variable
railway variables set ANTHROPIC_API_KEY=your-key

# Deploy
railway up
```

## Update Frontend to Use Railway Backend

Once backend is deployed on Railway:

### 1. Set Vercel Environment Variable

```bash
vercel env add VITE_API_URL
```

When prompted:
- **Value**: `https://your-railway-app.up.railway.app` (your Railway URL)
- **Environments**: Select Production

### 2. Redeploy Frontend

```bash
vercel --prod
```

## Configuration Files

### Procfile
Tells Railway how to start the app:
```
web: uvicorn api:app --host 0.0.0.0 --port $PORT
```

### requirements.txt
Python dependencies for Railway to install

### api.py
Main FastAPI application with CORS configured for production

## Important: CORS Configuration

Before deploying, update CORS in `api.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-vercel-app.vercel.app",  # Your Vercel frontend URL
        "http://localhost:5173"  # Keep for local development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Testing the Deployment

### 1. Test Backend Health

```bash
curl https://your-railway-app.up.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "message": "All systems operational"
}
```

### 2. Test Full Stack

Visit your Vercel URL and try analyzing a consultation.

## Troubleshooting

### Backend Won't Start

**Check Railway logs:**
1. Go to Railway dashboard
2. Click **Deployments** → **View Logs**
3. Look for Python errors

**Common issues:**
- Missing `ANTHROPIC_API_KEY`
- Port configuration (Railway sets `$PORT` automatically)
- Missing dependencies in `requirements.txt`

### Frontend Can't Reach Backend

**Check CORS settings** in `api.py`:
- Ensure your Vercel URL is in `allow_origins`

**Check environment variable**:
```bash
vercel env ls
```

### MCP Servers Not Working

**Railway has no subprocess restrictions** unlike Vercel, so MCP servers should work fine.

**Check logs** for MCP connection errors:
- Server file paths are correct
- Python subprocess can be spawned

## Monitoring

### Railway Dashboard

- **Metrics**: View CPU, memory, network usage
- **Logs**: Real-time application logs
- **Deployments**: Deployment history and status

### Costs

Railway pricing:
- **Free Tier**: $5 credit/month, 500 hours execution
- **Pro Plan**: $20/month, includes more resources

## Architecture

```
┌─────────────────────────┐
│  Vercel (Frontend)      │
│  Static React App       │
│  Port: N/A (CDN)        │
└───────────┬─────────────┘
            │
            │ HTTPS
            ▼
┌─────────────────────────┐
│  Railway (Backend)      │
│  FastAPI + MCP Servers  │
│  Port: $PORT (dynamic)  │
│  - NICE Guidelines      │
│  - BNF Drug Info        │
│  - Patient Info         │
│  - Geolocation          │
└─────────────────────────┘
```

## Next Steps

1. Deploy backend to Railway
2. Get Railway URL
3. Update Vercel environment variable with Railway URL
4. Redeploy frontend
5. Test end-to-end functionality

## Support

- Railway Docs: [docs.railway.app](https://docs.railway.app)
- Railway Discord: [discord.gg/railway](https://discord.gg/railway)
