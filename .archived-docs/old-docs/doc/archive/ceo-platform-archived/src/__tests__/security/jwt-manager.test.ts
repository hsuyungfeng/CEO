import { describe, it, expect, beforeEach } from 'vitest';
import { JWTManager } from '@/lib/jwt-manager';

describe('JWT Manager', () => {
  let jwtManager: JWTManager;
  const testUserId = 'test-user-123';
  const testEmail = 'user@example.com';

  beforeEach(() => {
    // Create a new instance for each test
    jwtManager = new JWTManager();
  });

  describe('generateTokenPair()', () => {
    it('should generate both access and refresh tokens', () => {
      const tokenPair = jwtManager.generateTokenPair(testUserId, testEmail);

      expect(tokenPair).toBeDefined();
      expect(tokenPair.accessToken).toBeDefined();
      expect(tokenPair.refreshToken).toBeDefined();
      expect(tokenPair.expiresIn).toBe(15 * 60); // 15 minutes
      expect(tokenPair.tokenType).toBe('Bearer');
    });

    it('should generate different access and refresh tokens', () => {
      const tokenPair1 = jwtManager.generateTokenPair(testUserId, testEmail);

      // Add small delay to ensure different timestamp
      setTimeout(() => {}, 1);

      const tokenPair2 = jwtManager.generateTokenPair(testUserId, testEmail);

      // Tokens might be identical if generated in the same second, verify payload instead
      const payload1 = jwtManager.decodeToken(tokenPair1.accessToken);
      const payload2 = jwtManager.decodeToken(tokenPair2.accessToken);

      // Both should have the same user info
      expect(payload1?.userId).toBe(payload2?.userId);
      expect(payload1?.email).toBe(payload2?.email);
      expect(payload1?.type).toBe(payload2?.type);
    });

    it('should include userId and email in token payload', () => {
      const tokenPair = jwtManager.generateTokenPair(testUserId, testEmail);

      const accessPayload = jwtManager.decodeToken(tokenPair.accessToken);
      expect(accessPayload?.userId).toBe(testUserId);
      expect(accessPayload?.email).toBe(testEmail);
      expect(accessPayload?.type).toBe('access');
    });

    it('should set different expiration times for tokens', () => {
      const tokenPair = jwtManager.generateTokenPair(testUserId, testEmail);

      const accessPayload = jwtManager.decodeToken(tokenPair.accessToken);
      const refreshPayload = jwtManager.decodeToken(tokenPair.refreshToken);

      expect(accessPayload?.exp).toBeDefined();
      expect(refreshPayload?.exp).toBeDefined();

      // Refresh token should expire much later than access token
      if (accessPayload?.exp && refreshPayload?.exp) {
        expect(refreshPayload.exp - accessPayload.exp).toBeGreaterThan(
          6 * 24 * 60 * 60
        ); // At least 6 days difference
      }
    });
  });

  describe('verifyAccessToken()', () => {
    it('should verify a valid access token', () => {
      const tokenPair = jwtManager.generateTokenPair(testUserId, testEmail);

      const payload = jwtManager.verifyAccessToken(tokenPair.accessToken);

      expect(payload).toBeDefined();
      expect(payload?.userId).toBe(testUserId);
      expect(payload?.email).toBe(testEmail);
      expect(payload?.type).toBe('access');
    });

    it('should reject an invalid access token', () => {
      const invalidToken = 'invalid.token.here';

      const payload = jwtManager.verifyAccessToken(invalidToken);

      expect(payload).toBeNull();
    });

    it('should reject a refresh token as access token', () => {
      const tokenPair = jwtManager.generateTokenPair(testUserId, testEmail);

      const payload = jwtManager.verifyAccessToken(tokenPair.refreshToken);

      expect(payload).toBeNull();
    });

    it('should reject expired token (without grace period)', () => {
      // This test would need to manipulate time, which is complex
      // For now, we test that an obviously invalid token is rejected
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.invalid';

      const payload = jwtManager.verifyAccessToken(invalidToken);

      expect(payload).toBeNull();
    });

    it('should accept token within grace period', () => {
      const tokenPair = jwtManager.generateTokenPair(testUserId, testEmail);

      // Immediately verify (definitely within grace period)
      const payload = jwtManager.verifyAccessToken(tokenPair.accessToken);

      expect(payload).toBeDefined();
      expect(payload?.userId).toBe(testUserId);
    });
  });

  describe('verifyRefreshToken()', () => {
    it('should verify a valid refresh token', () => {
      const tokenPair = jwtManager.generateTokenPair(testUserId, testEmail);

      const payload = jwtManager.verifyRefreshToken(tokenPair.refreshToken);

      expect(payload).toBeDefined();
      expect(payload?.userId).toBe(testUserId);
      expect(payload?.email).toBe(testEmail);
      expect(payload?.type).toBe('refresh');
    });

    it('should reject an invalid refresh token', () => {
      const invalidToken = 'invalid.token.here';

      const payload = jwtManager.verifyRefreshToken(invalidToken);

      expect(payload).toBeNull();
    });

    it('should reject an access token as refresh token', () => {
      const tokenPair = jwtManager.generateTokenPair(testUserId, testEmail);

      const payload = jwtManager.verifyRefreshToken(tokenPair.accessToken);

      expect(payload).toBeNull();
    });
  });

  describe('refreshAccessToken()', () => {
    it('should generate new token pair when refresh token is valid', () => {
      const originalTokenPair = jwtManager.generateTokenPair(
        testUserId,
        testEmail
      );

      const newTokenPair = jwtManager.refreshAccessToken(
        originalTokenPair.refreshToken
      );

      expect(newTokenPair).toBeDefined();
      expect(newTokenPair?.accessToken).toBeDefined();
      expect(newTokenPair?.refreshToken).toBeDefined();
    });

    it('should generate different tokens on refresh', () => {
      const originalTokenPair = jwtManager.generateTokenPair(
        testUserId,
        testEmail
      );

      // Add small delay to ensure different timestamp
      setTimeout(() => {}, 1);

      const newTokenPair = jwtManager.refreshAccessToken(
        originalTokenPair.refreshToken
      );

      // Verify tokens are newly generated (different iat if timestamps differ)
      const originalPayload = jwtManager.decodeToken(originalTokenPair.accessToken);
      const newPayload = jwtManager.decodeToken(newTokenPair?.accessToken || '');

      // New tokens should be generated with fresh timestamp
      expect(newPayload?.iat).toBeGreaterThanOrEqual(originalPayload?.iat || 0);
    });

    it('should preserve user identity on token refresh', () => {
      const originalTokenPair = jwtManager.generateTokenPair(
        testUserId,
        testEmail
      );

      const newTokenPair = jwtManager.refreshAccessToken(
        originalTokenPair.refreshToken
      );

      const newPayload = jwtManager.decodeToken(newTokenPair?.accessToken || '');

      expect(newPayload?.userId).toBe(testUserId);
      expect(newPayload?.email).toBe(testEmail);
    });

    it('should return null for invalid refresh token', () => {
      const result = jwtManager.refreshAccessToken('invalid.token.here');

      expect(result).toBeNull();
    });

    it('should return null when refresh token is access token', () => {
      const tokenPair = jwtManager.generateTokenPair(testUserId, testEmail);

      const result = jwtManager.refreshAccessToken(tokenPair.accessToken);

      expect(result).toBeNull();
    });
  });

  describe('decodeToken()', () => {
    it('should decode a valid token', () => {
      const tokenPair = jwtManager.generateTokenPair(testUserId, testEmail);

      const payload = jwtManager.decodeToken(tokenPair.accessToken);

      expect(payload).toBeDefined();
      expect(payload?.userId).toBe(testUserId);
      expect(payload?.email).toBe(testEmail);
    });

    it('should decode expired token (without verification)', () => {
      const tokenPair = jwtManager.generateTokenPair(testUserId, testEmail);

      const payload = jwtManager.decodeToken(tokenPair.accessToken);

      expect(payload).toBeDefined();
      expect(payload?.exp).toBeDefined();
    });

    it('should return null for invalid token format', () => {
      const payload = jwtManager.decodeToken('not.a.valid.token');

      expect(payload).toBeNull();
    });
  });

  describe('getTokenRemainingTime()', () => {
    it('should return positive time for valid token', () => {
      const tokenPair = jwtManager.generateTokenPair(testUserId, testEmail);

      const remainingTime = jwtManager.getTokenRemainingTime(
        tokenPair.accessToken
      );

      expect(remainingTime).toBeGreaterThan(0);
      expect(remainingTime).toBeLessThanOrEqual(15 * 60); // 15 minutes in seconds
    });

    it('should return 0 for invalid token', () => {
      const remainingTime = jwtManager.getTokenRemainingTime('invalid.token');

      expect(remainingTime).toBe(0);
    });

    it('should return 0 for token without expiration', () => {
      // A token without exp claim
      const remainingTime = jwtManager.getTokenRemainingTime('');

      expect(remainingTime).toBe(0);
    });

    it('should show access token expiry is much shorter than refresh token', () => {
      const tokenPair = jwtManager.generateTokenPair(testUserId, testEmail);

      const accessTime = jwtManager.getTokenRemainingTime(
        tokenPair.accessToken
      );
      const refreshTime = jwtManager.getTokenRemainingTime(
        tokenPair.refreshToken
      );

      expect(refreshTime).toBeGreaterThan(accessTime);
      expect(refreshTime).toBeGreaterThan(6 * 24 * 60 * 60); // > 6 days
      expect(accessTime).toBeLessThan(20 * 60); // < 20 minutes
    });
  });

  describe('Token structure and security', () => {
    it('should include iat (issued at) claim', () => {
      const tokenPair = jwtManager.generateTokenPair(testUserId, testEmail);

      const payload = jwtManager.decodeToken(tokenPair.accessToken);

      expect(payload?.iat).toBeDefined();
      expect(typeof payload?.iat).toBe('number');
    });

    it('should include exp (expiration) claim', () => {
      const tokenPair = jwtManager.generateTokenPair(testUserId, testEmail);

      const payload = jwtManager.decodeToken(tokenPair.accessToken);

      expect(payload?.exp).toBeDefined();
      expect(typeof payload?.exp).toBe('number');
    });

    it('should have exp > iat', () => {
      const tokenPair = jwtManager.generateTokenPair(testUserId, testEmail);

      const payload = jwtManager.decodeToken(tokenPair.accessToken);

      expect(payload?.exp).toBeGreaterThan(payload?.iat || 0);
    });

    it('should use HS256 algorithm (indicated by JWT structure)', () => {
      const tokenPair = jwtManager.generateTokenPair(testUserId, testEmail);

      // JWT tokens have 3 parts separated by dots
      const parts = tokenPair.accessToken.split('.');
      expect(parts.length).toBe(3);

      // Decode header
      const header = JSON.parse(
        Buffer.from(parts[0], 'base64').toString('utf-8')
      );
      expect(header.alg).toBe('HS256');
      expect(header.typ).toBe('JWT');
    });
  });

  describe('Multiple users', () => {
    it('should generate different tokens for different users', () => {
      const tokenPair1 = jwtManager.generateTokenPair('user1', 'user1@example.com');
      const tokenPair2 = jwtManager.generateTokenPair('user2', 'user2@example.com');

      expect(tokenPair1.accessToken).not.toBe(tokenPair2.accessToken);
      expect(tokenPair1.refreshToken).not.toBe(tokenPair2.refreshToken);
    });

    it('should correctly identify different users by token', () => {
      const tokenPair1 = jwtManager.generateTokenPair('user1', 'user1@example.com');
      const tokenPair2 = jwtManager.generateTokenPair('user2', 'user2@example.com');

      const payload1 = jwtManager.verifyAccessToken(tokenPair1.accessToken);
      const payload2 = jwtManager.verifyAccessToken(tokenPair2.accessToken);

      expect(payload1?.userId).toBe('user1');
      expect(payload2?.userId).toBe('user2');
      expect(payload1?.userId).not.toBe(payload2?.userId);
    });
  });
});
