import jwt from 'jsonwebtoken';
import { logger } from '@/lib/logger';

interface TokenPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

/**
 * JWT Manager for token generation and validation
 * Implements sliding window token rotation strategy
 */
export class JWTManager {
  private accessTokenSecret: string;
  private refreshTokenSecret: string;
  private accessTokenExpiry: number; // in seconds
  private refreshTokenExpiry: number; // in seconds
  private gracePeriod: number; // in seconds

  constructor() {
    this.accessTokenSecret = process.env.JWT_SECRET || 'access-secret-key-change-in-production';
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'refresh-secret-key-change-in-production';
    this.accessTokenExpiry = 15 * 60; // 15 minutes
    this.refreshTokenExpiry = 7 * 24 * 60 * 60; // 7 days
    this.gracePeriod = 60; // 1 minute grace period for token refresh
  }

  /**
   * Generate a new access and refresh token pair
   */
  generateTokenPair(userId: string, email: string): TokenPair {
    const now = Math.floor(Date.now() / 1000);

    // Generate access token (short-lived)
    const accessToken = jwt.sign(
      {
        userId,
        email,
        type: 'access',
        iat: now,
      },
      this.accessTokenSecret,
      { expiresIn: this.accessTokenExpiry, algorithm: 'HS256' }
    );

    // Generate refresh token (long-lived)
    const refreshToken = jwt.sign(
      {
        userId,
        email,
        type: 'refresh',
        iat: now,
      },
      this.refreshTokenSecret,
      { expiresIn: this.refreshTokenExpiry, algorithm: 'HS256' }
    );

    logger.info(
      { userId, email },
      '新 JWT 令牌對生成'
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenExpiry,
      tokenType: 'Bearer',
    };
  }

  /**
   * Verify access token with grace period support
   * Returns payload if valid, null otherwise
   */
  verifyAccessToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret) as TokenPayload;

      // Verify token type
      if (decoded.type !== 'access') {
        logger.warn({ token: token.substring(0, 20) + '...' }, '無效的令牌類型');
        return null;
      }

      return decoded;
    } catch (error: any) {
      // Check if token is expired but within grace period
      if (error.name === 'TokenExpiredError') {
        try {
          const decoded = jwt.decode(token) as TokenPayload | null;
          if (decoded && decoded.exp) {
            const now = Math.floor(Date.now() / 1000);
            const secondsExpired = now - decoded.exp;

            // Within grace period - allow refresh
            if (secondsExpired < this.gracePeriod) {
              logger.info(
                { userId: decoded.userId, secondsExpired },
                '令牌在寬限期內'
              );
              return decoded;
            }
          }
        } catch {}
      }

      logger.warn({ error: error.message }, '訪問令牌驗證失敗');
      return null;
    }
  }

  /**
   * Verify refresh token
   * Returns payload if valid, null otherwise
   */
  verifyRefreshToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret) as TokenPayload;

      // Verify token type
      if (decoded.type !== 'refresh') {
        logger.warn({ token: token.substring(0, 20) + '...' }, '無效的刷新令牌類型');
        return null;
      }

      return decoded;
    } catch (error: any) {
      logger.warn({ error: error.message }, '刷新令牌驗證失敗');
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   * Returns new token pair if refresh token is valid, null otherwise
   */
  refreshAccessToken(refreshToken: string): TokenPair | null {
    const payload = this.verifyRefreshToken(refreshToken);

    if (!payload) {
      logger.warn({ token: refreshToken.substring(0, 20) + '...' }, '無法驗證刷新令牌');
      return null;
    }

    // Generate new token pair
    const newTokenPair = this.generateTokenPair(payload.userId, payload.email);
    logger.info({ userId: payload.userId }, '令牌已刷新');

    return newTokenPair;
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): TokenPayload | null {
    try {
      return jwt.decode(token) as TokenPayload | null;
    } catch (error) {
      logger.error({ error }, '令牌解碼失敗');
      return null;
    }
  }

  /**
   * Get remaining time for token in seconds
   */
  getTokenRemainingTime(token: string): number {
    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) {
      return 0;
    }

    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, payload.exp - now);
  }
}

/**
 * Export singleton instance
 */
export const jwtManager = new JWTManager();
