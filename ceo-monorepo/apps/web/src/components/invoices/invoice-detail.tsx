'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

interface LineItem {
  id: string
  productName: string
  quantity: number
  unitPrice: string
  subtotal: string
}

interface Invoice {
  id: string
  invoiceNo: string
  billingMonth: string
  billingStartDate: string
  billingEndDate: string
  totalAmount: string
  totalItems: number
  status: string
  invoiceFormat: string
  sentAt: string | null
  confirmedAt: string | null
  paidAt: string | null
  lineItems: LineItem[]
}

export function InvoiceDetail({ id }: { id: string }) {
  const router = useRouter()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    fetchInvoice()
  }, [id])

  const fetchInvoice = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/invoices/${id}`)
      if (!response.ok) throw new Error('Failed to fetch invoice')
      const result = await response.json()
      setInvoice(result.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    try {
      setConfirming(true)
      const response = await fetch(`/api/invoices/${id}/confirm`, {
        method: 'PATCH'
      })
      if (!response.ok) throw new Error('Failed to confirm invoice')
      await fetchInvoice()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setConfirming(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD'
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      DRAFT: 'secondary',
      SENT: 'default',
      CONFIRMED: 'outline',
      PAID: 'default'
    }
    const labels: Record<string, string> = {
      DRAFT: '草稿',
      SENT: '已發送',
      CONFIRMED: '已確認',
      PAID: '已支付'
    }
    return <Badge variant={variants[status]}>{labels[status] || status}</Badge>
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <p>載入中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        錯誤: {error}
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="text-center py-8">
        <p>找不到帳單</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        返回
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{invoice.invoiceNo}</CardTitle>
            {getStatusBadge(invoice.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Invoice Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">計費期間</p>
              <p className="font-semibold">{invoice.billingMonth}</p>
              <p className="text-xs text-gray-500">
                {new Date(invoice.billingStartDate).toLocaleDateString('zh-TW')} ~{' '}
                {new Date(invoice.billingEndDate).toLocaleDateString('zh-TW')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">訂單數</p>
              <p className="font-semibold">{invoice.totalItems} 件</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">帳單格式</p>
              <p className="font-semibold">{invoice.invoiceFormat}</p>
            </div>
          </div>

          {/* Line Items */}
          {invoice.lineItems.length > 0 && (
            <div>
              <h3 className="font-semibold mb-4">帳單明細</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">產品名稱</th>
                      <th className="text-right p-3">數量</th>
                      <th className="text-right p-3">單價</th>
                      <th className="text-right p-3">小計</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lineItems.map(item => (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{item.productName}</td>
                        <td className="text-right p-3">{item.quantity}</td>
                        <td className="text-right p-3">
                          {formatCurrency(parseFloat(item.unitPrice))}
                        </td>
                        <td className="text-right p-3">
                          {formatCurrency(parseFloat(item.subtotal))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Total */}
          <div className="flex justify-end pt-4 border-t">
            <div className="text-right">
              <p className="text-sm text-gray-600">合計</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(parseFloat(invoice.totalAmount))}
              </p>
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t text-xs text-gray-500">
            {invoice.sentAt && (
              <div>
                <p className="font-semibold text-gray-700">已發送</p>
                <p>{new Date(invoice.sentAt).toLocaleString('zh-TW')}</p>
              </div>
            )}
            {invoice.confirmedAt && (
              <div>
                <p className="font-semibold text-gray-700">已確認</p>
                <p>{new Date(invoice.confirmedAt).toLocaleString('zh-TW')}</p>
              </div>
            )}
            {invoice.paidAt && (
              <div>
                <p className="font-semibold text-gray-700">已支付</p>
                <p>{new Date(invoice.paidAt).toLocaleString('zh-TW')}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          {invoice.status === 'SENT' && (
            <Button
              onClick={handleConfirm}
              disabled={confirming}
              className="w-full"
              size="lg"
            >
              {confirming ? '確認中...' : '確認帳單'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
