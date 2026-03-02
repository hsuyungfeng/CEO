# 管理員商品 API 實現完成

## 已實現的功能

### 1. 管理員權限驗證工具 (`src/lib/admin-auth.ts`)
- `requireAdmin()`: 驗證用戶是否為管理員，返回錯誤響應或用戶信息
- `isAdminUser()`: 檢查用戶是否為管理員，用於條件邏輯

### 2. 類型定義和 Zod Schema (`src/types/admin.ts`)
- `PriceTierSchema`: 階梯定價驗證
- `CreateProductSchema`: 商品創建驗證
- `UpdateProductSchema`: 商品更新驗證
- `ApiResponse<T>`: 統一的 API 響應類型
- `ProductWithRelations`: 商品數據類型

### 3. API 端點實現

#### POST `/api/admin/products` (`src/app/api/admin/products/route.ts`)
- **功能**: 創建新商品
- **權限驗證**: 管理員專用
- **數據驗證**: 完整的 Zod schema 驗證
- **事務處理**: 商品和階梯定價原子性創建
- **錯誤處理**: 400/401/403/500 狀態碼
- **成功響應**: 201 Created

#### PATCH `/api/admin/products/[id]` (`src/app/api/admin/products/[id]/route.ts`)
- **功能**: 更新現有商品
- **權限驗證**: 管理員專用
- **數據驗證**: 部分更新驗證
- **事務處理**: 更新商品並替換階梯定價
- **錯誤處理**: 400/401/403/404/500 狀態碼
- **成功響應**: 200 OK

#### DELETE `/api/admin/products/[id]` (`src/app/api/admin/products/[id]/route.ts`)
- **功能**: 軟刪除商品（設置 `isActive: false`）
- **權限驗證**: 管理員專用
- **業務邏輯**: 檢查是否有未完成訂單
- **錯誤處理**: 400/401/403/404/500 狀態碼
- **成功響應**: 200 OK

#### GET `/api/admin/products` (`src/app/api/admin/products/route.ts`)
- **功能**: 獲取管理員商品列表（可看到非活躍商品）
- **權限驗證**: 管理員專用
- **查詢參數**: 分頁、搜尋、篩選
- **成功響應**: 200 OK

#### GET `/api/admin/products/[id]` (`src/app/api/admin/products/[id]/route.ts`)
- **功能**: 獲取商品詳情（管理員版本）
- **權限驗證**: 管理員專用
- **特點**: 可看到非活躍商品
- **成功響應**: 200 OK

## 技術特點

### 1. 安全性
- 嚴格的權限驗證（ADMIN 或 SUPER_ADMIN 角色）
- 輸入數據驗證（Zod schema）
- SQL 注入防護（Prisma）
- 錯誤訊息不暴露敏感信息

### 2. 數據一致性
- 使用 Prisma 事務處理相關數據
- 階梯定價的原子性更新
- 軟刪除保護數據完整性

### 3. 錯誤處理
- 統一的 JSON 響應格式
- 適當的 HTTP 狀態碼
- 清晰的中文錯誤訊息
- 詳細的驗證錯誤信息

### 4. 業務邏輯
- 檢查廠商和分類是否存在
- 驗證時間範圍有效性
- 檢查價格階梯排序和唯一性
- 刪除前檢查未完成訂單

## 文件結構
```
src/
├── app/
│   ├── api/
│   │   ├── admin/
│   │   │   └── products/
│   │   │       ├── route.ts              # POST, GET 列表
│   │   │       └── [id]/
│   │   │           └── route.ts          # PATCH, DELETE, GET 詳情
│   │   └── products/                     # 現有公開 API
├── lib/
│   ├── admin-auth.ts                     # 管理員權限驗證
│   ├── auth.ts                           # 現有 auth 配置
│   └── prisma.ts                         # 現有 Prisma 實例
└── types/
    ├── admin.ts                          # 管理員 API 類型
    └── auth.ts                           # 現有 auth 類型
```

## 測試文件
1. `test-admin-api.md`: 詳細的 API 測試指南
2. `test-api-examples.http`: HTTP 請求示例文件
3. `docs/plans/2026-02-08-admin-products-api-design.md`: 設計文檔

## 使用示例

### 創建商品
```typescript
const response = await fetch('/api/admin/products', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: '測試商品',
    unit: '個',
    priceTiers: [
      { minQty: 1, price: 100 },
      { minQty: 10, price: 90 },
    ],
  }),
});
```

### 更新商品
```typescript
const response = await fetch(`/api/admin/products/${productId}`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: '更新名稱',
    isFeatured: true,
  }),
});
```

### 刪除商品
```typescript
const response = await fetch(`/api/admin/products/${productId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
  },
});
```

## 注意事項

1. **環境變量**: 確保 `NEXTAUTH_SECRET` 已設置
2. **數據庫**: 需要運行 Prisma 遷移
3. **權限**: 需要創建管理員用戶進行測試
4. **CORS**: 如果從不同源訪問，需要配置 CORS
5. **日誌**: 錯誤日誌記錄到控制台

## 後續改進建議

1. **速率限制**: 添加 API 速率限制
2. **審計日誌**: 記錄管理員操作
3. **批量操作**: 支持批量創建/更新/刪除
4. **圖片上傳**: 集成圖片上傳功能
5. **緩存**: 添加響應緩存
6. **Webhook**: 商品變更時觸發 Webhook
7. **導出功能**: 支持商品數據導出