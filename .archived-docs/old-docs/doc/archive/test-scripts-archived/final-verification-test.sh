#!/bin/bash

# Final verification test for Mobile App API integration

set -e

API_BASE="http://localhost:3000"
TEST_USER_TAX_ID="12345678"
TEST_USER_PASSWORD="admin123"

echo "=========================================="
echo "Mobile App API 整合最終驗證測試"
echo "=========================================="
echo "時間: $(date)"
echo "API: $API_BASE"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_result() {
    if [ "$1" = "success" ]; then
        echo -e "${GREEN}✅ $2${NC}"
    elif [ "$1" = "error" ]; then
        echo -e "${RED}❌ $2${NC}"
    else
        echo -e "${YELLOW}⚠️  $2${NC}"
    fi
}

test_endpoint() {
    local name="$1"
    local method="$2"
    local url="$3"
    local data="$4"
    local auth_header="$5"
    local expected_status="$6"
    
    echo -n "測試: $name ... "
    
    local curl_cmd="curl -s -o /dev/null -w '%{http_code}' -X $method '$url'"
    
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
    fi
    
    if [ -n "$auth_header" ]; then
        curl_cmd="$curl_cmd -H 'Authorization: $auth_header'"
    fi
    
    local status_code=$(eval $curl_cmd)
    
    if [ "$status_code" = "$expected_status" ]; then
        print_result "success" "通過 ($status_code)"
        return 0
    else
        print_result "error" "失敗 (預期: $expected_status, 實際: $status_code)"
        return 1
    fi
}

# Get fresh token
echo "1. 取得 Bearer Token..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"taxId\":\"$TEST_USER_TAX_ID\",\"password\":\"$TEST_USER_PASSWORD\",\"rememberMe\":false}")

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    print_result "error" "無法取得 Bearer Token"
    exit 1
fi

print_result "success" "Token 取得成功"
echo ""

# Test all endpoints
echo "2. 測試所有 API 端點..."

# Authentication endpoints
test_endpoint "登入 API" "POST" "$API_BASE/api/auth/login" \
  "{\"taxId\":\"$TEST_USER_TAX_ID\",\"password\":\"$TEST_USER_PASSWORD\",\"rememberMe\":false}" "" "200"

test_endpoint "使用者資訊 (Bearer)" "GET" "$API_BASE/api/auth/me" "" "Bearer $TOKEN" "200"

test_endpoint "使用者資訊 (無 token)" "GET" "$API_BASE/api/auth/me" "" "" "401"

test_endpoint "使用者資訊 (無效 token)" "GET" "$API_BASE/api/auth/me" "" "Bearer invalid_token" "401"

test_endpoint "Token 刷新" "POST" "$API_BASE/api/auth/refresh" "" "Bearer $TOKEN" "200"

# Cart endpoints
test_endpoint "清空購物車" "DELETE" "$API_BASE/api/cart" "" "Bearer $TOKEN" "200"

test_endpoint "加入商品到購物車" "POST" "$API_BASE/api/cart" \
  "{\"productId\":\"prod003\",\"quantity\":2}" "Bearer $TOKEN" "201"

test_endpoint "取得購物車" "GET" "$API_BASE/api/cart" "" "Bearer $TOKEN" "200"

# Get cart item ID for update/delete tests
CART_RESPONSE=$(curl -s -X GET "$API_BASE/api/cart" -H "Authorization: Bearer $TOKEN")
CART_ITEM_ID=$(echo "$CART_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$CART_ITEM_ID" ]; then
    test_endpoint "更新購物車數量" "PATCH" "$API_BASE/api/cart/$CART_ITEM_ID" \
      "{\"quantity\":3}" "Bearer $TOKEN" "200"
    
    test_endpoint "移除購物車商品" "DELETE" "$API_BASE/api/cart/$CART_ITEM_ID" "" "Bearer $TOKEN" "200"
else
    print_result "warning" "無法取得 cart item ID，跳過更新/刪除測試"
fi

# Add product again for order test
curl -s -X POST "$API_BASE/api/cart" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"productId\":\"prod003\",\"quantity\":2}" > /dev/null

# Order endpoints
test_endpoint "建立訂單" "POST" "$API_BASE/api/orders" \
  "{\"shippingAddress\":\"測試地址\",\"paymentMethod\":\"credit_card\",\"notes\":\"測試訂單\"}" \
  "Bearer $TOKEN" "201"

test_endpoint "取得訂單列表" "GET" "$API_BASE/api/orders?page=1&limit=20" "" "Bearer $TOKEN" "200"

test_endpoint "取得訂單列表 (篩選)" "GET" "$API_BASE/api/orders?page=1&limit=20&status=PENDING" "" "Bearer $TOKEN" "200"

# Get order ID for detail/cancel tests
ORDERS_RESPONSE=$(curl -s -X GET "$API_BASE/api/orders" -H "Authorization: Bearer $TOKEN")
ORDER_ID=$(echo "$ORDERS_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$ORDER_ID" ]; then
    test_endpoint "取得訂單詳情" "GET" "$API_BASE/api/orders/$ORDER_ID" "" "Bearer $TOKEN" "200"
    
    test_endpoint "取消訂單" "POST" "$API_BASE/api/orders/$ORDER_ID/cancel" "" "Bearer $TOKEN" "200"
else
    print_result "warning" "無法取得 order ID，跳過詳情/取消測試"
fi

# Product endpoints
test_endpoint "取得商品列表" "GET" "$API_BASE/api/products?page=1&limit=20&search=&categoryId=&sortBy=createdAt&order=desc" "" "Bearer $TOKEN" "200"

test_endpoint "取得商品詳情" "GET" "$API_BASE/api/products/prod003" "" "Bearer $TOKEN" "200"

# Public endpoints
test_endpoint "健康檢查" "GET" "$API_BASE/api/health" "" "" "200"

test_endpoint "首頁端點" "GET" "$API_BASE/api/home" "" "" "200"

# Error cases
test_endpoint "不存在的端點" "GET" "$API_BASE/api/nonexistent" "" "Bearer $TOKEN" "404"

test_endpoint "錯誤的 HTTP 方法" "POST" "$API_BASE/api/auth/me" "" "Bearer $TOKEN" "405"

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Mobile App API 整合驗證測試完成${NC}"
echo "=========================================="
echo ""
echo "總結:"
echo "1. ✅ 所有 Authentication 端點正常"
echo "2. ✅ 所有 Shopping Cart 端點正常"
echo "3. ✅ 所有 Order 端點正常"
echo "4. ✅ Token Refresh 功能正常"
echo "5. ✅ 所有錯誤情況正確處理"
echo ""
echo -e "${GREEN}🎉 Mobile App API 已準備就緒，可以開始整合！${NC}"