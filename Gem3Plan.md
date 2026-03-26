# CEO 平台 Sprint 2 (P1) 計劃 - 2026-03-18 | 完成 ✅ (2026-03-26)

## 📋 目標 ✅ 完成

實裝 4 個關鍵缺失界面，完成平台核心管理功能：

| 優先級 | 功能 | API | 狀態 | 完成時間 |
|--------|------|-----|------|--------|
| 1 | `/admin/suppliers` - 供應商管理 | ✅ `/api/suppliers` | ✅ 完成 | 15:10 |
| 2 | `/supplier/orders` - 訂單查看 | ✅ `/api/supplier/orders` (新建) | ✅ 完成 | 15:12 |
| 3 | `/admin/groups` - 團購管理 | ✅ `/api/admin/groups` | ✅ 完成 | 15:14 |
| 4 | `/admin/orders/pending` - 確認邏輯 | ✅ `PATCH /api/orders/[id]` | ✅ 完成 | 15:15 |

---

## 🎯 Sprint 2.1: `/admin/suppliers` 供應商管理界面

### 功能需求
- 列表展示：所有供應商（分頁、搜尋、狀態過濾）
- 狀態標籤：PENDING（待審核）/ ACTIVE（已啟用）/ SUSPENDED（已停用）/ REJECTED（已拒絕）
- 審核操作：
  - 「審核」按鈕 → 呼叫 `POST /api/suppliers/[id]/verify` → 狀態變更
  - 「暫停」按鈕 → 暫停供應商
  - 「查看」按鈕 → 供應商詳情頁面
- 供應商詳情：基本資訊、聯絡方式、帳戶餘額

### API 調用
```typescript
// GET /api/suppliers?status=PENDING&page=1&limit=20
// POST /api/suppliers/{id}/verify (審核通過)
// POST /api/suppliers/{id}/suspend (暫停)
```

### 頁面結構
```
/admin/suppliers
├── page.tsx (列表頁)
├── [id]
│   └── page.tsx (詳情頁)
└── components/
    ├── suppliers-table.tsx
    ├── supplier-filter.tsx
    └── verify-dialog.tsx
```

### 預計工作量
- 1.5 小時（含元件開發、API 整合、樣式）

---

## 🎯 Sprint 2.2: `/supplier/orders` 供應商訂單界面

### 功能需求
- 列表展示：屬於該供應商的訂單
- 訂單資訊：訂單號、商品、數量、金額、狀態、日期
- 篩選條件：日期範圍、狀態（PENDING/CONFIRMED/SHIPPED/COMPLETED）
- 操作：點擊查看訂單詳情

### API 調用
```typescript
// GET /api/supplier/reports/sales (當前已有)
// 需要擴充：回傳訂單詳情而非僅統計
// GET /api/orders?supplierId={id} (可能需要新建)
```

### 頁面結構
```
/supplier/orders
├── page.tsx (列表頁)
├── [id]
│   └── page.tsx (訂單詳情)
└── components/
    ├── supplier-orders-table.tsx
    └── order-status-badge.tsx
```

### 預計工作量
- 1 小時

---

## 🎯 Sprint 2.3: `/admin/groups` 團購管理界面

### 功能需求
- 列表展示：進行中/已完成的團購
- 團購資訊：名稱、成員數、折扣層級、狀態、結算日期
- 結算操作：
  - 「結算」按鈕 → 呼叫 `POST /api/admin/groups/{id}/finalize`
  - 確認結算（計算折扣、產生發票）
- 團購詳情：成員列表、訂單統計、折扣計算

### API 調用
```typescript
// GET /api/admin/groups
// POST /api/admin/groups/{id}/finalize
// GET /api/admin/groups/{id}
```

### 折扣層級（GROUP_DISCOUNT_TIERS）
```typescript
1-99 件：0%
100-499 件：5%
500+ 件：10%
```

### 頁面結構
```
/admin/groups
├── page.tsx (列表頁)
├── [id]
│   └── page.tsx (詳情頁)
└── components/
    ├── groups-table.tsx
    ├── finalize-dialog.tsx
    └── discount-calculator.tsx
```

### 預計工作量
- 1.5 小時

---

## 🎯 Sprint 2.4: `/admin/orders/pending` 確認/拒絕邏輯

### 功能需求
- 頁面已存在，但 TODO 佔位符未實作
- 待處理訂單列表（5 個待確認）
- 操作：
  - 「確認」按鈕 → `PATCH /api/orders/{id}` `{ status: 'CONFIRMED' }`
  - 「拒絕」按鈕 → 呼叫 rejection API（如果存在）
- 操作後自動重新載入列表

### API 調用
```typescript
// PATCH /api/orders/{id}
// Body: { status: 'CONFIRMED' | 'CANCELLED' }
```

### 頁面結構
```
/admin/orders/pending/page.tsx
└── components/
    ├── pending-orders-table.tsx
    └── confirm-dialog.tsx
```

### 預計工作量
- 0.5 小時

---

## 📅 時間表 ✅ 完成

| 時間 | 任務 | 狀態 | 實際完成 |
|------|------|------|--------|
| 14:30-14:40 | `/admin/suppliers` 頁面 + API 整合 | ✅ | 14:40 |
| 14:40-14:50 | `/supplier/orders` 頁面 + API 整合 | ✅ | 14:50 |
| 14:50-15:10 | `/admin/groups` 頁面 + API 整合 | ✅ | 15:10 |
| 15:10-15:15 | `/admin/orders/pending` 邏輯實作 | ✅ | 15:15 |
| 15:15-15:30 | API Schema Bug Fix + Build 驗證 | ✅ | 15:30 |

---

## 🔧 技術決策

### 元件複用
- 使用 shadcn/ui Table 組件建立列表
- 使用 Dialog 組件建立確認/操作對話框
- 參考 AdminSidebar 的結構

### API 呼叫模式
- Client-side fetch（useEffect + useState）
- error handling + loading 狀態
- 成功後自動重新整理列表

### 類型安全
- 完整 TypeScript interfaces
- 參考現有 API 回應格式

---

## ✅ 完成條件 (全數達成)

### Per 功能 ✅
1. ✅ 頁面建立（layouts + pages）
2. ✅ API 整合完成
3. ✅ 操作邏輯實作
4. ✅ 錯誤處理
5. ✅ 型別定義完整
6. ✅ Build 成功

### 整體 ✅
- ✅ 所有 4 個頁面完成
- ✅ Admin sidebar 更新導航入口（2 次）
- ✅ 無 TypeScript 錯誤
- ✅ 提交至 git (2 commits)
- ✅ API Schema Bug 診斷並修復
- ✅ 運行時驗證通過

---

## 📝 備註

- API 端點已驗證存在且可用
- 參考已完成的頁面結構（/admin/members、/admin/products）
- 優先完成 `/admin/suppliers`，因為供應商審核是核心業務流程

---

## ✅ Phase 15 後續行動（2026-03-26）

Sprint 2 (P1) 已完成，後續聚焦 Phase 15 (3D 整合)：

### 已交付 (Phase 15)
- ✅ Python TRELLIS.2 微服務框架
- ✅ Bull Queue + Worker 非同步處理
- ✅ 2 個新 API 端點 + 11 個 E2E 測試
- ✅ Prisma 數據模型擴展 (3 個新模型)
- ✅ 完整授權與審計日誌

### 下一階段 (Phase 16-17)
- 3D 前端整合 (Three.js 查看器)
- 產品詳情頁面增強
- 性能優化與 CDN 部署

