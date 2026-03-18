#!/bin/bash

# CEO團購電商平台 - 訂單流程測試腳本
# 測試完整的訂單流程，包括建立、查詢、取消訂單

set -e

API_BASE="http://localhost:3000"
TEST_USER_TAX_ID="12345678"
TEST_USER_PASSWORD="admin123"
TEST_PRODUCT_ID="prod003"

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 輸出函數
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 檢查依賴
check_dependencies() {
    log_info "檢查依賴工具..."
    
    if ! command -v curl &> /dev/null; then
        log_error "curl 未安裝"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        log_warning "jq 未安裝，將使用簡易 JSON 解析"
        HAS_JQ=false
    else
        HAS_JQ=true
    fi
    
    log_success "依賴檢查完成"
}

# 解析 JSON 回應
parse_json() {
    if [ "$HAS_JQ" = true ]; then
        echo "$1" | jq -r "$2"
    else
        # 簡易解析（僅用於簡單欄位）
        local json="$1"
        local key="$2"
        
        if [[ "$key" == ".error" ]]; then
            echo "$json" | grep -o '"error":"[^"]*"' | cut -d'"' -f4
        elif [[ "$key" == ".message" ]]; then
            echo "$json" | grep -o '"message":"[^"]*"' | cut -d'"' -f4
        elif [[ "$key" == ".token" ]]; then
            echo "$json" | grep -o '"token":"[^"]*"' | cut -d'"' -f4
        elif [[ "$key" == ".accessToken" ]]; then
            echo "$json" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4
        elif [[ "$key" == ".id" ]]; then
            echo "$json" | grep -o '"id":"[^"]*"' | cut -d'"' -f4
        elif [[ "$key" == ".orderNo" ]]; then
            echo "$json" | grep -o '"orderNo":"[^"]*"' | cut -d'"' -f4
        else
            echo "$json"
        fi
    fi
}

# 測試登入取得 session
login_with_session() {
    log_info "測試登入取得 session cookie..."
    
    local response=$(curl -s -c cookies.txt -X POST "$API_BASE/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"taxId\": \"$TEST_USER_TAX_ID\",
            \"password\": \"$TEST_USER_PASSWORD\",
            \"rememberMe\": false
        }")
    
    local error=$(parse_json "$response" ".error")
    
    if [ -n "$error" ]; then
        log_error "登入失敗: $error"
        return 1
    fi
    
    log_success "登入成功 (session cookie)"
    echo "$response"
}

# 測試取得使用者資料 (Bearer Token)
test_bearer_token_auth() {
    log_info "測試 Bearer Token 驗證..."
    
    # 先取得 session
    login_with_session > /dev/null 2>&1
    
    # 嘗試使用 Bearer Token（使用 session token 作為 Bearer）
    local response=$(curl -s -X GET "$API_BASE/api/user/profile" \
        -H "Authorization: Bearer test-token-123")
    
    local error=$(parse_json "$response" ".error")
    
    if [ -n "$error" ]; then
        log_warning "Bearer Token 驗證失敗: $error"
        return 1
    fi
    
    log_success "Bearer Token 驗證成功"
    echo "$response"
}

# 測試購物車操作 (需要 session)
test_cart_operations() {
    log_info "測試購物車操作..."
    
    # 清空購物車
    log_info "清空購物車..."
    curl -s -b cookies.txt -X DELETE "$API_BASE/api/cart" > /dev/null
    
    # 加入商品到購物車
    log_info "加入商品到購物車..."
    local add_response=$(curl -s -b cookies.txt -X POST "$API_BASE/api/cart" \
        -H "Content-Type: application/json" \
        -d "{
            \"productId\": \"$TEST_PRODUCT_ID\",
            \"quantity\": 2
        }")
    
    local error=$(parse_json "$add_response" ".error")
    
    if [ -n "$error" ]; then
        log_error "加入購物車失敗: $error"
        return 1
    fi
    
    log_success "商品加入購物車成功"
    
    # 查看購物車
    log_info "查看購物車內容..."
    local cart_response=$(curl -s -b cookies.txt -X GET "$API_BASE/api/cart")
    
    local item_count=$(parse_json "$cart_response" ".items | length")
    
    if [ "$item_count" -eq 0 ]; then
        log_error "購物車為空"
        return 1
    fi
    
    log_success "購物車有 $item_count 個商品"
    echo "$cart_response"
}

