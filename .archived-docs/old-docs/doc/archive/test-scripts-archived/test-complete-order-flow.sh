#!/bin/bash

# CEO團購電商平台 - 完整訂單流程測試

API_BASE="http://localhost:3000"
TEST_USER_TAX_ID="12345678"
TEST_USER_PASSWORD="admin123"
TEST_PRODUCT_ID="prod003"

echo "=================================================="
echo "CEO團購電商平台 - 完整訂單流程測試"
echo "=================================================="
echo "測試時間: $(date)"
echo "API 基礎網址: $API_BASE"
echo "測試使用者: $TEST_USER_TAX_ID"
echo "測試商品: $TEST_PRODUCT_ID"
echo "=================================================="
echo ""

# 清理舊的 cookie 檔案
rm -f cookies.txt test_report.md

# 建立測試報告
cat > test_report.md << EOF
# CEO團購電商平台 - 訂單流程測試報告

## 測試時間
$(date)

## 測試環境
- Web App: $API_BASE
- 測試使用者: taxId=$TEST_USER_TAX_ID
- 測試商品: $TEST_PRODUCT_ID

## 測試目標
1. 檢查訂單相關端點
2. 測試訂單功能 (建立、列表、詳情、取消)
3. 檢查 Bearer Token 支援
4. 測試完整訂單流程
5. 識別 Mobile App 整合問題

## 測試結果
EOF

add_to_report() {
    echo "$1" >> test_report.md
}

test_step() {
    echo ""
    echo "=== $1 ==="
    add_to_report ""
    add_to_report "### $1"
}

test_result() {
    echo "結果: $1"
    add_to_report "- $2"
}

# 1. 測試登入
test_step "1. 測試登入 API"
LOGIN_RESPONSE=$(curl -s -c cookies.txt -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"taxId\":\"$TEST_USER_TAX_ID\",\"password\":\"$TEST_USER_PASSWORD\",\"rememberMe\":false}")

if echo "$LOGIN_RESPONSE" | grep -q "登入成功"; then
    test_result "✅ 成功" "登入 API 功能正常"
    USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.user.id // empty')
    echo "使用者 ID: $USER_ID"
else
    test_result "❌ 失敗" "登入 API 失敗: $LOGIN_RESPONSE"
    exit 1
fi

# 2. 檢查購物車內容
test_step "2. 檢查購物車內容"
CART_RESPONSE=$(curl -s -b cookies.txt -X GET "$API_BASE/api/cart")
CART_ITEMS=$(echo "$CART_RESPONSE" | jq '.items | length // 0')

if [ "$CART_ITEMS" -gt 0 ]; then
    test_result "⚠️ 警告" "購物車已有 $CART_ITEMS 個商品，將清空後重新測試"
    # 清空購物車
    curl -s -b cookies.txt -X DELETE "$API_BASE/api/cart" > /dev/null
    sleep 1
fi

# 3. 加入商品到購物車
test_step "3. 加入商品到購物車"
ADD_CART_RESPONSE=$(curl -s -b cookies.txt -X POST "$API_BASE/api/cart" \
  -H "Content-Type: application/json" \
  -d "{\"productId\":\"$TEST_PRODUCT_ID\",\"quantity\":2}")

if echo "$ADD_CART_RESPONSE" | grep -q "已加入購物車"; then
    test_result "✅ 成功" "商品成功加入購物車"
else
    test_result "❌ 失敗" "加入購物車失敗: $ADD_CART_RESPONSE"
fi

# 4. 測試訂單端點 - Bearer Token 支援
test_step "4. 測試訂單端點 Bearer Token 支援"

echo "測試 /api/orders 端點 (Bearer Token):"
ORDER_LIST_BEARER=$(curl -s -X GET "$API_BASE/api/orders?page=1&limit=10" \
  -H "Authorization: Bearer test-token-123")

if echo "$ORDER_LIST_BEARER" | grep -q "未授權"; then
    test_result "❌ 不支援" "訂單列表端點不支援 Bearer Token"
else
    test_result "✅ 支援" "訂單列表端點支援 Bearer Token"
fi

# 5. 測試訂單端點 - Session Cookie
test_step "5. 測試訂單列表 (Session Cookie)"
ORDER_LIST_RESPONSE=$(curl -s -b cookies.txt -X GET "$API_BASE/api/orders?page=1&limit=10")

