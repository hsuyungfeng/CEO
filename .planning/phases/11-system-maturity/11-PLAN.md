---
wave: 1
depends_on: []
files_modified:
  - src/lib/notification-service.ts
  - src/app/api/test-notification/route.ts
  - src/lib/websocket-server.ts
  - src/components/layout/header.tsx
autonomous: false
---

# Phase 11 Plan — System Maturity & Production Readiness

## Wave 1: WebSocket Real-time Verification & SQL Injection Prevention

### Task 11.1.1: Browser End-to-End WebSocket Validation

<read_first>
- `.planning/WEBSOCKET_VALIDATION_COMPLETE.md` — Current WebSocket architecture status
- `src/lib/websocket-server.ts` — WebSocket server implementation
- `src/lib/notification-service.ts` — Notification push logic
- `src/app/api/test-notification/route.ts` — Test endpoint
- `.env.local` — Environment variables (WEBSOCKET_DEV_MODE=true)
</read_first>

<action>
執行完整的瀏覽器端對端驗證流程：

1. 啟動開發伺服器
   ```bash
   cd ceo-monorepo/apps/web
   pnpm dev
   ```

2. 訪問應用並打開 DevTools
   ```
   http://localhost:3000
   F12 → Network → WS 標籤
   ```

3. 驗證 WebSocket 連接建立
   - 應看到 `ws://localhost:3000/ws/notifications` 列在 Network 標籤
   - 連接狀態應為 `101 Switching Protocols`

4. 觸發測試通知推送
   ```bash
   curl -X POST http://localhost:3000/api/test-notification \
     -H "Content-Type: application/json" \
     -d '{"userId":"admin","orderNo":"TEST-2026-001","status":"CONFIRMED"}'
   ```

5. 驗證客戶端接收通知
   - 右上角鈴鐺應即時顯示新通知（無需重整頁面）
   - DevTools Console 應無紅色錯誤
   - Network WS 標籤應看到通知訊息送達

6. 驗證通知內容正確
   - 點擊通知驗證詳情
   - 確認包含訂單號 "TEST-2026-001"
   - 確認包含狀態描述 "訂單已確認"
</action>

<acceptance_criteria>
- [ ] DevTools 顯示 WS 連線建立 (`101 Switching Protocols`)
- [ ] 訂單更新 API 呼叫成功（HTTP 200）
- [ ] 通知即時推送至客戶端（< 500ms）
- [ ] 右上角鈴鐺顯示新通知，無需頁面重整
- [ ] 通知內容包含訂單號和狀態描述
- [ ] DevTools Console 無紅色錯誤訊息
- [ ] 多次推送測試均成功（至少 3 次）
</acceptance_criteria>

---

### Task 11.1.2: Admin Dashboard Real-time Order Updates

<read_first>
- `src/app/admin/orders/page.tsx` — Admin orders list page
- `src/app/admin/orders/[id]/route.ts` — Order status update endpoint
- `src/components/admin/orders/orders-table.tsx` — Orders table component
- `src/lib/notification-integration.ts` — Notification integration
- `.planning/WEBSOCKET_INTEGRATION_STATUS.md` — Integration checklist
</read_first>

<action>
測試管理員訂單狀態變更推播：

1. 瀏覽器訪問管理員訂單頁面
   ```
   http://localhost:3000/admin/orders
   ```

2. 打開兩個瀏覽器窗口（或分割視圖）
   - 窗口 A：管理員訂單列表
   - 窗口 B：相同頁面（模擬另一個管理員）

3. 在窗口 A 中更新訂單狀態
   - 點擊訂單上的操作按鈕
   - 將狀態從 PENDING 更新為 CONFIRMED

4. 驗證實時推送
   - 窗口 B 應即時顯示狀態變更（無需重整）
   - 兩個窗口的通知鈴鐺都應更新
   - 訂單表格應實時刷新

5. 測試多個訂單狀態變更
   - PENDING → CONFIRMED → SHIPPED → DELIVERED
   - 每個狀態變更都應推播通知
</action>

<acceptance_criteria>
- [ ] 管理員訂單頁面正常加載
- [ ] 訂單狀態更新 API 成功（HTTP 200）
- [ ] 狀態變更即時推送至所有連接的客戶端（< 500ms）
- [ ] 通知包含正確的訂單號和新狀態
- [ ] 多客戶端更新測試通過
- [ ] 連接穩定性測試通過（10+ 次狀態變更）
</acceptance_criteria>

