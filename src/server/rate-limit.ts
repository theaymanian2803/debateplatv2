export type RateLimitStore = {
  hit(
    key: string,
    windowStart: number,
    windowMs: number,
  ): Promise<{ windowStart: number; count: number }>;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function createMemoryRateLimitStore(): RateLimitStore {
  const windows = new Map<string, { windowStart: number; count: number }>();
  return {
    async hit(key, windowStart) {
      const previous = windows.get(key);
      if (previous && previous.windowStart === windowStart) {
        previous.count += 1;
        return { ...previous };
      }
      const next = { windowStart, count: 1 };
      windows.set(key, next);
      return { ...next };
    },
  };
}

type RateLimitDb = {
  execute(stmt: string | { sql: string; args?: unknown[] }): Promise<{ rows: unknown[] }>;
};

export function createTursoRateLimitStore(
  getDb: () => Promise<RateLimitDb | undefined>,
): RateLimitStore {
  return {
    async hit(key, windowStart, windowMs) {
      const db = await getDb();
      if (!db) throw new Error("Rate limit database is not configured");

      const result = await db.execute({
        sql: `INSERT INTO rate_limits (key, window_start, count)
              VALUES (?, ?, 1)
              ON CONFLICT(key) DO UPDATE SET
                count = CASE
                  WHEN rate_limits.window_start = excluded.window_start
                  THEN rate_limits.count + 1
                  ELSE 1
                END,
                window_start = excluded.window_start
              RETURNING window_start, count`,
        args: [key, windowStart],
      });

      if (Math.random() < 0.01) {
        try {
          await db.execute({
            sql: "DELETE FROM rate_limits WHERE window_start < ?",
            args: [windowStart - windowMs],
          });
        } catch {
          /* Cleanup is best-effort. */
        }
      }

      const row = result.rows[0] as { window_start?: unknown; count?: unknown } | undefined;
      if (typeof row?.window_start === "number" && typeof row.count === "number") {
        return { windowStart: row.window_start, count: row.count };
      }

      const fallback = await db.execute({
        sql: "SELECT window_start, count FROM rate_limits WHERE key = ?",
        args: [key],
      });
      const stored = fallback.rows[0] as { window_start?: unknown; count?: unknown } | undefined;
      if (typeof stored?.window_start !== "number" || typeof stored.count !== "number") {
        throw new Error("Rate limit database returned no row");
      }
      return { windowStart: stored.window_start, count: stored.count };
    },
  };
}

export class RateLimiter {
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly now: () => number;
  private readonly store: RateLimitStore;
  private readonly fallback: RateLimitStore;

  constructor(options: {
    limit: number;
    windowMs: number;
    now?: () => number;
    store?: RateLimitStore;
    fallback?: RateLimitStore;
  }) {
    this.limit = options.limit;
    this.windowMs = options.windowMs;
    this.now = options.now ?? Date.now;
    this.fallback = options.fallback ?? createMemoryRateLimitStore();
    this.store = options.store ?? this.fallback;
  }

  async check(key: string): Promise<RateLimitResult> {
    const now = this.now();
    const windowStart = Math.floor(now / this.windowMs) * this.windowMs;

    let result: { windowStart: number; count: number };
    try {
      result = await this.store.hit(key, windowStart, this.windowMs);
    } catch {
      try {
        result = await this.fallback.hit(key, windowStart, this.windowMs);
      } catch {
        return { allowed: true, remaining: this.limit, retryAfterSeconds: 1 };
      }
    }

    return {
      allowed: result.count <= this.limit,
      remaining: Math.max(0, this.limit - result.count),
      retryAfterSeconds: Math.max(1, Math.ceil((windowStart + this.windowMs - now) / 1000)),
    };
  }
}