# 測試訂單端點 (需要 session)
test_order_endpoints() {
    log_info "測試訂單端點..."
    
    # 1. 測試取得訂單列表
    log_info "測試取得訂單列表..."
    local orders_response=$(curl -s -b cookies.txt -X GET "$API_BASE/api/orders")
    
    local error=$(parse_json "$orders_response" ".error")
    
    if [ -n "$error" ]; then
        if [[ "$error" == *"未授權"* ]]; then
            log_error "訂單列表需要登入: $error"
        else
            log_warning "取得訂單列表錯誤: $error"
        fi
    else
        local order_count=$(parse_json "$orders_response" ".data | length")
        log_success "取得訂單列表成功，共有 $order_count 筆訂單"
    fi
    
    # 2. 測試建立訂單
    log_info "測試建立訂單..."
    local create_response=$(curl -s -b cookies.txt -X POST "$API_BASE/api/orders" \
        -H "Content-Type: application/json" \
        -d "{
            \"note\": \"測試訂單，請勿出貨\"
        }")
    
    local error=$(parse_json "$create_response" ".error")
    local order_id=$(parse_json "$create_response" ".order.id")
    local order_no=$(parse_json "$create_response" ".order.orderNo")
    
    if [ -n "$error" ]; then
        if [[ "$error" == *"購物車是空的"* ]]; then
            log_warning "無法建立訂單: $error"
            log_info "需要先將商品加入購物車"
            return 1
        else
            log_error "建立訂單失敗: $error"
            return 1
        fi
    fi
    
    if [ -n "$order_id" ]; then
        log_success "訂單建立成功: $order_no (ID: $order_id)"
        
        # 儲存訂單 ID 供後續測試使用
        echo "$order_id" > /tmp/test_order_id.txt
        echo "$order_no" > /tmp/test_order_no.txt
        
        # 3. 測試取得訂單詳情
        log_info "測試取得訂單詳情..."
        local detail_response=$(curl -s -b cookies.txt -X GET "$API_BASE/api/orders/$order_id")
        
        local detail_error=$(parse_json "$detail_response" ".error")
        
        if [ -n "$detail_error" ]; then
            log_error "取得訂單詳情失敗: $detail_error"
        else
            local retrieved_order_no=$(parse_json "$detail_response" ".orderNo")
            if [ "$retrieved_order_no" = "$order_no" ]; then
                log_success "取得訂單詳情成功: $retrieved_order_no"
            else
                log_warning "訂單編號不匹配"
            fi
        fi
        
        # 4. 測試取消訂單
        log_info "測試取消訂單..."
        local cancel_response=$(curl -s -b cookies.txt -X PATCH "$API_BASE/api/orders/$order_id")
        
        local cancel_error=$(parse_json "$cancel_response" ".error")
        local cancel_message=$(parse_json "$cancel_response" ".message")
        
        if [ -n "$cancel_error" ]; then
            log_warning "取消訂單失敗: $cancel_error"
        else
            log_success "取消訂單成功: $cancel_message"
        fi
        
        echo "$create_response"
    else
        log_error "建立訂單失敗，未取得訂單 ID"
        return 1
    fi
}

# 測試 Bearer Token 在訂單端點
test_bearer_token_on_orders() {
    log_info "測試訂單端點是否支援 Bearer Token..."
    
    # 嘗試使用 Bearer Token 取得訂單列表
    local response=$(curl -s -X GET "$API_BASE/api/orders" \
        -H "Authorization: Bearer test-token-123")
    
    local error=$(parse_json "$response" ".error")
    
    if [ -n "$error" ]; then
        if [[ "$error" == *"未授權"* ]]; then
            log_warning "訂單端點不支援 Bearer Token: $error"
        else
            log_warning "Bearer Token 測試錯誤: $error"
        fi
        return 1
    else
        log_success "訂單端點支援 Bearer Token"
        return 0
    fi
}

# 測試完整訂單流程
test_complete_order_flow() {
    log_info "開始測試完整訂單流程..."
    echo "=========================================="
    
    # 1. 登入取得 session
    if ! login_with_session; then
        log_error "登入失敗，無法繼續測試"
        return 1
    fi
    
    echo ""
    
    # 2. 測試購物車操作
    if ! test_cart_operations; then
        log_error "購物車操作失敗，無法繼續測試"
        return 1
    fi
    
    echo ""
    
    # 3. 測試建立訂單
    if ! test_order_endpoints; then
        log_error "訂單端點測試失敗"
        return 1
    fi
    
    echo ""
    
    # 4. 測試 Bearer Token 支援
    test_bearer_token_on_orders
    
    echo ""
    
    # 5. 測試使用者資料端點 (Bearer Token)
    test_bearer_token_auth
    
    echo ""
    log_success "完整訂單流程測試完成"
}

# 清理測試資料
cleanup() {
    log_info "清理測試資料..."
    rm -f cookies.txt /tmp/test_order_id.txt /tmp/test_order_no.txt 2>/dev/null
    log_success "清理完成"
}

# 主程式
main() {
    log_info "CEO團購電商平台 - 訂單流程測試"
    log_info "=========================================="
    log_info "API 基礎網址: $API_BASE"
    log_info "測試使用者: $TEST_USER_TAX_ID"
    log_info "測試商品: $TEST_PRODUCT_ID"
    echo ""
    
    check_dependencies
    echo ""
    
    # 註冊退出時的清理函數
    trap cleanup EXIT
    
    # 執行測試
    if test_complete_order_flow; then
        log_success "所有測試完成"
    else
        log_error "測試過程中發生錯誤"
        exit 1
    fi
}

# 執行主程式
main "$@"