# 修復商品刪除功能實施計劃

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修復商品刪除功能的五個問題：列表自動更新、API認證、無障礙訪問、錯誤處理和防止重複點擊

**Architecture:** 修改 `DeleteProductDialog` 組件添加 `useRouter` 用於刷新頁面，增強錯誤處理，添加 ARIA 屬性，並在 `page.tsx` 中傳遞 `onSuccess` 回調

**Tech Stack:** Next.js 16, React 19, TypeScript, NextAuth.js v5, shadcn/ui, Prisma

---

### Task 1: 修改 DeleteProductDialog 組件添加 useRouter

**Files:**
- Modify: `src/components/admin/delete-product-dialog.tsx:1-91`

**Step 1: 添加 useRouter 導入**

```typescript
import { useRouter } from 'next/navigation'
```

**Step 2: 在組件中添加 useRouter**

```typescript
export function DeleteProductDialog({ productId, productName, onSuccess }: DeleteProductDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
```

**Step 3: 修改 handleDelete 函數使用 router.refresh**

```typescript
  const handleDelete = async () => {
    setIsDeleting(true)
    
    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "刪除失敗")
      }

      toast.success("商品刪除成功", {
        description: `「${productName}」已成功刪除`,
      })

      setOpen(false)
      
      // 優先使用 onSuccess 回調，否則使用 router.refresh
      if (onSuccess) {
        onSuccess()
      } else {
        router.refresh()
      }
    } catch (error) {
      console.error("刪除商品錯誤:", error)
      toast.error("刪除失敗", {
        description: error instanceof Error ? error.message : "請稍後再試",
      })
    } finally {
      setIsDeleting(false)
    }
  }
```

**Step 4: 保存文件並檢查語法**

```bash
cd /Users/hsuyungfeng/Applesoft/統購PHP/ceo-platform
npm run typecheck
```

**Step 5: 提交更改**

```bash
git add src/components/admin/delete-product-dialog.tsx
git commit -m "feat: add router.refresh to delete product dialog"
```

---

### Task 2: 增強錯誤處理

**Files:**
- Modify: `src/components/admin/delete-product-dialog.tsx:19-52`

**Step 1: 修改錯誤處理邏輯**

```typescript
  const handleDelete = async () => {
    setIsDeleting(true)
    
    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const result = await response.json()

      if (!response.ok) {
        // 處理特定 HTTP 錯誤狀態
        if (response.status === 401) {
          throw new Error("未授權，請重新登入")
        } else if (response.status === 403) {
          throw new Error("權限不足，需要管理員權限")
        } else if (response.status === 404) {
          throw new Error("商品不存在")
        } else if (response.status === 400 && result.error) {
          throw new Error(result.error)
        } else {
          throw new Error(`刪除失敗 (${response.status})`)
        }
      }

      toast.success("商品刪除成功", {
        description: `「${productName}」已成功刪除`,
      })

      setOpen(false)
      
      if (onSuccess) {
        onSuccess()
      } else {
        router.refresh()
      }
    } catch (error) {
      console.error("刪除商品錯誤:", error)
      
      // 處理網絡錯誤
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        toast.error("網路錯誤", {
          description: "無法連接到伺服器，請檢查網路連線",
        })
      } else {
        toast.error("刪除失敗", {
          description: error instanceof Error ? error.message : "請稍後再試",
        })
      }
    } finally {
      setIsDeleting(false)
    }
  }
```

**Step 2: 保存文件並檢查語法**

```bash
cd /Users/hsuyungfeng/Applesoft/統購PHP/ceo-platform
npm run typecheck
```

**Step 3: 提交更改**

```bash
git add src/components/admin/delete-product-dialog.tsx
git commit -m "feat: enhance error handling in delete product dialog"
```

---

### Task 3: 添加無障礙訪問屬性

**Files:**
- Modify: `src/components/admin/delete-product-dialog.tsx:54-90`

**Step 1: 添加 ARIA 屬性到對話框**

