/**
 * In-memory rate limiter for email verification
 * For production at scale, consider Redis-based implementation
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

export class RateLimiter {
  private store = new Map<string, RateLimitEntry>()
  private windowMs: number
  private maxRequests: number

  constructor(windowMs: number = 15 * 60 * 1000, maxRequests: number = 5) {
    this.windowMs = windowMs
    this.maxRequests = maxRequests

    // Clean up expired entries every hour
    setInterval(() => this.cleanup(), 60 * 60 * 1000)
  }

  check(key: string): {
    allowed: boolean
    remaining: number
    resetTime: number
  } {
    const now = Date.now()
    const entry = this.store.get(key)

    if (!entry || now > entry.resetTime) {
      // New window
      const resetTime = now + this.windowMs
      this.store.set(key, { count: 1, resetTime })
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime,
      }
    }

    // Existing window
    if (entry.count < this.maxRequests) {
      entry.count++
      return {
        allowed: true,
        remaining: this.maxRequests - entry.count,
        resetTime: entry.resetTime,
      }
    }

    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    }
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key)
      }
    }
  }

  reset(key: string) {
    this.store.delete(key)
  }
}

// Export singleton instance
export const emailRateLimiter = new RateLimiter(
  15 * 60 * 1000, // 15-minute window
  5 // 5 requests per window
)
