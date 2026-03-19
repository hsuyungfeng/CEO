// 通知中心頁面
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check, Archive, Trash2, Filter, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { NotificationType, NotificationStatus } from '@prisma/client'

interface Notification {
  id: string
  type: NotificationType
  title: string
  content: string
  data: Record<string, unknown>
  status: NotificationStatus
  isRead: boolean
  readAt: string | null
  createdAt: string
  deliveries: Array<{
    channel: string
    status: string
    sentAt: string | null
    deliveredAt: string | null
  }>
}

interface NotificationStats {
  total: number
  unread: number
  byType: Record<NotificationType, number>
  byStatus: Record<NotificationStatus, number>
}

const typeLabels: Record<NotificationType, string> = {
  SUPPLIER_APPLICATION: '供應商申請',
  ORDER_STATUS: '訂單狀態',
  PAYMENT_REMINDER: '繳費提醒',
  PURCHASE_RECOMMENDATION: '採購推薦',
  SUPPLIER_RATING: '供應商評分',
  DELIVERY_PREDICTION: '交貨預測',
  SYSTEM_ANNOUNCEMENT: '系統公告',
  SECURITY_ALERT: '安全警示',
}

const typeColors: Record<NotificationType, string> = {
  SUPPLIER_APPLICATION: 'bg-blue-100 text-blue-800',
  ORDER_STATUS: 'bg-green-100 text-green-800',
  PAYMENT_REMINDER: 'bg-yellow-100 text-yellow-800',
  PURCHASE_RECOMMENDATION: 'bg-purple-100 text-purple-800',
  SUPPLIER_RATING: 'bg-pink-100 text-pink-800',
  DELIVERY_PREDICTION: 'bg-indigo-100 text-indigo-800',
  SYSTEM_ANNOUNCEMENT: 'bg-gray-100 text-gray-800',
  SECURITY_ALERT: 'bg-red-100 text-red-800',
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [selectedType, setSelectedType] = useState<NotificationType | 'all'>('all')
  const [markingAll, setMarkingAll] = useState(false)

  useEffect(() => {
    fetchNotifications()
    fetchStats()
  }, [activeTab, selectedType])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (activeTab === 'unread') {
        params.append('isRead', 'false')
      } else if (activeTab === 'archived') {
        params.append('status', 'ARCHIVED')
      }
      
      if (selectedType !== 'all') {
        params.append('type', selectedType)
      }

      const response = await fetch(`/api/notifications?${params.toString()}`)
      const data = await response.json()
      
      if (data.success) {
        setNotifications(data.data)
      }
    } catch (error) {
      console.error('獲取通知失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/notifications/unread-count')
      const data = await response.json()
      
      if (data.success) {
        // 這裡可以擴展獲取完整統計數據
        setStats({
          total: 0, // 需要額外API
          unread: data.data.count,
          byType: {} as Record<NotificationType, number>,
          byStatus: {} as Record<NotificationStatus, number>,
        })
      }
    } catch (error) {
      console.error('獲取統計失敗:', error)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
      })
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === id 
              ? { ...notification, isRead: true, readAt: new Date().toISOString() }
              : notification
          )
        )
        fetchStats() // 更新統計
      }
    } catch (error) {
      console.error('標記已讀失敗:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      setMarkingAll(true)
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PATCH',
      })
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(notification => ({
            ...notification,
            isRead: true,
            readAt: new Date().toISOString(),
          }))
        )
        fetchStats()
      }
    } catch (error) {
      console.error('標記所有已讀失敗:', error)
    } finally {
      setMarkingAll(false)
    }
  }

  const archiveNotification = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/archive`, {
        method: 'PATCH',
      })
      
      if (response.ok) {
        setNotifications(prev => prev.filter(notification => notification.id !== id))
      }
    } catch (error) {
      console.error('歸檔通知失敗:', error)
    }
  }

  const deleteNotification = async (id: string) => {
    if (!confirm('確定要刪除此通知嗎？')) return
    
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        setNotifications(prev => prev.filter(notification => notification.id !== id))
      }
    } catch (error) {
      console.error('刪除通知失敗:', error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return '剛剛'
    if (diffMins < 60) return `${diffMins}分鐘前`
    if (diffHours < 24) return `${diffHours}小時前`
    if (diffDays < 7) return `${diffDays}天前`
    
    return date.toLocaleDateString('zh-TW')
  }

  const handleNotificationClick = (notification: Notification) => {
    // 標記為已讀
    if (!notification.isRead) {
      markAsRead(notification.id)
    }

    // 根據通知類型導航到相關頁面
    if (notification.data?.relatedId && notification.data?.relatedType) {
      switch (notification.data.relatedType) {
        case 'SupplierApplication':
          router.push(`/supplier/applications`)
          break
        case 'Order':
          router.push(`/orders/${notification.data.orderId}`)
          break
        case 'Supplier':
          router.push(`/suppliers/${notification.data.supplierId}`)
          break
        case 'Product':
          router.push(`/products/${notification.data.productId}`)
          break
        default:
          // 不導航，只標記已讀
          break
      }
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">通知中心</h1>
          <p className="text-muted-foreground mt-2">
            管理您的所有通知和提醒
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {stats && stats.unread > 0 && (
            <Button 
              variant="outline" 
              onClick={markAllAsRead}
              disabled={markingAll}
            >
              <Check className="h-4 w-4 mr-2" />
              {markingAll ? '處理中...' : '標記所有已讀'}
            </Button>
          )}
          
          <Button onClick={() => router.push('/settings/notifications')}>
            通知設定
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* 統計卡片 */}
        <Card>
          <CardHeader>
            <CardTitle>通知統計</CardTitle>
            <CardDescription>您的通知概覽</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col items-center justify-center p-4 bg-card rounded-lg border">
                <div className="text-2xl font-bold">
                  {notifications.length}
                </div>
                <div className="text-sm text-muted-foreground">總通知數</div>
              </div>
              
              <div className="flex flex-col items-center justify-center p-4 bg-card rounded-lg border">
                <div className="text-2xl font-bold text-primary">
                  {notifications.filter(n => !n.isRead).length}
                </div>
                <div className="text-sm text-muted-foreground">未讀通知</div>
              </div>
              
              <div className="flex flex-col items-center justify-center p-4 bg-card rounded-lg border">
                <div className="text-2xl font-bold">
                  {Object.keys(typeLabels).length}
                </div>
                <div className="text-sm text-muted-foreground">通知類型</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 主內容 */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>通知列表</CardTitle>
                <CardDescription>
                  查看和管理您的所有通知
                </CardDescription>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as NotificationType | 'all')}
                    className="pl-10 pr-8 py-2 rounded-md border bg-background"
                  >
                    <option value="all">所有類型</option>
                    {Object.entries(typeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 mb-6">
                <TabsTrigger value="all">
                  全部
                  {notifications.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {notifications.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="unread">
                  未讀
                  {notifications.filter(n => !n.isRead).length > 0 && (
                    <Badge className="ml-2">
                      {notifications.filter(n => !n.isRead).length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="archived">已歸檔</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="space-y-4">
                {loading ? (
                  // 載入骨架
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="p-4 border rounded-lg">
                      <div className="flex items-start gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-1/4" />
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/6" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : notifications.length === 0 ? (
                  <div className="text-center py-12">
                    <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">暫無通知</h3>
                    <p className="text-muted-foreground">
                      {activeTab === 'unread' 
                        ? '您沒有未讀通知' 
                        : activeTab === 'archived'
                        ? '您沒有已歸檔的通知'
                        : '您還沒有收到任何通知'}
                    </p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border rounded-lg transition-colors hover:bg-accent/50 cursor-pointer ${
                        !notification.isRead ? 'bg-accent/30' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${typeColors[notification.type]}`}>
                          <Bell className="h-5 w-5" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {notification.title}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {typeLabels[notification.type]}
                              </Badge>
                              {!notification.isRead && (
                                <span className="h-2 w-2 rounded-full bg-primary"></span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">
                                {formatDate(notification.createdAt)}
                              </span>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2">
                            {notification.content}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {notification.deliveries?.map((delivery, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {delivery.channel}
                                </Badge>
                              ))}
                            </div>
                            
                            <div className="flex items-center gap-1">
                              {!notification.isRead && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    markAsRead(notification.id)
                                  }}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  標記已讀
                                </Button>
                              )}
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  archiveNotification(notification.id)
                                }}
                              >
                                <Archive className="h-4 w-4 mr-1" />
                                歸檔
                              </Button>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteNotification(notification.id)
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                刪除
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}