# CEO 團購電商平台 - 完整建置與使用指南

## 📋 專案概述

CEO 團購電商平台是一個全棧電商解決方案，支援 Web 平台與 Mobile App (iOS/Android)，專為 B2B 團購業務設計。平台提供完整的商品管理、購物車、訂單處理、會員系統、推播通知等功能。

**核心功能**：
- 🔐 雙重認證系統（Email/密碼 + OAuth）
- 🛍️ 階梯定價團購系統（量大批發價）
- 📱 跨平台支援（Web + iOS + Android）
- 🔔 即時推播通知（FCM + APNs）
- 🏪 完整後台管理系統
- 📊 數據分析與儀表板
- 💰 會員點數與獎勵系統

**技術狀態**：
- ✅ 後端 API 完整實現（41 個 API 端點）
- ✅ 前台購物流程完整
- ✅ 後台管理系統完整
- ✅ Mobile App 基礎功能完成
- ✅ 推播通知基礎設施就緒
- ✅ 生產環境部署配置完成
- ⚠️ 部分測試待修復（4 個測試失敗）
- ⚠️ 程式碼品質待優化（156 個 linting 問題）

---

## 🏗️ 技術棧

### 後端與 Web 平台 (`ceo-platform/`)
- **框架**: Next.js 15 (App Router) + TypeScript
- **資料庫**: PostgreSQL 16 + Prisma ORM
- **認證**: NextAuth.js v5 (Auth.js)
- **安全**: CSRF 保護、速率限制、輸入驗證
- **監控**: Sentry 錯誤追蹤
- **測試**: Vitest + Testing Library
- **樣式**: Tailwind CSS 4 + shadcn/ui
- **部署**: Docker + Nginx

### Mobile App (`ceo-monorepo/apps/mobile/`)
- **框架**: React Native (Expo SDK 54)
- **路由**: Expo Router (file-based routing)
- **樣式**: NativeWind (Tailwind CSS for React Native)
- **狀態管理**: Zustand + AsyncStorage
- **推播通知**: Expo Notifications
- **認證**: Apple Sign-In + Google OAuth

### 共用套件 (`ceo-monorepo/packages/`)
- `@ceo/shared`: 共用類型與工具函數
- `@ceo/auth`: 身份驗證 schemas 與配置
- `@ceo/api-client`: 統一 API 客戶端

### 開發工具
- **包管理器**: pnpm
- **Monorepo 管理**: Turborepo
- **程式碼品質**: ESLint + Prettier
- **Git Hooks**: Husky + lint-staged
- **CI/CD**: GitHub Actions

---

## 🏗️ 系統架構

```
統購PHP/
├── ceo-platform/                    # 主要後端 + Web 平台
│   ├── src/
│   │   ├── app/                    # Next.js App Router
│   │   │   ├── api/               # API 端點 (41個路由)
│   │   │   ├── (shop)/            # 前台購物頁面
│   │   │   ├── admin/             # 後台管理頁面
│   │   │   └── (auth)/            # 認證頁面
│   │   ├── lib/                   # 業務邏輯庫
│   │   │   ├── push-notifications/ # 推播通知服務
│   │   │   ├── security/          # 安全庫
│   │   │   └── prisma.ts          # 資料庫客戶端
│   │   └── __tests__/             # 測試檔案
│   ├── prisma/                    # 資料庫 Schema 與遷移
│   ├── public/                    # 靜態資源
│   └── docs/                      # 專案文檔
│
├── ceo-monorepo/                  # Monorepo (Mobile + 共用套件)
│   ├── apps/
│   │   └── mobile/               # React Native Mobile App
│   │       ├── app/              # Expo Router 頁面
│   │       ├── src/              # 源碼
│   │       │   ├── hooks/        # React Hooks
│   │       │   ├── stores/       # Zustand 狀態
│   │       │   ├── components/   # UI 元件
│   │       │   └── services/     # API 服務
│   │       └── package.json
│   └── packages/                  # 共用套件
│       ├── shared/               # 共用類型與工具
│       ├── auth/                 # 身份驗證套件
│       └── api-client/           # API 客戶端套件
│
└── docs/                         # 專案計劃與文檔
    ├── plans/                    # 開發計劃
    └── deployment/               # 部署指南
```

---

## 🚀 快速開始

### 1. 環境需求
- Node.js 20+
- PostgreSQL 16+
- pnpm 8+
- Docker (可選，用於容器化部署)
- Expo CLI (用於 Mobile 開發)

### 2. 後端開發環境設定

