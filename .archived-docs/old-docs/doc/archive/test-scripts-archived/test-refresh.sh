#!/bin/bash

# Test script for /api/auth/refresh endpoint
# Usage: ./test-refresh.sh <jwt-token>

set -e

TOKEN="$1"
BASE_URL="http://localhost:3000"

if [ -z "$TOKEN" ]; then
  echo "錯誤: 請提供 JWT token"
  echo "使用方法: ./test-refresh.sh <your-jwt-token>"
  echo ""
  echo "如何取得 token:"
  echo "1. 使用 /api/auth/login 端點登入取得 token"
  echo "2. 或使用現有的有效 token"
  exit 1
fi

echo "測試 Token 刷新端點..."
echo "URL: ${BASE_URL}/api/auth/refresh"
echo "使用 Token: ${TOKEN:0:50}..."

# Test refresh endpoint
echo ""
echo "1. 測試 POST /api/auth/refresh..."
RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  "${BASE_URL}/api/auth/refresh")

STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  "${BASE_URL}/api/auth/refresh")

echo "狀態碼: ${STATUS_CODE}"
echo "回應: ${RESPONSE}"

# Parse response
NEW_TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
EXPIRES_AT=$(echo "$RESPONSE" | grep -o '"expiresAt":"[^"]*"' | cut -d'"' -f4)

if [ "$STATUS_CODE" = "200" ] && [ -n "$NEW_TOKEN" ]; then
  echo ""
  echo "✅ Token 刷新成功!"
  echo "新 Token: ${NEW_TOKEN:0:50}..."
  echo "過期時間: ${EXPIRES_AT}"
  
  # Test new token
  echo ""
  echo "2. 測試新 Token 是否有效..."
  TEST_RESPONSE=$(curl -s -X GET \
    -H "Authorization: Bearer ${NEW_TOKEN}" \
    "${BASE_URL}/api/auth/me")
  
  TEST_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X GET \
    -H "Authorization: Bearer ${NEW_TOKEN}" \
    "${BASE_URL}/api/auth/me")
  
  echo "新 Token 驗證狀態碼: ${TEST_STATUS}"
  
  if [ "$TEST_STATUS" = "200" ]; then
    echo "✅ 新 Token 有效!"
  else
    echo "❌ 新 Token 無效"
    echo "錯誤訊息: ${TEST_RESPONSE}"
  fi
else
  echo ""
  echo "❌ Token 刷新失敗"
  ERROR_MSG=$(echo "$RESPONSE" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
  if [ -n "$ERROR_MSG" ]; then
    echo "錯誤訊息: ${ERROR_MSG}"
  fi
fi

echo ""
echo "測試完成!"