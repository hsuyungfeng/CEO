#!/bin/bash

# CEO團購電商平台 - 清空購物車功能測試腳本
# 測試清空購物車功能與 Bearer Token 支援

set -e

BASE_URL="http://localhost:3000"
TEST_USER_TAX_ID="12345678"
TEST_USER_PASSWORD="admin123"

echo "=== CEO團購電商平台 - 清空購物車功能測試 ==="
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
    
    echo "指令: $curl_cmd"
    
    local response
    response=$(eval "$curl_cmd")
    local status_code=$(echo "$response" | head -n 1 | awk '{print $2}')
    local body=$(echo "$response" | tail -n +2)
    
    echo "狀態碼: $status_code"
    echo "回應: $body"
    
    if [ "$status_code" = "$expected_status" ]; then
        print_result "success" "狀態碼符合預期 ($expected_status)"
        return 0
    else
        print_result "error" "狀態碼不符合預期 (期望: $expected_status, 實際: $status_code)"
        return 1
    fi
}

# 函數：取得 JWT Token
get_jwt_token() {
    echo -e "\n${BLUE}取得 JWT Token${NC}"
    
    local login_response
    login_response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"taxId\":\"$TEST_USER_TAX_ID\",\"password\":\"$TEST_USER_PASSWORD\"}")
    
    local token=$(echo "$login_response" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$token" ]; then
        echo "取得 Token: ${token:0:20}..."
        echo "Bearer $token"
    else
        echo "取得 Token 失敗"
        echo "回應: $login_response"
        return 1
    fi
}

# 函數：取得 Session Cookie
get_session_cookie() {
    echo -e "\n${BLUE}取得 Session Cookie${NC}"
    
    local login_response
    login_response=$(curl -s -i -X POST "$BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"taxId\":\"$TEST_USER_TAX_ID\",\"password\":\"$TEST_USER_PASSWORD\"}")
    
    local cookie=$(echo "$login_response" | grep -i 'set-cookie' | head -1 | sed 's/Set-Cookie: //' | cut -d';' -f1)
    
    if [ -n "$cookie" ]; then
        echo "取得 Cookie: ${cookie:0:50}..."
        echo "Cookie: $cookie"
    else
        echo "取得 Cookie 失敗"
        return 1
    fi
}

# 函數：加入商品到購物車
add_to_cart() {
    local auth_header=$1
    local product_id=$2
    local quantity=$3
    
    echo -e "\n${BLUE}加入商品到購物車${NC}"
    echo "商品ID: $product_id"
    echo "數量: $quantity"
    
    local curl_cmd="curl -s -i -X POST \"$BASE_URL/api/cart\" \
        -H \"Content-Type: application/json\" \
        -d '{\"productId\":\"$product_id\",\"quantity\":$quantity}'"
    
    if [ -n "$auth_header" ]; then
        curl_cmd="$curl_cmd -H \"$auth_header\""
    fi
    
    local response
    response=$(eval "$curl_cmd")
    local status_code=$(echo "$response" | head -n 1 | awk '{print $2}')
    local body=$(echo "$response" | tail -n +2)
    
    echo "狀態碼: $status_code"
    
    if [ "$status_code" = "201" ]; then
        print_result "success" "成功加入商品到購物車"
        return 0
    else
        print_result "error" "加入商品到購物車失敗"
        echo "回應: $body"
        return 1
    fi
}

# 函數：取得購物車內容
get_cart() {
    local auth_header=$1
    
    echo -e "\n${BLUE}取得購物車內容${NC}"
    
    local curl_cmd="curl -s -i -X GET \"$BASE_URL/api/cart\""
    
    if [ -n "$auth_header" ]; then
        curl_cmd="$curl_cmd -H \"$auth_header\""
    fi
    
    local response
    response=$(eval "$curl_cmd")
    local status_code=$(echo "$response" | head -n 1 | awk '{print $2}')
    local body=$(echo "$response" | tail -n +2)
    
    echo "狀態碼: $status_code"
    
    if [ "$status_code" = "200" ]; then
        local item_count=$(echo "$body" | grep -o '"items":\[.*\]' | jq '.items | length' 2>/dev/null || echo "0")
        echo "購物車項目數量: $item_count"
        print_result "success" "成功取得購物車內容"
        return $item_count
    else
        print_result "error" "取得購物車內容失敗"
        echo "回應: $body"
        return 0
    fi
}

# 函數：清空購物車
clear_cart() {
    local auth_header=$1
    
    echo -e "\n${BLUE}清空購物車${NC}"
    
    local curl_cmd="curl -s -i -X DELETE \"$BASE_URL/api/cart\""
    
    if [ -n "$auth_header" ]; then
        curl_cmd="$curl_cmd -H \"$auth_header\""
    fi
    
    local response
    response=$(eval "$curl_cmd")
    local status_code=$(echo "$response" | head -n 1 | awk '{print $2}')
    local body=$(echo "$response" | tail -n +2)
    
    echo "狀態碼: $status_code"
    echo "回應: $body"
    
    if [ "$status_code" = "200" ]; then
        print_result "success" "成功清空購物車"
        return 0
    else
        print_result "error" "清空購物車失敗"
        return 1
    fi
}

