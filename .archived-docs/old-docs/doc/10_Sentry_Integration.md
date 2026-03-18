# Sentry Integration Guide - Phase 8 Part 3

## Overview

Sentry provides real-time error tracking, performance monitoring, and security event alerting for the CEO Group Buying Platform.

**Setup Date**: 2026-02-12
**Estimated Hours**: 4-6
**Status**: 🚀 IN PROGRESS

---

## What is Sentry?

Sentry is an error tracking and performance monitoring platform that helps you:

- 📊 **Track errors** in real-time across web and server
- 🔍 **Monitor performance** of API endpoints and operations
- 🚨 **Alert on security events** (CSRF failures, auth issues, injection attempts)
- 📈 **Analyze trends** and patterns in your application
- 🎯 **Prioritize issues** by frequency and severity

---

## Installation & Setup

### 1. Install Dependencies

```bash
pnpm add @sentry/nextjs
```

**Package Details:**
- `@sentry/nextjs`: ^8.22.0
- Includes client-side and server-side SDKs
- Automatic session replay integration
- Performance monitoring included

### 2. Environment Variables

Create `.env.local`:

```env
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://[key]@[domain].ingest.sentry.io/[projectId]
SENTRY_DSN=https://[key]@[domain].ingest.sentry.io/[projectId]
SENTRY_AUTH_TOKEN=your-auth-token

# Optional
NEXT_PUBLIC_APP_VERSION=1.0.0
```

**To get DSN:**
1. Create account at https://sentry.io
2. Create new project (select "Next.js")
3. Copy DSN from project settings
4. (Optional) Create auth token for release management

### 3. Files Created

```
src/
├── lib/
│   ├── sentry.client.config.ts        (Client-side config)
│   ├── sentry.server.config.ts        (Server-side config)
│   ├── security-event-tracker.ts      (Security event logging)
│   └── csrf-middleware-with-monitoring.ts (Enhanced middleware)
├── instrumentation.ts                  (Next.js init hook)
└── middleware.ts                       (Already configured)
```

---

## Configuration Details

### Client-Side Configuration

**File**: `src/lib/sentry.client.config.ts`

**Features:**
- Error tracking from browser
- Session replay (10% sampling in production)
- Performance monitoring
- Breadcrumb tracking for user actions
- Sensitive data filtering (headers, cookies)

**Key Settings:**
- `tracesSampleRate`: 1.0 (dev), 0.1 (prod)
- `replaysSessionSampleRate`: 1.0 (dev), 0.1 (prod)
- `replaysOnErrorSampleRate`: 1.0 (always capture on error)
- `attachStacktrace`: true

**Exported Functions:**
```typescript
// Initialize Sentry
initSentryClient()

// Track security events
captureSecurityEvent('csrf_failure' | 'validation_failure' | 'auth_failure' | 'xss_detected' | 'sql_injection_detected', context, level)

// Track performance
trackPerformance(operationName, duration, tags)

// User context
setSentryUser(userId, email, username)
clearSentryUser()

// Breadcrumbs
addSentryBreadcrumb(message, category, level, data)
```

### Server-Side Configuration

**File**: `src/lib/sentry.server.config.ts`

**Features:**
- API error tracking
- Request/response monitoring
- Database operation tracking
- Email operation tracking
- Uncaught exception handling
- Sensitive data masking

**Key Settings:**
- `beforeSend`: Filters health checks, masks auth headers
- `tracesSampleRate`: 1.0 (dev), 0.1 (prod)
- `ignoreErrors`: Network errors, connection errors

**Exported Functions:**
```typescript
// Server-side security events
captureServerSecurityEvent(eventType, context, level)

// API request tracking
trackApiRequest(method, endpoint, statusCode, duration, userId)

// Database operations
trackDatabaseOperation(operation, table, duration, error)

// Email operations
trackEmailOperation(templateType, recipient, success, error)

// User context (masked emails)
setSentryServerUser(userId, email)
clearSentryServerUser()

// Server breadcrumbs
addServerBreadcrumb(message, category, level, data)

// Flush events on shutdown
flushSentry(timeout)
```

### Next.js Instrumentation

**File**: `src/instrumentation.ts`

Automatically called by Next.js 13.4+ to initialize Sentry on server and edge runtime.

---

## Security Event Tracking

### Security Event Tracker

**File**: `src/lib/security-event-tracker.ts`

Dedicated module for tracking security-related events:

