/**
 * Advanced Rate Limiting with Per-Endpoint Configuration
 * Implements distributed rate limiting with Redis fallback
 */

import { logger } from '@/lib/logger';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyPrefix?: string; // Redis key prefix
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

/**
 * Advanced Rate Limiter supporting both Redis and in-memory storage
 */
export class AdvancedRateLimiter {
  private config: RateLimitConfig;
  private memoryStore: RateLimitStore = {};
  private redis: any = null;
  private redisAvailable = false;

  constructor(config: RateLimitConfig) {
    this.config = {
      keyPrefix: 'ratelimit:',
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config,
    };

    // Try to initialize Redis if available
    this.initializeRedis();

    // Cleanup old entries periodically
    this.startCleanupInterval();
  }

  private initializeRedis() {
    try {
      const redisUrl = process.env.REDIS_URL;
      if (redisUrl) {
        // Dynamic import to avoid issues if redis not installed
        const Redis = require('ioredis');
        this.redis = new Redis(redisUrl);
        this.redisAvailable = true;
        logger.info('Advanced rate limiter using Redis backend');
      }
    } catch (error) {
      logger.warn('Redis not available, using in-memory rate limiting');
      this.redisAvailable = false;
    }
  }

  /**
   * Check if request is allowed
   * Returns { allowed: boolean, remaining: number, resetTime: number }
   */
  async checkLimit(identifier: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  }> {
    const key = `${this.config.keyPrefix}${identifier}`;
    const now = Date.now();

    if (this.redisAvailable && this.redis) {
      return this.checkLimitRedis(key, now);
    }

    return this.checkLimitMemory(key, now);
  }

  private async checkLimitRedis(key: string, now: number): Promise<any> {
    try {
      const result = await this.redis.eval(
        `
        local key = KEYS[1]
        local limit = tonumber(ARGV[1])
        local window = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])

        local current = redis.call('GET', key)
        local count = 0
        local resetTime = now + window

        if current then
          local data = cjson.decode(current)
          if data.resetTime > now then
            count = data.count + 1
            resetTime = data.resetTime
          else
            count = 1
            resetTime = now + window
          end
        else
          count = 1
          resetTime = now + window
        end

        redis.call('SET', key, cjson.encode({count = count, resetTime = resetTime}), 'PX', window)

        return {count, resetTime}
        `,
        1,
        key,
        this.config.maxRequests,
        this.config.windowMs,
        now
      );

      const [count, resetTime] = result;
      const remaining = Math.max(0, this.config.maxRequests - count);
      const allowed = count <= this.config.maxRequests;

      return {
        allowed,
        remaining,
        resetTime,
        retryAfter: allowed ? undefined : Math.ceil((resetTime - now) / 1000),
      };
    } catch (error) {
      logger.error({ error }, 'Redis rate limit check failed');
      // Fallback to memory
      return this.checkLimitMemory(key, now);
    }
  }

  private checkLimitMemory(key: string, now: number): any {
    const entry = this.memoryStore[key];
    let count = 0;
    let resetTime = now + this.config.windowMs;

    if (entry && entry.resetTime > now) {
      count = entry.count + 1;
      resetTime = entry.resetTime;
    } else {
      count = 1;
      resetTime = now + this.config.windowMs;
    }

    this.memoryStore[key] = { count, resetTime };

    const remaining = Math.max(0, this.config.maxRequests - count);
    const allowed = count <= this.config.maxRequests;

    return {
      allowed,
      remaining,
      resetTime,
      retryAfter: allowed ? undefined : Math.ceil((resetTime - now) / 1000),
    };
  }

  /**
   * Reset limit for identifier
   */
  async reset(identifier: string): Promise<void> {
    const key = `${this.config.keyPrefix}${identifier}`;

    if (this.redisAvailable && this.redis) {
      try {
        await this.redis.del(key);
      } catch (error) {
        logger.error({ error }, 'Redis reset failed');
      }
    }

    delete this.memoryStore[key];
  }

