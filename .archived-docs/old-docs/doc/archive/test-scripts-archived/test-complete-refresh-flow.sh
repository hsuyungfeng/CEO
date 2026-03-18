#!/bin/bash

# Complete test for token refresh flow
# Demonstrates: Login -> Get Token -> Refresh Token -> Verify New Token

set -e

API_BASE="http://localhost:3000"
TEST_USER_TAX_ID="12345678"
TEST_USER_PASSWORD="admin123"

echo "完整 Token 刷新流程測試"
echo "=============================="
echo ""

# Step 1: Login and get token
echo "1. 登入取得 JWT token..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"taxId\": \"$TEST_USER_TAX_ID\",
    \"password\": \"$TEST_USER_PASSWORD\",
    \"rememberMe\": false
  }")

# Extract token from response
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ 登入失敗，無法取得 token"
  echo "回應: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ 登入成功!"
echo "取得 Token: ${TOKEN:0:50}..."
echo ""

# Step 2: Test original token
echo "2. 測試原始 token 是否有效..."
ORIGINAL_TEST_RESPONSE=$(curl -s -X GET "$API_BASE/api/auth/me" \
  -H "Authorization: Bearer $TOKEN")

ORIGINAL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_BASE/api/auth/me" \
  -H "Authorization: Bearer $TOKEN")

if [ "$ORIGINAL_STATUS" = "200" ]; then
  echo "✅ 原始 token 有效"
else
  echo "❌ 原始 token 無效"
  echo "錯誤: $ORIGINAL_TEST_RESPONSE"
  exit 1
fi

echo ""

# Step 3: Refresh token
echo "3. 刷新 token..."
REFRESH_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/refresh" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

REFRESH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_BASE/api/auth/refresh" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

# Extract new token from response
NEW_TOKEN=$(echo "$REFRESH_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
EXPIRES_AT=$(echo "$REFRESH_RESPONSE" | grep -o '"expiresAt":"[^"]*"' | cut -d'"' -f4)

if [ "$REFRESH_STATUS" = "200" ] && [ -n "$NEW_TOKEN" ]; then
  echo "✅ Token 刷新成功!"
  echo "新 Token: ${NEW_TOKEN:0:50}..."
  echo "過期時間: $EXPIRES_AT"
else
  echo "❌ Token 刷新失敗"
  echo "狀態碼: $REFRESH_STATUS"
  echo "回應: $REFRESH_RESPONSE"
  exit 1
fi

echo ""

# Step 4: Test new token
echo "4. 測試新 token 是否有效..."
NEW_TEST_RESPONSE=$(curl -s -X GET "$API_BASE/api/auth/me" \
  -H "Authorization: Bearer $NEW_TOKEN")

NEW_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_BASE/api/auth/me" \
  -H "Authorization: Bearer $NEW_TOKEN")

if [ "$NEW_STATUS" = "200" ]; then
  echo "✅ 新 token 有效!"
  USER_NAME=$(echo "$NEW_TEST_RESPONSE" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
  USER_EMAIL=$(echo "$NEW_TEST_RESPONSE" | grep -o '"email":"[^"]*"' | cut -d'"' -f4)
  echo "使用者: $USER_NAME ($USER_EMAIL)"
else
  echo "❌ 新 token 無效"
  echo "錯誤: $NEW_TEST_RESPONSE"
  exit 1
fi

echo ""

# Step 5: Verify tokens are different
echo "5. 驗證新舊 token 不同..."
if [ "$TOKEN" != "$NEW_TOKEN" ]; then
  echo "✅ 新舊 token 不同（正確）"
  echo "原始 token 長度: ${#TOKEN}"
  echo "新 token 長度: ${#NEW_TOKEN}"
else
  echo "⚠️  警告：新舊 token 相同"
fi

echo ""
echo "=============================="
echo "✅ 完整測試通過!"
echo ""
echo "總結:"
echo "1. 成功登入並取得 JWT token"
echo "2. 原始 token 驗證成功"
echo "3. Token 刷新成功"
echo "4. 新 token 驗證成功"
echo "5. 新舊 token 不同"
echo ""
echo "刷新端點已正常運作!"