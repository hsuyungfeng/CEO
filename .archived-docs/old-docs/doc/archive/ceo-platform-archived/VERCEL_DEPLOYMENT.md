# CEO 團購電商平台 - Vercel 部署指南

## 概述

本指南將幫助您將 CEO 團購電商平台部署到 Vercel。Vercel 是 Next.js 的創建者提供的託管平台，提供簡單快速的部署體驗。

## 前置要求

1. **Vercel 帳號**：註冊 [Vercel](https://vercel.com)
2. **GitHub 帳號**：項目已託管在 GitHub
3. **PostgreSQL 數據庫**：
   - 選項 A：使用 [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
   - 選項 B：使用外部 PostgreSQL 服務（如 Supabase、AWS RDS、DigitalOcean 等）

## 部署步驟

### 步驟 1：準備項目

確保您的項目在 GitHub 上，且 `ceo-platform` 目錄包含：
- ✅ `package.json` 文件
- ✅ `vercel.json` 配置文件
- ✅ `.env.production.example` 環境變數模板

### 步驟 2：連接 Vercel

1. 登入 [Vercel Dashboard](https://vercel.com/dashboard)
2. 點擊 "Add New" → "Project"
3. 從 GitHub 導入 `ceo-platform` 項目
4. 在項目配置頁面，保留默認設置

### 步驟 3：配置環境變數

在 Vercel 項目設置中，添加以下環境變數：

#### 必需環境變數
```bash
# ============ 資料庫配置 ============
# PostgreSQL 資料庫連接（Vercel Postgres 或外部數據庫）
DATABASE_URL="postgresql://ceo_admin:YOUR_SECURE_PASSWORD@your-postgres-host:5432/ceo_platform_production"

# ============ NextAuth 配置 ============
# 應用URL（部署後自動生成的域名）
NEXTAUTH_URL="https://ceo-platform.vercel.app"
# 生成強密鑰：在終端運行 openssl rand -base64 32
NEXTAUTH_SECRET="your-generated-nextauth-secret-base64-32-chars"

# ============ 應用配置 ============
NODE_ENV="production"
APP_ENV="production"
BCRYPT_SALT_ROUNDS="12"

# ============ JWT 配置 ============
# 生成：openssl rand -base64 32
JWT_SECRET="your-generated-jwt-secret-base64-32-chars"
JWT_REFRESH_SECRET="your-generated-jwt-refresh-secret-base64-32-chars"
```

#### 可選環境變數
```bash
# ============ 郵件服務（可選） ============
# Resend 郵件服務
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# ============ 監控配置（可選） ============
# Sentry 錯誤追蹤
NEXT_PUBLIC_SENTRY_DSN="https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@sentry.io/xxxxxx"
SENTRY_ORG="your_org"
SENTRY_PROJECT="ceo-platform"

# ============ 性能配置（可選） ============
# Redis 緩存
REDIS_URL="redis://redis-host:6379"

# ============ 第三方服務（可選） ============
# Google Analytics
NEXT_PUBLIC_GA_TRACKING_ID="UA-XXXXXXXXX-X"

# ============ 推送通知（可選） ============
# Expo 推送通知
EXPO_ACCESS_TOKEN="your_expo_access_token_here"

# Firebase Cloud Messaging (FCM)
FCM_SERVER_KEY="your_fcm_server_key_here"
FCM_SENDER_ID="your_fcm_sender_id_here"

# ============ Apple OAuth（可選） ============
APPLE_CLIENT_ID="your_apple_client_id"
APPLE_TEAM_ID="your_apple_team_id"
APPLE_KEY_ID="your_apple_key_id"
APPLE_PRIVATE_KEY="your_apple_private_key"

# ============ 文件上傳配置 ============
NEXT_PUBLIC_MAX_UPLOAD_SIZE="5242880"  # 5MB

# ============ 安全配置 ============
NEXTAUTH_SESSION_MAX_AGE="86400"  # 24小時
```

### 步驟 4：配置構建設置

在 Vercel 項目設置的 "Build & Development Settings" 中：

1. **Build Command**：`npm run build`
2. **Output Directory**：`.next`
3. **Install Command**：`npm install`

### 步驟 5：設置 Vercel Postgres（推薦）

如果您使用 Vercel Postgres：

1. 在 Vercel Dashboard 中，進入 "Storage" 標籤
2. 點擊 "Create Database" → 選擇 "PostgreSQL"
3. 設置數據庫名稱和區域
4. 創建後，Vercel 會自動生成 `DATABASE_URL` 環境變數
5. 複製連接字符串並添加到環境變數

### 步驟 6：部署

1. 點擊 "Deploy" 按鈕
2. Vercel 將自動構建並部署您的應用
3. 部署完成後，訪問提供的 URL（如 `https://ceo-platform.vercel.app`）

## 數據庫遷移

部署後，需要運行數據庫遷移：

### 方法 A：使用 Vercel CLI
```bash
# 安裝 Vercel CLI
npm i -g vercel

# 登入
vercel login

# 鏈接項目
vercel link

# 運行 Prisma 遷移
npx prisma migrate deploy
```

### 方法 B：使用 Vercel 環境變數運行腳本
創建一個一次性腳本或使用 Vercel 的 Post-Deploy Hooks。

## 健康檢查

部署完成後，驗證應用是否正常運行：

1. **健康檢查端點**：訪問 `https://您的域名.vercel.app/api/health`
2. **首頁**：訪問 `https://您的域名.vercel.app`
3. **API 端點**：訪問 `https://您的域名.vercel.app/api/products`

## 故障排除

### 常見問題

#### 問題 1：構建失敗，缺少 Prisma 客戶端
**解決方案**：確保 `package.json` 中包含 `postinstall` 腳本：
```json
"scripts": {
  "postinstall": "prisma generate"
}
```

#### 問題 2：數據庫連接失敗
**解決方案**：
1. 檢查 `DATABASE_URL` 環境變數是否正確
2. 確保數據庫允許來自 Vercel 的連接（白名單 IP）
3. 對於 Vercel Postgres，確保數據庫已創建且運行中

#### 問題 3：環境變數未生效
**解決方案**：
1. 在 Vercel Dashboard 中重新保存環境變數
2. 重新部署項目
3. 檢查環境變數名稱是否正確

#### 問題 4：靜態文件服務問題
**解決方案**：
1. 檢查 `vercel.json` 中的路由配置
2. 確保 `public/` 目錄包含所有靜態資源
3. 檢查 Next.js 配置

## 自動化部署

### GitHub 集成
Vercel 自動與 GitHub 集成，當您推送到 main 分支時會自動部署。

### 預覽部署
每次 Pull Request 都會創建預覽部署，方便測試。

## 監控與日誌

1. **Vercel Analytics**：查看性能指標
2. **Vercel Logs**：查看實時日誌
3. **Health Checks**：監控應用健康狀態

## 安全建議

1. **環境變數安全**：不要在代碼中硬編碼敏感信息
2. **數據庫安全**：使用強密碼，定期輪換
3. **HTTPS**：Vercel 自動提供 HTTPS
4. **CORS**：配置適當的 CORS 策略

## 支持與資源

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [項目問題反饋](https://github.com/hsuyungfeng/ceo-platform/issues)

---

**部署狀態檢查清單**：
- [ ] Vercel 帳號已創建
- [ ] 項目已導入 Vercel
- [ ] 環境變數已配置
- [ ] 數據庫已設置（Vercel Postgres 或外部）
- [ ] 構建成功
- [ ] 健康檢查通過
- [ ] 功能測試通過

**部署完成時間**：預計 15-30 分鐘