  /**
   * Get current count for identifier
   */
  async getCount(identifier: string): Promise<number> {
    const key = `${this.config.keyPrefix}${identifier}`;

    if (this.redisAvailable && this.redis) {
      try {
        const result = await this.redis.get(key);
        if (result) {
          const data = JSON.parse(result);
          return data.count;
        }
      } catch (error) {
        logger.error({ error }, 'Redis getCount failed');
      }
    }

    const entry = this.memoryStore[key];
    return entry ? entry.count : 0;
  }

  private startCleanupInterval() {
    setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];

      for (const [key, entry] of Object.entries(this.memoryStore)) {
        if (entry.resetTime <= now) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach((key) => {
        delete this.memoryStore[key];
      });

      if (keysToDelete.length > 0) {
        logger.debug({ count: keysToDelete.length }, 'Cleaned up expired rate limit entries');
      }
    }, 60000); // Cleanup every minute
  }

  /**
   * Destroy and cleanup resources
   */
  async destroy() {
    if (this.redis) {
      try {
        await this.redis.quit();
      } catch (error) {
        logger.error({ error }, 'Error closing Redis connection');
      }
    }
  }
}

/**
 * Predefined rate limit configurations for different endpoints
 */
export const RATE_LIMIT_CONFIGS = {
  // Auth endpoints: 5 requests per 15 minutes
  auth: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    keyPrefix: 'ratelimit:auth:',
  } as RateLimitConfig,

  // Login: 5 attempts per 15 minutes
  login: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    keyPrefix: 'ratelimit:login:',
  } as RateLimitConfig,

  // Register: 3 registrations per hour
  register: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 3,
    keyPrefix: 'ratelimit:register:',
  } as RateLimitConfig,

  // Password reset: 3 attempts per hour
  passwordReset: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 3,
    keyPrefix: 'ratelimit:password-reset:',
  } as RateLimitConfig,

  // Email verification: 5 attempts per 10 minutes
  emailVerification: {
    windowMs: 10 * 60 * 1000,
    maxRequests: 5,
    keyPrefix: 'ratelimit:email-verification:',
  } as RateLimitConfig,

  // General API: 100 requests per minute
  api: {
    windowMs: 60 * 1000,
    maxRequests: 100,
    keyPrefix: 'ratelimit:api:',
  } as RateLimitConfig,

  // Search: 30 requests per minute
  search: {
    windowMs: 60 * 1000,
    maxRequests: 30,
    keyPrefix: 'ratelimit:search:',
  } as RateLimitConfig,

  // Upload: 10 requests per hour
  upload: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 10,
    keyPrefix: 'ratelimit:upload:',
  } as RateLimitConfig,

  // Export: 5 requests per hour
  export: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 5,
    keyPrefix: 'ratelimit:export:',
  } as RateLimitConfig,

  // Health check: 1000 requests per minute (essentially unlimited for internal checks)
  health: {
    windowMs: 60 * 1000,
    maxRequests: 1000,
    keyPrefix: 'ratelimit:health:',
  } as RateLimitConfig,
};

/**
 * Helper function to get rate limiter for endpoint
 */
export function getRateLimiter(endpoint: keyof typeof RATE_LIMIT_CONFIGS): AdvancedRateLimiter {
  return new AdvancedRateLimiter(RATE_LIMIT_CONFIGS[endpoint]);
}

/**
 * Middleware helper for Next.js
 */
export async function checkRateLimit(
  identifier: string,
  limiter: AdvancedRateLimiter
): Promise<{
  allowed: boolean;
  headers: Record<string, string>;
}> {
  const result = await limiter.checkLimit(identifier);

  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(limiter['config'].maxRequests),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
  };

  if (result.retryAfter) {
    headers['Retry-After'] = String(result.retryAfter);
  }

  return {
    allowed: result.allowed,
    headers,
  };
}
