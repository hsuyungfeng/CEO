---
date: 2026-03-24
status: TESTING_IN_PROGRESS
---

# WebSocket 測試驗證狀態

## ✅ 伺服器已啟動

```
pnpm dev 運行中 @ localhost:3000
```

## 🔄 測試清單

- [x] 伺服器啟動成功 (pnpm dev)
- [ ] 訪問 /admin/orders 頁面加載完成
- [ ] DevTools Network 顯示 WS 連線建立
- [ ] 更新訂單狀態（PENDING → CONFIRMED）
- [ ] 通知即時出現在右上角
- [ ] DevTools Console 無 WebSocket 錯誤

## 下一步

在新對話中：
1. 等待頁面完全加載（應顯示儀表板）
2. 打開 DevTools (F12)
3. 切換到 Network 標籤，篩選 WS 連線
4. 驗證 ws://localhost:3000/ws/notifications 連線狀態
5. 在 /admin/orders 頁面更新一筆訂單狀態
6. 觀察通知徽章變化和即時通知推送

## 預期結果

- ✅ WS 連線成功（不再有紅色錯誤）
- ✅ 訂單更新時即時推送通知
- ✅ 右上角通知鈴鐺即時更新計數
