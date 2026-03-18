/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/notifications/send/route';

// Mock requireAdmin
vi.mock('@/lib/admin-auth', () => ({
  requireAdmin: vi.fn(),
}));

// Mock notification-service - we'll replace prototype methods
vi.mock('@/lib/push-notifications/notification-service', () => {
  const ActualNotificationService = vi.fn();
  return { NotificationService: ActualNotificationService };
});

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { requireAdmin } from '@/lib/admin-auth';
import { NotificationService } from '@/lib/push-notifications/notification-service';
import { logger } from '@/lib/logger';

const mockRequireAdmin = requireAdmin as any;
const mockLogger = logger as any;

// Prototype mocks
let mockSendToUser: any;
let mockSendToAllUsers: any;

function createRequest(url: string, options?: any) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options);
}

describe('POST /api/notifications/send', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Replace prototype methods with fresh mocks
    mockSendToUser = vi.fn();
    mockSendToAllUsers = vi.fn();
    // Assign to prototype so that new instances use these mocks
    (NotificationService as any).prototype.sendToUser = mockSendToUser;
    (NotificationService as any).prototype.sendToAllUsers = mockSendToAllUsers;
  });

  it('should return 401 when not admin', async () => {
    mockRequireAdmin.mockResolvedValue({
      error: {
        status: 401,
        json: () => Promise.resolve({ success: false, error: '未授權，請先登入' }),
      },
    });

    const req = createRequest('/api/notifications/send', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test', body: 'Test body' }),
    });
    const res = (await POST(req))!;
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('未授權，請先登入');
  });

  it('should return 403 when user is not admin', async () => {
    mockRequireAdmin.mockResolvedValue({
      error: {
        status: 403,
        json: () => Promise.resolve({ success: false, error: '權限不足，需要管理員權限' }),
      },
    });

    const req = createRequest('/api/notifications/send', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test', body: 'Test body' }),
    });
    const res = (await POST(req))!;
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('權限不足，需要管理員權限');
  });

  it('should return 400 for invalid request body (missing title)', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });

    const req = createRequest('/api/notifications/send', {
      method: 'POST',
      body: JSON.stringify({ body: 'Test body' }),
    });
    const res = (await POST(req))!;
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe('請求參數驗證失敗');
    expect(body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'title' }),
      ])
    );
  });

  it('should return 400 for invalid request body (title too long)', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });

    const req = createRequest('/api/notifications/send', {
      method: 'POST',
      body: JSON.stringify({ title: 'a'.repeat(101), body: 'Test body' }),
    });
    const res = (await POST(req))!;
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe('請求參數驗證失敗');
    expect(body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'title', message: '標題不能超過100字' }),
      ])
    );
  });

  it('should return 400 for invalid userId format', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });

    const req = createRequest('/api/notifications/send', {
      method: 'POST',
      body: JSON.stringify({ userId: 'invalid', title: 'Test', body: 'Test body' }),
    });
    const res = (await POST(req))!;
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe('請求參數驗證失敗');
    expect(body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'userId', message: '用戶ID格式不正確' }),
      ])
    );
  });

  it('should send notification to specific user successfully', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mockSendToUser.mockResolvedValue([
      { tokenId: 'token-1', success: true, receiptId: 'receipt-1' },
      { tokenId: 'token-2', success: false, error: 'Token not registered' },
    ]);

    const req = createRequest('/api/notifications/send', {
      method: 'POST',
      body: JSON.stringify({ userId: 'clskh6v7d0000x2x2x2x2x2x', title: 'Test Title', body: 'Test Body' }),
    });
    const res = (await POST(req))!;
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe('通知發送完成');
    expect(body.summary).toEqual({
      total: 2,
      success: 1,
      failure: 1,
    });
    expect(body.results).toHaveLength(2);
    expect(mockSendToUser).toHaveBeenCalledWith('clskh6v7d0000x2x2x2x2x2x', 'Test Title', 'Test Body', undefined);
    expect(mockLogger.info).toHaveBeenCalledWith(
      { adminUserId: 'admin-1', targetUserId: 'clskh6v7d0000x2x2x2x2x2x' },
      'Admin sending notification to specific user'
    );
  });

  it('should broadcast notification to all users successfully', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mockSendToAllUsers.mockResolvedValue([
      { tokenId: 'token-1', success: true, receiptId: 'receipt-1' },
      { tokenId: 'token-2', success: true, receiptId: 'receipt-2' },
    ]);

    const req = createRequest('/api/notifications/send', {
      method: 'POST',
      body: JSON.stringify({ title: 'Broadcast', body: 'Hello everyone' }),
    });
    const res = (await POST(req))!;
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe('通知發送完成');
    expect(body.summary).toEqual({
      total: 2,
      success: 2,
      failure: 0,
    });
    expect(body.results).toHaveLength(2);
    expect(mockSendToAllUsers).toHaveBeenCalledWith('Broadcast', 'Hello everyone', undefined);
    expect(mockLogger.info).toHaveBeenCalledWith(
      { adminUserId: 'admin-1' },
      'Admin broadcasting notification to all users'
    );
  });

  it('should handle notification service error gracefully', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mockSendToUser.mockRejectedValue(new Error('Expo service unavailable'));

    const req = createRequest('/api/notifications/send', {
      method: 'POST',
      body: JSON.stringify({ userId: 'clskh6v7d0000x2x2x2x2x2x', title: 'Test', body: 'Test body' }),
    });
    const res = (await POST(req))!;
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe('發送失敗');
    expect(body.details).toBe('Expo service unavailable');
    expect(mockLogger.error).toHaveBeenCalledWith(
      { err: expect.any(Error) },
      'Notification send error'
    );
  });
});