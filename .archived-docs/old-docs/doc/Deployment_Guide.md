# NextAuth.js v5 修正部署指南

## 部署前準備

### 1. 資料庫遷移
在部署前，必須完成資料庫遷移以添加新的認證字段：

```bash
cd web
npx prisma migrate dev --name add_auth_fields
```

如果遇到資料庫連接問題：
1. 確保PostgreSQL服務正在運行
2. 檢查`.env`中的`DATABASE_URL`
3. 確保用戶有足夠權限

### 2. 環境變數配置
更新`web/.env`文件：

```env
# 必要環境變數
DATABASE_URL="postgresql://username:password@host:5432/database"
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-strong-secret-key-here" # 必須更改！
APP_NAME="您的應用程式名稱"
APP_URL="https://your-domain.com"

# 生產環境建議配置
APP_ENV="production"
REDIS_URL="redis://localhost:6379" # 用於會話和速率限制

# 郵件服務（生產環境必需）
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM="noreply@your-domain.com"

# 安全配置
REQUIRE_EMAIL_VERIFICATION="true" # 啟用郵件驗證
RATE_LIMIT_WINDOW=900000 # 15分鐘
RATE_LIMIT_MAX=100
```

### 3. 啟用完整功能
部署後，需要取消註解以下文件中的暫時註解：

1. **註冊API** (`web/src/app/api/auth/register/route.ts`):
   - 取消註解郵件驗證相關代碼
   - 啟用`requiresVerification`標誌

2. **密碼重置API** (`web/src/app/api/auth/reset-password/route.ts`):
   - 取消註解重置令牌處理
   - 啟用完整的令牌驗證
   - 取消註解速率限制裝飾器

3. **郵件驗證API** (`web/src/app/api/auth/verify-email/route.ts`):
   - 取消註解令牌驗證邏輯
   - 啟用資料庫更新

4. **認證配置** (`web/src/lib/auth.ts`):
   - 取消註解郵件驗證檢查
   - 取消註解最後登入時間更新

5. **速率限制**:
   - 取消註解`withRateLimit`裝飾器
   - 配置Redis用於生產環境

## 部署步驟

### 步驟1: 構建應用程式
```bash
cd web
npm run build
```

### 步驟2: 啟動應用程式
```bash
npm start
```

### 步驟3: 驗證部署
訪問以下URL驗證功能：
1. `https://your-domain.com` - 首頁
2. `https://your-domain.com/login` - 登入頁面
3. `https://your-domain.com/register` - 註冊頁面
4. `https://your-domain.com/reset-password` - 密碼重置頁面

## 生產環境安全配置

### 1. HTTPS配置
- 使用有效的SSL證書
- 配置HTTP到HTTPS重定向
- 設置HSTS頭部

### 2. 防火牆配置
- 限制管理員後台訪問IP
- 配置WAF規則
- 設置DDoS防護

### 3. 監控和日誌
- 設置應用程式日誌
- 配置錯誤追蹤
- 設置性能監控

### 4. 備份策略
- 定期備份資料庫
- 備份上傳文件
- 測試恢復流程

## 故障排除

### 常見問題1: 資料庫連接失敗
**症狀**: 應用程式啟動失敗，資料庫錯誤
**解決方案**:
1. 檢查`DATABASE_URL`格式
2. 驗證資料庫服務狀態
3. 檢查防火牆設置
4. 驗證用戶權限

### 常見問題2: 郵件發送失敗
**症狀**: 註冊/密碼重置郵件未發送
**解決方案**:
1. 檢查SMTP配置
2. 驗證郵件服務商限制
3. 檢查垃圾郵件文件夾
4. 查看應用程式日誌

### 常見問題3: 速率限制問題
**症狀**: 用戶報告頻繁被限制
**解決方案**:
1. 調整速率限制參數
2. 配置Redis改善性能
3. 檢查IP地址識別
4. 設置白名單

### 常見問題4: 會話問題
**症狀**: 用戶會話頻繁過期
**解決方案**:
1. 檢查`NEXTAUTH_SECRET`
2. 配置會話存儲（Redis）
3. 調整會話過期時間
4. 檢查時區設置

## 性能優化建議

### 1. 快取策略
- 實現API響應快取
- 使用CDN靜態資源
- 配置資料庫查詢快取

### 2. 資料庫優化
- 添加必要的索引
- 優化查詢語句
- 定期清理舊數據

### 3. 前端優化
- 啟用圖片優化
- 實現代碼分割
- 使用服務端渲染

### 4. 監控指標
- 響應時間
- 錯誤率
- 並發用戶數
- 資源使用率

## 擴展功能

### 1. 社交登入
可以添加以下社交登入提供者：
- Google OAuth
- Facebook Login
- GitHub OAuth

### 2. 雙因素認證
增強安全性：
- TOTP（時間型一次性密碼）
- 簡訊驗證
- 郵件驗證碼

### 3. 審計日誌
記錄重要操作：
- 登入/登出
- 密碼更改
- 權限變更
- 敏感操作

### 4. API文檔
生成API文檔：
- OpenAPI/Swagger
- API測試工具
- 使用示例

## 緊急情況處理

### 1. 安全漏洞
**立即行動**:
1. 暫停受影響服務
2. 分析漏洞影響
3. 應用修復補丁
4. 通知受影響用戶

### 2. 資料庫故障
**恢復步驟**:
1. 切換到備份實例
2. 恢復最新備份
3. 驗證數據完整性
4. 監控恢復過程

### 3. DDoS攻擊
**防護措施**:
1. 啟用雲服務商DDoS防護
2. 限制異常IP訪問
3. 增加帶寬容量
4. 監控攻擊模式

## 聯繫和支持

### 技術支持
- 開發團隊: [聯繫方式]
- 運維團隊: [聯繫方式]
- 安全團隊: [聯繫方式]

### 監控儀表板
- 應用程式狀態: [URL]
- 錯誤追蹤: [URL]
- 性能監控: [URL]

### 文檔資源
- API文檔: [URL]
- 用戶手冊: [URL]
- 故障排除指南: [URL]

---

**部署檢查清單完成時間**: 2026年2月8日
**部署狀態**: 準備就緒
**注意事項**: 生產部署前務必完成所有安全配置