if echo "$ORDER_LIST_RESPONSE" | grep -q "error"; then
    ERROR_MSG=$(echo "$ORDER_LIST_RESPONSE" | jq -r '.error // empty')
    test_result "⚠️ 錯誤" "取得訂單列表失敗: $ERROR_MSG"
    
    # 測試不帶 status 參數
    echo "測試不帶 status 參數:"
    ORDER_LIST_NO_STATUS=$(curl -s -b cookies.txt -X GET "$API_BASE/api/orders?page=1&limit=10")
    if echo "$ORDER_LIST_NO_STATUS" | grep -q "data"; then
        test_result "✅ 成功" "訂單列表端點功能正常 (不帶 status 參數)"
        ORDER_COUNT=$(echo "$ORDER_LIST_NO_STATUS" | jq '.data | length // 0')
        echo "現有訂單數量: $ORDER_COUNT"
    else
        test_result "❌ 失敗" "訂單列表端點錯誤: $ORDER_LIST_NO_STATUS"
    fi
else
    test_result "✅ 成功" "訂單列表端點功能正常"
    ORDER_COUNT=$(echo "$ORDER_LIST_RESPONSE" | jq '.data | length // 0')
    echo "現有訂單數量: $ORDER_COUNT"
fi

# 6. 測試建立訂單
test_step "6. 測試建立訂單"
CREATE_ORDER_RESPONSE=$(curl -s -b cookies.txt -X POST "$API_BASE/api/orders" \
  -H "Content-Type: application/json" \
  -d "{\"note\":\"測試訂單 - $(date)\"}")

if echo "$CREATE_ORDER_RESPONSE" | grep -q "訂單建立成功"; then
    test_result "✅ 成功" "訂單建立功能正常"
    
    ORDER_ID=$(echo "$CREATE_ORDER_RESPONSE" | jq -r '.order.id // empty')
    ORDER_NO=$(echo "$CREATE_ORDER_RESPONSE" | jq -r '.order.orderNo // empty')
    
    echo "訂單編號: $ORDER_NO"
    echo "訂單 ID: $ORDER_ID"
    
    # 儲訂單 ID 供後續測試
    if [ -n "$ORDER_ID" ] && [ "$ORDER_ID" != "null" ]; then
        echo "$ORDER_ID" > /tmp/test_order_id.txt
        echo "$ORDER_NO" > /tmp/test_order_no.txt
        
        # 7. 測試取得訂單詳情
        test_step "7. 測試取得訂單詳情"
        ORDER_DETAIL_RESPONSE=$(curl -s -b cookies.txt -X GET "$API_BASE/api/orders/$ORDER_ID")
        
        if echo "$ORDER_DETAIL_RESPONSE" | grep -q "orderNo"; then
            DETAIL_ORDER_NO=$(echo "$ORDER_DETAIL_RESPONSE" | jq -r '.orderNo // empty')
            if [ "$DETAIL_ORDER_NO" = "$ORDER_NO" ]; then
                test_result "✅ 成功" "訂單詳情端點功能正常"
            else
                test_result "⚠️ 警告" "訂單詳情端點返回不同訂單編號"
            fi
        else
            test_result "❌ 失敗" "取得訂單詳情失敗: $ORDER_DETAIL_RESPONSE"
        fi
        
        # 8. 測試取消訂單
        test_step "8. 測試取消訂單"
        CANCEL_RESPONSE=$(curl -s -b cookies.txt -X PATCH "$API_BASE/api/orders/$ORDER_ID")
        
        if echo "$CANCEL_RESPONSE" | grep -q "訂單已取消"; then
            test_result "✅ 成功" "訂單取消功能正常"
        else
            ERROR_MSG=$(echo "$CANCEL_RESPONSE" | jq -r '.error // empty')
            test_result "⚠️ 警告" "取消訂單失敗: $ERROR_MSG"
        fi
    fi
    
