# 管理員商品 API 設計文檔

## 概述
為 CEO 團購電商平台的後台管理系統創建管理員專用的商品 API，包括商品新增、更新和刪除功能。

## 當前狀態分析
1. **現有公開 API**：
   - `/api/products` (GET) - 商品列表
   - `/api/products/[id]` (GET) - 商品詳情
2. **缺失的管理員 API**：
   - 商品新增 API
   - 商品更新 API  
   - 商品刪除 API
3. **技術棧**：
   - Next.js 14 (App Router)
   - NextAuth.js v5
   - Prisma ORM
   - PostgreSQL
   - Zod 數據驗證

## 設計決策

### 1. 權限驗證機制
**方案**：創建可重用的 `requireAdmin` 工具函數
- 使用現有的 `auth()` 函數獲取會話
- 檢查用戶角色是否為 `ADMIN` 或 `SUPER_ADMIN`
- 返回標準化的錯誤響應

**實現位置**：`src/lib/admin-auth.ts`

### 2. 數據驗證 Schema
基於 Prisma 產品模型，創建以下 Zod schema：

**商品創建 Schema** (`CreateProductSchema`)：
- 必填字段：`name`, `unit`
- 可選字段：`subtitle`, `description`, `image`, `spec`, `firmId`, `categoryId`, `isFeatured`, `startDate`, `endDate`
- 階梯定價：`priceTiers` 數組（至少一個）

**商品更新 Schema** (`UpdateProductSchema`)：
- 所有字段可選
- 階梯定價可選更新

**階梯定價 Schema** (`PriceTierSchema`)：
- `minQty`: 正整數
- `price`: 正數（小數）

### 3. API 端點設計

#### POST `/api/admin/products`
- **功能**：新增商品
- **權限**：管理員
- **請求體**：`CreateProductSchema`
- **響應**：創建的商品數據（包含階梯定價）
- **狀態碼**：
  - 201: 創建成功
  - 400: 數據驗證失敗
  - 401: 未授權
  - 403: 非管理員
  - 500: 服務器錯誤

#### PATCH `/api/admin/products/[id]`
- **功能**：更新商品
- **權限**：管理員
- **請求體**：`UpdateProductSchema`
- **事務處理**：
  1. 更新商品基本信息
  2. 刪除現有階梯定價
  3. 創建新的階梯定價
- **響應**：更新後的商品數據
- **狀態碼**：
  - 200: 更新成功
  - 400: 數據驗證失敗
  - 401: 未授權
  - 403: 非管理員
  - 404: 商品不存在
  - 500: 服務器錯誤

#### DELETE `/api/admin/products/[id]`
- **功能**：軟刪除商品（設置 `isActive: false`）
- **權限**：管理員
- **響應**：成功消息
- **狀態碼**：
  - 200: 刪除成功
  - 401: 未授權
  - 403: 非管理員
  - 404: 商品不存在
  - 500: 服務器錯誤

### 4. 文件結構
```
src/
├── app/
│   ├── api/
│   │   ├── admin/
│   │   │   └── products/
│   │   │       ├── route.ts              # POST /api/admin/products
│   │   │       └── [id]/
│   │   │           └── route.ts          # PATCH, DELETE /api/admin/products/[id]
│   │   └── products/                     # 現有公開 API
│   └── admin/                            # 現有管理員頁面
├── lib/
│   ├── admin-auth.ts                     # 管理員權限驗證工具
│   ├── auth.ts                           # 現有 auth 配置
│   └── prisma.ts                         # 現有 Prisma 實例
└── types/
    └── admin.ts                          # 管理員 API 類型定義
```

### 5. 錯誤處理策略
- **統一響應格式**：
  ```typescript
  {
    success: boolean;
    data?: any;
    error?: string;
    errors?: Array<{ field: string; message: string }>;
  }
  ```
- **HTTP 狀態碼對應**：
  - 200/201: 成功操作
  - 400: 客戶端錯誤（數據驗證失敗）
  - 401: 未授權（未登錄）
  - 403: 禁止訪問（非管理員）
  - 404: 資源不存在
  - 500: 服務器錯誤

### 6. 事務處理
對於商品更新操作：
```typescript
await prisma.$transaction(async (tx) => {
  // 1. 更新商品基本信息
  const updatedProduct = await tx.product.update({ ... });
  
  // 2. 刪除現有階梯定價
  await tx.priceTier.deleteMany({ ... });
  
  // 3. 創建新的階梯定價
  if (priceTiers && priceTiers.length > 0) {
    await tx.priceTier.createMany({ ... });
  }
  
  return updatedProduct;
});
```

## 實施步驟

### 階段 1：基礎設施準備
1. 創建管理員權限驗證工具 (`src/lib/admin-auth.ts`)
2. 創建管理員 API 類型定義 (`src/types/admin.ts`)
3. 創建 Zod schema 定義

### 階段 2：API 實現
1. 實現 POST `/api/admin/products` API
2. 實現 PATCH `/api/admin/products/[id]` API  
3. 實現 DELETE `/api/admin/products/[id]` API

### 階段 3：測試與驗證
1. 使用 Postman 或 curl 測試 API
2. 驗證權限控制
3. 驗證數據驗證
4. 驗證事務處理

## 技術細節

### 管理員權限驗證工具
```typescript
// src/lib/admin-auth.ts
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export async function requireAdmin() {
  const session = await auth();
  
  if (!session?.user) {
    return NextResponse.json(
      { error: '未授權，請先登入' },
      { status: 401 }
    );
  }
  
  const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';
  
  if (!isAdmin) {
    return NextResponse.json(
      { error: '權限不足，需要管理員權限' },
      { status: 403 }
    );
  }
  
  return session.user;
}
```

### Zod Schema 定義
```typescript
// src/types/admin.ts
import { z } from 'zod';

export const PriceTierSchema = z.object({
  minQty: z.number().int().positive().min(1),
  price: z.number().positive(),
});

export const CreateProductSchema = z.object({
  name: z.string().min(1, '商品名稱不能為空'),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  unit: z.string().min(1, '單位不能為空'),
  spec: z.string().optional(),
  firmId: z.string().optional(),
  categoryId: z.string().optional(),
  isFeatured: z.boolean().default(false),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  priceTiers: z.array(PriceTierSchema).min(1, '至少需要一個價格階梯'),
});

export const UpdateProductSchema = CreateProductSchema.partial();
```

## 風險與緩解
1. **權限漏洞**：嚴格驗證管理員角色，使用服務器端驗證
2. **數據不一致**：使用 Prisma 事務確保階梯定價同步更新
3. **性能問題**：批量操作使用 `createMany`，避免 N+1 查詢
4. **安全問題**：輸入驗證、SQL 注入防護（Prisma 已處理）

## 成功標準
1. 管理員可以成功創建、更新、刪除商品
2. 非管理員用戶無法訪問這些 API
3. 數據驗證正確工作
4. 階梯定價正確關聯和更新
5. 錯誤處理提供清晰的錯誤信息