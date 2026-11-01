# Quran Reader Reliability Implementation Plan (Phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Persist the scripture cache across serverless instances, expose provider health, and rate-limit the public Quran endpoints.

**Architecture:** Keep the existing in-memory maps as an L1 cache and add Turso as an L2 JSON cache behind a small async interface. Add a lightweight public health endpoint and a Turso-backed fixed-window rate limiter for the public Quran server functions, each with in-memory fallback.

**Tech Stack:** TypeScript, TanStack Start server functions and server routes, Turso (`@libsql/client/web`), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-25-quran-reader-reliability-design.md`

## Global Constraints

- Do not change upstream provider URLs or response parsing in this phase.
- Cache and rate-limit failures must never fail a user request.
- Never expose credentials, stack traces, or upstream bodies.
- Do not commit unless the user explicitly asks.
- Preserve the existing 24-hour cache TTL.
- Public Quran endpoints only: page, Asbab, tafsir.
- Limit: 120 requests per 60-second window per IP.

---

### Task 1: Cache and rate-limit tables

**Files:**
- Modify: `src/server/schema.ts`
- Modify: `src/server/db.ts`
- Test: `src/server/__tests__/schema.test.ts` (create)

**Interfaces:**
- Produces: `getDbIfConfigured(): Promise<Client | undefined>`.
- Produces: tables `scripture_cache(key, payload, fetched_at, expires_at)` and `rate_limits(key, window_start, count)`.

- [x] **Step 1: Write the failing schema test**

```ts
import { describe, expect, it } from "vitest";
import { SCHEMA_SQL } from "@/server/schema";

