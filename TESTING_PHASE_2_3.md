# Phase 2.3 認證層測試執行指南

## 📋 快速開始 (Quick Start)

### 步驟 1: 安裝 PocketBase 二進制文件

```bash
# macOS (使用 Homebrew)
brew install pocketbase

# 或者手動下載
# 訪問 https://github.com/pocketbase/pocketbase/releases
# 下載最新版本，放到 /usr/local/bin 或 ~/bin
```

驗證安裝：
```bash
pocketbase version
```

### 步驟 2: 啟動 PocketBase 服務器

```bash
# 在新的終端窗口中執行
cd /Users/hsuyungfeng/Applesoft/Onecompany/ceo-platform

# 啟動 PocketBase（監聽 http://127.0.0.1:8090）
pocketbase serve
```

你應該會看到類似的輸出：
```
▶ Server started at http://127.0.0.1:8090
 ├ REST API: http://127.0.0.1:8090/api/
 └ Admin UI: http://127.0.0.1:8090/_/
```

### 步驟 3: 訪問 PocketBase Admin UI

打開瀏覽器訪問：
```
http://127.0.0.1:8090/_/
```

**首次設置**：
- 建立管理員帳戶
- 記下管理員密碼

---

## 🗄️ 步驟 4: 建立必要的 Collections (集合)

在 Admin UI 中，建立以下集合：

### Collection 1: `users` (用戶)

**字段定義：**
| 字段名 | 類型 | 設定 |
|--------|------|------|
| id | ID | 主鍵 (自動) |
| taxId | Text | 必填，唯一索引 |
| email | Email | 必填，唯一索引 |
| password | Password | 必填 |
| name | Text | 必填 |
| firmName | Text | 可選 |
| contactPerson | Text | 可選 |
| phone | Text | 可選 |
| address | Text | 可選 |
| points | Number | 默認: 0 |
| role | Select | 選項: MEMBER, ADMIN（默認: MEMBER） |
| status | Select | 選項: ACTIVE, INACTIVE（默認: ACTIVE） |
| emailVerified | Boolean | 默認: false |
| created | DateTime | 自動 |
| updated | DateTime | 自動 |

**建立規則 (Rules)**：
```
查詢（Query）:
  - 用戶只能查看自己的記錄
  - 管理員可以查看所有

創建（Create）:
  - 允許（待確認後端流程）

更新（Update）:
  - 用戶可以更新自己的資料
  - 管理員可以更新所有

刪除（Delete）:
  - 管理員可以刪除
```

### Collection 2: `oAuthAccounts` (OAuth 帳戶)

**字段定義：**
| 字段名 | 類型 | 設定 |
|--------|------|------|
| id | ID | 主鍵 |
| userId | Relation | 指向 users.id |
| provider | Select | 選項: google, apple |
| providerId | Text | 必填 |
| email | Email | 可選 |
| name | Text | 可選 |
| picture | Text | 可選 |
| accessToken | Text | 必填 |
| refreshToken | Text | 可選 |
| expiresAt | DateTime | 可選 |
| updatedAt | DateTime | 自動 |

### Collection 3: `tempOAuths` (臨時 OAuth 數據 - 2 步驟註冊)

**字段定義：**
| 字段名 | 類型 | 設定 |
|--------|------|------|
| id | ID | 主鍵 |
| provider | Select | 選項: google, apple |
| providerId | Text | 必填 |
| email | Email | 必填 |
| name | Text | 必填 |
| picture | Text | 可選 |
| accessToken | Text | 必填 |
| refreshToken | Text | 可選 |
| tokenExpiresAt | DateTime | 可選 |
| data | Text | JSON 字符串 |
| expiresAt | DateTime | 必填（1 小時後) |

---

## 🧪 步驟 5: 測試認證流程

### 測試 A: Credentials 登入

```bash
# 在 PocketBase Admin UI 中，手動建立測試用戶
# 或使用 curl 建立：

curl -X POST http://127.0.0.1:8090/api/collections/users/records \
  -H "Content-Type: application/json" \
  -d '{
    "taxId": "12345678",
    "email": "test@example.com",
    "password": "TestPassword123!",
    "name": "Test User",
    "role": "MEMBER",
    "status": "ACTIVE"
  }'
```

**預期結果：**
```json
{
  "id": "...",
  "taxId": "12345678",
  "email": "test@example.com",
  "name": "Test User",
  "role": "MEMBER",
  "status": "ACTIVE",
  "created": "2026-02-28T...",
  "updated": "2026-02-28T..."
}
```

### 測試 B: 驗證認證函數

在專案中建立測試文件 `test-auth.ts`：

