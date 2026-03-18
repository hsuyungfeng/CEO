# Email Verification Completion Guide (2026-02-12 至 2026-02-13)

## Current Status

✅ **Already Implemented (90% complete)**
- POST /api/auth/email/send-verify - Send verification code
- POST /api/auth/email/verify - Verify code endpoint
- Zod schema validation
- Database integration (emailVerification table)
- Token expiry checking (24 hours)
- Purpose-based handling (VERIFY_EMAIL, RESET_PASSWORD, etc.)

⏳ **Still Needed (10% remaining)**
1. Rate limiting (prevent abuse)
2. Replace console.error with logger
3. Retry mechanism (max attempts tracking)
4. Comprehensive tests
5. Email template refinement

---

## Step 1: Add Rate Limiting (1.5 hours)

### Approach: Memory-based rate limiter (no external dependency)

Create `ceo-monorepo/apps/web/src/lib/rate-limiter.ts`:

```typescript
// Simple in-memory rate limiter (suitable for single-server or small scale)
// For production at scale, use Redis

interface RateLimitEntry {
  count: number
  resetTime: number
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>()
  private windowMs: number
  private maxRequests: number

  constructor(windowMs: number = 15 * 60 * 1000, maxRequests: number = 5) {
    this.windowMs = windowMs
    this.maxRequests = maxRequests

    // Clean up expired entries every hour
    setInterval(() => this.cleanup(), 60 * 60 * 1000)
  }

  check(key: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now()
    const entry = this.store.get(key)

    if (!entry || now > entry.resetTime) {
      // New window
      const resetTime = now + this.windowMs
      this.store.set(key, { count: 1, resetTime })
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime,
      }
    }

    // Existing window
    if (entry.count < this.maxRequests) {
      entry.count++
      return {
        allowed: true,
        remaining: this.maxRequests - entry.count,
        resetTime: entry.resetTime,
      }
    }

    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    }
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key)
      }
    }
  }
}

export const emailRateLimiter = new RateLimiter(
  15 * 60 * 1000, // 15-minute window
  5 // 5 requests per window
)
```

### Update send-verify endpoint with rate limiting:

Replace in `ceo-monorepo/apps/web/src/app/api/auth/email/send-verify/route.ts`:

```typescript
import { emailRateLimiter } from '@/lib/rate-limiter'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown'

    const rateLimit = emailRateLimiter.check(`send-verify:${ip}`)
    if (!rateLimit.allowed) {
      const resetIn = Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
      return NextResponse.json(
        {
          error: `發送過於頻繁，請在 ${resetIn} 秒後重試`,
          retryAfter: resetIn,
        },
        { status: 429 }
      )
    }

    // ... rest of the implementation
    logger.info(
      { email, ip, remaining: rateLimit.remaining },
      '驗證碼發送請求'
    )
  } catch (error) {
    logger.error({ err: error }, '發送驗證碼錯誤')
    // ...
  }
}
```

---

## Step 2: Replace console.error with logger (30 minutes)

Update both endpoints:

```typescript
// In send-verify/route.ts and verify/route.ts

import { logger } from '@/lib/logger'

// Replace all console.error with:
logger.error({ err: error }, 'Error message')

// Replace all console.log with:
logger.info({ details }, 'Info message')
```

---

## Step 3: Add Retry Mechanism (1 hour)

Create `ceo-monorepo/apps/web/src/lib/email-verification.ts`:

