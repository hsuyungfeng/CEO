---
wave: 1
depends_on: [11]
files_modified:
  - tests/e2e/auth.spec.ts
  - tests/e2e/orders.spec.ts
  - tests/e2e/admin-dashboard.spec.ts
  - tests/e2e/websocket-notifications.spec.ts
autonomous: false
---

# Phase 12 Plan — E2E Testing & Performance Optimization

## Wave 1: End-to-End Testing Suite (Playwright)

### Task 12.1.1: Authentication Flow E2E Testing

<read_first>
- `.planning/PHASE_11_SUMMARY.md` — Previous phase completion status
- `src/auth.ts` — Authentication configuration
- `src/app/(auth)/login/page.tsx` — Login page implementation
- `src/app/(auth)/register/page.tsx` — Registration page
- `prisma/schema.prisma` — User and session models
- `CLAUDE.md` — Project conventions
</read_first>

<action>
建立完整的認證流程 E2E 測試：

1. 建立測試檔案結構
   ```bash
   mkdir -p tests/e2e
   touch tests/e2e/auth.spec.ts
   ```

2. 實作登入流程測試
   - 訪問登入頁面
   - 輸入統一編號 + 密碼（或使用 TEST_MODE）
   - 驗證重導至儀表板
   - 確認 session cookie 設置
   - 驗證 localStorage 包含 session token

3. 實作註冊流程測試
   - 新供應商註冊流程
   - 兩階段企業資料填寫
   - 郵件驗證（若有）
   - 帳號啟用確認

4. 實作登出流程測試
   - 點擊登出按鈕
   - 驗證 session 清除
   - 重導至登入頁面
   - 確認無法訪問受保護路由

5. 測試 OAuth 流程（Google/Apple）
   - 啟動 OAuth 登入
   - 模擬 OAuth 回調
   - 驗證新用戶建立或現有用戶登入
   - 重導至儀表板

6. 實作測試工具
   - Playwright 設定
   - 自動登出清理
   - API 模擬（若需要）
</action>

<acceptance_criteria>
- [ ] tests/e2e/auth.spec.ts 檔案存在且有效
- [ ] 登入測試通過（統一編號 + 密碼）
- [ ] 登出測試通過
- [ ] 受保護路由正確重導未認證用戶
- [ ] OAuth 流程測試通過
- [ ] 所有測試使用 Playwright 最佳實踐（page objects、fixtures）
- [ ] 測試執行時間 < 30 秒
</acceptance_criteria>

---

### Task 12.1.2: Order Management & Notification E2E Testing

<read_first>
- `src/app/admin/orders/page.tsx` — Admin orders page
- `src/app/admin/orders/[id]/route.ts` — Order detail endpoint
- `src/app/api/orders/create/route.ts` — Create order endpoint
- `src/lib/notification-service.ts` — Notification system
- `src/contexts/websocket-context.tsx` — WebSocket integration
- `tests/e2e/` — Auth test setup
</read_first>

<action>
建立訂單管理與通知完整 E2E 流程測試：

1. 建立測試檔案
   ```bash
   touch tests/e2e/orders.spec.ts
   touch tests/e2e/admin-dashboard.spec.ts
   ```

2. 實作會員下單流程測試
   - 登入為採購會員
   - 瀏覽商品列表
   - 新增商品至購物車
   - 進行結帳流程
   - 提交訂單
   - 驗證訂單確認頁面

3. 實作管理員訂單審核流程
   - 登入為管理員
   - 訪問訂單列表
   - 查看新訂單
   - 更新訂單狀態（PENDING → CONFIRMED）
   - 驗證實時推播到會員

4. 實作多視窗通知驗證
   - 開啟 2 個瀏覽器實例（模擬不同用戶）
   - 一個作為管理員，一個作為會員
   - 管理員更新訂單狀態
   - 驗證會員端即時收到通知（< 500ms）
   - 驗證通知鈴鐺更新，無需頁面重整

5. 實作訂單狀態流轉測試
   - 完整狀態變更：PENDING → CONFIRMED → SHIPPED → DELIVERED
   - 每個狀態變更驗證通知送達

6. 實作 API 模擬
   - 模擬支付成功回調
   - 模擬出貨更新
   - 模擬收貨確認
</action>

<acceptance_criteria>
- [ ] tests/e2e/orders.spec.ts 檔案存在
- [ ] 會員下單流程完整測試通過
- [ ] 管理員訂單審核流程測試通過
- [ ] 多視窗通知測試通過（< 500ms 延遲）
- [ ] WebSocket 推播驗證通過
- [ ] 所有訂單狀態流轉測試通過
- [ ] 錯誤處理測試通過（invalid input、network error）
- [ ] 測試執行時間 < 60 秒
</acceptance_criteria>

---

### Task 12.1.3: Supplier Application & Approval E2E Testing

<read_first>
- `src/app/supplier/applications/page.tsx` — Supplier applications list
- `src/app/api/supplier-applications/route.ts` — Applications API
- `src/app/api/supplier-applications/[id]/route.ts` — Approval endpoint
- `prisma/schema.prisma` — SupplierApplication 模型
- `CLAUDE.md` — Project conventions
</read_first>

