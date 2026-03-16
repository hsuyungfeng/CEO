import { WebSocketServer, WebSocket } from 'ws'
import { Server } from 'http'
import { verify } from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

interface WebSocketClient {
  ws: WebSocket
  userId: string
  sessionId: string
}

interface NotificationMessage {
  type: 'notification'
  data: {
    id: string
    title: string
    message: string
    type: string
    createdAt: string
    read: boolean
  }
}

interface AuthMessage {
  type: 'auth'
  token: string
}

interface HeartbeatMessage {
  type: 'heartbeat'
}

type WebSocketMessage = AuthMessage | HeartbeatMessage

export class NotificationWebSocketServer {
  private wss: WebSocketServer
  private clients: Map<string, WebSocketClient> = new Map()
  private heartbeatInterval: NodeJS.Timeout | null = null

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws/notifications' })
    
    this.setupWebSocketServer()
    this.startHeartbeat()
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket, request) => {
      console.log('新的 WebSocket 連接建立')
      
      const clientId = this.generateClientId()
      
      ws.on('message', async (data: Buffer) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString())
          
          switch (message.type) {
            case 'auth':
              await this.handleAuth(clientId, ws, message.token)
              break
            case 'heartbeat':
              this.handleHeartbeat(clientId)
              break
            default:
              console.warn('未知的 WebSocket 訊息類型:', message)
          }
        } catch (error) {
          console.error('處理 WebSocket 訊息時發生錯誤:', error)
          ws.send(JSON.stringify({
            type: 'error',
            message: '無效的訊息格式'
          }))
        }
      })

      ws.on('close', () => {
        console.log(`客戶端 ${clientId} 斷開連接`)
        this.clients.delete(clientId)
      })

      ws.on('error', (error) => {
        console.error(`客戶端 ${clientId} WebSocket 錯誤:`, error)
        this.clients.delete(clientId)
      })

      ws.send(JSON.stringify({
        type: 'connected',
        clientId,
        timestamp: new Date().toISOString()
      }))
    })
  }

  private async handleAuth(clientId: string, ws: WebSocket, token: string) {
    try {
      const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET
      if (!secret) {
        throw new Error('JWT 密鑰未設定')
      }

      const decoded = verify(token, secret) as { userId: string; sessionId: string }
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      })

      if (!user) {
        throw new Error('用戶不存在')
      }

      this.clients.set(clientId, {
        ws,
        userId: decoded.userId,
        sessionId: decoded.sessionId
      })

      console.log(`用戶 ${decoded.userId} 驗證成功，客戶端 ID: ${clientId}`)

      ws.send(JSON.stringify({
        type: 'auth_success',
        userId: decoded.userId,
        timestamp: new Date().toISOString()
      }))

      const unreadCount = await prisma.notification.count({
        where: {
          userId: decoded.userId,
          isRead: false
        }
      })

      ws.send(JSON.stringify({
        type: 'unread_count',
        count: unreadCount
      }))

    } catch (error) {
      console.error('驗證失敗:', error)
      ws.send(JSON.stringify({
        type: 'auth_error',
        message: '驗證失敗'
      }))
      ws.close()
    }
  }

  private handleHeartbeat(clientId: string) {
    const client = this.clients.get(clientId)
    if (client) {
      client.ws.send(JSON.stringify({
        type: 'heartbeat_ack',
        timestamp: new Date().toISOString()
      }))
    }
  }

  private generateClientId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15)
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now()
      const timeout = 30000 // 30秒

      for (const [clientId, client] of this.clients.entries()) {
        try {
          client.ws.ping()
        } catch (error) {
          console.error(`發送心跳到客戶端 ${clientId} 時發生錯誤:`, error)
          this.clients.delete(clientId)
          client.ws.close()
        }
      }
    }, 15000) // 每15秒發送一次心跳
  }

  public async sendNotificationToUser(userId: string, notification: any) {
    const message: NotificationMessage = {
      type: 'notification',
      data: {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        createdAt: notification.createdAt.toISOString(),
        read: notification.read
      }
    }

    let sentCount = 0
    for (const [clientId, client] of this.clients.entries()) {
      if (client.userId === userId) {
        try {
          client.ws.send(JSON.stringify(message))
          sentCount++
          console.log(`通知已發送給用戶 ${userId}，客戶端 ID: ${clientId}`)
        } catch (error) {
          console.error(`發送通知到客戶端 ${clientId} 時發生錯誤:`, error)
          this.clients.delete(clientId)
          client.ws.close()
        }
      }
    }

    return sentCount
  }

  public async broadcastNotification(notification: any, excludeUserIds: string[] = []) {
    const message: NotificationMessage = {
      type: 'notification',
      data: {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        createdAt: notification.createdAt.toISOString(),
        read: notification.read
      }
    }

    let sentCount = 0
    for (const [clientId, client] of this.clients.entries()) {
      if (!excludeUserIds.includes(client.userId)) {
        try {
          client.ws.send(JSON.stringify(message))
          sentCount++
          console.log(`廣播通知已發送給用戶 ${client.userId}`)
        } catch (error) {
          console.error(`發送廣播通知到客戶端 ${clientId} 時發生錯誤:`, error)
          this.clients.delete(clientId)
          client.ws.close()
        }
      }
    }

    return sentCount
  }

  public getClientCount(): number {
    return this.clients.size
  }

  public getUserClientCount(userId: string): number {
    let count = 0
    for (const client of this.clients.values()) {
      if (client.userId === userId) {
        count++
      }
    }
    return count
  }

  public stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    for (const [clientId, client] of this.clients.entries()) {
      client.ws.close()
      this.clients.delete(clientId)
    }

    this.wss.close()
    console.log('WebSocket 伺服器已停止')
  }
}

