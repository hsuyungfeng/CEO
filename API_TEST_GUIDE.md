# CEO 電商平台 - API 測試指南

## 快速開始

### 啟動開發環境

```bash
cd ceo-monorepo/apps/web
pnpm dev
```

伺服器將在 `http://localhost:3000` 啟動

---

## API v1 端點列表

### 📍 基礎端點

| 方法 | 端點 | 功能 | 認證 | 狀態 |
|-----|------|------|------|------|
| GET | `/api/v1/health` | 健康檢查 | ❌ | ✅ |
| GET | `/api/v1/home` | 首頁數據 | ❌ | ✅ |

### 📦 分類與產品

| 方法 | 端點 | 功能 | 認證 | 狀態 |
|-----|------|------|------|------|
| GET | `/api/v1/categories` | 分類列表（三級樹狀） | ❌ | ✅ |
| GET | `/api/v1/products` | 產品列表 | ❌ | ✅ |
| GET | `/api/v1/products?search=體溫` | 搜尋產品 | ❌ | ✅ |
| GET | `/api/v1/products?categoryId={id}` | 按分類篩選 | ❌ | ✅ |

### 🏢 供應商管理

| 方法 | 端點 | 功能 | 認證 | 狀態 |
|-----|------|------|------|------|
| GET | `/api/v1/suppliers` | 供應商列表 | ❌ | ✅ |
| POST | `/api/v1/suppliers` | 供應商註冊 | ❌ | ✅ |
| GET | `/api/v1/supplier-applications` | 申請列表 | ✅ | ✅ |
| GET | `/api/v1/supplier-applications/{id}` | 申請詳情 | ✅ | ✅ |

### 👤 用戶與訂單

| 方法 | 端點 | 功能 | 認證 | 狀態 |
|-----|------|------|------|------|
| GET | `/api/v1/user/profile` | 用戶信息 | ✅ | ✅ |
| GET | `/api/v1/orders` | 訂單列表 | ✅ | ⚠️ |

---

## 測試示例

### 健康檢查

```bash
curl http://localhost:3000/api/v1/health | jq
```

**預期響應**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "database": { "status": "healthy" },
    "uptime": 123.45
  }
}
```

---

### 獲取分類列表

```bash
curl http://localhost:3000/api/v1/categories | jq
```

**預期響應** (無分類時):
```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

---

### 獲取產品列表

```bash
curl http://localhost:3000/api/v1/products | jq
```

**預期響應**:
```json
{
  "success": true,
  "data": [
    {
      "id": "prod-123",
      "name": "體溫槍",
      "price": "1200",
      "priceTiers": [
        { "minQty": 1, "price": "1200" },
        { "minQty": 15, "price": "1050" },
        { "minQty": 30, "price": "900" }
      ],
      "currentGroupBuyQty": 0,
      "qtyToNextTier": 15,
      "isGroupBuyActive": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

---

### 搜尋產品

```bash
curl "http://localhost:3000/api/v1/products?search=體溫" | jq
```

---

### 獲取供應商列表

```bash
curl http://localhost:3000/api/v1/suppliers | jq
```

---

## 前端頁面測試

### 無需登入的頁面

```bash
# 首頁
curl -I http://localhost:3000/

# 搜尋頁面
curl -I http://localhost:3000/search

# 管理後台（重定向到登入）
curl -I http://localhost:3000/admin
```

---

## 常見問題

### Q: API 返回 404
**A**: 確保：
1. 開發伺服器正在運行 (`pnpm dev`)
2. 使用正確的端點路徑 (`/api/v1/...`)
3. 檢查路由文件是否存在

### Q: API 返回 401
**A**: 此端點需要授權。需要：
1. 先行登入
2. 獲取有效的 session token
3. 在 Cookie 中發送 token

### Q: 分類列表為空
**A**: 需要先將分類數據添加到資料庫。詳見 `seed.ts`

### Q: 產品列表有數據但沒有價格
**A**: 檢查 `priceTiers` 是否正確關聯

---

## 性能測試

### 獲取 10 個產品

```bash
curl "http://localhost:3000/api/v1/products?limit=10" | jq '.data | length'
```

### 分頁測試

```bash
# 第 2 頁
curl "http://localhost:3000/api/v1/products?page=2&limit=10" | jq '.pagination'

# 應返回: { "page": 2, "limit": 10, "total": 5, ... }
```

---

## 已知限制

1. **分類列表**: 當前資料庫中無分類數據
2. **訂單 API**: 需要有效的用戶授權和 session
3. **集購數量**: 基於當前時間範圍內的訂單計算

---

## 更新日期

- **2026-03-13** - 修復供應商 API，新建分類和產品 API
- **2026-03-12** - 初期測試完成

---

## 相關文檔

- 📄 [TEST_REPORT.md](./TEST_REPORT.md) - 初期測試報告
- 📄 [FINAL_TEST_REPORT.md](./FINAL_TEST_REPORT.md) - 最終測試報告

