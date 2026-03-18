# 🚀 Next Steps - 立即行動 (Immediate Actions)

## 📌 本週待辦 (This Week - Due 2026-03-06)

### 1️⃣ **與業務/PM 會面** 🎯 CRITICAL
**目的**：驗證核心業務需求，避免中途方向改變

**需要確認的事項**：
```
☐ 月結系統
  └─ 月結頻率？ (每月底？每週?)
  └─ 付款期限？ (月底後 15/30 天?)
  └─ 逾期政策？ (逾期費用？停用帳戶?)
  └─ 發票需求？ (電子發票？紙本?)

☐ 折購金系統
  └─ 兌換率？ (1點 = 1元? 1元?)
  └─ 點數過期？ (是否有過期機制?)
  └─ 人工調整？ (HR 可調整點數?)

☐ 支付方式確認
  └─ 現有的支付方式有哪些被使用？
  └─ 可以完全去掉信用卡/第三方金流嗎？
  └─ 現金交易如何追蹤？ (現金簽收單?)

☐ 使用者規模
  └─ 預期員工人數？ (訊息: 現在有多少?)
  └─ 月度交易量？ (訂單/月?)
  └─ 為什麼要移除搜尋？ (搜尋有被使用嗎?)

☐ 合約與承諾
  └─ 現有合約要求哪些功能？
  └─ 客戶有依賴的功能嗎？
```

**會後產出**：
- ✅ 需求確認清單 (簽署)
- ✅ 月結、點數、支付流程圖

**時間**：1.5 小時會議 + 30 分鐘筆記

---

### 2️⃣ **解決 Prisma 幽靈依賴** 🔧 BLOCKING
**問題**：`package.json` 有 Prisma 命令但沒有依賴宣告，會導致運行時錯誤

**選項 A：修復（推薦）**
```bash
npm install @prisma/client
npm run db:generate  # 測試
```

**選項 B：移除（如果不用 Prisma）**
```bash
# 從 package.json 移除以下行：
# "db:generate": "prisma generate",
# "db:push": "prisma db push",
# "db:migrate": "prisma migrate dev",
# "db:studio": "prisma studio"
```

**完成條件**：
- ☐ `npm run db:generate` 或移除命令不出錯
- ☐ `npm install` 通過
- ☐ 本機 dev 環境啟動

**時間**：30 分鐘

---

### 3️⃣ **驗證 PocketBase 環境** 🗄️
**檢查清單**：

```bash
# 1. 確認 PocketBase 可本機執行
ls -la /Users/hsuyungfeng/Applesoft/Onecompany/ceo-platform/  # 確認存在

# 2. 確認環境變數
echo $NEXT_PUBLIC_POCKETBASE_URL  # 應為 http://127.0.0.1:8090

# 3. 檢查 PocketBase 初始化
cat ceo-monorepo/apps/web/src/lib/pocketbase.ts

# 4. 測試連接
npm run dev  # 啟動 Next.js，確認無 PocketBase 連接錯誤
```

**完成條件**：
- ☐ PocketBase URL 正確設定
- ☐ `src/lib/pocketbase.ts` 存在
- ☐ 本機開發環境啟動無 PocketBase 連接錯誤

**時間**：30 分鐘

---

## 📅 下週待辦 (Next Week - Due 2026-03-13)

### 4️⃣ **開始第 1 階段：準備與清理** 📋
**使用**：Gem3Plan.md 中的第 1 階段清單

```
Deliverables:
- [ ] 1.1 PocketBase Schema 初稿 (5 個核心集合)
- [ ] 1.2 測試基準建立 (速度、覆蓋率、Bundle)
- [ ] 1.3 過時檔案識別清單
- [ ] 1.4 業務需求確認清單 (簽署)
```

**分工**：
- 1 人：PocketBase Schema + 遷移計畫
- 1 人：測試基準 + 清理列表

**時間**：40 小時 (1 週)

---

### 5️⃣ **建立 PocketBase Schema** 🗂️
**目標**：設計最小可行 Schema (MVP)

**核心集合** (參考 Gem3Plan.md 第 2.1 節):
```
users           → 40 字段 (email, password, taxId, name, points, etc)
products        → 13 字段 (name, price, category, firm, etc)
categories      → 6 字段 (id, name, parentId, sortOrder, isActive)
orders          → 9 字段 (orderNo, userId, status, totalAmount, etc)
order_items     → 5 字段 (orderId, productId, quantity, price)
cart_items      → 3 字段 (userId, productId, quantity)
point_txns      → 5 字段 (userId, type, amount, reason)
```

