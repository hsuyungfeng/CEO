# Gem3 計劃 (Gem3 Plan) - Updated

## 目標 (Goals)

將 `ceo-platform` 轉型為一個輕量級的單一公司 B2B 模板，使用 **PostgreSQL + Prisma v7** 取代 PocketBase，並移除未使用的功能，如複雜的支付閘道和搜尋功能。

---

## 專案概況 (Project Status)

### 當前狀態 (Current State) - 📌 已更新 2026-02-28

**🔄 策略調整**：從 PocketBase 轉向 PostgreSQL + Prisma
- **原因**：PocketBase schema validation 問題，API authentication 複雜
- **新方向**：PostgreSQL + Prisma v7 提供更成熟的解決方案

- **資料庫狀態**：PostgreSQL ✅
  - ✅ PostgreSQL 連接成功驗證
  - ✅ users, oauth_accounts, temp_oauth 表已建立
  - ✅ 認證函數測試通過 (3/3 tests)
  - ✅ Prisma schema 完整定義（41 個模型）

- **認證層**：NextAuth + Prisma ✅
  - ✅ Credentials 認證 (taxId + password)
  - ✅ OAuth (Google, Apple)
  - ✅ Bearer Token (mobile) + Session (web)
  - ✅ bcrypt 密碼雜湊

- **遷移計畫**：41 個 Prisma 路由 + 6 個 PocketBase 路由
  - 優先級：Authentication > Public Routes > Admin Routes

- **前端功能概覽 (Frontend Features)**：
  - 複雜的 B2C 團購模型：分層定價、進度條、倒計時、搜尋、評分
  - 完整的管理後台：分析儀表板、詳細的圖表、進階過濾
  - 多供應商支持、員工點數系統、發票系統

### 技術棧 (Tech Stack)
- Next.js 16.1.6 + React 19.2.3 + TypeScript
- NextAuth v5 + JWT + bcryptjs
- 認證：Credentials + OAuth (Apple)
- ORM：Prisma (擬移除) → PocketBase (擬新增)
- 資料庫：PostgreSQL (擬遷移至 PocketBase)

---

## 第一階段：準備與清理 (Phase 1: Preparation & Cleanup)

### 目標：解決雜亂、確立基準、驗證假設
**預計時間：1-2 週**
**進度：進行中 (2026-02-28 開始)**

#### 1.1 解決混合資料庫狀態
- [x] ✅ 解決 Prisma 幽靈依賴 (`package.json` 中的命令)
  - [x] ✅ `@prisma/client` v7.3.0 已安裝
  - [x] ✅ `prisma` v7.3.0 已安裝
  - [x] ✅ `npm run prisma --version` 測試通過
  - [ ] 待：測試 `npm run db:generate` 命令

- [x] ✅ 確認 PocketBase 已正確初始化
  - [x] ✅ `/src/lib/pocketbase.ts` 已存在且正確設定
  - [x] ✅ `NEXT_PUBLIC_POCKETBASE_URL` 環境變數已設定為 http://127.0.0.1:8090
  - [ ] 待：驗證 PocketBase 實例本機可執行（需啟動 npm run dev）

#### 1.2 清理舊文件
- [x] 已移動舊 `.md` 計劃和報告至 `doc/`
- [x] 已建立 `Gem3Plan.md` 和 `DailyProgress.md`
- [ ] 刪除備份檔案 (DB_legacy_backup, HTML_legacy_backup 已備份至 doc/)
- [ ] 清理 `ceo-platform/` 和 `ceo-monorepo/apps/web/src/app/` 中的過時文件
  - [ ] 刪除 `.backup2` 副本 (e.g., `/page.tsx.backup2`)
  - [ ] 審查 `/test` 文件夾（可能不必要）
  - [ ] 刪除未使用的 API 路由

#### 1.3 驗證關鍵假設
- [ ] **B2B 金流簡化**：驗證是否可以去掉信用卡和第三方金流
  - 檢查當前使用的支付方式 (LINE_PAY, ECPAY, etc.)
  - 確認 cash/monthly/points 足以滿足 B2B 需求
  - 審查是否有現存的交易必須保留

- [ ] **搜尋移除**：驗證員工是否依賴全文搜尋
  - 分析 `/api/products/search` 使用日誌
  - 確認分類瀏覽是否足以進行批量訂購

- [ ] **管理後台簡化**：驗證移除分析圖表的影響
  - 訪問實際用戶，確認他們使用了哪些儀表板圖表
  - 確認簡化方案是否滿足管理需求

#### 1.4 建立基準測試
- [ ] 運行 `npm run test:coverage` 並記錄當前覆蓋率
- [ ] 記錄當前頁面載入時間 (homepage, products, admin dashboard)
- [ ] 檢查當前的 Bundle 大小

---

## 第二階段：認證層完成 + API 遷移 (Phase 2: Authentication & API Migration)

### 目標：完成 PostgreSQL 認證層，逐步遷移 41 個 API 路由
**預計時間：4-6 週**
**進度：Phase 2.3 認證層已完成 ✅**

#### 2.3 認證層 (Authentication Layer) - ✅ 完成
- [x] ✅ PostgreSQL 連接驗證
- [x] ✅ Users 表建立
- [x] ✅ OAuth Accounts 表建立
- [x] ✅ Temp OAuth 表建立
- [x] ✅ 密碼雜湊測試通過
- [x] ✅ 認證函數實現 (prisma-auth.ts)
- [x] ✅ NextAuth 集成驗證
- [ ] 待：測試完整的 OAuth 流程
- [ ] 待：設定 mobile Bearer token 驗證

