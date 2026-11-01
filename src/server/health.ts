import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getStashedCloudflareEnv, resolveEnvVar } from "./env";

export type ProviderStatus = "ok" | "degraded" | "unconfigured" | "down";

export type ProviderHealth = {
  id: string;
  status: ProviderStatus;
  latencyMs?: number;
};

export type HealthReport = {
  status: "ok" | "degraded" | "down";
  checkedAt: string;
  providers: ProviderHealth[];
};

export type HealthOptions = {
  fetchImpl?: typeof fetch;
  now?: () => number;
  apiBibleKey?: string;
};

const MEMO_MS = 60_000;
let memo: { at: number; report: HealthReport } | undefined;

function readApiBibleKey(): string | undefined {
  return resolveEnvVar(
    {
      cloudflare: getStashedCloudflareEnv(),
      processEnv: process.env,
      readFile: (path) => {
        try {
          return readFileSync(join(process.cwd(), path), "utf8");
        } catch {
          return undefined;
        }
      },
    },
    "BIBLE_API_KEY",
  );
}

async function ping(
  fetchImpl: typeof fetch,
  url: string,
  headers: Record<string, string> = {},
): Promise<{ ok: boolean; latencyMs: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3_000);
  const started = Date.now();
  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers: { accept: "*/*", ...headers },
    });
    try {
      await response.body?.cancel();
    } catch {
      /* The status is what matters. */
    }
    return { ok: response.ok, latencyMs: Date.now() - started };
  } catch {
    return { ok: false, latencyMs: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

export async function checkScriptureProviders(options: HealthOptions = {}): Promise<HealthReport> {
  const now = (options.now ?? Date.now)();
  const cacheable = options.fetchImpl === undefined && options.apiBibleKey === undefined;

  if (cacheable && memo && now - memo.at < MEMO_MS) {
    return memo.report;
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const apiBibleKey = options.apiBibleKey ?? readApiBibleKey();

  const checks: { id: string; url: string; headers?: Record<string, string> }[] = [
    { id: "free-use", url: "https://bible.helloao.org/api/BSB/JHN/3.json" },
    {
      id: "sefaria",
      url: "https://www.sefaria.org/api/texts/Genesis%201%3A1?context=0",
    },
    { id: "quran", url: "https://api.alquran.cloud/v1/ayah/1:1/editions/quran-uthmani" },
    { id: "quran-page", url: "https://api.alquran.cloud/v1/page/1/quran-uthmani" },
    {
      id: "quran-tafsir",
      url: "https://api.quran.com/api/v4/tafsirs/169/by_ayah/17:3",
    },
    {
      id: "hadith",
      url: "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-bukhari/1.min.json",
    },
    {
      id: "asbab",
      url: "https://quranx.com/Tafsir/Wahidi/4.34",
      headers: { "user-agent": "ScholiaQuranReader/1.0" },
    },
  ];

  if (apiBibleKey) {
    checks.push({
      id: "api-bible",
      url: "https://rest.api.bible/v1/bibles?language=eng",
      headers: { "api-key": apiBibleKey },
    });
  }

  const results = await Promise.all(
    checks.map(async (check) => {
      const result = await ping(fetchImpl, check.url, check.headers);
      return {
        id: check.id,
        status: result.ok ? ("ok" as const) : ("down" as const),
        latencyMs: result.latencyMs,
      };
    }),
  );

  const providers: ProviderHealth[] = apiBibleKey
    ? results
    : [...results, { id: "api-bible", status: "unconfigured" }];

  const configured = providers.filter((provider) => provider.status !== "unconfigured");
  const down = configured.filter((provider) => provider.status === "down");
  const status = down.length === 0 ? "ok" : down.length === configured.length ? "down" : "degraded";

  const report: HealthReport = {
    status,
    checkedAt: new Date(now).toISOString(),
    providers,
  };

  if (cacheable) memo = { at: now, report };
  return report;
}
