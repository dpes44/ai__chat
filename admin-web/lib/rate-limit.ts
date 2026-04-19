const windowMap = new Map<string, { count: number; resetAt: number }>();

function maxReq(): number {
  return Number(process.env.ADMIN_RATE_LIMIT_MAX ?? 20);
}

function windowMs(): number {
  return Number(process.env.ADMIN_RATE_LIMIT_WINDOW_MS ?? 5 * 60 * 1000);
}

export function checkRateLimit(key: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const existing = windowMap.get(key);

  if (!existing || existing.resetAt <= now) {
    windowMap.set(key, { count: 1, resetAt: now + windowMs() });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (existing.count >= maxReq()) {
    return { allowed: false, retryAfterMs: existing.resetAt - now };
  }

  existing.count += 1;
  windowMap.set(key, existing);
  return { allowed: true, retryAfterMs: 0 };
}
