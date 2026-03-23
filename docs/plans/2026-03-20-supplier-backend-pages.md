# 供應商後台補強頁面 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 建立三個供應商後台缺失頁面：`/supplier/products/new`（含價格階梯）、`/supplier/reports`（銷售+帳單報表）、`/supplier/account/financial`（財務資訊）。

**Architecture:** 三頁皆為純前端 Client Component，呼叫現有 API（`/api/supplier/products`、`/api/supplier/reports/sales`、`/api/supplier/reports/billing`、`/api/supplier/account`、`/api/supplier/transactions`）。products/new 需擴充 API 支援價格階梯（priceTiers）寫入。

**Tech Stack:** Next.js App Router、shadcn/ui、fetch + useState/useEffect、Prisma（API 層）

---

## Task 1: 擴充商品 API 支援價格階梯

**Files:**
- Modify: `ceo-monorepo/apps/web/src/app/api/supplier/products/route.ts`

**目標：** POST /api/supplier/products 支援傳入 `priceTiers: [{minQty, price}]` 並寫入 PriceTier 資料表。

**Step 1: 在 createProductSchema 新增 priceTiers 欄位**

在 `route.ts` 的 `createProductSchema` 中加入：

```typescript
priceTiers: z.array(z.object({
  minQty: z.number().int().positive('最小數量必須為正整數'),
  price: z.number().positive('價格必須為正數'),
})).optional(),
```

**Step 2: 在 POST handler 建立商品後寫入 priceTiers**

在找到 `supplierProduct` 建立之後，加入：

```typescript
if (data.priceTiers && data.priceTiers.length > 0) {
  // 找到剛建立的 supplierProduct 對應的 productId
  const productId = supplierProduct.productId
  if (productId) {
    await prisma.priceTier.createMany({
      data: data.priceTiers.map(tier => ({
        productId,
        minQty: tier.minQty,
        price: tier.price,
      })),
      skipDuplicates: true,
    })
  }
}
```

**Step 3: GET 回傳時包含 priceTiers**

在 GET handler 的 `include` 中加入：

```typescript
product: {
  select: {
    id: true,
    name: true,
    priceTiers: { orderBy: { minQty: 'asc' } },
    // ... 其他欄位
  }
}
```

**Step 4: 手動驗證**

```bash
cd ceo-monorepo/apps/web && pnpm typecheck 2>&1 | grep "supplier/products"
```

Expected: 無錯誤

**Step 5: Commit**

```bash
git add ceo-monorepo/apps/web/src/app/api/supplier/products/route.ts
git commit -m "feat: 供應商商品 API 支援價格階梯寫入"
```

---

## Task 2: 建立 `/supplier/products/new` 頁面

**Files:**
- Create: `ceo-monorepo/apps/web/src/app/supplier/products/new/page.tsx`

**目標：** 獨立新增商品頁面，包含完整表單 + 價格階梯動態欄位。

**Step 1: 建立頁面檔案**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'

interface PriceTier {
  minQty: number
  price: number
}

