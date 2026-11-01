import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchQuranPage } from "@/server/scripture";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("scripture cache integration", () => {
  it("does not refetch the same Quran page", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("quran-uthmani")) {
        return new Response(
          JSON.stringify({
            data: {
              ayahs: [
                {
                  number: 8,
                  text: "الم",
                  numberInSurah: 1,
                  juz: 1,
                  page: 2,
                  sajda: false,
                  surah: { number: 2, englishName: "Al-Baqara", name: "البقرة" },
                },
              ],
              edition: { englishName: "Uthmani" },
            },
          }),
        );
      }
      return new Response(
        JSON.stringify({
          data: {
            ayahs: [{ number: 8, text: "Alif, Lam, Meem." }],
            edition: { englishName: "Saheeh International" },
          },
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchQuranPage({ page: 2, translationId: "en.sahih" });
    await fetchQuranPage({ page: 2, translationId: "en.sahih" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
