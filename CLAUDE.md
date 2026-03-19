# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> 所有文件以繁體中文為主。

---

## 專案概覽

CEO 是一個 B2B 多供應商批發電商平台，採用 pnpm monorepo 結構。主要應用位於 `ceo-monorepo/apps/web`。

**三種使用者角色：**
- `ADMIN` — 平台管理員（供應商審核、訂單確認、團購管理）
- `SUPPLIER` — 供應商（商品管理、訂單查看、報表）
- `MEMBER` — 採購會員（下單、團購、推薦系統）

---

## 常用指令

所有指令需在 `ceo-monorepo/apps/web/` 目錄下執行：

```bash
# 開發伺服器（含 WebSocket）
pnpm dev

# 僅啟動 Next.js（不含 WebSocket）
pnpm dev:next

# Build 驗證（提交前務必執行）
pnpm build

# TypeScript 型別檢查
pnpm typecheck

# Lint
pnpm lint

# 單元測試
pnpm test
pnpm test:watch              # 監看模式

# 整合測試（需要測試資料庫）
pnpm test:db:start           # 啟動測試用 Docker DB
pnpm test:integration

# 資料庫操作
pnpm db:migrate              # 執行 migration
pnpm db:push                 # 直接推送 schema（開發用）
pnpm db:seed                 # 填入初始資料
pnpm db:studio               # Prisma Studio 視覺化介面
pnpm db:generate             # 重新產生 Prisma Client
```

---

## 架構說明

### 目錄結構

```
ceo-monorepo/apps/web/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/             # 94 個 API 端點（Route Handlers）
│   │   ├── admin/           # 管理員後台頁面
│   │   ├── supplier/        # 供應商後台頁面
│   │   └── (auth)/          # 登入/註冊等公開頁面
│   ├── components/
│   │   ├── admin/           # 管理員專用元件
│   │   ├── supplier/        # 供應商專用元件
│   │   ├── ui/              # shadcn/ui 基礎元件
│   │   └── layout/          # Header、Sidebar 等佈局元件
│   └── lib/
│       ├── prisma.ts        # Prisma Client 單例
│       ├── auth.ts          # Auth helper（取得當前使用者）
│       ├── audit-logger.ts  # 審計日誌（敏感操作必須記錄）
│       ├── cron-auth.ts     # Cron 任務授權驗證中介層
│       ├── csrf-middleware.ts
│       └── services/        # 業務邏輯服務層
├── prisma/
│   └── schema.prisma        # 44 個資料模型
└── server.ts                # WebSocket 伺服器入口
```

### 認證系統

使用 **NextAuth v5 (beta)**，設定於 `src/auth.ts`：
- 策略：JWT session（30天）
- 登入識別：**統一編號（8位數字）** + 密碼，非 email
- OAuth：Google、Apple（新用戶需完成兩階段企業資料註冊）
- **注意：`TEST_MODE = true` 目前啟用**，會繞過所有密碼驗證，直接以 ADMIN 身份登入
- Server-side 使用 `auth()` 取得 session；client-side 使用 `useSession()`

### API 模式

所有 API Route Handler 使用 Zod 驗證輸入：
- `GET` 參數用 `z.object({...}).safeParse(searchParams)`
- 狀態 enum 值必須與 `prisma/schema.prisma` 中的定義完全一致
- Cron 路由必須使用 `verifyCronAuth(request)` 進行授權驗證
- 敏感操作（審核、暫停、金融操作）必須呼叫 `auditLogger` 記錄

### 供應商狀態 Enum（常見錯誤來源）

```typescript
// 正確值（來自 schema.prisma）
SupplierStatus: PENDING | ACTIVE | SUSPENDED | REJECTED

// 錯誤用法（已知 bug 根因）
// ❌ ACTIVE | INACTIVE  ← 這是舊的錯誤格式
```

### 前端元件慣例

- UI 元件：使用 **shadcn/ui**（`src/components/ui/`）
- 資料列表頁面結構：`page.tsx` + `*-table.tsx` + `*-dialog.tsx`
- Client component 的 API 呼叫：`useEffect + useState + fetch`，包含 loading/error 狀態
- 日期顯示使用 `zh-TW` locale

### 環境變數

開發環境複製 `.env.example` 為 `.env.local`，必填項目：
- `DATABASE_URL` — PostgreSQL 連線字串
- `NEXTAUTH_SECRET` — Session 加密金鑰
- `CRON_SECRET` — Cron 任務授權 Token
- `NEXTAUTH_URL` — 必須設為 `http://localhost:3000`

---

## 已知問題與注意事項

- **Server-side `auth()` 返回 null 問題**：部分頁面（如 `/recommendations`）的 server-side session 取得異常，目前 `TEST_MODE=true` 為暫時緩解措施
- **Mobile app build**：`pnpm build` 從 monorepo 根目錄執行可能因 mobile 端相依缺失而失敗，請改在 `ceo-monorepo/apps/web/` 目錄執行
- TypeScript 剩餘少數 `any` 型別（約 15-20 個）集中於 `sentry-*`、`redis-rate-limiter`、`prisma.$use`、`global-rate-limiter` 等框架整合層，屬難以消除的技術限制
- CSRF 全域中介層已實裝於 `src/middleware.ts`（Phase 10.2 ✅ 完成）
- Cron 游標分頁已透過 `PrismaCursorPagination` 實裝（Phase 10.2 ✅ 完成）
