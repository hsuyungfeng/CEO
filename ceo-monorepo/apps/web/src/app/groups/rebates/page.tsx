'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface RebateInvoice {
  id: string
  invoiceNo: string
  groupId: string
  billingMonth: string
  totalAmount: string | number
  status: 'DRAFT' | 'SENT' | 'CONFIRMED' | 'PAID'
  sentAt: string | null
  confirmedAt: string | null
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: '草稿', SENT: '待確認', CONFIRMED: '已確認', PAID: '已支付',
}
const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  DRAFT: 'secondary', SENT: 'default', CONFIRMED: 'outline', PAID: 'outline',
}

export default function RebatesPage() {
  const [invoices, setInvoices] = useState<RebateInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)

  useEffect(() => {
    fetchRebates()
  }, [])

  const fetchRebates = async () => {
    try {
      setLoading(true)
      // 透過一般發票列表 API 取得，再前端篩選團購發票
      const res = await fetch('/api/invoices')
      if (!res.ok) throw new Error('無法載入發票')
      const data = await res.json()
      // 篩選出 isGroupInvoice 的發票
      const rebates = (data.data ?? []).filter(
        (inv: RebateInvoice & { isGroupInvoice?: boolean }) => inv.isGroupInvoice
      )
      setInvoices(rebates)
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知錯誤')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async (invoiceId: string) => {
    setConfirming(invoiceId)
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/confirm`, { method: 'PATCH' })
      if (!res.ok) throw new Error('確認失敗')
      await fetchRebates()
    } catch (err) {
      alert(err instanceof Error ? err.message : '確認失敗')
    } finally {
      setConfirming(null)
    }
  }

  const formatCurrency = (amount: string | number) =>
    new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD' })
      .format(Number(amount))

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/groups">
            <Button variant="ghost" size="sm">← 團購列表</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">返利發票</h1>
            <p className="text-gray-500 text-sm">團購結算後發送的折扣返利帳單</p>
          </div>
        </div>

        {/* 說明 */}
        <Card className="bg-green-50 border-green-200 mb-6">
          <CardContent className="pt-4 pb-3">
            <p className="text-sm text-green-800">
              <strong>什麼是返利發票？</strong>
              當您參與的團購截止後，若累計件數達折扣門檻，系統會自動計算您的折扣金額並以返利發票形式發送。請確認後即可完成記帳。
            </p>
          </CardContent>
        </Card>

        {loading && <div className="text-center py-12 text-gray-500">載入中...</div>}
        {error   && <div className="text-center py-12 text-red-600">錯誤：{error}</div>}

        {!loading && !error && (
          <>
            {invoices.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <div className="text-4xl mb-3">📋</div>
                  <p>尚無返利發票</p>
                  <p className="text-sm mt-2">加入進行中的團購，結算後返利發票會出現在這裡</p>
                  <Link href="/groups">
                    <Button className="mt-4" variant="outline">查看團購列表</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {invoices.map((inv) => (
                  <Card key={inv.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{inv.invoiceNo}</CardTitle>
                          <p className="text-sm text-gray-500">計費月份：{inv.billingMonth}</p>
                        </div>
                        <Badge variant={STATUS_VARIANT[inv.status] ?? 'secondary'}>
                          {STATUS_LABELS[inv.status] ?? inv.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 text-sm">返利金額</span>
                        <span className="text-xl font-bold text-green-700">
                          {formatCurrency(inv.totalAmount)}
                        </span>
                      </div>

                      {inv.sentAt && (
                        <div className="text-xs text-gray-400">
                          發送時間：{new Date(inv.sentAt).toLocaleString('zh-TW')}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Link href={`/invoices/${inv.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">
                            查看明細
                          </Button>
                        </Link>
                        {inv.status === 'SENT' && (
                          <Button
                            size="sm"
                            className="flex-1"
                            disabled={confirming === inv.id}
                            onClick={() => handleConfirm(inv.id)}
                          >
                            {confirming === inv.id ? '確認中...' : '✓ 確認收到'}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
