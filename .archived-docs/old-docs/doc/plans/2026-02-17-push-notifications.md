# Push Notification Infrastructure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement production-ready push notification infrastructure for CEO團購電商平台, supporting both FCM (Android) and APNs (iOS) with device token management and notification sending capabilities.

**Architecture:** Add DeviceToken Prisma model to store user-device mappings, create push notification service using Expo Server SDK for React Native notifications, implement API endpoints for token registration and notification sending, and configure environment variables for FCM/APNs credentials.

**Tech Stack:** Next.js API Routes, Prisma, Expo Server SDK (@expo/server-sdk), Firebase Admin SDK (optional), APNs (via Expo), React Native Expo Notifications.

---

### Task 1: Database Model for Device Tokens

**Files:**
- Modify: `ceo-platform/prisma/schema.prisma:381` (end of file)
- Create: `ceo-platform/prisma/migrations/20260217_add_device_token/migration.sql` (via Prisma)
- Test: `ceo-platform/__tests__/models/device-token.test.ts`

**Step 1: Write the failing test**

```typescript
// ceo-platform/__tests__/models/device-token.test.ts
import { PrismaClient } from '@prisma/client';
import { describe, expect, test, beforeAll, afterAll } from 'vitest';

describe('DeviceToken Model', () => {
  const prisma = new PrismaClient();

  test('should create device token with required fields', async () => {
    const user = await prisma.user.create({
      data: { email: 'test@example.com', password: 'temp' }
    });
    const deviceToken = await prisma.deviceToken.create({
      data: {
        userId: user.id,
        token: 'ExponentPushToken[xxxxxxxxxxxx]',
        platform: 'IOS',
        deviceId: 'device123',
        isActive: true
      }
    });
    expect(deviceToken.token).toBe('ExponentPushToken[xxxxxxxxxxxx]');
    expect(deviceToken.platform).toBe('IOS');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd ceo-platform && pnpm test __tests__/models/device-token.test.ts -v`
Expected: FAIL with "model DeviceToken not found"

**Step 3: Write minimal implementation**

Add to `ceo-platform/prisma/schema.prisma`:

```prisma
enum DevicePlatform {
  IOS
  ANDROID
  WEB
}

model DeviceToken {
  id        String         @id @default(cuid())
  userId    String
  token     String         @unique
  platform  DevicePlatform
  deviceId  String?        // Optional device identifier
  isActive  Boolean        @default(true)
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt

  user      User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([platform])
  @@index([isActive])
  @@map("device_tokens")
}
```

**Step 4: Run migration and test to verify it passes**

Run: `cd ceo-platform && pnpm db:push`
Run: `cd ceo-platform && pnpm test __tests__/models/device-token.test.ts -v`
Expected: PASS

**Step 5: Commit**

```bash
git add ceo-platform/prisma/schema.prisma
git add ceo-platform/__tests__/models/device-token.test.ts
git commit -m "feat: add DeviceToken model"
```

---

### Task 2: Environment Configuration

**Files:**
- Modify: `ceo-platform/.env.local.example`
- Modify: `ceo-platform/.env.local` (local development)
- Create: `ceo-platform/src/config/push-notifications.ts`

**Step 1: Add environment variables template**

Add to `ceo-platform/.env.local.example`:

```
# Expo Push Notifications
EXPO_ACCESS_TOKEN=your_expo_access_token_here

# Firebase Cloud Messaging (FCM) - optional for direct FCM
FCM_SERVER_KEY=your_fcm_server_key_here
FCM_SENDER_ID=your_fcm_sender_id_here

# Apple Push Notifications (APNs) - handled by Expo
# APNS_KEY_ID=your_apns_key_id_here
# APNS_TEAM_ID=your_apns_team_id_here
# APNS_AUTH_KEY=your_apns_auth_key_here
```

**Step 2: Create configuration module**

```typescript
// ceo-platform/src/config/push-notifications.ts
export const pushNotificationConfig = {
  expo: {
    accessToken: process.env.EXPO_ACCESS_TOKEN,
  },
  fcm: {
    serverKey: process.env.FCM_SERVER_KEY,
    senderId: process.env.FCM_SENDER_ID,
  },
} as const;

export function validatePushNotificationConfig() {
  if (!pushNotificationConfig.expo.accessToken) {
    throw new Error('EXPO_ACCESS_TOKEN is required for push notifications');
  }
}
```

**Step 3: Test configuration validation**

Create test file `ceo-platform/__tests__/config/push-notifications.test.ts`:

