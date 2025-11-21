#!/bin/bash
set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         Deploy ScrapeOps Test to Google Cloud Run             ║"
echo "╚════════════════════════════════════════════════════════════════╝"

# Check required variables
if [ -z "$GCP_PROJECT_ID" ]; then
    echo "❌ Error: GCP_PROJECT_ID not set"
    echo "   Run: export GCP_PROJECT_ID=your-project-id"
    exit 1
fi

if [ -z "$SCRAPEOPS_API_KEY" ]; then
    echo "⚠️  Warning: SCRAPEOPS_API_KEY not set, using default from script"
fi

# Configuration
SERVICE_NAME="aneya-scrapeops-test"
REGION="europe-west2"
IMAGE_NAME="gcr.io/${GCP_PROJECT_ID}/${SERVICE_NAME}"

echo ""
echo "Configuration:"
echo "  Project: $GCP_PROJECT_ID"
echo "  Service: $SERVICE_NAME"
echo "  Region: $REGION"
echo "  Image: $IMAGE_NAME"
echo ""

# Build Docker image
echo "📦 Building Docker image..."
docker build --platform linux/amd64 -f Dockerfile.test -t $IMAGE_NAME .

# Push to Google Container Registry
echo ""
echo "🚀 Pushing image to GCR..."
docker push $IMAGE_NAME

# Deploy to Cloud Run
echo ""
echo "☁️  Deploying to Cloud Run..."

if [ -n "$SCRAPEOPS_API_KEY" ]; then
    gcloud run deploy $SERVICE_NAME \
        --image $IMAGE_NAME \
        --platform managed \
        --region $REGION \
        --allow-unauthenticated \
        --memory 1Gi \
        --cpu 1 \
        --timeout 300s \
        --set-env-vars "SCRAPEOPS_API_KEY=$SCRAPEOPS_API_KEY" \
        --project $GCP_PROJECT_ID
else
    gcloud run deploy $SERVICE_NAME \
        --image $IMAGE_NAME \
        --platform managed \
        --region $REGION \
        --allow-unauthenticated \
        --memory 1Gi \
        --cpu 1 \
        --timeout 300s \
        --project $GCP_PROJECT_ID
fi

# Get service URL
echo ""
echo "✅ Deployment complete!"
echo ""
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)' --project $GCP_PROJECT_ID)

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    🎯 TEST ENDPOINTS                           ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║                                                                ║"
echo "║  Service URL: $SERVICE_URL"
echo "║                                                                ║"
echo "║  Test Endpoints:                                              ║"
echo "║    GET $SERVICE_URL/health"
echo "║    GET $SERVICE_URL/test-scrapeops-google"
echo "║    GET $SERVICE_URL/test-scrapeops-bnf"
echo "║    GET $SERVICE_URL/test-bnf-direct"
echo "║    GET $SERVICE_URL/test-all"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Run all tests:"
echo "  curl -s $SERVICE_URL/test-all | python -m json.tool"
echo ""
