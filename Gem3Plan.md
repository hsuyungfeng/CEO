# Gem3 計劃 (Gem3 Plan) - Updated

## 目標 (Goals)

將 `ceo-platform` 轉型為一個輕量級的單一公司 B2B 模板，使用 PocketBase 取代現有的資料庫架構，並移除未使用的功能，如複雜的支付閘道和搜尋功能。

---

## 專案概況 (Project Status)

### 當前狀態 (Current State)
- **混合資料庫狀態 (Hybrid Database)**：同時使用 Prisma + PostgreSQL 和 PocketBase
  - ✅ 6 個路由已使用 PocketBase (cart, orders, products)
  - ⚠️ 41 個路由仍使用 Prisma (admin, auth, public)
  - ⚠️ Prisma 是幽靈依賴 (package.json 中有命令但沒有依賴)

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

## 第二階段：資料庫遷移至 PocketBase (Phase 2: Database Migration)

### 目標：安全地從 PostgreSQL/Prisma 轉換至 PocketBase
**預計時間：4-6 週**

#### 2.1 PocketBase Schema 設計
- [ ] 定義核心集合 (Collections)
  ```
  users
  ├─ id, email, password, taxId, name, firmName, role
  ├─ contactPerson, phone, address, points, status
  └─ createdAt, updatedAt

  products
  ├─ id, name, description, unit, price, image
  ├─ categoryId, firmId, isActive, isFeatured, totalSold
  └─ createdAt, updatedAt

  categories
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
**狀態**：開始分析與設計（2026-02-28）
**複雜度**：高（影響所有 41 個 API 路由）

- [ ] **分析現有認證架構**
  - [ ] 審查 `/src/auth.ts` - NextAuth v5.0.0-beta.30 設定
  - [ ] 審查 `/src/lib/auth-helper.ts` - Bearer Token 驗證邏輯
  - [ ] 識別所有 3 個 Prisma 用戶查詢位置（lines 67, 108, 240）
  - [ ] 記錄當前認證流程（Desktop Session + Mobile JWT）

- [ ] **關鍵決策**：NextAuth + Prisma vs PocketBase Auth
  - **選項 A**：保持 NextAuth，改為透過 PocketBase 驗證用戶（推薦）
    - 優點：最小化改變，保持既有登入流程
    - 缺點：需要 NextAuth ↔ PocketBase 轉換層
  - **選項 B**：完全遷移至 PocketBase Auth
    - 優點：簡化架構
    - 缺點：需要重寫所有認證邏輯
  - [ ] 決定並記錄選擇

- [ ] **重構 `/src/auth.ts`**（根據選擇）
  - [ ] Credentials 登入流程：從 Prisma 改為 PocketBase 查詢
  - [ ] OAuth (Apple) 登入流程：驗證 PocketBase 整合
  - [ ] 2FA/電子郵件驗證流程：確認相容性
  - [ ] 密碼重設流程：測試 useSearchParams Suspense 邊界

- [ ] **更新 `/src/lib/auth-helper.ts`**
  - [ ] 用 PocketBase 取代 3 個 Prisma 查詢（lines 67, 108, 240）
  - [ ] 測試 Bearer Token 驗證（移動應用）
  - [ ] 確認所有受保護的端點仍可工作
  - [ ] 更新類型定義

- [ ] **測試認證層**
  - [ ] 單元測試：各個認證方法
  - [ ] 集成測試：完整登入 → API 呼叫流程
  - [ ] Edge case：過期令牌、無效憑證、並發登入

#### 2.4 逐路由遷移 (低風險優先)
**第一波：已使用 PocketBase 的路由 (驗證)**
- [ ] `/api/cart/[id]` - 已在使用 PocketBase，驗證完整性
- [ ] `/api/orders` - 已在使用 PocketBase，測試創建流程
- [ ] `/api/products/[id]`, `/products/featured`, `/products/latest` - 已在使用，驗證搜尋移除

**第二波：公開路由 (低風險)**
- [ ] `/api/products` - 簡單查詢，移至 PocketBase
- [ ] `/api/categories` - 取代分層查詢
- [ ] `/api/home` - 特色產品、最新產品

**第三波：認證路由 (中等風險)**
- [ ] `/api/auth/login`, `/register` - 用 PocketBase 替換用戶查詢
- [ ] `/api/auth/oauth/*` - OAuth 同步到 PocketBase
- [ ] `/api/auth/email/*` - 電子郵件驗證整合

**第四波：管理路由 (高風險 - 需要事務)**
- [ ] `/api/admin/products` - 複雜事務 (product + price tiers)
- [ ] `/api/admin/orders` - 訂單 + 項目關係
- [ ] `/api/admin/users` - 用戶 + 點數交易 + 日誌
- [ ] `/api/admin/categories` - 分層類別

#### 2.5 完整性測試
- [ ] 單元測試：每個遷移路由的查詢邏輯
- [ ] 集成測試：完整的訂購流程 (購物車 → 結帳 → 確認)
- [ ] 負載測試：PocketBase 可以處理同時請求？
- [ ] 回歸測試：現有功能是否破裂？

---

## 第三階段：UX 簡化與前端清理 (Phase 3: UX Simplification & Frontend Cleanup)

### 目標：移除不必要的 B2C 功能，優化 B2B 介面
**預計時間：3-4 週**

#### 3.1 移除搜尋與簡化分類
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
**預計時間：2-3 週**

#### 4.1 支付方式設計
**當前狀態**：Prisma schema 定義了 5 種方式 (CREDIT_CARD, LINE_PAY, TAIWAN_PAY, ATM, COD)，但無實現

**簡化目標**：
```
PaymentMethod:
- CASH (現金交易)
- MONTHLY_BILLING (月結)
- DISCOUNT_POINTS (折購金補回)
```

#### 4.2 月結 (Monthly Billing) 實現
- [ ] **月結流程設計**
  - 員工選擇 "月結" 作為付款方式
  - 訂單狀態：PENDING → CONFIRMED → COMPLETED
  - 月底生成發票 (自動或手動)
  - 發票發送至員工電子郵件

- [ ] **逾期提醒工作流**
  - 月結應付日設定 (例：月底後 15 天)
  - 自動提醒電子郵件 (未支付)
  - 管理員可手動標記為已支付

- [ ] **發票生成與合規**
  - 使用 PocketBase 存儲發票資料
  - 發票編號生成邏輯
  - 臺灣稅務合規 (taxId, invoiceNumber, carrierType)
  - PDF 生成與發送

#### 4.3 折購金 (Discount Points) 實現
- [ ] **點數帳戶管理**
  - 每位員工有點數餘額
  - 可查看點數用途歷史記錄

- [ ] **點數兌換流程**
  - 定義點數兌換率 (例：1 點 = 1 元)
  - 結帳時選擇使用點數
  - 自動扣除、記錄交易

- [ ] **點數補回政策**
  - 定義如何補充點數 (手動或自動)
  - 是否有點數過期規則
  - 審計追蹤

#### 4.4 現金交易 (Cash)
- [ ] **簡單流程**
  - 訂單狀態始終為 PENDING (直到收到現金)
  - 管理員手動標記為 CONFIRMED (已收現金)
  - 自動生成收據

#### 4.5 移除舊金流代碼
- [ ] 從 Prisma schema 刪除未使用的支付模型
  - `Payment`, `PaymentMethod` 其他選項
  - `Invoice` 簡化 (保留基本字段)
  - `Shipping` 簡化或刪除 (B2B 可能不需要追蹤)

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
