'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface Group {
  groupId: string
  leaderOrderId: string
  title: string
  company: string
  deadline: string
  product: { id: string; name: string; unit: string | null; price: number } | null
  leaderQty: number
  memberCount: number
  totalQty: number
  currentDiscount: number
  createdAt: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export function GroupList() {
  const [groups, setGroups] = useState<Group[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchGroups()
  }, [])

  const fetchGroups = async (page = 1) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/groups?page=${page}&limit=20`)
      if (!res.ok) throw new Error('無法載入團購列表')
      const result = await res.json()
      setGroups(result.data)
      setPagination(result.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知錯誤')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD' }).format(amount)

  const formatDeadline = (deadline: string) => {
    const d = new Date(deadline)
    const diff = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return { text: d.toLocaleDateString('zh-TW'), daysLeft: diff }
  }

  const getDiscountBadge = (discount: number) => {
    if (discount >= 0.1) return <Badge className="bg-green-600">10% 折扣</Badge>
    if (discount >= 0.05) return <Badge className="bg-blue-600">5% 折扣</Badge>
    return <Badge variant="secondary">累積中</Badge>
  }

  if (loading) return <div className="text-center py-12 text-gray-500">載入中...</div>
  if (error)   return <div className="text-center py-12 text-red-600">錯誤：{error}</div>

  return (
    <div className="space-y-6">
      {/* 說明列 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4 pb-3">
          <p className="text-sm text-blue-800">
            <strong>階梯折扣規則：</strong>
            100–499 件享 <strong>5%</strong> 折扣；500 件以上享 <strong>10%</strong> 折扣。加入越多，折扣越高！
          </p>
        </CardContent>
      </Card>

      {/* 列表 */}
      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            目前沒有進行中的團購
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => {
            const { text: deadlineText, daysLeft } = formatDeadline(group.deadline)
            return (
              <Card key={group.groupId} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-tight">{group.title}</CardTitle>
                    {getDiscountBadge(group.currentDiscount)}
                  </div>
                  <p className="text-sm text-gray-500">發起：{group.company}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* 商品資訊 */}
                  {group.product && (
                    <div className="text-sm">
                      <span className="text-gray-600">商品：</span>
                      <span className="font-medium">{group.product.name}</span>
                      {group.product.unit && (
                        <span className="text-gray-500">（{group.product.unit}）</span>
                      )}
                    </div>
                  )}

                  {/* 統計 */}
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="bg-gray-50 rounded p-1">
                      <div className="font-semibold">{group.totalQty}</div>
                      <div className="text-xs text-gray-500">累計件</div>
                    </div>
                    <div className="bg-gray-50 rounded p-1">
                      <div className="font-semibold">{group.memberCount}</div>
                      <div className="text-xs text-gray-500">成員數</div>
                    </div>
                    <div className="bg-gray-50 rounded p-1">
                      <div className={`font-semibold ${daysLeft <= 3 ? 'text-red-600' : 'text-gray-900'}`}>
                        {daysLeft}天
                      </div>
                      <div className="text-xs text-gray-500">剩餘</div>
                    </div>
                  </div>

                  {/* 截止日 + 操作 */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-gray-400">截止：{deadlineText}</span>
                    <Link href={`/groups/${group.groupId}`}>
                      <Button size="sm" variant="outline">查看 / 加入</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* 分頁 */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
            <Button
              key={p}
              size="sm"
              variant={p === pagination.page ? 'default' : 'outline'}
              onClick={() => fetchGroups(p)}
            >
              {p}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
