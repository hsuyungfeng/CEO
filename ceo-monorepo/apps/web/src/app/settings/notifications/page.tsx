// 通知設定頁面
'use client'

import { useState, useEffect } from 'react'
import { Bell, Mail, Smartphone, MessageSquare, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { NotificationType, NotificationChannel } from '@prisma/client'
import { getCsrfToken } from 'next-auth/react'

interface NotificationPreference {
  id: string
  supplierApplicationEnabled: boolean
  orderStatusEnabled: boolean
  paymentReminderEnabled: boolean
  purchaseRecommendationEnabled: boolean
  supplierRatingEnabled: boolean
  deliveryPredictionEnabled: boolean
  systemAnnouncementEnabled: boolean
  securityAlertEnabled: boolean
  preferredChannels: NotificationChannel[]
  quietStartHour: number | null
  quietEndHour: number | null
  quietEnabled: boolean
}

const typeLabels: Record<NotificationType, { label: string; description: string }> = {
  SUPPLIER_APPLICATION: {
    label: '供應商申請',
    description: '供應商申請提交、審核結果通知',
  },
  ORDER_STATUS: {
    label: '訂單狀態',
    description: '訂單創建、發貨、完成等狀態更新',
  },
  PAYMENT_REMINDER: {
    label: '繳費提醒',
    description: '帳戶餘額不足、繳費逾期提醒',
  },
  PURCHASE_RECOMMENDATION: {
    label: '採購推薦',
    description: '個人化採購推薦和熱門產品',
  },
  SUPPLIER_RATING: {
    label: '供應商評分',
    description: '收到新評分和評價通知',
  },
  DELIVERY_PREDICTION: {
    label: '交貨預測',
    description: '交貨時間預測更新和延遲警示',
  },
  SYSTEM_ANNOUNCEMENT: {
    label: '系統公告',
    description: '系統維護、新功能公告',
  },
  SECURITY_ALERT: {
    label: '安全警示',
    description: '異常登入、安全相關通知',
  },
}

const channelLabels: Record<NotificationChannel, { label: string; icon: React.ReactNode }> = {
  IN_APP: {
    label: '站內通知',
    icon: <Bell className="h-4 w-4" />,
  },
  EMAIL: {
    label: '電子郵件',
    icon: <Mail className="h-4 w-4" />,
  },
  PUSH: {
    label: '推播通知',
    icon: <Smartphone className="h-4 w-4" />,
  },
  SMS: {
    label: '簡訊',
    icon: <MessageSquare className="h-4 w-4" />,
  },
  ALL: {
    label: '所有渠道',
    icon: <Bell className="h-4 w-4" />,
  },
}

const hourOptions = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${i.toString().padStart(2, '0')}:00`,
}))

export default function NotificationSettingsPage() {
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedChannels, setSelectedChannels] = useState<NotificationChannel[]>([])

  useEffect(() => {
    fetchPreferences()
  }, [])

  useEffect(() => {
    if (preferences) {
      setSelectedChannels(preferences.preferredChannels)
    }
  }, [preferences])

  const fetchPreferences = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/notification-preferences')
      const data = await response.json()
      
      if (data.success) {
        setPreferences(data.data)
      }
    } catch (error) {
      console.error('獲取通知偏好失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  const savePreferences = async () => {
    if (!preferences) return
    
    try {
      setSaving(true)
      
      // 獲取 CSRF 令牌
      const csrfToken = await getCsrfToken()
      
      const response = await fetch('/api/notification-preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...preferences,
          preferredChannels: selectedChannels,
          csrfToken,
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setPreferences(data.data)
        alert('設定已儲存')
      } else {
        alert('儲存失敗：' + data.error)
      }
    } catch (error) {
      console.error('儲存通知偏好失敗:', error)
      alert('儲存失敗，請稍後再試')
    } finally {
      setSaving(false)
    }
  }

  const toggleNotificationType = (type: keyof NotificationPreference) => {
    if (!preferences) return
    
    setPreferences({
      ...preferences,
      [type]: !preferences[type],
    })
  }

  const toggleChannel = (channel: NotificationChannel) => {
    if (selectedChannels.includes(channel)) {
      setSelectedChannels(selectedChannels.filter(c => c !== channel))
    } else {
      setSelectedChannels([...selectedChannels, channel])
    }
  }

  const toggleQuietTime = () => {
    if (!preferences) return
    
    setPreferences({
      ...preferences,
      quietEnabled: !preferences.quietEnabled,
    })
  }

  const updateQuietHour = (type: 'start' | 'end', value: number) => {
    if (!preferences) return
    
    setPreferences({
      ...preferences,
      [type === 'start' ? 'quietStartHour' : 'quietEndHour']: value,
    })
  }

  const resetToDefaults = () => {
    if (!confirm('確定要重置為預設設定嗎？')) return
    
    setPreferences({
      id: preferences?.id || '',
      supplierApplicationEnabled: true,
      orderStatusEnabled: true,
      paymentReminderEnabled: true,
      purchaseRecommendationEnabled: true,
      supplierRatingEnabled: true,
      deliveryPredictionEnabled: true,
      systemAnnouncementEnabled: true,
      securityAlertEnabled: true,
      preferredChannels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      quietStartHour: 22,
      quietEndHour: 8,
      quietEnabled: true,
    })
    setSelectedChannels([NotificationChannel.IN_APP, NotificationChannel.EMAIL])
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">通知設定</h1>
        <p className="text-muted-foreground mt-2">
          管理您希望接收的通知類型和方式
        </p>
      </div>

      <div className="grid gap-6">
        {/* 通知類型設定 */}
        <Card>
          <CardHeader>
            <CardTitle>通知類型</CardTitle>
            <CardDescription>
              選擇您希望接收的通知類型
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(typeLabels).map(([type, info]) => {
              const typeKey = `${type.toLowerCase()}Enabled` as keyof NotificationPreference
              const isEnabled = preferences?.[typeKey] as boolean
              
              return (
                <div key={type} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor={`type-${type}`} className="font-medium">
                      {info.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {info.description}
                    </p>
                  </div>
                  <Switch
                    id={`type-${type}`}
                    checked={isEnabled}
                    onCheckedChange={() => toggleNotificationType(typeKey)}
                  />
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* 通知渠道設定 */}
        <Card>
          <CardHeader>
            <CardTitle>通知渠道</CardTitle>
            <CardDescription>
              選擇您希望接收通知的方式
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {Object.entries(channelLabels).map(([channel, info]) => {
                if (channel === 'ALL') return null // 不顯示 ALL 選項
                
                const isSelected = selectedChannels.includes(channel as NotificationChannel)
                
                return (
                  <div
                    key={channel}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      isSelected 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:bg-accent'
                    }`}
                    onClick={() => toggleChannel(channel as NotificationChannel)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                        {info.icon}
                      </div>
                      <div>
                        <div className="font-medium">{info.label}</div>
                        <div className="text-sm text-muted-foreground">
                          {isSelected ? '已啟用' : '未啟用'}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>• 站內通知：在網站內顯示通知</p>
              <p>• 電子郵件：發送到您的註冊郵箱</p>
              <p>• 推播通知：發送到您的手機或瀏覽器</p>
              <p>• 簡訊：發送到您的手機號碼</p>
            </div>
          </CardContent>
        </Card>

        {/* 靜默時段設定 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="h-5 w-5" />
              靜默時段
            </CardTitle>
            <CardDescription>
              設定不希望被打擾的時間段
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="quiet-enabled">啟用靜默時段</Label>
                <p className="text-sm text-muted-foreground">
                  在靜默時段內，非緊急通知將延遲發送
                </p>
              </div>
              <Switch
                id="quiet-enabled"
                checked={preferences?.quietEnabled || false}
                onCheckedChange={toggleQuietTime}
              />
            </div>

            {preferences?.quietEnabled && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quiet-start">開始時間</Label>
                    <Select
                      value={preferences.quietStartHour?.toString() || '22'}
                      onValueChange={(value) => updateQuietHour('start', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {hourOptions.map((hour) => (
                          <SelectItem key={hour.value} value={hour.value.toString()}>
                            {hour.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="quiet-end">結束時間</Label>
                    <Select
                      value={preferences.quietEndHour?.toString() || '8'}
                      onValueChange={(value) => updateQuietHour('end', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {hourOptions.map((hour) => (
                          <SelectItem key={hour.value} value={hour.value.toString()}>
                            {hour.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm">
                    靜默時段：{preferences.quietStartHour?.toString().padStart(2, '0')}:00 -{' '}
                    {preferences.quietEndHour?.toString().padStart(2, '0')}:00
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    在此時間段內，非緊急通知將不會立即發送，但會在結束後補發。
                    安全警示和繳費提醒等緊急通知不受影響。
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 操作按鈕 */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={resetToDefaults}
          >
            重置為預設值
          </Button>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => window.history.back()}
            >
              取消
            </Button>
            
            <Button
              onClick={savePreferences}
              disabled={saving}
            >
              {saving ? '儲存中...' : '儲存設定'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}