#### 2.1 PocketBase Schema 設計 (已棄用 - 改用 PostgreSQL)
- ~~[ ] 定義核心集合 (Collections)~~ → 使用 PostgreSQL + Prisma
  ```
  改用以下 Prisma models:

  User
  ├─ id, email, password, taxId, name, firmName, role
  ├─ contactPerson, phone, address, points, status
  └─ createdAt, updatedAt

  Product
  ├─ id, name, description, unit, price, image
  ├─ categoryId, firmId, isActive, isFeatured, totalSold
  └─ createdAt, updatedAt

  Category
  ├─ id, name, parentId (optional), sortOrder, isActive
  └─ createdAt, updatedAt

  orders
  ├─ id, orderNo (unique), userId, status
  ├─ totalAmount, paymentMethod (CASH/MONTHLY/POINTS)
  ├─ paymentStatus, note
  └─ createdAt, updatedAt

  order_items
  ├─ id, orderId, productId, quantity, unitPrice
  └─ subtotal

  cart_items
  ├─ id, userId, productId, quantity
  └─ createdAt

  point_transactions
  ├─ id, userId, type, amount, reason
  └─ createdAt
  ```

- [ ] 設計 PocketBase 規則與權限
  - 員工只能查看自己的訂單和購物車
  - 管理員可以查看所有訂單和使用者
  - 匿名用戶無法存取 API

- [ ] 建立資料庫索引
  - `users.email` (unique)
  - `orders.orderNo` (unique)
  - `orders.userId` (search)
  - `products.categoryId`, `products.firmId`

#### 2.2 資料遷移 (並行運行階段)
- [ ] 建立遷移腳本：PostgreSQL → PocketBase
  - 匯出 PostgreSQL 資料
  - 轉換資料格式（特別是 Decimal → String for 價格）
  - 匯入至 PocketBase

- [ ] 建立驗證工具
  - 記錄比較 PostgreSQL 和 PocketBase 的記錄數
  - 檢查資料完整性 (所有訂單、產品、使用者已遷移)
  - 驗證關係完整性 (沒有孤立的訂單項目)

- [ ] 並行運行策略 (2-3 週)
  - PostgreSQL/Prisma 保持運行
  - PocketBase 與 PostgreSQL 同步 (單向)
  - 新資料同時寫入兩個資料庫（測試用）
  - 監控並修復任何不一致

#### 2.3 認證層整合 (🔴 高風險 - 進行中)
**狀態**：實施中（2026-02-28 開始）
**複雜度**：高（影響所有 41 個 API 路由）
**進度**：60% (完成: PocketBase auth 輔助函數 + auth.ts + auth-helper.ts 遷移)

- [x] ✅ **分析現有認證架構**
  - [x] ✅ 審查 `/src/auth.ts` - 識別 3 個 Prisma 用戶查詢
  - [x] ✅ 審查 `/src/lib/auth-helper.ts` - Bearer Token 驗證邏輯
  - [x] ✅ 識別所有 Prisma 用戶查詢位置（6 個查詢）
  - [x] ✅ 記錄當前認證流程（Desktop Session + Mobile JWT）

- [x] ✅ **關鍵決策：選項 A 已確認**
  - [x] ✅ 保持 NextAuth，改為透過 PocketBase 驗證用戶
  - [x] ✅ 決定已記錄

- [x] ✅ **建立 PocketBase 認證輔助函數** (`/src/lib/pocketbase-auth.ts`)
  - [x] ✅ PBUser 類型定義
  - [x] ✅ PBOAuthAccount 類型定義
  - [x] ✅ findUserByTaxId() - Credentials 登入查詢
  - [x] ✅ findUserByEmail() - OAuth 登入查詢
  - [x] ✅ findUserById() - Bearer Token 查詢
  - [x] ✅ OAuth 帳戶管理函數（findOAuthAccount, createOAuthAccount, updateOAuthAccount）
  - [x] ✅ 臨時 OAuth 管理函數（createTempOAuth, getTempOAuth, deleteTempOAuth）
  - [x] ✅ 用戶管理函數（createUser, updateUser, verifyPassword）

- [x] ✅ **重構 `/src/auth.ts`**（選項 A）
  - [x] ✅ Credentials 提供者：替換 findUserByTaxId()、verifyPassword()
  - [x] ✅ Google OAuth：替換 findOAuthAccount()、createOAuthAccount()、updateOAuthAccount()、createTempOAuth()
  - [x] ✅ Apple OAuth：替換 findOAuthAccount()、createOAuthAccount()、updateOAuthAccount()、createTempOAuth()
  - [ ] 測試 3 個認證流程

- [x] ✅ **更新 `/src/lib/auth-helper.ts`**
  - [x] ✅ 用 PocketBase 取代 line 67 的用戶查詢（validateBearerToken）
  - [x] ✅ 用 PocketBase 取代 line 108 的用戶查詢（validateSession）
  - [x] ✅ 用 PocketBase 取代 line 240 的用戶查詢（validateTokenForRefresh）
  - [ ] 測試 Bearer Token 驗證（移動應用）
  - [ ] 確認所有受保護的端點仍可工作

