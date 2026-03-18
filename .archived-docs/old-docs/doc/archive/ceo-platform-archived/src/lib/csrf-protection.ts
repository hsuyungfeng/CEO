import { randomBytes } from 'crypto';
import { logger } from '@/lib/logger';

interface CSRFTokenData {
  token: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * CSRF Token Manager
 * Generates, stores, and validates CSRF tokens
 * Uses in-memory storage with optional Redis support
 */
export class CSRFProtection {
  private tokens: Map<string, CSRFTokenData> = new Map();
  private tokenLength: number = 32;
  private maxAge: number = 3600; // 1 hour
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(options?: { tokenLength?: number; maxAge?: number }) {
    this.tokenLength = options?.tokenLength || 32;
    this.maxAge = options?.maxAge || 3600;

    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Generate a new CSRF token
   */
  generateToken(sessionId: string): string {
    const token = randomBytes(this.tokenLength).toString('hex');
    const now = Date.now();

    this.tokens.set(sessionId, {
      token,
      createdAt: now,
      expiresAt: now + this.maxAge * 1000,
    });

    logger.info({ sessionId: sessionId.substring(0, 8) }, 'CSRF 令牌已生成');
    return token;
  }

  /**
   * Verify CSRF token
   */
  verifyToken(sessionId: string, token: string): boolean {
    const tokenData = this.tokens.get(sessionId);

    if (!tokenData) {
      logger.warn({ sessionId: sessionId.substring(0, 8) }, 'CSRF 令牌未找到');
      return false;
    }

    // Check if token is expired
    if (Date.now() > tokenData.expiresAt) {
      logger.warn({ sessionId: sessionId.substring(0, 8) }, 'CSRF 令牌已過期');
      this.tokens.delete(sessionId);
      return false;
    }

    // Verify token matches (constant-time comparison)
    const isValid = this.constantTimeCompare(token, tokenData.token);

    if (!isValid) {
      logger.warn(
        { sessionId: sessionId.substring(0, 8) },
        'CSRF 令牌驗證失敗'
      );
      this.tokens.delete(sessionId);
      return false;
    }

    // Token is valid, remove it (one-time use)
    this.tokens.delete(sessionId);
    logger.info({ sessionId: sessionId.substring(0, 8) }, 'CSRF 令牌驗證成功');

    return true;
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Invalidate token
   */
  invalidateToken(sessionId: string): void {
    this.tokens.delete(sessionId);
    logger.info({ sessionId: sessionId.substring(0, 8) }, 'CSRF 令牌已失效');
  }

  /**
   * Clean up expired tokens
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, tokenData] of this.tokens.entries()) {
      if (now > tokenData.expiresAt) {
        this.tokens.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info({ count: cleaned }, 'CSRF 令牌清理完成');
    }
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);

    // Don't keep process alive for cleanup interval
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Stop cleanup and clear all tokens
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.tokens.clear();
  }

  /**
   * Get token count (for debugging)
   */
  getTokenCount(): number {
    return this.tokens.size;
  }
}

/**
 * Export singleton instance
 */
export const csrfProtection = new CSRFProtection({
  tokenLength: 32,
  maxAge: 3600, // 1 hour
});
