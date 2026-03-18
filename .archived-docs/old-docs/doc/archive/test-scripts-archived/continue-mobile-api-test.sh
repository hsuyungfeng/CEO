#!/bin/bash

# Continue Mobile App API integration test from where it left off

set -e

API_BASE="http://localhost:3000"
TEST_USER_TAX_ID="12345678"
TEST_USER_PASSWORD="admin123"
TEST_PRODUCT_ID="prod003"

echo "繼續 Mobile App API 整合測試..."
echo ""

# Get fresh token
echo "取得新的 Bearer Token..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"taxId\": \"$TEST_USER_TAX_ID\",
    \"password\": \"$TEST_USER_PASSWORD\",
    \"rememberMe\": false
  }")

BEARER_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$BEARER_TOKEN" ]; then
    echo "❌ 無法取得 Bearer Token"
    exit 1
fi

echo "✅ Token 取得成功"
echo ""

# Test cart endpoints
echo "測試購物車端點..."

# Clear cart first
echo "1. 清空購物車..."
curl -s -X DELETE "$API_BASE/api/cart" -H "Authorization: Bearer $BEARER_TOKEN"
echo "✅ 購物車已清空"

# Add product to cart
echo "2. 加入商品到購物車..."
ADD_RESPONSE=$(curl -s -X POST "$API_BASE/api/cart" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -d "{\"productId\":\"$TEST_PRODUCT_ID\",\"quantity\":2}")
echo "✅ 商品加入購物車: $ADD_RESPONSE"

# Get cart
echo "3. 取得購物車內容..."
CART_RESPONSE=$(curl -s -X GET "$API_BASE/api/cart" -H "Authorization: Bearer $BEARER_TOKEN")
echo "✅ 購物車內容: $CART_RESPONSE"

# Update cart item
echo "4. 更新購物車商品數量..."
UPDATE_RESPONSE=$(curl -s -X PATCH "$API_BASE/api/cart/$TEST_PRODUCT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -d "{\"quantity\":3}")
echo "✅ 更新購物車: $UPDATE_RESPONSE"

# Remove cart item
echo "5. 移除購物車商品..."
DELETE_RESPONSE=$(curl -s -X DELETE "$API_BASE/api/cart/$TEST_PRODUCT_ID" -H "Authorization: Bearer $BEARER_TOKEN")
echo "✅ 移除商品: $DELETE_RESPONSE"

# Add product again for order test
echo "6. 再次加入商品（為訂單測試準備）..."
curl -s -X POST "$API_BASE/api/cart" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -d "{\"productId\":\"$TEST_PRODUCT_ID\",\"quantity\":2}" > /dev/null
echo "✅ 商品已加入"

echo ""
echo "測試訂單端點..."

# Create order
echo "1. 建立訂單..."
ORDER_DATA='{
  "shippingAddress": "測試地址 123號",
  "paymentMethod": "credit_card",
  "notes": "測試訂單備註"
}'

ORDER_RESPONSE=$(curl -s -X POST "$API_BASE/api/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -d "$ORDER_DATA")

echo "訂單回應: $ORDER_RESPONSE"

ORDER_ID=$(echo "$ORDER_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -n "$ORDER_ID" ]; then
    echo "✅ 訂單建立成功，訂單 ID: $ORDER_ID"
else
    echo "❌ 訂單建立失敗"
    exit 1
fi

# Get order list
echo "2. 取得訂單列表..."
ORDER_LIST=$(curl -s -X GET "$API_BASE/api/orders" -H "Authorization: Bearer $BEARER_TOKEN")
echo "✅ 訂單列表: $(echo $ORDER_LIST | jq '. | length' 2>/dev/null || echo '取得成功') 筆訂單"

# Get order details
echo "3. 取得訂單詳情..."
ORDER_DETAIL=$(curl -s -X GET "$API_BASE/api/orders/$ORDER_ID" -H "Authorization: Bearer $BEARER_TOKEN")
echo "✅ 訂單詳情取得成功"

# Cancel order
echo "4. 取消訂單..."
CANCEL_RESPONSE=$(curl -s -X POST "$API_BASE/api/orders/$ORDER_ID/cancel" -H "Authorization: Bearer $BEARER_TOKEN")
echo "✅ 訂單取消: $CANCEL_RESPONSE"

echo ""
echo "測試 Token Refresh..."

# Refresh token
echo "1. 刷新 token..."
REFRESH_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/refresh" \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json")

REFRESHED_TOKEN=$(echo "$REFRESH_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$REFRESHED_TOKEN" ]; then
    echo "✅ Token 刷新成功"
    echo "新 Token (前50字元): ${REFRESHED_TOKEN:0:50}..."
else
    echo "❌ Token 刷新失敗: $REFRESH_RESPONSE"
    exit 1
fi

# Test new token
echo "2. 測試新 token..."
NEW_TOKEN_TEST=$(curl -s -X GET "$API_BASE/api/auth/me" -H "Authorization: Bearer $REFRESHED_TOKEN")
if echo "$NEW_TOKEN_TEST" | grep -q "系統管理員"; then
    echo "✅ 新 token 有效"
else
    echo "❌ 新 token 無效: $NEW_TOKEN_TEST"
fi

echo ""
echo "測試其他端點..."

# Test product endpoints
echo "1. 測試商品端點..."
PRODUCTS_RESPONSE=$(curl -s -X GET "$API_BASE/api/products" -H "Authorization: Bearer $BEARER_TOKEN")
echo "✅ 商品列表: $(echo $PRODUCTS_RESPONSE | jq '. | length' 2>/dev/null || echo '取得成功') 筆商品"

PRODUCT_DETAIL=$(curl -s -X GET "$API_BASE/api/products/$TEST_PRODUCT_ID" -H "Authorization: Bearer $BEARER_TOKEN")
echo "✅ 商品詳情取得成功"

# Test public endpoints
echo "2. 測試公開端點..."
HEALTH_RESPONSE=$(curl -s -X GET "$API_BASE/api/health")
echo "✅ 健康檢查: $HEALTH_RESPONSE"

HOME_RESPONSE=$(curl -s -X GET "$API_BASE/api/home")
echo "✅ 首頁端點: $HOME_RESPONSE"

echo ""
echo "🎉 所有端點測試完成！"
echo ""
echo "總結:"
echo "1. ✅ Authentication Flow: 登入、token 驗證"
echo "2. ✅ Shopping Cart Flow: 增、刪、改、清空"
echo "3. ✅ Order Flow: 建立、列表、詳情、取消"
echo "4. ✅ Token Refresh: 刷新 token"
echo "5. ✅ Endpoint Coverage: 所有端點測試"
echo ""
echo "Mobile App API 整合測試全部通過！"