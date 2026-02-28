# 🚀 Phase 2.3 認證層測試 - 快速開始指南

## ⏱️ 預計時間：15-20 分鐘

---

## 📋 第 1 步：安裝 PocketBase (2 分鐘)

### macOS 用戶（推薦）：
```bash
# 使用 Homebrew 安裝
brew install pocketbase

# 驗證安裝
pocketbase version
```

### 其他系統：
訪問 [PocketBase 官方下載](https://github.com/pocketbase/pocketbase/releases) 並下載適合你系統的版本。

---

## 🔌 第 2 步：啟動 PocketBase 服務器 (1 分鐘)

**在新的終端窗口中執行：**

```bash
cd /Users/hsuyungfeng/Applesoft/Onecompany/ceo-platform
pocketbase serve
```

**預期輸出：**
```
▶ Server started at http://127.0.0.1:8090
 ├ REST API: http://127.0.0.1:8090/api/
 └ Admin UI: http://127.0.0.1:8090/_/
```

✅ 若看到此輸出，表示 PocketBase 已成功啟動！

---

## 🔧 第 3 步：建立 Collections（數據庫表）(5-10 分鐘)

### 打開 PocketBase Admin UI：
```
http://127.0.0.1:8090/_/
```

**首次登入時：**
- 建立管理員帳戶（記好密碼）

### 建立 Collection 1: `users`

1. 點擊 **+ 新增 Collections**
2. 輸入名稱：`users`
3. 點擊 **建立**

**添加以下字段：**

| 字段名 | 類型 | 設定 | 備註 |
|--------|------|------|------|
| taxId | Text | ✅ 必填, ✅ 唯一 | 統一編號 |
| email | Email | ✅ 必填, ✅ 唯一 | 電子郵件 |
| password | Password | ✅ 必填 | 密碼 |
| name | Text | ✅ 必填 | 姓名 |
| firmName | Text | ☐ 可選 | 公司名稱 |
| contactPerson | Text | ☐ 可選 | 聯絡人 |
| phone | Text | ☐ 可選 | 電話 |
| address | Text | ☐ 可選 | 地址 |
| points | Number | 默認：0 | 折購金點數 |
| role | Select | 選項：MEMBER, ADMIN | 角色 |
| status | Select | 選項：ACTIVE, INACTIVE | 狀態 |
| emailVerified | Boolean | 默認：false | 郵件驗證 |

✅ **Collection `users` 建立完成！**

---

### 建立 Collection 2: `oAuthAccounts`

1. 點擊 **+ 新增 Collections**
2. 輸入名稱：`oAuthAccounts`
3. 點擊 **建立**

**添加以下字段：**

| 字段名 | 類型 | 設定 |
|--------|------|------|
| userId | Relation | 指向 `users.id` |
| provider | Select | 選項：google, apple |
| providerId | Text | ✅ 必填 |
| email | Email | ☐ 可選 |
| name | Text | ☐ 可選 |
| picture | Text | ☐ 可選 |
| accessToken | Text | ✅ 必填 |
| refreshToken | Text | ☐ 可選 |
| expiresAt | DateTime | ☐ 可選 |

✅ **Collection `oAuthAccounts` 建立完成！**

---

### 建立 Collection 3: `tempOAuths`

1. 點擊 **+ 新增 Collections**
2. 輸入名稱：`tempOAuths`
3. 點擊 **建立**

**添加以下字段：**

| 字段名 | 類型 | 設定 |
|--------|------|------|
| provider | Select | 選項：google, apple |
| providerId | Text | ✅ 必填 |
| email | Email | ✅ 必填 |
| name | Text | ✅ 必填 |
| picture | Text | ☐ 可選 |
| accessToken | Text | ✅ 必填 |
| refreshToken | Text | ☐ 可選 |
| tokenExpiresAt | DateTime | ☐ 可選 |
| data | Text | ✅ 必填 |
| expiresAt | DateTime | ✅ 必填 |

✅ **所有 Collections 建立完成！**

---

## 🧪 第 4 步：執行自動測試 (2 分鐘)

在當前的終端窗口中執行（**不是** PocketBase 的終端）：

```bash
# 進入專案目錄
cd /Users/hsuyungfeng/Applesoft/Onecompany/ceo-platform/ceo-monorepo/apps/web

# 執行測試腳本
npx ts-node scripts/test-pocketbase-auth.ts
```

### 預期輸出：

```
============================================================
🚀 Phase 2.3 認證層測試開始
============================================================

🧪 測試 1: 檢查 PocketBase 連接...
✅ ✓ PocketBase 連接成功 (可以查詢集合)

🧪 測試 2: 建立測試用戶...
✅ ✓ 用戶已建立 (ID: abc123...)

🧪 測試 3: 根據 taxId 查找用戶...
✅ ✓ 找到用戶 (taxId: 12345678)

...

============================================================
📊 測試結果摘要
============================================================
✅ 通過: 9
❌ 失敗: 0
總計: 9

🎉 所有測試通過！可以進行 Phase 2.4
```

---

## ✅ 測試成功的標誌

| 檢查項目 | 狀態 |
|---------|------|
| ✅ PocketBase 連接成功 | |
| ✅ 用戶建立成功 | |
| ✅ 根據 taxId 查找用戶 | |
| ✅ 根據 email 查找用戶 | |
| ✅ 密碼驗證成功 | |
| ✅ 錯誤密碼被拒絕 | |
| ✅ 用戶狀態檢查 | |
| ✅ OAuth 帳戶建立 | |
| ✅ OAuth 帳戶查找 | |

若所有項目都通過，恭喜！**Phase 2.3 認證層測試已完成！**

---

## 🐛 如果測試失敗？

### 常見問題 1: "Connection refused"
```bash
# 確保 PocketBase 仍在運行
# 檢查 PocketBase 終端窗口是否有錯誤
# 嘗試訪問：http://127.0.0.1:8090/_/
```

### 常見問題 2: "Collection 'users' does not exist"
```bash
# 確保所有 3 個 Collections 已建立
# 在 PocketBase Admin UI 中驗證
# 檢查名稱是否完全正確（區分大小寫）
```

### 常見問題 3: "duplicate key value violates unique constraint"
```bash
# 表示測試用戶已存在
# 這是正常的（表示之前的測試成功）
# 腳本會自動處理此情況
```

### 常見問題 4: "Module not found"
```bash
# 確保在正確目錄執行
cd /Users/hsuyungfeng/Applesoft/Onecompany/ceo-platform/ceo-monorepo/apps/web

# 確保依賴已安裝
npm install
```

---

## 📚 下一步

### 若測試全部通過：
1. ✅ 提交 git commit：
   ```bash
   git add -A
   git commit -m "test: Phase 2.3 認證層測試通過"
   ```

2. ✅ 開始 **Phase 2.4: 逐路由遷移**
   - 驗證已使用 PocketBase 的 6 個路由
   - 遷移公開路由
   - 遷移認證路由
   - 遷移管理路由

### 詳細測試指南：
參見 [TESTING_PHASE_2_3.md](./TESTING_PHASE_2_3.md)

---

## 📞 需要幫助？

檢查以下資源：
- 📖 [PocketBase 官方文檔](https://pocketbase.io/docs/)
- 🔧 [PocketBase Collections API](https://pocketbase.io/docs/api-collections/)
- 🔐 [PocketBase 認證](https://pocketbase.io/docs/api-authentication/)
- 📝 [Gem3Plan.md](./Gem3Plan.md) - 完整的實施計劃

---

## ⏰ 總時間統計

| 步驟 | 時間 |
|------|------|
| 1. 安裝 PocketBase | 2 分鐘 |
| 2. 啟動服務器 | 1 分鐘 |
| 3. 建立 Collections | 5-10 分鐘 |
| 4. 執行測試 | 2 分鐘 |
| **總計** | **⏱️ 10-15 分鐘** |

**開始時間**: 現在 🚀

