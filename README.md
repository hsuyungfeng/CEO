# CEO 平台 - 多供應商 B2B 批發平台

## 專案概述

CEO 平台是一個現代化的多供應商 B2B 批發平台，專為批發商、零售商和供應商設計。平台提供完整的電子商務解決方案，包括供應商管理、批量採購、庫存管理、訂單處理和即時通知系統。

## 技術架構

### 前端
- **Web 應用**: Next.js 16.1.6 + React 19.2.3 + TypeScript + Tailwind CSS
- **移動應用**: React Native / Expo
- **UI 框架**: shadcn/ui + Radix UI

### 後端
- **API 框架**: Next.js API Routes
- **資料庫**: PostgreSQL + Prisma ORM
- **認證**: NextAuth v5 (beta)
- **緩存**: Redis
- **隊列**: Celery (Python)

### 開發工具
- **包管理器**: pnpm (JavaScript/TypeScript), uv (Python)
- **代碼檢查**: ESLint + Prettier
- **測試**: Jest + Playwright + Docker 測試環境
- **CI/CD**: GitHub Actions
- **部署**: Vercel (Web), Railway (後端服務)

## 專案狀態

### ✅ 已完成階段
- Phase 1: 專案初始化與基礎架構
- Phase 2: 使用者認證與授權系統
- Phase 3: 核心資料模型與 API
- Phase 4: 供應商管理系統
- Phase 4.5: 產品目錄與庫存管理
- Phase 5: 購物車與訂單系統
- Phase 6: 支付整合與發票系統
- Phase 7: 供應商系統增強
- Phase 8: 批量採購優化

### 📋 當前階段
- Phase 9: 通知與即時更新系統 (規劃中)

## 快速開始

### 環境設置
```bash
# 安裝 Node.js 依賴
cd ceo-monorepo
pnpm install

# 安裝 Python 依賴
uv sync

# 啟動開發環境
cd apps/web
pnpm dev
```

### 測試環境
```bash
# 啟動測試資料庫
npm run test:db:start

# 運行測試
npm run test:integration
```

## 文件結構

```
ceo-monorepo/                    # 主要代碼庫
├── apps/
│   ├── web/                    # Next.js Web 應用
│   └── mobile/                 # React Native 移動應用
├── packages/                   # 共享包
└── docs/                      # 專案文件

docs/                           # 當前文件
├── README.md                  # 本文件
├── AGENTS.md                  # OpenCode 代理配置
└── DailyProgress.md           # 每日進度追蹤

doc/                           # 歷史文件歸檔
└── archive/                   # 歸檔項目
```

## 開發指南

### 代碼風格
- 使用 TypeScript 嚴格模式
- 遵循 ESLint 和 Prettier 配置
- 使用繁體中文註解
- 遵循現有代碼模式和結構

### 測試要求
- 新功能需包含單元測試
- 重要功能需包含整合測試
- 測試覆蓋率需達到 85% 以上
- 使用 Docker 測試環境確保一致性

### 提交規範
- 使用語義化提交訊息
- 每個提交應專注於單一功能或修復
- 提交前需通過所有測試和代碼檢查

## 配置管理

### 環境變數
- 使用 `.env.local` 進行本地開發
- 使用 `.env.test` 進行測試環境
- 敏感資訊使用環境變數管理

### 代理配置
- OpenCode 配置: `opencode.jsonc`
- 代理工作流程: `AGENTS.md`
- Python 環境: `pyproject.toml`

## 貢獻指南

1. 創建功能分支
2. 遵循代碼風格指南
3. 添加相應測試
4. 提交 Pull Request
5. 通過代碼審查

## 授權

MIT License - 詳見 LICENSE 文件

## 聯繫方式

- 專案維護: CEO Platform Team
- 問題回報: GitHub Issues
- 文件更新: 定期更新 DailyProgress.md

## 測試帳號資訊

### 管理員帳號 (已創建)
- **統一編號**: `12345678`
- **密碼**: `Admin1234!`
- **角色**: SUPER_ADMIN
- **電子郵件**: `admin@ceo.com`
- **電話**: `0911111111`

### 測試用戶帳號 (已創建)
- **統一編號**: `87654321`
- **密碼**: `User1234!`
- **角色**: MEMBER
- **電子郵件**: `user@test.com`
- **電話**: `0987654321`

### 供應商測試帳號 (來自種子文件)
- **統一編號**: `12345678`
- **公司名稱**: 健康醫療器材有限公司
- **聯絡人**: 王小明
- **電話**: 0912345678
- **電子郵件**: `test@supplier.com`
- **用戶電子郵件**: `supplier@test.com` (MEMBER 角色)

### 快速測試帳號
1. **管理員登入**:
   - 統一編號: `12345678`
   - 密碼: `Admin1234!`
   - 權限: 完整管理員權限，可訪問 `/admin` 後台

2. **普通用戶登入**:
   - 統一編號: `87654321`
   - 密碼: `User1234!`
   - 權限: 一般會員權限

3. **供應商測試用戶**:
   - 統一編號: `12345678` (與供應商關聯)
   - 密碼: 請使用註冊功能創建或聯繫系統管理員
   - 權限: 供應商相關功能

### 測試腳本使用
```bash
# 創建測試帳號
cd ceo-monorepo/apps/web
npx tsx scripts/create-admin-account.ts

# 測試登入功能
npx tsx scripts/test-login.ts

# 運行種子文件（創建測試商品）
npx tsx prisma/seed.ts
```

### 驗證步驟
1. **啟動開發伺服器**: `npm run dev`
2. **創建測試帳號**: 運行上述創建腳本
3. **測試登入**: 訪問 http://localhost:3000/login
4. **使用測試帳號登入**: 統一編號 + 密碼
5. **驗證權限**: 管理員可訪問 `/admin`，用戶可訪問首頁

### 管理員後台訪問
**管理員帳號已成功創建並可訪問後台**：
- ✅ 統一編號: `12345678`
- ✅ 密碼: `Admin1234!`
- ✅ 角色: SUPER_ADMIN
- ✅ 管理員後台: http://localhost:3000/admin
- ✅ 會員管理: http://localhost:3000/admin/members
- ✅ 商品管理: http://localhost:3000/admin/products
- ✅ 訂單管理: http://localhost:3000/admin/orders

**問題解決**：
1. 原始問題：`Gem3Plan.md` 中的管理員帳號資訊正確，但帳號不存在於資料庫
2. 解決方案：已創建腳本成功創建管理員測試帳號
3. 驗證結果：管理員帳號可正常登入並訪問後台

**測試結果**：
- ✅ API 登入測試通過
- ✅ Session 驗證通過  
- ✅ 管理員 API 權限通過
- ✅ 管理員頁面訪問通過
- ✅ 會員管理頁面訪問通過