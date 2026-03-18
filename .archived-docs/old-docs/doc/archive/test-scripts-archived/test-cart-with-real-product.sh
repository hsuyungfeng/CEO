#!/bin/bash

# 測試購物車功能使用真實商品

set -e

BASE_URL="http://localhost:3000"
TEST_USER_TAX_ID="12345678"
TEST_USER_PASSWORD="admin123"

echo "=== 測試購物車功能使用真實商品 ==="

# 1. 登入取得 Session Token
echo "步驟 1: 登入..."
LOGIN_RESPONSE=$(curl -s -i -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"taxId\":\"$TEST_USER_TAX_ID\",\"password\":\"$TEST_USER_PASSWORD\"}")

SESSION_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -i 'authjs.session-token' | sed 's/.*authjs.session-token=//' | sed 's/;.*//')

if [ -z "$SESSION_TOKEN" ]; then
    echo "錯誤: 無法取得 Session Token"
    exit 1
fi

echo "✓ 登入成功"

# 2. 取得商品列表
echo -e "\n步驟 2: 取得商品列表..."
PRODUCTS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/products?page=1&limit=10&sortBy=createdAt&order=desc" \
  -H "Content-Type: application/json" \
  -H "Cookie: authjs.session-token=$SESSION_TOKEN")

echo "商品列表回應:"
echo "$PRODUCTS_RESPONSE" | jq '.' 2>/dev/null || echo "$PRODUCTS_RESPONSE"

# 嘗試解析商品ID
PRODUCT_ID=$(echo "$PRODUCTS_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$PRODUCT_ID" ]; then
    echo -e "\n✓ 找到商品ID: $PRODUCT_ID"
    
    # 3. 測試加入購物車
    echo -e "\n步驟 3: 測試加入購物車..."
    ADD_RESPONSE=$(curl -s -i -X POST "$BASE_URL/api/cart" \
      -H "Content-Type: application/json" \
      -H "Cookie: authjs.session-token=$SESSION_TOKEN" \
      -d "{\"productId\":\"$PRODUCT_ID\",\"quantity\":1}")
    
    echo "加入購物車回應:"
    echo "$ADD_RESPONSE"
    
    # 4. 取得購物車內容
    echo -e "\n步驟 4: 取得購物車內容..."
    CART_RESPONSE=$(curl -s -X GET "$BASE_URL/api/cart" \
      -H "Content-Type: application/json" \
      -H "Cookie: authjs.session-token=$SESSION_TOKEN")
    
    echo "購物車內容:"
    echo "$CART_RESPONSE" | jq '.' 2>/dev/null || echo "$CART_RESPONSE"
    
    # 5. 測試 Bearer Token
    echo -e "\n步驟 5: 測試 Bearer Token 支援..."
    BEARER_RESPONSE=$(curl -s -i -X GET "$BASE_URL/api/cart" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $SESSION_TOKEN")
    
    echo "Bearer Token 回應:"
    echo "$BEARER_RESPONSE"
    
else
    echo -e "\n⚠ 無法取得商品ID，檢查資料庫是否有商品"
    
    # 檢查資料庫狀態
    echo -e "\n檢查資料庫狀態..."
    DB_CHECK=$(curl -s -X GET "$BASE_URL/api/products?page=1&limit=1" \
      -H "Content-Type: application/json" \
      -H "Cookie: authjs.session-token=$SESSION_TOKEN")
    
    echo "資料庫檢查:"
    echo "$DB_CHECK"
fi

echo -e "\n=== 測試完成 ==="