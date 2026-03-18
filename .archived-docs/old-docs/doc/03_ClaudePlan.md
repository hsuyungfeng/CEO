# CEO 團購電商平台 v2 - 專案審查與改善計劃

> 審查日期：2026-02-11
> 審查工具：Claude Code (Opus 4.6)
> 審查範圍：專案結構、UI 品質、API 後端、行動應用、安全性

---

## 目錄

1. [專案概覽](#1-專案概覽)
2. [安全性問題（緊急）](#2-安全性問題緊急)
3. [UI 前端問題](#3-ui-前端問題)
4. [API 後端問題](#4-api-後端問題)
5. [行動應用問題](#5-行動應用問題)
6. [架構與技術債](#6-架構與技術債)
7. [改善計劃（依優先級排序）](#7-改善計劃依優先級排序)
8. [執行時間表](#8-執行時間表)

---

## 1. 專案概覽

### 技術堆疊
| 層級 | 技術 |
|------|------|
| 前端 Web | Next.js 15 (App Router) + React 19 + shadcn/ui + Tailwind CSS 4 |
| 行動端 | React Native (Expo SDK 54) + NativeWind + Expo Router |
| 後端 API | Next.js API Routes + Prisma 7+ |
| 資料庫 | PostgreSQL 16 |
| 認證 | NextAuth.js v5 (Credentials + Google OAuth + Apple Sign-In) |
| 狀態管理 | Zustand (Web + Mobile) |
| 部署 | Docker + Nginx + GitHub Actions CI/CD |
| Monorepo | Turborepo 2.4.4 + pnpm workspaces |

### 檔案統計
| 目錄 | .tsx 檔案 | .ts 檔案 | 說明 |
|------|----------|---------|------|
| `ceo-platform/src/` | 68 | 47 | 主要開發目錄 |
| `web/src/` | 33 | 21 | 舊版前端（已棄用？） |
| `HTML/` | - | - | 699 個檔案、138 個 PHP（舊版系統） |
| `.worktrees/phase6/` | - | - | Turborepo monorepo 結構 |
| `.worktrees/email-auth/` | - | - | Email 認證功能分支 |

### 已完成階段
- Phase 0-5：Web 平台（完成）
- Phase 6：行動端 + Monorepo（大部分完成）
- Phase 7：App Store 上架（待進行）

---

## 2. 安全性問題（緊急）

### 🔴 嚴重等級：Critical

#### 2.1 資料庫密碼硬編碼
- **檔案**：`ceo-platform/src/lib/prisma.ts`
- **問題**：資料庫連線字串直接寫在程式碼中作為 fallback
  ```typescript
  const databaseUrl = process.env.DATABASE_URL ||
    'postgresql://ceo_admin:SecureDevPass_2026!@localhost:5432/ceo_platform'
  ```
- **風險**：密碼洩漏至版本控制、任何能存取原始碼的人都可以取得資料庫存取權限
- **修復**：移除 fallback 值，改為在缺少環境變數時拋出錯誤

#### 2.2 .env.local 已提交至 Git
- **檔案**：`ceo-platform/.env.local`
- **問題**：包含敏感憑證的環境變數檔案已被 commit
- **風險**：所有 Git 歷史記錄中都存在明文密碼
- **修復**：
  1. 從 Git 歷史中移除（`git filter-branch` 或 BFG Repo-Cleaner）
  2. 更新 `.gitignore` 加入 `.env*` 規則
  3. 輪換所有已洩漏的密碼和 API 金鑰

#### 2.3 行動端 .env 已提交
- **檔案**：`.worktrees/phase6/ceo-monorepo/apps/mobile/.env`
- **內容**：`EXPO_PUBLIC_API_URL=http://localhost:3000`
- **修復**：加入 `.gitignore`，使用 `.env.example` 作為範本

#### 2.4 .gitignore 不完整
- **現況**：僅 12 bytes，嚴重不足
- **修復**：擴充為完整的 Node.js / Next.js / React Native 忽略規則，至少包含：
  ```
  node_modules/
  .env*
  .env.local
  .next/
  dist/
  build/
  *.log
  .DS_Store
  coverage/
  ```

### 🟡 嚴重等級：High

#### 2.5 健康檢查 API Token 驗證未完成
- **檔案**：`ceo-platform/src/app/api/health/route.ts`（POST 端點）
- **問題**：Token 驗證邏輯只有註解「// 驗證token邏輯...」，未實際實作
- **風險**：任何人都能透過 POST 請求觸發健康檢查

#### 2.6 Middleware 備份檔案暴露認證繞過風險
- **檔案**：`ceo-platform/src/middleware.ts.backup`
- **問題**：包含「allow all paths to be accessible」的註解，若被誤用將繞過所有認證
- **修復**：刪除 `.backup` 檔案，或加入 `.gitignore`

---

## 3. UI 前端問題

### 🔴 嚴重：Mock 資料未替換為真實 API

#### 3.1 商品詳情頁使用假資料
- **檔案**：`ceo-platform/src/app/products/[id]/page.tsx`
- **問題**：第 12 行定義了 `mockProduct` 物件，整頁使用假資料渲染
  ```typescript
  const mockProduct = { id: 1, name: '醫療口罩', ... }
  ```
- **影響**：使用者無法看到真實商品資訊
- **修復**：串接 `/api/products/[id]` API，使用 `useSWR` 或 `fetch` 載入真實資料

#### 3.2 購物車計數硬編碼
- **檔案**：`ceo-platform/src/components/layout/header.tsx`（第 13-14 行）
- **問題**：`cartItemCount` 為固定值，非從 API 或 Store 取得
- **修復**：接入 Zustand cart store 或 API 取得真實數量

#### 3.3 管理後台儀表板硬編碼百分比
- **檔案**：`ceo-platform/src/app/admin/page.tsx`
- **問題**：成長百分比為硬編碼值（+12%、+18%、+5%、+8%）
- **修復**：從 API 計算真實的週期對比成長率

### 🟡 UX 問題

#### 3.4 使用 alert() 而非 Toast
- **檔案**：`ceo-platform/src/app/products/[id]/page.tsx`（第 195 行）
- **問題**：加入購物車成功後使用 `alert()` 提示
- **修復**：改用 shadcn/ui 的 `toast` 元件，提供更好的使用者體驗

#### 3.5 登入頁面重導路徑錯誤
- **檔案**：`ceo-platform/src/app/login/page.tsx`
- **問題**：登入成功後重導向 `/(shop)` 路徑不正確
- **修復**：確認正確的路由群組路徑

#### 3.6 Footer 連結全部指向 #
- **檔案**：`ceo-platform/src/components/layout/footer.tsx`
- **問題**：所有底部連結的 `href` 都是 `#`，年份硬編碼為 2026
- **修復**：
  1. 連結指向真實頁面或移除不需要的連結
  2. 年份改為 `new Date().getFullYear()`

### 🟢 品質改善

#### 3.7 缺少無障礙標籤 (Accessibility)
- **影響範圍**：Header 圖示按鈕、表單元素、互動元素
- **修復**：加入 `aria-label`、`aria-describedby` 等屬性

#### 3.8 未使用 Next.js Image 元件
- **問題**：部分圖片使用原生 `<img>` 標籤
- **修復**：改用 `next/image` 以獲得自動最佳化（lazy loading、格式轉換、尺寸調整）

#### 3.9 缺少 Error Boundary
- **問題**：頁面錯誤會導致整個應用白屏
- **修復**：在關鍵頁面區段加入 React Error Boundary，搭配 Next.js `error.tsx`

#### 3.10 無國際化 (i18n) 支援
- **現況**：所有中文字串直接硬編碼在元件中
- **建議**：若未來需要多語言支援，考慮使用 `next-intl` 或 `react-i18next`
- **優先級**：低（目前為純中文平台，但預留擴充性）

---

## 4. API 後端問題

### 🟡 程式碼品質

#### 4.1 訂單編號產生可能有競態條件 (Race Condition)
- **檔案**：`ceo-platform/src/app/api/orders/route.ts`
- **問題**：使用 `count` 基底產生訂單編號，在高並發情況下可能重複
- **修復**：改用資料庫 sequence 或 UUID，或在 transaction 中使用 `SELECT ... FOR UPDATE`

#### 4.2 使用 `any` 型別
- **檔案**：`ceo-platform/src/app/api/orders/route.ts`
- **問題**：`const where: any = {}` 失去型別安全
- **修復**：使用 Prisma 產生的型別 `Prisma.OrderWhereInput`

### 🟢 正面發現

- Zod 驗證：API 輸入驗證完善，使用 Zod schema
- 錯誤處理：使用 try/catch 且回傳適當的 HTTP 狀態碼
- 日誌：使用 `console.error` 而非 `console.log`（但建議改用正式 logger）
- ORM：全程使用 Prisma，未發現 raw SQL 注入風險
- 無 `dangerouslySetInnerHTML` 使用（排除 node_modules）
- 無 `eval()` 使用

---

## 5. 行動應用問題

### 🟡 Mock 資料問題

#### 5.1 個人資料頁使用假資料
- **檔案**：`.worktrees/phase6/ceo-monorepo/apps/mobile/app/(tabs)/profile.tsx`
- **問題**：硬編碼使用者名稱「張小明」及其他假資料
- **修復**：串接 auth store 的真實使用者資料

#### 5.2 Store 未連接真實 API
- **檔案**：`.worktrees/phase6/ceo-monorepo/apps/mobile/stores/`
- **問題**：Zustand stores（cart、auth、preferences、products）部分仍使用本地假資料
- **修復**：整合 `@ceo/api-client` 套件，串接後端 API

### 🟢 正面發現

- 使用 Expo SDK 54 + React Native 0.81.5（版本新穎）
- NativeWind 樣式管理良好
- Zustand 狀態管理架構合理
- Expo Router 檔案式路由結構清晰

### 🟡 程式碼品質

#### 5.3 開發用 console.log 殘留
- **範圍**：hooks 目錄中的多個檔案
- **修復**：移除或替換為正式 logging 方案（如 Sentry）

---

## 6. 架構與技術債

### 6.1 多重程式碼副本
| 目錄 | 角色 | 狀態 |
|------|------|------|
| `ceo-platform/` | 主要開發目錄 | 活躍開發中 |
| `web/` | 舊版前端 | 似已棄用，但仍存在 |
| `HTML/` | 舊版 PHP 系統 | 遷移參考，699 檔案 |
| `.worktrees/phase6/` | Monorepo 分支 | 包含 mobile + shared packages |
| `.worktrees/email-auth/` | 功能分支 | Email 認證開發中 |

**問題**：不清楚哪個是「真正的 source of truth」，`ceo-platform/` 與 `.worktrees/phase6/ceo-monorepo/apps/web` 可能存在程式碼分歧。

**建議**：
1. 確定主開發目錄，合併 worktree 分支
2. 清理或歸檔不再使用的目錄（`web/`、`HTML/`）
3. 文件化目錄用途與開發流程

### 6.2 缺少正式日誌系統
- **現況**：使用 `console.error` / `console.log`
- **建議**：導入 `pino` 或 `winston`，設定日誌等級與結構化日誌

### 6.3 缺少測試
- **現況**：未發現測試檔案（`*.test.ts`、`*.spec.ts`）
- **建議**：
  1. 單元測試：Vitest（API routes、工具函數）
  2. 元件測試：React Testing Library
  3. E2E 測試：Playwright（關鍵使用者流程）
  4. 行動端測試：Detox 或 Maestro

### 6.4 缺少 CI/CD 品質把關
- **建議**：
  1. Pre-commit hooks（husky + lint-staged）
  2. GitHub Actions：lint、type check、test
  3. 自動化安全掃描（Snyk 或 GitHub Dependabot）

---

## 7. 改善計劃（依優先級排序）

### 第一優先：安全修復（立即執行）

| # | 任務 | 預計影響 | 複雜度 |
|---|------|---------|--------|
| S1 | 從 `prisma.ts` 移除硬編碼密碼，改為 env 缺失時拋出錯誤 | Critical | 低 |
| S2 | 使用 BFG 從 Git 歷史清除 `.env.local` | Critical | 中 |
| S3 | 輪換所有已洩漏的密碼（DB、OAuth secrets） | Critical | 中 |
| S4 | 更新 `.gitignore` 為完整版本 | High | 低 |
| S5 | 完成 health API 的 token 驗證 | High | 低 |
| S6 | 刪除 `middleware.ts.backup` | High | 低 |
| S7 | 從 Git 移除 mobile `.env` 檔案 | Medium | 低 |

### 第二優先：核心功能修復

| # | 任務 | 預計影響 | 複雜度 |
|---|------|---------|--------|
| F1 | 商品詳情頁串接真實 API（移除 mockProduct） | Critical | 中 |
| F2 | Header 購物車計數串接 Zustand store | High | 低 |
| F3 | 將 `alert()` 替換為 Toast 元件 | Medium | 低 |
| F4 | 修正登入頁面重導路徑 | Medium | 低 |
| F5 | 管理後台儀表板百分比改為真實計算 | Medium | 中 |
| F6 | Footer 連結修復 | Low | 低 |

### 第三優先：行動端完善

| # | 任務 | 預計影響 | 複雜度 |
|---|------|---------|--------|
| M1 | Profile 頁面串接真實使用者資料 | High | 中 |
| M2 | 所有 Zustand stores 串接後端 API | High | 高 |
| M3 | 移除開發用 console.log | Low | 低 |

### 第四優先：程式碼品質提升

| # | 任務 | 預計影響 | 複雜度 |
|---|------|---------|--------|
| Q1 | 訂單編號改用 DB sequence 避免競態條件 | High | 中 |
| Q2 | 移除 `any` 型別，使用 Prisma 產生的型別 | Medium | 低 |
| Q3 | 加入 React Error Boundary + error.tsx | Medium | 中 |
| Q4 | 圖片改用 `next/image` 元件 | Medium | 低 |
| Q5 | 加入基礎無障礙標籤 | Medium | 中 |
| Q6 | 導入正式 logger（pino） | Low | 中 |

### 第五優先：架構改善

| # | 任務 | 預計影響 | 複雜度 |
|---|------|---------|--------|
| A1 | 合併 worktree 分支，確定主開發目錄 | High | 高 |
| A2 | 清理/歸檔舊版目錄（web/、HTML/） | Medium | 低 |
| A3 | 建立 Vitest 測試框架 + 核心 API 測試 | High | 高 |
| A4 | 設定 husky + lint-staged pre-commit hooks | Medium | 低 |
| A5 | 設定 GitHub Actions CI pipeline | Medium | 中 |
| A6 | 導入 Dependabot 安全掃描 | Medium | 低 |

---

## 8. 執行時間表

### Week 1：安全修復 + 緊急功能
- [S1-S7] 所有安全修復
- [F1] 商品詳情頁 API 串接
- [F2] 購物車計數修復

### Week 2：前端功能完善
- [F3-F6] 所有前端功能修復
- [Q3] Error Boundary 建立
- [Q4] next/image 導入

### Week 3：行動端 + 品質
- [M1-M3] 行動端修復
- [Q1-Q2] 後端程式碼品質
- [Q5-Q6] 無障礙 + Logger

### Week 4：架構整理
- [A1-A2] 目錄整理與合併
- [A3] 測試框架建立
- [A4-A6] CI/CD 設定

---

## 附錄：審查方法

本次審查使用 5 個平行探索代理進行：

1. **專案結構探索**：掃描所有目錄、檔案類型、計數統計
2. **API 後端審查**：檢查路由、驗證、錯誤處理、SQL 注入風險
3. **UI 元件審查**：檢查前端頁面、mock 資料、UX 問題
4. **行動應用審查**：檢查 Expo 設定、Store、元件品質
5. **安全性審查**：檢查敏感資訊洩漏、認證繞過、XSS/注入風險

---

*此文件由 Claude Code (Opus 4.6) 自動產生，基於原始碼靜態分析。建議搭配人工審查確認優先級與執行細節。*
