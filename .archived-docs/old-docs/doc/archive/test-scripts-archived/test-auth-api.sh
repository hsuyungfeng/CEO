#!/bin/bash

API_BASE="http://localhost:3000"
COOKIE_FILE="test-cookies.txt"

echo "測試購物車和訂單API整合..."
echo "======================================"

# 1. 登入獲取會話
echo "1. 登入獲取會話..."
LOGIN_RESPONSE=$(curl -s -c $COOKIE_FILE -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"taxId":"12345678","password":"admin123"}')

if echo "$LOGIN_RESPONSE" | grep -q "登入成功"; then
  echo "   ✅ 登入成功"
else
  echo "   ❌ 登入失敗"
  echo "   回應: $LOGIN_RESPONSE"
  exit 1
fi

# 2. 測試購物車API
echo ""
echo "2. 測試購物車API..."
CART_RESPONSE=$(curl -s -b $COOKIE_FILE "$API_BASE/api/cart")
if echo "$CART_RESPONSE" | grep -q "未授權"; then
  echo "   ⚠️  購物車需要認證，但會話可能無效"
else
  echo "   ✅ 購物車API正常"
  echo "   回應: $(echo "$CART_RESPONSE" | jq -c 'select(.items != null) | {itemCount: (.items | length)}' 2>/dev/null || echo "$CART_RESPONSE" | head -c 100)"
fi

# 3. 測試訂單API
echo ""
echo "3. 測試訂單API..."
ORDERS_RESPONSE=$(curl -s -b $COOKIE_FILE "$API_BASE/api/orders?page=1&limit=5")
if echo "$ORDERS_RESPONSE" | grep -q "未授權"; then
  echo "   ⚠️  訂單需要認證，但會話可能無效"
else
  echo "   ✅ 訂單API正常"
  echo "   回應: $(echo "$ORDERS_RESPONSE" | jq -c 'select(.data != null) | {orderCount: (.data | length)}' 2>/dev/null || echo "$ORDERS_RESPONSE" | head -c 100)"
fi

# 4. 測試用戶資料API
echo ""
echo "4. 測試用戶資料API..."
PROFILE_RESPONSE=$(curl -s -b $COOKIE_FILE "$API_BASE/api/user/profile")
if echo "$PROFILE_RESPONSE" | grep -q "未授權"; then
  echo "   ⚠️  用戶資料需要認證，但會話可能無效"
else
  echo "   ✅ 用戶資料API正常"
  echo "   回應: $(echo "$PROFILE_RESPONSE" | jq -c 'select(.name != null) | {name: .name, email: .email}' 2>/dev/null || echo "$PROFILE_RESPONSE" | head -c 100)"
fi

# 5. 測試登出
echo ""
echo "5. 測試登出..."
LOGOUT_RESPONSE=$(curl -s -b $COOKIE_FILE -X POST "$API_BASE/api/auth/logout")
if [ $? -eq 0 ]; then
  echo "   ✅ 登出成功"
else
  echo "   ⚠️  登出可能失敗"
fi

# 清理
rm -f $COOKIE_FILE

echo ""
echo "✅ 購物車和訂單API整合測試完成！"