```typescript
// CSRF failures
securityEventTracker.trackCSRFFailure(context, reason)

// Input validation failures
securityEventTracker.trackValidationFailure(context, field, violation)

// Authentication failures
securityEventTracker.trackAuthFailure(context, reason)

// XSS detection
securityEventTracker.trackXSSDetection(context, input)

// SQL injection detection
securityEventTracker.trackSQLInjectionDetection(context, input)

// Rate limiting
securityEventTracker.trackRateLimitExceeded(context)

// JWT issues
securityEventTracker.trackJWTIssue(context, issue)

// General security events
securityEventTracker.trackSecurityEvent(eventType, context, status)
```

### Context Object

```typescript
interface SecurityEventContext {
  userId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  endpoint?: string;
  [key: string]: any;
}

// Get from Next.js request
const context = securityEventTracker.constructor.getContextFromRequest(request)

// Get from Express/Node request
const context = securityEventTracker.constructor.getContextFromExpressRequest(req)
```

---

## CSRF Middleware with Monitoring

### Enhanced CSRF Validation

**File**: `src/lib/csrf-middleware-with-monitoring.ts`

Combines CSRF protection with Sentry event tracking:

```typescript
// Validate with monitoring
const response = await validateCSRFTokenWithMonitoring(request, getContext)

// With performance tracking
const response = await validateCSRFWithPerformance(request, getContext)

// Generate with tracking
const token = generateCSRFTokenWithTracking(sessionId)
```

**Tracked Events:**
- CSRF token validation success ✅
- Missing token/session ⚠️
- Invalid token ⚠️
- Performance metrics (if > 50ms)

---

## Usage Examples

### Tracking in API Routes

```typescript
// src/app/api/auth/login/route.ts
import { securityEventTracker } from '@/lib/security-event-tracker';
import { captureServerSecurityEvent, trackApiRequest } from '@/lib/sentry.server.config';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const context = securityEventTracker.constructor.getContextFromExpressRequest(request);

  try {
    // Your auth logic
    const result = await authenticateUser(email, password);

    if (!result.success) {
      // Track failed auth
      securityEventTracker.trackAuthFailure(context, 'invalid_credentials');
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Track success
    const duration = Date.now() - startTime;
    trackApiRequest('POST', '/api/auth/login', 200, duration, result.userId);

    return NextResponse.json({ token: result.token });
  } catch (error) {
    captureServerSecurityEvent('auth_failure', {
      ...context,
      error: error.message,
    }, 'error');

    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
```

### Tracking in Client Components

```typescript
// src/components/LoginForm.tsx
import { setSentryUser, addSentryBreadcrumb } from '@/lib/sentry.client.config';

export function LoginForm() {
  const handleLogin = async (email, password) => {
    try {
      addSentryBreadcrumb('Login attempt', 'auth', 'info');

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        setSentryUser(data.userId, email);
        addSentryBreadcrumb('Login successful', 'auth', 'info');
      }
    } catch (error) {
      addSentryBreadcrumb('Login failed', 'auth', 'error');
      throw error;
    }
  };

  return <form onSubmit={handleLogin}>...</form>;
}
```

### Tracking Input Validation

```typescript
// src/lib/input-validation.ts
import { securityEventTracker } from '@/lib/security-event-tracker';

export function validateAndSanitize<T>(schema: z.ZodSchema<T>, data: unknown) {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Track validation failure
      error.errors.forEach((err) => {
        securityEventTracker.trackValidationFailure(
          { endpoint: 'form-submission' },
          err.path.join('.'),
          err.message
        );
      });

      const message = error.errors[0]?.message || 'Validation failed';
      return { success: false, error: message };
    }

    return { success: false, error: 'Invalid input' };
  }
}
```

### Database Operation Tracking

```typescript
// src/app/api/products/route.ts
import { trackDatabaseOperation } from '@/lib/sentry.server.config';

export async function GET() {
  const startTime = Date.now();

  try {
    const products = await prisma.product.findMany();
    const duration = Date.now() - startTime;

    trackDatabaseOperation('findMany', 'product', duration);

    return NextResponse.json(products);
  } catch (error) {
    const duration = Date.now() - startTime;
    trackDatabaseOperation('findMany', 'product', duration, error);

    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
```

---

## Sentry Dashboard Features

### Issue Tracking

**All Issues**
- Grouped by error type
- Sorted by frequency
- Assigned owners

**Security Issues**
- Tagged with `category: security`
- Event types: CSRF, validation, auth, injection
- Quick resolution

### Performance Monitoring

**Slow Endpoints**
- API endpoint response times
- Database query durations
- Custom operation metrics

**Transaction Breakdown**
- Client-side operations
- Server-side operations
- External requests

### Session Replay

**Automatic Replay**
- 10% of all sessions (production)
- 100% of error sessions
- Video-like playback
- User action timeline

### Alerts & Notifications

