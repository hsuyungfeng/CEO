# 郵件驗證系統實施計劃

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 建立完整的郵件驗證系統，支援郵件登入、帳戶驗證、找回密碼、雙因素驗證和訂單通知

**Architecture:** 擴充現有User模型，新增EmailVerification模型，整合NextAuth.js Email provider，實作完整的郵件驗證流程，支援Web和Mobile雙平台

**Tech Stack:** NextAuth.js v5, Prisma, PostgreSQL, Resend (郵件服務), React Email, TypeScript, React Native

---

## 專案結構
```
ceo-monorepo/
├── apps/
│   ├── web/                    # Next.js Web應用
│   │   ├── prisma/
│   │   │   └── schema.prisma   # 資料庫Schema
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── api/
│   │   │   │   │   └── auth/
│   │   │   │   │       ├── email/          # 郵件驗證API
│   │   │   │   │       └── 2fa/            # 雙因素驗證API
│   │   │   │   └── (auth)/                 # 認證頁面
│   │   │   ├── lib/
│   │   │   │   ├── email/                  # 郵件服務
│   │   │   │   └── auth/                   # 認證工具
│   │   │   └── types/
│   │   │       └── auth.ts                 # 類型定義
│   │   └── __tests__/                      # 測試
│   └── mobile/                 # React Native App
│       ├── app/
│       │   └── (auth)/         # 移動端認證頁面
│       └── components/
│           └── auth/           # 認證元件
├── packages/
│   └── shared/
│       └── src/
│           └── auth/           # 共用認證邏輯
└── docs/
    └── plans/
        └── 2025-02-10-email-verification-system.md
```

---

### Task 1: 資料庫Schema擴充

**Files:**
- Modify: `apps/web/prisma/schema.prisma:9-38` (User模型)
- Create: `apps/web/prisma/migrations/20250210000000_add_email_verification/` (遷移文件)

**Step 1: 擴充User模型**

```prisma
// 在User模型中新增欄位
model User {
  // 現有欄位...
  emailVerified Boolean @default(false)
  twoFactorEnabled Boolean @default(false)
  twoFactorMethod TwoFactorMethod? @default(EMAIL)
  
  // 新增關係
  emailVerifications EmailVerification[]
}

// 新增枚舉
enum TwoFactorMethod {
  EMAIL
  APP
  SMS
}
```

**Step 2: 新增EmailVerification模型**

```prisma
model EmailVerification {
  id        String   @id @default(cuid())
  email     String   @unique
  token     String   @unique
  expiresAt DateTime
  purpose   EmailVerificationPurpose @default(VERIFY_EMAIL)
  userId    String?
  createdAt DateTime @default(now())
  
  @@index([email])
  @@index([token])
  @@map("email_verifications")
}

enum EmailVerificationPurpose {
  VERIFY_EMAIL
  RESET_PASSWORD
  CHANGE_EMAIL
  TWO_FACTOR_AUTH
}
```

**Step 3: 生成遷移**

```bash
cd apps/web
npx prisma migrate dev --name add_email_verification
```

**Step 4: 驗證遷移**

```bash
npx prisma db pull
npx prisma studio
```

**Step 5: Commit**

```bash
git add apps/web/prisma/
git commit -m "feat: add email verification schema"
```

---

### Task 2: 類型定義擴充

**Files:**
- Modify: `apps/web/src/types/auth.ts:34-81`

**Step 1: 擴充現有類型**

```typescript
// 在RegisterRequest中新增email驗證相關欄位
export interface RegisterRequest {
  name: string;
  taxId: string;
  email: string;
  phone?: string;
  password: string;
  confirmPassword: string;
  requireEmailVerification?: boolean;
}

// 新增郵件登入請求類型
export interface EmailLoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  twoFactorCode?: string;
}

// 新增郵件驗證請求類型
export interface EmailVerificationRequest {
  email: string;
  purpose?: EmailVerificationPurpose;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface TwoFactorRequest {
  code: string;
}

// 新增枚舉類型
export enum EmailVerificationPurpose {
  VERIFY_EMAIL = 'VERIFY_EMAIL',
  RESET_PASSWORD = 'RESET_PASSWORD',
  CHANGE_EMAIL = 'CHANGE_EMAIL',
  TWO_FACTOR_AUTH = 'TWO_FACTOR_AUTH',
}

export enum TwoFactorMethod {
  EMAIL = 'EMAIL',
  APP = 'APP',
  SMS = 'SMS',
}
```

