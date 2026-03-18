# Device Token Management API Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create API endpoints for device token registration and deletion.

**Architecture:** Implement POST endpoint at `/api/notifications/tokens` for registering/updating device tokens, and DELETE endpoint at `/api/notifications/tokens/[id]` for deleting tokens. Use Next.js Route Handlers with authentication via `auth()`, Zod validation, and Prisma for database operations.

**Tech Stack:** Next.js 16, NextAuth, Prisma, Zod, Vitest.

---

### Task 1: Create token registration endpoint

**Files:**
- Create: `src/app/api/notifications/tokens/route.ts`

**Step 1: Create directory and file**

Create the nested directories `notifications/tokens` under `src/app/api`. Then create `route.ts` with the following content:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { DevicePlatform } from '@prisma/client';
import { z } from 'zod';

const tokenSchema = z.object({
  token: z.string().min(10),
  platform: z.nativeEnum(DevicePlatform),
  deviceId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 });
    }

    const body = await request.json();
    const validated = tokenSchema.parse(body);

    // Check if token already exists for this user
    const existing = await prisma.deviceToken.findFirst({
      where: {
        userId: session.user.id,
        token: validated.token,
      },
    });

    if (existing) {
      // Update existing token
      const updated = await prisma.deviceToken.update({
        where: { id: existing.id },
        data: {
          platform: validated.platform,
          deviceId: validated.deviceId,
          isActive: true,
          updatedAt: new Date(),
        },
      });
      return NextResponse.json({ 
        message: '裝置令牌已更新', 
        token: updated 
      });
    }

    // Create new token
    const deviceToken = await prisma.deviceToken.create({
      data: {
        userId: session.user.id,
        token: validated.token,
        platform: validated.platform,
        deviceId: validated.deviceId,
        isActive: true,
      },
    });

    return NextResponse.json({ 
      message: '裝置令牌已註冊', 
      token: deviceToken 
    }, { status: 201 });
  } catch (error) {
    console.error('Token registration error:', error);
    return NextResponse.json({ 
      error: '註冊失敗', 
      details: error instanceof Error ? error.message : '未知錯誤' 
    }, { status: 400 });
  }
}
```

**Step 2: Verify file creation**

Run: `ls -la src/app/api/notifications/tokens/route.ts`
Expected: File exists.

---

### Task 2: Create token deletion endpoint

**Files:**
- Create: `src/app/api/notifications/tokens/[id]/route.ts`

**Step 1: Create directory and file**

Create the nested directory `[id]` under `src/app/api/notifications/tokens`. Then create `route.ts` with the following content:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 });
    }

    const { id } = await params;
    
    // Verify token belongs to user
    const token = await prisma.deviceToken.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!token) {
      return NextResponse.json({ error: '裝置令牌不存在' }, { status: 404 });
    }

    await prisma.deviceToken.delete({ where: { id } });

    return NextResponse.json({ message: '裝置令牌已刪除' });
  } catch (error) {
    console.error('Token deletion error:', error);
    return NextResponse.json({ 
      error: '刪除失敗', 
      details: error instanceof Error ? error.message : '未知錯誤' 
    }, { status: 400 });
  }
}
```

**Step 2: Verify file creation**

Run: `ls -la src/app/api/notifications/tokens/[id]/route.ts`
Expected: File exists.

---

### Task 3: Write API tests

**Files:**
- Create: `src/__tests__/api/notifications/tokens.test.ts`

**Step 1: Create test directory and file**

Create directories `src/__tests__/api/notifications`. Then create `tokens.test.ts` with the following content:

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/notifications/tokens/route';
import { DELETE } from '@/app/api/notifications/tokens/[id]/route';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    deviceToken: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const mockAuth = auth as any;
const mockPrisma = prisma as any;

function createRequest(url: string, options?: any) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options);
}