**Alert Conditions**
- New error issue
- Error rate threshold
- Performance threshold
- Custom rules

**Notification Channels**
- Email
- Slack
- PagerDuty
- Webhook

---

## Production Deployment

### 1. Create Sentry Project

1. Go to https://sentry.io/auth/login/
2. Create organization (if needed)
3. Create project: Next.js → Next.js
4. Copy DSN

### 2. Configure Environment

Update production `.env`:

```env
NEXT_PUBLIC_SENTRY_DSN=https://[your-dsn]@ingest.sentry.io/[project-id]
SENTRY_DSN=https://[your-dsn]@ingest.sentry.io/[project-id]
SENTRY_AUTH_TOKEN=[your-token]
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### 3. Release Tracking (Optional)

Automatically track releases:

```bash
# Install Sentry CLI
npm install --save-dev @sentry/cli

# Create release before deployment
npx sentry-cli releases -o [org] -p [project] create v1.0.0

# Associate commits
npx sentry-cli releases -o [org] -p [project] set-commits v1.0.0 --auto
```

### 4. Verify Setup

Test error tracking:

```bash
# Send test event
curl https://[key]@[domain].ingest.sentry.io/api/[projectId]/envelope/ \
  -X POST \
  -H 'Content-Type: application/x-sentry-envelope' \
  -d '{"dsn":"https://[key]@[domain].ingest.sentry.io/[projectId]","sdk":{"name":"test","version":"1.0.0"}}'
```

---

## Performance Impact

### Client-Side Overhead

| Metric | Value |
|--------|-------|
| SDK Size | ~50 KB (gzipped) |
| Initialization | < 100ms |
| Error Capture | ~10ms |
| Performance Impact | < 1% |

### Server-Side Overhead

| Operation | Duration |
|-----------|----------|
| Event Capture | 5-10ms |
| Breadcrumb Add | < 1ms |
| Flush on Shutdown | 100-500ms |

---

## Security & Privacy

### Data Protection

**Masking:**
- Authorization headers: `[REDACTED]`
- Cookies: `[REDACTED]`
- Email addresses: `u***@example.com`

**Filtering:**
- Health check requests excluded
- Internal API calls filtered
- User session data limited

### Compliance

- **GDPR**: Compliant with data retention controls
- **SOC 2**: Certified infrastructure
- **Data Centers**: EU, US, and regional options

---

## Troubleshooting

### Sentry Not Capturing Events

**Check:**
1. DSN is correct in `.env`
2. Network requests to Sentry endpoint succeed
3. `initSentryClient()` is called
4. Error is not in `ignoreErrors` list

**Debug:**
```typescript
// Enable debug mode
process.env.DEBUG = 'sentry:*'

// Test capture
Sentry.captureException(new Error('test'))
```

### Performance Issues

**Reduce sampling:**
```typescript
tracesSampleRate: 0.05 // 5% sampling
replaysSessionSampleRate: 0.05 // 5% replay
```

**Exclude endpoints:**
```typescript
beforeSend(event) {
  if (event.request?.url?.includes('/health')) {
    return null; // Don't send
  }
  return event;
}
```

### Missing Stack Traces

**Ensure:**
1. `attachStacktrace: true` is set
2. Source maps are uploaded to Sentry
3. Code isn't minified without source maps

---

## Next Steps

1. **Setup Sentry Project** - Create account and get DSN
2. **Configure Environment** - Add DSN to `.env.local`
3. **Test Integration** - Verify events are captured
4. **Setup Alerts** - Configure email/Slack notifications
5. **Create Dashboards** - Custom views for metrics
6. **Monitor Production** - Regular review of issues

---

## Resources

- **Sentry Docs**: https://docs.sentry.io/
- **Next.js Integration**: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **Performance Monitoring**: https://docs.sentry.io/platforms/javascript/guides/nextjs/performance/
- **Session Replay**: https://docs.sentry.io/platforms/javascript/guides/nextjs/session-replay/

---

## File Structure

```
ceo-monorepo/apps/web/src/
├── lib/
│   ├── sentry.client.config.ts           (200+ lines)
│   ├── sentry.server.config.ts           (220+ lines)
│   ├── security-event-tracker.ts         (200+ lines)
│   └── csrf-middleware-with-monitoring.ts (100+ lines)
├── instrumentation.ts                    (15+ lines)
└── middleware.ts                         (modified for Sentry)

docs/
└── 10_Sentry_Integration.md             (comprehensive guide)
```

**Total Implementation**: 750+ lines of code

---

**Status**: ✅ Configuration complete, ready for deployment
**Next Phase**: Monitor production metrics and adjust sampling rates
