# CEO 團購電商平台

一個專為醫療機構打造的專業團購電商平台，採用現代化的技術棧構建，提供完整的購物、訂單管理和後台管理功能。

## 🚀 技術棧

- **前端框架**: Next.js 15 (App Router)
- **UI 組件**: shadcn/ui + Tailwind CSS 4
- **資料庫**: PostgreSQL 16 + Prisma 7
- **認證**: NextAuth.js v5
- **測試**: Vitest
- **語言**: TypeScript

## 📋 功能特色

### 前台功能
- ✅ 商品瀏覽與搜尋
- ✅ 階梯定價顯示
- ✅ 購物車管理
- ✅ 結帳流程
- ✅ 訂單查詢與管理

### 後台管理
- ✅ 商品管理 (CRUD)
- ✅ 訂單管理
- ✅ 會員管理
- ✅ 分類管理 (樹狀結構)
- ✅ 廠商管理
- ✅ FAQ 管理

### 技術特色
- ✅ 響應式設計
- ✅ 品牌色系統 (OKLCH)
- ✅ 中文字體支援 (Noto Sans TC)
- ✅ 錯誤邊界保護
- ✅ Toast 通知系統
- ✅ CSRF 防護
- ✅ 輸入驗證

## 🛠️ 安裝與設定

### 環境需求

- Node.js 20+
- PostgreSQL 16
- pnpm (推薦)

### 安裝步驟

1. **克隆專案**
```bash
git clone <repository-url>
cd ceo-platform
```

2. **安裝依賴**
```bash
pnpm install
```

3. **設定環境變數**
```bash
cp .env.example .env.local
```

編輯 `.env.local` 並填入必要的環境變數:
```env
DATABASE_URL="postgresql://ceo_admin:your_password@localhost:5432/ceo_platform"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
```

4. **初始化資料庫**
```bash
pnpm db:push
pnpm db:seed
```

5. **啟動開發伺服器**
```bash
pnpm dev
```

開啟 [http://localhost:3000](http://localhost:3000) 查看應用程式。

## 📁 專案結構

```
ceo-platform/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── api/          # API 路由
│   │   ├── admin/        # 後台管理頁面
│   │   ├── products/     # 商品頁面
│   │   ├── orders/       # 訂單頁面
│   │   └── ...
│   ├── components/       # React 組件
│   │   ├── ui/           # UI 組件 (shadcn)
│   │   └── admin/        # 後台組件
│   ├── lib/              # 工具函數
│   └── types/            # TypeScript 類型定義
├── prisma/               # Prisma Schema
├── public/               # 靜態資源
└── docs/                 # 文檔
```

## 🧪 測試

```bash
# 運行所有測試
pnpm test

# 運行測試並生成覆蓋率報告
pnpm test:coverage
```

### 測試覆蓋率

- **測試數量**: 216 個測試
- **通過率**: 100%
- **覆蓋範圍**: API 端點、組件、安全功能

## 🚀 部署

### Docker 部署

```bash
# 構建映像檔
docker build -t ceo-platform .

# 運行容器
docker run -p 3000:3000 ceo-platform
```

### 手動部署

```bash
# 構建生產版本
pnpm build

# 啟動生產伺服器
pnpm start
```

詳細部署指南請參考 [DEPLOYMENT.md](./DEPLOYMENT.md)。

## 📊 專案狀態

### 完成度

| 模組 | 狀態 | 測試 |
|------|------|------|
| 前台功能 | ✅ 完成 | 100% |
| 後台管理 | ✅ 完成 | 100% |
| API 端點 | ✅ 完成 | 100% |
| 安全功能 | ✅ 完成 | 100% |
| 測試覆蓋 | ✅ 完成 | 216/216 |

### 代碼品質

- **Linting**: 0 錯誤, 128 警告
- **TypeScript**: 0 錯誤
- **建置時間**: 4-5 秒

## 📝 文檔

- [部署指南](./DEPLOYMENT.md)
- [API 文檔](./docs/api.md)
- [Push 通知設定](./docs/push-notifications-setup.md)

## 🔐 預設帳號

開發環境預設帳號 (種子資料):

**管理員**
- 統一編號: `12345678`
- 密碼: `admin123`

**會員**
- 統一編號: `87654321`
- 密碼: `user123`

## 📄 授權

此專案為私人專案，未經授權不得使用。

---

**開發團隊**: 一企實業有限公司  
**最後更新**: 2026-02-18
