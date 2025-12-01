# Quick Deployment Reference

## Frontend Deployment (Vercel)

### Update Environment Variable (if backend URL changed)
```bash
cd /Users/dgordon/python/hackathons/aneya

# Remove old variable
vercel env rm VITE_API_URL production --yes

# Add new variable (use printf to avoid newlines!)
printf "https://aneya-backend-fhnsxp4nua-nw.a.run.app" | \
  vercel env add VITE_API_URL production
```

### Deploy
```bash
cd /Users/dgordon/python/hackathons/aneya
vercel --prod --yes
```

### Verify
```bash
./scripts/verify-deployment.sh
```

---

## Backend Deployment (Cloud Run)

### Deploy
```bash
cd /Users/dgordon/python/hackathons/aneya-backend
export GCP_PROJECT_ID=your-project-id
export ANTHROPIC_API_KEY=sk-ant-xxxxx
./deploy-cloudrun.sh
```

### Get New URL
```bash
gcloud run services describe aneya-backend \
  --region=europe-west2 \
  --format='value(status.url)'
```

### Update Frontend
If backend URL changed, update frontend environment variable (see above).

---

## Quick Checks

### Backend Health
```bash
curl https://aneya-backend-fhnsxp4nua-nw.a.run.app/api/health
```

### CORS Test
```bash
curl -I -X OPTIONS https://BACKEND_URL/api/health \
  -H "Origin: https://aneya.vercel.app"
```

### Environment Variable
```bash
vercel env pull /tmp/check.env --environment=production
grep VITE_API_URL /tmp/check.env
```

---

## Emergency Rollback

```bash
cd /Users/dgordon/python/hackathons/aneya
vercel rollback
```

---

## Common Issues

### Issue: "Unable to connect to backend"
**Fix:**
```bash
# Check and fix environment variable
vercel env rm VITE_API_URL production --yes
printf "CORRECT_URL" | vercel env add VITE_API_URL production
vercel --prod --yes
```

### Issue: CORS errors
**Fix:** Update `api.py` CORS settings and redeploy backend

### Issue: Backend unhealthy
**Fix:** Check Cloud Run logs:
```bash
gcloud run services logs read aneya-backend --region=europe-west2 --limit=50
```

---

## URLs

- **Production Frontend**: https://aneya.vercel.app
- **Production Backend**: https://aneya-backend-fhnsxp4nua-nw.a.run.app
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Google Cloud Console**: https://console.cloud.google.com/run

---

## Full Documentation

- **Comprehensive Guide**: `DEPLOYMENT_GUIDE.md`
- **Incident Report**: `INCIDENT_REPORT_2025-11-29.md`
- **Verification Script**: `scripts/verify-deployment.sh`
