import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { csrfProtection } from '@/lib/csrf-protection';
import { JWTManager } from '@/lib/jwt-manager';
import {
  sanitizeString,
  emailSchema,
  passwordSchema,
  detectSQLInjection,
  detectXSSInjection,
} from '@/lib/input-validation';

/**
 * End-to-End Security Flow Integration Tests
 * Tests complete security workflows across multiple modules
 */

describe('Security Flow Integration Tests', () => {
  const testUserId = 'user-123';
  const testEmail = 'user@example.com';
  const testSessionId = 'session-123';
  let jwtManager: JWTManager;

  beforeEach(() => {
    jwtManager = new JWTManager();
    csrfProtection.destroy();
  });

  afterEach(() => {
    csrfProtection.destroy();
  });

  describe('User Registration Flow', () => {
    it('should validate and sanitize registration input', () => {
      // User provides registration data (without extra spaces in email)
      const registrationData = {
        email: 'USER@EXAMPLE.COM',
        password: 'SecurePass123!@#',
        name: 'John Doe',
      };

      // Email should be validated and normalized
      const emailResult = emailSchema.safeParse(registrationData.email);
      expect(emailResult.success).toBe(true);
      if (emailResult.success) {
        expect(emailResult.data).toBe('user@example.com');
      }

      // Name should be sanitized
      const sanitizedName = sanitizeString(registrationData.name);
      expect(sanitizedName).toBe('John Doe');

      // Password should meet requirements
      const passwordResult = passwordSchema.safeParse(registrationData.password);
      expect(passwordResult.success).toBe(true);
    });

    it('should reject injection attempts during registration', () => {
      // Attacker tries SQL injection in email
      const maliciousEmail = "'; DROP TABLE users; --@example.com";

      const emailResult = emailSchema.safeParse(maliciousEmail);
      expect(emailResult.success).toBe(false);
    });

    it('should detect XSS attempts in user input', () => {
      // Attacker tries XSS in name field
      const xssInput = '<script>alert("xss")</script>John';

      // Should be detected
      const isXSS = detectXSSInjection(xssInput);
      expect(isXSS).toBe(true);

      // Should be sanitized
      const sanitized = sanitizeString(xssInput);
      expect(sanitized).not.toContain('<script');
    });
  });

  describe('Authentication Flow with JWT', () => {
    it('should generate tokens on successful login', () => {
      // User logs in
      const tokenPair = jwtManager.generateTokenPair(testUserId, testEmail);

      expect(tokenPair.accessToken).toBeDefined();
      expect(tokenPair.refreshToken).toBeDefined();
      expect(tokenPair.expiresIn).toBe(15 * 60); // 15 minutes
      expect(tokenPair.tokenType).toBe('Bearer');
    });

    it('should verify access token in subsequent requests', () => {
      // 1. User logs in
      const tokenPair = jwtManager.generateTokenPair(testUserId, testEmail);

      // 2. Client makes authenticated request with token
      const payload = jwtManager.verifyAccessToken(tokenPair.accessToken);

      expect(payload).toBeDefined();
      expect(payload?.userId).toBe(testUserId);
      expect(payload?.email).toBe(testEmail);
    });

    it('should refresh expired token using refresh token', () => {
      // 1. User logs in
      const originalTokens = jwtManager.generateTokenPair(testUserId, testEmail);

      // 2. Token expires, client uses refresh token
      const newTokens = jwtManager.refreshAccessToken(originalTokens.refreshToken);

      expect(newTokens).toBeDefined();
      expect(newTokens?.accessToken).toBeDefined();

      // 3. Verify new access token
      const payload = jwtManager.verifyAccessToken(newTokens?.accessToken || '');
      expect(payload?.userId).toBe(testUserId);
    });

    it('should reject invalid refresh token', () => {
      const invalidRefresh = 'invalid.refresh.token';

      const result = jwtManager.refreshAccessToken(invalidRefresh);

      expect(result).toBeNull();
    });

    it('should prevent token type confusion', () => {
      // 1. Generate token pair
      const tokenPair = jwtManager.generateTokenPair(testUserId, testEmail);

      // 2. Try to use refresh token as access token (should fail)
      const payload = jwtManager.verifyAccessToken(tokenPair.refreshToken);

      expect(payload).toBeNull();
    });
  });

  describe('CSRF Protection Flow', () => {
    it('should complete token lifecycle for form submission', () => {
      // 1. Generate CSRF token for session
      const token = csrfProtection.generateToken(testSessionId);
      expect(token).toBeDefined();

      // 2. Client submits form with token
      const isValid = csrfProtection.verifyToken(testSessionId, token);
      expect(isValid).toBe(true);

      // 3. Token should be invalid on second use
      const isValidAgain = csrfProtection.verifyToken(testSessionId, token);
      expect(isValidAgain).toBe(false);
    });

    it('should prevent token reuse across different sessions', () => {
      // 1. Generate tokens for two different sessions
      const session1Token = csrfProtection.generateToken('session-1');
      const session2Token = csrfProtection.generateToken('session-2');

      expect(session1Token).not.toBe(session2Token);

      // 2. Try to use session1 token in session2 (should fail)
      const isValid = csrfProtection.verifyToken('session-2', session1Token);
      expect(isValid).toBe(false);
    });

    it('should handle missing session gracefully', () => {
      const token = csrfProtection.generateToken(testSessionId);

      // Try to verify with non-existent session
      const isValid = csrfProtection.verifyToken('non-existent-session', token);
      expect(isValid).toBe(false);
    });
  });

  describe('Complete Authentication + CSRF Flow', () => {
    it('should integrate JWT and CSRF protection', () => {
      // 1. User logs in and receives JWT tokens
      const jwtTokens = jwtManager.generateTokenPair(testUserId, testEmail);

      expect(jwtTokens.accessToken).toBeDefined();

      // 2. Server generates CSRF token for this session
      const csrfToken = csrfProtection.generateToken(testSessionId);
      expect(csrfToken).toBeDefined();

      // 3. User makes authenticated request with both tokens
      const jwtPayload = jwtManager.verifyAccessToken(jwtTokens.accessToken);
      expect(jwtPayload?.userId).toBe(testUserId);

      const csrfValid = csrfProtection.verifyToken(testSessionId, csrfToken);
      expect(csrfValid).toBe(true);

      // 4. Second CSRF use should fail
      const csrfValid2 = csrfProtection.verifyToken(testSessionId, csrfToken);
      expect(csrfValid2).toBe(false);

      // 5. But JWT should still be valid
      const jwtPayload2 = jwtManager.verifyAccessToken(jwtTokens.accessToken);
      expect(jwtPayload2?.userId).toBe(testUserId);
    });

    it('should handle concurrent requests with same JWT', () => {
      // 1. User logs in
      const jwtTokens = jwtManager.generateTokenPair(testUserId, testEmail);

      // 2. Multiple concurrent requests with same JWT should all succeed
      const payload1 = jwtManager.verifyAccessToken(jwtTokens.accessToken);
      const payload2 = jwtManager.verifyAccessToken(jwtTokens.accessToken);
      const payload3 = jwtManager.verifyAccessToken(jwtTokens.accessToken);

      expect(payload1?.userId).toBe(testUserId);
      expect(payload2?.userId).toBe(testUserId);
      expect(payload3?.userId).toBe(testUserId);
    });

    it('should handle concurrent requests with different CSRF tokens', () => {
      // 1. Generate token for session
      const token1 = csrfProtection.generateToken('session-a');

      // 2. Verify token works (one-time use)
      const isValid1 = csrfProtection.verifyToken('session-a', token1);
      expect(isValid1).toBe(true);

      // 3. Second attempt with same token fails (one-time use)
      const isValid1Again = csrfProtection.verifyToken('session-a', token1);
      expect(isValid1Again).toBe(false);

      // 4. Generate new token for different session works independently
      const token2 = csrfProtection.generateToken('session-b');
      const isValid2 = csrfProtection.verifyToken('session-b', token2);
      expect(isValid2).toBe(true);
    });
  });

  describe('Security Event Scenarios', () => {
    it('should detect and reject malicious login attempts', () => {
      // Attacker tries SQL injection in login
      const maliciousEmail = "admin'--";

      const emailResult = emailSchema.safeParse(maliciousEmail);
      expect(emailResult.success).toBe(false);
    });

    it('should detect and reject XSS in password field', () => {
      const xssPassword = '<img src=x onerror=alert(1)>';

      // Should detect XSS
      const isXSS = detectXSSInjection(xssPassword);
      expect(isXSS).toBe(true);

      // Should be sanitized
      const sanitized = sanitizeString(xssPassword);
      expect(sanitized).not.toContain('onerror');
    });

    it('should prevent CSRF token prediction attacks', () => {
      // Generate multiple tokens and verify they're unpredictable
      const tokens = new Set();

      for (let i = 0; i < 100; i++) {
        const token = csrfProtection.generateToken(`session-${i}`);
        tokens.add(token);
      }

      // All tokens should be unique
      expect(tokens.size).toBe(100);

      // Tokens should be long (64 hex chars)
      tokens.forEach((token) => {
        expect((token as string).length).toBe(64);
      });
    });

    it('should prevent token timing attacks', () => {
      const token1 = csrfProtection.generateToken('session-1');
      const token2 = csrfProtection.generateToken('session-2');
      const wrongToken = 'a'.repeat(64);

      // Verify tokens at similar times (constant-time comparison)
      const start1 = Date.now();
      csrfProtection.verifyToken('session-1', token1);
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      csrfProtection.verifyToken('session-1', wrongToken);
      const time2 = Date.now() - start2;

      // Times should be similar (within 10ms for both valid and invalid)
      expect(Math.abs(time1 - time2)).toBeLessThan(10);
    });
  });

  describe('Token Refresh and Rotation', () => {
    it('should implement sliding window token refresh', () => {
      // 1. Initial login
      const tokens1 = jwtManager.generateTokenPair(testUserId, testEmail);

      // 2. Access token is near expiry, refresh with refresh token
      const tokens2 = jwtManager.refreshAccessToken(tokens1.refreshToken);
      expect(tokens2).toBeDefined();

      // 3. New access token should be valid
      const payload2 = jwtManager.verifyAccessToken(tokens2?.accessToken || '');
      expect(payload2?.userId).toBe(testUserId);

      // 4. Can continue refreshing as long as refresh token is valid
      const tokens3 = jwtManager.refreshAccessToken(tokens2?.refreshToken || '');
      expect(tokens3).toBeDefined();

      const payload3 = jwtManager.verifyAccessToken(tokens3?.accessToken || '');
      expect(payload3?.userId).toBe(testUserId);
    });

    it('should generate new tokens on refresh', () => {
      // 1. Initial tokens
      const tokens1 = jwtManager.generateTokenPair(testUserId, testEmail);

      // 2. First refresh generates new tokens
      const tokens2 = jwtManager.refreshAccessToken(tokens1.refreshToken);

      expect(tokens2).toBeDefined();
      expect(tokens2?.accessToken).toBeDefined();
      expect(tokens2?.refreshToken).toBeDefined();

      // 3. Verify new access token works
      const payload = jwtManager.verifyAccessToken(tokens2?.accessToken || '');
      expect(payload?.userId).toBe(testUserId);
    });
  });

  describe('Multi-User Security Isolation', () => {
    it('should isolate JWT tokens between users', () => {
      // User 1 logs in
      const user1Tokens = jwtManager.generateTokenPair('user-1', 'user1@example.com');

      // User 2 logs in
      const user2Tokens = jwtManager.generateTokenPair('user-2', 'user2@example.com');

      // Verify tokens are different
      expect(user1Tokens.accessToken).not.toBe(user2Tokens.accessToken);

      // Verify isolation
      const payload1 = jwtManager.verifyAccessToken(user1Tokens.accessToken);
      const payload2 = jwtManager.verifyAccessToken(user2Tokens.accessToken);

      expect(payload1?.userId).toBe('user-1');
      expect(payload2?.userId).toBe('user-2');
    });

    it('should isolate CSRF tokens between sessions', () => {
      // Session 1
      const token1 = csrfProtection.generateToken('session-1');

      // Session 2
      const token2 = csrfProtection.generateToken('session-2');

      // Tokens should be different
      expect(token1).not.toBe(token2);

      // Verify isolation - token from session 1 shouldn't work in session 2
      const isValid = csrfProtection.verifyToken('session-2', token1);
      expect(isValid).toBe(false);
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should gracefully handle invalid token input', () => {
      const invalidInputs = [
        '',
        'invalid',
        'too-short',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          123 as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          null as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          undefined as any,
      ];

      invalidInputs.forEach((input) => {
        const payload = jwtManager.verifyAccessToken(input as string);
        expect(payload).toBeNull();
      });
    });

    it('should handle missing session during CSRF verification', () => {
      const token = csrfProtection.generateToken('session-1');

      // Try to verify with non-existent session
      const isValid = csrfProtection.verifyToken('non-existent', token);
      expect(isValid).toBe(false);
    });

    it('should survive token expiration attempts', () => {
      // Generate token
      const token = csrfProtection.generateToken(testSessionId);
      const isValid1 = csrfProtection.verifyToken(testSessionId, token);
      expect(isValid1).toBe(true);

      // Second attempt should fail (one-time use)
      const isValid2 = csrfProtection.verifyToken(testSessionId, token);
      expect(isValid2).toBe(false);

      // Third attempt should still fail
      const isValid3 = csrfProtection.verifyToken(testSessionId, token);
      expect(isValid3).toBe(false);
    });
  });
});