#### 2.1 複製專案與安裝依賴
```bash
# 克隆專案
git clone <repository-url>
cd 統購PHP/ceo-platform

# 安裝依賴
pnpm install

# 設定環境變數
cp .env.local.example .env.local
# 編輯 .env.local 設定資料庫連線與其他配置
```

#### 2.2 資料庫設定
```bash
# 啟動 PostgreSQL (使用 Docker)
docker compose up -d postgres

# 執行資料庫遷移
pnpm db:push

# 載入種子資料
pnpm db:seed
```

#### 2.3 啟動開發伺服器
```bash
# 啟動 Next.js 開發伺服器
pnpm dev

# 開啟瀏覽器訪問
# Web 前台: http://localhost:3000
# 後台管理: http://localhost:3000/admin (使用管理員帳號)
```

#### 2.4 測試帳號
- **管理員**: 統一編號 `12345678` / 密碼 `admin123`
- **一般會員**: 統一編號 `87654321` / 密碼 `user123`

### 3. Mobile App 開發環境設定

#### 3.1 安裝 Mobile 專案依賴
```bash
cd ceo-monorepo

# 安裝所有工作區依賴
pnpm install

# 進入 mobile app 目錄
cd apps/mobile

# 安裝 iOS 依賴 (macOS)
npx expo install
```

#### 3.2 啟動 Mobile 開發伺服器
```bash
# 啟動 Expo 開發伺服器
npx expo start

# 選擇執行平台
# - i: iOS 模擬器
# - a: Android 模擬器
# - w: Web 瀏覽器
```

#### 3.3 實體裝置測試
1. 安裝 Expo Go App (iOS/Android)
2. 掃描 QR Code 連接開發伺服器
3. 測試完整購物流程

---

## 📦 生產環境部署

### 1. Docker 容器化部署 (推薦)

#### 1.1 建置 Docker 映像
```bash
cd ceo-platform

# 建置映像
docker build -t ceo-platform:latest .

# 使用 Docker Compose 啟動所有服務
docker compose up -d
```

#### 1.2 環境變數配置
建立 `.env.production` 檔案：
```bash
# 資料庫
DATABASE_URL=postgresql://user:password@postgres:5432/ceo_platform

# NextAuth
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret-key

# 推播通知
EXPO_ACCESS_TOKEN=your-expo-access-token

# 其他配置...
```

#### 1.3 Nginx 配置
專案包含完整的 Nginx 配置：
```bash
# 位置: ceo-platform/nginx/
# - nginx.conf: 主配置
# - conf.d/ceo-platform.conf: 站點配置
```

### 2. 傳統伺服器部署

#### 2.1 手動部署腳本
```bash
cd ceo-platform/scripts

# 執行完整部署腳本
./deploy.sh

# 或逐步執行
./backup.sh          # 資料庫備份
./test-config.sh     # 配置驗證
```

#### 2.2 系統服務配置
使用 systemd 管理服務：
```bash
# 服務檔案: docs/deployment/ceo-platform.service
sudo cp docs/deployment/ceo-platform.service /etc/systemd/system/
sudo systemctl enable ceo-platform
sudo systemctl start ceo-platform
```

### 3. 監控與維護

#### 3.1 健康檢查
API 端點：`GET /api/health`
```json
{
  "status": "healthy",
  "timestamp": "2026-02-17T12:00:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "sentry": "initialized"
  }
}
```

#### 3.2 日誌管理
- 應用日誌：`/var/log/ceo-platform/app.log`
- 存取日誌：Nginx 日誌
- 錯誤追蹤：Sentry 整合

#### 3.3 定期備份
```bash
# 使用內建備份腳本
cd ceo-platform/scripts
./backup.sh

# 設定定時任務 (crontab)
0 2 * * * /path/to/ceo-platform/scripts/backup.sh
```

---

## 🔧 API 文檔

### 認證 API
| 端點 | 方法 | 說明 | 權限 |
|------|------|------|------|
| `/api/auth/login` | POST | 用戶登入 | 公開 |
| `/api/auth/register` | POST | 用戶註冊 | 公開 |
| `/api/auth/refresh` | POST | 刷新 JWT Token | 公開 |
| `/api/user/profile` | GET | 取得用戶資料 | 需登入 |

### 商品 API
| 端點 | 方法 | 說明 | 參數 |
|------|------|------|------|
| `/api/products` | GET | 商品列表 | `page`, `limit`, `search`, `categoryId` |
| `/api/products/[id]` | GET | 商品詳情 | `id` |
| `/api/products/featured` | GET | 熱門商品 | 無 |