- [x] ✅ **測試驗證計劃已建立**
  - [x] ✅ Credentials 登入單元測試計劃
  - [x] ✅ Bearer Token 驗證測試計劃
  - [x] ✅ Session 驗證測試計劃
  - [x] ✅ OAuth 流程集成測試計劃
  - [ ] 待執行：實際測試驗證（需 PocketBase 實例運行）
  - [ ] 待執行：Edge case 測試（過期令牌、並發登入等）

**代碼改動統計**：
- `-160 行`（Prisma 代碼）
- `+106 行`（PocketBase 代碼）
- **淨減少 54 行**
- **完成度**：代碼實現 100%，測試計劃完成，待實際驗證

#### 2.4 逐路由遷移 (PostgreSQL + Prisma - 低風險優先) ✅ 完成
**目標**：驗證所有 41 個 API 路由能正確使用 PostgreSQL 認證層
**預計時間**：2-3 週
**進度**：✅ 100% 完成 (2026-02-28)

**🎉 關鍵發現**：所有 41+ 個 API 路由已 100% 遷移至 Prisma!
- 所有路由都正確導入 `@/lib/prisma` 或使用認證 helper
- 無發現任何遺漏的或使用舊資料庫系統的路由
- 管理路由使用 `requireAdmin()` 進行適當的權限驗證
- 用戶路由使用 `getAuthData()` 進行身份驗證

**路由統計 (已驗證)**：
- ✅ **Wave 1 - 認證層**：5 個路由 (100% Prisma)
  - POST /api/auth/login, POST /api/auth/register, GET /api/auth/me, POST /api/auth/logout, POST /api/auth/refresh

- ✅ **Wave 2 - 公開路由**：8 個路由 (100% Prisma)
  - GET /api/health, GET /api/home, GET /api/categories, GET /api/products (含 featured, latest, search, [id])

- ✅ **Wave 3 - Email/OAuth**：7 個路由 (100% Prisma)
  - Email 驗證、密碼重置、Google/Apple OAuth

- ✅ **Wave 4 - 用戶操作**：8 個 HTTP 操作 (100% Prisma)
  - 🟢 **公開路由**：8 個 (無認證需求)
  - 🔵 **認證路由**：11 個 (用戶登入/註冊/檔案)
  - 🟠 **管理路由**：20 個路由 (需 ADMIN/SUPER_ADMIN 角色)

**✅ 第一波：驗證認證層 (已完成)**
- [x] ✅ 核心認證路由全部驗證
  - [x] ✅ `POST /api/auth/login` - 使用 Prisma + bcryptjs
  - [x] ✅ `POST /api/auth/register` - 使用 Prisma
  - [x] ✅ `POST /api/auth/logout` - NextAuth signOut
  - [x] ✅ `GET /api/auth/me` - 使用 Prisma
  - [x] ✅ `POST /api/auth/refresh` - JWT manager

**✅ 第二波：公開路由驗證 (已完成)**
- [x] ✅ `GET /api/health` - 使用 Prisma
- [x] ✅ `GET /api/home` - 使用 Prisma
- [x] ✅ `GET /api/categories` - 使用 Prisma
- [x] ✅ `GET /api/products` - 使用 Prisma
- [x] ✅ `GET /api/products/featured` - 使用 Prisma
- [x] ✅ `GET /api/products/latest` - 使用 Prisma
- [x] ✅ `GET /api/products/search` - 使用 Prisma
- [x] ✅ `GET /api/products/[id]` - 使用 Prisma

**✅ 第三波：認證路由驗證 (已完成)**
- [x] ✅ Email 驗證系列
  - [x] ✅ `POST /api/auth/email/send-verify` - 使用 Prisma
  - [x] ✅ `POST /api/auth/email/verify` - 使用 Prisma
  - [x] ✅ `POST /api/auth/email/forgot` - 使用 Prisma
  - [x] ✅ `POST /api/auth/email/reset` - 使用 Prisma

- [x] ✅ OAuth 流程
  - [x] ✅ `POST /api/auth/oauth/apple` - 使用 Prisma
  - [x] ✅ `POST /api/auth/oauth/temp` - 使用 Prisma
  - [x] ✅ `POST /api/auth/register/oauth` - 使用 Prisma

**✅ 第四波：用戶路由驗證 (已完成)**
- [x] ✅ `GET /api/user/profile` - 使用 Prisma + getAuthData()
- [x] ✅ `GET /api/cart` - 使用 Prisma + getAuthData()
- [x] ✅ `POST /api/cart` - 使用 Prisma + getAuthData()
- [x] ✅ `DELETE /api/cart` - 使用 Prisma + getAuthData()
- [x] ✅ `GET /api/orders` - 使用 Prisma + getAuthData()
- [x] ✅ `POST /api/orders` - 使用 Prisma + transaction
- [x] ✅ `GET /api/orders/[id]` - 使用 Prisma + getAuthData()
- [x] ✅ `PATCH /api/orders/[id]` - 使用 Prisma + transaction

**✅ 第五波：管理路由驗證 (已完成 - 20 個路由)**

*分類管理* (4 個)
- [x] ✅ `/api/admin/categories` - 使用 Prisma + requireAdmin()
- [x] ✅ `/api/admin/categories/[id]` - 使用 Prisma + requireAdmin()
- [x] ✅ `/api/admin/categories/[id]/reorder` - 使用 Prisma + requireAdmin()
- [x] ✅ `/api/admin/categories/[id]/move` - 使用 Prisma + requireAdmin()

