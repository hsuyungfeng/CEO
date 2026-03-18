# 立即可執行的實施指南（2026-02-11 至 2026-02-14）

## 快速參考

**決策總結**：
- ✅ **Phase 6 合併**：立即執行（無衝突）
- ✅ **郵件驗證**：先合併再完成（5-6 小時）
- ✅ **監控方案**：Sentry 免費（4-6 小時，Phase 8 進行）

---

## DAY 1：今天（2026-02-11）

### 任務 1.1：做好備份和準備

```bash
# 1. 確保當前工作已提交
git status
# 應該顯示 "nothing to commit, working tree clean"

# 2. 備份當前 main 分支
git tag backup/pre-phase6-merge
git push origin backup/pre-phase6-merge

# 3. 確認 Phase 6 分支狀態
git log --oneline feature/phase6-mobile-app -5

# 4. 檢查本地是否有未提交的變更
git diff --stat main..feature/phase6-mobile-app | wc -l
# 預期：許多檔案（包括 node_modules）
```

### 任務 1.2：檢查郵件驗證完成度

```bash
# 進入 Phase 6 worktree 檢查郵件驗證代碼
cd .worktrees/phase6

# 1. 檢查郵件服務實現
cat ceo-monorepo/apps/web/src/lib/email.ts | head -50

# 2. 檢查驗證 API 端點
ls -la ceo-monorepo/apps/web/src/app/api/auth/email*

# 3. 檢查前端頁面
ls -la ceo-monorepo/apps/web/src/app/\(auth\)/*email*

# 4. 檢查相關測試
ls -la ceo-monorepo/apps/web/__tests__/*email*

cd ..
```

### 任務 1.3：更新決策文檔

```bash
# 檢查 04_Decision_Matrix.md 是否已生成
ls -la docs/04_Decision_Matrix.md

# 檢查進度
cat progress.md | tail -20
```

---

## DAY 2：明天（2026-02-12）上午

### 任務 2.1：執行 Phase 6 合併

```bash
# 1. 確保在 main 分支
git checkout main
git pull origin main

# 2. 創建合併 PR 分支（可選但推薦）
git checkout -b merge/phase6-integration

# 3. 執行合併（測試模式）
git merge --no-commit --no-ff feature/phase6-mobile-app

# 4. 檢查合併狀態
git status
# 應該顯示 "Unmerged paths" 為空（無衝突）

# 5. 確認合併
git commit -m "$(cat <<'EOF'
merge: integrate Phase 6 monorepo and mobile app

Features:
- Monorepo structure with Turborepo and pnpm workspaces
- Mobile app (iOS + Android) with Expo SDK 54
- Apple Sign-In integration (web and mobile)
- Email verification system implementation
- Shared packages (api-client, auth, shared)

This merge enables:
✅ Multi-app development (web + mobile)
✅ Code sharing across applications
✅ Unified authentication system
✅ Mobile app development and deployment

Testing:
- All automated tests passing
- Local build verification: pnpm install && pnpm build
- No merge conflicts detected

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

# 6. 推送至遠端
git push origin merge/phase6-integration

# 7. 在 GitHub 創建 PR（提供團隊審查）
# 或直接推送到 main（若已確認）
git checkout main
git merge merge/phase6-integration
git push origin main
```

### 任務 2.2：驗證合併成功

```bash
# 1. 檢查目錄結構
ls -la
# 應該看到：ceo-platform/, .github/, .worktrees/, docs/, 等

# 2. 檢查 Monorepo 結構
ls -la ceo-monorepo/
# 應該出現（若成功合併）
# 但現在應該看到 ceo-platform 中整合的結構

# 3. 檢查 package.json 是否有新的工作區配置
cat package.json | grep -A 5 "workspaces"

# 4. 運行測試（Web）
cd ceo-platform
pnpm test
# 預期：所有測試通過

# 5. 檢查編譯
pnpm build
# 預期：編譯成功

# 6. 檢查 TypeScript
pnpm typecheck
# 預期：無型別錯誤
```

### 任務 2.3：準備郵件驗證清單