### 購物車 API
| 端點 | 方法 | 說明 | 權限 |
|------|------|------|------|
| `/api/cart` | GET | 取得購物車 | 需登入 |
| `/api/cart` | POST | 加入購物車 | 需登入 |
| `/api/cart/[id]` | PATCH | 更新數量 | 需登入 |
| `/api/cart/[id]` | DELETE | 移除商品 | 需登入 |
| `/api/cart` | DELETE | 清空購物車 | 需登入 |

### 訂單 API
| 端點 | 方法 | 說明 | 權限 |
|------|------|------|------|
| `/api/orders` | GET | 訂單列表 | 需登入 |
| `/api/orders` | POST | 建立訂單 | 需登入 |
| `/api/orders/[id]` | GET | 訂單詳情 | 需登入 |
| `/api/orders/[id]` | PATCH | 取消訂單 | 需登入 |

### 推播通知 API
| 端點 | 方法 | 說明 | 權限 |
|------|------|------|------|
| `/api/notifications/tokens` | POST | 註冊裝置令牌 | 需登入 |
| `/api/notifications/tokens/[id]` | DELETE | 刪除裝置令牌 | 需登入 |
| `/api/notifications/send` | POST | 發送通知 (管理員) | 管理員 |

### 管理員 API (需管理員權限)
- `/api/admin/products` - 商品管理
- `/api/admin/orders` - 訂單管理
- `/api/admin/users` - 會員管理
- `/api/admin/categories` - 分類管理
- `/api/admin/faqs` - FAQ 管理
- `/api/admin/contact-messages` - 聯絡訊息管理

---

## 📱 Mobile App 建置

### 1. 開發建置
```bash
# 開發模式
npx expo start

# 預建置 (檢查原生依賴)
npx expo prebuild

# 清除快取
npx expo start --clear
```

### 2. 生產建置

#### 2.1 iOS 建置
```bash
# 建立 iOS 原生專案
npx expo prebuild --platform ios

# 使用 Xcode 建置
cd ios
pod install
open CEO團購電商平台.xcworkspace
```

#### 2.2 Android 建置
```bash
# 建立 Android 原生專案
npx expo prebuild --platform android

# 使用 Android Studio 建置
# 或使用 Gradle
cd android
./gradlew assembleRelease
```

### 3. App Store 上架準備

#### 3.1 iOS (App Store)
1. 建立 App Store Connect 專案
2. 設定 App 圖示與螢幕截圖
3. 配置推播通知憑證 (APNs)
4. 提交 TestFlight 測試
5. 提交 App Store 審核

#### 3.2 Android (Google Play)
1. 建立 Google Play Console 專案
2. 設定 App 簽署金鑰
3. 配置 Firebase 專案 (FCM)
4. 提交內部測試
5. 發布正式版

### 4. 推播通知設定

#### 4.1 Expo 推播通知
1. 建立 Expo 帳號與專案
2. 取得 EXPO_ACCESS_TOKEN
3. 設定環境變數
4. 測試推播通知

#### 4.2 Firebase Cloud Messaging (Android)
1. 建立 Firebase 專案
2. 下載 `google-services.json`
3. 配置 Expo 專案使用 FCM
4. 測試 Android 推播

#### 4.3 Apple Push Notifications (iOS)
1. 啟用 Apple Developer 帳號
2. 建立 APNs 金鑰
3. 配置 Expo 專案使用 APNs
4. 測試 iOS 推播

---

## 🧪 測試

### 1. 單元測試
```bash
# 執行所有測試
cd ceo-platform
pnpm test

# 測試特定檔案
pnpm test -- src/__tests__/lib/push-notifications

# 測試覆蓋率報告
pnpm test:coverage
```

### 2. 端對端測試
```bash
# 使用 Playwright 測試
npx playwright test

# 測試特定功能
npx playwright test --grep "購物車流程"
```

### 3. 效能測試
```bash
# Lighthouse 測試
npm run lighthouse

# 負載測試 (使用 k6)
k6 run docs/load-testing/shopping-flow.js
```

### 4. API 測試
使用內建 API 測試工具：
```bash
# 測試所有 API 端點
cd ceo-platform
pnpm test:api

# 測試特定 API
pnpm test:api -- --testNamePattern "認證 API"
```

---

## 🔍 除錯與問題排除

### 常見問題

#### 1. 資料庫連線失敗
```bash
# 檢查 PostgreSQL 服務狀態
systemctl status postgresql

# 測試連線
psql "postgresql://ceo_admin:SecureDevPass_2026!@localhost:5432/ceo_platform"

# 檢查環境變數
echo $DATABASE_URL
```

#### 2. 推播通知無法發送
1. 檢查 EXPO_ACCESS_TOKEN 是否有效
2. 確認裝置令牌已正確註冊
3. 檢查 Expo 專案配置
4. 查看伺服器日誌錯誤訊息