**產出**：
- PocketBase collections.json (匯出)
- README 說明每個集合的用途
- API 權限規則檔

**時間**：20 小時 (初稿)

---

## 🎯 優先順序

| 優先級 | 任務 | 預計 | 依賴 |
|--------|------|------|------|
| 🔴 1 | 與業務會面 (確認需求) | 2h | - |
| 🔴 2 | 解決 Prisma 幽靈依賴 | 0.5h | - |
| 🟠 3 | 驗證 PocketBase 環境 | 0.5h | ✅ 1, 2 |
| 🟡 4 | 開始第 1 階段 | 40h | ✅ 1, 3 |
| 🟡 5 | 建立 PocketBase Schema | 20h | ✅ 1, 4 |

**總計**：~63 小時 / 1.5 週 (1 人) 或 1 週 (2 人)

---

## 📊 成功標準 (Definition of Done)

### 本週末 (2026-03-06)
- ✅ 業務需求清單簽署
- ✅ Prisma 幽靈依賴已解決
- ✅ PocketBase 本機環境驗證成功

### 下週末 (2026-03-13)
- ✅ PocketBase Schema 初稿完成
- ✅ 測試基準已建立 (速度基準記錄)
- ✅ 過時檔案清單準備好
- ✅ 第 2 階段準備 (遷移計畫)

---

## 🛠️ 工具與資源

### 必需工具
- [ ] PocketBase CLI (用於本機開發)
  ```bash
  # 下載 https://pocketbase.io/docs/
  # 或 brew install pocketbase (macOS)
  ```

- [ ] Postman 或 Insomnia
  ```
  用於測試 PocketBase API
  ```

- [ ] 資料庫遷移腳本範本
  ```
  參考：Gem3Plan.md 第 2.2 節
  ```

### 文件
- 📄 [Gem3Plan.md](./Gem3Plan.md) - 完整 6 階段計劃
- 📄 [DailyProgress.md](./DailyProgress.md) - 每日追蹤
- 📄 [AGENT_ANALYSIS_SUMMARY.md](./AGENT_ANALYSIS_SUMMARY.md) - 三面向分析
- 🔗 [PocketBase 官方文檔](https://pocketbase.io/docs/)

---

## 🤝 團隊分工建議

### 最小配置 (1 人)
```
Week 1-2: 準備 + 業務驗證 + Schema 設計
  └─ 1 人: 全部工作

Week 3-8: 資料庫遷移 (高難度)
  └─ 需要 2 人 (並行低/高風險路由)

Week 9-15: UX + 支付 + 測試
  └─ 需要 2-3 人 (並行 UX、支付、測試)
```

### 推薦配置 (2-3 人)
```
Week 1-2: 並行
  - P1 (Backend): Prisma 幽靈依賴 + Schema 設計
  - P2 (DevOps): PocketBase 環境 + 遷移腳本

Week 3-8: 資料庫遷移
  - P1 (Backend): 高風險路由 (認證、管理)
  - P2 (Backend): 低風險路由 (公開、購物車)
  - P3 (QA): 並行測試

Week 9-15: UX + 業務
  - P1 (Frontend): UX 簡化
  - P2 (Backend): 支付重構
  - P3 (QA): 端到端測試
```

---

## ⚠️ 風險與注意事項

### 如果業務會面延遲
**緩解**：開始 Schema 設計，假設 cash/monthly/points
- ✅ 可逆，會後調整
- ⚠️ 可能浪費時間，但不阻斷

### 如果 Prisma 幽靈依賴難以解決
**選項 A**：直接移除 Prisma 腳本，因為準備遷移到 PocketBase
**選項 B**：安裝 @prisma/client，短期維持雙路由

### 如果 PocketBase 連接失敗
**檢查項目**：
1. PocketBase 是否安裝？
2. NEXT_PUBLIC_POCKETBASE_URL 正確？
3. PocketBase 服務是否啟動？
4. 防火牆是否阻擋 8090 端口？

---

## 📞 需要幫助？

如果遇到卡點，檢查：

1. **Gem3Plan.md** - 詳細的分階段計劃
2. **AGENT_ANALYSIS_SUMMARY.md** - 三個角度的完整分析
3. **DailyProgress.md** - 每日進度與更新

---

**準備好開始了嗎？** 🚀

1. ✅ 這週：進行業務會面 + 解決技術阻擋
2. ✅ 下週：開始第 1 階段，設計 Schema
3. ✅ 2 週後：進入第 2 階段，開始資料庫遷移

**預計 13-20 週完成整個轉型。**

祝你好運！ 💪