export default function NewProductPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([
    { minQty: 1, price: 0 },
  ])
  const [formData, setFormData] = useState({
    name: '',
    SKU: '',
    description: '',
    category: '',
    unit: '',
    imageUrl: '',
    price: '',
    moq: '1',
    stock: '0',
    leadTime: '',
    length: '',
    width: '',
    height: '',
    weight: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const addPriceTier = () => {
    setPriceTiers(prev => [...prev, { minQty: 0, price: 0 }])
  }

  const removePriceTier = (index: number) => {
    setPriceTiers(prev => prev.filter((_, i) => i !== index))
  }

  const updatePriceTier = (index: number, field: keyof PriceTier, value: number) => {
    setPriceTiers(prev => prev.map((tier, i) => i === index ? { ...tier, [field]: value } : tier))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: formData.name,
        SKU: formData.SKU || undefined,
        description: formData.description || undefined,
        category: formData.category || undefined,
        unit: formData.unit || undefined,
        imageUrl: formData.imageUrl || undefined,
        price: parseFloat(formData.price),
        moq: parseInt(formData.moq),
        stock: parseInt(formData.stock),
        leadTime: formData.leadTime ? parseInt(formData.leadTime) : undefined,
        length: formData.length ? parseFloat(formData.length) : undefined,
        width: formData.width ? parseFloat(formData.width) : undefined,
        height: formData.height ? parseFloat(formData.height) : undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        priceTiers: priceTiers.filter(t => t.minQty > 0 && t.price > 0),
      }
      const res = await fetch('/api/supplier/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '建立失敗')
      router.push('/supplier/products')
    } catch (err) {
      setError(err instanceof Error ? err.message : '建立失敗')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/supplier/products">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold">新增商品</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本資訊 */}
        <Card>
          <CardHeader><CardTitle>基本資訊</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">商品名稱 *</Label>
                <Input id="name" name="name" value={formData.name} onChange={handleChange} required placeholder="輸入商品名稱" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="SKU">SKU</Label>
                <Input id="SKU" name="SKU" value={formData.SKU} onChange={handleChange} placeholder="如：PRD-001" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">商品說明</Label>
              <Textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={3} placeholder="商品詳細說明..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">分類</Label>
                <Input id="category" name="category" value={formData.category} onChange={handleChange} placeholder="如：電子產品" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">單位</Label>
                <Input id="unit" name="unit" value={formData.unit} onChange={handleChange} placeholder="如：箱、盒、個" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="imageUrl">圖片網址</Label>
              <Input id="imageUrl" name="imageUrl" value={formData.imageUrl} onChange={handleChange} placeholder="https://..." />
            </div>
          </CardContent>
        </Card>

        {/* 定價與庫存 */}
        <Card>
          <CardHeader><CardTitle>定價與庫存</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">基本售價 (NT$) *</Label>
                <Input id="price" name="price" type="number" min="0" step="0.01" value={formData.price} onChange={handleChange} required placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="moq">最小訂購量</Label>
                <Input id="moq" name="moq" type="number" min="1" value={formData.moq} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">庫存數量</Label>
                <Input id="stock" name="stock" type="number" min="0" value={formData.stock} onChange={handleChange} />
              </div>
            </div>

            {/* 價格階梯 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>價格階梯（量大優惠）</Label>
                <Button type="button" variant="outline" size="sm" onClick={addPriceTier}>
                  <Plus className="h-4 w-4 mr-1" />新增階梯
                </Button>
              </div>
              <div className="space-y-2">
                {priceTiers.map((tier, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">最小數量</Label>
                        <Input
                          type="number" min="1"
                          value={tier.minQty || ''}
                          onChange={e => updatePriceTier(index, 'minQty', parseInt(e.target.value) || 0)}
                          placeholder="如：100"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">單價 (NT$)</Label>
                        <Input
                          type="number" min="0" step="0.01"
                          value={tier.price || ''}
                          onChange={e => updatePriceTier(index, 'price', parseFloat(e.target.value) || 0)}
                          placeholder="如：80"
                        />
                      </div>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removePriceTier(index)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500">設定不同數量區間的優惠價格，例如：購買 100 件以上享 NT$80/件</p>
            </div>
          </CardContent>
        </Card>

        {/* 物流尺寸（選填） */}
        <Card>
          <CardHeader><CardTitle>物流資訊（選填）</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="leadTime">備貨天數</Label>
                <Input id="leadTime" name="leadTime" type="number" min="0" value={formData.leadTime} onChange={handleChange} placeholder="如：3" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">重量 (kg)</Label>
                <Input id="weight" name="weight" type="number" min="0" step="0.001" value={formData.weight} onChange={handleChange} placeholder="如：1.5" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="length">長 (cm)</Label>
                <Input id="length" name="length" type="number" min="0" value={formData.length} onChange={handleChange} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="width">寬 (cm)</Label>
                <Input id="width" name="width" type="number" min="0" value={formData.width} onChange={handleChange} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">高 (cm)</Label>
                <Input id="height" name="height" type="number" min="0" value={formData.height} onChange={handleChange} placeholder="0" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Link href="/supplier/products">
            <Button type="button" variant="outline">取消</Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? '建立中...' : '建立商品'}
          </Button>
        </div>
      </form>
    </div>
  )
}
```

**Step 2: Typecheck**

```bash
cd ceo-monorepo/apps/web && pnpm typecheck 2>&1 | grep "products/new"
```

Expected: 無錯誤

**Step 3: Commit**

```bash
git add ceo-monorepo/apps/web/src/app/supplier/products/new/page.tsx
git commit -m "feat: 新增供應商商品頁面（含價格階梯設定）"
```

---

## Task 3: 建立 `/supplier/reports` 報表頁

**Files:**
- Create: `ceo-monorepo/apps/web/src/app/supplier/reports/page.tsx`

**目標：** 整合銷售報表（`/api/supplier/reports/sales`）+ 帳單報表（`/api/supplier/reports/billing`），Tab 切換顯示。

**Step 1: 建立頁面檔案**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart2, Package, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react'

interface SalesReport {
  supplier: { id: string; companyName: string }
  summary: {
    totalProducts: number
    activeProducts: number
    outOfStock: number
    totalStockValue: number
    averagePrice: number
    priceRange: string
  }
  categories: Array<{ name: string; count: number }>
  products: Array<{
    id: string; name: string; category: string
    price: number | null; stock: number; moq: number; isActive: boolean
  }>
}

interface BillingReport {
  account: {
    balance: number; billingRate: number
    isSuspended: boolean; isLowBalance: boolean
    paymentDueDate: string | null
  }
  summary: {
    totalInvoices: number; paidInvoices: number
    pendingInvoices: number; overdueInvoices: number
    totalPaid: number; totalPending: number
  }
  recentTransactions: Array<{
    id: string; type: string; amount: number
    balanceAfter: number; note: string | null; createdAt: string
  }>
}

export default function SupplierReportsPage() {
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null)
  const [billingReport, setBillingReport] = useState<BillingReport | null>(null)
  const [loadingSales, setLoadingSales] = useState(true)
  const [loadingBilling, setLoadingBilling] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSalesReport()
    fetchBillingReport()
  }, [])

  const fetchSalesReport = async () => {
    try {
      setLoadingSales(true)
      const res = await fetch('/api/supplier/reports/sales')
      const data = await res.json()
      if (data.success) setSalesReport(data.data)
      else setError(data.error || '銷售報表載入失敗')
    } catch {
      setError('銷售報表載入失敗')
    } finally {
      setLoadingSales(false)
    }
  }

  const fetchBillingReport = async () => {
    try {
      setLoadingBilling(true)
      const res = await fetch('/api/supplier/reports/billing?detailed=true')
      const data = await res.json()
      if (data.success) setBillingReport(data.data)
    } catch {
      // billing report optional
    } finally {
      setLoadingBilling(false)
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(amount)

  const transactionTypeLabel: Record<string, string> = {
    DEPOSIT: '儲值', BILLING: '帳單扣款', REFUND: '退款', ADJUSTMENT: '人工調整'
  }

  if (loadingSales && loadingBilling) {
    return <div className="p-6 text-center text-gray-500">載入報表中...</div>
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 p-4 rounded">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => { fetchSalesReport(); fetchBillingReport() }}>
            <RefreshCw className="h-4 w-4 mr-1" />重試
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">經營報表</h1>
        <Button variant="outline" size="sm" onClick={() => { fetchSalesReport(); fetchBillingReport() }}>
          <RefreshCw className="h-4 w-4 mr-1" />重新整理
        </Button>
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products"><Package className="h-4 w-4 mr-2" />商品總覽</TabsTrigger>
          <TabsTrigger value="billing"><TrendingUp className="h-4 w-4 mr-2" />帳務狀況</TabsTrigger>
        </TabsList>

        {/* 商品總覽 Tab */}
        <TabsContent value="products" className="space-y-4 mt-4">
          {salesReport && (
            <>
              {/* 摘要卡片 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-500">總商品數</p>
                    <p className="text-3xl font-bold">{salesReport.summary.totalProducts}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-500">上架中</p>
                    <p className="text-3xl font-bold text-green-600">{salesReport.summary.activeProducts}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-500">缺貨商品</p>
                    <p className="text-3xl font-bold text-red-500">{salesReport.summary.outOfStock}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-500">庫存總值</p>
                    <p className="text-2xl font-bold">{formatCurrency(salesReport.summary.totalStockValue)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* 分類統計 */}
              {salesReport.categories.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><BarChart2 className="h-5 w-5" />分類統計</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {salesReport.categories.map(cat => (
                        <div key={cat.name} className="flex items-center justify-between py-2 border-b last:border-0">
                          <span className="font-medium">{cat.name}</span>
                          <Badge variant="secondary">{cat.count} 件</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 商品列表 */}
              <Card>
                <CardHeader><CardTitle>商品明細</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">商品名稱</th>
                          <th className="text-left p-2">分類</th>
                          <th className="text-right p-2">單價</th>
                          <th className="text-right p-2">庫存</th>
                          <th className="text-right p-2">最小訂購</th>
                          <th className="text-center p-2">狀態</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesReport.products.map(product => (
                          <tr key={product.id} className="border-b hover:bg-gray-50">
                            <td className="p-2 font-medium">{product.name}</td>
                            <td className="p-2 text-gray-500">{product.category}</td>
                            <td className="p-2 text-right">{product.price ? formatCurrency(product.price) : '-'}</td>
                            <td className="p-2 text-right">
                              <span className={product.stock <= 0 ? 'text-red-500 font-medium' : ''}>{product.stock}</span>
                            </td>
                            <td className="p-2 text-right">{product.moq}</td>
                            <td className="p-2 text-center">
                              <Badge variant={product.isActive ? 'default' : 'secondary'}>
                                {product.isActive ? '上架' : '下架'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* 帳務狀況 Tab */}
        <TabsContent value="billing" className="space-y-4 mt-4">
          {billingReport ? (
            <>
              {/* 帳戶狀態 */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-500">帳戶餘額</p>
                    <p className={`text-2xl font-bold ${billingReport.account.isLowBalance ? 'text-red-500' : 'text-green-600'}`}>
                      {formatCurrency(billingReport.account.balance)}
                    </p>
                    {billingReport.account.isLowBalance && (
                      <p className="text-xs text-red-500 mt-1">⚠ 餘額不足，請及時儲值</p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-500">帳單費率</p>
                    <p className="text-2xl font-bold">{billingReport.account.billingRate}%</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-500">帳戶狀態</p>
                    <Badge variant={billingReport.account.isSuspended ? 'destructive' : 'default'} className="mt-1">
                      {billingReport.account.isSuspended ? '已停用' : '正常'}
                    </Badge>
                  </CardContent>
                </Card>
              </div>

              {/* 帳單摘要 */}
              {billingReport.summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">總帳單</p><p className="text-2xl font-bold">{billingReport.summary.totalInvoices}</p></CardContent></Card>
                  <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">已繳清</p><p className="text-2xl font-bold text-green-600">{billingReport.summary.paidInvoices}</p></CardContent></Card>
                  <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">待繳款</p><p className="text-2xl font-bold text-yellow-600">{billingReport.summary.pendingInvoices}</p></CardContent></Card>
                  <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">逾期</p><p className="text-2xl font-bold text-red-500">{billingReport.summary.overdueInvoices}</p></CardContent></Card>
                </div>
              )}

              {/* 最近交易 */}
              {billingReport.recentTransactions?.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>最近交易記錄</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {billingReport.recentTransactions.map(tx => (
                        <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div>
                            <Badge variant="outline">{transactionTypeLabel[tx.type] || tx.type}</Badge>
                            {tx.note && <p className="text-sm text-gray-500 mt-1">{tx.note}</p>}
                            <p className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleDateString('zh-TW')}</p>
                          </div>
                          <div className="text-right">
                            <p className={`font-medium ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                            </p>
                            <p className="text-xs text-gray-500">餘額 {formatCurrency(tx.balanceAfter)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="text-center text-gray-500 py-8">帳務資料載入中...</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

**Step 2: Typecheck**

```bash
cd ceo-monorepo/apps/web && pnpm typecheck 2>&1 | grep "supplier/reports"
```

Expected: 無錯誤

**Step 3: Commit**

```bash
git add ceo-monorepo/apps/web/src/app/supplier/reports/page.tsx
git commit -m "feat: 供應商經營報表頁面（商品總覽 + 帳務狀況）"
```

---

## Task 4: 建立 `/supplier/account/financial` 財務資訊頁

**Files:**
- Create: `ceo-monorepo/apps/web/src/app/supplier/account/financial/page.tsx`

**目標：** 顯示帳戶餘額、費率、儲值入口，以及完整交易明細（分頁）。

**Step 1: 建立頁面檔案**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Wallet, ArrowUpCircle, ArrowDownCircle, RefreshCw, AlertTriangle } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'

