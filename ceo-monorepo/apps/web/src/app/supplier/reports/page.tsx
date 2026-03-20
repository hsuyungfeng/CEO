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

        <TabsContent value="products" className="space-y-4 mt-4">
          {salesReport && (
            <>
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

        <TabsContent value="billing" className="space-y-4 mt-4">
          {billingReport ? (
            <>
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

              {billingReport.summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">總帳單</p><p className="text-2xl font-bold">{billingReport.summary.totalInvoices}</p></CardContent></Card>
                  <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">已繳清</p><p className="text-2xl font-bold text-green-600">{billingReport.summary.paidInvoices}</p></CardContent></Card>
                  <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">待繳款</p><p className="text-2xl font-bold text-yellow-600">{billingReport.summary.pendingInvoices}</p></CardContent></Card>
                  <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">逾期</p><p className="text-2xl font-bold text-red-500">{billingReport.summary.overdueInvoices}</p></CardContent></Card>
                </div>
              )}

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
