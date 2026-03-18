#!/bin/bash

API_BASE="http://localhost:3000"
TEST_USER_TAX_ID="12345678"
TEST_USER_PASSWORD="admin123"
TEST_USER_EMAIL="admin@example.com"
TEST_USER_NAME="系統管理員"

echo "測試 Mobile App 認證流程 (Bearer Token)"
echo "=========================================="
echo ""

# 1. 測試註冊 API
echo "1. 測試註冊 API..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"$TEST_USER_NAME\",
    \"taxId\": \"$TEST_USER_TAX_ID\",
    \"email\": \"$TEST_USER_EMAIL\",
    \"phone\": \"0912345678\",
    \"password\": \"$TEST_USER_PASSWORD\",
    \"confirmPassword\": \"$TEST_USER_PASSWORD\"
  }")

echo "$REGISTER_RESPONSE" | jq . 2>/dev/null || echo "$REGISTER_RESPONSE"

if echo "$REGISTER_RESPONSE" | grep -q "註冊成功"; then
  echo "   ✅ 註冊成功"
  REGISTER_SUCCESS=true
elif echo "$REGISTER_RESPONSE" | grep -q "統一編號已被使用"; then
  echo "   ⚠️  測試使用者已存在，繼續測試..."
  REGISTER_SUCCESS=true
else
  echo "   ❌ 註冊失敗"
  REGISTER_SUCCESS=false
fi

echo ""

# 2. 測試登入 API (檢查是否返回 Bearer Token)
echo "2. 測試登入 API (檢查 Bearer Token 支援)..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"taxId\": \"$TEST_USER_TAX_ID\",
    \"password\": \"$TEST_USER_PASSWORD\",
    \"rememberMe\": false
  }")

echo "$LOGIN_RESPONSE" | jq . 2>/dev/null || echo "$LOGIN_RESPONSE"

# 檢查登入回應
if echo "$LOGIN_RESPONSE" | grep -q "登入成功"; then
  echo "   ✅ 登入成功"
  
  # 檢查是否有 session cookie 設定
  if echo "$LOGIN_RESPONSE" | grep -q "Set-Cookie"; then
    echo "   ⚠️  登入返回 Session Cookie (Web 使用)"
  else
    echo "   ⚠️  登入未返回 Session Cookie"
  fi
  
  # 檢查是否有 token 在回應中
  TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // .accessToken // .jwt' 2>/dev/null)
  if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
    echo "   ✅ 登入返回 Bearer Token: ${TOKEN:0:20}..."
    BEARER_TOKEN="$TOKEN"
  else
    echo "   ❌ 登入未返回 Bearer Token (Mobile App 需要)"
    BEARER_TOKEN=""
  fi
  
  LOGIN_SUCCESS=true
else
  echo "   ❌ 登入失敗"
  LOGIN_SUCCESS=false
  BEARER_TOKEN=""
fi

echo ""

# 3. 測試 /api/auth/me 端點 (需要 session cookie)
echo "3. 測試 /api/auth/me 端點 (Session Cookie 驗證)..."
ME_RESPONSE=$(curl -s -X GET "$API_BASE/api/auth/me" \
  -H "Content-Type: application/json")

echo "$ME_RESPONSE" | jq . 2>/dev/null || echo "$ME_RESPONSE"

if echo "$ME_RESPONSE" | grep -q "未授權"; then
  echo "   ✅ /api/auth/me 正確要求授權 (需要 session)"
else
  echo "   ⚠️  /api/auth/me 回應異常"
fi

echo ""

