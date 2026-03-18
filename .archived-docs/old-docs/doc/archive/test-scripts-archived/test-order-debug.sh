#!/bin/bash

# 除錯訂單建立問題

API_BASE="http://localhost:3000"
TEST_USER_TAX_ID="12345678"
TEST_USER_PASSWORD="admin123"
TEST_PRODUCT_ID="prod003"

echo "=== 除錯訂單建立問題 ==="
echo ""

# 1. 登入並儲存 cookie
echo "1. 登入..."
curl -s -c cookies.txt -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"taxId\":\"$TEST_USER_TAX_ID\",\"password\":\"$TEST_USER_PASSWORD\",\"rememberMe\":false}"
echo ""

# 2. 檢查 cookie
echo "2. 檢查 cookie 檔案..."
cat cookies.txt
echo ""

# 3. 測試 session 是否有效
echo "3. 測試 session 是否有效..."
curl -s -b cookies.txt -X GET "$API_BASE/api/auth/me"
echo ""

# 4. 清空購物車
echo "4. 清空購物車..."
curl -s -b cookies.txt -X DELETE "$API_BASE/api/cart"
echo ""

# 5. 加入商品
echo "5. 加入商品到購物車..."
curl -s -b cookies.txt -X POST "$API_BASE/api/cart" \
  -H "Content-Type: application/json" \
  -d "{\"productId\":\"$TEST_PRODUCT_ID\",\"quantity\":1}"
echo ""

# 6. 檢查購物車
echo "6. 檢查購物車..."
curl -s -b cookies.txt -X GET "$API_BASE/api/cart"
echo ""

# 7. 測試建立訂單
echo "7. 測試建立訂單..."
curl -s -b cookies.txt -X POST "$API_BASE/api/orders" \
  -H "Content-Type: application/json" \
  -d "{\"note\":\"測試訂單\"}" -v 2>&1 | grep -A 20 "HTTP\|error\|message\|{"
echo ""

# 8. 測試訂單列表 (不帶 status 參數)
echo "8. 測試訂單列表 (不帶 status 參數)..."
curl -s -b cookies.txt -X GET "$API_BASE/api/orders?page=1&limit=5"
echo ""

# 9. 測試訂單列表 (帶有效 status)
echo "9. 測試訂單列表 (帶有效 status)..."
curl -s -b cookies.txt -X GET "$API_BASE/api/orders?page=1&limit=5&status=PENDING"
echo ""

# 清理
rm -f cookies.txt
echo "測試完成"