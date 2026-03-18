#!/bin/bash

# 簡單測試訂單流程

API_BASE="http://localhost:3000"
TEST_USER_TAX_ID="12345678"
TEST_USER_PASSWORD="admin123"
TEST_PRODUCT_ID="prod003"

echo "=== CEO團購電商平台 - 訂單流程測試 ==="
echo "API 基礎網址: $API_BASE"
echo "測試使用者: $TEST_USER_TAX_ID"
echo "測試商品: $TEST_PRODUCT_ID"
echo ""

# 1. 登入取得 session cookie
echo "1. 登入取得 session cookie..."
curl -s -c cookies.txt -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"taxId\":\"$TEST_USER_TAX_ID\",\"password\":\"$TEST_USER_PASSWORD\",\"rememberMe\":false}"
echo ""
echo "登入完成，session cookie 已儲存"
echo ""

# 2. 清空購物車
echo "2. 清空購物車..."
curl -s -b cookies.txt -X DELETE "$API_BASE/api/cart"
echo ""
echo "購物車已清空"
echo ""

# 3. 加入商品到購物車
echo "3. 加入商品到購物車..."
curl -s -b cookies.txt -X POST "$API_BASE/api/cart" \
  -H "Content-Type: application/json" \
  -d "{\"productId\":\"$TEST_PRODUCT_ID\",\"quantity\":2}"
echo ""
echo "商品已加入購物車"
echo ""

# 4. 查看購物車
echo "4. 查看購物車內容..."
curl -s -b cookies.txt -X GET "$API_BASE/api/cart" | jq '.items | length'
echo "個商品在購物車中"
echo ""

# 5. 測試訂單端點 - 取得訂單列表
echo "5. 測試取得訂單列表..."
curl -s -b cookies.txt -X GET "$API_BASE/api/orders"
echo ""
echo ""

# 6. 測試建立訂單
echo "6. 測試建立訂單..."
ORDER_RESPONSE=$(curl -s -b cookies.txt -X POST "$API_BASE/api/orders" \
  -H "Content-Type: application/json" \
  -d "{\"note\":\"測試訂單，請勿出貨\"}")

echo "$ORDER_RESPONSE"
echo ""

# 提取訂單 ID
ORDER_ID=$(echo "$ORDER_RESPONSE" | jq -r '.order.id // empty')
if [ -n "$ORDER_ID" ] && [ "$ORDER_ID" != "null" ]; then
    echo "訂單建立成功，ID: $ORDER_ID"
    echo ""
    
    # 7. 測試取得訂單詳情
    echo "7. 測試取得訂單詳情..."
    curl -s -b cookies.txt -X GET "$API_BASE/api/orders/$ORDER_ID"
    echo ""
    echo ""
    
    # 8. 測試取消訂單
    echo "8. 測試取消訂單..."
    curl -s -b cookies.txt -X PATCH "$API_BASE/api/orders/$ORDER_ID"
    echo ""
    echo ""
else
    echo "建立訂單失敗或購物車為空"
    echo "$ORDER_RESPONSE"
fi

# 9. 測試 Bearer Token 支援
echo "9. 測試訂單端點是否支援 Bearer Token..."
echo "使用 Bearer Token 取得訂單列表:"
curl -s -X GET "$API_BASE/api/orders" \
  -H "Authorization: Bearer test-token-123"
echo ""
echo ""

echo "10. 測試使用者資料端點 (Bearer Token)..."
echo "使用 Bearer Token 取得使用者資料:"
curl -s -X GET "$API_BASE/api/user/profile" \
  -H "Authorization: Bearer test-token-123"
echo ""

# 清理
rm -f cookies.txt
echo "測試完成"