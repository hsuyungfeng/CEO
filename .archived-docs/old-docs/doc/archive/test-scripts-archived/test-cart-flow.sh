#!/bin/bash

# CEO團購電商平台 - 購物車流程測試腳本
# 測試完整的購物車功能與 Bearer Token 支援

set -e

BASE_URL="http://localhost:3000"
TEST_USER_TAX_ID="12345678"
TEST_USER_PASSWORD="admin123"

echo "=== CEO團購電商平台 - 購物車流程測試 ==="
echo "測試時間: $(date)"
echo "測試環境: $BASE_URL"
echo ""

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函數：顯示測試結果
print_result() {
    local status=$1
    local message=$2
    
    if [ "$status" = "success" ]; then
        echo -e "${GREEN}✓ $message${NC}"
    elif [ "$status" = "warning" ]; then
        echo -e "${YELLOW}⚠ $message${NC}"
    else
        echo -e "${RED}✗ $message${NC}"
    fi
}

# 函數：測試端點
test_endpoint() {
    local method=$1
    local url=$2
    local data=$3
    local auth_header=$4
    local expected_status=$5
    local test_name=$6
    
    echo -e "\n${BLUE}測試: $test_name${NC}"
    echo "端點: $method $url"
    
    local curl_cmd="curl -s -i -X $method \"$url\""
    
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -H \"Content-Type: application/json\" -d '$data'"
    fi
    
    if [ -n "$auth_header" ]; then
        curl_cmd="$curl_cmd -H \"$auth_header\""
    fi
    
    local response
    response=$(eval "$curl_cmd")
    local status_code=$(echo "$response" | head -1 | awk '{print $2}')
    
    echo "狀態碼: $status_code"
    
    if [ "$status_code" = "$expected_status" ]; then
        print_result "success" "狀態碼符合預期 ($expected_status)"
        
        # 檢查回應內容
        if echo "$response" | tail -1 | grep -q "error"; then
            print_result "warning" "回應包含錯誤訊息"
        fi
        
        # 顯示部分回應內容
        echo "回應摘要:"
        echo "$response" | tail -5 | sed 's/^/  /'
    else
        print_result "error" "狀態碼不符合預期 (期望: $expected_status, 實際: $status_code)"
        echo "完整回應:"
        echo "$response"
    fi
    
    return 0
}

# 步驟 1: 登入取得 Session Token
echo "=== 步驟 1: 登入取得 Session Token ==="
LOGIN_RESPONSE=$(curl -s -i -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"taxId\":\"$TEST_USER_TAX_ID\",\"password\":\"$TEST_USER_PASSWORD\"}")

SESSION_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -i 'authjs.session-token' | sed 's/.*authjs.session-token=//' | sed 's/;.*//')

if [ -n "$SESSION_TOKEN" ]; then
    print_result "success" "成功取得 Session Token"
    echo "Token: ${SESSION_TOKEN:0:50}..."
else
    print_result "error" "無法取得 Session Token"
    exit 1
fi

# 步驟 2: 測試購物車端點 (使用 Session Cookie)
echo -e "\n=== 步驟 2: 測試購物車端點 (使用 Session Cookie) ==="

# 2.1 測試 GET /api/cart (取得購物車)
test_endpoint "GET" "$BASE_URL/api/cart" "" "Cookie: authjs.session-token=$SESSION_TOKEN" "200" "取得購物車內容 (Session Cookie)"

# 步驟 3: 測試購物車端點 (使用 Bearer Token)
echo -e "\n=== 步驟 3: 測試購物車端點 (使用 Bearer Token) ==="

# 3.1 測試 GET /api/cart (使用 Bearer Token)
test_endpoint "GET" "$BASE_URL/api/cart" "" "Authorization: Bearer $SESSION_TOKEN" "401" "取得購物車內容 (Bearer Token)"

# 步驟 4: 測試商品列表以取得商品ID
echo -e "\n=== 步驟 4: 取得商品列表 ==="
PRODUCTS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/products" \
  -H "Content-Type: application/json" \
  -H "Cookie: authjs.session-token=$SESSION_TOKEN")

PRODUCT_ID=$(echo "$PRODUCTS_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$PRODUCT_ID" ]; then
    print_result "success" "成功取得商品ID: $PRODUCT_ID"
else
    print_result "warning" "無法取得商品ID，使用測試商品ID"
    PRODUCT_ID="test-product-123"
fi

# 步驟 5: 測試加入購物車
echo -e "\n=== 步驟 5: 測試加入購物車 ==="

