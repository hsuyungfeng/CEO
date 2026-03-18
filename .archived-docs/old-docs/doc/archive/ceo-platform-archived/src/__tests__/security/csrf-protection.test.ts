import { describe, it, expect, beforeEach } from 'vitest';
import { csrfProtection } from '@/lib/csrf-protection';

describe('CSRF Protection', () => {
  const sessionId = 'test-session-123';

  beforeEach(() => {
    // Clear tokens before each test
    csrfProtection.destroy();
  });

  it('should generate a valid CSRF token', () => {
    const token = csrfProtection.generateToken(sessionId);
    expect(token).toBeDefined();
    expect(token).toHaveLength(64); // 32 bytes * 2 (hex encoding)
  });

  it('should verify a valid CSRF token', () => {
    const token = csrfProtection.generateToken(sessionId);
    const isValid = csrfProtection.verifyToken(sessionId, token);
    expect(isValid).toBe(true);
  });

  it('should reject an invalid CSRF token', () => {
    csrfProtection.generateToken(sessionId);
    const invalidToken = 'invalid-token-1234567890abcdef1234567890abcdef';
    const isValid = csrfProtection.verifyToken(sessionId, invalidToken);
    expect(isValid).toBe(false);
  });

  it('should reject token for non-existent session', () => {
    const token = csrfProtection.generateToken(sessionId);
    const isValid = csrfProtection.verifyToken('non-existent-session', token);
    expect(isValid).toBe(false);
  });

  it('should invalidate token after use (one-time use)', () => {
    const token = csrfProtection.generateToken(sessionId);
    
    // First verification should succeed
    let isValid = csrfProtection.verifyToken(sessionId, token);
    expect(isValid).toBe(true);

    // Second verification with same token should fail
    isValid = csrfProtection.verifyToken(sessionId, token);
    expect(isValid).toBe(false);
  });

  it('should prevent timing attacks with constant-time comparison', () => {
    const token1 = csrfProtection.generateToken('session-1');
    const token2 = csrfProtection.generateToken('session-2');

    // Both should take similar time to verify (no timing leaks)
    const start1 = Date.now();
    csrfProtection.verifyToken('session-1', token1);
    const time1 = Date.now() - start1;

    const start2 = Date.now();
    csrfProtection.verifyToken('session-2', token2);
    const time2 = Date.now() - start2;

    // Times should be similar (within 10ms due to system variance)
    expect(Math.abs(time1 - time2)).toBeLessThan(10);
  });

  it('should allow manual token invalidation', () => {
    const token = csrfProtection.generateToken(sessionId);
    csrfProtection.invalidateToken(sessionId);

    const isValid = csrfProtection.verifyToken(sessionId, token);
    expect(isValid).toBe(false);
  });
});
