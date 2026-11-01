import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchQuranPage } from "@/server/scripture";

const surah = {
  number: 2,
  name: "سُورَةُ البَقَرَةِ",
  englishName: "Al-Baqara",
  englishNameTranslation: "The Cow",
  numberOfAyahs: 286,
  revelationType: "Medinan",
};

const arabicPage = {
  code: 200,
  status: "OK",
  data: {
    number: 2,
    ayahs: [
      {
        number: 8,
        text: "الم",
        surah,
        numberInSurah: 1,
        juz: 1,
        manzil: 1,
        page: 2,
        ruku: 2,
        hizbQuarter: 1,
        sajda: false,
      },
      {
        number: 9,
        text: "ذَٰلِكَ الْكِتَابُ",
        surah,
        numberInSurah: 2,
        juz: 1,
        manzil: 1,
        page: 2,
        ruku: 2,
        hizbQuarter: 1,
        sajda: false,
      },
    ],
    edition: { identifier: "quran-uthmani", englishName: "Uthmani" },
  },
};

const translationPage = {
  code: 200,
  status: "OK",
  data: {
    number: 2,
    ayahs: [
      { number: 8, text: "Alif, Lam, Meem.", numberInSurah: 1 },
      { number: 9, text: "This is the Book.", numberInSurah: 2 },
    ],
    edition: { identifier: "en.sahih", englishName: "Saheeh International" },
  },
};

function mockPageFetch() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/quran-uthmani")) return new Response(JSON.stringify(arabicPage));
    return new Response(JSON.stringify(translationPage));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchQuranPage", () => {
  it("merges Arabic ayahs with their translation", async () => {
    const fetchMock = mockPageFetch();

    const response = await fetchQuranPage({ page: 2, translationId: "en.sahih" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.alquran.cloud/v1/page/2/quran-uthmani",
      expect.objectContaining({ headers: expect.objectContaining({ accept: "application/json" }) }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.alquran.cloud/v1/page/2/en.sahih",
      expect.objectContaining({ headers: expect.objectContaining({ accept: "application/json" }) }),
    );
    expect(response.ok).toBe(true);
    if (!response.ok) return;
    expect(response.result.page).toBe(2);
    expect(response.result.translationLabel).toBe("Saheeh International");
    expect(response.result.ayahs).toHaveLength(2);
    expect(response.result.ayahs[0]).toMatchObject({
      number: 8,
      numberInSurah: 1,
      surah: 2,
      surahName: "Al-Baqara",
      arabic: "الم",
      translation: "Alif, Lam, Meem.",
      page: 2,
      juz: 1,
    });
    expect(response.result.surahs.map((s) => s.englishName)).toEqual(["Al-Baqara"]);
  });

  it("rejects pages outside the mushaf", async () => {
    const fetchMock = mockPageFetch();

    const response = await fetchQuranPage({ page: 605, translationId: "en.sahih" });

    expect(response).toEqual({
      ok: false,
      error: "Choose a Quran page between 1 and 604.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects unknown translations", async () => {
    const fetchMock = mockPageFetch();

    const response = await fetchQuranPage({ page: 3, translationId: "en.unknown" });

    expect(response).toEqual({ ok: false, error: "Unknown Quran translation." });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches Arabic only when no translation is chosen", async () => {
    const fetchMock = mockPageFetch();

    const response = await fetchQuranPage({ page: 4, translationId: "none" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(response.ok).toBe(true);
    if (!response.ok) return;
    expect(response.result.ayahs[0]).toMatchObject({
      arabic: "الم",
      translation: "",
    });
    expect(response.result.translationLabel).toBe("Uthmani Arabic");
  });
});
