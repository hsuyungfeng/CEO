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
      createdAt: '2026-02-17T10:32:23.048Z',
      updatedAt: '2026-02-17T10:32:23.048Z',
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
      createdAt: '2026-02-17T10:32:23.053Z',
      updatedAt: '2026-02-17T10:32:23.053Z',
    };
    mockPrisma.deviceToken.findFirst.mockResolvedValue(existingToken);
    const updatedToken = { 
      ...existingToken, 
      deviceId: 'newDevice', 
      updatedAt: '2026-02-17T10:32:23.054Z' 
    };
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
      createdAt: '2026-02-17T10:32:23.055Z',
      updatedAt: '2026-02-17T10:32:23.055Z',
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