<action>
建立供應商申請與審核 E2E 流程：

1. 建立測試檔案
   ```bash
   touch tests/e2e/supplier.spec.ts
   ```

2. 實作供應商申請流程測試
   - 新用戶以供應商身份註冊
   - 填寫供應商申請資料
   - 提交申請表單
   - 驗證申請進入 PENDING 狀態

3. 實作管理員審核流程
   - 登入為管理員
   - 訪問供應商應用列表
   - 查看待審核申請
   - 批准申請
   - 驗證供應商帳號啟用
   - 驗證審核通知推播給申請人

4. 實作供應商拒絕流程
   - 登入為管理員
   - 拒絕某個申請
   - 驗證供應商收到拒絕通知

5. 實作重新申請流程
   - 拒絕後供應商可重新申請
   - 驗證新申請進入審核

6. 驗證審核紀錄
   - 檢查審計日誌記錄了所有審核操作
   - 記錄包含審核人、時間、操作類型
</action>

<acceptance_criteria>
- [ ] tests/e2e/supplier.spec.ts 檔案存在
- [ ] 供應商申請流程測試通過
- [ ] 管理員審核流程測試通過
- [ ] 審核通知推播測試通過
- [ ] 拒絕與重新申請流程測試通過
- [ ] 審計日誌記錄驗證通過
- [ ] 錯誤處理測試通過
- [ ] 測試執行時間 < 45 秒
</acceptance_criteria>

---

### Task 12.1.4: WebSocket Real-time Features E2E Testing

<read_first>
- `.planning/WEBSOCKET_VALIDATION_COMPLETE.md` — WebSocket architecture
- `src/lib/websocket-server.ts` — WebSocket server
- `src/contexts/websocket-context.tsx` — Client context
- `src/components/layout/header.tsx` — Notification bell icon
- `tests/e2e/` — Existing test setup
</read_first>

<action>
建立 WebSocket 實時功能完整 E2E 測試：

1. 建立測試檔案
   ```bash
   touch tests/e2e/websocket-notifications.spec.ts
   ```

2. 實作 WebSocket 連接驗證測試
   - 訪問應用主頁
   - 驗證 WebSocket 連接建立（檢查瀏覽器 Network 標籤）
   - 驗證連接狀態為 101 Switching Protocols
   - 驗證心跳訊息定期發送

3. 實作即時通知測試
   - 登入用戶
   - 触發後端通知（API 呼叫）
   - 驗證前端即時接收通知
   - 驗證通知鈴鐺圖標更新
   - 驗證通知詳情正確

4. 實作多個同步標籤頁測試
   - 開啟多個瀏覽器標籤頁（模擬用戶多標籤開啟）
   - 每個標籤頁有獨立 WebSocket 連接
   - 推播通知到所有連接
   - 驗證所有標籤頁都收到通知

5. 實作自動重連測試
   - 模擬網路中斷（DevTools 節流 offline）
   - 驗證 WebSocket 嘗試重連
   - 恢復網路連接
   - 驗證自動重連成功
   - 驗證重連後繼續接收通知

6. 實作連接穩定性測試
   - 保持連接 10+ 分鐘
   - 期間多次發送通知
   - 驗證 100% 送達率
   - 驗證無靜默斷開

7. 實作通知點擊與交互
   - 點擊通知
   - 驗證導航到相關頁面
   - 驗證通知標記為已讀
</action>

<acceptance_criteria>
- [ ] tests/e2e/websocket-notifications.spec.ts 檔案存在
- [ ] WebSocket 連接建立驗證通過
- [ ] 即時通知接收測試通過（< 500ms）
- [ ] 多標籤頁同步測試通過
- [ ] 自動重連測試通過（< 10 秒重連）
- [ ] 長連接穩定性測試通過
- [ ] 通知互動測試通過
- [ ] 測試執行時間 < 120 秒
</acceptance_criteria>

---

## Verification Criteria

**All tasks must pass acceptance criteria before phase completion.**

### Test Coverage
- Authentication flow: 100%
- Order management: 95%+
- Supplier applications: 90%+
- WebSocket features: 100%

### Performance
- Single test execution: < 10 seconds
- Full suite execution: < 5 minutes
- Test reliability: > 98% (no flaky tests)

### Code Quality
- All tests use Playwright best practices
- Page objects pattern for maintainability
- Proper test isolation and cleanup
- No hardcoded values (use fixtures/config)

---

## Dependencies

Depends on Phase 11 (WebSocket validation complete)

---

## Must-Haves

To declare Phase 12 complete:

1. ✅ All 4 E2E test modules created (auth, orders, supplier, websocket)
2. ✅ All tests passing > 95% success rate
3. ✅ Test execution time < 5 minutes total
4. ✅ WebSocket real-time features verified end-to-end
5. ✅ Critical user flows covered (auth → order → notification)
6. ✅ Test reports generated and committed

---

*Phase 12: E2E Testing & Performance Optimization*
*Created: 2026-03-25*
*Status: Ready for Execution*
