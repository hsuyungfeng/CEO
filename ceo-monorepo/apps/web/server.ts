import 'dotenv/config'
import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { NotificationWebSocketServer } from './src/lib/websocket-server'
import { setWebSocketServer } from './src/lib/notification-service'

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

let globalWsServer: NotificationWebSocketServer | null = null

app.prepare().then(() => {
  const server = createServer(async (req: any, res: any) => {
    try {
      const parsedUrl = parse(req.url, true)

      // WebSocket 升級請求不應通過 Next.js handle
      // 讓 WebSocketServer 的 'connection' 事件處理
      if (req.url.startsWith('/ws/')) {
        return
      }

      // 內部端點：用於在 Route Handler 無法直接訪問 WebSocket 伺服器時推送通知
      if (req.url.startsWith('/api/_internal/push-notification') && req.method === 'POST') {
        let body = ''
        req.on('data', chunk => body += chunk)
        req.on('end', async () => {
          try {
            const { userId, notification } = JSON.parse(body)
            if (globalWsServer) {
              // 確保 createdAt 是 Date 對象
              const notificationWithDate = {
                ...notification,
                createdAt: new Date(notification.createdAt)
              }
              const sentCount = await globalWsServer.sendNotificationToUser(userId, notificationWithDate)
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ success: true, sentCount }))
            } else {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'WebSocket 伺服器不可用' }))
            }
          } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: String(error) }))
          }
        })
        return
      }

      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('伺服器錯誤:', err)
      res.statusCode = 500
      res.end('內部伺服器錯誤')
    }
  })

  // 創建 WebSocket 伺服器
  console.log('即將創建 WebSocket 伺服器...')
  const wsServer = new NotificationWebSocketServer(server)
  console.log('WebSocket 伺服器已創建:', wsServer)

  // 設置 WebSocket 伺服器到通知服務
  console.log('正在設置 WebSocket 伺服器到通知服務...')
  setWebSocketServer(wsServer)
  console.log('✅ WebSocket 伺服器已設置到通知服務')

  // 保存全局 WebSocket 伺服器實例，供內部路由使用
  globalWsServer = wsServer

  server.on('error', (err: any) => {
    console.error('伺服器錯誤:', err)
    process.exit(1)
  })

  server.listen(port, hostname, () => {
    console.log(`> 準備就緒: http://${hostname}:${port}`)
    console.log(`> WebSocket 伺服器運行在: ws://${hostname}:${port}/ws/notifications`)
  })

  // 優雅關閉
  const shutdown = () => {
    console.log('正在關閉伺服器...')
    wsServer.stop()
    server.close(() => {
      console.log('伺服器已關閉')
      process.exit(0)
    })
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
})