#!/bin/bash

API_BASE="http://localhost:3000"
TEST_USER_TAX_ID="12345678"
TEST_USER_PASSWORD="admin123"

echo "測試使用 Session Token 作為 Bearer Token"
echo "=========================================="
echo ""

# 1. 登入獲取 session token
echo "1. 登入獲取 session token..."
LOGIN_RESPONSE=$(curl -s -i -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"taxId\": \"$TEST_USER_TAX_ID\",
    \"password\": \"$TEST_USER_PASSWORD\",
    \"rememberMe\": false
  }")

# 提取 session token
SESSION_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -i 'authjs.session-token' | sed 's/.*authjs.session-token=//' | sed 's/;.*//')

if [ -n "$SESSION_TOKEN" ]; then
  echo "   ✅ 取得 session token: ${SESSION_TOKEN:0:50}..."
else
  echo "   ❌ 無法取得 session token"
  exit 1
fi

echo ""

# 2. 測試使用 session token 作為 Bearer Token
echo "2. 測試使用 session token 作為 Bearer Token..."
BEARER_RESPONSE=$(curl -s -X GET "$API_BASE/api/user/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SESSION_TOKEN")

echo "$BEARER_RESPONSE" | jq . 2>/dev/null || echo "$BEARER_RESPONSE"

if echo "$BEARER_RESPONSE" | grep -q "未授權"; then
  echo "   ❌ Session token 不能作為 Bearer Token"
else
  echo "   ✅ Session token 可以作為 Bearer Token!"
fi

echo ""

# 3. 測試其他端點
echo "3. 測試其他端點使用 Bearer Token..."
echo "a) 測試 /api/auth/me:"
ME_RESPONSE=$(curl -s -X GET "$API_BASE/api/auth/me" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SESSION_TOKEN")

echo "$ME_RESPONSE" | jq . 2>/dev/null || echo "$ME_RESPONSE"

echo ""
echo "b) 測試 /api/admin/dashboard:"
ADMIN_RESPONSE=$(curl -s -X GET "$API_BASE/api/admin/dashboard" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SESSION_TOKEN")

echo "$ADMIN_RESPONSE" | jq . 2>/dev/null || echo "$ADMIN_RESPONSE"

echo ""
echo "c) 測試 /api/cart:"
CART_RESPONSE=$(curl -s -X GET "$API_BASE/api/cart" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SESSION_TOKEN")

echo "$CART_RESPONSE" | jq . 2>/dev/null || echo "$CART_RESPONSE"

echo ""
echo "=========================================="
echo "測試結果:"
echo ""
echo "Session Token: $SESSION_TOKEN"
echo ""
echo "重要發現:"
echo "1. NextAuth 產生加密的 session token"
echo "2. 此 token 儲存在 cookie 中"
echo "3. /api/user/profile 端點嘗試支援 Bearer Token"
echo "4. 但 session token 可能無法直接作為 Bearer Token 使用"
echo ""
echo "問題分析:"
echo "1. Session token 是加密的，需要解密驗證"
echo "2. getToken() 函數需要 NEXTAUTH_SECRET 來解密"
echo "3. Mobile App 需要明確的 JWT token，不是加密的 session token"
echo ""
echo "建議解決方案:"
echo "1. 修改登入 API 返回明文的 JWT token"
echo "2. 或新增 /api/auth/token 端點返回 JWT"
echo "3. 確保所有 API 端點支援 Bearer Token 驗證"