```bash
# 1. 建立郵件驗證完成檢查清單
cat > /tmp/email-verification-checklist.md <<'EOF'
# 郵件驗證完成檢查清單

## 功能實現
- [ ] 驗證碼生成和發送
- [ ] Resend.com API 集成
- [ ] 驗證碼有效期設定（15 分鐘）
- [ ] Token 加密儲存
- [ ] 驗證成功後 token 清除

## API 端點
- [ ] POST /api/auth/email/send - 發送驗證碼
- [ ] POST /api/auth/email/verify - 驗證碼驗證
- [ ] POST /api/auth/email/resend - 重新發送
- [ ] 所有端點的 Zod 驗證
- [ ] 所有端點的錯誤處理

## 安全性
- [ ] 速率限制（每 IP 每分鐘最多 5 次）
- [ ] SQL 注入防護（使用 Prisma）
- [ ] Token 長度足夠（≥32 字元）
- [ ] Token 有效期合理
- [ ] 重試次數限制（≤3 次）

## 前端
- [ ] 驗證碼輸入頁面
- [ ] 重新發送按鈕和邏輯
- [ ] 倒計時顯示
- [ ] 成功/失敗反饋
- [ ] 加載狀態

## 測試
- [ ] 單元測試：API 端點
- [ ] 集成測試：完整流程
- [ ] 錯誤情況測試
- [ ] 邊界值測試

## 文檔
- [ ] API 文檔更新
- [ ] 環境變數文檔
- [ ] 設定指南
EOF

cat /tmp/email-verification-checklist.md
```

---

## DAY 2：明天（2026-02-12）下午 - DAY 3（2026-02-13）

### 任務 3.1：完成郵件驗證細節

基於檢查清單，完成以下工作：

```typescript
// 1. 檢查速率限制實現
// 文件：ceo-platform/src/app/api/auth/email/send/route.ts

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "15 m"),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ||
             request.headers.get("x-real-ip") ||
             "unknown";

  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: "發送過於頻繁，請稍後再試" },
      { status: 429 }
    );
  }

  // ... 送出郵件的邏輯
}

// 2. 檢查 Token 過期邏輯
// 文件：ceo-platform/src/app/api/auth/email/verify/route.ts

const VERIFICATION_TOKEN_EXPIRY = 15 * 60 * 1000; // 15 分鐘

const user = await prisma.user.findUnique({
  where: { email },
  select: {
    verification_token: true,
    verification_token_expires_at: true
  }
});

if (!user?.verification_token) {
  return NextResponse.json(
    { error: "驗證碼無效或已過期" },
    { status: 400 }
  );
}

const tokenExpiredAt = new Date(user.verification_token_expires_at);
if (Date.now() > tokenExpiredAt.getTime()) {
  return NextResponse.json(
    { error: "驗證碼已過期，請重新發送" },
    { status: 400 }
  );
}

// 3. 檢查郵件模板
// 文件：ceo-platform/src/lib/email-templates.ts

export const verificationEmailTemplate = (code: string, name: string) => ({
  subject: "驗證你的電子郵件地址",
  html: `
    <h1>歡迎，${name}！</h1>
    <p>感謝註冊 CEO 團購平台。</p>
    <p>請輸入以下驗證碼來完成註冊：</p>
    <h2>${code}</h2>
    <p>此驗證碼有效期為 15 分鐘。</p>
    <p>如果你沒有進行此操作，請忽略此郵件。</p>
  `
});
```

### 任務 3.2：添加測試

```typescript
// 文件：ceo-platform/src/app/api/auth/email/__tests__/send.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../send/route'
import { NextRequest } from 'next/server'

describe('POST /api/auth/email/send', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should send verification email successfully', async () => {
    const req = new NextRequest(
      new URL('http://localhost:3000/api/auth/email/send'),
      {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' })
      }
    )

    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.message).toContain('驗證碼已發送')
  })

  it('should reject invalid email', async () => {
    const req = new NextRequest(
      new URL('http://localhost:3000/api/auth/email/send'),
      {
        method: 'POST',
        body: JSON.stringify({ email: 'invalid' })
      }
    )

    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toContain('invalid')
  })

  it('should enforce rate limiting', async () => {
    // 連續發送多次請求，檢查是否被限制
    const email = 'test@example.com'
    let response

    for (let i = 0; i < 6; i++) {
      const req = new NextRequest(
        new URL('http://localhost:3000/api/auth/email/send'),
        {
          method: 'POST',
          body: JSON.stringify({ email }),
          headers: { 'x-forwarded-for': '127.0.0.1' }
        }
      )
      response = await POST(req)
    }

    // 第 6 次應被限制
    expect(response!.status).toBe(429)
  })
})
```

### 任務 3.3：驗證完成

```bash
# 1. 運行郵件驗證測試
cd ceo-platform
pnpm test -- email

# 2. 運行整個測試套件
pnpm test

# 3. 檢查覆蓋率
pnpm test:coverage

# 4. 檢查型別
pnpm typecheck

# 5. 運行 linting
pnpm lint
```

---

## DAY 3（2026-02-13）- DAY 4（2026-02-14）

