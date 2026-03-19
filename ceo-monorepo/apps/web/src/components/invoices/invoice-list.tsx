'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface Invoice {
  id: string
  invoiceNo: string
  billingMonth: string
  totalAmount: string
  status: string
  sentAt: string | null
  confirmedAt: string | null
}

export function InvoiceList() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/invoices')
      if (!response.ok) throw new Error('Failed to fetch invoices')
      const result = await response.json()
      setInvoices(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
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

  if (loading) return <div className="text-center py-8">載入中...</div>
  if (error) return <div className="text-red-600">錯誤: {error}</div>

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>月結帳單</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-gray-500">尚無帳單</p>
          ) : (
            <div className="space-y-4">
              {invoices.map(invoice => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold">{invoice.invoiceNo}</h3>
                    <p className="text-sm text-gray-600">{invoice.billingMonth}</p>
                  </div>
                  <div className="text-right mr-6">
                    <p className="font-semibold">
                      {formatCurrency(parseFloat(invoice.totalAmount))}
                    </p>
                    <div className="mt-2">{getStatusBadge(invoice.status)}</div>
                  </div>
                  <Link href={`/invoices/${invoice.id}`}>
                    <Button variant="outline" className="ml-4">
                      詳情
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