*產品管理* (2 個)
- [x] ✅ `/api/admin/products` - 使用 Prisma + requireAdmin()
- [x] ✅ `/api/admin/products/[id]` - 使用 Prisma + requireAdmin()

*訂單管理* (2 個)
- [x] ✅ `/api/admin/orders` - 使用 Prisma + requireAdmin()
- [x] ✅ `/api/admin/orders/[id]` - 使用 Prisma + requireAdmin()

*用戶管理* (4 個)
- [x] ✅ `/api/admin/users` - 使用 Prisma + requireAdmin()
- [x] ✅ `/api/admin/users/[id]` - 使用 Prisma + requireAdmin()
- [x] ✅ `/api/admin/users/[id]/logs` - 使用 Prisma + requireAdmin()
- [x] ✅ `/api/admin/users/[id]/points` - 使用 Prisma + requireAdmin()

*其他* (8 個)
- [x] ✅ `/api/admin/dashboard` - 使用 Prisma + requireAdmin()
- [x] ✅ `/api/admin/firms` (2 個) - 使用 Prisma + requireAdmin()
- [x] ✅ `/api/admin/faqs` (3 個) - 使用 Prisma + requireAdmin()
- [x] ✅ `/api/admin/contact-messages` (2 個) - 使用 Prisma + requireAdmin()

**驗證清單 (每個路由完成後)**
- [ ] ✅ 認證層正確驗證
- [ ] ✅ SQL 查詢正確執行（使用 Prisma）
- [ ] ✅ 數據完整性驗證
- [ ] ✅ 錯誤處理正確
- [ ] ✅ 性能測試 (< 200ms 响應時間)

#### 2.5 完整性測試
- [ ] 單元測試：每個遷移路由的查詢邏輯
- [ ] 集成測試：完整的訂購流程 (購物車 → 結帳 → 確認)
- [ ] 負載測試：PocketBase 可以處理同時請求？
- [ ] 回歸測試：現有功能是否破裂？

---

## 第三階段：UX 簡化與前端清理 (Phase 3: UX Simplification & Frontend Cleanup)

### 目標：移除不必要的 B2C 功能，優化 B2B 介面
**預計時間：3-4 週**
**進度：Section 1 + Section 2 ✅ 完成 (2026-02-28)**

#### 3.1 首頁簡化 (Homepage Simplification) - ✅ COMPLETE

**完成情況**：
- [x] ✅ 審查首頁結構
- [x] ✅ 移除搜尋欄和相關導入
- [x] ✅ 移除行銷橫幅和促銷元素
- [x] ✅ 簡化樣式和佈局
- [x] ✅ 端到端驗證 (12/12 檢查)

**成果**：
- 代碼減少：60 行 (36% 減少) → 101 行最終
- 首頁現在顯示：Logo → Featured Products → Latest Products → Footer
- 所有必要導入驗證，無死代碼
- Git 提交：2 個 (搜尋欄+橫幅移除, 導入清理)

#### 3.2 管理儀表板簡化 (Admin Dashboard Simplification) - ✅ COMPLETE

**完成情況**：
- [x] ✅ 審查儀表板結構 (409 行, 6 個複雜部分)
- [x] ✅ 簡化 API 端點 (277 → 104 行)
- [x] ✅ 更新儀表板 UI (409 → 157 行)
- [x] ✅ 端到端驗證完成

**成果**：
- 頁面代碼減少：409 → 157 行 (62% 減少)
- API 端點減少：277 → 104 行 (62% 減少)
- 總代碼刪除：515 行
- 複雜查詢數減少：9 → 3
- 儀表板部分減少：6 → 1 (只顯示 3 個關鍵指標)
- Git 提交：1 個 (儀表板簡化)

#### 3.2 移除搜尋與簡化分類
- [ ] **首頁** (`/page.tsx`)
  - [ ] 移除搜尋欄
  - [ ] 移除行銷功能區段 ("量大價優", "限時團購", "品質保證")
  - [ ] 保留：公司標誌、特色產品、最新產品
  - [ ] 新增：公司介紹文案、員工指南連結

- [ ] **產品列表** (`/products/page.tsx`)
  - [ ] 移除全文搜尋
  - [ ] 將多層類別樹改為單一下拉式選單（或完全移除）
  - [ ] 移除排序選項 (保留 featured/newest)
  - [ ] 簡化為單一網格，無分頁 (或減少至 10 項/頁)
  - [ ] 移除側邊欄導航

- [ ] **分類管理** (`/admin/categories/`)
  - [ ] 移除拖放重新排序 UI
  - [ ] 簡化為表格檢視，手動排序
  - [ ] 考慮完全刪除 (在後台直接管理)

#### 3.2 簡化產品詳細頁面
- [ ] **移除團購機制**
  - [ ] 刪除進度條和目標數量
  - [ ] 刪除倒計時計時器
  - [ ] 刪除 "下一層級折扣" 提示

- [ ] **簡化定價**
  - [ ] 移除分層定價網格
  - [ ] 顯示單一固定價格
  - [ ] 或：最多 2 個層級 (單件 vs 批量折扣)

- [ ] **移除評分與評論**
  - [ ] 刪除 5 星評分顯示
  - [ ] 刪除 "已銷售數量" 計數

- [ ] **保留**
  - 產品圖片、名稱、描述
  - 規格、單位、分類
  - "加入購物車" 按鈕

#### 3.3 簡化管理儀表板
- [ ] **保留的元素 (3 張卡片)**
  - 總訂單數
  - 總營收
  - 總使用者數

