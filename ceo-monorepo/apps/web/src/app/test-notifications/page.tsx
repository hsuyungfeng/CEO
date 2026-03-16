// 測試通知系統頁面
'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NotificationType } from '@prisma/client'

const testNotifications = [
  {
    type: NotificationType.SUPPLIER_APPLICATION,
    title: '供應商申請測試',
    content: '這是一個供應商申請通知測試',
    data: {
      supplierId: 'test-supplier-123',
      applicationId: 'test-application-456',
      action: 'submitted',
    },
  },
  {
    type: NotificationType.ORDER_STATUS,
    title: '訂單狀態測試',
    content: '您的訂單 #TEST-001 狀態已更新',
    data: {
      orderId: 'test-order-123',
      orderNo: 'TEST-001',
      status: 'PROCESSING',
    },
  },
  {
    type: NotificationType.PAYMENT_REMINDER,
    title: '繳費提醒測試',
    content: '您的帳戶餘額低於 NT$ 1,000',
    data: {
      reminderType: 'LOW_BALANCE',
      balance: 800,
      dueAmount: 0,
      daysOverdue: 0,
    },
  },
  {
    type: NotificationType.PURCHASE_RECOMMENDATION,
    title: '採購推薦測試',
    content: '為您推薦：測試產品（基於您的採購歷史）',
    data: {
      productId: 'test-product-123',
      productName: '測試產品',
      reason: '熱門產品',
    },
  },
  {
    type: NotificationType.SYSTEM_ANNOUNCEMENT,
    title: '系統公告測試',
    content: '這是一個系統公告測試通知',
    data: {
      announcementType: 'TEST',
      priority: 'LOW',
    },
  },
]

export default function TestNotificationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  const sendTestNotification = async (notification: any) => {
    try {
      setLoading(true)
      setError(null)
      
      if (status === 'loading') {
        setError('正在載入用戶資訊，請稍候...')
        return
      }
      
      if (status === 'unauthenticated' || !session?.user?.id) {
        setError('請先登入以測試通知功能')
        router.push('/auth/login')
        return
      }
      
      // 使用當前登入用戶的ID
      const userId = session.user.id
      
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          ...notification,
        }),
      })
      
      const data = await response.json()
      
      setResults(prev => [...prev, {
        notification,
        success: data.success,
        result: data.data,
        error: data.error,
        timestamp: new Date().toISOString(),
      }])
      
    } catch (error) {
      console.error('發送測試通知失敗:', error)
      setResults(prev => [...prev, {
        notification,
        success: false,
        error: error instanceof Error ? error.message : '未知錯誤',
        timestamp: new Date().toISOString(),
      }])
    } finally {
      setLoading(false)
    }
  }

  const sendAllTestNotifications = async () => {
    setResults([])
    for (const notification of testNotifications) {
      await sendTestNotification(notification)
      // 稍微延遲以避免請求過快
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  const clearResults = () => {
    setResults([])
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">通知系統測試</h1>
        <p className="text-muted-foreground mt-2">
          測試 Phase 9 通知系統的各項功能
        </p>
      </div>

      <div className="grid gap-6">
        {/* 測試控制面板 */}
        <Card>
          <CardHeader>
            <CardTitle>測試控制</CardTitle>
            <CardDescription>
              發送測試通知以驗證通知系統功能
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={sendAllTestNotifications}
                disabled={loading}
              >
                {loading ? '發送中...' : '發送所有測試通知'}
              </Button>
              
              <Button
                variant="outline"
                onClick={clearResults}
              >
                清除結果
              </Button>
             </div>
            
             {error && (
               <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                 <div className="text-red-800 font-medium">錯誤</div>
                 <div className="text-red-600 text-sm mt-1">{error}</div>
               </div>
             )}
            
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {testNotifications.map((notification, index) => (
                <Card key={index} className="bg-muted/50">
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="font-medium">{notification.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {notification.content}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        類型: {notification.type}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => sendTestNotification(notification)}
                        disabled={loading}
                      >
                        單獨測試
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 測試結果 */}
        <Card>
          <CardHeader>
            <CardTitle>測試結果</CardTitle>
            <CardDescription>
              查看通知發送結果和詳細資訊
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                尚未執行任何測試
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 border rounded-lg ${
                      result.success 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="font-medium">
                          {result.notification.title}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {result.notification.content}
                        </div>
                        <div className="text-xs">
                          類型: {result.notification.type}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          時間: {new Date(result.timestamp).toLocaleString('zh-TW')}
                        </div>
                      </div>
                      
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        result.success 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {result.success ? '成功' : '失敗'}
                      </div>
                    </div>
                    
                    {result.error && (
                      <div className="mt-2 text-sm text-red-600">
                        錯誤: {result.error}
                      </div>
                    )}
                    
                    {result.result && (
                      <div className="mt-2 text-sm">
                        <details>
                          <summary className="cursor-pointer text-muted-foreground">
                            查看詳細結果
                          </summary>
                          <pre className="mt-2 p-2 bg-black/5 rounded text-xs overflow-auto">
                            {JSON.stringify(result.result, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* 統計 */}
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{results.length}</div>
                      <div className="text-sm text-muted-foreground">總測試數</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {results.filter(r => r.success).length}
                      </div>
                      <div className="text-sm text-muted-foreground">成功</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {results.filter(r => !r.success).length}
                      </div>
                      <div className="text-sm text-muted-foreground">失敗</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {results.length > 0 
                          ? `${((results.filter(r => r.success).length / results.length) * 100).toFixed(1)}%`
                          : '0%'
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">成功率</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 系統狀態 */}
        <Card>
          <CardHeader>
            <CardTitle>系統狀態</CardTitle>
            <CardDescription>
              通知系統相關的服務狀態
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">資料庫連接</div>
                  <div className="text-sm text-muted-foreground">
                    PostgreSQL 通知模型
                  </div>
                </div>
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">API 端點</div>
                  <div className="text-sm text-muted-foreground">
                    通知相關 API 服務
                  </div>
                </div>
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">前端組件</div>
                  <div className="text-sm text-muted-foreground">
                    通知頁面和組件
                  </div>
                </div>
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">整合服務</div>
                  <div className="text-sm text-muted-foreground">
                    與現有系統整合
                  </div>
                </div>
                <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}