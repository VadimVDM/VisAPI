#!/bin/bash
# validate-migration.sh - Validation script for Railway migration

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get Railway and Render URLs from environment or use defaults
RAILWAY_URL="${RAILWAY_URL:-https://visapi-production.up.railway.app}"
RENDER_URL="${RENDER_URL:-https://api.visanet.app}"

echo "========================================="
echo "Railway Migration Validation Script"
echo "========================================="
echo ""
echo "Railway URL: $RAILWAY_URL"
echo "Render URL:  $RENDER_URL"
echo ""

# Function to check endpoint
check_endpoint() {
    local name=$1
    local railway_endpoint=$2
    local render_endpoint=$3
    
    echo -n "Testing $name... "
    
    # Test Railway
    railway_status=$(curl -s -o /dev/null -w "%{http_code}" "$railway_endpoint")
    railway_time=$(curl -s -o /dev/null -w "%{time_total}" "$railway_endpoint")
    
    # Test Render
    render_status=$(curl -s -o /dev/null -w "%{http_code}" "$render_endpoint")
    render_time=$(curl -s -o /dev/null -w "%{time_total}" "$render_endpoint")
    
    if [ "$railway_status" == "$render_status" ] && [ "$railway_status" == "200" ]; then
        echo -e "${GREEN}✓${NC} (Railway: ${railway_time}s, Render: ${render_time}s)"
    else
        echo -e "${RED}✗${NC} (Railway: $railway_status, Render: $render_status)"
    fi
}

# 1. Health Check
echo "1. Health Check Validation"
echo "--------------------------"
check_endpoint "Health endpoint" "$RAILWAY_URL/api/v1/healthz" "$RENDER_URL/api/v1/healthz"

# Get detailed health status
echo ""
echo "Railway Health Details:"
curl -s "$RAILWAY_URL/api/v1/healthz" | jq '.' 2>/dev/null || echo "Failed to get details"

echo ""
echo "Render Health Details:"
curl -s "$RENDER_URL/api/v1/healthz" | jq '.' 2>/dev/null || echo "Failed to get details"

# 2. Metrics Check
echo ""
echo "2. Metrics Validation"
echo "---------------------"
railway_metrics=$(curl -s "$RAILWAY_URL/api/v1/metrics" | grep -c "visapi_" 2>/dev/null || echo "0")
render_metrics=$(curl -s "$RENDER_URL/api/v1/metrics" | grep -c "visapi_" 2>/dev/null || echo "0")

echo "Railway metrics count: $railway_metrics"
echo "Render metrics count:  $render_metrics"

if [ "$railway_metrics" -gt 0 ] && [ "$render_metrics" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Both services exposing metrics"
else
    echo -e "${RED}✗${NC} Metrics issue detected"
fi

# 3. Response Time Comparison
echo ""
echo "3. Response Time Comparison"
echo "---------------------------"
echo "Testing 5 requests to each service..."

railway_total=0
render_total=0

for i in {1..5}; do
    railway_time=$(curl -s -o /dev/null -w "%{time_total}" "$RAILWAY_URL/api/v1/healthz")
    render_time=$(curl -s -o /dev/null -w "%{time_total}" "$RENDER_URL/api/v1/healthz")
    
    railway_total=$(echo "$railway_total + $railway_time" | bc)
    render_total=$(echo "$render_total + $render_time" | bc)
    
    echo "Request $i - Railway: ${railway_time}s, Render: ${render_time}s"
done

railway_avg=$(echo "scale=3; $railway_total / 5" | bc)
render_avg=$(echo "scale=3; $render_total / 5" | bc)

echo ""
echo "Average response times:"
echo "Railway: ${railway_avg}s"
echo "Render:  ${render_avg}s"

# 4. Version Check
echo ""
echo "4. Version Information"
echo "----------------------"
railway_version=$(curl -s "$RAILWAY_URL/api/v1/version" 2>/dev/null)
render_version=$(curl -s "$RENDER_URL/api/v1/version" 2>/dev/null)

echo "Railway version:"
echo "$railway_version" | jq '.' 2>/dev/null || echo "$railway_version"

echo ""
echo "Render version:"
echo "$render_version" | jq '.' 2>/dev/null || echo "$render_version"

# 5. API Key Test (if API key is provided)
if [ ! -z "$TEST_API_KEY" ]; then
    echo ""
    echo "5. API Key Validation"
    echo "---------------------"
    
    railway_auth=$(curl -s -o /dev/null -w "%{http_code}" -H "X-API-Key: $TEST_API_KEY" "$RAILWAY_URL/api/v1/workflows")
    render_auth=$(curl -s -o /dev/null -w "%{http_code}" -H "X-API-Key: $TEST_API_KEY" "$RENDER_URL/api/v1/workflows")
    
    echo "Railway auth status: $railway_auth"
    echo "Render auth status:  $render_auth"
    
    if [ "$railway_auth" == "$render_auth" ] && [ "$railway_auth" == "200" ]; then
        echo -e "${GREEN}✓${NC} API key works on both services"
    else
        echo -e "${YELLOW}⚠${NC} API key validation differs between services"
    fi
fi

# Summary
echo ""
echo "========================================="
echo "Validation Summary"
echo "========================================="

# Check if Railway is ready for migration
ready_for_migration=true

if [ "$railway_status" != "200" ]; then
    echo -e "${RED}✗${NC} Railway health check failed"
    ready_for_migration=false
else
    echo -e "${GREEN}✓${NC} Railway health check passed"
fi

if [ "$railway_metrics" -eq 0 ]; then
    echo -e "${RED}✗${NC} Railway metrics not available"
    ready_for_migration=false
else
    echo -e "${GREEN}✓${NC} Railway metrics available"
fi

# Compare response times (Railway should be within 2x of Render)
if (( $(echo "$railway_avg > $render_avg * 2" | bc -l) )); then
    echo -e "${YELLOW}⚠${NC} Railway response time significantly slower"
else
    echo -e "${GREEN}✓${NC} Railway response time acceptable"
fi

echo ""
if [ "$ready_for_migration" = true ]; then
    echo -e "${GREEN}✅ Railway deployment is ready for migration${NC}"
else
    echo -e "${RED}❌ Railway deployment needs attention before migration${NC}"
fi