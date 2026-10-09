export interface RateLimiter {
  checkLimit(key: string, limit: number, windowMs: number): Promise<{ allowed: boolean; remaining: number; resetAt: number }>
}

export class InMemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, { count: number; resetAt: number }>()

  async checkLimit(key: string, limit: number, windowMs: number): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const now = Date.now()
    const bucket = this.buckets.get(key)

    if (!bucket || bucket.resetAt <= now) {
      const resetAt = now + windowMs
      this.buckets.set(key, { count: 1, resetAt })
      return { allowed: true, remaining: limit - 1, resetAt }
    }

    if (bucket.count >= limit) {
      return { allowed: false, remaining: 0, resetAt: bucket.resetAt }
    }

    bucket.count += 1
    return { allowed: true, remaining: limit - bucket.count, resetAt: bucket.resetAt }
  }
}

export function createRateLimiter(): RateLimiter {
  return new InMemoryRateLimiter()
}