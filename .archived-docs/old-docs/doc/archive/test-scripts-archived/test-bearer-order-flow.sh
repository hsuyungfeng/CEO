#!/bin/bash

echo "=== 測試 Bearer Token 訂單流程 ==="

# 1. 登入取得 token
echo "1. 登入取得 token..."
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"taxId":"12345678","password":"admin123"}' | jq -r '.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "登入失敗"
  exit 1
fi

echo "取得 token 成功"

# 2. 清空購物車
echo "2. 清空購物車..."
curl -s -X DELETE "http://localhost:3000/api/cart" \
  -H "Authorization: Bearer $TOKEN"

# 3. 加入商品到購物車
echo "3. 加入商品到購物車..."
curl -s -X POST "http://localhost:3000/api/cart/items" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productId":"prod003","quantity":2}'

# 4. 檢查購物車
echo "4. 檢查購物車..."
curl -s -X GET "http://localhost:3000/api/cart" \
  -H "Authorization: Bearer $TOKEN" | jq .

# 5. 建立訂單
echo "5. 建立訂單..."
curl -s -X POST "http://localhost:3000/api/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"note":"Bearer Token 測試訂單"}' | jq .

# 6. 檢查訂單列表
echo "6. 檢查訂單列表..."
curl -s -X GET "http://localhost:3000/api/orders?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo "測試完成"
