import { describe, expect, it } from "vitest";
import {
  extractFreeUseCommentary,
  extractFreeUseVerses,
  parseHadithReference,
  parseQuranReference,
  parseReference,
  parseScriptureKey,
  scriptureKey,
} from "@/lib/scripture";

describe("parseReference", () => {
  it("parses a single verse", () => {
    expect(parseReference("John 3:16")).toMatchObject({
      bookId: "JHN",
      bookName: "John",
      chapter: 3,
      verse: 16,
      display: "John 3:16",
    });
  });

  it("parses ranges, abbreviations, and numbered books", () => {
    expect(parseReference("1 Cor 13:4-7")).toMatchObject({
      bookId: "1CO",
      chapter: 13,
      verse: 4,
      verseEnd: 7,
      display: "1 Corinthians 13:4-7",
    });
    expect(parseReference("I Jn. 4:8")).toMatchObject({
      bookId: "1JN",
      chapter: 4,
      verse: 8,
      display: "1 John 4:8",
    });
    expect(parseReference("First Peter 5:7")).toMatchObject({
      bookId: "1PE",
      chapter: 5,
      verse: 7,
    });
  });

  it("parses chapter-only references and songs", () => {
    const psalm = parseReference("Psalm 23");
    expect(psalm).toMatchObject({
      bookId: "PSA",
      chapter: 23,
      display: "Psalms 23",
    });
    expect(psalm?.verse).toBeUndefined();
    expect(parseReference("Song of Songs 2:1")).toMatchObject({
      bookId: "SNG",
      chapter: 2,
      verse: 1,
    });
  });

  it("accepts dot notation and rejects nonsense", () => {
    expect(parseReference("John 3.16")).toMatchObject({ chapter: 3, verse: 16 });
    expect(parseReference("Hezekiah 3:1")).toBeNull();
    expect(parseReference("John")).toBeNull();
    expect(parseReference("John 3:16-2")).toBeNull();
    expect(parseReference("")).toBeNull();
  });
});

describe("parseQuranReference", () => {
  it("parses surah and verse references", () => {
    expect(parseQuranReference("17:3")).toEqual({
      surah: 17,
      verse: 3,
      display: "Quran 17:3",
    });
    expect(parseQuranReference("Quran 2:255-257")).toEqual({
      surah: 2,
      verse: 255,
      verseEnd: 257,
      display: "Quran 2:255-257",
    });
    expect(parseQuranReference("surah 112:1")).toMatchObject({ surah: 112, verse: 1 });
  });

  it("rejects invalid surahs and ranges", () => {
    expect(parseQuranReference("115:1")).toBeNull();
    expect(parseQuranReference("0:1")).toBeNull();
    expect(parseQuranReference("2:5-3")).toBeNull();
    expect(parseQuranReference("Al-Isra 17:3")).toBeNull();
  });
});

describe("parseHadithReference", () => {
  it("parses collection and hadith numbers", () => {
    expect(parseHadithReference("Bukhari 1")).toMatchObject({
      number: 1,
      display: "Sahih al-Bukhari 1",
    });
    expect(parseHadithReference("Sahih al-Bukhari 2:1")).toMatchObject({
      number: 1,
      book: 2,
      display: "Sahih al-Bukhari 2:1",
    });
    expect(parseHadithReference("Muslim 1")).toMatchObject({
      collection: { id: "muslim" },
      number: 1,
    });
    expect(parseHadithReference("Abu Dawud 1")).toMatchObject({ collection: { id: "abudawud" } });
  });

  it("rejects unknown collections and malformed numbers", () => {
    expect(parseHadithReference("Tirmidhi")).toBeNull();
    expect(parseHadithReference("Bukhari zero")).toBeNull();
    expect(parseHadithReference("Unknown 1")).toBeNull();
  });
});

describe("extractFreeUseVerses", () => {
  const payload = {
    chapter: {
      content: [
        { type: "heading", content: ["A heading"] },
        { type: "verse", number: 15, content: ["Before."] },
        {
          type: "verse",
          number: 16,
          content: ["For God so loved ", { noteId: 1 }, "the world."],
        },
        { type: "line_break" },
        { type: "verse", number: 17, content: ["For God sent the Son."] },
      ],
    },
  };

  it("extracts a verse range and flattens notes", () => {
    const ref = parseReference("John 3:16-17")!;
    expect(extractFreeUseVerses(payload, ref)).toEqual([
      { number: 16, text: "For God so loved the world." },
      { number: 17, text: "For God sent the Son." },
    ]);
  });

  it("returns every verse for chapter-only references", () => {
    const ref = parseReference("John 3")!;
    expect(extractFreeUseVerses(payload, ref).map((v) => v.number)).toEqual([15, 16, 17]);
  });

  it("reads structured text parts, including words of Jesus", () => {
    const structured = {
      chapter: {
        content: [
          {
            type: "verse",
            number: 16,
            content: [{ text: "For God so loved the world.", wordsOfJesus: true }],
          },
        ],
      },
    };
    expect(extractFreeUseVerses(structured, parseReference("John 3:16")!)).toEqual([
      { number: 16, text: "For God so loved the world." },
    ]);
  });

  it("returns nothing for malformed payloads", () => {
    expect(extractFreeUseVerses({}, parseReference("John 3:16")!)).toEqual([]);
    expect(extractFreeUseVerses(null, parseReference("John 3:16")!)).toEqual([]);
  });
});

describe("extractFreeUseCommentary", () => {
  const payload = {
    chapter: {
      content: [
        { type: "verse", number: 1, content: ["Commentary on verses 1-21, including 3:16."] },
        { type: "verse", number: 22, content: ["Commentary on verses 22-24."] },
      ],
    },
  };

  it("returns the commentary section that covers the verse", () => {
    expect(extractFreeUseCommentary(payload, parseReference("John 3:16")!)).toEqual([
      { number: 1, text: "Commentary on verses 1-21, including 3:16." },
    ]);
  });

  it("returns the later section when the verse falls inside it", () => {
    expect(extractFreeUseCommentary(payload, parseReference("John 3:22")!)).toEqual([
      { number: 22, text: "Commentary on verses 22-24." },
    ]);
  });

  it("returns every section touched by a range", () => {
    expect(
      extractFreeUseCommentary(payload, parseReference("John 3:16-23")!).map((v) => v.number),
    ).toEqual([1, 22]);
  });

  it("returns nothing for malformed payloads", () => {
    expect(extractFreeUseCommentary({}, parseReference("John 3:16")!)).toEqual([]);
  });
});

describe("scripture keys", () => {
  it("round-trips provider and translation id", () => {
    const option = { provider: "api-bible" as const, id: "abc-123" };
    expect(parseScriptureKey(scriptureKey(option))).toEqual(option);
    expect(parseScriptureKey(scriptureKey({ provider: "sefaria", id: "bilingual" }))).toEqual({
      provider: "sefaria",
      id: "bilingual",
    });
    expect(parseScriptureKey(scriptureKey({ provider: "quran", id: "en.sahih" }))).toEqual({
      provider: "quran",
      id: "en.sahih",
    });
  });

  it("rejects unknown providers", () => {
    expect(parseScriptureKey("other:web")).toBeNull();
    expect(parseScriptureKey("free-use:")).toBeNull();
    expect(parseScriptureKey("web")).toBeNull();
  });
});
