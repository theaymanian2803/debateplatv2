import { describe, expect, it } from "vitest";
import {
  defaultQuranSettings,
  isBookmarked,
  normalizeQuranSettings,
  toggleBookmark,
  type QuranBookmark,
} from "@/lib/quran-storage";

const bookmark = (surah: number, verse: number): QuranBookmark => ({
  surah,
  verse,
  page: 1,
  surahName: "Al-Fatihah",
  createdAt: "2026-10-25T00:00:00.000Z",
});

describe("normalizeQuranSettings", () => {
  it("falls back to defaults for invalid values", () => {
    expect(normalizeQuranSettings(null)).toEqual(defaultQuranSettings);
    expect(normalizeQuranSettings({ textSize: "huge" })).toEqual(defaultQuranSettings);
  });

  it("keeps valid settings", () => {
    expect(
      normalizeQuranSettings({
        textSize: "lg",
        arabicFont: "amiri",
        showTranslation: false,
      }),
    ).toEqual({ textSize: "lg", arabicFont: "amiri", showTranslation: false });
  });
});

describe("bookmarks", () => {
  it("adds and removes a bookmark", () => {
    const added = toggleBookmark([], bookmark(2, 255));
    expect(added).toHaveLength(1);
    expect(isBookmarked(added, 2, 255)).toBe(true);
    expect(toggleBookmark(added, bookmark(2, 255))).toEqual([]);
  });

  it("keeps at most 200 bookmarks, dropping the oldest", () => {
    const list = Array.from({ length: 200 }, (_, index) => bookmark(1, index + 1));
    const next = toggleBookmark(list, bookmark(2, 1));
    expect(next).toHaveLength(200);
    expect(next[0]).toEqual(bookmark(1, 2));
    expect(next[next.length - 1]).toEqual(bookmark(2, 1));
  });
});
