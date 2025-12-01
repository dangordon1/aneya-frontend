#!/bin/bash
# Deployment Verification Script for Aneya
# This script verifies that frontend and backend are properly configured and connected

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=================================================="
echo "  Aneya Deployment Verification"
echo "=================================================="
echo ""

# Configuration
FRONTEND_URL="${FRONTEND_URL:-https://aneya.vercel.app}"
BACKEND_URL="${BACKEND_URL:-https://aneya-backend-fhnsxp4nua-nw.a.run.app}"

echo "Frontend URL: $FRONTEND_URL"
echo "Backend URL: $BACKEND_URL"
echo ""

# Track overall status
ISSUES_FOUND=0

# Function to print success
success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to print error
error() {
    echo -e "${RED}✗${NC} $1"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
}

# Function to print warning
warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

echo "=================================================="
echo "1. Environment Variable Validation"
echo "=================================================="

# Pull and check production environment variables
echo "Pulling production environment variables..."
vercel env pull /tmp/verify-env.env --environment=production > /dev/null 2>&1

if grep -q 'VITE_API_URL' /tmp/verify-env.env; then
    API_URL_VALUE=$(grep 'VITE_API_URL' /tmp/verify-env.env | cut -d '=' -f2- | tr -d '"' | tr -d '\n' | tr -d '\r')

    # Check for literal \n or embedded newlines WITHIN the value
    if echo "$API_URL_VALUE" | grep -q '\\n'; then
        error "VITE_API_URL contains literal \\n character: $API_URL_VALUE"
    elif [ $(echo -n "$API_URL_VALUE" | wc -l) -gt 0 ]; then
        error "VITE_API_URL contains embedded newline character"
    else
        success "VITE_API_URL is clean (no newlines)"
    fi

    # Check URL format
    if [[ $API_URL_VALUE =~ ^https?:// ]]; then
        success "VITE_API_URL has valid URL format: $API_URL_VALUE"
    else
        error "VITE_API_URL has invalid format: $API_URL_VALUE"
    fi

    # Check if it matches expected backend URL
    if [[ "$API_URL_VALUE" == "$BACKEND_URL" ]]; then
        success "VITE_API_URL matches expected backend URL"
    else
        warning "VITE_API_URL ($API_URL_VALUE) differs from expected ($BACKEND_URL)"
    fi
else
    error "VITE_API_URL not found in production environment"
fi

echo ""
echo "=================================================="
echo "2. Backend Health Check"
echo "=================================================="

# Test backend health endpoint
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/api/health" || echo "000")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n 1)
BODY=$(echo "$HEALTH_RESPONSE" | head -n -1 2>/dev/null || echo "$HEALTH_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    success "Backend health endpoint responding (HTTP $HTTP_CODE)"

    # Check response body
    if echo "$BODY" | grep -q '"status":"healthy"'; then
        success "Backend reports healthy status"
    else
        error "Backend health response unexpected: $BODY"
    fi
else
    error "Backend health check failed (HTTP $HTTP_CODE)"
fi

echo ""
echo "=================================================="
echo "3. CORS Configuration"
echo "=================================================="

# Test CORS for production frontend
CORS_RESPONSE=$(curl -s -I -X OPTIONS "$BACKEND_URL/api/health" \
    -H "Origin: $FRONTEND_URL" \
    -H "Access-Control-Request-Method: GET" 2>&1)

if echo "$CORS_RESPONSE" | grep -q "access-control-allow-origin: $FRONTEND_URL"; then
    success "CORS allows frontend origin: $FRONTEND_URL"
elif echo "$CORS_RESPONSE" | grep -q "access-control-allow-origin: \*"; then
    warning "CORS allows all origins (*) - consider restricting"
else
    error "CORS does not allow frontend origin: $FRONTEND_URL"
    echo "CORS Response:"
    echo "$CORS_RESPONSE" | grep -i "access-control"
fi

if echo "$CORS_RESPONSE" | grep -q "access-control-allow-credentials: true"; then
    success "CORS credentials enabled"
else
    warning "CORS credentials not enabled"
fi

echo ""
echo "=================================================="
echo "4. Frontend Accessibility"
echo "=================================================="

# Test frontend URL
FRONTEND_RESPONSE=$(curl -s -w "\n%{http_code}" "$FRONTEND_URL" || echo "000")
FRONTEND_HTTP_CODE=$(echo "$FRONTEND_RESPONSE" | tail -n 1)

if [ "$FRONTEND_HTTP_CODE" = "200" ]; then
    success "Frontend is accessible (HTTP $FRONTEND_HTTP_CODE)"
else
    error "Frontend not accessible (HTTP $FRONTEND_HTTP_CODE)"
fi

echo ""
echo "=================================================="
echo "5. API Endpoint Tests"
echo "=================================================="

# Test /api/examples endpoint
EXAMPLES_RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/api/examples" || echo "000")
EXAMPLES_HTTP_CODE=$(echo "$EXAMPLES_RESPONSE" | tail -n 1)

if [ "$EXAMPLES_HTTP_CODE" = "200" ]; then
    success "/api/examples endpoint working"
else
    error "/api/examples endpoint failed (HTTP $EXAMPLES_HTTP_CODE)"
fi

echo ""
echo "=================================================="
echo "SUMMARY"
echo "=================================================="

if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}All checks passed! ✓${NC}"
    echo ""
    echo "Deployment is healthy and ready for use."
    exit 0
else
    echo -e "${RED}Found $ISSUES_FOUND issue(s) ✗${NC}"
    echo ""
    echo "Please review and fix the issues above before deploying."
    exit 1
fi
