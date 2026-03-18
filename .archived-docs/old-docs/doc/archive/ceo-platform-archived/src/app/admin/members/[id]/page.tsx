'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  ArrowLeft, Mail, Phone, MapPin, User, Building, CreditCard, Calendar, 
  Package, Plus, Minus,
  TrendingUp, History, Activity
} from 'lucide-react'
import Link from 'next/link'
import MemberStatusUpdate from '@/components/admin/member-status-update'
import AdjustPointsDialog from '@/components/admin/adjust-points-dialog'
import UserLogs from '@/components/admin/user-logs'



interface MemberDetail {
  id: string
  email: string
  name: string
  taxId: string
  phone: string | null
  fax: string | null
  address: string | null
  contactPerson: string | null
  points: number
  role: string
  status: string
  loginAttempts: number
  lockedUntil: string | null
  emailVerified: boolean
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
  orders: Array<{
    id: string
    orderNo: string
    totalAmount: number
    status: string
    createdAt: string
  }>
  recentPointTransactions: Array<{
    id: string
    amount: number
    balance: number
    type: string
    reason: string | null
    referenceId: string | null
    createdAt: string
  }>
  orderStats: {
    total: number
    totalAmount: number
    completed: number
    pending: number
  }
}

export default function MemberDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [member, setMember] = useState<MemberDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  const fetchMember = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${params.id}`)
      const result = await response.json()

      if (result.success) {
        setMember(result.data)
      } else {
        console.error('取得會員詳情失敗:', result.error)
      }
    } catch (error) {
      console.error('取得會員詳情錯誤:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (params.id) {
      fetchMember()
    }
  }, [params.id])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">啟用中</Badge>
      case 'INACTIVE':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">未啟用</Badge>
      case 'SUSPENDED':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">已停權</Badge>
      case 'DELETED':
        return <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-300">已刪除</Badge>
      default:
        return <Badge variant="outline">未知</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const handlePointsUpdated = () => {
    fetchMember() // 重新獲取會員數據
  }

  const handleStatusUpdated = () => {
    fetchMember() // 重新獲取會員數據
  }

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-32 mt-2 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-64 bg-gray-200 rounded animate-pulse" />
            <div className="h-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-64 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="space-y-6">
            <div className="h-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-32 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (!member) {
    return (
      <div className="text-center py-12">
        <User className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium">會員不存在</h3>
        <p className="mt-2 text-sm text-gray-500">
          找不到指定的會員資料
        </p>
        <Button onClick={() => router.push('/admin/members')} className="mt-4">
          返回會員列表
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/admin/members')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">會員詳情</h1>
              <p className="mt-2 text-gray-600">{member.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(member.status)}
          </div>
        </div>
      </div>

      {/* 標籤導航 */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Activity className="inline mr-2 h-4 w-4" />
            總覽
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'orders'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Package className="inline mr-2 h-4 w-4" />
            訂單記錄
          </button>
          <button
            onClick={() => setActiveTab('points')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'points'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <TrendingUp className="inline mr-2 h-4 w-4" />
            點數管理
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'logs'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <History className="inline mr-2 h-4 w-4" />
            操作日誌
          </button>
        </nav>
      </div>

      {activeTab === 'overview' && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {/* 基本資訊 */}
              <Card>
                <CardHeader>
                  <CardTitle>基本資訊</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-500">
                        <Building className="mr-2 h-4 w-4" />
                        公司名稱
                      </div>
                      <div className="font-medium">{member.name}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-500">
                        <CreditCard className="mr-2 h-4 w-4" />
                        統一編號
                      </div>
                      <div className="font-medium">{member.taxId}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-500">
                        <User className="mr-2 h-4 w-4" />
                        聯絡人
                      </div>
                      <div className="font-medium">{member.contactPerson || '未設定'}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="mr-2 h-4 w-4" />
                        註冊時間
                      </div>
                      <div className="font-medium">
                        {formatDate(member.createdAt)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 聯絡資訊 */}
              <Card>
                <CardHeader>
                  <CardTitle>聯絡資訊</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <Mail className="mr-3 h-5 w-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">Email</div>
                        <div className="font-medium">{member.email}</div>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center">
                      <Phone className="mr-3 h-5 w-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">電話</div>
                        <div className="font-medium">{member.phone || '未設定'}</div>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center">
                      <MapPin className="mr-3 h-5 w-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">地址</div>
                        <div className="font-medium">{member.address || '未設定'}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 最近訂單 */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>最近訂單</CardTitle>
                    <Link href={`/admin/orders?search=${member.taxId}`}>
                      <Button variant="outline" size="sm">查看所有訂單</Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {member.orders.length > 0 ? (
                    <div className="space-y-4">
                      {member.orders.map((order) => (
                        <div key={order.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                          <div>
                            <div className="font-medium">{order.orderNo}</div>
                            <div className="text-sm text-gray-500">
                              {formatDate(order.createdAt)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{formatCurrency(order.totalAmount)}</div>
                            <Badge variant="outline" className="mt-1">
                              {order.status === 'PENDING' ? '待處理' :
                               order.status === 'CONFIRMED' ? '已確認' :
                               order.status === 'SHIPPED' ? '已出貨' :
                               order.status === 'COMPLETED' ? '已完成' : '已取消'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      此會員尚未有訂單記錄
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              {/* 狀態管理 */}
              <Card>
                <CardHeader>
                  <CardTitle>狀態管理</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">目前狀態</div>
                      {getStatusBadge(member.status)}
                    </div>
                    <MemberStatusUpdate 
                      memberId={member.id} 
                      currentStatus={member.status}
                      onSuccess={handleStatusUpdated}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 統計數據 */}
              <Card>
                <CardHeader>
                  <CardTitle>統計數據</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <div className="text-sm text-gray-600">總訂單數</div>
                      <div className="font-medium">{member.orderStats.total}</div>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <div className="text-sm text-gray-600">總消費金額</div>
                      <div className="font-medium text-green-600">
                        {formatCurrency(member.orderStats.totalAmount)}
                      </div>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <div className="text-sm text-gray-600">已完成訂單</div>
                      <div className="font-medium">{member.orderStats.completed}</div>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <div className="text-sm text-gray-600">待處理訂單</div>
                      <div className="font-medium">{member.orderStats.pending}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 紅利點數 */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>紅利點數</CardTitle>
                    <AdjustPointsDialog 
                      memberId={member.id} 
                      currentPoints={member.points}
                      onSuccess={handlePointsUpdated}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-600">
                      {member.points.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500 mt-2">目前點數餘額</div>
                    
                    {/* 最近點數交易 */}
                    {member.recentPointTransactions.length > 0 && (
                      <div className="mt-6">
                        <div className="text-sm font-medium text-gray-700 mb-2">最近交易</div>
                        <div className="space-y-2">
                          {member.recentPointTransactions.slice(0, 3).map((transaction) => (
                            <div key={transaction.id} className="flex items-center justify-between text-sm">
                              <div className="flex items-center">
                                {transaction.amount > 0 ? (
                                  <Plus className="h-3 w-3 text-green-500 mr-1" />
                                ) : (
                                  <Minus className="h-3 w-3 text-red-500 mr-1" />
                                )}
                                <span className={transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                                  {Math.abs(transaction.amount).toLocaleString()} 點
                                </span>
                              </div>
                              <div className="text-gray-500 text-xs">
                                {formatDate(transaction.createdAt)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
        
        {activeTab === 'orders' && (
          <Card>
            <CardHeader>
              <CardTitle>訂單記錄</CardTitle>
            </CardHeader>
            <CardContent>
              {member.orders.length > 0 ? (
                <div className="space-y-4">
                  {member.orders.map((order) => (
                    <Card key={order.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{order.orderNo}</div>
                            <div className="text-sm text-gray-500">
                              {formatDate(order.createdAt)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{formatCurrency(order.totalAmount)}</div>
                            <Badge variant="outline" className="mt-1">
                              {order.status === 'PENDING' ? '待處理' :
                               order.status === 'CONFIRMED' ? '已確認' :
                               order.status === 'SHIPPED' ? '已出貨' :
                               order.status === 'COMPLETED' ? '已完成' : '已取消'}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  此會員尚未有訂單記錄
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {activeTab === 'points' && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>點數交易記錄</CardTitle>
                </CardHeader>
                <CardContent>
                  {member.recentPointTransactions.length > 0 ? (
                    <div className="space-y-4">
                      {member.recentPointTransactions.map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                          <div>
                            <div className="font-medium">
                              {transaction.type === 'ORDER_EARNED' ? '訂單獲得' :
                               transaction.type === 'ORDER_REFUND' ? '訂單退款' :
                               transaction.type === 'MANUAL_ADJUST' ? '手動調整' : '系統調整'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {transaction.reason || '無說明'}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {formatDate(transaction.createdAt)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-medium ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString()} 點
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              餘額: {transaction.balance.toLocaleString()} 點
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      此會員尚未有點數交易記錄
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>點數管理</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-blue-600">
                        {member.points.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500 mt-2">目前點數餘額</div>
                    </div>
                    <Separator />
                    <AdjustPointsDialog 
                      memberId={member.id} 
                      currentPoints={member.points}
                      onSuccess={handlePointsUpdated}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
        
        {activeTab === 'logs' && (
          <UserLogs memberId={member.id} />
        )}
    </div>
  )
}