import { describe, expect, it } from "vitest";
import { RateLimiter, type RateLimitStore } from "@/server/rate-limit";

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
    const failing: RateLimitStore = {
      hit: async () => {
        throw new Error("db down");
      },
    };
    const limiter = new RateLimiter({
      limit: 1,
      windowMs: 60_000,
      now: () => 0,
      store: failing,
    });
    expect((await limiter.check("a")).allowed).toBe(true);
    expect((await limiter.check("a")).allowed).toBe(false);
  });
});
