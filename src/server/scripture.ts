import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  bibleCommentaryTranslations,
  extractFreeUseCommentary,
  extractFreeUseVerses,
  freeUseTranslations,
  hadithTranslations,
  parseHadithReference,
  parseQuranReference,
  parseReference,
  quranTafsirTranslations,
  quranTranslations,
  sefariaTranslations,
  type QuranAsbabInput,
  type QuranAsbabResponse,
  type QuranAsbabResult,
  type QuranPageAyah,
  type QuranPageInput,
  type QuranPageResponse,
  type QuranPageResult,
  type QuranPageSurah,
  type ScriptureProvider,
  type ScriptureResult,
  type ScriptureTranslationOption,
} from "@/lib/scripture";
import { getStashedCloudflareEnv, resolveEnvVar } from "./env";
import { ScriptureCache, createTursoCacheStore } from "./cache";
import { getDbIfConfigured } from "./db";

const FREE_USE_BASE = "https://bible.helloao.org/api";
const API_BIBLE_BASE = "https://rest.api.bible/v1";
const SEFARIA_BASE = "https://www.sefaria.org/api";
const QURAN_BASE = "https://api.alquran.cloud/v1";
const QURAN_COM_BASE = "https://api.quran.com/api/v4";
const ASBAB_BASE = "https://quranx.com/Tafsir/Wahidi";
const ASBAB_ATTRIBUTION = "Asbab al-Nuzul by al-Wahidi, trans. Mokrane Guezzou - via QuranX";
const HADITH_BASE = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;

type AsbabCacheValue = { found: boolean; text: string; reference: string | null };

let scriptureCache: ScriptureCache | undefined;

function getScriptureCache(): ScriptureCache {
  if (!scriptureCache) {
    const persist =
      process.env["NODE_ENV"] !== "test" || process.env["RUN_TURSO_INTEGRATION"] === "1";
    scriptureCache = new ScriptureCache({
      ...(persist ? { store: createTursoCacheStore(getDbIfConfigured) } : {}),
    });
  }
  return scriptureCache;
}

class ScriptureError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function readEnv(name: string): string | undefined {
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
    name,
  );
}

function apiBibleKey(): string | undefined {
  return readEnv("BIBLE_API_KEY");
}

async function fetchJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json", ...headers },
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new ScriptureError(
          response.status,
          "This translation is not available with the configured API.Bible key.",
        );
      }
      if (response.status === 404) {
        throw new ScriptureError(404, "That reference was not found in this translation.");
      }
      if (response.status === 429) {
        throw new ScriptureError(
          429,
          "The scripture service rate limit was reached. Try again soon.",
        );
      }
      throw new ScriptureError(
        response.status,
        `The scripture service returned ${response.status}.`,
      );
    }
    return await response.json();
  } catch (error) {
    if (error instanceof ScriptureError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new ScriptureError(504, "The scripture service timed out. Try again.");
    }
    throw new ScriptureError(502, "Could not reach the scripture service.");
  } finally {
    clearTimeout(timer);
  }
}

