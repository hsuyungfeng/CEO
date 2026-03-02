# Phase 5 執行啟動清單 (Execution Startup Checklist)

**日期**：2026-03-02
**狀態**：🚀 **準備啟動**

---

## ✅ 前置檢查

```
□ 已閱讀 QUICK_START_PHASE5.md
□ 已閱讀 PHASE_5_TESTING_PLAN.md
□ 已閱讀 WORK_COMPLETION_REPORT.md
□ 環境已驗證 (Node.js, npm, PostgreSQL)
□ Git 已更新到最新版本
```

---

## 🚀 立即執行 (Right Now)

### 步驟 1: 啟動開發伺服器 (Terminal 1)
```bash
cd /sessions/sweet-elegant-hopper/mnt/ceo-platform/ceo-monorepo/apps/web
npm run dev
```

**預期結果**：
```
✓ Ready in 5.2s
✓ Local: http://localhost:3000
✓ Database connected
```

### 步驟 2: 驗證環境 (Terminal 2)
```bash
cd /sessions/sweet-elegant-hopper/mnt/ceo-platform

# 快速檢查
bash TEST_API_ENDPOINTS.sh

# 或完整測試
python3 test_api.py
```

**預期結果**：
```
✓ Health Check ... 200
✓ Products ... 200
✓ Categories ... 200
[其他端點...]
```

---

## 📋 測試執行順序 (P0 優先)

### 第 1 項：認證流程 (2 小時)

**準備**：
```bash
# 測試帳號
稅號：12345678
密碼：Admin1234!
```

**測試項目**：
```
□ POST /api/auth/signin (Credentials)
  └─ 有效稅號 + 密碼 → 成功
  └─ 無效稅號 → 401
  └─ 無效密碼 → 401

□ 會話管理
  └─ 登入後可存取受保護端點
  └─ 登出後無法存取
  └─ Token 刷新正常
```

**記錄位置**：PHASE_5_TESTING_PLAN.md § 1. 認證流程

---

### 第 2 項：產品 & 購物車 (2 小時)

**測試項目**：
```
□ GET /api/products
  └─ 可列出所有產品
  └─ 分頁工作正常
  └─ 過濾功能正常

□ POST /api/cart
  └─ 可加入購物車
  └─ 無法重複加入同產品
  └─ 庫存檢查正常
```

**記錄位置**：PHASE_5_TESTING_PLAN.md § 2. 產品瀏覽 & 購物車

---

### 第 3 項：訂單 & 結帳 (2.5 小時)

**測試項目**：
```
□ POST /api/orders
  └─ 購物車可轉換為訂單
  └─ 金額計算正確
  └─ 庫存自動減扣

□ GET /api/orders
  └─ 可列出用戶訂單
  └─ 無跨用戶數據洩露
  └─ 分頁正常
```

**記錄位置**：PHASE_5_TESTING_PLAN.md § 3. 訂單 & 結帳

---

### 第 4 項：團購系統 (3 小時)

**測試項目**：
```
□ POST /api/groups (建立)
  └─ 可建立新團購
  └─ 截止時間驗證

□ POST /api/groups/[id]/join (加入)
  └─ 可加入團購
  └─ 自動計算折扣 (1-99: 0%, 100-499: 5%, 500+: 10%)
  └─ 無法重複加入

□ POST /api/admin/groups/[id]/finalize (截止)
  └─ 自動生成返利發票
  └─ 成員都收到通知
```

**記錄位置**：PHASE_5_TESTING_PLAN.md § 4. 團購系統

---

## 📝 記錄測試結果

### 對於每個端點，記錄：

```
測試：[方法] [端點]
描述：[測試內容]
日期/時間：[執行時間]
結果：[✓ 通過 / ✗ 失敗]
代碼：[實際返回碼]
備註：[任何問題或觀察]
```

### 示例：
```
測試：POST /api/auth/signin
描述：有效稅號 + 密碼登入
日期/時間：2026-03-02 10:30
結果：✓ 通過
代碼：200
備註：成功返回 JWT token，session cookie 已設定
```

---

## 🎯 目標

### P0 完成標準
```
✓ 49 個 P0 測試全部通過
✓ 0 個關鍵錯誤
✓ 所有結果已記錄
✓ 報告已簽名
```

### 成功指標
```
通過率 ≥ 95%
所有關鍵路徑驗證
無安全漏洞發現
性能 < 200ms (簡單查詢)
```

---

## 🐛 遇到問題？

### 問題：伺服器無法啟動
```bash
# 檢查埠
lsof -i :3000

# 檢查 PostgreSQL
psql -c "SELECT 1"

# 清除快取
rm -rf .next && npm install
```

### 問題：API 返回 404
```
1. 確認伺服器正在運行
2. 確認端點拼寫正確
3. 檢查 API 日誌 (Terminal 1)
4. 驗證認證令牌（如需要）
```

### 問題：測試失敗
```
1. 記錄完整錯誤訊息
2. 檢查伺服器日誌
3. 手動驗證（使用 curl）
4. 提交到 GitHub Issue
```

---

## 📞 快速參考

### 常用命令
```bash
# 啟動伺服器
npm run dev

# 快速驗證
bash TEST_API_ENDPOINTS.sh

# 完整測試
python3 test_api.py

# 查看日誌
tail -f /tmp/dev-server.log
```

### 關鍵檔案位置
```
測試計劃：PHASE_5_TESTING_PLAN.md
快速指南：QUICK_START_PHASE5.md
工作報告：WORK_COMPLETION_REPORT.md
```

### 測試帳號
```
稅號：12345678
密碼：Admin1234!
角色：SUPER_ADMIN
```

---

## ⏰ 時間表

| 時段 | 任務 | 時間 |
|------|------|------|
| 09:00-11:00 | 認證流程測試 | 2h |
| 11:00-13:00 | 產品 & 購物車 | 2h |
| 14:00-16:30 | 訂單 & 結帳 | 2.5h |
| 16:30-19:00 | 團購系統 + 文件 | 3h + 記錄 |

**預計完成**：今日下午 19:00

---

## ✨ 最後檢查

- [ ] 已備份當前數據
- [ ] 已準備測試環境
- [ ] 已記下所有測試帳號
- [ ] 已準備測試結果報告模板
- [ ] 已通知相關人員開始測試
- [ ] 已設定測試開始時間

---

## 🎬 開始！

```
┌─────────────────────────────────┐
│  準備好了嗎？                    │
│  開始 Phase 5 測試執行           │
│                                 │
│  npm run dev                    │
│  python3 test_api.py            │
│                                 │
│  祝你測試順利！ 🚀              │
└─────────────────────────────────┘
```

---

**執行者**：________________
**開始時間**：________________
**預計完成**：2026-03-02 19:00
**簽名日期**：________________
