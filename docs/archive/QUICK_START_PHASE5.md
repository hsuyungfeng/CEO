# Phase 5 快速開始指南 (Quick Start Guide)

**最後更新**：2026-03-02
**狀態**：✅ 準備就緒

---

## 🚀 一分鐘摘要

### 現在的狀態
```
✅ Phase 4.5 完成 (88/88 tests passing)
✅ TypeScript 0 errors (生產程式碼)
✅ Phase 5 測試計劃已建立 (83 test cases)
✅ 自動化測試工具已準備
```

### 下一步
```bash
# 1. 啟動開發伺服器
npm run dev                          # Terminal 1

# 2. 執行自動化測試（在另一個終端）
python3 test_api.py                # Terminal 2
bash TEST_API_ENDPOINTS.sh          # 或快速驗證

# 3. 開始手動測試
# 按照 PHASE_5_TESTING_PLAN.md 的指導
```

---

## 📁 關鍵檔案清單

### 必讀檔案
| 檔案 | 內容 | 用途 |
|------|------|------|
| `PHASE_5_TESTING_PLAN.md` | 83 個測試用例 | 詳細測試指南 |
| `WORK_COMPLETION_REPORT.md` | 完整工作報告 | 背景和進度 |
| `QUICK_START_PHASE5.md` | 本檔案 | 快速參考 |

### 測試工具
| 檔案 | 語言 | 用途 |
|------|------|------|
| `TEST_API_ENDPOINTS.sh` | Bash | 快速驗證 (2 min) |
| `test_api.py` | Python | 完整測試 (5 min) |

### 進度追蹤
| 檔案 | 更新頻率 | 內容 |
|------|---------|------|
| `DailyProgress.md` | 每天 | 每日進度 |
| `Gem3Plan.md` | 每週 | 長期規劃 |

---

## 🧪 測試計劃概覽

### P0 優先 (立即執行) — 10 小時
```
□ 認證流程 (2h)
  └─ Credentials login
  └─ OAuth (Google, Apple)
  └─ Bearer Token
  └─ Session management

□ 產品 & 購物車 (2h)
  └─ Product list/detail
  └─ Add to cart
  └─ Modify quantity
  └─ Delete from cart

□ 訂單 & 結帳 (2.5h)
  └─ Create order
  └─ Amount validation
  └─ Inventory tracking

□ 團購系統 (3h)
  └─ List/create/join
  └─ Discount calculation
  └─ Finalize & rebates
```

### P1 優先 (後續執行) — 6 小時
```
□ 發票系統 (2h)
□ 管理後台 (2h)
□ 性能測試 (1h)
□ 安全驗證 (1h)
```

---

## 🔧 環境設置

### 前置條件
```bash
# 驗證環境
node --version              # 應為 v22+
npm --version              # 應為 10+
psql --version             # PostgreSQL 16+
```

### 啟動開發環境
```bash
# 位置
cd ceo-platform/ceo-monorepo/apps/web

# 啟動伺服器
npm run dev

# 預期
✓ Server running on http://localhost:3000
✓ PostgreSQL connected
✓ Ready for API requests
```

### 驗證連接
```bash
# 快速健康檢查
curl http://localhost:3000/api/health | jq .

# 預期回應
{
  "status": "healthy",
  "database": "connected"
}
```

---

## 📊 測試執行計劃

### 第 1 天：P0 測試 (8 小時)
```
09:00-11:00  認證流程測試
11:00-13:00  產品 & 購物車測試
14:00-16:30  訂單 & 結帳測試
16:30-19:00  團購系統測試 + 文件記錄
```

### 第 2 天：P1 測試 (6 小時)
```
09:00-11:00  發票系統測試
11:00-13:00  管理後台測試
14:00-15:00  性能測試
15:00-16:00  安全驗證 + 報告
```

### 結果報告
- 使用 PHASE_5_TESTING_PLAN.md 中的模板
- 記錄所有通過/失敗結果
- 發現的問題提交 GitHub Issue

---

## 🐛 常見問題 (FAQ)

### Q: 開發伺服器無法啟動？
**A:**
1. 檢查 PostgreSQL 是否運行：`psql -c "SELECT 1"`
2. 檢查 .env.local 是否存在
3. 檢查埠 3000 是否被佔用：`lsof -i :3000`
4. 清除快取：`rm -rf .next node_modules && npm install`

### Q: 測試失敗怎麼辦？
**A:**
1. 檢查伺服器日誌（Terminal 1）
2. 運行快速檢查：`bash TEST_API_ENDPOINTS.sh`
3. 檢查特定端點：`curl -v http://localhost:3000/api/health`
4. 記錄詳細錯誤資訊到測試報告

### Q: 如何測試受保護端點？
**A:**
```bash
# 獲取測試帳號
稅號：12345678
密碼：Admin1234!

# 使用 test_api.py 進行完整測試
python3 test_api.py

# 手動測試需要建立登入流程
# 參考 PHASE_5_TESTING_PLAN.md § 認證流程
```

---

## 📈 成功標準

### 測試完成條件
- [ ] P0 所有 49 個測試通過
- [ ] P1 所有 34 個測試通過
- [ ] 0 個關鍵錯誤 (Critical)
- [ ] 所有發現問題已記錄

### 測試報告要求
- [ ] 每個模組有執行日期
- [ ] 所有結果（通過/失敗）已記錄
- [ ] 任何失敗都有詳細說明
- [ ] 性能指標已測量
- [ ] 簽名和日期

---

## 🎯 檢查清單

### 開始前
- [ ] 已讀 PHASE_5_TESTING_PLAN.md
- [ ] 已讀 WORK_COMPLETION_REPORT.md
- [ ] 環境已驗證（Node.js, npm, PostgreSQL）
- [ ] 開發伺服器已啟動

### 執行期間
- [ ] 使用自動化測試工具驗證基本功能
- [ ] 按照計劃執行 P0 測試
- [ ] 記錄所有結果
- [ ] 發現問題時立即報告

### 完成後
- [ ] 所有 P0 測試已通過
- [ ] P1 測試已計劃
- [ ] 報告已簽名和日期
- [ ] 準備下一階段（性能 + 安全）

---

## 📞 支持資源

### 文件
- `PHASE_5_TESTING_PLAN.md` — 詳細測試指南
- `WORK_COMPLETION_REPORT.md` — 工作報告
- `DailyProgress.md` — 進度追蹤
- `Gem3Plan.md` — 長期規劃

### 命令
```bash
# 快速驗證
bash TEST_API_ENDPOINTS.sh

# 完整測試
python3 test_api.py

# 查看進度
cat DailyProgress.md | head -50

# 查看計劃
cat PHASE_5_TESTING_PLAN.md | head -100
```

### Git 信息
```bash
# 查看最近提交
git log --oneline -10

# 查看特定提交
git show <commit-hash>

# 查看變更統計
git diff --stat HEAD~6
```

---

## ✅ 完成狀態

```
╔════════════════════════════════════╗
║   Phase 4.5 ✅ COMPLETE           ║
║   TypeScript ✅ 0 ERRORS          ║
║   Phase 5 ✅ READY FOR TESTING    ║
║                                    ║
║   👉 Next: Run test_api.py        ║
╚════════════════════════════════════╝
```

---

**祝你測試順利！** 🚀

如有任何問題，請參考相關文件或檢查日誌輸出。
