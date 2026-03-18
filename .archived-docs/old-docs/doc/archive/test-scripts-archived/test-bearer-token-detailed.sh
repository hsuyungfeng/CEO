#!/bin/bash

API_BASE="http://localhost:3000"
TEST_USER_TAX_ID="12345678"
TEST_USER_PASSWORD="admin123"

echo "詳細測試 Bearer Token 驗證流程"
echo "======================================"
echo ""

# 1. 測試登入並檢查回應標頭
echo "1. 測試登入並檢查回應標頭..."
LOGIN_RESPONSE=$(curl -s -i -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"taxId\": \"$TEST_USER_TAX_ID\",
    \"password\": \"$TEST_USER_PASSWORD\",
    \"rememberMe\": false
  }")

# 分離標頭和主體
HEADERS=$(echo "$LOGIN_RESPONSE" | sed '/^\r$/q')
BODY=$(echo "$LOGIN_RESPONSE" | sed '1,/^\r$/d')

echo "回應標頭:"
echo "$HEADERS" | grep -E "(HTTP|Set-Cookie|Authorization|Content-Type)"

echo ""
echo "回應主體:"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"

echo ""

# 2. 測試 /api/user/profile 使用不同的驗證方式
echo "2. 測試 /api/user/profile 使用不同的驗證方式..."
echo ""

# 2a. 無任何驗證
echo "a) 無任何驗證:"
NO_AUTH_RESPONSE=$(curl -s -X GET "$API_BASE/api/user/profile" \
  -H "Content-Type: application/json")
echo "$NO_AUTH_RESPONSE" | jq . 2>/dev/null || echo "$NO_AUTH_RESPONSE"
echo ""

# 2b. 使用錯誤的 Bearer Token
echo "b) 使用錯誤的 Bearer Token:"
WRONG_TOKEN_RESPONSE=$(curl -s -X GET "$API_BASE/api/user/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer wrong-token-here")
echo "$WRONG_TOKEN_RESPONSE" | jq . 2>/dev/null || echo "$WRONG_TOKEN_RESPONSE"
echo ""

# 2c. 使用有效的 Session Cookie (先登入獲取 cookie)
echo "c) 使用有效的 Session Cookie:"
COOKIE_FILE="test-cookie.txt"
# 登入獲取 cookie
curl -s -c $COOKIE_FILE -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"taxId\": \"$TEST_USER_TAX_ID\",
    \"password\": \"$TEST_USER_PASSWORD\",
    \"rememberMe\": false
  }" > /dev/null

COOKIE_AUTH_RESPONSE=$(curl -s -b $COOKIE_FILE -X GET "$API_BASE/api/user/profile" \
  -H "Content-Type: application/json")
echo "$COOKIE_AUTH_RESPONSE" | jq . 2>/dev/null || echo "$COOKIE_AUTH_RESPONSE"

# 清理 cookie 檔案
rm -f $COOKIE_FILE
echo ""

# 3. 檢查 NextAuth JWT 設定
echo "3. 檢查 NextAuth JWT 設定..."
echo "查看 auth.ts 中的 JWT 設定:"
grep -n "jwt\|JWT\|token\|Token" /Users/hsuyungfeng/Applesoft/統購PHP/.worktrees/phase6/ceo-monorepo/apps/web/src/auth.ts | head -20

echo ""

# 4. 檢查如何取得有效的 JWT Token
echo "4. 檢查如何取得有效的 JWT Token..."
echo "查看登入 API 原始碼中是否有 token 產生:"
grep -n "token\|Token\|jwt\|JWT" /Users/hsuyungfeng/Applesoft/統購PHP/.worktrees/phase6/ceo-monorepo/apps/web/src/app/api/auth/login/route.ts

echo ""

# 5. 測試其他需要授權的端點
echo "5. 測試其他需要授權的端點..."
echo "a) /api/admin/dashboard (需要管理員權限):"
ADMIN_RESPONSE=$(curl -s -X GET "$API_BASE/api/admin/dashboard" \
  -H "Content-Type: application/json")
echo "$ADMIN_RESPONSE" | jq . 2>/dev/null || echo "$ADMIN_RESPONSE"

echo ""
echo "b) /api/cart (需要使用者權限):"
CART_RESPONSE=$(curl -s -X GET "$API_BASE/api/cart" \
  -H "Content-Type: application/json")
echo "$CART_RESPONSE" | jq . 2>/dev/null || echo "$CART_RESPONSE"

echo ""
echo "======================================"
echo "分析結果:"
echo ""
echo "1. 登入 API 目前只返回 Session Cookie，不返回 Bearer Token"
echo "2. /api/user/profile 支援 Session Cookie 驗證"
echo "3. /api/user/profile 應該支援 Bearer Token (根據程式碼)"
echo "4. 需要取得有效的 JWT Token 才能測試 Bearer Token 驗證"
echo "5. 缺少 Token Refresh 端點"
echo ""
echo "建議行動:"
echo "1. 修改登入 API 返回 JWT Token"
echo "2. 新增 /api/auth/token 端點取得 JWT"
echo "3. 新增 /api/auth/refresh 端點刷新 Token"
echo "4. 更新文件說明 Mobile App 驗證流程"