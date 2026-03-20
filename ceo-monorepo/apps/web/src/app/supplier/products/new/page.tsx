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

        {/* 物流資訊 */}
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
