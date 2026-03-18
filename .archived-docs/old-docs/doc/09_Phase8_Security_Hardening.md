# Phase 8: Security Hardening (2026-02-12)

## Overview

Comprehensive security implementation covering CORS, CSRF protection, JWT enhancement, and security headers.

**Timeline**: 2026-02-12 to 2026-02-14
**Estimated Time**: 8-10 hours
**Status**: 🚀 IN PROGRESS

---

## 1. CORS Configuration ✅

### What is CORS?

Cross-Origin Resource Sharing allows controlled access from other domains.

### Implementation Plan

**File**: `ceo-monorepo/apps/web/src/middleware.ts`

**Features**:
- ✅ Whitelist approved origins
- ✅ Specify allowed HTTP methods
- ✅ Control exposed headers
- ✅ Handle credentials securely
- ✅ Set preflight cache duration

**Configuration**:

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');

  // Whitelist of allowed origins
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://ceo-buy.com',
    'https://www.ceo-buy.com',
    'https://admin.ceo-buy.com',
  ];

  const isOriginAllowed = allowedOrigins.includes(origin || '');

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      headers: {
        'Access-Control-Allow-Origin': isOriginAllowed ? origin! : '',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  }

  // Add CORS headers to response
  const response = NextResponse.next();
  if (isOriginAllowed) {
    response.headers.set('Access-Control-Allow-Origin', origin!);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
```

### Environment Variables

```env
# CORS Configuration
CORS_ORIGINS=http://localhost:3000,https://ceo-buy.com,https://admin.ceo-buy.com
CORS_CREDENTIALS=true
CORS_MAX_AGE=86400
```

---

## 2. CSRF Protection ✅

### What is CSRF?

Cross-Site Request Forgery attacks trick users into making unwanted requests.

### Implementation

**File**: `ceo-monorepo/apps/web/src/lib/csrf-token.ts`

```typescript
import { randomBytes } from 'crypto';
import Redis from 'ioredis';

interface CSRFConfig {
  redis: Redis;
  tokenLength?: number;
  maxAge?: number;
}

export class CSRFProtection {
  private redis: Redis;
  private tokenLength: number;
  private maxAge: number;

  constructor(config: CSRFConfig) {
    this.redis = config.redis;
    this.tokenLength = config.tokenLength || 32;
    this.maxAge = config.maxAge || 3600; // 1 hour
  }

  /**
   * Generate a new CSRF token
   */
  generateToken(sessionId: string): string {
    const token = randomBytes(this.tokenLength).toString('hex');
    return token;
  }

  /**
   * Store token in Redis
   */
  async storeToken(sessionId: string, token: string): Promise<void> {
    const key = `csrf:${sessionId}`;
    await this.redis.setex(key, this.maxAge, token);
  }

  /**
   * Verify CSRF token
   */
  async verifyToken(sessionId: string, token: string): Promise<boolean> {
    const key = `csrf:${sessionId}`;
    const storedToken = await this.redis.get(key);
    return storedToken === token;
  }

  /**
   * Invalidate token after use
   */
  async invalidateToken(sessionId: string): Promise<void> {
    const key = `csrf:${sessionId}`;
    await this.redis.del(key);
  }
}
```

### Middleware Integration

**File**: `ceo-monorepo/apps/web/src/middleware.ts`

```typescript
// Add CSRF validation for state-changing requests
if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
  const token = request.headers.get('x-csrf-token');
  const sessionId = request.cookies.get('sessionId')?.value;

  if (!token || !sessionId) {
    return NextResponse.json(
      { error: 'CSRF token missing' },
      { status: 403 }
    );
  }

  const isValid = await csrfProtection.verifyToken(sessionId, token);
  if (!isValid) {
    return NextResponse.json(
      { error: 'CSRF token invalid' },
      { status: 403 }
    );
  }
}
```

### Client Implementation

**File**: Frontend code

```typescript
// Get CSRF token from meta tag
const getCsrfToken = (): string => {
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
};