describe("scripture cache schema", () => {
  it("defines the persistent cache and rate-limit tables", () => {
    expect(SCHEMA_SQL).toContain("CREATE TABLE IF NOT EXISTS scripture_cache");
    expect(SCHEMA_SQL).toContain("CREATE TABLE IF NOT EXISTS rate_limits");
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/server/__tests__/schema.test.ts`
Expected: FAIL because `scripture_cache` and `rate_limits` are absent.

- [x] **Step 3: Add the tables**

Append to `SCHEMA_SQL` in `src/server/schema.ts`:

```sql
CREATE TABLE IF NOT EXISTS scripture_cache (
  key        TEXT PRIMARY KEY,
  payload    TEXT NOT NULL,
  fetched_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count        INTEGER NOT NULL
);
```

- [x] **Step 4: Add `getDbIfConfigured`**

In `src/server/db.ts`:

```ts
export async function getDbIfConfigured(): Promise<Client | undefined> {
  try {
    return await getDb();
  } catch {
    return undefined;
  }
}
```

- [x] **Step 5: Run the schema test and typecheck**

Run: `npx vitest run src/server/__tests__/schema.test.ts; npm run typecheck`
Expected: PASS and no type errors.

---

### Task 2: Async L1/L2 cache module

**Files:**
- Create: `src/server/cache.ts`
- Test: `src/server/__tests__/cache.test.ts`

**Interfaces:**
- Produces:

```ts
export type CacheEntry = { value: unknown; expiresAt: number };

export type PersistentCacheStore = {
  get(key: string): Promise<CacheEntry | undefined>;
  set(key: string, entry: CacheEntry): Promise<void>;
};

export class ScriptureCache {
  constructor(options?: {
    store?: PersistentCacheStore;
    now?: () => number;
    maxBytes?: number;
  });
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlMs: number): Promise<T>;
  getOrLoad<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T>;
}

export function createTursoCacheStore(
  getDb: () => Promise<{ execute: (stmt: unknown) => Promise<{ rows: unknown[] }> } | undefined>,
): PersistentCacheStore;
```

- [x] **Step 1: Write failing tests**

```ts
import { describe, expect, it, vi } from "vitest";
import { ScriptureCache, type PersistentCacheStore } from "@/server/cache";

function memoryStore() {
  const rows = new Map<string, { value: unknown; expiresAt: number }>();
  const store: PersistentCacheStore = {
    get: async (key) => rows.get(key),
    set: async (key, entry) => {
      rows.set(key, entry);
    },
  };
  return { rows, store };
}

describe("ScriptureCache", () => {
  it("serves from memory, then persistence, then the loader", async () => {
    let now = 1_000;
    const { store } = memoryStore();
    const cache = new ScriptureCache({ store, now: () => now });
    const loader = vi.fn(async () => ({ text: "fresh" }));

    expect(await cache.getOrLoad("k", 60_000, loader)).toEqual({ text: "fresh" });
    expect(await cache.getOrLoad("k", 60_000, loader)).toEqual({ text: "fresh" });
    expect(loader).toHaveBeenCalledTimes(1);

    const second = new ScriptureCache({ store, now: () => now });
    expect(await second.getOrLoad("k", 60_000, loader)).toEqual({ text: "fresh" });
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("refetches after expiry", async () => {
    let now = 1_000;
    const cache = new ScriptureCache({ now: () => now });
    const loader = vi.fn(async () => "value");
    await cache.getOrLoad("k", 1_000, loader);
    now = 2_000;
    await cache.getOrLoad("k", 1_000, loader);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("shares one in-flight request", async () => {
    const cache = new ScriptureCache();
    let resolve!: (value: string) => void;
    const loader = vi.fn(
      () =>
        new Promise<string>((done) => {
          resolve = done;
        }),
    );
    const first = cache.getOrLoad("k", 60_000, loader);
    const second = cache.getOrLoad("k", 60_000, loader);
    resolve("once");
    expect(await Promise.all([first, second])).toEqual(["once", "once"]);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("falls back when persistence fails", async () => {
    const store: PersistentCacheStore = {
      get: async () => {
        throw new Error("db down");
      },
      set: async () => {
        throw new Error("db down");
      },
    };
    const cache = new ScriptureCache({ store });
    expect(await cache.getOrLoad("k", 60_000, async () => "ok")).toBe("ok");
  });

  it("skips persistence for oversized values", async () => {
    const set = vi.fn(async () => undefined);
    const cache = new ScriptureCache({
      store: { get: async () => undefined, set },
      maxBytes: 4,
    });
    await cache.getOrLoad("k", 60_000, async () => "too large");
    expect(set).not.toHaveBeenCalled();
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/server/__tests__/cache.test.ts`
Expected: FAIL because `@/server/cache` does not exist.

- [x] **Step 3: Implement `ScriptureCache` and the Turso store**

Requirements:
- L1 is a `Map<string, CacheEntry>`.
- `get` removes expired L1 entries, then checks L2.
- `set` writes L1 always; writes L2 only when JSON length is at most `maxBytes` (default 262144).
- `getOrLoad` deduplicates by key with an `inflight` map and clears it in `finally`.
- L2 errors are swallowed; the loader result is still returned.
- Turso store SQL:

```sql
SELECT payload, expires_at FROM scripture_cache WHERE key = ?
```

```sql
INSERT INTO scripture_cache (key, payload, fetched_at, expires_at)
VALUES (?, ?, ?, ?)
ON CONFLICT(key) DO UPDATE SET
  payload = excluded.payload,
  fetched_at = excluded.fetched_at,
  expires_at = excluded.expires_at
```

```sql
DELETE FROM scripture_cache WHERE key = ?
```

- [x] **Step 4: Run tests and typecheck**

Run: `npx vitest run src/server/__tests__/cache.test.ts; npm run typecheck`
Expected: PASS.

---

### Task 3: Use the cache in the scripture layer

**Files:**
- Modify: `src/server/scripture.ts`
- Test: `src/server/__tests__/scripture-cache.test.ts` (create)

**Interfaces:**
- Consumes: `ScriptureCache`, `createTursoCacheStore`, `getDbIfConfigured`.
- Produces: module-level `scriptureCache` used for every existing namespace.

- [x] **Step 1: Write a failing test that proves cache reuse**

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchQuranPage } from "@/server/scripture";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("scripture cache", () => {
  it("does not refetch the same Quran page", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("quran-uthmani")) {
        return new Response(
          JSON.stringify({
            data: {
              ayahs: [
                {
                  number: 8,
                  text: "الم",
                  numberInSurah: 1,
                  juz: 1,
                  page: 2,
                  sajda: false,
                  surah: { number: 2, englishName: "Al-Baqara", name: "البقرة" },
                },
              ],
              edition: { englishName: "Uthmani" },
            },
          }),
        );
      }
      return new Response(
        JSON.stringify({
          data: {
            ayahs: [{ number: 8, text: "Alif, Lam, Meem." }],
            edition: { englishName: "Saheeh International" },
          },
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchQuranPage({ page: 2, translationId: "en.sahih" });
    await fetchQuranPage({ page: 2, translationId: "en.sahih" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `npx vitest run src/server/__tests__/scripture-cache.test.ts`
Expected: PASS today because module-level maps already cache; the test is a guard. If it passes, keep it and continue. If it fails, fix before proceeding.

- [x] **Step 3: Replace the maps with the shared cache**

- Remove `chapterCache`, `sefariaCache`, `quranCache`, `asbabCache`, `tafsirCache`, `hadithCache`, `apiBibleListCache`, `apiBibleMetaCache`, `cached`, and `put`.
- Add a singleton:

```ts
let scriptureCache: ScriptureCache | undefined;

function getScriptureCache(): ScriptureCache {
  if (!scriptureCache) {
    scriptureCache = new ScriptureCache({
      store: createTursoCacheStore(getDbIfConfigured),
    });
  }
  return scriptureCache;
}
```

- Convert each cache site to `await getScriptureCache().getOrLoad(key, CACHE_TTL_MS, loader)` or `get`/`set`.
- Keep the existing cache-key strings unchanged.
- For `apiBibleLabel`, keep the fallback return when the label fetch fails.
- For `fetchQuranAsbab`, cache both positive and negative results; key `asbab:${surah}:${verse}`.
- For `fetchQuranPage`, cache each edition separately with `quran-page:${page}:${edition}`.

- [x] **Step 4: Run the scripture tests**

Run: `npm test`
Expected: all existing tests pass, plus the new cache guard.

---

### Task 4: Fixed-window rate limiter

**Files:**
- Create: `src/server/rate-limit.ts`
- Test: `src/server/__tests__/rate-limit.test.ts`

**Interfaces:**
- Produces:

```ts
export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export class RateLimiter {
  constructor(options: {
    limit: number;
    windowMs: number;
    now?: () => number;
    store?: RateLimitStore;
    fallback?: RateLimitStore;
  });
  check(key: string): Promise<RateLimitResult>;
}

export function createTursoRateLimitStore(
  getDb: () => Promise<{ execute: (stmt: unknown) => Promise<{ rows: unknown[] }> } | undefined>,
): RateLimitStore;
```

- [x] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import { RateLimiter } from "@/server/rate-limit";

describe("RateLimiter", () => {
  it("allows up to the limit and then returns retry-after", async () => {
    let now = 0;
    const limiter = new RateLimiter({ limit: 2, windowMs: 60_000, now: () => now });
    expect((await limiter.check("ip")).allowed).toBe(true);
    expect((await limiter.check("ip")).allowed).toBe(true);
    const blocked = await limiter.check("ip");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(60);
    now = 60_000;
    expect((await limiter.check("ip")).allowed).toBe(true);
  });

  it("isolates keys", async () => {
    const limiter = new RateLimiter({ limit: 1, windowMs: 60_000, now: () => 0 });
    expect((await limiter.check("a")).allowed).toBe(true);
    expect((await limiter.check("b")).allowed).toBe(true);
    expect((await limiter.check("a")).allowed).toBe(false);
  });

  it("falls back when the primary store fails", async () => {
    const limiter = new RateLimiter({
      limit: 1,
      windowMs: 60_000,
      now: () => 0,
      store: { hit: async () => { throw new Error("db down"); } },
    });
    expect((await limiter.check("a")).allowed).toBe(true);
    expect((await limiter.check("a")).allowed).toBe(false);
  });
});
```

- [x] **Step 2: Run to verify failure**

Run: `npx vitest run src/server/__tests__/rate-limit.test.ts`
Expected: FAIL because the module does not exist.

- [x] **Step 3: Implement memory and Turso stores**

- Memory store keeps `Map<string, { windowStart: number; count: number }>`.
- Turso store uses:

```sql
INSERT INTO rate_limits (key, window_start, count)
VALUES (?, ?, 1)
ON CONFLICT(key) DO UPDATE SET
  count = CASE
    WHEN rate_limits.window_start = excluded.window_start THEN rate_limits.count + 1
    ELSE 1
  END,
  window_start = excluded.window_start
RETURNING window_start, count
```

- `RateLimiter.check` computes `windowStart = Math.floor(now / windowMs) * windowMs`.
- On primary-store failure, retry with the fallback memory store.
- `allowed = count <= limit`; `retryAfterSeconds = Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000))`.

- [x] **Step 4: Run tests and typecheck**

Run: `npx vitest run src/server/__tests__/rate-limit.test.ts; npm run typecheck`
Expected: PASS.

---

### Task 5: Apply the limit to public Quran server functions

**Files:**
- Modify: `src/lib/quran-api.ts`
- Test: `src/server/__tests__/rate-limit.test.ts` (extend) or `src/lib/__tests__/quran-api.test.ts` (create)

**Interfaces:**
- Produces: `checkQuranRateLimit(): Promise<{ ok: true } | { ok: false; error: string }>`.

- [x] **Step 1: Write a failing unit test for the guard**

Test the pure helper `rateLimitError` / `isRateLimited` if server-request context is hard to mock. Keep request-dependent code thin.

- [x] **Step 2: Add the guard**

In `src/lib/quran-api.ts`:

```ts
import { getRequestIP, setResponseHeader, setResponseStatus } from "@tanstack/react-start/server";
import { RateLimiter, createTursoRateLimitStore } from "@/server/rate-limit";
import { getDbIfConfigured } from "@/server/db";

const limiter = new RateLimiter({
  limit: 120,
  windowMs: 60_000,
  store: createTursoRateLimitStore(getDbIfConfigured),
});

async function guard(): Promise<{ ok: true } | { ok: false; error: string }> {
  const ip = getRequestIP({ xForwardedFor: true }) ?? "unknown";
  const result = await limiter.check(`quran:${ip}`);
  if (result.allowed) return { ok: true };
  setResponseStatus(429);
  setResponseHeader("Retry-After", String(result.retryAfterSeconds));
  return {
    ok: false,
    error: `Too many requests. Please wait ${result.retryAfterSeconds} seconds.`,
  };
}
```

- At the start of `getQuranPage`, `getQuranTafsir`, and `getQuranAsbab`, call `guard()` and return the error object when not allowed.

- [x] **Step 3: Run tests**

Run: `npm test`
Expected: PASS.

---

### Task 6: Provider health endpoint

**Files:**
- Create: `src/server/health.ts`
- Create: `src/routes/api.health.ts`
- Test: `src/server/__tests__/health.test.ts`

**Interfaces:**
- Produces:

```ts
export type ProviderStatus = "ok" | "degraded" | "unconfigured" | "down";
export type HealthReport = {
  status: "ok" | "degraded" | "down";
  checkedAt: string;
  providers: { id: string; status: ProviderStatus; latencyMs?: number }[];
};
export async function checkScriptureProviders(options?: {
  fetchImpl?: typeof fetch;
  now?: () => number;
  apiBibleKey?: string;
}): Promise<HealthReport>;
```

- [x] **Step 1: Write failing tests**

```ts
import { describe, expect, it, vi } from "vitest";
import { checkScriptureProviders } from "@/server/health";

describe("checkScriptureProviders", () => {
  it("marks a failing provider down and keeps the report usable", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("api.alquran.cloud")) throw new Error("offline");
      return new Response("ok", { status: 200 });
    });
    const report = await checkScriptureProviders({ fetchImpl, apiBibleKey: "" });
    expect(report.status).toBe("degraded");
    expect(report.providers.find((p) => p.id === "quran")?.status).toBe("down");
    expect(report.providers.find((p) => p.id === "api-bible")?.status).toBe("unconfigured");
  });

  it("returns ok when every configured provider responds", async () => {
    const fetchImpl = vi.fn(async () => new Response("ok", { status: 200 }));
    const report = await checkScriptureProviders({ fetchImpl, apiBibleKey: "" });
    expect(report.status).toBe("ok");
  });
});
```

- [x] **Step 2: Run to verify failure**

Run: `npx vitest run src/server/__tests__/health.test.ts`
Expected: FAIL because the module does not exist.

- [x] **Step 3: Implement the checks**

Use direct pings with a 3-second `AbortController` timeout:

| id | URL |
| --- | --- |
| free-use | `https://bible.helloao.org/api/BSB/JHN/3.json` |
| sefaria | `https://www.sefaria.org/api/texts/Genesis%201%3A1?context=0` |
| quran | `https://api.alquran.cloud/v1/ayah/1:1/editions/quran-uthmani` |
| quran-page | `https://api.alquran.cloud/v1/page/1/quran-uthmani` |
| quran-tafsir | `https://api.quran.com/api/v4/tafsirs/169/by_ayah/17:3` |
| hadith | `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-bukhari/1.min.json` |
| asbab | `https://quranx.com/Tafsir/Wahidi/4.34` |
| api-bible | `https://rest.api.bible/v1/bibles?language=eng` with the `api-key` header, or `unconfigured` |

- Aggregate: all configured ok → `ok`; at least one down → `degraded`; all down → `down`.
- Memoize the report for 60 seconds in module scope.
- Cancel response bodies when possible.

- [x] **Step 4: Add the route**

`src/routes/api.health.ts`:

```ts
import { createFileRoute } from "@tanstack/react-router";
import { checkScriptureProviders } from "@/server/health";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const report = await checkScriptureProviders();
        return new Response(JSON.stringify(report), {
          status: report.status === "down" ? 503 : 200,
          headers: {
            "content-type": "application/json",
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});
```

- [x] **Step 5: Regenerate the route tree and run tests**

Run: `npx vite build; npx vitest run src/server/__tests__/health.test.ts`
Expected: build succeeds and the health tests pass.

---

### Task 7: End-to-end verification

**Files:**
- Modify: `src/server/__tests__/scripture.live.test.ts`

- [x] **Step 1: Add a live health assertion**

```ts
it("reports a health status for every provider", async () => {
  const response = await fetch("http://localhost:8080/api/health");
  expect(response.ok).toBe(true);
  const report = await response.json();
  expect(report.providers.length).toBeGreaterThanOrEqual(7);
}, 30_000);
```

Run the dev server before this test.

- [x] **Step 2: Run the full verification**

```powershell
npm test
npm run typecheck
npm run lint
npx vite build
$env:LIVE_API_TESTS='1'; npx vitest run src/server/__tests__/scripture.live.test.ts
```

Expected:
- Unit tests pass.
- Typecheck passes.
- Lint has no errors (pre-existing warnings allowed).
- Build succeeds.
- Live suite passes.
- `GET /api/health` returns JSON with provider statuses.
