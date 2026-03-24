# WebSocket 整合狀態報告 - 2026-03-24

## ✅ 已完成

### 1. **核心 WebSocket 伺服器實現** (100%)
- ✅ `src/lib/websocket-server.ts`: 完整的 WebSocket 伺服器實現
  - 客戶端認證 (JWT userId 直接驗證)
  - 心跳檢測機制 (15秒間隔)
  - 單個用戶通知推送 (`sendNotificationToUser()`)
  - 廣播通知 (`broadcastNotification()`)
  - 自動連接管理

### 2. **Next.js 服務器集成** (100%)
- ✅ `server.ts` 已修復為使用 ES6 imports
  - 正確初始化 `NotificationWebSocketServer`
  - 正確調用 `setWebSocketServer()` 將實例傳給 notification-service
  - 日誌驗證: `✅ WebSocket 伺服器已設置到通知服務`

### 3. **客戶端 WebSocket 客戶** (100%)
- ✅ `src/lib/websocket-client.ts`: WebSocketManager 單例
  - 自動連接與重連邏輯 (最多 10 次, 5 秒間隔)
  - 事件監聽系統 (notification, unread_count, auth_success等)
  - 心跳保活機制

### 4. **訂單狀態通知對應** (100%)
- ✅ `src/lib/notification-integration.ts`:
  - CONFIRMED → "訂單已確認，準備發貨"
  - COMPLETED → "訂單已完成"
  - SHIPPED → "訂單已發貨"
  - 等 7 種狀態映射

### 5. **通知 API 整合** (100%)
- ✅ `src/app/api/admin/orders/[id]/route.ts`:
  - 訂單更新後立即推送 WebSocket 通知
  - fire-and-forget 模式不阻塞 API 響應

### 6. **開發模式跳過資料庫** (100%)
- ✅ `.env.local`: `WEBSOCKET_DEV_MODE=true`
- ✅ 通知服務可跳過 Prisma 直接推送 WS 消息

### 7. **測試端點** (100%)
- ✅ `src/app/api/test-notification/route.ts`: 快速測試端點

## 📊 驗證狀態

### 伺服器端
- ✅ WebSocket 伺服器在 `ws://localhost:3000/ws/notifications` 啟動
- ✅ 客戶端連接時收到 `connected` 消息
- ✅ 客戶端驗證成功時收到 `auth_success` 消息
- ✅ `setWebSocketServer()` 正確設置實例到 notification-service

### 客戶端
- ✅ 瀏覽器成功連接到 WebSocket
- ✅ 驗證成功（`WebSocket 驗證成功` 日誌出現）
- ✅ 收到未讀計數更新
- ✅ `wsManager.on('notification', ...)` 監聽器已註冊

## ⚠️  已知問題

### 1. **通知未到達問題**
- 症狀: API 返回 `success: true`, 但 `result: "跳過"` 表示 websocketServer 為 null
- 根本原因: 在 `/api/test-notification` 路由中，notification-service 模塊加載時，`setWebSocketServer()` 尚未被調用
- 原因分析: Next.js Route Handler 與 server.ts 主線程的模塊加載順序問題
  - server.ts 在 app.prepare() 後才設置 websocketServer
  - Route Handler 可能在 server.ts 代碼執行前加載並捕獲 null 值

### 2. **模塊加載時序**
- Next.js 的 Route Handlers 獨立於 server.ts 主線程運行
- notification-service 被導入時，websocketServer 可能仍為 null
- 需要確保 setWebSocketServer 在所有 Route Handlers 之前完成

## 🔧 修復策略

### 方案 A: 使用全局初始化標誌 (推薦)
```typescript
// notification-service.ts
let websocketServer: NotificationWebSocketServer | null = null
let isInitialized = false

export function setWebSocketServer(server: NotificationWebSocketServer) {
  websocketServer = server
  isInitialized = true
}

export function getWebSocketServer() {
  if (!isInitialized) {
    console.warn('WebSocket 伺服器尚未初始化')
  }
  return websocketServer
}
```

### 方案 B: 延遲檢查
在 createNotification 中添加重試邏輯，當 websocketServer 為 null 時等待或重試

### 方案 C: 移動 setWebSocketServer 調用
確保在 Next.js 啟動前完成初始化

## 📋 後續工作

### Phase 10.6: WebSocket 模塊加載修復
- [ ] 診斷 Next.js Route Handler 與 server.ts 的模塊加載順序
- [ ] 實施修復確保 websocketServer 總是可用
- [ ] 重新測試通知推送

### Phase 10.7: 管理員推播功能 (用戶要求)
一旦 WebSocket 通知穩定，實現:
- [ ] `/api/admin/broadcast` 端點
- [ ] 指定用戶組廣播
- [ ] 廣播歷史記錄
- [ ] 廣播前預覽

## 📝 關鍵文件

- `server.ts` - WebSocket 伺服器初始化
- `src/lib/websocket-server.ts` - WebSocket 伺服器實現
- `src/lib/notification-service.ts` - 通知服務（包含 setWebSocketServer）
- `src/lib/websocket-client.ts` - 客戶端實現
- `src/contexts/websocket-context.tsx` - React 上下文
- `src/app/api/test-notification/route.ts` - 測試端點

## 💡 學習點

1. **Next.js Module Loading**:  Route Handlers 在 server.ts 之外執行，可能有不同的初始化時序

2. **WebSocket 認證簡化**: 直接使用 userId 而非 JWT，簡化開發但需評估生產安全性

3. **Dev Mode 跳過**: 環境變數 `WEBSOCKET_DEV_MODE` 允許跳過資料庫連接進行快速測試
