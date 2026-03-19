'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Package, Search } from 'lucide-react'

interface Supplier {
  id: string
  taxId: string
  companyName: string
  contactPerson: string
  phone: string
  email: string
  address: string
  industry: string
  description: string
  status: string
  isVerified: boolean
  verifiedAt: string
  createdAt: string
  productsCount: number
  applicationsCount: number
  approvedUsersCount: number
}

interface Product {
  id: string
  name: string
  subtitle: string | null
  image: string | null
  unit: string | null
  spec: string | null
  category: string | null
  priceTiers: Array<{ minQty: number; price: number }>
  totalSold: number
}

export default function SupplierDetailPage() {
  const params = useParams()
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [productTotal, setProductTotal] = useState(0)

  const supplierId = params.id as string

  useEffect(() => {
    if (supplierId) {
      fetchSupplier()
    }
  }, [supplierId])

  async function fetchSupplier() {
    try {
      const res = await fetch(`/api/suppliers/${supplierId}`)
      const data = await res.json()
      if (data.success) {
        setSupplier(data.data)
        fetchProducts('')
      } else {
        setError(data.error || '載入失敗')
      }
    } catch {
      setError('載入失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  async function fetchProducts(search: string) {
    setProductsLoading(true)
    try {
      const params = new URLSearchParams({ limit: '20' })
      if (search.trim()) params.set('search', search.trim())
      const res = await fetch(`/api/suppliers/${supplierId}/products?${params}`)
      const data = await res.json()
      if (data.success) {
        setProducts(data.data)
        setProductTotal(data.meta.total)
      }
    } catch {
      // 靜默失敗，保持空列表
    } finally {
      setProductsLoading(false)
    }
  }

  function handleProductSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setProductSearch(value)
    const timer = setTimeout(() => fetchProducts(value), 300)
    return () => clearTimeout(timer)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center py-12">
            <p className="text-gray-500">載入中...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !supplier) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error || '供應商不存在'}
          </div>
          <div className="mt-4">
            <Link href="/suppliers">
              <Button variant="outline">返回列表</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <Link href="/suppliers">
            <Button variant="ghost">← 返回列表</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">{supplier.companyName}</CardTitle>
                    <p className="text-gray-500 mt-1">統一編號：{supplier.taxId}</p>
                  </div>
                  <div className="flex gap-2">
                    {supplier.isVerified && (
                      <Badge variant="outline">✓ 已驗證</Badge>
                    )}
                    <Badge>{supplier.status === 'ACTIVE' ? '營業中' : supplier.status}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-500 text-sm">公司描述</h3>
                    <p className="mt-1">{supplier.description || '尚無描述'}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-medium text-gray-500 text-sm">產業類別</h3>
                      <p className="mt-1">{supplier.industry || '-'}</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-500 text-sm">創立時間</h3>
                      <p className="mt-1">{new Date(supplier.createdAt).toLocaleDateString('zh-TW')}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-500 text-sm">公司地址</h3>
                    <p className="mt-1">{supplier.address || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>聯絡資訊</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">聯絡人</p>
                  <p className="font-medium">{supplier.contactPerson}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">電話</p>
                  <p className="font-medium">{supplier.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">電子郵件</p>
                  <p className="font-medium">{supplier.email}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>統計資料</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">產品數量</span>
                  <span className="font-medium">{supplier.productsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">合作商家</span>
                  <span className="font-medium">{supplier.approvedUsersCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">申請數量</span>
                  <span className="font-medium">{supplier.applicationsCount}</span>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>

        {/* 商品列表 */}
        <div className="mt-8">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-green-600" />
                  供應商商品
                  {productTotal > 0 && (
                    <Badge variant="secondary">{productTotal} 件</Badge>
                  )}
                </CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <Input
                    value={productSearch}
                    onChange={handleProductSearch}
                    placeholder="搜尋商品名稱..."
                    className="pl-9 h-9 text-sm"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {productsLoading ? (
                <div className="flex justify-center py-10 text-gray-400">
                  <svg className="animate-spin w-5 h-5 mr-2 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  載入中...
                </div>
              ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <Package className="w-10 h-10 mb-2 text-gray-300" />
                  <p className="text-sm">{productSearch ? '找不到符合的商品' : '此供應商尚無商品'}</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {products.map((product) => {
                    const startingPrice = product.priceTiers?.[0]?.price ?? null
                    return (
                      <div
                        key={product.id}
                        className="rounded-lg border border-gray-200 bg-white p-3 hover:shadow-md transition-shadow"
                      >
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-32 object-cover rounded mb-2"
                          />
                        ) : (
                          <div className="w-full h-32 bg-gray-100 rounded mb-2 flex items-center justify-center text-gray-300">
                            <Package className="w-8 h-8" />
                          </div>
                        )}
                        <p className="font-medium text-gray-900 text-sm truncate">{product.name}</p>
                        {product.subtitle && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">{product.subtitle}</p>
                        )}
                        <div className="mt-1 flex flex-wrap gap-1">
                          {product.category && (
                            <Badge variant="outline" className="text-xs px-1.5 py-0">{product.category}</Badge>
                          )}
                          {product.unit && (
                            <span className="text-xs text-gray-400">{product.unit}</span>
                          )}
                        </div>
                        {startingPrice !== null ? (
                          <p className="mt-2 text-sm font-semibold text-blue-700">
                            NT$ {startingPrice.toLocaleString('zh-TW')} 起
                          </p>
                        ) : (
                          <p className="mt-2 text-xs text-gray-400">價格洽談</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
