# CEO 平台 - Vercel 部署檢查清單

## 部署前準備

### 1. 項目狀態檢查
- [x] 所有測試通過 (216/216)
- [x] 生產構建成功 (0 錯誤)
- [x] TypeScript 類型檢查通過
- [x] ESLint 錯誤為 0 (126 警告為樣式建議)
- [x] 代碼已提交並推送到 GitHub

### 2. 配置文件檢查
- [x] `vercel.json` 配置文件已創建
- [x] `VERCEL_DEPLOYMENT.md` 部署指南已創建
- [x] `DEPLOYMENT.md` 通用部署指南已存在
- [x] `CHECKLIST.md` 檢查清單已存在
- [x] `.env.production.example` 環境變數模板已存在

### 3. 代碼配置檢查
- [x] `package.json` 包含 `postinstall` 腳本 (`prisma generate`)
- [x] Prisma 客戶端配置正確
- [x] Next.js 配置正確 (next.config.js)
- [x] 環境變數驗證邏輯存在

## Vercel 部署步驟

### 步驟 1：Vercel 項目設置
- [ ] 創建 Vercel 帳號 (如果沒有)
- [ ] 從 GitHub 導入 `ceo-platform` 項目
- [ ] 配置項目設置：
  - [ ] 框架預設：Next.js
  - [ ] 根目錄：`ceo-platform`
  - [ ] 構建命令：`npm run build`
  - [ ] 輸出目錄：`.next`
  - [ ] 安裝命令：`npm install`

### 步驟 2：環境變數配置
- [ ] 添加必需環境變數：
  - [ ] `DATABASE_URL` (PostgreSQL 連接字符串)
  - [ ] `NEXTAUTH_URL` (應用 URL)
  - [ ] `NEXTAUTH_SECRET` (會話密鑰)
  - [ ] `NODE_ENV=production`
  - [ ] `APP_ENV=production`
  - [ ] `BCRYPT_SALT_ROUNDS=12`
- [ ] 添加可選環境變數 (根據需要)：
  - [ ] `RESEND_API_KEY` (郵件服務)
  - [ ] `NEXT_PUBLIC_SENTRY_DSN` (錯誤監控)
  - [ ] `REDIS_URL` (緩存)
  - [ ] `NEXT_PUBLIC_GA_TRACKING_ID` (分析)

### 步驟 3：數據庫設置
- [ ] 設置 PostgreSQL 數據庫：
  - [ ] 選項 A：使用 Vercel Postgres
  - [ ] 選項 B：使用外部 PostgreSQL 服務
- [ ] 配置數據庫連接白名單 (允許 Vercel IP)
- [ ] 測試數據庫連接

### 步驟 4：首次部署
- [ ] 觸發首次部署
- [ ] 監控構建日誌
- [ ] 驗證構建成功

### 步驟 5：數據庫遷移
- [ ] 運行數據庫遷移：
  ```bash
  # 使用 Vercel CLI
  npx prisma migrate deploy
  ```
- [ ] 驗證數據庫架構正確

### 步驟 6：功能驗證
- [ ] 健康檢查端點：`/api/health`
- [ ] 首頁加載：`/`
- [ ] 商品列表：`/products`
- [ ] 購物車功能：`/cart`
- [ ] 結帳流程：`/checkout`
- [ ] 訂單管理：`/orders`
- [ ] 後台管理：`/admin` (需要管理員登入)

## 部署後監控

### 1. 性能監控
- [ ] 頁面加載速度
- [ ] API 響應時間
- [ ] 數據庫查詢性能

### 2. 錯誤監控
- [ ] 檢查錯誤日誌
- [ ] 設置錯誤通知
- [ ] 監控 500 錯誤

### 3. 安全性檢查
- [ ] HTTPS 強制啟用
- [ ] CORS 配置正確
- [ ] 環境變數安全
- [ ] 數據庫訪問控制

## 故障排除

### 常見問題

#### 構建失敗
1. **Prisma 客戶端生成失敗**
   - 檢查 `postinstall` 腳本
   - 驗證 Prisma schema 語法
   - 檢查環境變數

2. **缺少依賴**
   - 檢查 `package.json` 依賴
   - 驗證 Node.js 版本兼容性

#### 運行時錯誤
1. **數據庫連接失敗**
   - 檢查 `DATABASE_URL` 格式
   - 驗證數據庫網絡可達性
   - 檢查防火牆規則

2. **環境變數缺失**
   - 檢查 Vercel 環境變數設置
   - 驗證變數名稱大小寫
   - 重新部署使變數生效

#### 功能問題
1. **圖片無法加載**
   - 檢查圖片路徑
   - 驗證 `public/` 目錄結構

2. **API 端點 404**
   - 檢查路由配置
   - 驗證 API 文件路徑

## 緊急回滾

如果部署出現問題，可以：

1. **Vercel 回滾**：
   - 在 Vercel Dashboard 中選擇之前的部署
   - 點擊 "Promote to Production"

2. **Git 回滾**：
   ```bash
   git revert [commit-hash]
   git push origin main
   ```

3. **數據庫回滾**：
   - 如果有備份，恢復數據庫
   - 使用 Prisma 遷移回滾

## 聯繫支持

- **Vercel 支持**：https://vercel.com/support
- **GitHub Issues**：https://github.com/hsuyungfeng/ceo-platform/issues
- **項目文檔**：`docs/` 目錄

---

**最後更新**：2026-02-18
**版本**：v3.0.0-phase3-complete
**狀態**：準備部署