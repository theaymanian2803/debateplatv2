import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPassage, listTranslations } from "@/server/scripture";

const chapterPayload = {
  translation: {
    name: "Berean Standard Bible",
    website: "https://berean.bible",
    licenseUrl: "https://berean.bible",
    license: { publicDomain: true },
  },
  chapter: {
    content: [
      { type: "heading", content: ["Jesus and Nicodemus"] },
      { type: "verse", number: 15, content: ["Before."] },
      {
        type: "verse",
        number: 16,
        content: ["For God so loved ", { noteId: 1 }, "the world."],
      },
      { type: "verse", number: 17, content: ["For God sent the Son."] },
    ],
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("fetchPassage free-use provider", () => {
  it("fetches a range from the Free Use Bible API", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(chapterPayload)));
    vi.stubGlobal("fetch", fetchMock);

    const response = await fetchPassage({
      reference: "John 3:16-17",
      provider: "free-use",
      translationId: "BSB",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://bible.helloao.org/api/BSB/JHN/3.json",
      expect.objectContaining({ headers: expect.objectContaining({ accept: "application/json" }) }),
    );
    expect(response.ok).toBe(true);
    if (!response.ok) return;
    expect(response.result.reference).toBe("John 3:16-17");
    expect(response.result.text).toBe("For God so loved the world. For God sent the Son.");
    expect(response.result.translationLabel).toBe("Berean Standard Bible");
    expect(response.result.attribution).toBe("Berean Standard Bible · Public domain");
    expect(response.result.verses.map((v) => v.number)).toEqual([16, 17]);
  });

  it("returns a friendly error for invalid references", async () => {
    const response = await fetchPassage({
      reference: "Hezekiah 3:1",
      provider: "free-use",
      translationId: "BSB",
    });
    expect(response).toEqual({
      ok: false,
      error: "Could not read that reference. Try a format like John 3:16.",
    });
  });

  it("explains unavailable API.Bible configuration", async () => {
    const response = await fetchPassage({
      reference: "John 3:16",
      provider: "api-bible",
      translationId: "abc",
    });
    expect(response.ok).toBe(false);
    if (response.ok) return;
    expect(response.error).toContain("BIBLE_API_KEY");
  });
});

describe("fetchPassage sefaria provider", () => {
  it("fetches Hebrew and English with licence metadata", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(
          JSON.stringify({
            ref: "Genesis 1:1",
            text: "When God began to create heaven and earth.",
            he: "בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ׃",
            versionTitle: "Tanakh: The Holy Scriptures, published by JPS",
            heVersionTitle: "Miqra according to the Masorah",
            license: "CC-BY-NC",
            heLicense: "CC-BY-SA",
          }),
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await fetchPassage({
      reference: "Genesis 1:1",
      provider: "sefaria",
      translationId: "bilingual",
    });

    expect(response.ok).toBe(true);
    if (!response.ok) return;
    expect(response.result.provider).toBe("sefaria");
    expect(response.result.text).toContain("When God began");
    expect(response.result.secondaryText).toContain("בְּרֵאשִׁית");
    expect(response.result.textDirection).toBe("ltr");
    expect(response.result.direction).toBe("rtl");
    expect(response.result.language).toBe("he");
    expect(response.result.attribution).toContain("CC-BY-NC");
    expect(response.result.attribution).toContain("CC-BY-SA");
    expect(response.result.sourceUrl).toBe("https://www.sefaria.org/Genesis.1.1");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/api/texts/Genesis%201%3A1");
  });

  it("rejects unsafe Sefaria references", async () => {
    const response = await fetchPassage({
      reference: "../../admin",
      provider: "sefaria",
      translationId: "bilingual",
    });
    expect(response.ok).toBe(false);
    if (response.ok) return;
    expect(response.error).toContain("Sefaria reference");
  });
});

describe("fetchPassage quran provider", () => {
  it("fetches Arabic and an English translation", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(
          JSON.stringify({
            code: 200,
            status: "OK",
            data: [
              {
                text: "ذُرِّيَّةَ مَنْ حَمَلْنَا مَعَ نُوحٍ",
                numberInSurah: 3,
                edition: { identifier: "quran-uthmani", language: "ar" },
              },
              {
                text: "O descendants of those We carried with Noah.",
                numberInSurah: 3,
                edition: {
                  identifier: "en.sahih",
                  englishName: "Saheeh International",
                  language: "en",
                },
              },
            ],
          }),
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await fetchPassage({
      reference: "17:3",
      provider: "quran",
      translationId: "en.sahih",
    });

    expect(response.ok).toBe(true);
    if (!response.ok) return;
    expect(response.result.provider).toBe("quran");
    expect(response.result.text).toBe("O descendants of those We carried with Noah.");
    expect(response.result.secondaryText).toContain("ذُرِّيَّةَ");
    expect(response.result.translationLabel).toBe("Saheeh International");
    expect(response.result.textDirection).toBe("ltr");
    expect(response.result.direction).toBe("rtl");
    expect(response.result.language).toBe("ar");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      "/ayah/17:3/editions/quran-uthmani,en.sahih",
    );
  });
});