```typescript
  return (
    <AlertDialog open={open} onOpenChange={(newOpen) => {
      if (!isDeleting) {
        setOpen(newOpen)
      }
    }}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
          title="刪除商品"
          aria-label={`刪除商品 ${productName}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        aria-describedby="delete-description"
        onEscapeKeyDown={(e) => {
          if (isDeleting) {
            e.preventDefault()
          }
        }}
        onInteractOutside={(e) => {
          if (isDeleting) {
            e.preventDefault()
          }
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle id="delete-title">確認刪除商品</AlertDialogTitle>
          <AlertDialogDescription id="delete-description">
            您即將刪除商品「{productName}」。此操作將把商品標記為已刪除（軟刪除），商品不會從資料庫中物理刪除。
            <br />
            <br />
            <span className="font-medium text-red-600">
              注意：如果商品有未完成的訂單，將無法刪除。
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            disabled={isDeleting}
            aria-disabled={isDeleting}
          >
            取消
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            aria-disabled={isDeleting}
            aria-busy={isDeleting}
            className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-600"
          >
            {isDeleting ? (
              <>
                <span className="sr-only">刪除中</span>
                刪除中...
              </>
            ) : (
              "確認刪除"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
```

**Step 2: 保存文件並檢查語法**

```bash
cd /Users/hsuyungfeng/Applesoft/統購PHP/ceo-platform
npm run typecheck
```

**Step 3: 提交更改**

```bash
git add src/components/admin/delete-product-dialog.tsx
git commit -m "feat: add accessibility attributes to delete dialog"
```

---

### Task 4: 修改商品列表頁面傳遞 onSuccess 回調

**Files:**
- Modify: `src/app/admin/products/page.tsx:1-156`

**Step 1: 添加 'use client' 指令和 useRouter 導入**

```typescript
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Eye } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DeleteProductDialog } from '@/components/admin/delete-product-dialog'
```

**Step 2: 修改組件為客戶端組件並添加狀態**

```typescript
export default function ProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/products')
      if (response.ok) {
        const data = await response.json()
        setProducts(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteSuccess = () => {
    // 重新獲取商品列表
    fetchProducts()
  }
```

**Step 3: 修改 DeleteProductDialog 使用傳遞 onSuccess 回調**

```typescript
                      <DeleteProductDialog
                        productId={product.id}
                        productName={product.name}
                        onSuccess={handleDeleteSuccess}
                      />
```

**Step 4: 保存文件並檢查語法**

```bash
cd /Users/hsuyungfeng/Applesoft/統購PHP/ceo-platform
npm run typecheck
```

**Step 5: 提交更改**

```bash
git add src/app/admin/products/page.tsx
git commit -m "feat: convert products page to client component with onSuccess callback"
```

---

### Task 5: 替代方案 - 保持服務器組件但添加重新驗證

**Files:**
- Modify: `src/app/admin/products/page.tsx:1-156`

**Step 1: 創建一個客戶端包裹組件**

```typescript
// 創建新文件: src/components/admin/products-client-wrapper.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Product } from '@/types/admin'
import { DeleteProductDialog } from './delete-product-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit, Eye } from 'lucide-react'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface ProductsClientWrapperProps {
  initialProducts: Product[]
}

export function ProductsClientWrapper({ initialProducts }: ProductsClientWrapperProps) {
  const router = useRouter()
  const [products, setProducts] = useState(initialProducts)

  const handleDeleteSuccess = (deletedProductId: string) => {
    // 從列表中移除已刪除的商品
    setProducts(prevProducts => 
      prevProducts.filter(product => product.id !== deletedProductId)
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>商品名稱</TableHead>
          <TableHead>分類</TableHead>
          <TableHead>廠商</TableHead>
          <TableHead>價格</TableHead>
          <TableHead>狀態</TableHead>
          <TableHead>已售數量</TableHead>
          <TableHead>建立時間</TableHead>
          <TableHead className="text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <TableRow key={product.id}>
            {/* 保持原有的表格行內容 */}
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Link href={`/products/${product.id}`} target="_blank">
                  <Button variant="ghost" size="icon">
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href={`/admin/products/${product.id}`}>
                  <Button variant="ghost" size="icon">
                    <Edit className="h-4 w-4" />
                  </Button>
                </Link>
                <DeleteProductDialog
                  productId={product.id}
                  productName={product.name}
                  onSuccess={() => handleDeleteSuccess(product.id)}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

**Step 2: 修改 page.tsx 使用包裹組件**

```typescript
// 在 page.tsx 中導入包裹組件
import { ProductsClientWrapper } from '@/components/admin/products-client-wrapper'

// 在返回的 JSX 中使用包裹組件
<CardContent>
  <ProductsClientWrapper initialProducts={products} />
</CardContent>
```

**Step 3: 保存文件並檢查語法**

```bash
cd /Users/hsuyungfeng/Applesoft/統購PHP/ceo-platform
npm run typecheck
```

**Step 4: 提交更改**

```bash
git add src/app/admin/products/page.tsx src/components/admin/products-client-wrapper.tsx
git commit -m "feat: add client wrapper for products table with delete success handling"
```

---

### Task 6: 最終整合和測試

**Step 1: 運行類型檢查**

```bash
cd /Users/hsuyungfeng/Applesoft/統購PHP/ceo-platform
npm run typecheck
```

**Step 2: 運行代碼檢查**

```bash
npm run lint
```

**Step 3: 啟動開發伺服器測試功能**

```bash
npm run dev
```

**Step 4: 驗證所有修復**
1. 測試刪除商品後列表自動更新
2. 測試錯誤處理（斷網、權限錯誤等）
3. 測試無障礙訪問（鍵盤導航、屏幕閱讀器）
4. 測試防止重複點擊

**Step 5: 最終提交**

```bash
git add .
git commit -m "fix: complete product delete functionality fixes"
```

---

## 執行選項

**計劃已完成並保存到 `docs/plans/2026-02-08-fix-product-delete.md`。兩個執行選項：**

**1. 子代理驅動（本次會話）** - 我為每個任務派遣新的子代理，任務間進行審查，快速迭代

**2. 平行會話（分開）** - 在新的工作樹中開啟新會話使用 executing-plans，批量執行並設置檢查點

**選擇哪種方法？**