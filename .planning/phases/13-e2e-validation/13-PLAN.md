---
wave: 1
depends_on: [12]
files_modified:
  - tests/e2e/auth.spec.ts
  - tests/e2e/orders.spec.ts
  - tests/e2e/supplier.spec.ts
  - tests/e2e/websocket-notifications.spec.ts
  - .env.example
  - playwright.config.ts
autonomous: false
---

# Phase 13 Plan — E2E Test Validation & Performance Benchmarking

## Wave 1: Test Validation & Performance Optimization

### Task 13.1.1: Full Test Suite Execution & Validation

<read_first>
- `.planning/phases/12-e2e-testing/12-SUMMARY.md` — Phase 12 test creation results
- `playwright.config.ts` — Test configuration
- `tests/e2e/*.spec.ts` — All test files from Phase 12
- `.env.example` — Environment configuration
- `CLAUDE.md` — Project conventions
</read_first>

<action>
執行完整的 E2E 測試套件驗證：

1. 環境準備
   ```bash
   cd ceo-monorepo/apps/web
   npm install --legacy-peer-deps  # 若需要
   npm run build
   ```

2. 啟動開發伺服器
   ```bash
   npm run dev &  # 背景執行
   sleep 5  # 等待伺服器啟動
   ```

3. 執行完整測試套件
   ```bash
   npx playwright test tests/e2e/ --reporter=json,html
   ```

4. 驗證測試結果
   - 所有測試通過或已知失敗被記錄
   - 沒有新的非預期失敗
   - 執行時間記錄
   - HTML 報告生成成功

5. 生成測試報告
   ```bash
   npx playwright show-report
   ```

6. 驗證關鍵流程
   - 認證流程：登入 → 受保護頁面 → 登出
   - 訂單流程：瀏覽 → 下單 → 管理員批准 → 通知推播
   - 供應商流程：申請 → 審核 → 批准通知
   - WebSocket 流程：連接 → 接收通知 → 自動重連
</action>

<acceptance_criteria>
- [ ] 所有 E2E 測試執行成功（0 錯誤，非預期失敗為 0）
- [ ] HTML 測試報告生成成功
- [ ] 完整測試套件執行時間 < 6 分鐘（含服務啟動）
- [ ] 每個模組的個別執行時間已記錄
- [ ] WebSocket 測試中的通知延遲 < 2000ms
- [ ] 無 flaky 測試（重新執行仍通過）
- [ ] 測試覆蓋率 > 90% 的關鍵路徑
</acceptance_criteria>

---

### Task 13.1.2: Performance Benchmarking

<read_first>
- `tests/e2e/orders.spec.ts` — Order flow tests
- `tests/e2e/websocket-notifications.spec.ts` — WebSocket tests
- `ceo-monorepo/apps/web/src/app/api/` — API routes being tested
- `.env.local` — Performance tuning configuration
</read_first>

<action>
建立性能基準測試與優化：

1. 建立性能測試檔案
   ```bash
   touch tests/performance/performance.spec.ts
   ```

2. 實裝 API 響應時間測試
   - 登入 API：< 200ms
   - 訂單建立 API：< 300ms
   - 訂單更新 API：< 200ms
   - 管理員列表 API：< 500ms

3. 實裝 WebSocket 性能測試
   - 連接建立時間：< 1000ms
   - 消息傳遞延遲：< 500ms（p99）
   - 心跳響應時間：< 100ms
   - 自動重連時間：< 10s

4. 實裝頁面載入性能測試
   - 登入頁面：First Contentful Paint < 1s
   - 訂單列表：TTI < 2s
   - 管理員儀表板：LCP < 2s

5. 建立性能基準報告
   - 記錄所有指標的當前值
   - 設定預期範圍
   - 標記任何低於基準的項目

6. 優化建議
   - 識別性能瓶頸
   - 提出優化建議（快取、索引、查詢優化）
   - 優先排序高影響優化項
</action>

<acceptance_criteria>
- [ ] Performance benchmark 檔案建立
- [ ] API 響應時間測試建立並通過
- [ ] WebSocket 性能測試建立並通過
- [ ] 頁面載入性能測試建立
- [ ] 性能報告生成（CSV 或 JSON 格式）
- [ ] 所有關鍵指標在可接受範圍內
- [ ] 優化建議已記錄
</acceptance_criteria>