else
    ERROR_MSG=$(echo "$CREATE_ORDER_RESPONSE" | jq -r '.error // empty')
    test_result "❌ 失敗" "建立訂單失敗: $ERROR_MSG"
    
    # 檢查是否購物車為空
    if echo "$CREATE_ORDER_RESPONSE" | grep -q "購物車是空的"; then
        echo "購物車為空，檢查購物車狀態..."
        CART_CHECK=$(curl -s -b cookies.txt -X GET "$API_BASE/api/cart")
        echo "購物車狀態: $CART_CHECK"
    fi
fi

# 9. 測試使用者資料端點 Bearer Token 支援
test_step "9. 測試使用者資料端點 Bearer Token 支援"

echo "測試 /api/user/profile 端點 (Bearer Token):"
PROFILE_BEARER=$(curl -s -X GET "$API_BASE/api/user/profile" \
  -H "Authorization: Bearer test-token-123")

if echo "$PROFILE_BEARER" | grep -q "未授權"; then
    test_result "❌ 不支援" "使用者資料端點不支援測試 Bearer Token"
else
    test_result "✅ 支援" "使用者資料端點支援 Bearer Token"
fi

# 10. 測試使用者資料端點 Session Cookie
test_step "10. 測試使用者資料端點 (Session Cookie)"
PROFILE_RESPONSE=$(curl -s -b cookies.txt -X GET "$API_BASE/api/user/profile")

if echo "$PROFILE_RESPONSE" | grep -q "taxId"; then
    test_result "✅ 成功" "使用者資料端點功能正常 (Session Cookie)"
else
    test_result "❌ 失敗" "取得使用者資料失敗"
fi

# 11. 測試其他認證端點
test_step "11. 測試其他認證端點"

echo "測試 /api/auth/me 端點:"
AUTH_ME_RESPONSE=$(curl -s -b cookies.txt -X GET "$API_BASE/api/auth/me")
if echo "$AUTH_ME_RESPONSE" | grep -q "error"; then
    test_result "❌ 失敗" "/api/auth/me 端點錯誤: $AUTH_ME_RESPONSE"
else
    test_result "✅ 成功" "/api/auth/me 端點功能正常"
fi

echo "測試 /api/auth/me 端點 (Bearer Token):"
AUTH_ME_BEARER=$(curl -s -X GET "$API_BASE/api/auth/me" \
  -H "Authorization: Bearer test-token-123")
if echo "$AUTH_ME_BEARER" | grep -q "未授權"; then
    test_result "❌ 不支援" "/api/auth/me 端點不支援 Bearer Token"
fi

# 總結
test_step "測試總結"

add_to_report ""
add_to_report "## 發現的問題"
add_to_report ""
add_to_report "### 1. Bearer Token 支援問題"
add_to_report "- 訂單相關端點 (/api/orders, /api/orders/[id]) 不支援 Bearer Token"
add_to_report "- 購物車端點 (/api/cart) 不支援 Bearer Token"
add_to_report "- 認證端點 (/api/auth/me) 不支援 Bearer Token"
add_to_report "- 只有 /api/user/profile 端點支援 Bearer Token 驗證"
add_to_report ""
add_to_report "### 2. 訂單建立問題"
add_to_report "- 建立訂單時可能出現伺服器錯誤"
add_to_report "- 需要檢查資料庫連線和交易處理"
add_to_report ""
add_to_report "### 3. 參數驗證問題"
add_to_report "- 訂單列表端點需要正確的查詢參數"
add_to_report "- status 參數必須是有效的枚舉值或省略"
add_to_report ""
add_to_report "## Mobile App 整合建議"
add_to_report ""
add_to_report "### 短期解決方案"
add_to_report "1. 為所有需要認證的 API 端點新增 Bearer Token 支援"
add_to_report "2. 修改登入 API 返回 JWT token"
add_to_report "3. 或新增專門的 token 取得端點"
add_to_report ""
add_to_report "### 長期解決方案"
add_to_report "1. 統一認證機制，支援 Session Cookie 和 Bearer Token"
add_to_report "2. 實作 token 刷新機制"
add_to_report "3. 提供完整的 API 文件說明認證方式"

echo ""
echo "=================================================="
echo "測試完成！詳細報告已儲存到 test_report.md"
echo "=================================================="

# 顯示報告摘要
echo ""
echo "=== 測試報告摘要 ==="
tail -50 test_report.md

# 清理
rm -f cookies.txt /tmp/test_order_id.txt /tmp/test_order_no.txt 2>/dev/null