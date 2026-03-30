import { Context, Next } from 'hono'

/**
 * Simple in-memory sliding-window rate limiter.
 * Each call creates an independent limiter with its own hit map.
 *
 * @param maxRequests  Max allowed requests in the window
 * @param windowMs     Window duration in milliseconds
 */
export function rateLimit(maxRequests: number, windowMs: number) {
  const hits = new Map<string, number[]>()

  return async (c: Context, next: Next) => {
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
      c.req.header('x-real-ip') ??
      'unknown'

    const now = Date.now()
    const timestamps = (hits.get(ip) ?? []).filter((t) => now - t < windowMs)

    if (timestamps.length >= maxRequests) {
      return c.json({ error: 'Too many requests' }, 429)
    }

    timestamps.push(now)
    hits.set(ip, timestamps)
    await next()
  }
}
