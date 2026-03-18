#!/bin/bash

# CEO 平台 - 生產環境密鑰生成腳本
# 此腳本幫助生成部署所需的隨機密鑰

echo "============================================"
echo "CEO 團購電商平台 - 生產環境密鑰生成"
echo "============================================"
echo ""

echo "1. 生成 NEXTAUTH_SECRET (32字節 Base64):"
NEXTAUTH_SECRET=$(openssl rand -base64 32)
echo "NEXTAUTH_SECRET=\"$NEXTAUTH_SECRET\""
echo ""

echo "2. 生成 JWT_SECRET (32字節 Base64):"
JWT_SECRET=$(openssl rand -base64 32)
echo "JWT_SECRET=\"$JWT_SECRET\""
echo ""

echo "3. 生成 JWT_REFRESH_SECRET (32字節 Base64):"
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
echo "JWT_REFRESH_SECRET=\"$JWT_REFRESH_SECRET\""
echo ""

echo "4. 隨機密碼生成 (用於數據庫等):"
echo "隨機密碼 (16字符): $(openssl rand -base64 12)"
echo ""

echo "============================================"
echo "使用方法:"
echo "1. 將生成的密鑰複製到 Vercel 環境變數"
echo "2. 確保 DATABASE_URL 已設置正確"
echo "3. 根據需要設置其他可選環境變數"
echo "============================================"