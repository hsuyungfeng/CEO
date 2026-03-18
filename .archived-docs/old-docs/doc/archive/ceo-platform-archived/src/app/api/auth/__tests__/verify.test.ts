import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { POST } from '../verify/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    emailVerification: {
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    emailVerificationAttempt: {
      findUnique: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('POST /api/auth/email/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should verify valid token and update user', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      emailVerified: false,
    };

    const mockVerification = {
      id: 'verify-123',
      email: 'test@example.com',
      token: 'valid-token-123',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      purpose: 'VERIFY_EMAIL',
      userId: 'user-123',
      createdAt: new Date(),
      user: mockUser,
    };

    (prisma.emailVerification.findUnique as Mock).mockResolvedValueOnce(mockVerification);
    (prisma.user.update as Mock).mockResolvedValueOnce({
      ...mockUser,
      emailVerified: true,
    });
    (prisma.emailVerification.delete as Mock).mockResolvedValueOnce({});
    (prisma.emailVerificationAttempt.deleteMany as Mock).mockResolvedValueOnce({
      count: 0,
    });

    const req = new NextRequest('http://localhost:3000/api/auth/email/verify', {
      method: 'POST',
      body: JSON.stringify({ token: 'valid-token-123' }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toContain('驗證成功');
    expect(data.userId).toBe('user-123');
  });

  it('should reject invalid token', async () => {
    (prisma.emailVerification.findUnique as Mock).mockResolvedValueOnce(null);

    const req = new NextRequest('http://localhost:3000/api/auth/email/verify', {
      method: 'POST',
      body: JSON.stringify({ token: 'invalid-token' }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('無效');
  });

  it('should reject expired token', async () => {
    const mockVerification = {
      id: 'verify-123',
      email: 'test@example.com',
      token: 'expired-token',
      expiresAt: new Date(Date.now() - 1000),
      purpose: 'VERIFY_EMAIL',
      userId: 'user-123',
      createdAt: new Date(),
      user: null,
    };

    (prisma.emailVerification.findUnique as Mock).mockResolvedValueOnce(mockVerification);
    (prisma.emailVerification.delete as Mock).mockResolvedValueOnce({});
    (prisma.emailVerificationAttempt.findUnique as Mock).mockResolvedValueOnce(null);
    (prisma.emailVerificationAttempt.upsert as Mock).mockResolvedValueOnce({
      email: 'test@example.com',
      attempts: 1,
      updatedAt: new Date(),
    });

    const req = new NextRequest('http://localhost:3000/api/auth/email/verify', {
      method: 'POST',
      body: JSON.stringify({ token: 'expired-token' }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('過期');
  });

  it('should track verification attempts and enforce max attempts', async () => {
    (prisma.emailVerification.findUnique as Mock).mockResolvedValue(null);
    (prisma.emailVerificationAttempt.findUnique as Mock).mockResolvedValueOnce({
      email: 'test@example.com',
      attempts: 3,
      updatedAt: new Date(),
    });

    const req = new NextRequest('http://localhost:3000/api/auth/email/verify', {
      method: 'POST',
      body: JSON.stringify({ token: 'invalid-token' }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('should reset attempts on successful verification', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      emailVerified: false,
    };

    const mockVerification = {
      id: 'verify-123',
      email: 'test@example.com',
      token: 'valid-token',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      purpose: 'VERIFY_EMAIL',
      userId: 'user-123',
      createdAt: new Date(),
      user: mockUser,
    };

    (prisma.emailVerification.findUnique as Mock).mockResolvedValueOnce(mockVerification);
    (prisma.user.update as Mock).mockResolvedValueOnce({
      ...mockUser,
      emailVerified: true,
    });
    (prisma.emailVerification.delete as Mock).mockResolvedValueOnce({});
    (prisma.emailVerificationAttempt.deleteMany as Mock).mockResolvedValueOnce({
      count: 1,
    });

    const req = new NextRequest('http://localhost:3000/api/auth/email/verify', {
      method: 'POST',
      body: JSON.stringify({ token: 'valid-token' }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    // Verify that deleteMany was called to reset attempts
    expect(
      (prisma.emailVerificationAttempt.deleteMany as Mock).mock.calls.some(
        (call: any) => call[0].where.email === 'test@example.com'
      )
    ).toBe(true);
  });

  it('should handle RESET_PASSWORD purpose', async () => {
    const mockVerification = {
      id: 'verify-123',
      email: 'test@example.com',
      token: 'reset-token',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      purpose: 'RESET_PASSWORD',
      userId: null,
      createdAt: new Date(),
      user: null,
    };

    (prisma.emailVerification.findUnique as Mock).mockResolvedValueOnce(mockVerification);
    (prisma.emailVerification.delete as Mock).mockResolvedValueOnce({});
    (prisma.emailVerificationAttempt.deleteMany as Mock).mockResolvedValueOnce({
      count: 0,
    });

    const req = new NextRequest('http://localhost:3000/api/auth/email/verify', {
      method: 'POST',
      body: JSON.stringify({ token: 'reset-token' }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.purpose).toBe('RESET_PASSWORD');
  });

  it('should reject empty token', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/email/verify', {
      method: 'POST',
      body: JSON.stringify({ token: '' }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('should handle missing token in request body', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/email/verify', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
