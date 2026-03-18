'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import PriceTierForm, { PriceTier as PriceTierType } from '@/components/admin/price-tier-form'
import { toast } from 'sonner'

export default function NewProductPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [priceTiers, setPriceTiers] = useState<PriceTierType[]>([
    { minQty: 1, price: 0 },
  ])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      subtitle: formData.get('subtitle') as string,
      description: formData.get('description') as string,
      unit: formData.get('unit') as string,
      spec: formData.get('spec') as string,
      categoryId: formData.get('categoryId') as string,
      firmId: formData.get('firmId') as string,
      isActive: formData.get('isActive') === 'on',
      isFeatured: formData.get('isFeatured') === 'on',
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      priceTiers: priceTiers.filter(tier => tier.minQty > 0 && tier.price > 0),
    }

    try {
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('新增商品失敗')
      }

      toast.success('商品新增成功')
      router.push('/admin/products')
    } catch (error) {
      toast.error('新增商品失敗')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handlePriceTiersChange = (newTiers: PriceTierType[]) => {
    setPriceTiers(newTiers)
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">新增商品</h1>
        <p className="mt-2 text-gray-600">建立新的團購商品</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* 基本資訊 */}
            <Card>
              <CardHeader>
                <CardTitle>基本資訊</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">商品名稱 *</Label>
                  <Input id="name" name="name" required />
                </div>
                <div>
                  <Label htmlFor="subtitle">副標題</Label>
                  <Input id="subtitle" name="subtitle" />
                </div>
                <div>
                  <Label htmlFor="description">商品描述</Label>
                  <Textarea id="description" name="description" rows={4} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="unit">單位</Label>
                    <Input id="unit" name="unit" placeholder="盒、瓶、包等" />
                  </div>
                  <div>
                    <Label htmlFor="spec">規格</Label>
                    <Input id="spec" name="spec" placeholder="例如：100ml/瓶" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 階梯定價 */}
            <PriceTierForm
              tiers={priceTiers}
              onChange={handlePriceTiersChange}
            />
          </div>

          <div className="space-y-6">
            {/* 分類與廠商 */}
            <Card>
              <CardHeader>
                <CardTitle>分類與廠商</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="categoryId">商品分類</Label>
                  <Select name="categoryId">
                    <SelectTrigger>
                      <SelectValue placeholder="選擇分類" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cat001">藥品</SelectItem>
                      <SelectItem value="cat002">感冒藥</SelectItem>
                      <SelectItem value="cat003">綜合感冒藥</SelectItem>
                      <SelectItem value="cat004">止咳藥</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="firmId">廠商</Label>
                  <Select name="firmId">
                    <SelectTrigger>
                      <SelectValue placeholder="選擇廠商" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="firm001">台灣藥廠股份有限公司</SelectItem>
                      <SelectItem value="firm002">健康製藥有限公司</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* 狀態設定 */}
            <Card>
              <CardHeader>
                <CardTitle>狀態設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="isActive">上架狀態</Label>
                  <Switch id="isActive" name="isActive" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="isFeatured">設為熱門商品</Label>
                  <Switch id="isFeatured" name="isFeatured" />
                </div>
              </CardContent>
            </Card>

            {/* 團購時間 */}
            <Card>
              <CardHeader>
                <CardTitle>團購時間</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="startDate">開始時間</Label>
                  <Input id="startDate" name="startDate" type="datetime-local" />
                </div>
                <div>
                  <Label htmlFor="endDate">結束時間</Label>
                  <Input id="endDate" name="endDate" type="datetime-local" />
                </div>
              </CardContent>
            </Card>

            {/* 提交按鈕 */}
            <div className="sticky top-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? '儲存中...' : '新增商品'}
                    </Button>
                    <Button type="button" variant="outline" className="w-full" onClick={() => router.back()}>
                      取消
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}