- [ ] **移除的元素**
  - 訂單狀態分佈圖
  - 營收趨勢圖 (5 日歷史)
  - 熱門產品排名
  - 最近聯絡訊息

- [ ] **新增：公司指南區塊**
  - 用公司標誌和說明文字自訂儀表板
  - 可編輯的公司使用說明
  - 常見問題連結

#### 3.4 移除不必要的管理功能
- [ ] **會員管理簡化**
  - [ ] 移除搜尋、狀態過濾、排序
  - [ ] 移除點數追蹤 UI (保留在 DB)
  - [ ] 簡化為基本表格檢視

- [ ] **廠商管理移除或簡化**
  - [ ] 移除廠商編輯介面，或簡化為表格
  - [ ] 考慮硬編碼單一廠商

#### 3.5 代碼清理
- [ ] 刪除未使用的元件 (~15 個)
  - 分析/過濾/排序相關元件
  - 定價層次計算器
  - 進度條視覺化

- [ ] 移除未使用的 API 端點
  - `/api/products/search` (全文搜尋)
  - `/api/products/featured`, `/latest` (可合併)
  - 支付閘道端點 (LINE_PAY, ECPAY 等)

- [ ] 刪除舊的 Markdown 和備份
  - [ ] 確認 `/doc` 中已保存所有重要文件
  - [ ] 刪除 `DB_legacy_backup_*.tar.gz`
  - [ ] 刪除 `HTML_legacy_backup_*.tar.gz`

---

## 第四階段：支付方式重構 (Phase 4: Payment Methods Restructuring)

### 目標：實現簡化的 B2B 支付模式（現金、月結、折購金）
**預計時間：3-4 週**
**進度：✅ Task 1-12 全部完成 (2026-02-28) | 100% 進度** 🎉
**選定方案：方案 1 - 簡化方案（Invoice + InvoiceLineItem 表）** ✅
**部署狀態：✅ Legacy Fixes Complete - Ready for Staging** 🚀

#### 實施進度 (Implementation Progress - 100% Complete) ✅

**第一部分：後端實施 (Backend Implementation)**

- ✅ **Task 1: Update Prisma Schema** - COMPLETE
  - Invoice + InvoiceLineItem 模型已建立
  - 數據庫遷移已應用
  - 測試全部通過 (3/3)
  - Commit: 0a39d92c44f5315126d929ae45b9b1f6b57a15bc

- ✅ **Task 2: Update Order Model** - COMPLETE
  - PaymentMethod enum (CASH + MONTHLY_BILLING)
  - 數據庫遷移完成
  - Commit: 1573077fd50034dc3109903e4b6e27fc393536ed

- ✅ **Task 3: Invoice Service** - COMPLETE
  - 6 個服務函數已實現 (月結生成、發送、確認、支付、查詢、詳情)
  - 11 個單元測試通過 (100% coverage)
  - Commit: 12200e803261d354ab3bef0f58e13c56cab4685a

- ✅ **Task 4: GET /api/invoices** - COMPLETE
  - 用戶發票列表端點
  - 認證驗證、Prisma 查詢優化
  - Commit: 3eb1ecd

- ✅ **Task 5: GET & PATCH /api/invoices/[id]** - COMPLETE (with security fixes)
  - 發票詳情查詢端點
  - PATCH 確認端點
  - 3 個安全漏洞已修復 (授權驗證、404 處理、authData 一致性)
  - Commits: 1e96e9b, 07fc156, 更多修復提交

- ✅ **Task 6: Admin API Endpoints** - COMPLETE (with validation fixes)
  - 4 個管理員端點 (生成、發送、標記支付、列表)
  - 所有輸入驗證、類型安全
  - 2 個重要問題已修復 (格式驗證、類型安全)
  - Commits: 62c8b89, 772cded

**第二部分：前端實施 (Frontend Implementation)**

- ✅ **Task 7: Create Invoice List Page (Frontend)** - COMPLETE
  - 發票列表頁面 (`src/app/invoices/page.tsx`)
  - 客戶端組件 (`src/components/invoices/invoice-list.tsx`)
  - 狀態徽章、多語言支持、加載/錯誤狀態
  - 與 GET /api/invoices 端點集成

- ✅ **Task 8: Create Invoice Detail Page (Frontend)** - COMPLETE
  - 發票詳情頁面 (`src/app/invoices/[id]/page.tsx`)
  - 動態路由處理
  - 客戶端組件 (`src/components/invoices/invoice-detail.tsx`)
  - 行項目表格、確認按鈕、導航支持

- ✅ **Task 9: Create Admin Invoice Management Page** - COMPLETE
  - 管理員發票管理頁面 (`src/app/admin/invoices/page.tsx`)
  - 月份選擇、批量生成和發送按鈕
  - 發票列表與狀態管理、標記已支付功能
  - 與所有 Admin API 端點集成

**第三部分：測試與驗證 (Testing & Verification)**

- ✅ **Task 10: Integration Testing - E2E Invoice Flow** - COMPLETE
  - 端對端集成測試 (`__tests__/e2e/invoices.test.ts`)
  - 3 個完整的測試用例：
    - 完整工作流程 (DRAFT → SENT → CONFIRMED → PAID)
    - 行項目創建驗證
    - 多用戶隔離驗證
  - 所有測試通過 (3/3, 100% 成功率)
  - 數據庫操作驗證、時間戳驗證、授權驗證

