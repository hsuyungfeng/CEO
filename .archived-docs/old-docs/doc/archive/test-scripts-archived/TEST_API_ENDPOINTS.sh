#!/bin/bash
# Phase 5 API Endpoint Testing Script
# 驗證所有核心 API 端點的快速測試

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
ADMIN_TAX_ID="12345678"
ADMIN_PASSWORD="Admin1234!"

echo "🚀 Phase 5 API 快速驗證 (Quick Verification)"
echo "=================================================="
echo "Base URL: $BASE_URL"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper function
test_endpoint() {
  local method=$1
  local endpoint=$2
  local data=$3
  local expected_status=$4
  local description=$5

  echo -n "[$method] $endpoint ... "

  if [ -z "$data" ]; then
    response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint")
  else
    response=$(curl -s -w "\n%{http_code}" -X $method \
      -H "Content-Type: application/json" \
      -d "$data" \
      "$BASE_URL$endpoint")
  fi

  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | head -n -1)

  if [[ "$http_code" == "$expected_status"* ]]; then
    echo -e "${GREEN}✓ $http_code${NC} - $description"
    return 0
  else
    echo -e "${RED}✗ $http_code${NC} (expected $expected_status) - $description"
    echo "Response: $body"
    return 1
  fi
}

# 1. Health Check
echo "📊 1. Health Check"
echo "---"
test_endpoint "GET" "/api/health" "" "200" "Server healthy"
echo ""

# 2. Public Products API
echo "📦 2. Public Products API"
echo "---"
test_endpoint "GET" "/api/products" "" "200" "Product list"
test_endpoint "GET" "/api/products?limit=5" "" "200" "Product list with pagination"
echo ""

# 3. Categories API
echo "🏷️  3. Categories API"
echo "---"
test_endpoint "GET" "/api/categories" "" "200" "Category list"
echo ""

# 4. Home API
echo "🏠 4. Home API"
echo "---"
test_endpoint "GET" "/api/home" "" "200" "Home featured products"
echo ""

echo ""
echo "=================================================="
echo "✅ Quick verification complete!"
echo ""
echo "📝 Next steps:"
echo "1. Start the dev server:   npm run dev"
echo "2. Run this script again:  bash TEST_API_ENDPOINTS.sh"
echo "3. Check detailed test plan: PHASE_5_TESTING_PLAN.md"
echo ""
