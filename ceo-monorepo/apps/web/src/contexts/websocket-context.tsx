'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { WebSocketManager } from '@/lib/websocket-client'

interface NotificationData {
  id: string
  title: string
  message: string
  type: string
  createdAt: string
  read: boolean
}

interface WebSocketContextType {
  isConnected: boolean
  unreadCount: number
  notifications: NotificationData[]
  connect: () => void
  disconnect: () => void
  markAsRead: (notificationId: string) => void
  clearNotifications: () => void
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket 必須在 WebSocketProvider 內使用')
  }
  return context
}

interface WebSocketProviderProps {
  children: ReactNode
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { data: session, status } = useSession()
  const [isConnected, setIsConnected] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [wsManager] = useState(() => WebSocketManager.getInstance())

  // 在開發環境中禁用 WebSocket（避免控制台噪音）
  const isDevMode = process.env.NODE_ENV === 'development'
  const wsEnabled = !isDevMode

  const connect = () => {
    if (!wsEnabled) {
      console.log('[WebSocket] 開發模式已禁用')
      return
    }
    if (status === 'authenticated' && session?.user?.id) {
      const token = session.accessToken || ''
      wsManager.connect(token)
    }
  }

  const disconnect = () => {
    wsManager.disconnect()
    setIsConnected(false)
  }

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    )
    
    // 更新未讀計數
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const clearNotifications = () => {
    setNotifications([])
  }

  useEffect(() => {
    // 設置事件監聽器
    const unsubscribeConnected = wsManager.on('connected', () => {
      console.log('WebSocket 已連接')
      setIsConnected(true)
    })

    const unsubscribeDisconnected = wsManager.on('disconnected', () => {
      console.log('WebSocket 已斷開連接')
      setIsConnected(false)
    })

    const unsubscribeNotification = wsManager.on('notification', (notification: NotificationData) => {
      console.log('收到新通知:', notification)
      
      setNotifications(prev => [notification, ...prev])
      
      if (!notification.read) {
        setUnreadCount(prev => prev + 1)
      }

      // 顯示桌面通知（如果瀏覽器支持且用戶允許）
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: notification.id
        })
      }
    })

    const unsubscribeUnreadCount = wsManager.on('unread_count', (count: number) => {
      console.log('未讀計數更新:', count)
      setUnreadCount(count)
    })

    const unsubscribeAuthSuccess = wsManager.on('auth_success', () => {
      console.log('WebSocket 驗證成功')
    })

    const unsubscribeAuthError = wsManager.on('auth_error', (error: any) => {
      console.error('WebSocket 驗證失敗:', error)
    })

    const unsubscribeError = wsManager.on('error', (error: any) => {
      console.error('WebSocket 錯誤:', error)
    })

    // 當 session 狀態變化時連接/斷開
    if (status === 'authenticated' && session?.user?.id) {
      connect()
    } else if (status === 'unauthenticated') {
      disconnect()
    }

    // 請求通知權限
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    // 清理函數
    return () => {
      unsubscribeConnected()
      unsubscribeDisconnected()
      unsubscribeNotification()
      unsubscribeUnreadCount()
      unsubscribeAuthSuccess()
      unsubscribeAuthError()
      unsubscribeError()
      disconnect()
    }
  }, [session, status, wsManager])

  // 自動重連機制
  useEffect(() => {
    if (!isConnected && status === 'authenticated') {
      const reconnectTimer = setTimeout(() => {
        console.log('嘗試重新連接 WebSocket')
        connect()
      }, 5000)

      return () => clearTimeout(reconnectTimer)
    }
  }, [isConnected, status, connect])

  const value: WebSocketContextType = {
    isConnected,
    unreadCount,
    notifications,
    connect,
    disconnect,
    markAsRead,
    clearNotifications
  }

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}

// 簡化的 Hook 用於快速訪問未讀計數
export function useUnreadCount() {
  const context = useContext(WebSocketContext)
  return context?.unreadCount || 0
}

// Hook 用於檢查連接狀態
export function useWebSocketConnection() {
  const context = useContext(WebSocketContext)
  return {
    isConnected: context?.isConnected || false,
    connect: context?.connect || (() => {}),
    disconnect: context?.disconnect || (() => {})
  }
}