#### 3. Mobile App 建置失敗
```bash
# 清除快取
npx expo start --clear

# 刪除 node_modules 重新安裝
rm -rf node_modules
pnpm install

# 重新預建置
npx expo prebuild --clean
```

#### 4. API 返回 500 錯誤
1. 檢查伺服器日誌
2. 確認資料庫遷移已執行
3. 驗證環境變數配置
4. 檢查 Prisma Client 連線

### 日誌位置
- **應用日誌**: `ceo-platform/logs/app.log`
- **Nginx 存取日誌**: `/var/log/nginx/access.log`
- **Nginx 錯誤日誌**: `/var/log/nginx/error.log`
- **資料庫日誌**: PostgreSQL 日誌

### 監控工具
- **Sentry**: 錯誤追蹤與效能監控
- **Prometheus + Grafana**: 系統指標監控
- **Logtail / Papertrail**: 日誌集中管理

---

## 📚 文件與資源

### 專案文件
- `claudePlanV2.md` - 完整開發計劃與時間表
- `progress.md` - 詳細開發日誌 (每日更新)
- `docs/push-notifications-setup.md` - 推播通知設定指南
- `DEPLOYMENT.md` - 生產環境部署指南
- `CHECKLIST.md` - 部署檢查清單

### 外部資源
- [Next.js 文件](https://nextjs.org/docs)
- [Expo 文件](https://docs.expo.dev/)
- [Prisma 文件](https://www.prisma.io/docs)
- [Tailwind CSS 文件](https://tailwindcss.com/docs)
- [React Native 文件](https://reactnative.dev/docs/getting-started)

### 開發工具
- **資料庫管理**: Prisma Studio (`pnpm db:studio`)
- **API 測試**: Postman 或 Insomnia
- **行動裝置測試**: Expo Go App
- **效能分析**: Chrome DevTools + React DevTools

---

## 👥 團隊協作指南

### 1. Git 工作流程
```bash
# 建立功能分支
git checkout -b feature/your-feature

# 提交更改
git add .
git commit -m "feat: 新增功能說明"

# 推送到遠端
git push -u origin feature/your-feature

# 建立 Pull Request
gh pr create --title "功能名稱" --body "功能說明"
```

### 2. 程式碼規範
- 使用 TypeScript 嚴格模式
- 遵循 ESLint 規則
- 使用 Prettier 自動格式化
- 撰寫單元測試與整合測試
- 更新相關文件

### 3. 提交訊息規範
```
feat: 新增功能
fix: 修復錯誤
docs: 文件更新
style: 程式碼格式調整
refactor: 重構程式碼
test: 測試相關
chore: 建置流程或工具調整
```

### 4. 審查流程
1. 建立 Pull Request
2. 等待 CI/CD 測試通過
3. 請求至少一位審查者
4. 根據反饋修改程式碼
5. 合併到主分支

---

## 📞 支援與聯絡

### 技術問題
1. 查閱本文件與專案文件
2. 檢查 GitHub Issues 是否有類似問題
3. 查閱相關技術文件
4. 聯絡開發團隊

### 緊急問題
- **伺服器當機**: 檢查系統日誌，重啟服務
- **資料庫問題**: 檢查連線狀態，執行備份還原
- **安全漏洞**: 立即修補，更新依賴套件

### 聯絡資訊
- **專案負責人**: [聯絡資訊]
- **技術支援**: [聯絡資訊]
- **文件維護**: [聯絡資訊]

---

## 🎯 下一步發展

### 短期目標 (1-2 個月)
- [ ] 修復剩餘 4 個測試失敗
- [ ] 處理 156 個 linting 錯誤
- [ ] 完成 App 圖示資源生成
- [ ] 部署到 staging 環境進行負載測試
- [ ] 優化效能與使用者體驗

### 中期目標 (3-6 個月)
- [ ] 實作進階分析報表
- [ ] 增加多語言支援
- [ ] 擴充支付閘道 (信用卡、第三方支付)
- [ ] 實作推薦系統
- [ ] 建立供應商入口網站

### 長期目標 (6-12 個月)
- [ ] 微服務架構遷移 (使用 Hono)
- [ ] 實時聊天支援
- [ ] AI 客服機器人
- [ ] 區塊鏈訂單追蹤
- [ ] 國際市場擴展

---

## 📄 授權與版權

本專案採用專有授權，版權所有 © 2026 CEO 團購電商平台。

**免責聲明**: 本文件僅供內部使用，未經許可不得對外公開或散佈。

---

_最後更新: 2026-02-17_
_文件版本: v2.0_
_專案狀態: 生產就緒 (90% 完成)_