describe("fetchPassage commentary and hadith providers", () => {
  it("fetches Bible commentary for a verse", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(
          JSON.stringify({
            commentary: {
              name: "Matthew Henry Bible Commentary",
              website: "https://bible.helloao.org",
              licenseNotice: "Public domain",
            },
            chapter: {
              content: [
                { type: "verse", number: 16, content: ["God so loved the world."] },
                { type: "verse", number: 17, content: ["God sent the Son."] },
              ],
            },
          }),
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await fetchPassage({
      reference: "John 3:16",
      provider: "free-commentary",
      translationId: "matthew-henry",
    });

    expect(response.ok).toBe(true);
    if (!response.ok) return;
    expect(response.result.provider).toBe("free-commentary");
    expect(response.result.text).toBe("God so loved the world.");
    expect(response.result.translationLabel).toBe("Matthew Henry Bible Commentary");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/api/c/matthew-henry/JHN/3.json");
  });

  it("fetches Quran tafsir", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async (_input: RequestInfo | URL, _init?: RequestInit) =>
          new Response(
            JSON.stringify({
              tafsir: {
                text: "<p>Musa was given the Tawrah.</p>",
                resource_name: "Ibn Kathir (Abridged)",
              },
            }),
          ),
      ),
    );

    const response = await fetchPassage({
      reference: "17:3",
      provider: "quran-tafsir",
      translationId: "169",
    });

    expect(response.ok).toBe(true);
    if (!response.ok) return;
    expect(response.result.text).toBe("Musa was given the Tawrah.");
    expect(response.result.translationLabel).toBe("Ibn Kathir (Abridged)");
  });

  it("explains when a hadith has no translated text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              metadata: { name: "Sahih Muslim", section: { 0: "Introduction" } },
              hadiths: [{ hadithnumber: 1, text: "", reference: { book: 0, hadith: 1 } }],
            }),
          ),
      ),
    );

    const response = await fetchPassage({
      reference: "Muslim 1",
      provider: "hadith",
      translationId: "muslim",
    });

    expect(response.ok).toBe(false);
    if (response.ok) return;
    expect(response.error).toContain("No Arabic or English text is available");
    expect(response.error).toContain("Sahih Muslim 1");
  });

  it("fetches Bukhari with Arabic and English", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("ara-bukhari")) {
          return new Response(
            JSON.stringify({
              metadata: { name: "Sahih al Bukhari" },
              hadiths: [{ hadithnumber: 1, text: "إنما الأعمال بالنيات" }],
            }),
          );
        }
        return new Response(
          JSON.stringify({
            metadata: { name: "Sahih al Bukhari", section: { 1: "Revelation" } },
            hadiths: [
              {
                hadithnumber: 1,
                text: "The reward of deeds depends upon the intentions.",
              },
            ],
          }),
        );
      }),
    );

    const response = await fetchPassage({
      reference: "Bukhari 1",
      provider: "hadith",
      translationId: "bukhari",
    });

    expect(response.ok).toBe(true);
    if (!response.ok) return;
    expect(response.result.provider).toBe("hadith");
    expect(response.result.text).toBe("The reward of deeds depends upon the intentions.");
    expect(response.result.secondaryText).toBe("إنما الأعمال بالنيات");
    expect(response.result.direction).toBe("rtl");
    expect(response.result.language).toBe("ar");
    expect(response.result.attribution).toContain("Sahih al-Bukhari");
  });
});

describe("fetchPassage api-bible provider", () => {
  it("fetches a passage and its copyright from API.Bible", async () => {
    vi.stubEnv("BIBLE_API_KEY", "test-key");
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/passages/")) {
        return new Response(
          JSON.stringify({
            data: {
              content: "For God so loved the world.",
              reference: "John 3:16",
              copyright: "Scripture quotations taken from the NIV.",
            },
          }),
        );
      }
      if (url.includes("/bibles/")) {
        return new Response(
          JSON.stringify({ data: { name: "New International Version", abbreviation: "NIV" } }),
        );
      }
      return new Response("not found", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await fetchPassage({
      reference: "John 3:16",
      provider: "api-bible",
      translationId: "niv-bible-id",
    });

    expect(response.ok).toBe(true);
    if (!response.ok) return;
    expect(response.result.provider).toBe("api-bible");
    expect(response.result.text).toBe("For God so loved the world.");
    expect(response.result.translationLabel).toBe("New International Version (NIV)");
    expect(response.result.attribution).toBe("Scripture quotations taken from the NIV.");
    const passageCall = fetchMock.mock.calls.find(([url]) => String(url).includes("/passages/"));
    expect(passageCall?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({ "api-key": "test-key" }),
      }),
    );
  });

  it("builds a range passage id and requests plain text", async () => {
    vi.stubEnv("BIBLE_API_KEY", "test-key");
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/passages/")) {
        return new Response(
          JSON.stringify({
            data: {
              content: "For God so loved the world. For God sent the Son.",
              reference: "John 3:16-17",
            },
          }),
        );
      }
      return new Response(
        JSON.stringify({ data: { name: "New International Version", abbreviation: "NIV" } }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await fetchPassage({
      reference: "John 3:16-17",
      provider: "api-bible",
      translationId: "niv-bible-id",
    });

    expect(response.ok).toBe(true);
    const passageCall = fetchMock.mock.calls.find(([url]) => String(url).includes("/passages/"));
    const passageUrl = String(passageCall?.[0]);
    expect(passageUrl).toContain("/bibles/niv-bible-id/passages/JHN.3.16-JHN.3.17");
    expect(passageUrl).toContain("content-type=text");
    expect(passageUrl).toContain("include-verse-numbers=false");
  });
});

describe("listTranslations", () => {
  it("includes API.Bible editions when a key is configured", async () => {
    vi.stubEnv("BIBLE_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              data: [
                { id: "niv", name: "New International Version", abbreviation: "NIV" },
                { id: "esv", name: "English Standard Version", abbreviation: "ESV" },
              ],
            }),
          ),
      ),
    );

    const response = await listTranslations();

    expect(response.apiBible).toBe(true);
    expect(response.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: "api-bible",
          id: "niv",
          label: "New International Version (NIV)",
        }),
      ]),
    );
  });
});