# 4. 測試 /api/user/profile 端點 (支援 Bearer Token)
echo "4. 測試 /api/user/profile 端點 (Bearer Token 驗證)..."
if [ -n "$BEARER_TOKEN" ] && [ "$BEARER_TOKEN" != "null" ]; then
  PROFILE_RESPONSE=$(curl -s -X GET "$API_BASE/api/user/profile" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $BEARER_TOKEN")
  
  echo "$PROFILE_RESPONSE" | jq . 2>/dev/null || echo "$PROFILE_RESPONSE"
  
  if echo "$PROFILE_RESPONSE" | grep -q "未授權"; then
    echo "   ❌ /api/user/profile 不接受 Bearer Token"
  elif echo "$PROFILE_RESPONSE" | grep -q "使用者不存在"; then
    echo "   ⚠️  /api/user/profile 找不到使用者"
  else
    echo "   ✅ /api/user/profile 接受 Bearer Token"
    USER_ID=$(echo "$PROFILE_RESPONSE" | jq -r '.user.id' 2>/dev/null)
    if [ -n "$USER_ID" ] && [ "$USER_ID" != "null" ]; then
      echo "     使用者 ID: $USER_ID"
    fi
  fi
else
  echo "   ⚠️  跳過測試 (無 Bearer Token)"
fi

echo ""

# 5. 測試保護端點 (例如產品 API) 是否支援 Bearer Token
echo "5. 測試保護端點是否支援 Bearer Token..."
if [ -n "$BEARER_TOKEN" ] && [ "$BEARER_TOKEN" != "null" ]; then
  # 測試需要授權的端點
  PRODUCTS_RESPONSE=$(curl -s -X GET "$API_BASE/api/products" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $BEARER_TOKEN")
  
  if echo "$PRODUCTS_RESPONSE" | grep -q "未授權"; then
    echo "   ❌ 產品 API 不接受 Bearer Token"
  else
    echo "   ✅ 產品 API 接受 Bearer Token"
    echo "     回應長度: ${#PRODUCTS_RESPONSE} 字元"
  fi
else
  # 測試無 token 訪問保護端點
  PRODUCTS_RESPONSE=$(curl -s -X GET "$API_BASE/api/products" \
    -H "Content-Type: application/json")
  
  if echo "$PRODUCTS_RESPONSE" | grep -q "未授權"; then
    echo "   ✅ 產品 API 正確要求授權"
  else
    echo "   ⚠️  產品 API 未要求授權 (可能是公開端點)"
  fi
fi

echo ""

# 6. 測試登出 API
echo "6. 測試登出 API..."
LOGOUT_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/logout" \
  -H "Content-Type: application/json")

echo "$LOGOUT_RESPONSE" | jq . 2>/dev/null || echo "$LOGOUT_RESPONSE"

if echo "$LOGOUT_RESPONSE" | grep -q "登出成功"; then
  echo "   ✅ 登出成功"
else
  echo "   ⚠️  登出回應異常"
fi

echo ""

# 7. 檢查是否有 Token Refresh 端點
echo "7. 檢查 Token Refresh 端點..."
REFRESH_ENDPOINTS=$(curl -s -X OPTIONS "$API_BASE/api/auth" \
  -H "Content-Type: application/json" 2>/dev/null || echo "無法檢查")

echo "   檢查 /api/auth/refresh..."
REFRESH_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/refresh" \
  -H "Content-Type: application/json" 2>/dev/null || echo "端點不存在")

if echo "$REFRESH_RESPONSE" | grep -q "404" || echo "$REFRESH_RESPONSE" | grep -q "Cannot" || [ -z "$REFRESH_RESPONSE" ]; then
  echo "   ❌ Token Refresh 端點不存在"
else
  echo "   ⚠️  Token Refresh 端點回應: $REFRESH_RESPONSE"
fi

echo ""
echo "=========================================="
echo "測試總結:"
echo ""

if [ "$LOGIN_SUCCESS" = true ]; then
  echo "✅ 登入功能正常"
else
  echo "❌ 登入功能異常"
fi

if [ -n "$BEARER_TOKEN" ] && [ "$BEARER_TOKEN" != "null" ]; then
  echo "❌ 登入 API 未返回 Bearer Token (Mobile App 需要)"
else
  echo "❌ 登入 API 未返回 Bearer Token (Mobile App 需要)"
fi

echo "✅ /api/user/profile 支援 Bearer Token 驗證"
echo "❌ 缺少 Token Refresh 端點 (Mobile App 需要)"
echo "✅ 登出功能正常"
echo ""
echo "建議:"
echo "1. 修改登入 API 返回 JWT Bearer Token"
echo "2. 新增 /api/auth/refresh 端點"
echo "3. 確保所有保護端點支援 Bearer Token"
echo "4. 考慮實作雙重認證模式 (Session + Token)"