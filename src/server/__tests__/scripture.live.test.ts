import { describe, expect, it } from "vitest";
import {
  fetchPassage,
  fetchQuranAsbab,
  fetchQuranPage,
  listTranslations,
} from "@/server/scripture";

const live = { timeout: 30000 };
const liveEnabled = process.env["LIVE_API_TESTS"] === "1";

describe.skipIf(!liveEnabled)("live scripture providers", () => {
  it(
    "free-use Bible (BSB) returns John 3:16-17",
    async () => {
      const response = await fetchPassage({
        reference: "John 3:16-17",
        provider: "free-use",
        translationId: "BSB",
      });
      expect(response.ok).toBe(true);
      if (!response.ok) return;
      expect(response.result.provider).toBe("free-use");
      expect(response.result.text).toContain("God so loved the world");
      expect(response.result.verses.map((v) => v.number)).toEqual([16, 17]);
      expect(response.result.translationLabel).toContain("Berean");
    },
    live.timeout,
  );

  it(
    "Sefaria returns Genesis 1:1 in English and Hebrew",
    async () => {
      const response = await fetchPassage({
        reference: "Genesis 1:1",
        provider: "sefaria",
        translationId: "bilingual",
      });
      expect(response.ok).toBe(true);
      if (!response.ok) return;
      expect(response.result.provider).toBe("sefaria");
      expect(response.result.text.length).toBeGreaterThan(0);
      expect(response.result.secondaryText?.length ?? 0).toBeGreaterThan(0);
      expect(response.result.attribution).toContain("Sefaria");
      expect(response.result.sourceUrl).toContain("sefaria.org");
    },
    live.timeout,
  );

  it(
    "Matthew Henry commentary returns John 3:16",
    async () => {
      const response = await fetchPassage({
        reference: "John 3:16",
        provider: "free-commentary",
        translationId: "matthew-henry",
      });
      expect(response.ok).toBe(true);
      if (!response.ok) return;
      expect(response.result.provider).toBe("free-commentary");
      expect(response.result.text.length).toBeGreaterThan(1000);
      expect(response.result.text).toContain("Nicodemus");
      expect(response.result.translationLabel).toContain("Matthew Henry");
    },
    live.timeout,
  );

  it(
    "Quran ayah returns Arabic and Saheeh International",
    async () => {
      const response = await fetchPassage({
        reference: "17:3",
        provider: "quran",
        translationId: "en.sahih",
      });
      expect(response.ok).toBe(true);
      if (!response.ok) return;
      expect(response.result.provider).toBe("quran");
      expect(response.result.text.length).toBeGreaterThan(0);
      expect(response.result.secondaryText?.length ?? 0).toBeGreaterThan(0);
      expect(response.result.translationLabel).toBe("Saheeh International");
    },
    live.timeout,
  );

  it(
    "Quran ayah range and Arabic-only mode resolve",
    async () => {
      const range = await fetchPassage({
        reference: "2:255-257",
        provider: "quran",
        translationId: "en.sahih",
      });
      expect(range.ok).toBe(true);
      if (range.ok) {
        expect(range.result.verses.map((verse) => verse.number)).toEqual([255, 256, 257]);
        expect(range.result.secondaryText?.length ?? 0).toBeGreaterThan(0);
      }

      const arabicOnly = await fetchPassage({
        reference: "17:3",
        provider: "quran",
        translationId: "none",
      });
      expect(arabicOnly.ok).toBe(true);
      if (arabicOnly.ok) {
        expect(arabicOnly.result.text.length).toBeGreaterThan(0);
        expect(arabicOnly.result.secondaryText).toBeUndefined();
        expect(arabicOnly.result.textDirection).toBe("rtl");
      }
    },
    live.timeout,
  );

  it(
    "Quran tafsir returns Ibn Kathir",
    async () => {
      const response = await fetchPassage({
        reference: "17:3",
        provider: "quran-tafsir",
        translationId: "169",
      });
      expect(response.ok).toBe(true);
      if (!response.ok) return;
      expect(response.result.provider).toBe("quran-tafsir");
      expect(response.result.text.length).toBeGreaterThan(0);
      expect(response.result.translationLabel).toContain("Ibn Kathir");
    },
    live.timeout,
  );

  it(
    "Quran page 2 merges Arabic and translation",
    async () => {
      const response = await fetchQuranPage({ page: 2, translationId: "en.sahih" });
      expect(response.ok).toBe(true);
      if (!response.ok) return;
      expect(response.result.page).toBe(2);
      expect(response.result.ayahs.length).toBeGreaterThan(0);
      expect(response.result.ayahs[0]?.surah).toBe(2);
      expect(response.result.ayahs[0]?.numberInSurah).toBe(1);
      expect(response.result.ayahs[0]?.arabic.length).toBeGreaterThan(0);
      expect(response.result.ayahs[0]?.translation.length).toBeGreaterThan(0);
      expect(response.result.surahs[0]?.englishName).toBe("Al-Baqara");
    },
    live.timeout,
  );

  it(
    "Quran page 604 supports Arabic-only",
    async () => {
      const response = await fetchQuranPage({ page: 604, translationId: "none" });
      expect(response.ok).toBe(true);
      if (!response.ok) return;
      expect(response.result.page).toBe(604);
      expect(response.result.ayahs.length).toBeGreaterThan(0);
      expect(response.result.ayahs[0]?.arabic.length).toBeGreaterThan(0);
      expect(response.result.translationLabel).toContain("Uthmani");
    },
    live.timeout,
  );

  it(
    "Asbab al-Nuzul finds 4:34 and reports no occasion for 55:1",
    async () => {
      const found = await fetchQuranAsbab({ surah: 4, verse: 34 });
      expect(found.ok).toBe(true);
      if (found.ok) {
        expect(found.result.found).toBe(true);
        expect(found.result.text).toContain("Men are in charge");
        expect(found.result.reference).toBe("4:34");
      }

      const missing = await fetchQuranAsbab({ surah: 55, verse: 1 });
      expect(missing.ok).toBe(true);
      if (missing.ok) {
        expect(missing.result.found).toBe(false);
        expect(missing.result.text).toBe("");
      }
    },
    live.timeout,
  );

  it(
    "every free-use translation resolves John 3:16",
    async () => {
      const translations = ["BSB", "eng_kjv", "eng_web", "ENGWEBP", "eng_webu", "eng_asv"];
      for (const translationId of translations) {
        const response = await fetchPassage({
          reference: "John 3:16",
          provider: "free-use",
          translationId,
        });
        expect(response.ok, `${translationId}: ${JSON.stringify(response)}`).toBe(true);
        if (!response.ok) continue;
        expect(response.result.text.length).toBeGreaterThan(0);
      }
    },
    live.timeout,
  );

  it(
    "every Bible commentary source resolves",
    async () => {
      const sources = [
        { id: "matthew-henry", reference: "John 3:16" },
        { id: "john-calvin", reference: "John 3:16" },
        { id: "john-gill", reference: "John 3:16" },
        { id: "adam-clarke", reference: "John 3:16" },
        { id: "jamieson-fausset-brown", reference: "John 3:16" },
        { id: "keil-delitzsch", reference: "Genesis 1:1" },
        { id: "tyndale", reference: "John 3:16" },
      ];
      for (const source of sources) {
        const response = await fetchPassage({
          reference: source.reference,
          provider: "free-commentary",
          translationId: source.id,
        });
        expect(response.ok, `${source.id}: ${JSON.stringify(response)}`).toBe(true);
        if (!response.ok) continue;
        expect(response.result.text.length).toBeGreaterThan(0);
      }
    },
    live.timeout,
  );

  it(
    "Sefaria English and Hebrew modes resolve",
    async () => {
      for (const translationId of ["english", "hebrew"]) {
        const response = await fetchPassage({
          reference: "Genesis 1:1",
          provider: "sefaria",
          translationId,
        });
        expect(response.ok, `${translationId}: ${JSON.stringify(response)}`).toBe(true);
        if (!response.ok) continue;
        expect(response.result.text.length).toBeGreaterThan(0);
      }
    },
    live.timeout,
  );

  it(
    "every Quran English translation resolves",
    async () => {
      for (const translationId of ["en.sahih", "en.asad", "en.pickthall", "en.yusufali"]) {
        const response = await fetchPassage({
          reference: "17:3",
          provider: "quran",
          translationId,
        });
        expect(response.ok, `${translationId}: ${JSON.stringify(response)}`).toBe(true);
        if (!response.ok) continue;
        expect(response.result.text.length).toBeGreaterThan(0);
        expect(response.result.secondaryText?.length ?? 0).toBeGreaterThan(0);
      }
    },
    live.timeout,
  );

  it(
    "every Quran tafsir resolves",
    async () => {
      for (const tafsirId of ["169", "168", "15", "90"]) {
        const response = await fetchPassage({
          reference: "17:3",
          provider: "quran-tafsir",
          translationId: tafsirId,
        });
        expect(response.ok, `${tafsirId}: ${JSON.stringify(response)}`).toBe(true);
        if (!response.ok) continue;
        expect(response.result.text.length).toBeGreaterThan(0);
      }
    },
    live.timeout,
  );

  it(
    "Quran page uses the Asad translation",
    async () => {
      const response = await fetchQuranPage({ page: 2, translationId: "en.asad" });
      expect(response.ok).toBe(true);
      if (!response.ok) return;
      expect(response.result.translationLabel).toContain("Asad");
      expect(response.result.ayahs[0]?.translation.length).toBeGreaterThan(0);
    },
    live.timeout,
  );

  it(
    "Asbab parser handles several known occasions",
    async () => {
      const cases = [
        { surah: 2, verse: 256, needle: "no compulsion" },
        { surah: 24, verse: 11, needle: "slander" },
        { surah: 58, verse: 1, needle: "disputeth" },
      ];
      for (const item of cases) {
        const response = await fetchQuranAsbab({ surah: item.surah, verse: item.verse });
        expect(response.ok, `${item.surah}:${item.verse}`).toBe(true);
        if (!response.ok) continue;
        expect(response.result.found).toBe(true);
        expect(response.result.text.toLowerCase()).toContain(item.needle);
      }
    },
    live.timeout,
  );

  it("lists translations and reports API.Bible availability", async () => {
    const response = await listTranslations();
    expect(response.options.length).toBeGreaterThan(0);
    expect(response.options.some((option) => option.provider === "quran")).toBe(true);
    expect(response.options.some((option) => option.provider === "hadith")).toBe(true);
    expect(response.options.some((option) => option.provider === "free-use")).toBe(true);
    expect(response.options.some((option) => option.provider === "sefaria")).toBe(true);
    expect(typeof response.apiBible).toBe("boolean");
  });

  it(
    "Bukhari 1 and Bukhari 2:1 return Arabic and English",
    async () => {
      for (const reference of ["Bukhari 1", "Bukhari 2:1"]) {
        const response = await fetchPassage({
          reference,
          provider: "hadith",
          translationId: "bukhari",
        });
        expect(response.ok).toBe(true);
        if (!response.ok) return;
        expect(response.result.provider).toBe("hadith");
        expect(response.result.text.length).toBeGreaterThan(0);
        expect(response.result.secondaryText?.length ?? 0).toBeGreaterThan(0);
        expect(response.result.translationLabel).toBe("Sahih al-Bukhari");
      }
    },
    live.timeout,
  );

  it(
    "all hadith collections fetch their first in-book hadith",
    async () => {
      const collections: { id: string; label: string }[] = [
        { id: "bukhari", label: "Bukhari" },
        { id: "muslim", label: "Muslim" },
        { id: "abudawud", label: "Abu Dawud" },
        { id: "tirmidhi", label: "Tirmidhi" },
        { id: "nasai", label: "Nasai" },
        { id: "ibnmajah", label: "Ibn Majah" },
        { id: "malik", label: "Malik" },
        { id: "qudsi", label: "Qudsi" },
      ];
      for (const collection of collections) {
        const response = await fetchPassage({
          reference: `${collection.label} 1:1`,
          provider: "hadith",
          translationId: collection.id,
        });
        expect(response.ok, `${collection.id}: ${JSON.stringify(response)}`).toBe(true);
        if (!response.ok) continue;
        expect(response.result.text.length).toBeGreaterThan(0);
      }
    },
    live.timeout,
  );

  it(
    "reports a health status for every provider",
    async () => {
      const base = process.env["LIVE_BASE_URL"] ?? "http://localhost:8080";
      const response = await fetch(`${base}/api/health`);
      expect(response.ok).toBe(true);
      const report = (await response.json()) as { providers: unknown[] };
      expect(report.providers.length).toBeGreaterThanOrEqual(7);
    },
    live.timeout,
  );

  it(
    "explains the untranslated Muslim introduction instead of inventing text",
    async () => {
      const response = await fetchPassage({
        reference: "Muslim 1",
        provider: "hadith",
        translationId: "muslim",
      });
      expect(response.ok).toBe(false);
      if (response.ok) return;
      expect(response.error).toContain("No Arabic or English text is available");
    },
    live.timeout,
  );
});