interface AccountInfo {
  id: string
  balance: number
  billingRate: number
  totalSpent: number
  isSuspended: boolean
  isLowBalance: boolean
  paymentDueDate: string | null
}

interface Transaction {
  id: string
  type: string
  amount: number
  balanceAfter: number
  note: string | null
  createdAt: string
}

const TYPE_LABEL: Record<string, string> = {
  DEPOSIT: '儲值', BILLING: '帳單扣款', REFUND: '退款', ADJUSTMENT: '人工調整',
}
const TYPE_COLOR: Record<string, string> = {
  DEPOSIT: 'text-green-600', BILLING: 'text-red-500', REFUND: 'text-blue-500', ADJUSTMENT: 'text-yellow-600',
}

export default function SupplierFinancialPage() {
  const [account, setAccount] = useState<AccountInfo | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingAccount, setLoadingAccount] = useState(true)
  const [loadingTx, setLoadingTx] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showDepositDialog, setShowDepositDialog] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')
  const [depositing, setDepositing] = useState(false)
  const [depositError, setDepositError] = useState('')

  useEffect(() => { fetchAccount() }, [])
  useEffect(() => { fetchTransactions(page) }, [page])

  const fetchAccount = async () => {
    try {
      setLoadingAccount(true)
      const res = await fetch('/api/supplier/account')
      const data = await res.json()
      if (data.success) setAccount(data.data)
      else setError(data.error || '載入失敗')
    } catch {
      setError('帳戶資訊載入失敗')
    } finally {
      setLoadingAccount(false)
    }
  }

  const fetchTransactions = async (p: number) => {
    try {
      setLoadingTx(true)
      const res = await fetch(`/api/supplier/transactions?page=${p}&limit=15`)
      const data = await res.json()
      if (data.success) {
        setTransactions(data.data)
        setTotalPages(Math.ceil((data.total || 0) / 15))
      }
    } catch {
      // non-critical
    } finally {
      setLoadingTx(false)
    }
  }

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount)
    if (!amount || amount <= 0) { setDepositError('請輸入有效金額'); return }
    try {
      setDepositing(true)
      setDepositError('')
      const res = await fetch('/api/supplier/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '儲值失敗')
      setShowDepositDialog(false)
      setDepositAmount('')
      fetchAccount()
      fetchTransactions(1)
      setPage(1)
    } catch (err) {
      setDepositError(err instanceof Error ? err.message : '儲值失敗')
    } finally {
      setDepositing(false)
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(amount)

  if (loadingAccount) return <div className="p-6 text-center text-gray-500">載入中...</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!account) return null

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">財務資訊</h1>
        <Button variant="outline" size="sm" onClick={() => { fetchAccount(); fetchTransactions(page) }}>
          <RefreshCw className="h-4 w-4 mr-1" />重新整理
        </Button>
      </div>

      {/* 帳戶狀態警示 */}
      {(account.isLowBalance || account.isSuspended) && (
        <div className={`flex items-center gap-2 p-4 rounded border ${account.isSuspended ? 'bg-red-50 border-red-200 text-red-700' : 'bg-yellow-50 border-yellow-200 text-yellow-700'}`}>
          <AlertTriangle className="h-5 w-5" />
          <span>{account.isSuspended ? '帳號已停用，請聯繫管理員' : '帳戶餘額不足，請及時儲值以避免服務中斷'}</span>
        </div>
      )}

      {/* 帳戶概覽 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">帳戶餘額</p>
                <p className={`text-3xl font-bold ${account.isLowBalance ? 'text-red-500' : 'text-green-600'}`}>
                  {formatCurrency(account.balance)}
                </p>
                {account.paymentDueDate && (
                  <p className="text-xs text-gray-400 mt-2">
                    繳費截止：{new Date(account.paymentDueDate).toLocaleDateString('zh-TW')}
                  </p>
                )}
              </div>
              <Wallet className="h-8 w-8 text-gray-300" />
            </div>
            <Button className="w-full mt-4" onClick={() => setShowDepositDialog(true)}>
              <ArrowUpCircle className="h-4 w-4 mr-2" />儲值
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500 mb-1">帳單費率</p>
            <p className="text-3xl font-bold">{account.billingRate}%</p>
            <p className="text-xs text-gray-400 mt-2">每月帳單費用比率</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500 mb-1">累計消費</p>
            <p className="text-2xl font-bold">{formatCurrency(account.totalSpent)}</p>
            <div className="mt-2">
              <Badge variant={account.isSuspended ? 'destructive' : 'default'}>
                {account.isSuspended ? '已停用' : '正常'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 交易記錄 */}
      <Card>
        <CardHeader>
          <CardTitle>交易記錄</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTx ? (
            <div className="text-center py-8 text-gray-500">載入中...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">尚無交易記錄</div>
          ) : (
            <>
              <div className="space-y-0">
                {transactions.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      {tx.amount > 0 ? (
                        <ArrowUpCircle className="h-5 w-5 text-green-500 shrink-0" />
                      ) : (
                        <ArrowDownCircle className="h-5 w-5 text-red-500 shrink-0" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{TYPE_LABEL[tx.type] || tx.type}</p>
                        {tx.note && <p className="text-xs text-gray-500">{tx.note}</p>}
                        <p className="text-xs text-gray-400">
                          {new Date(tx.createdAt).toLocaleString('zh-TW')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${TYPE_COLOR[tx.type] || ''}`}>
                        {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                      </p>
                      <p className="text-xs text-gray-400">餘額 {formatCurrency(tx.balanceAfter)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* 分頁 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                    上一頁
                  </Button>
                  <span className="text-sm text-gray-500">第 {page} / {totalPages} 頁</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                    下一頁
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 儲值對話框 */}
      <Dialog open={showDepositDialog} onOpenChange={setShowDepositDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>帳戶儲值</DialogTitle>
            <DialogDescription>輸入儲值金額（最高 NT$ 1,000,000）</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="depositAmount">儲值金額 (NT$)</Label>
              <Input
                id="depositAmount"
                type="number"
                min="1"
                max="1000000"
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
                placeholder="輸入金額"
              />
            </div>
            {depositError && <p className="text-sm text-red-600">{depositError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDepositDialog(false)}>取消</Button>
            <Button onClick={handleDeposit} disabled={depositing}>
              {depositing ? '處理中...' : '確認儲值'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

**Step 2: Typecheck**

```bash
cd ceo-monorepo/apps/web && pnpm typecheck 2>&1 | grep "account/financial"
```

Expected: 無錯誤

**Step 3: Commit**

```bash
git add ceo-monorepo/apps/web/src/app/supplier/account/financial/page.tsx
git commit -m "feat: 供應商財務資訊頁面（餘額、交易記錄、儲值）"
```

---

## Task 5: 全體 Typecheck + 最終驗證

**Step 1: 完整 typecheck**

```bash
cd ceo-monorepo/apps/web && pnpm typecheck 2>&1 | grep -E "supplier/(reports|account/financial|products/new)"
```

Expected: 無錯誤

**Step 2: 確認 Sidebar 連結全部可用**

確認下列路徑均有對應 `page.tsx`：
- `src/app/supplier/products/new/page.tsx` ✓
- `src/app/supplier/reports/page.tsx` ✓
- `src/app/supplier/account/financial/page.tsx` ✓

**Step 3: 最終 commit（如有未提交更動）**

```bash
git status
git commit -m "feat: Sprint 4 供應商後台補強完成" --allow-empty
```