```typescript
import { pushNotificationConfig, validatePushNotificationConfig } from '@/config/push-notifications';
import { describe, expect, test, vi } from 'vitest';

describe('pushNotificationConfig', () => {
  test('should have expo access token from env', () => {
    expect(pushNotificationConfig.expo).toBeDefined();
  });
});
```

**Step 4: Run test to verify configuration structure**

Run: `cd ceo-platform && pnpm test __tests__/config/push-notifications.test.ts -v`
Expected: PASS (if EXPO_ACCESS_TOKEN is set in test environment)

**Step 5: Commit**

```bash
git add ceo-platform/.env.local.example
git add ceo-platform/src/config/push-notifications.ts
git add ceo-platform/__tests__/config/push-notifications.test.ts
git commit -m "feat: add push notification environment configuration"
```

---

### Task 3: Expo Push Notification Service

**Files:**
- Create: `ceo-platform/src/lib/push-notifications/expo-service.ts`
- Create: `ceo-platform/src/lib/push-notifications/types.ts`
- Test: `ceo-platform/__tests__/lib/push-notifications/expo-service.test.ts`

**Step 1: Install dependencies**

Run: `cd ceo-platform && pnpm add @expo/server-sdk`

**Step 2: Create types**

```typescript
// ceo-platform/src/lib/push-notifications/types.ts
export interface PushNotificationPayload {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string; // Android channel
}

export interface SendNotificationResult {
  success: boolean;
  receiptId?: string;
  error?: string;
}

export interface DeviceTokenInfo {
  id: string;
  token: string;
  platform: 'IOS' | 'ANDROID' | 'WEB';
  userId: string;
  deviceId?: string;
}
```

**Step 3: Create Expo service**

```typescript
// ceo-platform/src/lib/push-notifications/expo-service.ts
import { Expo } from '@expo/server-sdk';
import { pushNotificationConfig } from '@/config/push-notifications';
import type { PushNotificationPayload, SendNotificationResult } from './types';

export class ExpoPushNotificationService {
  private expo: Expo;

  constructor() {
    const accessToken = pushNotificationConfig.expo.accessToken;
    if (!accessToken) {
      throw new Error('EXPO_ACCESS_TOKEN is not configured');
    }
    this.expo = new Expo({ accessToken });
  }

  async sendNotification(payload: PushNotificationPayload): Promise<SendNotificationResult> {
    try {
      const chunks = this.expo.chunkPushNotifications([payload]);
      const receipts = [];
      
      for (const chunk of chunks) {
        const chunkReceipts = await this.expo.sendPushNotificationsAsync(chunk);
        receipts.push(...chunkReceipts);
      }

      const receipt = receipts[0];
      if (receipt.status === 'ok') {
        return { success: true, receiptId: receipt.id };
      } else {
        return { 
          success: false, 
          error: receipt.details?.error || 'Unknown error' 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  validateToken(token: string): boolean {
    return Expo.isExpoPushToken(token);
  }
}
```

**Step 4: Write tests**

```typescript
// ceo-platform/__tests__/lib/push-notifications/expo-service.test.ts
import { ExpoPushNotificationService } from '@/lib/push-notifications/expo-service';
import { describe, expect, test, vi, beforeAll } from 'vitest';

describe('ExpoPushNotificationService', () => {
  let service: ExpoPushNotificationService;

  beforeAll(() => {
    process.env.EXPO_ACCESS_TOKEN = 'test-token';
    service = new ExpoPushNotificationService();
  });

  test('should validate Expo push tokens', () => {
    expect(service.validateToken('ExponentPushToken[xxxxxxxxxxxx]')).toBe(true);
    expect(service.validateToken('invalid-token')).toBe(false);
  });
});
```

**Step 5: Run tests**

Run: `cd ceo-platform && pnpm test __tests__/lib/push-notifications/expo-service.test.ts -v`
Expected: PASS

**Step 6: Commit**

```bash
git add ceo-platform/src/lib/push-notifications/
git add ceo-platform/__tests__/lib/push-notifications/
git add ceo-platform/package.json
git add ceo-platform/pnpm-lock.yaml
git commit -m "feat: implement Expo push notification service"
```

---

### Task 4: Device Token Management API

**Files:**
- Create: `ceo-platform/src/app/api/notifications/tokens/route.ts`
- Create: `ceo-platform/src/app/api/notifications/tokens/[id]/route.ts`
- Test: `ceo-platform/__tests__/api/notifications/tokens.test.ts`

**Step 1: Create token registration endpoint**

