#!/bin/bash
API_BASE="http://localhost:3000"

echo "檢查Web應用程式API端點可用性..."
echo "======================================"

endpoints=(
  "/api/cart"
  "/api/categories" 
  "/api/home"
  "/api/notifications"
  "/api/orders"
  "/api/products"
  "/api/products/featured"
  "/api/products/latest"
  "/api/products/search"
  "/api/user/profile"
)

for endpoint in "${endpoints[@]}"; do
  url="${API_BASE}${endpoint}"
  echo -n "檢查 ${endpoint} ... "
  
  if curl -s -f -o /dev/null -w "%{http_code}" "$url" > /dev/null 2>&1; then
    echo "✅ 存在"
  else
    echo "❌ 不存在"
  fi
done

echo ""
echo "檢查需要參數的端點..."
echo "======================================"

# 測試需要參數的端點
echo -n "檢查 /api/products?page=1&limit=1 ... "
curl -s "${API_BASE}/api/products?page=1&limit=1&sortBy=createdAt&order=desc" -G --data-urlencode "search=" --data-urlencode "categoryId=" > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ 正常"
else
  echo "❌ 錯誤"
fi

echo -n "檢查 /api/products/featured ... "
curl -s "${API_BASE}/api/products/featured" > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ 正常"
else
  echo "❌ 錯誤"
fi

echo ""
echo "檢查需要認證的端點..."
echo "======================================"
echo "⚠️  需要登入後測試的端點:"
echo "  /api/cart"
echo "  /api/orders"
echo "  /api/user/profile"