// Include in requests
const response = await fetch('/api/users/profile', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': getCsrfToken(),
  },
  body: JSON.stringify(data),
  credentials: 'include',
});
```

---

## 3. Security Headers 🛡️

### Implementation

**File**: `ceo-monorepo/apps/web/src/middleware.ts`

```typescript
// Add comprehensive security headers
response.headers.set('X-Content-Type-Options', 'nosniff');
response.headers.set('X-Frame-Options', 'DENY');
response.headers.set('X-XSS-Protection', '1; mode=block');
response.headers.set(
  'Content-Security-Policy',
  "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' *.vercel.app; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' *.vercel.app wss:; frame-ancestors 'none';"
);
response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
```

### Headers Explained

| Header | Purpose | Value |
|--------|---------|-------|
| X-Content-Type-Options | Prevent MIME sniffing | nosniff |
| X-Frame-Options | Clickjacking protection | DENY |
| X-XSS-Protection | Browser XSS protection | 1; mode=block |
| CSP | Content Security Policy | Restricted domains |
| HSTS | HTTPS enforcement | 1 year |
| Referrer-Policy | Control referrer info | strict-origin-when-cross-origin |
| Permissions-Policy | Feature permissions | Disable camera/microphone/geo |

---

## 4. JWT Enhancement 🔐

### Token Refresh Strategy

**File**: `ceo-monorepo/apps/web/src/lib/jwt-manager.ts`

```typescript
import jwt from 'jsonwebtoken';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class JWTManager {
  private accessTokenSecret: string;
  private refreshTokenSecret: string;
  private accessTokenExpiry: number;
  private refreshTokenExpiry: number;
  private gracePeriod: number;

  constructor() {
    this.accessTokenSecret = process.env.JWT_SECRET || 'access-secret';
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'refresh-secret';
    this.accessTokenExpiry = 15 * 60; // 15 minutes
    this.refreshTokenExpiry = 7 * 24 * 60 * 60; // 7 days
    this.gracePeriod = 60; // 1 minute
  }

  /**
   * Generate access and refresh tokens
   */
  generateTokenPair(userId: string, email: string): TokenPair {
    const accessToken = jwt.sign(
      { userId, email, type: 'access' },
      this.accessTokenSecret,
      { expiresIn: this.accessTokenExpiry }
    );

    const refreshToken = jwt.sign(
      { userId, email, type: 'refresh' },
      this.refreshTokenSecret,
      { expiresIn: this.refreshTokenExpiry }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenExpiry,
    };
  }

  /**
   * Verify access token with grace period
   */
  verifyAccessToken(token: string): { userId: string; email: string } | null {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret) as any;
      return { userId: decoded.userId, email: decoded.email };
    } catch (error) {
      // Check if token is within grace period
      try {
        const decoded = jwt.decode(token) as any;
        if (decoded && decoded.exp) {
          const now = Math.floor(Date.now() / 1000);
          if (now - decoded.exp < this.gracePeriod) {
            return { userId: decoded.userId, email: decoded.email };
          }
        }
      } catch {}
      return null;
    }
  }

  /**
   * Refresh tokens
   */
  refreshAccessToken(refreshToken: string): TokenPair | null {
    try {
      const decoded = jwt.verify(refreshToken, this.refreshTokenSecret) as any;
      if (decoded.type !== 'refresh') return null;

      return this.generateTokenPair(decoded.userId, decoded.email);
    } catch (error) {
      return null;
    }
  }
}
```

### Token Rotation

**File**: `ceo-monorepo/apps/web/src/app/api/auth/refresh/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { jwtManager } from '@/lib/jwt-manager';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json();

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token required' },
        { status: 400 }
      );
    }

    const tokenPair = jwtManager.refreshAccessToken(refreshToken);

    if (!tokenPair) {
      logger.warn({ refreshToken }, 'Invalid refresh token');
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    logger.info({ userId: tokenPair.expiresIn }, 'Token refreshed');

    return NextResponse.json(tokenPair);
  } catch (error) {
    logger.error({ err: error }, 'Token refresh error');
    return NextResponse.json(
      { error: 'Token refresh failed' },
      { status: 500 }
    );
  }
}
```

---

## 5. Input Validation & Sanitization

### Implementation

**File**: `ceo-monorepo/apps/web/src/lib/validation.ts`

```typescript
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Validate email format
 */
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .toLowerCase()
  .transform(sanitizeInput);

/**
 * Validate password strength
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain uppercase letter')
  .regex(/[a-z]/, 'Password must contain lowercase letter')
  .regex(/[0-9]/, 'Password must contain number')
  .regex(/[!@#$%^&*]/, 'Password must contain special character');

/**
 * Validate user input
 */
export const userInputSchema = z.object({
  name: z.string().min(2).max(100).transform(sanitizeInput),
  email: emailSchema,
  password: passwordSchema,
});
```

---

## 6. API Rate Limiting (Enhanced)

**Current Status**: ✅ Already implemented in Phase 7

**Enhancement**: Add per-endpoint limiting

```typescript
// Specific rate limits for different endpoints
const loginLimiter = new RedisRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5, // 5 attempts per 15 min
});

const apiLimiter = new RedisRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100, // 100 requests per minute
});
```

---

## 7. Security Checklist

### Before Production

- [ ] CORS properly configured for all domains
- [ ] CSRF tokens implemented and tested
- [ ] Security headers set on all responses
- [ ] JWT tokens with refresh strategy
- [ ] Input validation on all endpoints
- [ ] Rate limiting per endpoint
- [ ] HTTPS enforced (HSTS header)
- [ ] Secure cookies (HttpOnly, Secure, SameSite)
- [ ] SQL injection prevention (Prisma ORM)
- [ ] XSS prevention (DOMPurify)

### Testing

- [ ] Test CORS preflight requests
- [ ] Test CSRF token validation
- [ ] Test expired token handling
- [ ] Test rate limiting enforcement
- [ ] Test security headers presence
- [ ] Penetration testing

### Monitoring

- [ ] Log security events
- [ ] Alert on suspicious patterns
- [ ] Monitor CORS rejections
- [ ] Track failed auth attempts
- [ ] Monitor rate limit violations

---

## 8. Implementation Timeline

### Day 1 (2026-02-12)
- [ ] Implement CORS configuration
- [ ] Add CSRF protection middleware
- [ ] Configure security headers
- [ ] Set up CSRF token generation

### Day 2 (2026-02-13)
- [ ] Implement JWT refresh strategy
- [ ] Add input validation/sanitization
- [ ] Enhance endpoint-specific rate limits
- [ ] Write security tests

### Day 3 (2026-02-14)
- [ ] Security audit and review
- [ ] Load testing with security features
- [ ] Documentation finalization
- [ ] Production readiness check

---

## 9. Expected Outcomes

After Phase 8 completion:

✅ CORS properly configured for all domains
✅ CSRF attacks prevented with token validation
✅ Strong security headers on all responses
✅ JWT tokens with rotation strategy
✅ Input validation on all endpoints
✅ Rate limiting per endpoint
✅ Production-ready security posture

---

## 10. Next Phase (Phase 9)

After security hardening:
- Sentry error tracking integration
- Performance monitoring
- User analytics
- A/B testing framework
- App Store submission preparation

---

**Status**: 🚀 Ready to implement
**Priority**: 🔴 CRITICAL
**Estimated Hours**: 8-10
**Target Completion**: 2026-02-14
