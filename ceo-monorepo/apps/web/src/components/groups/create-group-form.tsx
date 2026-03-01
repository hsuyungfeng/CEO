'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

interface Product {
  id: string
  name: string
  unit: string | null
  price: number
}

const DISCOUNT_TIERS = [
  { minQty: 1,   discount: 0,    label: '1–99 件：無折扣' },
  { minQty: 100, discount: 0.05, label: '100–499 件：5% 折扣' },
  { minQty: 500, discount: 0.10, label: '500+ 件：10% 折扣' },
]

export function CreateGroupForm() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    title:     '',
    productId: '',
    quantity:  '',
    deadline:  '',
    note:      '',
  })

  useEffect(() => {
    // 載入可用商品
    fetch('/api/products?limit=100')
      .then(r => r.json())
      .then(data => setProducts(data.data ?? []))
      .catch(() => setProducts([]))
  }, [])

  const selectedProduct = products.find(p => p.id === form.productId)
  const qty = parseInt(form.quantity) || 0
  const currentTier = [...DISCOUNT_TIERS].reverse().find(t => qty >= t.minQty)
  const discount = currentTier?.discount ?? 0
  const subtotal  = selectedProduct ? qty * Number(selectedProduct.price) : 0
  const saving    = Math.round(subtotal * discount * 100) / 100

  // 最小截止時間：明天
  const minDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 16)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.productId) { setError('請選擇商品'); return }
    if (qty <= 0)         { setError('數量必須大於 0'); return }
    if (!form.deadline)   { setError('請選擇截止時間'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:     form.title || `${selectedProduct?.name ?? ''} 團購`,
          productId: form.productId,
          quantity:  qty,
          deadline:  new Date(form.deadline).toISOString(),
          note:      form.note || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '建立失敗')
      setSuccess(true)
      setTimeout(() => router.push(`/groups/${data.data.groupId}`), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : '發生錯誤')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <p className="text-xl font-semibold text-green-700">團購建立成功！</p>
          <p className="text-gray-500 mt-2">正在跳轉到團購詳情頁...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>基本資訊</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 標題 */}
          <div className="space-y-1">
            <Label htmlFor="title">團購標題</Label>
            <Input
              id="title"
              placeholder="例：三月份口罩聯合訂購"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              maxLength={100}
            />
          </div>

          {/* 商品 */}
          <div className="space-y-1">
            <Label htmlFor="product">選擇商品 *</Label>
            <select
              id="product"
              required
              value={form.productId}
              onChange={e => setForm(f => ({ ...f, productId: e.target.value }))}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- 請選擇 --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}（NT$ {Number(p.price).toLocaleString()}/{p.unit ?? '件'}）
                </option>
              ))}
            </select>
          </div>

          {/* 數量 */}
          <div className="space-y-1">
            <Label htmlFor="quantity">您預計訂購數量 *</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              required
              placeholder="例：100"
              value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
            />
          </div>

          {/* 截止時間 */}
          <div className="space-y-1">
            <Label htmlFor="deadline">截止時間 *</Label>
            <Input
              id="deadline"
              type="datetime-local"
              required
              min={minDeadline}
              value={form.deadline}
              onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
            />
          </div>

          {/* 備註 */}
          <div className="space-y-1">
            <Label htmlFor="note">備註（選填）</Label>
            <Textarea
              id="note"
              rows={3}
              maxLength={500}
              placeholder="給參加成員的說明..."
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* 預覽 */}
      {selectedProduct && qty > 0 && (
        <Card className="bg-gray-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">訂單預覽</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">商品單價</span>
              <span>NT$ {Number(selectedProduct.price).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">您的數量</span>
              <span>{qty} {selectedProduct.unit ?? '件'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">訂單小計</span>
              <span>NT$ {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>目前您的折扣（僅您的件數）</span>
              <span className="text-green-700">
                {discount > 0
                  ? `${(discount * 100).toFixed(0)}% → 節省 NT$ ${saving.toLocaleString()}`
                  : '尚未達門檻（需 ≥100 件）'}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 折扣說明 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">階梯折扣說明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {DISCOUNT_TIERS.map((t, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span>{t.label}</span>
                {t.discount === discount && qty >= t.minQty && (
                  <Badge className="bg-green-600 text-xs">目前適用</Badge>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            * 折扣依全團購總件數計算，截止後自動結算並返利
          </p>
        </CardContent>
      </Card>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-3">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">
          取消
        </Button>
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? '建立中...' : '發起團購'}
        </Button>
      </div>
    </form>
  )
}