describe('POST /api/notifications/tokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const req = createRequest('/api/notifications/tokens', {
      method: 'POST',
      body: JSON.stringify({ token: 'token123', platform: 'IOS' }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('未授權');
  });

  it('should return 400 for invalid request body', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });

    const req = createRequest('/api/notifications/tokens', {
      method: 'POST',
      body: JSON.stringify({ token: 'short', platform: 'INVALID' }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('註冊失敗');
  });

  it('should create new token when token does not exist', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    mockPrisma.deviceToken.findFirst.mockResolvedValue(null);
    const mockToken = {
      id: 'token-1',
      userId: 'user-1',
      token: 'ExponentPushToken[abc]',
      platform: 'IOS',
      deviceId: 'device123',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockPrisma.deviceToken.create.mockResolvedValue(mockToken);

    const req = createRequest('/api/notifications/tokens', {
      method: 'POST',
      body: JSON.stringify({ token: 'ExponentPushToken[abc]', platform: 'IOS', deviceId: 'device123' }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.message).toBe('裝置令牌已註冊');
    expect(body.token).toEqual(mockToken);
    expect(mockPrisma.deviceToken.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        token: 'ExponentPushToken[abc]',
        platform: 'IOS',
        deviceId: 'device123',
        isActive: true,
      },
    });
  });

  it('should update existing token when token already exists', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    const existingToken = {
      id: 'token-1',
      userId: 'user-1',
      token: 'ExponentPushToken[abc]',
      platform: 'IOS',
      deviceId: 'oldDevice',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockPrisma.deviceToken.findFirst.mockResolvedValue(existingToken);
    const updatedToken = { ...existingToken, deviceId: 'newDevice', updatedAt: new Date() };
    mockPrisma.deviceToken.update.mockResolvedValue(updatedToken);

    const req = createRequest('/api/notifications/tokens', {
      method: 'POST',
      body: JSON.stringify({ token: 'ExponentPushToken[abc]', platform: 'IOS', deviceId: 'newDevice' }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toBe('裝置令牌已更新');
    expect(body.token).toEqual(updatedToken);
    expect(mockPrisma.deviceToken.update).toHaveBeenCalledWith({
      where: { id: 'token-1' },
      data: {
        platform: 'IOS',
        deviceId: 'newDevice',
        isActive: true,
        updatedAt: expect.any(Date),
      },
    });
  });
});

describe('DELETE /api/notifications/tokens/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const req = createRequest('/api/notifications/tokens/token-1');
    const res = await DELETE(req, { params: Promise.resolve({ id: 'token-1' }) });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('未授權');
  });

  it('should return 404 when token does not exist or belongs to another user', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    mockPrisma.deviceToken.findFirst.mockResolvedValue(null);

    const req = createRequest('/api/notifications/tokens/token-1');
    const res = await DELETE(req, { params: Promise.resolve({ id: 'token-1' }) });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('裝置令牌不存在');
  });

  it('should delete token when token belongs to user', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    const token = {
      id: 'token-1',
      userId: 'user-1',
      token: 'ExponentPushToken[abc]',
      platform: 'IOS',
      deviceId: 'device123',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockPrisma.deviceToken.findFirst.mockResolvedValue(token);
    mockPrisma.deviceToken.delete.mockResolvedValue(token);

    const req = createRequest('/api/notifications/tokens/token-1');
    const res = await DELETE(req, { params: Promise.resolve({ id: 'token-1' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toBe('裝置令牌已刪除');
    expect(mockPrisma.deviceToken.delete).toHaveBeenCalledWith({ where: { id: 'token-1' } });
  });
});
```

**Step 2: Verify file creation**

Run: `ls -la src/__tests__/api/notifications/tokens.test.ts`
Expected: File exists.

---

### Task 4: Run tests

**Step 1: Run the test suite**

Run: `cd ceo-platform && pnpm test src/__tests__/api/notifications/tokens.test.ts -v`
Expected: All tests pass.

**Step 2: Run lint and typecheck**

Run: `cd ceo-platform && pnpm lint`
Expected: No errors.

Run: `cd ceo-platform && pnpm typecheck`
Expected: No errors.

---

### Task 5: Optional - Create auth helper (if needed)

**Files:**
- Create: `src/lib/auth-helper.ts` (only if not exists)

**Step 1: Check if file exists**

Run: `ls -la src/lib/auth-helper.ts`
If file exists, skip. If not, create with content:

```typescript
import { auth } from '@/auth';
import { NextRequest } from 'next/server';

/**
 * Helper to get authenticated user from request
 * Returns user object or null if not authenticated
 */
export async function authHelper(request: NextRequest) {
  try {
    const session = await auth();
    return session?.user || null;
  } catch (error) {
    console.error('Auth helper error:', error);
    return null;
  }
}
```

**Step 2: Verify file creation**

Run: `cat src/lib/auth-helper.ts`
Expected: File content matches.

---

**Deliverables:**
1. POST endpoint at `/api/notifications/tokens`
2. DELETE endpoint at `/api/notifications/tokens/[id]`
3. Test file with comprehensive tests
4. All tests passing
5. Lint and typecheck passing

**Notes:**
- Use existing patterns from `src/app/api/cart/route.ts` for authentication.
- Use Zod validation with `nativeEnum` for DevicePlatform.
- Ensure Chinese error messages as in existing routes.
- Use `@/` alias for imports.
- Follow the existing test mocking pattern.