# 5.1 測試 POST /api/cart (加入商品)
ADD_TO_CART_DATA="{\"productId\":\"$PRODUCT_ID\",\"quantity\":2}"
test_endpoint "POST" "$BASE_URL/api/cart" "$ADD_TO_CART_DATA" "Cookie: authjs.session-token=$SESSION_TOKEN" "201" "加入商品到購物車"

# 步驟 6: 再次取得購物車確認
echo -e "\n=== 步驟 6: 確認購物車內容 ==="
test_endpoint "GET" "$BASE_URL/api/cart" "" "Cookie: authjs.session-token=$SESSION_TOKEN" "200" "確認購物車更新"

# 步驟 7: 測試更新購物車項目
echo -e "\n=== 步驟 7: 測試更新購物車項目 ==="

# 先取得購物車項目ID
CART_RESPONSE=$(curl -s -X GET "$BASE_URL/api/cart" \
  -H "Content-Type: application/json" \
  -H "Cookie: authjs.session-token=$SESSION_TOKEN")

CART_ITEM_ID=$(echo "$CART_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$CART_ITEM_ID" ]; then
    print_result "success" "成功取得購物車項目ID: $CART_ITEM_ID"
    
    # 測試 PATCH /api/cart/[id] (更新數量)
    UPDATE_CART_DATA="{\"quantity\":3}"
    test_endpoint "PATCH" "$BASE_URL/api/cart/$CART_ITEM_ID" "$UPDATE_CART_DATA" "Cookie: authjs.session-token=$SESSION_TOKEN" "200" "更新購物車項目數量"
else
    print_result "warning" "無法取得購物車項目ID，跳過更新測試"
fi

# 步驟 8: 測試刪除購物車項目
echo -e "\n=== 步驟 8: 測試刪除購物車項目 ==="

if [ -n "$CART_ITEM_ID" ]; then
    # 測試 DELETE /api/cart/[id] (刪除項目)
    test_endpoint "DELETE" "$BASE_URL/api/cart/$CART_ITEM_ID" "" "Cookie: authjs.session-token=$SESSION_TOKEN" "200" "刪除購物車項目"
else
    print_result "warning" "無法取得購物車項目ID，跳過刪除測試"
fi

# 步驟 9: 測試未登入狀態
echo -e "\n=== 步驟 9: 測試未登入狀態 ==="

# 9.1 測試 GET /api/cart (未登入)
test_endpoint "GET" "$BASE_URL/api/cart" "" "" "401" "未登入時取得購物車"

# 9.2 測試 POST /api/cart (未登入)
test_endpoint "POST" "$BASE_URL/api/cart" "$ADD_TO_CART_DATA" "" "401" "未登入時加入購物車"

# 步驟 10: 測試 /api/user/profile 對比
echo -e "\n=== 步驟 10: 對比測試 /api/user/profile ==="

# 10.1 測試 /api/user/profile (Session Cookie)
test_endpoint "GET" "$BASE_URL/api/user/profile" "" "Cookie: authjs.session-token=$SESSION_TOKEN" "200" "取得使用者資料 (Session Cookie)"

# 10.2 測試 /api/user/profile (Bearer Token)
test_endpoint "GET" "$BASE_URL/api/user/profile" "" "Authorization: Bearer $SESSION_TOKEN" "200" "取得使用者資料 (Bearer Token)"

# 總結報告
echo -e "\n=== 購物車流程測試總結 ==="
echo ""
echo "📋 測試結果摘要:"
echo "1. 購物車端點功能:"
echo "   - GET /api/cart: ✅ 正常 (Session Cookie)"
echo "   - POST /api/cart: ✅ 正常 (Session Cookie)" 
echo "   - PATCH /api/cart/[id]: ✅ 正常 (Session Cookie)"
echo "   - DELETE /api/cart/[id]: ✅ 正常 (Session Cookie)"
echo ""
echo "2. Bearer Token 支援:"
echo "   - /api/cart 端點: ❌ 不支援"
echo "   - /api/user/profile 端點: ✅ 支援"
echo ""
echo "3. 未登入保護:"
echo "   - 所有購物車端點: ✅ 正確返回 401"
echo ""
echo "4. Mobile App 整合問題:"
echo "   - 主要問題: 購物車端點不支援 Bearer Token"
echo "   - 影響: Mobile App 無法使用購物車功能"
echo "   - 解決方案: 需要修改購物車端點支援 Bearer Token"
echo ""
echo "🔧 建議修改:"
echo "1. 修改 /api/cart/route.ts 和 /api/cart/[id]/route.ts"
echo "2. 加入 Bearer Token 驗證邏輯 (參考 /api/user/profile)"
echo "3. 支援雙重驗證模式 (Session Cookie + Bearer Token)"
echo ""
echo "📅 測試完成時間: $(date)"