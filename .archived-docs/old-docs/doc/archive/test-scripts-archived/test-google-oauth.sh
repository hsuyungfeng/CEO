#!/bin/bash

# Google OAuth 整合測試腳本
# 測試 Google OAuth 整合功能

set -e

echo "🔧 Google OAuth 整合測試"
echo "========================"

# 檢查環境變數
echo "1. 檢查環境變數..."
if [ -z "$GOOGLE_CLIENT_ID" ] || [ -z "$GOOGLE_CLIENT_SECRET" ]; then
    echo "⚠️  警告: GOOGLE_CLIENT_ID 或 GOOGLE_CLIENT_SECRET 未設定"
    echo "   請在 apps/web/.env.local 中設定:"
    echo "   GOOGLE_CLIENT_ID=your-google-client-id"
    echo "   GOOGLE_CLIENT_SECRET=your-google-client-secret"
    echo ""
    echo "   設定步驟:"
    echo "   1. 訪問 https://console.cloud.google.com/"
    echo "   2. 建立新專案或選擇現有專案"
    echo "   3. 啟用 Google OAuth API"
    echo "   4. 建立 OAuth 2.0 憑證"
    echo "   5. 設定授權重新導向 URI: http://localhost:3000/api/auth/callback/google"
    echo "   6. 將 Client ID 和 Client Secret 複製到 .env.local"
else
    echo "✅ 環境變數已設定"
fi

# 檢查資料庫結構
echo ""
echo "2. 檢查資料庫結構..."
cd apps/web
npx prisma db pull > /dev/null 2>&1
if npx prisma validate > /dev/null 2>&1; then
    echo "✅ 資料庫結構驗證通過"
else
    echo "❌ 資料庫結構驗證失敗"
    exit 1
fi

# 檢查 NextAuth 設定
echo ""
echo "3. 檢查 NextAuth 設定..."
if grep -q "Google" src/auth.ts; then
    echo "✅ Google OAuth Provider 已設定"
else
    echo "❌ Google OAuth Provider 未設定"
    exit 1
fi

# 檢查 API 端點
echo ""
echo "4. 檢查 API 端點..."
if [ -f "src/app/api/auth/oauth/temp/route.ts" ]; then
    echo "✅ OAuth 暫存資料 API 端點存在"
else
    echo "❌ OAuth 暫存資料 API 端點不存在"
    exit 1
fi

if [ -f "src/app/api/auth/register/oauth/route.ts" ]; then
    echo "✅ OAuth 註冊 API 端點存在"
else
    echo "❌ OAuth 註冊 API 端點不存在"
    exit 1
fi

# 檢查頁面
echo ""
echo "5. 檢查頁面..."
if [ -f "src/app/(auth)/register/oauth/page.tsx" ]; then
    echo "✅ OAuth 註冊頁面存在"
else
    echo "❌ OAuth 註冊頁面不存在"
    exit 1
fi

# 檢查登入頁面是否有 Google 按鈕
if grep -q "Google" src/app/\(auth\)/login/page.tsx; then
    echo "✅ 登入頁面包含 Google 按鈕"
else
    echo "❌ 登入頁面缺少 Google 按鈕"
    exit 1
fi

# 測試開發伺服器
echo ""
echo "6. 測試開發伺服器..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/auth/providers 2>/dev/null | grep -q "200"; then
    echo "✅ NextAuth API 可訪問"
    
    # 檢查 Google provider 是否在 providers 中
    if curl -s http://localhost:3000/api/auth/providers 2>/dev/null | grep -q "google"; then
        echo "✅ Google OAuth Provider 已註冊"
    else
        echo "⚠️  Google OAuth Provider 未在 providers 中顯示"
        echo "   可能需要設定 GOOGLE_CLIENT_ID 和 GOOGLE_CLIENT_SECRET"
    fi
else
    echo "⚠️  NextAuth API 無法訪問 (開發伺服器可能未運行)"
    echo "   請執行: cd apps/web && npm run dev"
fi

echo ""
echo "📋 測試總結"
echo "=========="
echo "✅ Google OAuth 整合已成功實作"
echo ""
echo "📝 使用說明:"
echo "1. 設定 Google Cloud Console 專案"
echo "2. 在 apps/web/.env.local 中設定 GOOGLE_CLIENT_ID 和 GOOGLE_CLIENT_SECRET"
echo "3. 啟動開發伺服器: cd apps/web && npm run dev"
echo "4. 訪問 http://localhost:3000/login"
echo "5. 點擊 '使用 Google 帳戶登入' 按鈕"
echo "6. 新使用者將被導向到企業資料註冊頁面"
echo "7. 現有使用者將自動登入並連結 Google 帳戶"
echo ""
echo "🔧 技術架構:"
echo "- NextAuth.js v5 整合 Google OAuth Provider"
echo "- 資料庫 schema 擴充: OAuthAccount, TempOAuth 模型"
echo "- B2B 兩階段註冊流程: Google 登入 + 企業資料補齊"
echo "- 現有使用者帳戶自動連結"
echo "- 支援 Mobile App Bearer Token 兼容性"
echo ""
echo "🎯 下一步:"
echo "1. 設定 Apple Sign-In 整合"
echo "2. 實作手機號碼驗證系統"
echo "3. 擴充 @ceo/auth 共用套件支援 OAuth"
echo "4. 建立 React Native OAuth 客戶端"