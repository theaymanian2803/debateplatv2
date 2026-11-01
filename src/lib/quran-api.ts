import { createServerFn } from "@tanstack/react-start";
import { getRequestIP, setResponseHeader, setResponseStatus } from "@tanstack/react-start/server";
import { fetchPassage, fetchQuranAsbab, fetchQuranPage } from "@/server/scripture";
import { getDbIfConfigured } from "@/server/db";
import { RateLimiter, createTursoRateLimitStore } from "@/server/rate-limit";

const persistRateLimits =
  process.env["NODE_ENV"] !== "test" || process.env["RUN_TURSO_INTEGRATION"] === "1";

const limiter = new RateLimiter({
  limit: 120,
  windowMs: 60_000,
  ...(persistRateLimits ? { store: createTursoRateLimitStore(getDbIfConfigured) } : {}),
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

export type QuranPageRequest = {
  page: number;
  translationId: string;
};

export const getQuranPage = createServerFn({ method: "POST" })
  .validator((input: QuranPageRequest) => input)
  .handler(async ({ data }) => {
    const limited = await guard();
    if (!limited.ok) return limited;
    return fetchQuranPage(data);
  });

export type QuranTafsirRequest = {
  surah: number;
  verse: number;
  tafsirId: string;
};

export const getQuranTafsir = createServerFn({ method: "POST" })
  .validator((input: QuranTafsirRequest) => input)
  .handler(async ({ data }) => {
    const limited = await guard();
    if (!limited.ok) return limited;
    return fetchPassage({
      reference: `${data.surah}:${data.verse}`,
      provider: "quran-tafsir",
      translationId: data.tafsirId,
    });
  });

export type QuranAsbabRequest = {
  surah: number;
  verse: number;
};

export const getQuranAsbab = createServerFn({ method: "POST" })
  .validator((input: QuranAsbabRequest) => input)
  .handler(async ({ data }) => {
    const limited = await guard();
    if (!limited.ok) return limited;
    return fetchQuranAsbab(data);
  });