```typescript
// ceo-monorepo/apps/web/test-auth.ts
import {
  findUserByTaxId,
  verifyPassword,
  isUserActive
} from '@/lib/pocketbase-auth';

async function testCredentialsAuth() {
  try {
    // 查找用戶
    const user = await findUserByTaxId('12345678');
    console.log('✅ 用戶查詢:', user);

    if (!user) {
      console.log('❌ 用戶不存在');
      return;
    }

    // 驗證密碼
    const isValid = await verifyPassword(user, 'TestPassword123!');
    console.log('✅ 密碼驗證:', isValid);

    // 驗證狀態
    const isActive = isUserActive(user);
    console.log('✅ 用戶狀態:', isActive);

  } catch (error) {
    console.error('❌ 測試失敗:', error);
  }
}

testCredentialsAuth();
```

執行測試：
```bash
npx ts-node test-auth.ts
```

---

## 🔐 步驟 6: Bearer Token 驗證測試

```bash
# 1. 從 PocketBase 生成測試 JWT Token
curl -X POST http://127.0.0.1:8090/api/collections/users/auth-with-password \
  -H "Content-Type: application/json" \
  -d '{
    "identity": "12345678",
    "password": "TestPassword123!"
  }'
```

**預期結果：**
```json
{
  "token": "eyJhbGc...",
  "record": {
    "id": "...",
    "taxId": "12345678",
    ...
  }
}
```

# 2. 使用 Token 呼叫受保護的 API

```bash
curl -H "Authorization: Bearer eyJhbGc..." \
  http://localhost:3000/api/user/profile
```

---

## ✅ 驗證檢查清單

| 項目 | 狀態 | 備註 |
|------|------|------|
| PocketBase 已安裝 | [ ] | `pocketbase version` |
| PocketBase 服務器已啟動 | [ ] | http://127.0.0.1:8090 |
| users 集合已建立 | [ ] | 包含所有必要字段 |
| oAuthAccounts 集合已建立 | [ ] | 已配置關係 |
| tempOAuths 集合已建立 | [ ] | 用於 2 步驟註冊 |
| 測試用戶已建立 | [ ] | taxId: 12345678 |
| Credentials 登入成功 | [ ] | 測試帳號可登入 |
| 密碼驗證正確 | [ ] | bcrypt 驗證通過 |
| Bearer Token 生成成功 | [ ] | /auth-with-password 工作 |
| 受保護端點可訪問 | [ ] | 使用有效 Token |
| 無效 Token 被拒絕 | [ ] | 返回 401 |

---

## 🐛 常見問題排除

### 問題 1: "Connection refused: 127.0.0.1:8090"
**解決方案：**
- 確保 PocketBase 服務器已啟動
- 檢查 `.env.local` 中的 `NEXT_PUBLIC_POCKETBASE_URL`
- 確認端口 8090 未被佔用

```bash
lsof -i :8090  # 檢查 8090 端口
```

### 問題 2: "Collection 'users' does not exist"
**解決方案：**
- 在 PocketBase Admin UI 中建立集合
- 驗證集合名稱拼寫正確（區分大小寫）
- 驗證所有必要字段已建立

### 問題 3: "Password verification failed"
**解決方案：**
- 確保使用 bcryptjs 正確雜湊密碼
- 檢查 `pocketbase-auth.ts` 中的 `verifyPassword()` 函數
- 驗證密碼在 PocketBase 中存儲為加密形式

### 問題 4: JWT Token 驗證失敗
**解決方案：**
- 驗證 `NEXTAUTH_SECRET` 環境變數已設定
- 確認 Token 未過期
- 檢查 Token 有效期設定（當前: 30 天）

---

## 📝 測試報告模板

完成測試後，填寫此報告：

```markdown
# Phase 2.3 認證層測試報告

**日期**: 2026-02-28
**測試者**: [名稱]
**版本**: [Git Commit Hash]

## 測試結果

### Credentials 登入
- [ ] 有效稅號 + 正確密碼: ✅ / ❌
- [ ] 無效稅號: ✅ / ❌
- [ ] 錯誤密碼: ✅ / ❌
- [ ] 停用帳號: ✅ / ❌

### Bearer Token 驗證
- [ ] 有效 Token: ✅ / ❌
- [ ] 過期 Token: ✅ / ❌
- [ ] 無效簽名: ✅ / ❌

### OAuth 流程
- [ ] Google OAuth (如有設定): ✅ / ❌
- [ ] Apple OAuth (如有設定): ✅ / ❌

## 已知問題
- [描述任何問題]

## 後續行動
- [ ] 修復已識別的問題
- [ ] 推進到 Phase 2.4
```

---

## 🚀 下一步

完成此測試后，應執行：

1. **本週**：
   - [ ] 建立 Collections
   - [ ] 執行基本認證測試
   - [ ] 修復任何連接問題

2. **下週**：
   - [ ] 完整的 OAuth 測試
   - [ ] Edge case 測試
   - [ ] 開始 Phase 2.4: 逐路由遷移

---

## 📚 參考資源

- **PocketBase 官方文檔**: https://pocketbase.io/docs/
- **PocketBase Collections API**: https://pocketbase.io/docs/api-collections/
- **JWT 令牌結構**: https://jwt.io/introduction
- **NextAuth 配置**: https://next-auth.js.org/

