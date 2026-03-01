'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface GroupDetail {
  groupId: string
  isActive: boolean
  deadline: string
  title: string
  leader: {
    orderId: string
    orderNo: string
    company: string
    qty: number
  }
  product: { id: string; name: string; unit: string | null; price: number } | null
  members: Array<{
    orderId: string
    orderNo: string
    company: string
    qty: number
    joinedAt: string
  }>
  stats: {
    memberCount: number
    totalQty: number
    currentDiscount: number
    currentDiscountPct: string
    qtyToNextTier: number | null
    nextTierDiscount: number | null
  }
  discountTiers: Array<{ minQty: number; discount: number }>
}

interface Props {
  groupId: string
}

export function GroupDetail({ groupId }: Props) {
  const router = useRouter()
  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Join form
  const [joinQty, setJoinQty] = useState('')
  const [joinNote, setJoinNote] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joinSuccess, setJoinSuccess] = useState(false)
  const [showJoinForm, setShowJoinForm] = useState(false)

  useEffect(() => {
    fetchGroup()
  }, [groupId])

  const fetchGroup = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/groups/${groupId}`)
      if (!res.ok) throw new Error('找不到此團購')
      const result = await res.json()
      setGroup(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setJoinError(null)
    const qty = parseInt(joinQty)
    if (!qty || qty <= 0) { setJoinError('請輸入有效數量'); return }

    setJoining(true)
    try {
      const res = await fetch(`/api/groups/${groupId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: qty, note: joinNote || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '加入失敗')
      setJoinSuccess(true)
      setShowJoinForm(false)
      // 重新載入最新數據
      setTimeout(() => { fetchGroup(); setJoinSuccess(false) }, 1000)
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : '發生錯誤')
    } finally {
      setJoining(false)
    }
  }

  const formatDeadline = (d: string) => new Date(d).toLocaleString('zh-TW')

  if (loading) return <div className="text-center py-12 text-gray-500">載入中...</div>
  if (error)   return <div className="text-center py-12 text-red-600">錯誤：{error}</div>
  if (!group)  return null

  const { stats } = group
  const progressPct = group.discountTiers[1]
    ? Math.min((stats.totalQty / group.discountTiers[1].minQty) * 100, 100)
    : 100

  return (
    <div className="space-y-6">
      {/* 標頭 */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{group.title}</CardTitle>
              <p className="text-gray-500 mt-1">發起：{group.leader.company}</p>
            </div>
            <div className="text-right">
              {group.isActive
                ? <Badge className="bg-green-600">進行中</Badge>
                : <Badge variant="secondary">已截止</Badge>}
              <p className="text-xs text-gray-500 mt-1">截止：{formatDeadline(group.deadline)}</p>
            </div>
          </div>
        </CardHeader>
        {group.product && (
          <CardContent className="pt-0">
            <div className="text-sm text-gray-600">
              商品：<span className="font-medium text-gray-900">{group.product.name}</span>
              {group.product.unit && ` (${group.product.unit})`}
              　單價：<span className="font-medium text-gray-900">
                NT$ {Number(group.product.price).toLocaleString()}
              </span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 統計 + 進度 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">團購進度</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 數字卡片 */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-2xl font-bold">{stats.totalQty}</div>
              <div className="text-xs text-gray-500">累計件數</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-2xl font-bold">{stats.memberCount + 1}</div>
              <div className="text-xs text-gray-500">參與公司</div>
            </div>
            <div className={`rounded-lg p-3 ${stats.currentDiscount > 0 ? 'bg-green-50' : 'bg-gray-50'}`}>
              <div className={`text-2xl font-bold ${stats.currentDiscount > 0 ? 'text-green-700' : ''}`}>
                {stats.currentDiscountPct}
              </div>
              <div className="text-xs text-gray-500">目前折扣</div>
            </div>
          </div>

          {/* 進度條 */}
          {stats.qtyToNextTier !== null && (
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>距下一階梯（還差 {stats.qtyToNextTier} 件）</span>
                <span>→ {((stats.nextTierDiscount ?? 0) * 100).toFixed(0)}% 折扣</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {/* 折扣說明 */}
          <div className="text-xs text-gray-400 flex flex-wrap gap-3">
            {group.discountTiers.map((t, i) => (
              <span key={i}
                className={stats.currentDiscount === t.discount && stats.totalQty >= t.minQty
                  ? 'font-semibold text-blue-700' : ''}>
                ≥{t.minQty}件: {(t.discount * 100).toFixed(0)}%
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 加入表單 */}
      {group.isActive && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">加入此團購</CardTitle>
          </CardHeader>
          <CardContent>
            {joinSuccess && (
              <div className="text-green-700 bg-green-50 border border-green-200 rounded p-3 mb-3 text-sm">
                ✓ 已成功加入團購！
              </div>
            )}
            {!showJoinForm ? (
              <Button onClick={() => setShowJoinForm(true)} className="w-full">
                我要加入
              </Button>
            ) : (
              <form onSubmit={handleJoin} className="space-y-3">
                <div>
                  <Label htmlFor="joinQty">訂購數量 *</Label>
                  <Input
                    id="joinQty"
                    type="number"
                    min={1}
                    required
                    placeholder="例：50"
                    value={joinQty}
                    onChange={e => setJoinQty(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="joinNote">備註（選填）</Label>
                  <Textarea
                    id="joinNote"
                    rows={2}
                    placeholder="特殊需求或說明..."
                    value={joinNote}
                    onChange={e => setJoinNote(e.target.value)}
                  />
                </div>
                {joinQty && group.product && (
                  <div className="text-sm text-gray-600 bg-gray-50 rounded p-2">
                    預估小計：NT$ {(parseInt(joinQty) * Number(group.product.price)).toLocaleString()}
                    （折扣於截止後統一返利）
                  </div>
                )}
                {joinError && (
                  <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-2">
                    {joinError}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button type="button" variant="outline"
                    onClick={() => { setShowJoinForm(false); setJoinError(null) }} className="flex-1">
                    取消
                  </Button>
                  <Button type="submit" disabled={joining} className="flex-1">
                    {joining ? '加入中...' : '確認加入'}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* 成員列表 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">參與成員</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {/* 團長 */}
            <div className="flex justify-between items-center py-1 border-b">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">團長</Badge>
                <span className="font-medium">{group.leader.company}</span>
              </div>
              <span className="text-gray-600">{group.leader.qty} 件</span>
            </div>
            {/* 成員 */}
            {group.members.length === 0 ? (
              <p className="text-gray-400 py-2">尚無成員加入</p>
            ) : (
              group.members.map((m) => (
                <div key={m.orderId} className="flex justify-between items-center py-1 border-b last:border-0">
                  <span>{m.company}</span>
                  <span className="text-gray-600">{m.qty} 件</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