```typescript
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const MAX_VERIFICATION_ATTEMPTS = 3
const VERIFICATION_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

export async function trackVerificationAttempt(email: string) {
  const now = new Date()

  // Find or create verification attempt record
  let record = await prisma.emailVerificationAttempt.findUnique({
    where: { email },
  })

  if (!record || now.getTime() - record.updatedAt.getTime() > VERIFICATION_WINDOW_MS) {
    // New window
    record = await prisma.emailVerificationAttempt.upsert({
      where: { email },
      update: {
        attempts: 1,
        updatedAt: now,
      },
      create: {
        email,
        attempts: 1,
        updatedAt: now,
      },
    })
  } else {
    // Existing window
    if (record.attempts >= MAX_VERIFICATION_ATTEMPTS) {
      logger.warn({ email, attempts: record.attempts }, '驗證嘗試次數過多')
      throw new Error('驗證嘗試次數過多，請稍後再試')
    }

    record = await prisma.emailVerificationAttempt.update({
      where: { email },
      data: { attempts: record.attempts + 1 },
    })
  }

  return record.attempts
}

export async function resetVerificationAttempts(email: string) {
  await prisma.emailVerificationAttempt.deleteMany({
    where: { email },
  })
}
```

### Update verify endpoint:

```typescript
import { trackVerificationAttempt, resetVerificationAttempts } from '@/lib/email-verification'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = verifySchema.parse(body)

    // Track attempt
    const attempts = await trackVerificationAttempt(email)

    // ... existing verification logic ...

    if (verification.expiresAt < new Date()) {
      logger.warn({ token }, '驗證碼已過期')
      throw new Error('驗證連結已過期')
    }

    // On success, reset attempts
    await resetVerificationAttempts(email)

    return NextResponse.json({ message: '郵件驗證成功' })
  } catch (error) {
    logger.error({ err: error }, '郵件驗證失敗')
    return NextResponse.json({ error: '郵件驗證失敗' }, { status: 500 })
  }
}
```

---

## Step 4: Add Comprehensive Tests (2 hours)

Create `ceo-monorepo/apps/web/src/app/api/auth/email/__tests__/send-verify.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '../send-verify/route'
import { NextRequest } from 'next/server'
import { emailRateLimiter } from '@/lib/rate-limiter'

describe('POST /api/auth/email/send-verify', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Clean up rate limiter
    vi.clearAllMocks()
  })

  it('should send verification code to valid email', async () => {
    const req = new NextRequest(
      new URL('http://localhost:3000/api/auth/email/send-verify'),
      {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
        headers: { 'x-forwarded-for': '127.0.0.1' },
      }
    )

    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.message).toContain('驗證碼已發送')
  })

  it('should reject invalid email', async () => {
    const req = new NextRequest(
      new URL('http://localhost:3000/api/auth/email/send-verify'),
      {
        method: 'POST',
        body: JSON.stringify({ email: 'invalid-email' }),
      }
    )

    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBeDefined()
  })

  it('should enforce rate limiting', async () => {
    const ip = '192.168.1.1'
    const createRequest = () =>
      new NextRequest(
        new URL('http://localhost:3000/api/auth/email/send-verify'),
        {
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com' }),
          headers: { 'x-forwarded-for': ip },
        }
      )

    // Send 5 requests (should all succeed)
    for (let i = 0; i < 5; i++) {
      const res = await POST(createRequest())
      expect(res.status).toBe(200)
    }

    // 6th request should be rate limited
    const res = await POST(createRequest())
    expect(res.status).toBe(429)
    const data = await res.json()
    expect(data.error).toContain('發送過於頻繁')
    expect(data.retryAfter).toBeDefined()
  })

  it('should handle missing purpose with default', async () => {
    const req = new NextRequest(
      new URL('http://localhost:3000/api/auth/email/send-verify'),
      {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      }
    )

    const res = await POST(req)
    expect(res.status).toBe(200)
    // Verification should default to VERIFY_EMAIL
  })

  it('should return 404 for non-existent user on VERIFY_EMAIL', async () => {
    const req = new NextRequest(
      new URL('http://localhost:3000/api/auth/email/send-verify'),
      {
        method: 'POST',
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          purpose: 'VERIFY_EMAIL',
        }),
      }
    )

    const res = await POST(req)
    expect(res.status).toBe(404)
  })
})
```

