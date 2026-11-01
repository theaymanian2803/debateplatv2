import { afterAll, describe, expect, it } from "vitest";
import { getDb, getDbIfConfigured } from "@/server/db";
import { createTursoCacheStore } from "@/server/cache";
import { createTursoRateLimitStore } from "@/server/rate-limit";

const enabled = process.env["RUN_TURSO_INTEGRATION"] === "1";
const suffix = Date.now().toString(36);
const cacheKey = `test:cache:${suffix}`;
const rateKey = `test:rate:${suffix}`;

describe.skipIf(!enabled)("persistent scripture cache integration", () => {
  afterAll(async () => {
    const db = await getDb();
    await db.execute({
      sql: "DELETE FROM scripture_cache WHERE key = ?",
      args: [cacheKey],
    });
    await db.execute({
      sql: "DELETE FROM rate_limits WHERE key = ?",
      args: [rateKey],
    });
  });

  it("writes and reads a cache entry through Turso", async () => {
    const store = createTursoCacheStore(getDbIfConfigured);
    await store.set(cacheKey, {
      value: { hello: "world" },
      expiresAt: Date.now() + 60_000,
    });

    const entry = await store.get(cacheKey);
    expect(entry?.value).toEqual({ hello: "world" });
  });

  it("increments the rate-limit counter atomically", async () => {
    const store = createTursoRateLimitStore(getDbIfConfigured);
    const windowStart = Math.floor(Date.now() / 60_000) * 60_000;

    const first = await store.hit(rateKey, windowStart, 60_000);
    const second = await store.hit(rateKey, windowStart, 60_000);

    expect(first.count).toBe(1);
    expect(second.count).toBe(2);
  });
});
