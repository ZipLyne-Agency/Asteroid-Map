/**
 * Minimal in-memory, per-IP token bucket for API routes.
 *
 * Serverless caveat: state is per-instance, so this is a soft cap — enough to
 * stop a single client from hammering Nominatim through us (their usage
 * policy is 1 req/s), not a substitute for an edge rate limiter.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

const MAX_BUCKETS = 10_000; // hard memory cap

export function checkRateLimit(ip: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const bucket = buckets.get(ip);

  if (!bucket || now > bucket.resetAt) {
    if (buckets.size >= MAX_BUCKETS) {
      // Drop expired buckets first; if everything is live, fail open.
      for (const [key, value] of buckets) {
        if (now > value.resetAt) buckets.delete(key);
      }
      if (buckets.size >= MAX_BUCKETS) return true;
    }
    buckets.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  bucket.count += 1;
  return bucket.count <= limit;
}

export function clientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  );
}