---

### Task 11.1.3: Connection Stability & Reconnection Testing

<read_first>
- `src/contexts/websocket-context.tsx` — WebSocket context and reconnection logic
- `src/lib/websocket-server.ts` — Heartbeat and connection management
- `server.ts` — Server configuration
</read_first>

<action>
測試 WebSocket 連接穩定性和自動重連：

1. 連接穩定性測試
   - 保持 WebSocket 連接 5 分鐘以上
   - 驗證心跳機制正常運作（15 秒間隔）
   - 確認無靜默斷開

2. 自動重連測試
   - 關閉瀏覽器網路（DevTools → 節流）
   - 驗證 WebSocket 嘗試重連
   - 恢復網路後應自動重新連接
   - 重連後應繼續接收通知

3. 長連接測試
   - 保持連接 10+ 分鐘
   - 期間多次觸發通知
   - 所有通知應正確送達

4. 並發連接測試
   - 開啟多個瀏覽器標籤頁
   - 每個標籤頁應有獨立的 WebSocket 連接
   - 推送應送達所有連接
</action>

<acceptance_criteria>
- [ ] 連接保活測試通過（5+ 分鐘無斷開）
- [ ] 心跳訊息正常發送（每 15 秒）
- [ ] 網路中斷後自動重連（< 10 秒）
- [ ] 重連後恢復通知接收
- [ ] 並發連接穩定（10+ 標籤頁）
- [ ] 消息送達率 100%
</acceptance_criteria>

---

### Task 11.1.4: SQL Injection Prevention Audit & Hardening

<read_first>
- `prisma/schema.prisma` — Database schema
- `src/app/api/**/*.ts` — All API route handlers
- `src/lib/services/*.ts` — Business logic services
- `.planning/PHASE_10_COMPLETION_SUMMARY.md` — Current security status
</read_first>

<action>
完整的 SQL 注入防護審計和強化：

1. 資料庫查詢審計
   ```bash
   # 掃描所有 Prisma 調用
   grep -r "prisma\." src/app/api --include="*.ts" | wc -l
   grep -r "prisma\." src/lib/services --include="*.ts" | wc -l
   ```

2. 識別動態查詢
   - 檢查所有 WHERE 子句
   - 檢查所有 ORDER BY 子句
   - 確認參數綁定正確
   - 檢查是否有字符串拼接

3. 強化動態查詢
   - 使用 Prisma raw 查詢的安全模式
   - 避免直接字符串拼接
   - 實現參數驗證層
   - 更新所有 prisma.$queryRaw() 調用

4. Zod 驗證覆蓋
   ```bash
   # 驗證所有 API 端點都有 Zod schema
   grep -r "z\.object" src/app/api --include="*.ts" | wc -l
   ```

5. 防守測試
   - 編寫 SQL 注入攻擊模擬測試
   - 邊界值測試（特殊字符）
   - Zod 驗證覆蓋率驗證

6. 安全審計報告
   - 記錄所有修復項
   - 生成安全評分報告
   - 確認達到 100% 防護覆蓋
</action>

<acceptance_criteria>
- [ ] 所有資料庫查詢已審計（ 0 個字符串拼接）
- [ ] Zod 驗證涵蓋 100% 的 API 端點
- [ ] 防守測試全部通過
- [ ] 安全評分達到 85%+
- [ ] 修復清單已記錄
- [ ] 安全報告已生成
</acceptance_criteria>

---

## Verification Criteria

**All tasks must pass acceptance criteria before phase completion.**

### Security
- SQL injection prevention: 100% coverage
- Zod validation: All API endpoints
- WebSocket authentication: Verified

### Real-time Functionality
- WebSocket connection: Stable 99.9%
- Message latency: < 500ms p99
- Delivery rate: 100%

### System Health
- Error rate: < 0.1%
- Memory usage: Stable under load
- API response time: < 100ms p99

---

## Dependencies

No upstream dependencies. Phase 11 builds on Phase 10 foundation.

---

## Must-Haves

To declare Phase 11 complete:

1. ✅ WebSocket end-to-end validation passed
2. ✅ Admin real-time updates functioning
3. ✅ Connection stability verified
4. ✅ SQL injection prevention 100%
5. ✅ System score: 94/100+

---

*Phase 11: System Maturity & Production Readiness*
*Created: 2026-03-24*
*Status: Ready for Execution*