function cleanText(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function isSafeId(value: string): boolean {
  return /^[A-Za-z0-9_-]{1,120}$/.test(value);
}

export type ScriptureFetchInput = {
  reference: string;
  provider: ScriptureProvider;
  translationId: string;
};

export type ScriptureTranslationsResponse = {
  options: ScriptureTranslationOption[];
  apiBible: boolean;
  warning?: string;
};

export type ScriptureFetchResponse =
  { ok: true; result: ScriptureResult } | { ok: false; error: string };

export async function listTranslations(): Promise<ScriptureTranslationsResponse> {
  const options = [
    ...freeUseTranslations,
    ...sefariaTranslations,
    ...quranTranslations,
    ...bibleCommentaryTranslations,
    ...quranTafsirTranslations,
    ...hadithTranslations,
  ];
  const key = apiBibleKey();
  if (!key) return { options, apiBible: false };

  try {
    const cachedList =
      await getScriptureCache().get<ScriptureTranslationOption[]>("api-bible-list:eng");
    if (cachedList) return { options: [...options, ...cachedList], apiBible: true };

    const payload = await fetchJson(`${API_BIBLE_BASE}/bibles?language=eng`, { "api-key": key });
    const data = (payload as { data?: unknown }).data;
    const bibles = Array.isArray(data)
      ? (data as { id?: unknown; name?: unknown; abbreviation?: unknown }[])
      : [];

    const popular = [
      "New International Version",
      "English Standard Version",
      "New Living Translation",
      "New American Standard Bible",
      "Christian Standard Bible",
      "New King James Version",
      "King James Version",
      "Good News Translation",
      "Contemporary English Version",
      "Amplified Bible",
      "The Message",
    ];
    const rank = (name: string) => {
      const index = popular.findIndex((p) => name.toLowerCase().includes(p.toLowerCase()));
      return index === -1 ? popular.length : index;
    };

    const seen = new Set<string>();
    const apiOptions: ScriptureTranslationOption[] = [];
    for (const bible of bibles) {
      const id = typeof bible.id === "string" ? bible.id : "";
      const name = typeof bible.name === "string" ? bible.name : "";
      if (!id || !name || !isSafeId(id) || seen.has(id)) continue;
      seen.add(id);
      const abbreviation = typeof bible.abbreviation === "string" ? bible.abbreviation : "";
      apiOptions.push({
        provider: "api-bible",
        id,
        label: abbreviation && abbreviation !== name ? `${name} (${abbreviation})` : name,
        detail: "Licensed via API.Bible",
      });
    }

    apiOptions.sort((a, b) => rank(a.label) - rank(b.label) || a.label.localeCompare(b.label));
    const limited = apiOptions.slice(0, 60);
    await getScriptureCache().set("api-bible-list:eng", limited, CACHE_TTL_MS);
    return { options: [...options, ...limited], apiBible: true };
  } catch (error) {
    return {
      options,
      apiBible: true,
      warning:
        error instanceof ScriptureError
          ? `${error.message} Showing public-domain translations only.`
          : "Could not load API.Bible translations. Showing public-domain translations only.",
    };
  }
}

async function fetchFreeUsePassage(
  referenceInput: string,
  translationId: string,
): Promise<ScriptureResult> {
  const reference = parseReference(referenceInput);
  if (!reference) {
    throw new ScriptureError(400, "Could not read that reference. Try a format like John 3:16.");
  }
  if (!isSafeId(translationId)) {
    throw new ScriptureError(400, "Unknown translation.");
  }

  const cacheKey = `chapter:${translationId}:${reference.bookId}:${reference.chapter}`;
  const payload = await getScriptureCache().getOrLoad(cacheKey, CACHE_TTL_MS, () =>
    fetchJson(
      `${FREE_USE_BASE}/${encodeURIComponent(translationId)}/${reference.bookId}/${reference.chapter}.json`,
    ),
  );

  const verses = extractFreeUseVerses(payload, reference);
  if (verses.length === 0) {
    throw new ScriptureError(404, `No verses found for ${reference.display} in this translation.`);
  }

  const translation = (payload as { translation?: Record<string, unknown> }).translation ?? {};
  const name = typeof translation["name"] === "string" ? translation["name"] : translationId;
  const license = (translation["license"] ?? {}) as { publicDomain?: unknown };
  const licenseUrl =
    typeof translation["licenseUrl"] === "string" ? translation["licenseUrl"] : undefined;
  const website = typeof translation["website"] === "string" ? translation["website"] : undefined;
  const attribution =
    license.publicDomain === true ? `${name} · Public domain` : (licenseUrl ?? undefined);

  return {
    provider: "free-use",
    reference: reference.display,
    translationId,
    translationLabel: name,
    text: verses.map((v) => v.text).join(" "),
    verses,
    fetchedAt: new Date().toISOString(),
    ...(attribution ? { attribution } : {}),
    ...(website ? { sourceUrl: website } : {}),
  };
}

async function apiBibleLabel(
  id: string,
  key: string,
): Promise<{ label: string; copyright?: string }> {
  const cachedMeta = await getScriptureCache().get<{ label: string; copyright?: string }>(
    `api-bible-meta:${id}`,
  );
  if (cachedMeta) return cachedMeta;
  try {
    const payload = await fetchJson(`${API_BIBLE_BASE}/bibles/${encodeURIComponent(id)}`, {
      "api-key": key,
    });
    const data = (payload as { data?: Record<string, unknown> }).data ?? {};
    const name = typeof data["name"] === "string" ? data["name"] : "API.Bible translation";
    const abbreviation = typeof data["abbreviation"] === "string" ? data["abbreviation"] : "";
    const label = abbreviation && abbreviation !== name ? `${name} (${abbreviation})` : name;
    return await getScriptureCache().set(`api-bible-meta:${id}`, { label }, CACHE_TTL_MS);
  } catch {
    return { label: "API.Bible translation" };
  }
}

async function fetchApiBiblePassage(
  referenceInput: string,
  translationId: string,
): Promise<ScriptureResult> {
  const key = apiBibleKey();
  if (!key) {
    throw new ScriptureError(
      503,
      "API.Bible is not configured. Add BIBLE_API_KEY, or use a public-domain translation.",
    );
  }
  const reference = parseReference(referenceInput);
  if (!reference) {
    throw new ScriptureError(400, "Could not read that reference. Try a format like John 3:16.");
  }
  if (!isSafeId(translationId)) {
    throw new ScriptureError(400, "Unknown translation.");
  }

  const chapterBase = `${reference.bookId}.${reference.chapter}`;
  const passageId = reference.verse
    ? reference.verseEnd && reference.verseEnd !== reference.verse
      ? `${chapterBase}.${reference.verse}-${reference.bookId}.${reference.chapter}.${reference.verseEnd}`
      : `${chapterBase}.${reference.verse}`
    : chapterBase;

  const query = new URLSearchParams({
    "content-type": "text",
    "include-verse-numbers": "false",
    "include-chapter-numbers": "false",
    "include-titles": "false",
    "include-notes": "false",
  });
  const payload = await fetchJson(
    `${API_BIBLE_BASE}/bibles/${encodeURIComponent(translationId)}/passages/${encodeURIComponent(passageId)}?${query.toString()}`,
    { "api-key": key },
  );
  const data = (payload as { data?: Record<string, unknown> }).data ?? {};
  const content = typeof data["content"] === "string" ? cleanText(data["content"]) : "";
  if (!content) {
    throw new ScriptureError(404, `No verses found for ${reference.display} in this translation.`);
  }

  const meta = await apiBibleLabel(translationId, key);
  const copyright = typeof data["copyright"] === "string" ? data["copyright"] : meta.copyright;
  const apiReference =
    typeof data["reference"] === "string" ? data["reference"] : reference.display;

  return {
    provider: "api-bible",
    reference: apiReference,
    translationId,
    translationLabel: meta.label,
    text: content,
    verses: [{ number: reference.verse ?? 0, text: content }],
    fetchedAt: new Date().toISOString(),
    ...(copyright ? { attribution: copyright } : {}),
    sourceUrl: "https://api.bible",
  };
}

function isSafeSefariaRef(value: string): boolean {
  const ref = value.trim();
  return ref.length > 0 && ref.length <= 200 && !/[/\\?#%]/.test(ref);
}

function stripHtml(input: string): string {
  return input
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function flattenSefariaText(value: unknown): string {
  const pieces: string[] = [];
  const walk = (node: unknown) => {
    if (typeof node === "string") pieces.push(node);
    else if (Array.isArray(node)) for (const child of node) walk(child);
  };
  walk(value);
  return pieces.map(stripHtml).filter(Boolean).join(" ");
}

function sefariaUrl(ref: string): string {
  const path = ref.includes(" on ")
    ? ref.replace(/\s+/g, "_").replace(/:/g, ".")
    : ref.replace(/\s+/g, ".").replace(/:/g, ".");
  return `https://www.sefaria.org/${path}`;
}

function licenseSummary(title: string | undefined, license: string | undefined): string {
  const name = title ?? "Sefaria text";
  return license ? `${name} (${license})` : name;
}

async function fetchSefariaPassage(
  referenceInput: string,
  translationId: string,
): Promise<ScriptureResult> {
  const ref = referenceInput.trim().replace(/\s+/g, " ");
  if (!isSafeSefariaRef(ref)) {
    throw new ScriptureError(
      400,
      "Could not read that Sefaria reference. Try Genesis 1:1, Berakhot 2a, or Rashi on Genesis 1:1.",
    );
  }

  const cacheKey = `sefaria:${ref}`;
  const payload = await getScriptureCache().getOrLoad(cacheKey, CACHE_TTL_MS, () =>
    fetchJson(`${SEFARIA_BASE}/texts/${encodeURIComponent(ref)}?context=0`),
  );

  const data = payload as Record<string, unknown>;
  const english = flattenSefariaText(data["text"]);
  const hebrew = flattenSefariaText(data["he"]);
  if (!english && !hebrew) {
    throw new ScriptureError(404, `No text found for “${ref}” on Sefaria.`);
  }

  const resolvedRef = typeof data["ref"] === "string" && data["ref"] ? data["ref"] : ref;
  const englishTitle = typeof data["versionTitle"] === "string" ? data["versionTitle"] : undefined;
  const hebrewTitle =
    typeof data["heVersionTitle"] === "string" ? data["heVersionTitle"] : undefined;
  const englishLicense = typeof data["license"] === "string" ? data["license"] : undefined;
  const hebrewLicense = typeof data["heLicense"] === "string" ? data["heLicense"] : undefined;

  let text = english || hebrew;
  let textIsHebrew = !english && Boolean(hebrew);
  let originalIsHebrew = textIsHebrew;
  let secondaryText: string | undefined;
  let translationLabel = englishTitle ?? hebrewTitle ?? "Sefaria";
  let secondaryLabel: string | undefined;
  const covers: string[] = [];

  if (translationId === "hebrew") {
    text = hebrew || english;
    textIsHebrew = Boolean(hebrew);
    originalIsHebrew = textIsHebrew;
    translationLabel = hebrewTitle ?? englishTitle ?? "Sefaria";
    covers.push(licenseSummary(hebrewTitle ?? englishTitle, hebrewLicense ?? englishLicense));
  } else if (translationId === "english") {
    text = english || hebrew;
    textIsHebrew = !english && Boolean(hebrew);
    originalIsHebrew = textIsHebrew;
    translationLabel = englishTitle ?? hebrewTitle ?? "Sefaria";
    covers.push(licenseSummary(englishTitle ?? hebrewTitle, englishLicense ?? hebrewLicense));
  } else {
    translationLabel = englishTitle ?? hebrewTitle ?? "Sefaria";
    if (hebrew) {
      covers.push(licenseSummary(hebrewTitle, hebrewLicense));
      if (english) {
        secondaryText = hebrew;
        secondaryLabel = hebrewTitle ?? "Hebrew";
        originalIsHebrew = true;
        covers.push(licenseSummary(englishTitle, englishLicense));
      }
    } else {
      covers.push(licenseSummary(englishTitle, englishLicense));
    }
  }

  covers.push("via Sefaria");

  return {
    provider: "sefaria",
    reference: resolvedRef,
    translationId,
    translationLabel,
    text,
    verses: [{ number: 0, text }],
    fetchedAt: new Date().toISOString(),
    attribution: covers.join(" · "),
    sourceUrl: sefariaUrl(resolvedRef),
    textDirection: textIsHebrew ? "rtl" : "ltr",
    direction: originalIsHebrew ? "rtl" : "ltr",
    ...(originalIsHebrew ? { language: "he" as const } : {}),
    ...(secondaryText ? { secondaryText } : {}),
    ...(secondaryLabel ? { secondaryLabel } : {}),
  };
}

type AlQuranEdition = {
  text?: unknown;
  numberInSurah?: unknown;
  edition?: {
    identifier?: unknown;
    englishName?: unknown;
    name?: unknown;
    language?: unknown;
  };
};

async function fetchQuranVerse(
  surah: number,
  verse: number,
  translationId: string,
): Promise<{ arabic: string; translation: string; translationName?: string }> {
  const cacheKey = `quran:${surah}:${verse}:${translationId}`;
  const payload = await getScriptureCache().getOrLoad(cacheKey, CACHE_TTL_MS, () => {
    const editions = translationId === "none" ? "quran-uthmani" : `quran-uthmani,${translationId}`;
    return fetchJson(`${QURAN_BASE}/ayah/${surah}:${verse}/editions/${editions}`);
  });

  const data = (payload as { data?: unknown }).data;
  const list = (Array.isArray(data) ? data : data ? [data] : []) as AlQuranEdition[];
  const arabicEdition =
    list.find((item) => item.edition?.identifier === "quran-uthmani") ??
    list.find((item) => item.edition?.language === "ar");
  const translationEdition =
    translationId === "none"
      ? undefined
      : list.find((item) => item.edition?.identifier === translationId);

  const arabic = typeof arabicEdition?.text === "string" ? arabicEdition.text.trim() : "";
  const translation =
    typeof translationEdition?.text === "string" ? translationEdition.text.trim() : "";
  const translationName =
    typeof translationEdition?.edition?.englishName === "string"
      ? translationEdition.edition.englishName
      : undefined;

  return {
    arabic,
    translation,
    ...(translationName ? { translationName } : {}),
  };
}

async function fetchQuranPassage(
  referenceInput: string,
  translationId: string,
): Promise<ScriptureResult> {
  const reference = parseQuranReference(referenceInput);
  if (!reference) {
    throw new ScriptureError(400, "Could not read that Quran reference. Try 17:3 or 2:255-257.");
  }
  const end = reference.verseEnd ?? reference.verse;
  if (end - reference.verse > 20) {
    throw new ScriptureError(400, "Choose a Quran range of 20 verses or fewer.");
  }

  const numbers = Array.from({ length: end - reference.verse + 1 }, (_, i) => reference.verse + i);
  const passages = await Promise.all(
    numbers.map((number) => fetchQuranVerse(reference.surah, number, translationId)),
  );

  const arabic = passages
    .map((p) => p.arabic)
    .filter(Boolean)
    .join(" ");
  const translation = passages
    .map((p) => p.translation)
    .filter(Boolean)
    .join(" ");
  if (!arabic && !translation) {
    throw new ScriptureError(404, `No text found for ${reference.display}.`);
  }

  const translationName = passages.find((p) => p.translationName)?.translationName;
  const text = translation || arabic;
  const hasTranslation = Boolean(translation);

  return {
    provider: "quran",
    reference: reference.display,
    translationId,
    translationLabel: translationName ?? "Uthmani Arabic",
    text,
    verses: numbers.map((number, index) => ({
      number,
      text: passages[index]?.translation || passages[index]?.arabic || "",
    })),
    fetchedAt: new Date().toISOString(),
    attribution: `${translationName ?? "Uthmani Arabic"} · Arabic: Uthmani · via AlQuran Cloud`,
    sourceUrl: `https://alquran.cloud/ayah/${reference.surah}:${reference.verse}/${translationId}`,
    textDirection: hasTranslation ? "ltr" : "rtl",
    direction: "rtl",
    language: "ar",
    ...(hasTranslation ? { secondaryText: arabic, secondaryLabel: "Uthmani Arabic" } : {}),
  };
}

async function fetchFreeCommentaryPassage(
  referenceInput: string,
  commentaryId: string,
): Promise<ScriptureResult> {
  const reference = parseReference(referenceInput);
  if (!reference) {
    throw new ScriptureError(400, "Could not read that Bible reference. Try John 17:3.");
  }
  if (!isSafeId(commentaryId)) {
    throw new ScriptureError(400, "Unknown commentary.");
  }

  const cacheKey = `commentary:${commentaryId}:${reference.bookId}:${reference.chapter}`;
  const payload = await getScriptureCache().getOrLoad(cacheKey, CACHE_TTL_MS, () =>
    fetchJson(
      `${FREE_USE_BASE}/c/${encodeURIComponent(commentaryId)}/${reference.bookId}/${reference.chapter}.json`,
    ),
  );

  const verses = extractFreeUseCommentary(payload, reference);
  if (verses.length === 0) {
    throw new ScriptureError(404, `No commentary found for ${reference.display} in this source.`);
  }

  const meta = (payload as { commentary?: Record<string, unknown> }).commentary ?? {};
  const name = typeof meta["name"] === "string" ? meta["name"] : commentaryId;
  const license =
    (typeof meta["licenseNotice"] === "string" && meta["licenseNotice"]) ||
    (typeof meta["licenseUrl"] === "string" && meta["licenseUrl"]) ||
    "See source for licence";
  const website = typeof meta["website"] === "string" ? meta["website"] : undefined;

  return {
    provider: "free-commentary",
    reference: reference.display,
    translationId: commentaryId,
    translationLabel: name,
    text: verses.map((v) => v.text).join("\n\n"),
    verses,
    fetchedAt: new Date().toISOString(),
    attribution: `${license} · via Free Use Bible API`,
    ...(website ? { sourceUrl: website } : {}),
    direction: "ltr",
    textDirection: "ltr",
  };
}

async function fetchQuranTafsirPassage(
  referenceInput: string,
  tafsirId: string,
): Promise<ScriptureResult> {
  const reference = parseQuranReference(referenceInput);
  if (!reference) {
    throw new ScriptureError(400, "Could not read that Quran reference. Try 17:3.");
  }
  if (!/^\d{1,4}$/.test(tafsirId)) {
    throw new ScriptureError(400, "Unknown tafsir.");
  }
  const end = reference.verseEnd ?? reference.verse;
  if (end - reference.verse > 9) {
    throw new ScriptureError(400, "Choose a Quran range of 10 verses or fewer for tafsir.");
  }

  const numbers = Array.from({ length: end - reference.verse + 1 }, (_, i) => reference.verse + i);
  let resourceName = "Tafsir";
  const parts: string[] = [];
  for (const number of numbers) {
    const cacheKey = `tafsir:${tafsirId}:${reference.surah}:${number}`;
    const payload = await getScriptureCache().getOrLoad(cacheKey, CACHE_TTL_MS, () =>
      fetchJson(`${QURAN_COM_BASE}/tafsirs/${tafsirId}/by_ayah/${reference.surah}:${number}`),
    );
    const tafsir = (payload as { tafsir?: Record<string, unknown> }).tafsir ?? {};
    const text = typeof tafsir["text"] === "string" ? cleanText(tafsir["text"]) : "";
    if (typeof tafsir["resource_name"] === "string") resourceName = tafsir["resource_name"];
    if (text) parts.push(text);
  }

  if (parts.length === 0) {
    throw new ScriptureError(404, `No tafsir found for ${reference.display} in this source.`);
  }

  const isArabicTafsir = tafsirId === "15" || tafsirId === "90" || tafsirId === "14";
  const text = parts.join("\n\n");

  return {
    provider: "quran-tafsir",
    reference: reference.display,
    translationId: tafsirId,
    translationLabel: resourceName,
    text,
    verses: numbers.map((number, index) => ({ number, text: parts[index] ?? "" })),
    fetchedAt: new Date().toISOString(),
    attribution: `${resourceName} · via Quran.com`,
    sourceUrl: `https://quran.com/${reference.surah}/${reference.verse}`,
    direction: isArabicTafsir ? "rtl" : "ltr",
    textDirection: isArabicTafsir ? "rtl" : "ltr",
    ...(isArabicTafsir ? { language: "ar" as const } : {}),
  };
}

type HadithRow = {
  hadithnumber?: unknown;
  text?: unknown;
  reference?: { book?: unknown; hadith?: unknown };
};

function findHadith(
  payload: unknown,
  book: number | undefined,
  number: number,
): HadithRow | undefined {
  const rows = (payload as { hadiths?: unknown }).hadiths;
  if (!Array.isArray(rows)) return undefined;
  if (book === undefined) return rows[0] as HadithRow | undefined;
  return (rows as HadithRow[]).find((row) => Number(row.reference?.hadith) === number);
}

async function fetchHadithPassage(
  referenceInput: string,
  collectionId: string,
): Promise<ScriptureResult> {
  const reference = parseHadithReference(referenceInput);
  if (!reference) {
    throw new ScriptureError(
      400,
      "Could not read that hadith reference. Try Bukhari 1 or Bukhari 2:1.",
    );
  }
  if (collectionId !== reference.collection.id) {
    throw new ScriptureError(400, "That collection does not match the reference.");
  }

  const { collection, number, book } = reference;
  const loadEdition = async (prefix: "ara" | "eng") => {
    const cacheKey = `hadith:${prefix}-${collection.id}:${book ?? "-"}:${number}`;
    return getScriptureCache().getOrLoad(cacheKey, CACHE_TTL_MS, () => {
      const url =
        book === undefined
          ? `${HADITH_BASE}/${prefix}-${collection.id}/${number}.min.json`
          : `${HADITH_BASE}/${prefix}-${collection.id}/sections/${book}.min.json`;
      return fetchJson(url);
    });
  };

  const [arabicPayload, englishPayload] = await Promise.all([
    loadEdition("ara"),
    loadEdition("eng"),
  ]);
  const arabicRow = findHadith(arabicPayload, book, number);
  const englishRow = findHadith(englishPayload, book, number);
  const arabic = typeof arabicRow?.text === "string" ? arabicRow.text.trim() : "";
  const english = typeof englishRow?.text === "string" ? englishRow.text.trim() : "";

  if (!arabicRow && !englishRow) {
    throw new ScriptureError(404, `No hadith found for ${reference.display}.`);
  }
  if (!arabic && !english) {
    throw new ScriptureError(
      404,
      `No Arabic or English text is available for ${reference.display}.`,
    );
  }

  const englishMeta = (englishPayload as { metadata?: Record<string, unknown> }).metadata ?? {};
  const sectionNames = (englishMeta["section"] ?? {}) as Record<string, unknown>;
  const sectionName =
    book !== undefined
      ? sectionNames[String(book)]
      : (Object.values(sectionNames)[0] as string | undefined);
  const globalNumber = Number(englishRow?.hadithnumber ?? arabicRow?.hadithnumber ?? number);

  return {
    provider: "hadith",
    reference: reference.display,
    translationId: collection.id,
    translationLabel: collection.label,
    text: english || arabic,
    verses: [{ number, text: english || arabic }],
    fetchedAt: new Date().toISOString(),
    attribution: `${collection.label}${sectionName ? ` · ${sectionName}` : ""} · Arabic + English (${collection.translator}) · via Hadith API`,
    sourceUrl: `https://sunnah.com/${collection.id}:${globalNumber}`,
    direction: "rtl",
    language: "ar",
    textDirection: english ? "ltr" : "rtl",
    ...(english && arabic ? { secondaryText: arabic, secondaryLabel: "Arabic" } : {}),
  };
}

const QURAN_TOTAL_PAGES = 604;
const quranTranslationIds = new Set(quranTranslations.map((option) => option.id));

type AlQuranPageAyah = {
  number?: unknown;
  text?: unknown;
  numberInSurah?: unknown;
  juz?: unknown;
  page?: unknown;
  sajda?: unknown;
  surah?: {
    number?: unknown;
    name?: unknown;
    englishName?: unknown;
    englishNameTranslation?: unknown;
    numberOfAyahs?: unknown;
    revelationType?: unknown;
  };
};

type AlQuranPagePayload = {
  data?: {
    ayahs?: unknown;
    edition?: { identifier?: unknown; englishName?: unknown };
  };
};

async function loadQuranPageEdition(page: number, edition: string): Promise<AlQuranPagePayload> {
  const cacheKey = `quran-page:${page}:${edition}`;
  return getScriptureCache().getOrLoad(
    cacheKey,
    CACHE_TTL_MS,
    () =>
      fetchJson(
        `${QURAN_BASE}/page/${page}/${encodeURIComponent(edition)}`,
      ) as Promise<AlQuranPagePayload>,
  );
}

export async function fetchQuranPage(input: QuranPageInput): Promise<QuranPageResponse> {
  const page = Math.trunc(input.page);
  if (!Number.isFinite(page) || page < 1 || page > QURAN_TOTAL_PAGES) {
    return { ok: false, error: "Choose a Quran page between 1 and 604." };
  }
  if (!quranTranslationIds.has(input.translationId)) {
    return { ok: false, error: "Unknown Quran translation." };
  }

  try {
    const hasTranslation = input.translationId !== "none";
    const [arabicPayload, translationPayload] = await Promise.all([
      loadQuranPageEdition(page, "quran-uthmani"),
      hasTranslation ? loadQuranPageEdition(page, input.translationId) : Promise.resolve(undefined),
    ]);

    const rows = (arabicPayload.data?.ayahs ?? []) as AlQuranPageAyah[];
    const translationRows = (translationPayload?.data?.ayahs ?? []) as AlQuranPageAyah[];
    const translations = new Map<number, string>();
    for (const row of translationRows) {
      if (typeof row.number === "number" && typeof row.text === "string") {
        translations.set(row.number, row.text.trim());
      }
    }

    const surahs = new Map<number, QuranPageSurah>();
    const ayahs: QuranPageAyah[] = [];
    for (const row of rows) {
      const number = typeof row.number === "number" ? row.number : 0;
      const surah = row.surah;
      const surahNumber = typeof surah?.number === "number" ? surah.number : 0;
      if (number === 0 || surahNumber === 0) continue;

      if (!surahs.has(surahNumber)) {
        surahs.set(surahNumber, {
          number: surahNumber,
          name: typeof surah?.name === "string" ? surah.name : "",
          englishName: typeof surah?.englishName === "string" ? surah.englishName : "",
          englishNameTranslation:
            typeof surah?.englishNameTranslation === "string" ? surah.englishNameTranslation : "",
          numberOfAyahs: typeof surah?.numberOfAyahs === "number" ? surah.numberOfAyahs : 0,
          revelationType: typeof surah?.revelationType === "string" ? surah.revelationType : "",
        });
      }

      ayahs.push({
        number,
        numberInSurah: typeof row.numberInSurah === "number" ? row.numberInSurah : 0,
        surah: surahNumber,
        surahName: typeof surah?.englishName === "string" ? surah.englishName : "",
        arabic: typeof row.text === "string" ? row.text.trim() : "",
        translation: translations.get(number) ?? "",
        page: typeof row.page === "number" ? row.page : page,
        juz: typeof row.juz === "number" ? row.juz : 0,
        sajda: row.sajda === true,
      });
    }

    if (ayahs.length === 0) {
      throw new ScriptureError(404, `No text found for Quran page ${page}.`);
    }

    const arabicName =
      typeof arabicPayload.data?.edition?.englishName === "string"
        ? arabicPayload.data.edition.englishName
        : "Uthmani";
    const translationName =
      typeof translationPayload?.data?.edition?.englishName === "string"
        ? translationPayload.data.edition.englishName
        : undefined;
    const translationLabel = hasTranslation
      ? (translationName ?? "Translation")
      : `${arabicName} Arabic`;

    return {
      ok: true,
      result: {
        page,
        totalPages: QURAN_TOTAL_PAGES,
        translationId: input.translationId,
        translationLabel,
        ayahs,
        surahs: [...surahs.values()],
        fetchedAt: new Date().toISOString(),
        attribution: `${translationLabel} - Arabic: ${arabicName} - via AlQuran Cloud`,
        direction: "rtl",
      },
    };
  } catch (error) {
    if (error instanceof ScriptureError) return { ok: false, error: error.message };
    return { ok: false, error: "Could not fetch that Quran page. Try again." };
  }
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_match, decimal: string) => String.fromCodePoint(Number(decimal)))
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function asbabResult(surah: number, verse: number, value: AsbabCacheValue): QuranAsbabResult {
  return {
    surah,
    verse,
    found: value.found,
    text: value.text,
    reference: value.reference,
    sourceUrl: `${ASBAB_BASE}/${surah}.${verse}`,
    attribution: ASBAB_ATTRIBUTION,
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchQuranAsbab(input: QuranAsbabInput): Promise<QuranAsbabResponse> {
  const reference = parseQuranReference(`${input.surah}:${input.verse}`);
  if (!reference) {
    return { ok: false, error: "Could not read that Quran reference. Try 17:3." };
  }
  const { surah, verse } = reference;

  const cacheKey = `asbab:${surah}:${verse}`;
  const cachedValue = await getScriptureCache().get<AsbabCacheValue>(cacheKey);
  if (cachedValue) {
    return { ok: true, result: asbabResult(surah, verse, cachedValue) };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${ASBAB_BASE}/${surah}.${verse}`, {
      signal: controller.signal,
      headers: {
        accept: "text/html",
        "user-agent": "ScholiaQuranReader/1.0",
      },
    });

    if (response.status === 404) {
      const value = await getScriptureCache().set(
        cacheKey,
        { found: false, text: "", reference: null },
        CACHE_TTL_MS,
      );
      return { ok: true, result: asbabResult(surah, verse, value) };
    }
    if (!response.ok) {
      if (response.status === 429) {
        throw new ScriptureError(
          429,
          "The occasion-of-revelation source rate limit was reached. Try again soon.",
        );
      }
      throw new ScriptureError(
        response.status,
        `The occasion-of-revelation source returned ${response.status}.`,
      );
    }

    const html = await response.text();
    const block = /<dd[^>]*class=["'][^"']*highlightable[^"']*["'][^>]*>([\s\S]*?)<\/dd>/i.exec(
      html,
    );
    if (!block) {
      throw new ScriptureError(502, "Could not read the occasion of revelation from the source.");
    }

    const text = decodeHtmlEntities(
      (block[1] ?? "").replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " "),
    )
      .replace(/\s+/g, " ")
      .trim();
    if (!text) {
      throw new ScriptureError(502, "Could not read the occasion of revelation from the source.");
    }

    const cited = /[[(](\d{1,3}):(\d{1,3})(?:\s*[-\u2013]\s*(\d{1,3}))?[\])]/.exec(text);
    const citedReference =
      cited && cited[1] && cited[2]
        ? `${cited[1]}:${cited[2]}${cited[3] ? `-${cited[3]}` : ""}`
        : null;

    const value = await getScriptureCache().set(
      cacheKey,
      { found: true, text, reference: citedReference },
      CACHE_TTL_MS,
    );
    return { ok: true, result: asbabResult(surah, verse, value) };
  } catch (error) {
    if (error instanceof ScriptureError) return { ok: false, error: error.message };
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, error: "The occasion-of-revelation source timed out. Try again." };
    }
    return { ok: false, error: "Could not reach the occasion-of-revelation source." };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchPassage(input: ScriptureFetchInput): Promise<ScriptureFetchResponse> {
  try {
    const result =
      input.provider === "api-bible"
        ? await fetchApiBiblePassage(input.reference, input.translationId)
        : input.provider === "sefaria"
          ? await fetchSefariaPassage(input.reference, input.translationId)
          : input.provider === "quran"
            ? await fetchQuranPassage(input.reference, input.translationId)
            : input.provider === "free-commentary"
              ? await fetchFreeCommentaryPassage(input.reference, input.translationId)
              : input.provider === "quran-tafsir"
                ? await fetchQuranTafsirPassage(input.reference, input.translationId)
                : input.provider === "hadith"
                  ? await fetchHadithPassage(input.reference, input.translationId)
                  : await fetchFreeUsePassage(input.reference, input.translationId);
    return { ok: true, result };
  } catch (error) {
    if (error instanceof ScriptureError) return { ok: false, error: error.message };
    return { ok: false, error: "Could not fetch that passage. Try again." };
  }
}
