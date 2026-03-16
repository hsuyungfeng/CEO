const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { NotificationWebSocketServer } = require('./src/lib/websocket-server')
const { setWebSocketServer } = require('./src/lib/notification-service')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer(async (req: any, res: any) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('伺服器錯誤:', err)
      res.statusCode = 500
      res.end('內部伺服器錯誤')
    }
  })

  // 創建 WebSocket 伺服器
  const wsServer = new NotificationWebSocketServer(server)
  
  // 設置 WebSocket 伺服器到通知服務
  setWebSocketServer(wsServer)

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