```typescript
// ceo-platform/src/app/api/notifications/tokens/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authHelper } from '@/lib/auth-helper';
import { z } from 'zod';

const tokenSchema = z.object({
  token: z.string().min(10),
  platform: z.enum(['IOS', 'ANDROID', 'WEB']),
  deviceId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await authHelper(request);
    if (!user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 });
    }

    const body = await request.json();
    const validated = tokenSchema.parse(body);

    // Check if token already exists for this user
    const existing = await prisma.deviceToken.findFirst({
      where: {
        userId: user.id,
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
        userId: user.id,
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

**Step 2: Create token deletion endpoint**

```typescript
// ceo-platform/src/app/api/notifications/tokens/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authHelper } from '@/lib/auth-helper';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authHelper(request);
    if (!user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 });
    }

    const { id } = await params;
    
    // Verify token belongs to user
    const token = await prisma.deviceToken.findFirst({
      where: { id, userId: user.id },
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

**Step 3: Write API tests**

```typescript
// ceo-platform/__tests__/api/notifications/tokens.test.ts
import { describe, expect, test, vi, beforeAll, afterAll } from 'vitest';
import { GET, POST, DELETE } from '@/app/api/notifications/tokens/route';
import { createMocks } from 'node-mocks-http';

describe('Notifications Tokens API', () => {
  test('POST should require authentication', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {},
    });
    // ... test implementation
  });
});
```

**Step 4: Run tests**

Run: `cd ceo-platform && pnpm test __tests__/api/notifications/tokens.test.ts -v`
Expected: PASS

**Step 5: Commit**

```bash
git add ceo-platform/src/app/api/notifications/
git add ceo-platform/__tests__/api/notifications/
git commit -m "feat: add device token management API endpoints"
```

---

### Task 5: Notification Sending API

**Files:**
- Create: `ceo-platform/src/app/api/notifications/send/route.ts`
- Create: `ceo-platform/src/lib/push-notifications/notification-service.ts`
- Test: `ceo-platform/__tests__/api/notifications/send.test.ts`

**Step 1: Create notification service**

```typescript
// ceo-platform/src/lib/push-notifications/notification-service.ts
import { prisma } from '@/lib/prisma';
import { ExpoPushNotificationService } from './expo-service';

export class NotificationService {
  private expoService: ExpoPushNotificationService;

  constructor() {
    this.expoService = new ExpoPushNotificationService();
  }

  async sendToUser(userId: string, title: string, body: string, data?: Record<string, any>) {
    const tokens = await prisma.deviceToken.findMany({
      where: { userId, isActive: true },
    });

    const results = [];
    for (const token of tokens) {
      const result = await this.expoService.sendNotification({
        to: token.token,
        title,
        body,
        data,
      });
      results.push({ tokenId: token.id, ...result });
    }

    return results;
  }

  async sendToAllUsers(title: string, body: string, data?: Record<string, any>) {
    const tokens = await prisma.deviceToken.findMany({
      where: { isActive: true },
      take: 100, // Limit for batch sending
    });

    const results = [];
    for (const token of tokens) {
      const result = await this.expoService.sendNotification({
        to: token.token,
        title,
        body,
        data,
      });
      results.push({ tokenId: token.id, ...result });
    }

    return results;
  }
}
```

**Step 2: Create send notification endpoint (admin only)**

```typescript
// ceo-platform/src/app/api/notifications/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authHelper } from '@/lib/auth-helper';
import { NotificationService } from '@/lib/push-notifications/notification-service';
import { z } from 'zod';

const sendSchema = z.object({
  userId: z.string().optional(),
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  data: z.record(z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await authHelper(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 });
    }

    const body = await request.json();
    const validated = sendSchema.parse(body);

    const notificationService = new NotificationService();
    let results;

    if (validated.userId) {
      results = await notificationService.sendToUser(
        validated.userId,
        validated.title,
        validated.body,
        validated.data
      );
    } else {
      results = await notificationService.sendToAllUsers(
        validated.title,
        validated.body,
        validated.data
      );
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    return NextResponse.json({
      message: `通知發送完成`,
      summary: {
        total: results.length,
        success: successCount,
        failure: failureCount,
      },
      results,
    });
  } catch (error) {
    console.error('Notification send error:', error);
    return NextResponse.json({ 
      error: '發送失敗', 
      details: error instanceof Error ? error.message : '未知錯誤' 
    }, { status: 400 });
  }
}
```

**Step 3: Write tests**

```typescript
// ceo-platform/__tests__/api/notifications/send.test.ts
// Test admin authorization and sending logic
```

**Step 4: Run tests**

Run: `cd ceo-platform && pnpm test __tests__/api/notifications/send.test.ts -v`
Expected: PASS

**Step 5: Commit**

```bash
git add ceo-platform/src/app/api/notifications/send/
git add ceo-platform/src/lib/push-notifications/notification-service.ts
git add ceo-platform/__tests__/api/notifications/send.test.ts
git commit -m "feat: add notification sending API for administrators"
```

---

### Task 6: Mobile App Integration (React Native)

**Files:**
- Modify: `ceo-monorepo/apps/mobile/src/hooks/usePushNotifications.ts`
- Modify: `ceo-monorepo/apps/mobile/src/stores/useNotificationStore.ts`
- Create: `ceo-monorepo/apps/mobile/src/services/notification-api.ts`

**Step 1: Install Expo Notifications in mobile app**

Run: `cd ceo-monorepo/apps/mobile && pnpm add expo-notifications`

**Step 2: Create notification API service**

```typescript
// ceo-monorepo/apps/mobile/src/services/notification-api.ts
import { apiClient } from '@/lib/api-client';

export const notificationApi = {
  registerToken: async (token: string, platform: 'IOS' | 'ANDROID' | 'WEB', deviceId?: string) => {
    return apiClient.post('/notifications/tokens', {
      token,
      platform,
      deviceId,
    });
  },

  unregisterToken: async (tokenId: string) => {
    return apiClient.delete(`/notifications/tokens/${tokenId}`);
  },
};
```

**Step 3: Create React Native notification hook**

```typescript
// ceo-monorepo/apps/mobile/src/hooks/usePushNotifications.ts
import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { notificationApi } from '@/services/notification-api';
import { useAuth } from './useAuth';

export function usePushNotifications() {
  const { user } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  useEffect(() => {
    if (expoPushToken && user) {
      registerTokenWithBackend(expoPushToken);
    }
  }, [expoPushToken, user]);

  async function registerForPushNotificationsAsync() {
    let token;
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    
    token = (await Notifications.getExpoPushTokenAsync()).data;
    setExpoPushToken(token);
  }

  async function registerTokenWithBackend(token: string) {
    try {
      const platform = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
      await notificationApi.registerToken(token, platform);
      setRegistered(true);
    } catch (error) {
      console.error('Failed to register token with backend:', error);
    }
  }

  return { expoPushToken, registered };
}
```

**Step 4: Configure notification handling**

```typescript
// ceo-monorepo/apps/mobile/App.tsx additions
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
```

**Step 5: Test mobile integration**

Run: `cd ceo-monorepo/apps/mobile && pnpm test src/hooks/usePushNotifications.test.tsx`
Expected: PASS

**Step 6: Commit**

```bash
git add ceo-monorepo/apps/mobile/
git commit -m "feat: integrate push notifications in mobile app"
```

---

### Task 7: Documentation and Environment Setup Guide

**Files:**
- Create: `ceo-platform/docs/push-notifications-setup.md`
- Update: `ceo-platform/README.md`
- Update: `ceo-platform/.env.local.example`

**Step 1: Create comprehensive setup guide**

```markdown
# Push Notifications Setup Guide

## 1. Expo Push Notifications
1. Create Expo account at https://expo.dev
2. Create new project or use existing
3. Get Expo Access Token from https://expo.dev/accounts/xxx/settings/access-tokens
4. Set EXPO_ACCESS_TOKEN in .env.local

## 2. Firebase Cloud Messaging (Optional)
1. Create Firebase project at https://console.firebase.google.com
2. Add Android app and get Server Key from Project Settings > Cloud Messaging
3. Set FCM_SERVER_KEY and FCM_SENDER_ID in .env.local

## 3. Apple Push Notifications (via Expo)
1. Ensure Apple Developer account with push notifications capability
2. Configure in Expo dashboard: https://expo.dev/notifications
3. Upload APNs key or certificate through Expo

## 4. Testing
1. Run `pnpm test` to verify all tests pass
2. Use Expo Go app to test notifications on physical device
3. Test API endpoints with curl or Postman
```

**Step 2: Update README**

Add "Push Notifications" section linking to setup guide.

**Step 3: Commit**

```bash
git add ceo-platform/docs/push-notifications-setup.md
git add ceo-platform/README.md
git commit -m "docs: add push notifications setup guide"
```

---

## Execution Handoff

Plan complete and saved to `docs/plans/2026-02-17-push-notifications.md`.

Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**