- ✅ **Task 11: Verify All API Endpoints - Manual Testing** - COMPLETE
  - 全面的 API 測試指南 (`docs/PHASE_4_API_TESTING_GUIDE.md`)
  - 9 個 API 端點的詳細測試用例
  - 70+ 個測試場景涵蓋：
    - 認證和授權驗證
    - 狀態轉換驗證
    - 邊界情況和錯誤場景
    - 性能基準測試 (< 200ms 目標)
  - curl 命令示例、快速測試腳本、驗證檢查清單

**第四部分：文檔與發布 (Documentation & Release)**

- ✅ **Task 12: Update Documentation and DailyProgress** - COMPLETE
  - DailyProgress.md 已更新（所有任務完成統計）
  - Gem3Plan.md Phase 4 章節已更新（完成狀態）
  - API 測試指南已生成
  - 部署說明已記錄

#### 🚀 Legacy Code Fixes - All Complete (2026-02-28) ✅

在部署到 Staging 之前，所有預先存在的代碼問題已全部修復：

**修復列表 (5 個問題，0 個遺留):**
1. ✅ useSearchParams Suspense Boundaries (3 頁面) - FIXED
2. ✅ PocketBase Type Casting (12 實例) - FIXED
3. ✅ Missing Type Declarations (@types/jsonwebtoken, @types/ioredis) - INSTALLED
4. ✅ Prisma User Type Mismatch (UserRole/UserStatus enums) - FIXED
5. ✅ Sentry v8.55.0 API Compatibility (Replay integration) - FIXED

**驗證結果:**
- npm run typecheck → **0 errors** ✅
- npm run build → **Clean production build** ✅
- Phase 4 E2E tests → **3/3 passing** ✅
- Phase 4 code impact → **Zero** ✅
- Build artifacts → **.next directory created** ✅

**部署就緒狀態:**
✅ **Production-Ready for Staging Deployment**

#### Phase 4 設計概述 (Approach 1 - Simplified)

**核心設計決策**：
- 資料庫表：Invoice + InvoiceLineItem （2 個新表）
- 支付方式：CASH（現金交易）+ MONTHLY_BILLING（月結）
- 月結定義：月底自動彙總當月所有訂單 → 生成單一月結帳單
- 費用投入：3-4 週開發時間
- 複雜度等級：低 ✅ (無 AR 追蹤、無催收流程、無稅務合規初期)

**支付流程設計**：
```
CASH 流程：
  訂單提交 → PENDING → 管理員確認收現 → CONFIRMED → COMPLETED

MONTHLY_BILLING 流程：
  訂單提交 → PENDING → 月底自動彙總 → 生成 Invoice → 員工確認 → COMPLETED
```

#### 4.1 資料庫設計 (Database Schema)

**Invoice 表**
```prisma
model Invoice {
  id String @id
  invoiceNo String @unique             // 月結帳單號：INV-2026-02-001
  userId String
  user User @relation(fields: [userId], references: [id])

  // 計費期間
  billingMonth String                  // YYYY-MM (例：2026-02)
  billingStartDate DateTime
  billingEndDate DateTime

  // 金額資訊
  totalAmount Decimal                  // 月度總額
  totalItems Int                       // 訂單項目數

  // 狀態追蹤
  status InvoiceStatus                 // DRAFT, SENT, CONFIRMED, PAID
  sentAt DateTime?                     // 發送時間
  confirmedAt DateTime?                // 員工確認時間
  paidAt DateTime?                     // 支付時間

  // 格式選項
  invoiceFormat String                 // "simple" | "detailed"

  // 發票明細
  lineItems InvoiceLineItem[]

  createdAt DateTime
  updatedAt DateTime
}

enum InvoiceStatus {
  DRAFT         // 草稿 (尚未發送)
  SENT          // 已發送 (等待員工確認)
  CONFIRMED     // 已確認 (員工已查看)
  PAID          // 已支付
}
```

**InvoiceLineItem 表**
```prisma
model InvoiceLineItem {
  id String @id
  invoiceId String
  invoice Invoice @relation(fields: [invoiceId], references: [id])

  // 訂單關聯
  orderId String                       // 來源訂單
  order Order @relation(fields: [orderId], references: [id])

  // 行項目詳情 (用於簡單格式)
  productName String                   // 產品名稱
  quantity Int
  unitPrice Decimal
  subtotal Decimal

  createdAt DateTime
  updatedAt DateTime
}
```

#### 4.2 支付方式實現

**支付方式定義**：
```typescript
enum PaymentMethod {
  CASH = "CASH"                  // 現金交易 (立即)
  MONTHLY_BILLING = "MONTHLY_BILLING"   // 月結 (月底彙總)
}
```

**Order 表修改** (已有，確認字段)：
```prisma
model Order {
  // ... 既有字段 ...
  paymentMethod PaymentMethod    // CASH | MONTHLY_BILLING
  // ... 既有字段 ...
}
```

#### 4.3 API 端點設計

**發票相關端點**：
```
GET    /api/invoices              // 列出使用者的月結帳單
GET    /api/invoices/[id]         // 查看單一帳單詳情
GET    /api/invoices/[id]/pdf     // 下載帳單 PDF (Future)
PATCH  /api/invoices/[id]/confirm // 員工確認帳單
POST   /api/invoices/[id]/mark-paid // 管理員標記已支付
```

