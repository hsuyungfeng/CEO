# 管理員訂單 API 實現文檔

## 概述
已成功實現 CEO 團購電商平台的管理員訂單 API，包含完整的 CRUD 操作和權限驗證。

## 實現的 API 端點

### 1. GET `/api/admin/orders`
**功能**: 獲取所有訂單列表（管理員專用）
**權限要求**: ADMIN 或 SUPER_ADMIN
**查詢參數**:
- `page` (可選): 頁碼，默認 1
- `limit` (可選): 每頁數量，默認 20，最大 100
- `search` (可選): 搜尋關鍵字（訂單編號、用戶名稱、用戶 email）
- `status` (可選): 訂單狀態篩選 (PENDING, CONFIRMED, SHIPPED, COMPLETED, CANCELLED)
- `userId` (可選): 用戶 ID 篩選
- `startDate` (可選): 開始時間 (ISO 格式)
- `endDate` (可選): 結束時間 (ISO 格式)
- `sortBy` (可選): 排序欄位 (createdAt, updatedAt, totalAmount)，默認 createdAt
- `sortOrder` (可選): 排序方向 (asc, desc)，默認 desc

**響應格式**:
```json
{
  "success": true,
  "data": [
    {
      "id": "訂單ID",
      "orderNo": "訂單編號",
      "status": "訂單狀態",
      "totalAmount": "總金額",
      "note": "備註",
      "pointsEarned": "獲得點數",
      "createdAt": "建立時間",
      "updatedAt": "更新時間",
      "user": {
        "id": "用戶ID",
        "name": "用戶名稱",
        "email": "用戶email",
        "phone": "電話",
        "taxId": "統編"
      },
      "itemCount": "商品數量",
      "items": [...]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### 2. GET `/api/admin/orders/[id]`
**功能**: 獲取訂單詳情（管理員專用）
**權限要求**: ADMIN 或 SUPER_ADMIN
**路徑參數**: `id` - 訂單 ID

**響應格式**:
```json
{
  "success": true,
  "data": {
    "id": "訂單ID",
    "orderNo": "訂單編號",
    "status": "訂單狀態",
    "totalAmount": "總金額",
    "note": "備註",
    "pointsEarned": "獲得點數",
    "createdAt": "建立時間",
    "updatedAt": "更新時間",
    "user": {
      "id": "用戶ID",
      "name": "用戶名稱",
      "email": "用戶email",
      "taxId": "統編",
      "phone": "電話",
      "fax": "傳真",
      "address": "地址",
      "contactPerson": "聯絡人",
      "role": "角色",
      "status": "狀態"
    },
    "items": [
      {
        "id": "訂單項目ID",
        "productId": "商品ID",
        "productName": "商品名稱",
        "productSubtitle": "商品副標題",
        "productImage": "商品圖片",
        "productUnit": "商品單位",
        "productSpec": "商品規格",
        "firm": "廠商資訊",
        "category": "分類資訊",
        "quantity": "數量",
        "unitPrice": "單價",
        "subtotal": "小計"
      }
    ]
  }
}
```

### 3. PATCH `/api/admin/orders/[id]`
**功能**: 更新訂單狀態（管理員專用）
**權限要求**: ADMIN 或 SUPER_ADMIN
**路徑參數**: `id` - 訂單 ID
**請求體**:
```json
{
  "status": "新狀態 (PENDING, CONFIRMED, SHIPPED, COMPLETED, CANCELLED)",
  "note": "可選：狀態變更備註"
}
```

**狀態變更規則**:
- PENDING → CONFIRMED, CANCELLED
- CONFIRMED → SHIPPED, CANCELLED
- SHIPPED → COMPLETED
- COMPLETED → (不可變更)
- CANCELLED → (不可變更)

**特殊處理**:
- 當狀態變更為 CANCELLED 時，會自動回補：
  - 商品銷售量
  - 會員點數
  - 會員消費總額

**響應格式**:
```json
{
  "success": true,
  "data": {
    "id": "訂單ID",
    "orderNo": "訂單編號",
    "status": "新狀態",
    "updatedAt": "更新時間"
  },
  "message": "訂單狀態更新成功"
}
```

### 4. DELETE `/api/admin/orders/[id]`
**功能**: 刪除訂單（軟刪除，實際上是取消訂單）
**權限要求**: ADMIN 或 SUPER_ADMIN
**路徑參數**: `id` - 訂單 ID

**限制**:
- 已取消的訂單不能刪除
- 已完成的訂單不能刪除

**處理邏輯**:
1. 將訂單狀態設為 CANCELLED
2. 在訂單備註中添加管理員刪除記錄
3. 回補商品銷售量
4. 回扣會員點數和消費總額

**響應格式**:
```json
{
  "success": true,
  "message": "訂單刪除成功（已取消訂單並回補相關數據）"
}
```

## 技術實現細節

### 1. 權限驗證
- 使用現有的 `requireAdmin()` 函數
- 驗證用戶角色為 ADMIN 或 SUPER_ADMIN
- 統一的錯誤響應格式

### 2. 數據驗證
- 使用 Zod schema 驗證所有輸入
- 統一的錯誤處理和響應格式
- 完整的輸入驗證和錯誤訊息

### 3. 錯誤處理
- 統一的 API 響應格式 (`ApiResponse` 接口)
- 適當的 HTTP 狀態碼
- 詳細的錯誤訊息（開發環境）
- 安全的一般錯誤訊息（生產環境）

### 4. 事務處理
- 狀態變更時使用 Prisma 事務
- 確保數據一致性
- 特別是在取消訂單時的回補操作

### 5. 安全性
- 管理員權限驗證
- 輸入數據驗證
- SQL 注入防護（通過 Prisma）
- 適當的錯誤處理

## 文件結構
```
src/app/api/admin/orders/
├── route.ts                    # GET: 訂單列表 API
└── [id]/
    └── route.ts               # GET, PATCH, DELETE: 訂單詳情、更新、刪除 API
```

## 前端集成
### 現有組件
- `src/components/admin/order-status-update.tsx` - 已在使用 PATCH API
- 傳遞的數據結構：`{ status: "...", note: "..." }`

### 測試文件
- `test-admin-orders.http` - 包含所有 API 的測試用例

## 注意事項
1. 訂單狀態變更有嚴格的業務邏輯驗證
2. 刪除操作實際上是軟刪除（標記為 CANCELLED）
3. 所有 API 都需要管理員權限
4. 響應格式與現有管理員產品 API 保持一致

## 後續優化建議
1. 添加訂單狀態變更歷史記錄
2. 添加更複雜的搜尋和篩選功能
3. 添加訂單匯出功能
4. 添加訂單統計報表 API
5. 添加 Webhook 或事件通知機制