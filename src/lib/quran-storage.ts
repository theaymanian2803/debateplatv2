export type QuranTextSize = "sm" | "md" | "lg";
export type QuranArabicFont = "naskh" | "amiri";

export type QuranReaderSettings = {
  textSize: QuranTextSize;
  arabicFont: QuranArabicFont;
  showTranslation: boolean;
};

export type LastRead = {
  page: number;
  translationId: string;
  surah: number;
  verse: number;
  updatedAt: string;
};

export type QuranBookmark = {
  surah: number;
  verse: number;
  page: number;
  surahName: string;
  createdAt: string;
};

const SETTINGS_KEY = "scholia-quran-settings";
const LAST_READ_KEY = "scholia-quran-last-read";
const BOOKMARKS_KEY = "scholia-quran-bookmarks";
const MAX_BOOKMARKS = 200;

export const defaultQuranSettings: QuranReaderSettings = {
  textSize: "md",
  arabicFont: "naskh",
  showTranslation: true,
};

export function normalizeQuranSettings(value: unknown): QuranReaderSettings {
  if (!value || typeof value !== "object") return { ...defaultQuranSettings };
  const input = value as Record<string, unknown>;

  const textSize =
    input["textSize"] === "sm" || input["textSize"] === "lg" ? input["textSize"] : "md";
  const arabicFont = input["arabicFont"] === "amiri" ? "amiri" : "naskh";
  const showTranslation =
    typeof input["showTranslation"] === "boolean" ? input["showTranslation"] : true;

  return { textSize, arabicFont, showTranslation };
}

function readJson(key: string): unknown {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Storage can be unavailable in private modes. */
  }
}

export function readQuranSettings(): QuranReaderSettings {
  return normalizeQuranSettings(readJson(SETTINGS_KEY));
}

export function storeQuranSettings(settings: QuranReaderSettings): void {
  writeJson(SETTINGS_KEY, settings);
}

function isLastRead(value: unknown): value is LastRead {
  if (!value || typeof value !== "object") return false;
  const input = value as Record<string, unknown>;
  return (
    typeof input["page"] === "number" &&
    input["page"] >= 1 &&
    input["page"] <= 604 &&
    typeof input["translationId"] === "string" &&
    typeof input["surah"] === "number" &&
    input["surah"] >= 1 &&
    input["surah"] <= 114 &&
    typeof input["verse"] === "number" &&
    input["verse"] >= 1 &&
    typeof input["updatedAt"] === "string"
  );
}

export function readLastRead(): LastRead | null {
  const value = readJson(LAST_READ_KEY);
  return isLastRead(value) ? value : null;
}

export function storeLastRead(value: LastRead): void {
  writeJson(LAST_READ_KEY, value);
}

function isBookmark(value: unknown): value is QuranBookmark {
  if (!value || typeof value !== "object") return false;
  const input = value as Record<string, unknown>;
  return (
    typeof input["surah"] === "number" &&
    input["surah"] >= 1 &&
    input["surah"] <= 114 &&
    typeof input["verse"] === "number" &&
    input["verse"] >= 1 &&
    typeof input["page"] === "number" &&
    input["page"] >= 1 &&
    input["page"] <= 604 &&
    typeof input["surahName"] === "string" &&
    typeof input["createdAt"] === "string"
  );
}

export function readBookmarks(): QuranBookmark[] {
  const value = readJson(BOOKMARKS_KEY);
  if (!Array.isArray(value)) return [];
  return value.filter(isBookmark).slice(-MAX_BOOKMARKS);
}

export function storeBookmarks(bookmarks: QuranBookmark[]): void {
  writeJson(BOOKMARKS_KEY, bookmarks.slice(-MAX_BOOKMARKS));
}

export function isBookmarked(bookmarks: QuranBookmark[], surah: number, verse: number): boolean {
  return bookmarks.some((bookmark) => bookmark.surah === surah && bookmark.verse === verse);
}

export function toggleBookmark(
  bookmarks: QuranBookmark[],
  bookmark: QuranBookmark,
): QuranBookmark[] {
  if (isBookmarked(bookmarks, bookmark.surah, bookmark.verse)) {
    return bookmarks.filter(
      (item) => !(item.surah === bookmark.surah && item.verse === bookmark.verse),
    );
  }
  return [...bookmarks, bookmark].slice(-MAX_BOOKMARKS);
}
