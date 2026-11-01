export type CacheEntry = { value: unknown; expiresAt: number };

export type PersistentCacheStore = {
  get(key: string): Promise<CacheEntry | undefined>;
  set(key: string, entry: CacheEntry): Promise<void>;
};

type CacheDb = {
  execute(stmt: string | { sql: string; args?: unknown[] }): Promise<{ rows: unknown[] }>;
};

export function createTursoCacheStore(
  getDb: () => Promise<CacheDb | undefined>,
): PersistentCacheStore {
  return {
    async get(key) {
      const db = await getDb();
      if (!db) return undefined;
      try {
        const result = await db.execute({
          sql: "SELECT payload, expires_at FROM scripture_cache WHERE key = ?",
          args: [key],
        });
        const row = result.rows[0] as { payload?: unknown; expires_at?: unknown } | undefined;
        if (!row || typeof row.payload !== "string" || typeof row.expires_at !== "number") {
          return undefined;
        }
        if (row.expires_at <= Date.now()) {
          await db.execute({
            sql: "DELETE FROM scripture_cache WHERE key = ?",
            args: [key],
          });
          return undefined;
        }
        return { value: JSON.parse(row.payload), expiresAt: row.expires_at };
      } catch {
        return undefined;
      }
    },
    async set(key, entry) {
      const db = await getDb();
      if (!db) return;
      try {
        await db.execute({
          sql: `INSERT INTO scripture_cache (key, payload, fetched_at, expires_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET
                  payload = excluded.payload,
                  fetched_at = excluded.fetched_at,
                  expires_at = excluded.expires_at`,
          args: [key, JSON.stringify(entry.value), Date.now(), entry.expiresAt],
        });
        if (Math.random() < 0.01) {
          try {
            await db.execute({
              sql: "DELETE FROM scripture_cache WHERE expires_at < ?",
              args: [Date.now()],
            });
          } catch {
            /* Cleanup is best-effort. */
          }
        }
      } catch {
        /* Persistence is best-effort. */
      }
    },
  };
}

export class ScriptureCache {
  private memory = new Map<string, CacheEntry>();
  private inflight = new Map<string, Promise<unknown>>();
  private readonly store: PersistentCacheStore | undefined;
  private readonly now: () => number;
  private readonly maxBytes: number;

  constructor(options?: { store?: PersistentCacheStore; now?: () => number; maxBytes?: number }) {
    this.store = options?.store;
    this.now = options?.now ?? Date.now;
    this.maxBytes = options?.maxBytes ?? 256 * 1024;
  }

  async get<T>(key: string): Promise<T | undefined> {
    const now = this.now();
    const memoryEntry = this.memory.get(key);
    if (memoryEntry) {
      if (memoryEntry.expiresAt > now) return memoryEntry.value as T;
      this.memory.delete(key);
    }

    if (!this.store) return undefined;
    try {
      const entry = await this.store.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= now) return undefined;
      this.memory.set(key, entry);
      return entry.value as T;
    } catch {
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<T> {
    const entry: CacheEntry = { value, expiresAt: this.now() + ttlMs };
    this.memory.set(key, entry);

    if (!this.store) return value;
    const serialized = JSON.stringify(value);
    if (new TextEncoder().encode(serialized).length > this.maxBytes) {
      return value;
    }

    try {
      await this.store.set(key, entry);
    } catch {
      /* Persistence is best-effort. */
    }
    return value;
  }

  async getOrLoad<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
    const existing = await this.get<T>(key);
    if (existing !== undefined) return existing;

    const inFlight = this.inflight.get(key);
    if (inFlight) return inFlight as Promise<T>;

    const promise = (async () => {
      const value = await loader();
      await this.set(key, value, ttlMs);
      return value;
    })();

    this.inflight.set(key, promise);
    try {
      return await promise;
    } finally {
      this.inflight.delete(key);
    }
  }
}