---

### Task 13.1.3: Test Coverage Analysis & Gap Identification

<read_first>
- `tests/e2e/*.spec.ts` — All test files
- `src/app/api/` — API routes
- `src/app/admin/` — Admin pages
- `src/components/` — Component implementations
</read_first>

<action>
分析測試覆蓋率並識別缺口：

1. 執行覆蓋率分析
   ```bash
   npx playwright test tests/e2e/ --coverage
   ```

2. 分析結果
   - 識別未被測試的 API 端點
   - 識別未被測試的使用者流程
   - 識別邊界情況未覆蓋

3. 識別測試缺口
   - 錯誤處理流程（400、500 錯誤）
   - 邊界值測試（極限情況）
   - 並發操作測試
   - 負面測試（無效輸入）

4. 優先排序缺口
   - P0：關鍵流程（認證、支付、通知）
   - P1：常見流程（訂單管理、供應商審核）
   - P2：邊界情況（錯誤處理、網路超時）

5. 生成覆蓋率報告
   - 覆蓋率百分比
   - 缺失的測試用例列表
   - 建議的新測試
</action>

<acceptance_criteria>
- [ ] 覆蓋率分析報告生成
- [ ] 測試缺口已識別
- [ ] 缺口已優先排序
- [ ] 建議的新測試用例列表已列出
- [ ] 關鍵流程覆蓋率 > 95%
- [ ] 邊界情況已識別但可延後實裝
</acceptance_criteria>

---

### Task 13.1.4: Test Reliability & Flakiness Report

<read_first>
- `tests/e2e/*.spec.ts` — All test files
- `.planning/phases/12-e2e-testing/12-SUMMARY.md` — Initial test results
- `playwright.config.ts` — Test configuration
</read_first>

<action>
驗證測試穩定性並識別不穩定的測試：

1. 執行測試多次以識別 flaky 測試
   ```bash
   for i in {1..3}; do
     npx playwright test tests/e2e/ --reporter=json
   done
   ```

2. 分析測試穩定性
   - 識別不是 100% 通過的測試
   - 計算每個測試的通過率
   - 識別通過率 < 100% 的測試

3. 分析失敗原因
   - 網路超時
   - 計時問題
   - 資源競爭
   - 外部依賴

4. 修復 flaky 測試
   - 增加超時時間（若為網路延遲）
   - 改進等待策略（waitForNavigation 等）
   - 添加重試邏輯
   - 隔離外部依賴

5. 生成穩定性報告
   - 每個測試的通過率
   - 平均執行時間
   - 失敗模式分析
   - 改進建議

6. 設定 CI/CD 警報
   - 失敗率 > 5% 時告警
   - 執行時間超過基準 20% 時告警
</action>

<acceptance_criteria>
- [ ] 測試執行 3 輪以驗證穩定性
- [ ] 所有測試的通過率 > 99%
- [ ] 無 flaky 測試（100% 通過率）
- [ ] 穩定性報告生成
- [ ] 失敗原因分析完成
- [ ] 改進建議已實裝
- [ ] CI/CD 警報設定完成
</acceptance_criteria>

---

## Verification Criteria

**All tasks must pass acceptance criteria before phase completion.**

### Test Quality
- All tests passing consistently (> 99% pass rate)
- No flaky tests (100% reliability on 3 runs)
- Performance meets baselines
- Coverage > 90% of critical paths

### Performance Benchmarks
- API response times within targets
- WebSocket latency < 500ms (p99)
- Page load times < 2s (LCP)
- Auto-reconnect < 10 seconds

### Documentation
- Test execution report generated
- Performance benchmark report created
- Coverage gap analysis documented
- Test reliability metrics recorded

---

## Dependencies

Depends on Phase 12 (E2E tests created and passing)

---

## Must-Haves

To declare Phase 13 complete:

1. ✅ Full test suite execution successful (0 unexpected failures)
2. ✅ Performance benchmarks established and documented
3. ✅ Test coverage > 90% on critical paths
4. ✅ All tests stable (> 99% pass rate on 3 runs)
5. ✅ Performance reports generated
6. ✅ Test reliability metrics documented
7. ✅ System score improved to 95/100+

---

*Phase 13: E2E Test Validation & Performance Benchmarking*
*Created: 2026-03-25*
*Status: Ready for Execution*