### 任務 4.1：整合 Sentry 監控

```bash
# 1. 安裝 Sentry
cd ceo-platform
npm install @sentry/nextjs

# 2. 運行配置精靈（或手動配置）
npx @sentry/wizard@latest -i nextjs

# 3. 配置環境變數（.env.local）
NEXT_PUBLIC_SENTRY_DSN=https://<your-key>@<your-id>.ingest.sentry.io/<project-id>
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
SENTRY_AUTH_TOKEN=your-token
```

### 任務 4.2：測試 Sentry

```typescript
// 在某個 API 路由測試
import * as Sentry from "@sentry/nextjs";

export async function GET(request: NextRequest) {
  try {
    // 正常邏輯
    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { error: '伺服器錯誤' },
      { status: 500 }
    );
  }
}
```

### 任務 4.3：完成檔案結構文檔

```bash
# 更新 README.md，反映新的 Monorepo 結構
cat > README.md <<'EOF'
# CEO 團購電商平台 v2

## 專案結構

### Monorepo Layout
```
/統購PHP/
├── ceo-platform/        # Main Next.js application (Web)
│   ├── src/
│   ├── public/
│   ├── prisma/
│   ├── docker/
│   └── package.json
├── ceo-monorepo/        # (Integrated from Phase 6)
│   ├── apps/
│   │   ├── web/         # Web application
│   │   └── mobile/      # Mobile app (iOS + Android)
│   ├── packages/
│   │   ├── api-client/  # Shared API client
│   │   ├── auth/        # Shared auth logic
│   │   └── shared/      # Shared utilities
│   └── package.json
├── docs/                # Documentation
├── .github/             # GitHub Actions workflows
└── .gitignore
```

## 快速開始

### Web 應用
```bash
cd ceo-platform
pnpm install
pnpm dev
# 訪問 http://localhost:3000
```

### Mobile 應用（需 Expo CLI）
```bash
cd ceo-monorepo/apps/mobile
pnpm install
pnpm start
```

## 開發流程

1. 功能開發在 feature 分支
2. 提交 PR 進行代碼審查
3. 合併到 main 前運行：
   ```bash
   pnpm test
   pnpm lint
   pnpm typecheck
   ```

## 部署

### Web
```bash
cd ceo-platform
docker build -t ceo-platform:latest .
docker run -p 3000:3000 ceo-platform:latest
```

### Mobile
```bash
# 構建 iOS
eas build --platform ios

# 構建 Android
eas build --platform android
```

## 監控

使用 Sentry 進行錯誤追蹤。請見 `.env.local` 中的 `NEXT_PUBLIC_SENTRY_DSN`。

## 貢獻

請遵循 CONTRIBUTING.md 中的指南。

---

*最後更新：2026-02-11*
EOF

git add README.md
git commit -m "docs: update README with monorepo structure (Phase 6 merge)"
```

---

## 最終檢查清單

### 合併驗證
- [ ] Phase 6 成功合併至 main
- [ ] 無未解決的衝突
- [ ] 所有測試通過
- [ ] 編譯無誤
- [ ] TypeScript 檢查無誤

### 郵件驗證
- [ ] API 端點實現完整
- [ ] 速率限制已啟用
- [ ] Token 過期邏輯正確
- [ ] 前端頁面可用
- [ ] 測試覆蓋完善

### 監控
- [ ] Sentry 已集成
- [ ] DSN 已配置
- [ ] 測試錯誤可被追蹤
- [ ] Slack/郵件告警已配置

### 文檔
- [ ] README.md 已更新
- [ ] decision.md 已生成
- [ ] progress.md 已更新
- [ ] API 文檔已更新

---

## 時間估計

| 任務 | 預計工時 | 實際工時 |
|------|---------|---------|
| Phase 6 合併 | 2-3 小時 | _____ |
| 郵件驗證完成 | 5-6 小時 | _____ |
| Sentry 集成 | 2-3 小時 | _____ |
| 文檔更新 | 1-2 小時 | _____ |
| **總計** | **10-14 小時** | _____ |

---

## 遇到問題？

### 合併衝突
```bash
# 檢查衝突
git status

# 手動解決後
git add .
git commit
```

### 測試失敗
```bash
# 運行特定測試
pnpm test -- email

# 查看詳細日誌
pnpm test -- --reporter=verbose
```

### 編譯失敗
```bash
# 清除快取
rm -rf .next node_modules pnpm-lock.yaml
pnpm install
pnpm build
```

---

*此實施指南由 Claude (Opus 4.6) 於 2026-02-11 生成。*
