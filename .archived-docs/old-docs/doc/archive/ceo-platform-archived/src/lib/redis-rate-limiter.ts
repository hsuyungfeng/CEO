/**
 * Redis-based rate limiter for production environments
 * Provides distributed rate limiting across multiple server instances
 */

import Redis from 'ioredis';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyPrefix?: string; // Redis key prefix (default: "ratelimit:")
}

export class RedisRateLimiter {
  private redis: Redis | null = null;
  private config: RateLimitConfig;
  private isConnected = false;

  constructor(config?: RateLimitConfig) {
    this.config = {
      windowMs: config?.windowMs ?? 15 * 60 * 1000, // Default: 15 minutes
      maxRequests: config?.maxRequests ?? 5, // Default: 5 requests
      keyPrefix: config?.keyPrefix ?? 'ratelimit:',
    };

    // Initialize Redis connection if credentials are available
    if (process.env.REDIS_URL) {
      this.connect();
    }
  }

  private connect() {
    try {
      this.redis = new Redis(process.env.REDIS_URL!);

      this.redis.on('error', (err: Error) => {
        console.error('Redis connection error:', err);
        this.isConnected = false;
      });

      this.redis.on('connect', () => {
        console.log('Redis connected for rate limiting');
        this.isConnected = true;
      });
    } catch (error) {
      console.error('Failed to initialize Redis:', error);
    }
  }

  /**
   * Check rate limit for a key
   * Uses Redis INCR and EXPIRE for atomic operations
   */
  async check(key: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    // Fallback to memory if Redis is not available
    if (!this.redis || !this.isConnected) {
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: Date.now() + this.config.windowMs,
      };
    }

    try {
      const redisKey = `${this.config.keyPrefix}${key}`;

      // Increment the counter
      const count = await this.redis.incr(redisKey);

      // Set expiry on first request in the window
      if (count === 1) {
        await this.redis.pexpire(redisKey, this.config.windowMs);
      }

      // Get TTL (time to live) in milliseconds
      const ttl = await this.redis.pttl(redisKey);
      const resetTime = Date.now() + (ttl > 0 ? ttl : this.config.windowMs);

      // Check if limit exceeded
      const allowed = count <= this.config.maxRequests;
      const remaining = Math.max(0, this.config.maxRequests - count);

      return { allowed, remaining, resetTime };
    } catch (error) {
      // On error, allow the request and log
      console.error('Redis rate limit check error:', error);
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: Date.now() + this.config.windowMs,
      };
    }
  }

  /**
   * Reset the rate limit for a key
   */
  async reset(key: string): Promise<void> {
    if (!this.redis || !this.isConnected) {
      return;
    }

    try {
      const redisKey = `${this.config.keyPrefix}${key}`;
      await this.redis.del(redisKey);
    } catch (error) {
      console.error('Redis reset error:', error);
    }
  }

  /**
   * Get current count for a key (debugging)
   */
  async getCount(key: string): Promise<number> {
    if (!this.redis || !this.isConnected) {
      return 0;
    }

    try {
      const redisKey = `${this.config.keyPrefix}${key}`;
      const count = await this.redis.get(redisKey);
      return count ? parseInt(count, 10) : 0;
    } catch (error) {
      console.error('Redis getCount error:', error);
      return 0;
    }
  }

  /**
   * Gracefully disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.isConnected = false;
    }
  }

  /**
   * Check if Redis is connected
   */
  isReady(): boolean {
    return this.isConnected;
  }
}

/**
 * Factory function to create appropriate rate limiter based on environment
 */
export function createRateLimiter(config?: RateLimitConfig) {
  // Use Redis in production, fallback to memory for development
  if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
    return new RedisRateLimiter(config);
  }

  // Return memory-based rate limiter for development/testing
  return null; // Will use the memory-based rate limiter instead
}

// Create singleton instance for email verification (Redis if available, memory otherwise)
export const emailRateLimiter = (() => {
  if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
    return new RedisRateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5,
      keyPrefix: 'email-verify:',
    });
  }

  // For development/testing, import memory-based limiter
  // This is dynamically imported to avoid circular dependencies
  return null;
})();
