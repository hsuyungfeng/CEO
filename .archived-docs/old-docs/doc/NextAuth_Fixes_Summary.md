# NextAuth.js v5 設定問題修正總結

## 已完成的高優先級修正

### 1. 修復依賴問題 ✅
- **問題**: `package.json`中缺少NextAuth.js相關依賴
- **修正**:
  - 更新`web/package.json`，添加以下依賴:
    - `next-auth`: `^5.0.0-beta.30`
    - `@prisma/client`: `^7.3.0`
    - `bcryptjs`: `^3.0.3`
    - `zod`: `^4.3.6`
    - `dotenv`: `^16.4.7`
  - 更新scripts以包含環境變數驗證

### 2. 新增/更新middleware ✅
- **問題**: 現有middleware使用已棄用的約定
- **修正**:
  - 更新`web/src/middleware.ts`使用NextAuth.js v5的`auth()`函數
  - 實現基於角色的路由保護:
    - 管理員路由: 僅`ADMIN`角色可訪問
    - 會員路由: `MEMBER`和`ADMIN`角色可訪問
    - 公開路由: 所有人可訪問
  - 添加未授權頁面重定向
  - 創建`/unauthorized`頁面

### 3. 環境變數驗證 ✅
- **問題**: 缺少啟動時的環境變數驗證
- **修正**:
  - 創建`web/scripts/validate-env.js`驗證腳本
  - 驗證必要環境變數:
    - `DATABASE_URL`
    - `NEXTAUTH_URL`
    - `NEXTAUTH_SECRET`
    - `APP_NAME`
    - `APP_URL`
  - 在`dev`、`build`、`start`命令前自動運行驗證
  - 提供清晰的錯誤訊息和解決方案

## 已完成的中優先級修正

### 4. 新增密碼重置功能 ✅
- **問題**: 缺少密碼重置功能
- **修正**:
  - 創建`/api/auth/reset-password` API:
    - `POST`: 請求密碼重置，發送重置郵件
    - `PUT`: 使用令牌重置密碼
  - 創建`/reset-password`頁面:
    - 請求重置連結表單
    - 設定新密碼表單
  - 創建郵件發送工具`web/src/lib/email.ts`
  - 實現速率限制保護

### 5. 新增郵件驗證 ✅
- **問題**: 缺少郵件驗證功能
- **修正**:
  - 更新User模型添加驗證字段:
    - `emailVerified`
    - `emailVerificationToken`
    - `emailVerificationExpiry`
  - 創建`/api/auth/verify-email` API
  - 更新註冊API發送驗證郵件
  - 創建驗證成功/失敗頁面:
    - `/verification-success`
    - `/verification-failed`

### 6. 新增速率限制 ✅
- **問題**: 缺少速率限制保護
- **修正**:
  - 創建`web/src/lib/rate-limit.ts`速率限制工具
  - 實現多層級速率限制:
    - 預設限制: 15分鐘100次請求
    - 認證限制: 15分鐘10次登入嘗試
    - API限制: 每分鐘60次請求
    - 密碼重置限制: 每小時5次請求
  - 整合到NextAuth認證流程
  - 整合到密碼重置API

## 新增文件和目錄結構

```
web/
├── scripts/
│   └── validate-env.js          # 環境變數驗證腳本
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── auth/
│   │   │       ├── reset-password/     # 密碼重置API
│   │   │       └── verify-email/       # 郵件驗證API
│   │   ├── reset-password/      # 密碼重置頁面
│   │   ├── unauthorized/        # 未授權頁面
│   │   ├── verification-success/# 驗證成功頁面
│   │   └── verification-failed/ # 驗證失敗頁面
│   ├── lib/
│   │   ├── auth.ts             # 更新包含速率限制
│   │   ├── email.ts            # 郵件發送工具
│   │   └── rate-limit.ts       # 速率限制工具
│   └── middleware.ts           # 更新middleware
├── prisma/
│   └── schema.prisma           # 更新User模型
└── package.json               # 更新依賴和scripts
```

## 安全增強功能

### 1. 環境安全
- 啟動時自動驗證環境變數
- 警告使用預設密鑰
- 檢查資料庫URL格式

### 2. 認證安全
- 登入嘗試速率限制
- 密碼重置請求限制
- 郵件驗證要求（可配置）
- 會話管理增強

### 3. 應用程式安全
- 基於角色的訪問控制
- API請求速率限制
- 安全的密碼重置流程
- 郵件驗證流程

## 待完成項目

### 高優先級
1. **資料庫遷移**: 需要運行Prisma遷移以更新User模型
   ```bash
   cd web && npx prisma migrate dev --name add_auth_fields
   ```

2. **生產環境配置**:
   - 更新`.env`文件中的`NEXTAUTH_SECRET`
   - 配置真實的SMTP服務
   - 設置Redis用於會話存儲

### 中優先級
1. **測試**: 編寫單元測試和整合測試
2. **監控**: 添加日誌和監控
3. **文檔**: 更新API文檔和使用指南

## 測試建議

### 1. 環境驗證測試
```bash
cd web && npm run validate-env
```

### 2. 構建測試
```bash
cd web && npm run build
```

### 3. 功能測試
1. 註冊新用戶（應收到驗證郵件）
2. 點擊驗證連結完成驗證
3. 登入測試（包含錯誤密碼速率限制）
4. 請求密碼重置
5. 使用重置連結設定新密碼
6. 測試角色權限:
   - 普通用戶訪問管理員路由
   - 管理員訪問會員路由
   - 未登入用戶訪問受保護路由

## 生產部署檢查清單

- [ ] 更新所有環境變數（特別是`NEXTAUTH_SECRET`）
- [ ] 配置生產資料庫
- [ ] 設置SMTP郵件服務
- [ ] 配置Redis用於會話存儲
- [ ] 啟用HTTPS
- [ ] 設置適當的CORS策略
- [ ] 配置日誌和監控
- [ ] 運行完整測試套件
- [ ] 備份策略
- [ ] 災難恢復計劃

## 已知問題和解決方案

### 1. 資料庫遷移失敗
**問題**: Prisma遷移因資料庫連接問題失敗
**解決方案**:
1. 確保PostgreSQL服務正在運行
2. 檢查`.env`中的`DATABASE_URL`
3. 確保用戶有足夠權限

### 2. 郵件發送問題
**問題**: 開發環境中郵件只記錄到控制台
**解決方案**:
1. 生產環境中配置真實的SMTP服務
2. 設置環境變數:
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_USER`
   - `SMTP_PASSWORD`
   - `SMTP_FROM`

### 3. 速率限制存儲
**問題**: 開發環境使用記憶體存儲，重啟後重置
**解決方案**:
1. 生產環境中配置Redis
2. 更新`rate-limit.ts`使用Redis存儲

## 性能考慮

1. **速率限制存儲**: 生產環境應使用Redis
2. **會話存儲**: 考慮使用Redis或資料庫存儲會話
3. **郵件隊列**: 高流量時考慮使用隊列系統
4. **快取策略**: 實現適當的快取策略

## 擴展建議

1. **社交登入**: 添加Google、Facebook等社交登入
2. **雙因素認證**: 添加2FA支持
3. **審計日誌**: 記錄所有安全相關操作
4. **IP白名單**: 管理員後台IP限制
5. **設備管理**: 管理登入設備和會話

---

**修正完成時間**: 2026年2月8日
**修正者**: 資深認證系統工程師
**狀態**: 主要問題已修正，準備測試和部署