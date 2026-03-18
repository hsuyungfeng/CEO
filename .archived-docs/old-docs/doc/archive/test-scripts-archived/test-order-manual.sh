#!/bin/bash

# 手動測試訂單流程

API_BASE="http://localhost:3000"
TEST_USER_TAX_ID="12345678"
TEST_USER_PASSWORD="admin123"
TEST_PRODUCT_ID="prod003"

echo "=== 手動測試訂單流程 ==="
echo ""

# 1. 登入
echo "1. 登入..."
LOGIN_RESPONSE=$(curl -s -c cookies.txt -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"taxId\":\"$TEST_USER_TAX_ID\",\"password\":\"$TEST_USER_PASSWORD\",\"rememberMe\":false}")
echo "$LOGIN_RESPONSE"
echo ""

# 2. 測試使用者資料端點 (Bearer Token)
echo "2. 測試使用者資料端點 (Bearer Token)..."
echo "使用有效的 Bearer Token:"
# 先取得一個有效的 token（如果有的話）
curl -s -X GET "$API_BASE/api/user/profile" \
  -H "Authorization: Bearer $(cat cookies.txt | grep 'next-auth.session-token' | cut -f7)"
echo ""
echo "使用無效的 Bearer Token:"
curl -s -X GET "$API_BASE/api/user/profile" \
  -H "Authorization: Bearer invalid-token-123"
echo ""
echo ""

# 3. 測試訂單端點 (session cookie)
echo "3. 測試訂單端點 (session cookie)..."
echo "取得訂單列表:"
curl -s -b cookies.txt -X GET "$API_BASE/api/orders?page=1&limit=10"
echo ""
echo ""

# 4. 測試建立訂單
echo "4. 測試建立訂單..."
echo "先檢查購物車:"
curl -s -b cookies.txt -X GET "$API_BASE/api/cart"
echo ""
echo "建立訂單:"
curl -s -b cookies.txt -X POST "$API_BASE/api/orders" \
  -H "Content-Type: application/json" \
  -d "{\"note\":\"測試訂單\"}"
echo ""
echo ""

# 5. 測試訂單端點 (Bearer Token)
echo "5. 測試訂單端點是否支援 Bearer Token..."
echo "使用 session token 作為 Bearer Token:"
SESSION_TOKEN=$(cat cookies.txt | grep 'next-auth.session-token' | cut -f7)
if [ -n "$SESSION_TOKEN" ]; then
    echo "Session Token: $SESSION_TOKEN"
    curl -s -X GET "$API_BASE/api/orders?page=1&limit=10" \
      -H "Authorization: Bearer $SESSION_TOKEN"
else
    echo "無法取得 session token"
fi
echo ""

# 清理
rm -f cookies.txt
echo "測試完成"