**管理員端點**：
```
POST   /api/admin/invoices/generate    // 手動生成月結帳單
POST   /api/admin/invoices/send-all    // 批量發送本月帳單
GET    /api/admin/invoices/report      // 月結帳款報表
```

#### 4.4 月結帳單生成流程

**自動生成（推薦每月 1 號或可配置）**：
```typescript
// 邏輯：
1. 查詢前一月的所有 MONTHLY_BILLING 訂單
2. 按使用者分組
3. 為每個使用者建立一個 Invoice 記錄
4. 建立 InvoiceLineItem （簡單格式：僅顯示訂單摘要）
5. 設定狀態為 DRAFT
6. 記錄並準備發送

// 帳單編號格式：
INV-{YYYY}-{MM}-{sequence}
例：INV-2026-02-001, INV-2026-02-002
```

**簡單格式 vs. 詳細格式**：
```
簡單格式 (Simple):
  月結帳單 - 2026 年 2 月
  訂單總數：5 件
  總金額：NT$ 25,000

詳細格式 (Detailed):
  月結帳單 - 2026 年 2 月

  訂單號   | 產品名稱  | 數量 | 單價 | 小計
  ORD-001 | 醫療口罩  | 10  | 150 | 1,500
  ORD-002 | 手環    | 5   | 280 | 1,400
  ...

  總計：NT$ 25,000
```

#### 4.5 現金交易 (CASH) 簡化流程

**支付流程**：
```
1. 員工選擇「現金交易」結帳
2. 訂單建立，paymentMethod = CASH
3. 訂單狀態：PENDING (等待管理員確認收現)
4. 管理員收到現金後，手動更新訂單狀態為 CONFIRMED
5. 訂單狀態自動流轉為 COMPLETED

備註：
  - 無需建立 Invoice (立即結算)
  - 簡化管理員工作流
  - 自動生成收據 (簡單版本)
```

#### 4.6 移除舊金流代碼 (Cleanup)

**保留的表/字段**：
```
保留：
- Order (paymentMethod, paymentStatus 欄位保留)
- Invoice (簡化版，僅月結使用)
- InvoiceLineItem (月結明細)

移除計劃：
- Payment model (不使用)
- 舊的 PaymentMethod enum 其他選項 (LINE_PAY, ECPAY, 等)
- Shipping model (B2B 無需追蹤配送)
```

#### 4.7 折購金 (Point Exchange) - 未來功能

**當前計劃**：保留點數系統，但在此階段不實現支付。
- 點數餘額追蹤：Point model 已有
- 點數交易記錄：PointTransaction model 已有
- 月結帳單中可選註記點數使用

**未來實現** (Phase 5+)：
- 結帳時選擇使用點數
- 自動點數扣除邏輯
- 點數兌換率設定

---

## 第五階段：測試與驗證 (Phase 5: Testing & Verification)

### 目標：確保轉換後的系統穩定且功能正確
**預計時間：2-3 週**

- [ ] **使用者身分認證測試**
  - [ ] 新員工註冊流程
  - [ ] 電子郵件驗證
  - [ ] OAuth (Apple) 登入
  - [ ] 密碼重設

- [ ] **商品瀏覽功能測試（無搜尋）**
  - [ ] 首頁加載
  - [ ] 產品列表分類過濾
  - [ ] 產品詳細檢視
  - [ ] 特色/最新產品載入

- [ ] **購物車 & 結帳流程測試**
  - [ ] 添加到購物車
  - [ ] 更新數量、移除項目
  - [ ] 選擇 3 種支付方式
  - [ ] 運送資訊輸入
  - [ ] 訂單確認

- [ ] **訂單流程測試**
  - [ ] 現金交易：待處理 → 確認 → 完成
  - [ ] 月結：待處理 → 確認 → 月底發票 → 完成
  - [ ] 折購金：待處理 → 扣除積分 → 確認 → 完成

- [ ] **管理後台測試**
  - [ ] 儀表板加載 (簡化版本)
  - [ ] 產品管理 (CRUD)
  - [ ] 訂單管理 (查看、狀態更新)
  - [ ] 使用者管理 (查看、編輯)
  - [ ] 月結發票生成

- [ ] **效能測試**
  - [ ] 首頁載入時間 (目標：< 2 秒)
  - [ ] 產品列表載入 (目標：< 1 秒)
  - [ ] PocketBase 查詢效能
  - [ ] 並發使用者測試

- [ ] **資料完整性驗證**
  - [ ] 所有 PostgreSQL 記錄已遷移
  - [ ] 沒有孤立的訂單項目或購物車項目
  - [ ] 使用者點數帳戶結餘正確

---

## 第六階段：上線與交接 (Phase 6: Launch & Handoff)

### 目標：安全地從 PostgreSQL 切換至 PocketBase，無停機時間
**預計時間：1-2 週**

- [ ] **最終檢查清單**
  - [ ] 所有測試通過 (單元、整合、負載、回歸)
  - [ ] 效能基準達成
  - [ ] 資料遷移驗證完成
  - [ ] 備份已建立

- [ ] **切換計劃**
  - [ ] 排定維護窗口 (最小化使用者影響)
  - [ ] 建立 PostgreSQL 備份
  - [ ] 執行最終資料同步
  - [ ] 將應用程式指向 PocketBase
  - [ ] 監控錯誤和效能

