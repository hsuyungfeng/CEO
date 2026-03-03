# 管理員商品 API 測試指南

## API 端點

### 1. 創建商品 (POST)
```
POST /api/admin/products
```

**請求頭**：
```
Authorization: Bearer <管理員token>
Content-Type: application/json
```

**請求體範例**：
```json
{
  "name": "測試商品",
  "subtitle": "測試副標題",
  "description": "這是一個測試商品",
  "image": "https://example.com/product.jpg",
  "unit": "個",
  "spec": "測試規格",
  "firmId": "clxyz...", // 可選，現有廠商ID
  "categoryId": "clabc...", // 可選，現有分類ID
  "isFeatured": true,
  "startDate": "2026-02-08T00:00:00Z",
  "endDate": "2026-02-15T23:59:59Z",
  "priceTiers": [
    {
      "minQty": 1,
      "price": 100
    },
    {
      "minQty": 10,
      "price": 90
    },
    {
      "minQty": 50,
      "price": 80
    }
  ]
}
```

**成功響應** (201)：
```json
{
  "success": true,
  "data": {
    "id": "cl123...",
    "name": "測試商品",
    "subtitle": "測試副標題",
    "description": "這是一個測試商品",
    "image": "https://example.com/product.jpg",
    "unit": "個",
    "spec": "測試規格",
    "firmId": "clxyz...",
    "categoryId": "clabc...",
    "isActive": true,
    "isFeatured": true,
    "startDate": "2026-02-08T00:00:00.000Z",
    "endDate": "2026-02-15T23:59:59.000Z",
    "totalSold": 0,
    "sortOrder": 0,
    "createdAt": "2026-02-08T00:00:00.000Z",
    "updatedAt": "2026-02-08T00:00:00.000Z",
    "priceTiers": [
      {
        "id": "cl456...",
        "minQty": 1,
        "price": 100
      },
      {
        "id": "cl789...",
        "minQty": 10,
        "price": 90
      },
      {
        "id": "cl012...",
        "minQty": 50,
        "price": 80
      }
    ],
    "firm": {
      "id": "clxyz...",
      "name": "測試廠商"
    },
    "category": {
      "id": "clabc...",
      "name": "測試分類"
    }
  },
  "message": "商品創建成功"
}
```

### 2. 更新商品 (PATCH)
```
PATCH /api/admin/products/[id]
```

**請求體範例**：
```json
{
  "name": "更新後的商品名稱",
  "isFeatured": false,
  "priceTiers": [
    {
      "minQty": 1,
      "price": 95
    },
    {
      "minQty": 20,
      "price": 85
    }
  ]
}
```

### 3. 刪除商品 (DELETE)
```
DELETE /api/admin/products/[id]
```

**成功響應** (200)：
```json
{
  "success": true,
  "message": "商品刪除成功"
}
```

### 4. 獲取管理員商品列表 (GET)
```
GET /api/admin/products
```

**查詢參數**：
- `page`: 頁碼 (預設: 1)
- `limit`: 每頁數量 (預設: 20)
- `search`: 搜尋關鍵字
- `categoryId`: 分類ID
- `isActive`: 是否活躍 (true/false)
- `isFeatured`: 是否熱門 (true/false)

### 5. 獲取管理員商品詳情 (GET)
```
GET /api/admin/products/[id]
```

## 權限測試場景

### 場景 1：未登入用戶
- 所有 API 返回 401 錯誤
- 錯誤訊息：`未授權，請先登入`

### 場景 2：普通會員用戶
- 所有 API 返回 403 錯誤
- 錯誤訊息：`權限不足，需要管理員權限`

### 場景 3：管理員用戶
- 可以正常訪問所有 API
- 需要有效的管理員 token

## 數據驗證測試

### 1. 必填字段驗證
- 缺少 `name` 字段：返回 400 錯誤
- 缺少 `unit` 字段：返回 400 錯誤
- 缺少 `priceTiers` 或為空數組：返回 400 錯誤

### 2. 字段格式驗證
- `image` 不是有效的 URL：返回 400 錯誤
- `firmId` 不是有效的 CUID：返回 400 錯誤
- `categoryId` 不是有效的 CUID：返回 400 錯誤
- `startDate`/`endDate` 不是有效的日期時間：返回 400 錯誤

### 3. 業務邏輯驗證
- `startDate` 晚於 `endDate`：返回 400 錯誤
- `priceTiers` 中 `minQty` 重複：返回 400 錯誤
- `priceTiers` 未按 `minQty` 排序：返回 400 錯誤
- 指定的 `firmId` 不存在：返回 400 錯誤
- 指定的 `categoryId` 不存在：返回 400 錯誤

## 錯誤處理測試

### 1. 商品不存在
- PATCH/DELETE 不存在的商品ID：返回 404 錯誤
- 錯誤訊息：`商品不存在`

### 2. 商品已刪除
- DELETE 已刪除的商品：返回 400 錯誤
- 錯誤訊息：`商品已經被刪除`

### 3. 商品有未完成訂單
- DELETE 有未完成訂單的商品：返回 400 錯誤
- 錯誤訊息：`商品有未完成的訂單，無法刪除`

### 4. 服務器錯誤
- 數據庫連接失敗：返回 500 錯誤
- 錯誤訊息：`伺服器錯誤，請稍後再試`

## 測試命令

### 使用 curl 測試
```bash
# 創建商品
curl -X POST http://localhost:3000/api/admin/products \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "測試商品",
    "unit": "個",
    "priceTiers": [
      {"minQty": 1, "price": 100}
    ]
  }'

# 更新商品
curl -X PATCH http://localhost:3000/api/admin/products/cl123... \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "新名稱"}'

# 刪除商品
curl -X DELETE http://localhost:3000/api/admin/products/cl123... \
  -H "Authorization: Bearer <token>"

# 獲取商品列表
curl -X GET "http://localhost:3000/api/admin/products?page=1&limit=10" \
  -H "Authorization: Bearer <token>"

# 獲取商品詳情
curl -X GET http://localhost:3000/api/admin/products/cl123... \
  -H "Authorization: Bearer <token>"
```

### 使用 Postman 測試
1. 創建新的 Collection：`管理員商品 API`
2. 設置環境變量：
   - `baseUrl`: `http://localhost:3000`
   - `adminToken`: `<管理員token>`
3. 創建請求，設置 Authorization header：
   - Type: `Bearer Token`
   - Token: `{{adminToken}}`

## 注意事項

1. **權限驗證**：所有 API 都需要管理員權限
2. **數據驗證**：嚴格驗證輸入數據格式
3. **事務處理**：更新操作確保數據一致性
4. **軟刪除**：DELETE 操作是軟刪除，只設置 `isActive: false`
5. **錯誤訊息**：提供清晰的中文錯誤訊息
6. **響應格式**：統一的 JSON 響應格式