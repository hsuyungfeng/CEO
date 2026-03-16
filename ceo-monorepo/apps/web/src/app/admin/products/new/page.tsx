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
import GroupBuyingTimeForm from '@/components/admin/group-buying-time-form'
import { toast } from 'sonner'
import { Upload, X, Image as ImageIcon } from 'lucide-react'

interface ImagePreview {
  file: File
  preview: string
}

export default function NewProductPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [priceTiers, setPriceTiers] = useState<PriceTierType[]>([
    { minQty: 1, price: 0 },
  ])
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [images, setImages] = useState<ImagePreview[]>([])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)

    // 組合開始和結束時間
    const startDateTime = startDate && startTime
      ? new Date(`${startDate}T${startTime}:00`).toISOString()
      : null
    const endDateTime = endDate && endTime
      ? new Date(`${endDate}T${endTime}:00`).toISOString()
      : null

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
      startDate: startDateTime,
      endDate: endDateTime,
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (!files) return

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} 不是圖片文件`)
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} 大小超過 5MB`)
        return
      }

      const preview = URL.createObjectURL(file)
      setImages(prev => [...prev, { file, preview }])
    })
  }

  const handleRemoveImage = (index: number) => {
    setImages(prev => {
      const newImages = [...prev]
      URL.revokeObjectURL(newImages[index].preview)
      newImages.splice(index, 1)
      return newImages
    })
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
            {/* 商品圖片 */}
            <Card>
              <CardHeader>
                <CardTitle>商品圖片</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition">
                  <input
                    id="images"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <label htmlFor="images" className="cursor-pointer">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">點擊或拖拽圖片到此</p>
                    <p className="text-xs text-gray-400 mt-1">支持 JPG、PNG、WebP（最大 5MB）</p>
                  </label>
                </div>

                {/* 圖片預覽 */}
                {images.length > 0 && (
                  <div className="grid grid-cols-3 gap-4">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={img.preview}
                          alt="preview"
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {images.length > 0 && (
                  <p className="text-sm text-gray-600">已選擇 {images.length} 張圖片</p>
                )}
              </CardContent>
            </Card>

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
            <GroupBuyingTimeForm
              onStartDateChange={(date, time) => {
                setStartDate(date)
                setStartTime(time)
              }}
              onEndDateChange={(date, time) => {
                setEndDate(date)
                setEndTime(time)
              }}
            />

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