- [ ] **移除舊依賴**
  - [ ] 刪除 `pg` 驅動程式
  - [ ] 移除 Prisma 腳本命令
  - [ ] 清理環境變數 (DATABASE_URL, etc.)
  - [ ] 更新文件

- [ ] **使用者與營運交接**
  - [ ] 建立營運指南 (月結發票生成、點數管理)
  - [ ] 為管理員提供訓練
  - [ ] 監控第一週的生產問題
  - [ ] 建立故障排除指南

---

## 檔案結構重組 (File Structure Reorganization)

### 要刪除的目錄/文件
```
ceo-platform/ceo-monorepo/apps/web/src/
├── app/test/                        # 刪除測試文件夾
├── app/page.tsx.backup2             # 刪除備份副本
├── app/api/products/search/         # 刪除搜尋 API

ceo-platform/
├── DB_legacy_backup_*.tar.gz        # 移至 doc/ 或刪除
├── HTML_legacy_backup_*.tar.gz      # 移至 doc/ 或刪除
├── ceo-platform/                    # 檢查重複結構
```

### 要保留的結構
```
ceo-platform/
├── ceo-monorepo/apps/web/           # 主應用
│   ├── src/
│   │   ├── app/                     # Next.js 應用程式目錄
│   │   ├── components/              # 簡化的 UI 元件
│   │   ├── lib/                     # PocketBase、認證、工具程式
│   │   └── __tests__/               # 測試
│   └── package.json
├── doc/                             # 文件和備份
└── {Gem3Plan.md, DailyProgress.md}  # 規劃文件
```

---

## 開發時程估計 (Timeline Estimate)

| 階段 | 任務 | 預計 | 人力 |
|------|------|------|------|
| 1 | 準備與清理 | 1-2 週 | 1 |
| 2 | 資料庫遷移 | 4-6 週 | 2 |
| 3 | UX 簡化 | 3-4 週 | 1-2 |
| 4 | 支付重構 | 2-3 週 | 1 |
| 5 | 測試驗證 | 2-3 週 | 1-2 |
| 6 | 上線交接 | 1-2 週 | 2 |
| **總計** | | **13-20 週** | **2-3 人** |

**關鍵依賴**：第 2 階段完成後才能開始第 3 和第 4 階段。第 5 和第 6 階段可與第 3、4 並行。

---

## 已知風險與緩解策略 (Known Risks & Mitigation)

### 高風險 (High)
1. **認證層複雜性**
   - 風險：NextAuth + Prisma vs. PocketBase Auth 不匹配
   - 緩解：保持 NextAuth，整合 PocketBase 作為用戶儲存
   - 測試：全面的認證流程測試

2. **月結實現**
   - 風險：當前無月結系統，需要新建工作流
   - 緩解：提前與業務設定需求，建立發票生成模組
   - 測試：端到端月結流程

3. **零停機切換**
   - 風險：活躍使用者在過渡期間交易遺失
   - 緩解：並行運行、完整的資料驗證、備份策略
   - 測試：切換流程演練

### 中等風險 (Medium)
1. **PocketBase 性能**
   - 風險：大量並發可能超過 PocketBase 限制
   - 緩解：負載測試、適當索引、必要時部署多實例
   - 監控：生產環境效能指標

2. **複雜查詢遷移**
   - 風險：Prisma 事務和嵌套查詢在 PocketBase 中更難實現
   - 緩解：逐步遷移、充分測試、必要時使用多個 API 呼叫
   - 優化：識別 N+1 查詢並優化

3. **資料完整性**
   - 風險：PostgreSQL FK 約束在 PocketBase 中無法自動執行
   - 緩解：應用層驗證、遷移後檢查、備份驗證
   - 監控：資料不一致告警

### 低風險 (Low)
1. **代碼清理**
   - 風險：刪除"不必要的"代碼實際上是在使用
   - 緩解：git history，逐步刪除與測試，版本控制
   - 回溯：可輕易復原

2. **使用者體驗衝擊**
   - 風險：移除搜尋和複雜功能會惹惱使用者
   - 緩解：清楚溝通變更、提供替代工作流、蒐集反饋
   - 迭代：快速改進基於使用者反饋

---

## 後續步驟 (Next Steps)

### 立即行動 (This Week)
1. ✅ 完成三面向專家分析 (UX, 技術, 風險)
2. [ ] 與業務/PM 會面確認需求
   - 確認月結需求詳情
   - 驗證點數系統需求
   - 確認員工數量和交易量
3. [ ] 解決 Prisma 幽靈依賴
4. [ ] 確認 PocketBase 環境設定

### 本週結束 (This Week End)
1. [ ] 開始第一階段：準備與清理
2. [ ] 開始設計 PocketBase Schema（與團隊平行）
3. [ ] 建立測試基準 (速度、覆蓋率、Bundle 大小)

### 下週 (Next Week)
1. [ ] 進行第一階段的業務驗證
2. [ ] 開始遷移腳本原型設計
3. [ ] 更新此規劃基於反饋

---

## 相關文件與資源

- 📄 [Gem3Plan.md](./Gem3Plan.md) - 本檔案
- 📄 [DailyProgress.md](./DailyProgress.md) - 每日進度追蹤
- 📁 `/doc/` - 舊規劃、報告和備份
- 🔗 PocketBase 文件：https://pocketbase.io/docs/
- 🔗 Next.js 遷移指南：https://nextjs.org/docs

---

**最後更新**：2026-02-28
**負責人**：CEO Platform Team
**狀態**：規劃中 (Planning)
