#!/bin/bash

# Phase 5 自動修復和測試腳本
# 此腳本會：
# 1. 停止任何運行中的 npm 進程
# 2. 同步數據庫 schema
# 3. 重啟開發伺服器
# 4. 運行測試

set -e

echo "=========================================="
echo "🚀 Phase 5 自動修復和測試"
echo "=========================================="

# 步驟 1：停止運行中的進程
echo ""
echo "📍 步驟 1：清理舊進程..."
pkill -f "next dev" || true
sleep 2
echo "✅ 進程已清理"

# 步驟 2：同步數據庫
echo ""
echo "📍 步驟 2：同步 Prisma Schema 到數據庫..."
npx prisma db push --skip-generate
echo "✅ 數據庫同步完成"

# 步驟 3：重新生成 Prisma Client
echo ""
echo "📍 步驟 3：重新生成 Prisma Client..."
npx prisma generate
echo "✅ Prisma Client 已生成"

echo ""
echo "=========================================="
echo "✅ 自動修復完成！"
echo "=========================================="
echo ""
echo "📋 接下來的步驟："
echo ""
echo "1️⃣  在第一個終端啟動開發伺服器："
echo "   npm run dev"
echo ""
echo "2️⃣  在第二個終端運行測試："
echo "   python3 test_api.py http://localhost:3000"
echo ""
echo "=========================================="
