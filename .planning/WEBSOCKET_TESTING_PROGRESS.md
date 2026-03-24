---
date: 2026-03-24
status: IN_PROGRESS
phase: Phase 10.5 WebSocket & Real-time Notifications
---

# WebSocket 整合測試進度報告

## ✅ 已完成

### 1. WebSocket 伺服器架構
- ✅ `server.ts` - HTTP/WebSocket 伺服器統合
  - 修復：WebSocket upgrade 請求不再被 Next.js 攔截
  - 已新增路由檢查：`/ws/` 路由返回，讓 ws library 處理升級
- ✅ `websocket-server.ts` - NotificationWebSocketServer 類
  - 支援客戶端連線管理
  - 認證流程（token = userId）
  - 心跳機制（15 秒）
  - 訊息路由（auth, heartbeat）

### 2. 前端整合
- ✅ `websocket-context.tsx` - React Context provider
  - WebSocketManager singleton
  - 自動重連機制
  - 通知狀態管理（isConnected, unreadCount）

### 3. 通知服務層
- ✅ `notification-service.ts` - 核心通知邏輯
  - `setWebSocketServer()` - 設置伺服器實例
  - `getWebSocketServer()` - getter 模式用於 Route Handler
  - WEBSOCKET_DEV_MODE - 開發模式支援（跳過 DB）
- ✅ `notification-integration.ts` - 業務邏輯整合
  - `sendOrderStatusNotification()` - 訂單狀態通知
  - 支援多種頻道（IN_APP, PUSH, EMAIL）

## 🧪 測試結果

### WebSocket 連接測試 ✅
```
✅ WebSocket 連接成功: ws://localhost:3000/ws/notifications
✅ 客戶端連接建立
✅ 認證流程完成
   - 用戶驗證成功
   - 未讀計數同步（count: 0）
✅ heartbeat 機制正常
```

### 伺服器修復
```diff
- 問題：WebSocket upgrade 請求被 Next.js 攔截
+ 修復：server.ts 第 23-26 行新增路由檢查
  if (req.url.startsWith('/ws/')) {
    return  // 讓 WebSocketServer 自行處理
  }
```

## 🔴 待解決

### 1. Session 驗證 (優先級 P0)
**問題**：`/api/test-notification` 端點認證失敗
- `auth()` 回傳 null
- Cookie 驗證未通過

**原因**：未追蹤（需診斷）

**解決方案**：
```bash
# 檢查項目
1. env: NEXTAUTH_SECRET, NEXTAUTH_URL 是否正確
2. authjs.session-token cookie 是否設置
3. auth.ts 中 TEST_MODE 是否啟用
4. middleware.ts 對 /api/test-notification 的影響
```

### 2. 通知推送流程 (優先級 P1)
一旦 session 驗證通過，測試以下流程：
```
API 請求 → 驗證用戶 → 呼叫 sendOrderStatusNotification()
  ↓
NotificationService.createNotification()
  ↓
WebSocket sendNotificationToUser() → 客戶端推送
  ↓
前端通知面板更新 + 瀏覽器通知
```

## 📋 下一步行動

### 立即行動（5 分鐘）
1. **檢查環境設定**
   ```bash
   grep -E "NEXTAUTH_|WEBSOCKET_DEV" .env.local
   ```

2. **驗證 TEST_MODE**
   - 確認 `src/auth.ts` 中 `const TEST_MODE = true`
   - 確認 credentials callback 會自動以 ADMIN 身份登入

3. **測試登入流程**
   ```bash
   # 模擬 credentials 登入並獲取 session token
   curl -X POST /api/auth/callback/credentials \
     -d "username=12345678&password=anything"
   ```

### 完整驗證流程
1. **通過 credentials 獲得有效 session**
2. **用 session token 呼叫 /api/test-notification**
3. **WebSocket 客戶端應接收通知**
4. **驗證通知內容和時間戳**

## 💡 技術洞察

### WebSocket 路由問題根本原因
Next.js dev server 會攔截所有 HTTP 請求，包括 WebSocket upgrade 請求。解決方案是在 http.Server 層級檢查路由，對於 `/ws/` 路由直接返回，讓 ws library 的自動升級處理來接管。

### 認證設計權衡
- **現況**：Token = userId（簡化開發）
- **安全隱患**：同機器連接可偽造 userId
- **生產方案**：JWT token 驗證（實現於 handleAuth）

### 開發模式設計
`WEBSOCKET_DEV_MODE=true` 允許：
- 跳過資料庫查詢（快速測試）
- 直接 WebSocket 推送（無 DB 副作用）
- 測試通知生成和傳輸

---

## 📁 相關檔案
- `server.ts` - 主伺服器入口（已修復）
- `websocket-server.ts` - WebSocket 伺服器實現
- `notification-service.ts` - 通知服務層
- `notification-integration.ts` - 業務邏輯整合
- `websocket-context.tsx` - 前端 Context provider
- `.env.local` - 環境設定

## ⏱️ 預計修復時間
- Session 驗證診斷：10 分鐘
- 通知推送驗證：15 分鐘
- 總計：25 分鐘內完成整個 WebSocket 測試流程