Create `ceo-monorepo/apps/web/src/app/api/auth/email/__tests__/verify.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../verify/route'
import { NextRequest } from 'next/server'

describe('POST /api/auth/email/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should verify valid token', async () => {
    const req = new NextRequest(
      new URL('http://localhost:3000/api/auth/email/verify'),
      {
        method: 'POST',
        body: JSON.stringify({ token: 'valid-token-here' }),
      }
    )

    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.message).toContain('驗證成功')
  })

  it('should reject invalid token', async () => {
    const req = new NextRequest(
      new URL('http://localhost:3000/api/auth/email/verify'),
      {
        method: 'POST',
        body: JSON.stringify({ token: 'invalid-token' }),
      }
    )

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('should reject expired token', async () => {
    // Create expired token and test
    const req = new NextRequest(
      new URL('http://localhost:3000/api/auth/email/verify'),
      {
        method: 'POST',
        body: JSON.stringify({ token: 'expired-token' }),
      }
    )

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('should track verification attempts', async () => {
    // Multiple failed attempts should eventually fail
    const req = new NextRequest(
      new URL('http://localhost:3000/api/auth/email/verify'),
      {
        method: 'POST',
        body: JSON.stringify({ token: 'invalid' }),
      }
    )

    const res1 = await POST(req)
    const res2 = await POST(req)
    const res3 = await POST(req)

    expect(res1.status).toBe(400)
    expect(res2.status).toBe(400)
    // res3 might be 429 if attempts tracked
  })
})
```

---

## Step 5: Database Migrations (Optional but Recommended)

Create migration for retry tracking table:

```bash
npx prisma migrate dev --name add_email_verification_attempts
```

Add to `schema.prisma`:

```prisma
model EmailVerificationAttempt {
  email      String    @id
  attempts   Int       @default(1)
  updatedAt  DateTime  @updatedAt

  @@index([updatedAt])
}
```

---

## Implementation Checklist

### Day 1 (Today 2026-02-12)
- [ ] Create rate-limiter.ts
- [ ] Update send-verify endpoint with rate limiting
- [ ] Replace console.error with logger in both endpoints
- [ ] Test rate limiting manually

### Day 2 (2026-02-13)
- [ ] Create email-verification.ts with retry tracking
- [ ] Update verify endpoint with attempt tracking
- [ ] Add database migration for attempt tracking
- [ ] Write comprehensive tests
- [ ] Run full test suite: `pnpm test`
- [ ] Verify build: `pnpm build`

### Day 3 (2026-02-14)
- [ ] Final testing
- [ ] Documentation update
- [ ] Ready for Phase 8

---

## Validation Commands

```bash
# After implementation, run these to validate:

# Unit tests
cd ceo-platform
pnpm test -- email

# Full test suite
pnpm test

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Build
pnpm build
```

---

## Expected Test Results

```
✓ POST /api/auth/email/send-verify
  ✓ should send verification code to valid email
  ✓ should reject invalid email
  ✓ should enforce rate limiting (5 req / 15 min)
  ✓ should handle missing purpose with default
  ✓ should return 404 for non-existent user on VERIFY_EMAIL

✓ POST /api/auth/email/verify
  ✓ should verify valid token
  ✓ should reject invalid token
  ✓ should reject expired token
  ✓ should track verification attempts (max 3)

Total: 10 tests, 0 failures
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| In-memory rate limit loss on restart | Consider Redis for production |
| Email delivery failures | Implement retry queue (Bullmq) |
| Token collision | Use 256-bit random token |
| Testing database issues | Mock Prisma in tests |

---

## Success Criteria

✅ Email verification can be sent (with rate limiting)
✅ Email verification can be verified (with retry tracking)
✅ Rate limiting prevents abuse (5 per 15 minutes)
✅ Attempts limited to 3 per 15-minute window
✅ All tests passing (10+ test cases)
✅ Logging replaces console.error
✅ No TypeScript errors
✅ Build succeeds

---

**Estimated Total Time**: 5-6 hours
**Target Completion**: 2026-02-14
**Next Phase**: Phase 8 Security Hardening