**Step 2: 驗證類型**

```bash
cd apps/web
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add apps/web/src/types/auth.ts
git commit -m "feat: add email verification types"
```

---

### Task 3: 郵件服務實作

**Files:**
- Create: `apps/web/src/lib/email/config.ts`
- Create: `apps/web/src/lib/email/templates/verify-email.tsx`
- Create: `apps/web/src/lib/email/service.ts`

**Step 1: 建立郵件配置**

```typescript
// apps/web/src/lib/email/config.ts
import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);

export const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || 'noreply@ceo-buy.com',
  replyTo: process.env.EMAIL_REPLY_TO || 'support@ceo-buy.com',
  companyName: 'CEO團購平台',
} as const;

export const EMAIL_TEMPLATES = {
  VERIFY_EMAIL: 'verify-email',
  RESET_PASSWORD: 'reset-password',
  TWO_FACTOR_AUTH: 'two-factor-auth',
  WELCOME: 'welcome',
  ORDER_CONFIRMATION: 'order-confirmation',
} as const;
```

**Step 2: 建立郵件服務類別**

```typescript
// apps/web/src/lib/email/service.ts
import { resend, EMAIL_CONFIG } from './config';

export class EmailService {
  private async sendEmail(to: string, subject: string, html: string) {
    try {
      const { data, error } = await resend.emails.send({
        from: EMAIL_CONFIG.from,
        to,
        subject,
        html,
        reply_to: EMAIL_CONFIG.replyTo,
      });

      if (error) {
        console.error('Email send error:', error);
        throw new Error(`郵件發送失敗: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Email service error:', error);
      // 開發環境：記錄但不拋出錯誤
      if (process.env.NODE_ENV === 'development') {
        console.log('開發環境模擬發送郵件到:', to);
        console.log('郵件內容:', html);
        return { id: 'dev-mock-id' };
      }
      throw error;
    }
  }

  async sendVerificationEmail(email: string, token: string, userName?: string) {
    const verificationLink = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${token}`;
    const html = `
      <div>
        <h2>驗證您的${EMAIL_CONFIG.companyName}帳戶</h2>
        <p>親愛的 ${userName || '用戶'}，</p>
        <p>請點擊以下連結驗證您的電子郵件：</p>
        <a href="${verificationLink}">${verificationLink}</a>
        <p>此連結將在24小時後失效。</p>
      </div>
    `;

    return this.sendEmail(
      email,
      `驗證您的${EMAIL_CONFIG.companyName}帳戶`,
      html
    );
  }

  async sendTwoFactorCode(email: string, code: string) {
    const html = `
      <div>
        <h2>您的${EMAIL_CONFIG.companyName}驗證碼</h2>
        <p>您的雙因素驗證碼是：<strong>${code}</strong></p>
        <p>此驗證碼將在10分鐘後失效。</p>
      </div>
    `;

    return this.sendEmail(
      email,
      `您的${EMAIL_CONFIG.companyName}驗證碼`,
      html
    );
  }
}

export const emailService = new EmailService();
```

**Step 3: 測試郵件服務**

```bash
cd apps/web
npm test -- src/lib/email/service.test.ts
```

**Step 4: Commit**

```bash
git add apps/web/src/lib/email/
git commit -m "feat: implement email service"
```

---

### Task 4: 郵件驗證API端點

**Files:**
- Create: `apps/web/src/app/api/auth/email/send-verify/route.ts`
- Create: `apps/web/src/app/api/auth/email/verify/route.ts`

**Step 1: 發送驗證郵件API**

```typescript
// apps/web/src/app/api/auth/email/send-verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailService } from '@/lib/email/service';
import { z } from 'zod';
import { randomBytes } from 'crypto';

const sendVerifySchema = z.object({
  email: z.string().email('請輸入有效的電子郵件'),
  purpose: z.enum(['VERIFY_EMAIL', 'RESET_PASSWORD', 'CHANGE_EMAIL', 'TWO_FACTOR_AUTH']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, purpose = 'VERIFY_EMAIL' } = sendVerifySchema.parse(body);

    // 檢查用戶是否存在
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // 如果是驗證郵件但用戶不存在，返回錯誤
    if (purpose === 'VERIFY_EMAIL' && !user) {
      return NextResponse.json(
        { error: '找不到使用此郵件的用戶' },
        { status: 404 }
      );
    }

    // 生成驗證Token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24小時有效

    // 刪除舊的驗證記錄
    await prisma.emailVerification.deleteMany({
      where: { email },
    });

    // 創建新的驗證記錄
    const verification = await prisma.emailVerification.create({
      data: {
        email,
        token,
        expiresAt,
        purpose,
        userId: user?.id,
      },
    });

    // 發送郵件
    if (purpose === 'VERIFY_EMAIL' && user) {
      await emailService.sendVerificationEmail(email, token, user.name);
    }

    return NextResponse.json({
      message: '驗證郵件已發送',
      expiresAt: verification.expiresAt,
    });
  } catch (error) {
    console.error('Send verification error:', error);
    return NextResponse.json(
      { error: '發送驗證郵件失敗' },
      { status: 500 }
    );
  }
}
```

**Step 2: 測試API端點**

```bash
cd apps/web
npm test -- __tests__/api/auth/email/send-verify.test.ts
```

**Step 3: Commit**

```bash
git add apps/web/src/app/api/auth/email/
git commit -m "feat: implement email verification APIs"
```

---

### Task 5: 郵件登入API

**Files:**
- Create: `apps/web/src/app/api/auth/email/login/route.ts`

**Step 1: 建立郵件登入API**

```typescript
// apps/web/src/app/api/auth/email/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { compare } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { z } from 'zod';
import { emailService } from '@/lib/email/service';
import { randomInt } from 'crypto';

const loginSchema = z.object({
  email: z.string().email('請輸入有效的電子郵件'),
  password: z.string().min(6, '密碼至少6個字元'),
  rememberMe: z.boolean().optional().default(false),
  twoFactorCode: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, rememberMe, twoFactorCode } = loginSchema.parse(body);

    // 查找用戶
    const user = await prisma.user.findUnique({
      where: { email },
      include: { member: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: '電子郵件或密碼錯誤' },
        { status: 401 }
      );
    }

    // 檢查帳戶狀態
    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: '帳戶已被停用，請聯絡管理員' },
        { status: 403 }
      );
    }

    // 驗證密碼
    const passwordValid = await compare(password, user.password);
    if (!passwordValid) {
      return NextResponse.json(
        { error: '電子郵件或密碼錯誤' },
        { status: 401 }
      );
    }

    // 檢查郵件驗證狀態
    if (!user.emailVerified) {
      return NextResponse.json(
        { 
          error: '請先驗證您的電子郵件',
          requiresEmailVerification: true,
          email: user.email,
        },
        { status: 403 }
      );
    }

    // 檢查雙因素驗證
    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        // 發送2FA驗證碼
        const code = randomInt(100000, 999999).toString();
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);

        // 保存2FA驗證碼
        await prisma.emailVerification.create({
          data: {
            email: user.email,
            token: code,
            expiresAt,
            purpose: 'TWO_FACTOR_AUTH',
            userId: user.id,
          },
        });

        // 發送郵件
        await emailService.sendTwoFactorCode(user.email, code);

        return NextResponse.json({
          message: '已發送雙因素驗證碼到您的郵件',
          requiresTwoFactor: true,
          email: user.email,
        });
      }

      // 驗證2FA碼
      const verification = await prisma.emailVerification.findFirst({
        where: {
          email: user.email,
          token: twoFactorCode,
          purpose: 'TWO_FACTOR_AUTH',
          expiresAt: { gt: new Date() },
        },
      });

      if (!verification) {
        return NextResponse.json(
          { error: '無效或過期的驗證碼' },
          { status: 401 }
        );
      }

      // 刪除已使用的驗證碼
      await prisma.emailVerification.delete({
        where: { id: verification.id },
      });
    }

    // 生成JWT Token
    const tokenPayload = {
      id: user.id,
      email: user.email,
      taxId: user.taxId,
      role: user.role,
      name: user.name,
    };

    const token = sign(tokenPayload, process.env.JWT_SECRET!, {
      expiresIn: rememberMe ? '30d' : '1d',
    });

    return NextResponse.json({
      message: '登入成功',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        taxId: user.taxId,
        role: user.role,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        member: user.member,
      },
      token,
    });
  } catch (error) {
    console.error('Email login error:', error);
    return NextResponse.json(
      { error: '登入失敗' },
      { status: 500 }
    );
  }
}
```

**Step 2: 測試郵件登入API**

```bash
cd apps/web
npm test -- __tests__/api/auth/email/login.test.ts
```

**Step 3: Commit**

```bash
git add apps/web/src/app/api/auth/email/login/route.ts
git commit -m "feat: implement email login API with 2FA support"
```

---

### Task 6: Web前端頁面

**Files:**
- Create: `apps/web/src/app/(auth)/email-login/page.tsx`
- Create: `apps/web/src/app/(auth)/verify-email/page.tsx`

**Step 1: 郵件登入頁面**

```tsx
// apps/web/src/app/(auth)/email-login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function EmailLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/email/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.requiresEmailVerification) {
          router.push(`/verify-email?email=${encodeURIComponent(result.email)}`);
        } else {
          setError(result.error || '登入失敗');
        }
        return;
      }

      // 登入成功，重定向到儀表板
      localStorage.setItem('token', result.token);
      router.push('/dashboard');
    } catch (err) {
      setError('網路錯誤，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold text-center">郵件登入</h2>
        
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              電子郵件
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              密碼
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '登入中...' : '登入'}
          </button>
        </form>

        <div className="text-center space-y-2">
          <Link
            href="/forgot-password"
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            忘記密碼？
          </Link>
          <p className="text-sm text-gray-600">
            還沒有帳戶？{' '}
            <Link
              href="/register"
              className="text-blue-600 hover:text-blue-800"
            >
              立即註冊
            </Link>
          </p>
          <p className="text-sm text-gray-600">
            或使用{' '}
            <Link
              href="/login"
              className="text-blue-600 hover:text-blue-800"
            >
              統一編號登入
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: 測試前端頁面**

```bash
cd apps/web
npm run dev
# 訪問 http://localhost:3000/email-login
```

**Step 3: Commit**

```bash
git add apps/web/src/app/(auth)/
git commit -m "feat: implement email login frontend pages"
```

---

### Task 7: 環境配置更新

**Files:**
- Modify: `apps/web/.env.local.example`
- Modify: `apps/mobile/.env.example`

**Step 1: 更新Web環境變數**

```bash
# apps/web/.env.local.example
# 郵件服務配置
RESEND_API_KEY=re_1234567890
EMAIL_FROM=noreply@ceo-buy.com
EMAIL_REPLY_TO=support@ceo-buy.com

# JWT配置
JWT_SECRET=your-jwt-secret-key-here
```

**Step 2: 更新Mobile環境變數**

```bash
# apps/mobile/.env.example
# API基礎URL
API_URL=http://localhost:3000

# 郵件登入功能標誌
ENABLE_EMAIL_LOGIN=true
```

**Step 3: Commit**

```bash
git add apps/web/.env.local.example
git add apps/mobile/.env.example
git commit -m "feat: update environment variables for email verification"
```

---

### Task 8: 測試與驗證

**Files:**
- Create: `apps/web/__tests__/integration/email-verification.test.ts`

**Step 1: 建立整合測試**

```typescript
// apps/web/__tests__/integration/email-verification.test.ts
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';

describe('Email Verification System', () => {
  beforeAll(async () => {
    // 清理測試資料
    await prisma.emailVerification.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should register user with email verification', async () => {
    // 測試用戶註冊
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: await hash('password123', 10),
        name: 'Test User',
        taxId: '12345678',
        emailVerified: false,
      },
    });

    expect(user).toBeDefined();
    expect(user.emailVerified).toBe(false);
  });

  it('should send verification email', async () => {
    // 測試發送驗證郵件
    const response = await fetch('http://localhost:3000/api/auth/email/send-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        purpose: 'VERIFY_EMAIL',
      }),
    });

    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.message).toBe('驗證郵件已發送');
  });
});
```

**Step 2: 運行測試**

```bash
cd apps/web
npm test -- __tests__/integration/email-verification.test.ts
```

**Step 3: Commit**

```bash
git add apps/web/__tests__/integration/
git commit -m "feat: add email verification integration tests"
```

---

## 執行選項

**Plan complete and saved to `docs/plans/2025-02-10-email-verification-system.md`. Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**