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
    const now = 1_000;
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
    await vi.waitFor(() => expect(loader).toHaveBeenCalledTimes(1));
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