# 主測試流程
main() {
    echo "開始測試清空購物車功能與 Bearer Token 支援..."
    
    # 測試 1: 使用 Bearer Token 清空購物車
    echo -e "\n${YELLOW}=== 測試 1: 使用 Bearer Token 清空購物車 ===${NC}"
    
    # 取得 Bearer Token
    BEARER_TOKEN=$(get_jwt_token)
    if [ -z "$BEARER_TOKEN" ]; then
        print_result "error" "無法取得 Bearer Token，跳過測試"
        return 1
    fi
    
    BEARER_AUTH="Authorization: $BEARER_TOKEN"
    
    # 先加入一些商品到購物車
    add_to_cart "$BEARER_AUTH" "1" 2
    add_to_cart "$BEARER_AUTH" "2" 1
    
    # 確認購物車有商品
    get_cart "$BEARER_AUTH"
    local initial_count=$?
    
    if [ "$initial_count" -gt 0 ]; then
        print_result "success" "購物車初始有 $initial_count 個項目"
        
        # 清空購物車
        clear_cart "$BEARER_AUTH"
        
        # 確認購物車已清空
        get_cart "$BEARER_AUTH"
        local final_count=$?
        
        if [ "$final_count" -eq 0 ]; then
            print_result "success" "購物車已成功清空 (從 $initial_count 個項目清空)"
        else
            print_result "error" "購物車清空失敗，仍有 $final_count 個項目"
        fi
    else
        print_result "warning" "購物車初始為空，無法測試清空功能"
    fi
    
    # 測試 2: 使用 Session Cookie 清空購物車
    echo -e "\n${YELLOW}=== 測試 2: 使用 Session Cookie 清空購物車 ===${NC}"
    
    # 取得 Session Cookie
    SESSION_COOKIE=$(get_session_cookie)
    if [ -z "$SESSION_COOKIE" ]; then
        print_result "error" "無法取得 Session Cookie，跳過測試"
        return 1
    fi
    
    COOKIE_AUTH="Cookie: $SESSION_COOKIE"
    
    # 先加入一些商品到購物車
    add_to_cart "$COOKIE_AUTH" "1" 3
    add_to_cart "$COOKIE_AUTH" "2" 2
    add_to_cart "$COOKIE_AUTH" "3" 1
    
    # 確認購物車有商品
    get_cart "$COOKIE_AUTH"
    initial_count=$?
    
    if [ "$initial_count" -gt 0 ]; then
        print_result "success" "購物車初始有 $initial_count 個項目"
        
        # 清空購物車
        clear_cart "$COOKIE_AUTH"
        
        # 確認購物車已清空
        get_cart "$COOKIE_AUTH"
        final_count=$?
        
        if [ "$final_count" -eq 0 ]; then
            print_result "success" "購物車已成功清空 (從 $initial_count 個項目清空)"
        else
            print_result "error" "購物車清空失敗，仍有 $final_count 個項目"
        fi
    else
        print_result "warning" "購物車初始為空，無法測試清空功能"
    fi
    
    # 測試 3: 未授權存取清空購物車端點
    echo -e "\n${YELLOW}=== 測試 3: 未授權存取清空購物車端點 ===${NC}"
    
    test_endpoint "DELETE" "$BASE_URL/api/cart" "" "" "401" "未授權存取清空購物車端點"
    
    # 測試 4: 測試其他購物車端點的 Bearer Token 支援
    echo -e "\n${YELLOW}=== 測試 4: 測試其他購物車端點的 Bearer Token 支援 ===${NC}"
    
    # 使用 Bearer Token 測試 GET /api/cart
    test_endpoint "GET" "$BASE_URL/api/cart" "" "$BEARER_AUTH" "200" "使用 Bearer Token 取得購物車"
    
    # 使用 Bearer Token 測試 POST /api/cart
    test_endpoint "POST" "$BASE_URL/api/cart" '{"productId":"1","quantity":1}' "$BEARER_AUTH" "201" "使用 Bearer Token 加入商品到購物車"
    
    # 測試 5: 混合測試 - 先用 Cookie 加入商品，再用 Bearer Token 清空
    echo -e "\n${YELLOW}=== 測試 5: 混合測試 - 不同認證方式操作購物車 ===${NC}"
    
    # 用 Cookie 加入商品
    add_to_cart "$COOKIE_AUTH" "1" 2
    
    # 用 Bearer Token 清空購物車
    clear_cart "$BEARER_AUTH"
    
    # 用 Cookie 確認購物車已清空
    get_cart "$COOKIE_AUTH"
    final_count=$?
    
    if [ "$final_count" -eq 0 ]; then
        print_result "success" "混合認證測試成功：Cookie 加入商品，Bearer Token 清空購物車"
    else
        print_result "error" "混合認證測試失敗：購物車仍有 $final_count 個項目"
    fi
    
    echo -e "\n${YELLOW}=== 測試完成 ===${NC}"
    echo "所有測試已完成。"
}

# 執行主測試
main