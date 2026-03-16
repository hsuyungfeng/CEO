'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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
  createdAt: string
  productsCount: number
  applicationsCount: number
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSuppliers()
  }, [])

  async function fetchSuppliers() {
    try {
      const res = await fetch('/api/suppliers?status=ACTIVE&page=1&limit=20&search=')
      const data = await res.json()
      if (data.success) {
        setSuppliers(data.data)
      } else {
        setError(data.error || '載入失敗')
      }
    } catch {
      setError('載入失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="default">營業中</Badge>
      case 'PENDING':
        return <Badge variant="secondary">審核中</Badge>
      case 'SUSPENDED':
        return <Badge variant="destructive">已停權</Badge>
      case 'REJECTED':
        return <Badge variant="destructive">已拒絕</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <main id="main-content" className="container mx-auto px-4">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6 py-2" aria-label="麵包屑導航">
          <ol className="flex items-center gap-2 text-sm">
            <li className="flex items-center">
              <a href="/" className="text-gray-500 hover:text-blue-600">首頁</a>
            </li>
            <li className="flex items-center">
              <span className="mx-2 text-gray-400" aria-hidden="true">/</span>
              <span className="text-gray-600 font-medium" aria-current="page">供應商列表</span>
            </li>
          </ol>
        </nav>
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold">供應商列表</h1>
          <p className="text-gray-500 mt-1">瀏覽並申請成為供應商的交易夥伴</p>
        </div>

        {loading ? (
          <div className="text-center py-12" role="status" aria-live="polite">
            <p className="text-gray-500">載入中...</p>
            <div className="mt-4" aria-hidden="true">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div 
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4" 
                role="alert"
                aria-live="assertive"
              >
                <strong className="font-bold">錯誤：</strong> {error}
              </div>
            )}

            {suppliers.length === 0 ? (
              <div className="text-center py-12" role="status" aria-live="polite">
                <p className="text-gray-500">目前沒有供應商</p>
                <p className="text-gray-400 text-sm mt-2">請稍後再試或聯繫管理員</p>
              </div>
            ) : (
              <div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
                role="list"
                aria-label="供應商列表"
              >
                {suppliers.map((supplier, index) => (
                  <Card 
                    key={supplier.id} 
                    className="hover:shadow-md transition-shadow"
                    role="listitem"
                    aria-label={`供應商：${supplier.companyName}，統一編號：${supplier.taxId}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{supplier.companyName}</CardTitle>
                          <CardDescription className="mt-1">
                            統一編號：{supplier.taxId}
                          </CardDescription>
                          <div className="mt-2 flex gap-2">
                            <span aria-label={`狀態：${supplier.status === 'ACTIVE' ? '營業中' : supplier.status === 'PENDING' ? '審核中' : supplier.status === 'SUSPENDED' ? '已停權' : '已拒絕'}`}>
                              {getStatusBadge(supplier.status)}
                            </span>
                            {supplier.isVerified && (
                              <Badge variant="outline" aria-label="已驗證供應商">
                                ✓ 驗證
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">產業：</span>
                          <span>{supplier.industry || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">聯絡人：</span>
                          <span>{supplier.contactPerson}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">電話：</span>
                          <span>{supplier.phone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">產品數：</span>
                          <span>{supplier.productsCount}</span>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Link 
                          href={`/suppliers/${supplier.id}`} 
                          className="flex-1"
                          aria-label={`查看 ${supplier.companyName} 詳情`}
                        >
                          <Button variant="outline" className="w-full">
                            查看詳情
                          </Button>
                        </Link>
                        <Link 
                          href={`/suppliers/${supplier.id}/apply`} 
                          className="flex-1"
                          aria-label={`申請加入 ${supplier.companyName}`}
                        >
                          <Button className="w-full">
                            申請加入
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* 供應商統計 */}
        {!loading && suppliers.length > 0 && (
          <div className="mt-8 p-4 bg-white rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold mb-3">供應商統計</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded">
                <p className="text-2xl font-bold text-blue-600">{suppliers.length}</p>
                <p className="text-sm text-gray-600">總供應商數</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded">
                <p className="text-2xl font-bold text-green-600">
                  {suppliers.filter(s => s.status === 'ACTIVE').length}
                </p>
                <p className="text-sm text-gray-600">營業中</p>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded">
                <p className="text-2xl font-bold text-yellow-600">
                  {suppliers.filter(s => s.isVerified).length}
                </p>
                <p className="text-sm text-gray-600">已驗證</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded">
                <p className="text-2xl font-bold text-purple-600">
                  {suppliers.reduce((sum, s) => sum + s.productsCount, 0)}
                </p>
                <p className="text-sm text-gray-600">總產品數</p>
              </div>
            </div>
          </div>
        )}

        {/* 操作指引 */}
        <div className="mt-8 p-6 bg-white rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-3">如何申請成為供應商交易夥伴？</h2>
          <ol className="list-decimal pl-5 space-y-2 text-gray-600">
            <li>瀏覽供應商列表，找到合適的供應商</li>
            <li>點擊「查看詳情」了解供應商詳細資訊</li>
            <li>點擊「申請加入」填寫申請表單</li>
            <li>等待供應商審核您的申請</li>
            <li>申請通過後即可開始交易</li>
          </ol>
          <div className="mt-4">
            <Button asChild>
              <Link href="/suppliers/register" aria-label="註冊成為供應商">
                註冊成為供應商
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
