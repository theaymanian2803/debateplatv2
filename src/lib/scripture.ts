export type ScriptureProvider =
  "free-use" | "api-bible" | "sefaria" | "quran" | "free-commentary" | "quran-tafsir" | "hadith";

export type ScriptureTranslationOption = {
  provider: ScriptureProvider;
  id: string;
  label: string;
  detail?: string;
};

export type ScriptureReference = {
  bookId: string;
  bookName: string;
  chapter: number;
  verse?: number;
  verseEnd?: number;
  display: string;
};

export type ScriptureMeta = {
  provider: ScriptureProvider;
  translationId: string;
  translationLabel: string;
  reference: string;
  fetchedAt: string;
  attribution?: string;
  sourceUrl?: string;
  secondaryLabel?: string;
  direction?: "ltr" | "rtl";
  language?: "ar" | "he";
};

export type ScriptureVerse = { number: number; text: string };

export type ScriptureResult = ScriptureMeta & {
  text: string;
  verses: ScriptureVerse[];
  secondaryText?: string;
  textDirection?: "ltr" | "rtl";
};

type BibleBook = { id: string; name: string; aliases: string[] };

const BOOKS: BibleBook[] = [
  { id: "GEN", name: "Genesis", aliases: ["gen", "ge", "gn"] },
  { id: "EXO", name: "Exodus", aliases: ["exo", "exod", "ex"] },
  { id: "LEV", name: "Leviticus", aliases: ["lev", "lv"] },
  { id: "NUM", name: "Numbers", aliases: ["num", "nm", "nb"] },
  { id: "DEU", name: "Deuteronomy", aliases: ["deut", "deu", "dt"] },
  { id: "JOS", name: "Joshua", aliases: ["josh", "jos"] },
  { id: "JDG", name: "Judges", aliases: ["judg", "jdg", "jdgs"] },
  { id: "RUT", name: "Ruth", aliases: ["ruth", "rut", "ru"] },
  { id: "1SA", name: "1 Samuel", aliases: ["1 sam", "1sa", "1 sm", "1sm"] },
  { id: "2SA", name: "2 Samuel", aliases: ["2 sam", "2sa", "2 sm", "2sm"] },
  { id: "1KI", name: "1 Kings", aliases: ["1 kgs", "1ki", "1 kg", "1kg"] },
  { id: "2KI", name: "2 Kings", aliases: ["2 kgs", "2ki", "2 kg", "2kg"] },
  { id: "1CH", name: "1 Chronicles", aliases: ["1 chr", "1ch", "1 chron"] },
  { id: "2CH", name: "2 Chronicles", aliases: ["2 chr", "2ch", "2 chron"] },
  { id: "EZR", name: "Ezra", aliases: ["ezr", "ez"] },
  { id: "NEH", name: "Nehemiah", aliases: ["neh", "ne"] },
  { id: "EST", name: "Esther", aliases: ["esth", "est", "es"] },
  { id: "JOB", name: "Job", aliases: ["jb"] },
  { id: "PSA", name: "Psalms", aliases: ["psalm", "psa", "ps", "pss"] },
  { id: "PRO", name: "Proverbs", aliases: ["prov", "pro", "prv", "pr"] },
  { id: "ECC", name: "Ecclesiastes", aliases: ["eccl", "ecc", "ec", "qoheleth"] },
  {
    id: "SNG",
    name: "Song of Solomon",
    aliases: ["song of songs", "song", "sng", "sos", "canticles"],
  },
  { id: "ISA", name: "Isaiah", aliases: ["isa", "is"] },
  { id: "JER", name: "Jeremiah", aliases: ["jer", "je"] },
  { id: "LAM", name: "Lamentations", aliases: ["lam", "la"] },
  { id: "EZK", name: "Ezekiel", aliases: ["ezek", "ezk", "eze"] },
  { id: "DAN", name: "Daniel", aliases: ["dan", "da", "dn"] },
  { id: "HOS", name: "Hosea", aliases: ["hos", "ho"] },
  { id: "JOL", name: "Joel", aliases: ["jol", "jl"] },
  { id: "AMO", name: "Amos", aliases: ["amo", "am"] },
  { id: "OBA", name: "Obadiah", aliases: ["obad", "oba", "ob"] },
  { id: "JON", name: "Jonah", aliases: ["jon", "jnh"] },
  { id: "MIC", name: "Micah", aliases: ["mic", "mc"] },
  { id: "NAM", name: "Nahum", aliases: ["nah", "na"] },
  { id: "HAB", name: "Habakkuk", aliases: ["hab", "hb"] },
  { id: "ZEP", name: "Zephaniah", aliases: ["zeph", "zep", "zp"] },
  { id: "HAG", name: "Haggai", aliases: ["hag", "hg"] },
  { id: "ZEC", name: "Zechariah", aliases: ["zech", "zec", "zc"] },
  { id: "MAL", name: "Malachi", aliases: ["mal", "ml"] },
  { id: "MAT", name: "Matthew", aliases: ["matt", "mat", "mt"] },
  { id: "MRK", name: "Mark", aliases: ["mrk", "mk", "mr"] },
  { id: "LUK", name: "Luke", aliases: ["luk", "lk", "lu"] },
  { id: "JHN", name: "John", aliases: ["jhn", "jn", "joh"] },
  { id: "ACT", name: "Acts", aliases: ["act", "ac"] },
  { id: "ROM", name: "Romans", aliases: ["rom", "ro", "rm"] },
  { id: "1CO", name: "1 Corinthians", aliases: ["1 cor", "1co", "1 co"] },
  { id: "2CO", name: "2 Corinthians", aliases: ["2 cor", "2co", "2 co"] },
  { id: "GAL", name: "Galatians", aliases: ["gal", "ga"] },
  { id: "EPH", name: "Ephesians", aliases: ["eph", "ep"] },
  { id: "PHP", name: "Philippians", aliases: ["phil", "php", "ph", "pp"] },
  { id: "COL", name: "Colossians", aliases: ["col", "co"] },
  { id: "1TH", name: "1 Thessalonians", aliases: ["1 thess", "1 thes", "1th"] },
  { id: "2TH", name: "2 Thessalonians", aliases: ["2 thess", "2 thes", "2th"] },
  { id: "1TI", name: "1 Timothy", aliases: ["1 tim", "1ti", "1 tm"] },
  { id: "2TI", name: "2 Timothy", aliases: ["2 tim", "2ti", "2 tm"] },
  { id: "TIT", name: "Titus", aliases: ["tit", "ti"] },
  { id: "PHM", name: "Philemon", aliases: ["philem", "phlm", "phm", "phile"] },
  { id: "HEB", name: "Hebrews", aliases: ["hebr", "heb"] },
  { id: "JAS", name: "James", aliases: ["jas", "jam", "jm"] },
  { id: "1PE", name: "1 Peter", aliases: ["1 pet", "1pe", "1 pt"] },
  { id: "2PE", name: "2 Peter", aliases: ["2 pet", "2pe", "2 pt"] },
  { id: "1JN", name: "1 John", aliases: ["1 jhn", "1 jn", "1jn", "1 jo"] },
  { id: "2JN", name: "2 John", aliases: ["2 jhn", "2 jn", "2jn", "2 jo"] },
  { id: "3JN", name: "3 John", aliases: ["3 jhn", "3 jn", "3jn", "3 jo"] },
  { id: "JUD", name: "Jude", aliases: ["jud", "jd"] },
  { id: "REV", name: "Revelation", aliases: ["rev", "re", "apocalypse"] },
];

const bookLookup = new Map<string, BibleBook>();
for (const book of BOOKS) {
  bookLookup.set(book.name.toLowerCase(), book);
  for (const alias of book.aliases) bookLookup.set(alias, book);
}

export const freeUseTranslations: ScriptureTranslationOption[] = [
  {
    provider: "free-use",
    id: "BSB",
    label: "Berean Standard Bible",
    detail: "Public domain",
  },
  {
    provider: "free-use",
    id: "eng_kjv",
    label: "King James Version",
    detail: "Public domain",
  },
  {
    provider: "free-use",
    id: "eng_web",
    label: "World English Bible",
    detail: "Public domain",
  },
  {
    provider: "free-use",
    id: "ENGWEBP",
    label: "World English Bible (Protestant)",
    detail: "Public domain",
  },
  {
    provider: "free-use",
    id: "eng_webu",
    label: "World English Bible Updated",
    detail: "Public domain",
  },
  {
    provider: "free-use",
    id: "eng_asv",
    label: "American Standard Version (1901)",
    detail: "Public domain",
  },
];

export const sefariaTranslations: ScriptureTranslationOption[] = [
  {
    provider: "sefaria",
    id: "bilingual",
    label: "Sefaria · Hebrew + English",
    detail: "Default versions, with licence",
  },
  {
    provider: "sefaria",
    id: "english",
    label: "Sefaria · English only",
    detail: "Default English version",
  },
  {
    provider: "sefaria",
    id: "hebrew",
    label: "Sefaria · Hebrew only",
    detail: "Default Hebrew version",
  },
];

export const quranTranslations: ScriptureTranslationOption[] = [
  {
    provider: "quran",
    id: "en.sahih",
    label: "Quran · Arabic + Saheeh International",
    detail: "Uthmani Arabic",
  },
  {
    provider: "quran",
    id: "en.asad",
    label: "Quran · Arabic + Muhammad Asad",
    detail: "Uthmani Arabic",
  },
  {
    provider: "quran",
    id: "en.pickthall",
    label: "Quran · Arabic + Pickthall",
    detail: "Uthmani Arabic",
  },
  {
    provider: "quran",
    id: "en.yusufali",
    label: "Quran · Arabic + Yusuf Ali",
    detail: "Uthmani Arabic",
  },
  {
    provider: "quran",
    id: "none",
    label: "Quran · Arabic only",
    detail: "Uthmani Arabic",
  },
];

export const bibleCommentaryTranslations: ScriptureTranslationOption[] = [
  {
    provider: "free-commentary",
    id: "matthew-henry",
    label: "Matthew Henry Bible Commentary",
    detail: "Classic · public domain",
  },
  {
    provider: "free-commentary",
    id: "john-calvin",
    label: "John Calvin's Commentaries",
    detail: "Classic · public domain",
  },
  {
    provider: "free-commentary",
    id: "john-gill",
    label: "John Gill Bible Commentary",
    detail: "Classic · public domain",
  },
  {
    provider: "free-commentary",
    id: "adam-clarke",
    label: "Adam Clarke Bible Commentary",
    detail: "Classic · public domain",
  },
  {
    provider: "free-commentary",
    id: "jamieson-fausset-brown",
    label: "Jamieson-Fausset-Brown",
    detail: "Classic · public domain",
  },
  {
    provider: "free-commentary",
    id: "keil-delitzsch",
    label: "Keil & Delitzsch (Old Testament)",
    detail: "Classic · public domain",
  },
  {
    provider: "free-commentary",
    id: "tyndale",
    label: "Tyndale Open Study Notes",
    detail: "Open study notes",
  },
];

export const quranTafsirTranslations: ScriptureTranslationOption[] = [
  {
    provider: "quran-tafsir",
    id: "169",
    label: "Ibn Kathir (Abridged)",
    detail: "English tafsir · Quran.com",
  },
  {
    provider: "quran-tafsir",
    id: "168",
    label: "Ma'arif al-Qur'an",
    detail: "English tafsir · Quran.com",
  },
  {
    provider: "quran-tafsir",
    id: "15",
    label: "Tafsir al-Tabari",
    detail: "Arabic tafsir · Quran.com",
  },
  {
    provider: "quran-tafsir",
    id: "90",
    label: "Al-Qurtubi",
    detail: "Arabic tafsir · Quran.com",
  },
];

export const hadithCollections = [
  { id: "bukhari", label: "Sahih al-Bukhari", translator: "Muhsin Khan" },
  { id: "muslim", label: "Sahih Muslim", translator: "Abdul Hamid Siddiqui" },
  { id: "abudawud", label: "Sunan Abu Dawud", translator: "Abu Khaliyl" },
  { id: "tirmidhi", label: "Jami' at-Tirmidhi", translator: "Dar-us-Salam" },
  { id: "nasai", label: "Sunan an-Nasa'i", translator: "Dar-us-Salam" },
  { id: "ibnmajah", label: "Sunan Ibn Majah", translator: "Dar-us-Salam" },
  { id: "malik", label: "Muwatta Malik", translator: "Yahya" },
  { id: "qudsi", label: "40 Hadith Qudsi", translator: "Sunnah.com" },
] as const;

export type HadithCollection = (typeof hadithCollections)[number];

export const hadithTranslations: ScriptureTranslationOption[] = hadithCollections.map(
  (collection) => ({
    provider: "hadith",
    id: collection.id,
    label: `Hadith · ${collection.label}`,
    detail: `Arabic + English (${collection.translator})`,
  }),
);

export type HadithReference = {
  collection: HadithCollection;
  number: number;
  book?: number;
  display: string;
};

export function parseHadithReference(input: string): HadithReference | null {
  const normalized = input
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^sahih\s+/, "")
    .replace(/^al[-\s]+/, "");
  const match =
    /^(bukhari|muslim|abu dawud|abudawud|tirmidhi|nasai|ibn majah|ibnmajah|malik|qudsi)\s+(?:book\s+)?(\d{1,5})(?::(\d{1,5}))?$/.exec(
      normalized,
    );
  if (!match) return null;

  const key = match[1]!.replace(/\s+/g, "");
  const collection = hadithCollections.find((c) => c.id === key);
  if (!collection) return null;

  const first = Number(match[2]);
  const second = match[3] ? Number(match[3]) : undefined;
  if (first < 1 || (second !== undefined && second < 1)) return null;

  const number = second ?? first;
  const book = second !== undefined ? first : undefined;

  return {
    collection,
    number,
    ...(book !== undefined ? { book } : {}),
    display: `${collection.label} ${book !== undefined ? `${book}:` : ""}${number}`,
  };
}

export function scriptureKey(option: {
  provider: ScriptureProvider;
  id?: string;
  translationId?: string;
}): string {
  return `${option.provider}:${option.id ?? option.translationId ?? ""}`;
}

export function containsArabic(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

export function parseScriptureKey(key: string): { provider: ScriptureProvider; id: string } | null {
  const index = key.indexOf(":");
  if (index < 0) return null;
  const provider = key.slice(0, index);
  const id = key.slice(index + 1);
  if (
    (provider !== "free-use" &&
      provider !== "api-bible" &&
      provider !== "sefaria" &&
      provider !== "quran" &&
      provider !== "free-commentary" &&
      provider !== "quran-tafsir" &&
      provider !== "hadith") ||
    !id
  ) {
    return null;
  }
  return { provider, id };
}

function normalizeBookName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[.]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(first|1st)\s+/, "1 ")
    .replace(/^(second|2nd)\s+/, "2 ")
    .replace(/^(third|3rd)\s+/, "3 ")
    .replace(/^iii\s+/, "3 ")
    .replace(/^ii\s+/, "2 ")
    .replace(/^i\s+/, "1 ");
}

export function parseReference(input: string): ScriptureReference | null {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/(\d)\s*\.\s*(\d)/g, "$1:$2")
    .replace(/[.]/g, "")
    .replace(/\s+/g, " ");
  if (!normalized) return null;

  const withNumbers = normalizeBookName(normalized);
  const match =
    /^([1-3]?\s*[a-z][a-z ]*?)\s+(\d{1,3})(?:\s*:\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?)?$/.exec(
      withNumbers,
    );
  if (!match) return null;

  const bookName = match[1]!.trim().replace(/\s+/g, " ");
  const chapter = Number(match[2]);
  const verse = match[3] ? Number(match[3]) : undefined;
  const verseEnd = match[4] ? Number(match[4]) : undefined;

  const book = bookLookup.get(bookName);
  if (!book) return null;
  if (chapter < 1 || chapter > 200) return null;
  if (verse !== undefined && (verse < 1 || verse > 200)) return null;
  if (verseEnd !== undefined && (verseEnd < (verse ?? 1) || verseEnd > 200)) return null;

  const display =
    verse === undefined
      ? `${book.name} ${chapter}`
      : `${book.name} ${chapter}:${verse}${verseEnd && verseEnd !== verse ? `-${verseEnd}` : ""}`;

  return {
    bookId: book.id,
    bookName: book.name,
    chapter,
    ...(verse !== undefined ? { verse } : {}),
    ...(verseEnd !== undefined ? { verseEnd } : {}),
    display,
  };
}

export type QuranReference = {
  surah: number;
  verse: number;
  verseEnd?: number;
  display: string;
};

export type QuranPageInput = {
  page: number;
  translationId: string;
};

export type QuranPageSurah = {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
};

export type QuranPageAyah = {
  number: number;
  numberInSurah: number;
  surah: number;
  surahName: string;
  arabic: string;
  translation: string;
  page: number;
  juz: number;
  sajda: boolean;
};

export type QuranPageResult = {
  page: number;
  totalPages: number;
  translationId: string;
  translationLabel: string;
  ayahs: QuranPageAyah[];
  surahs: QuranPageSurah[];
  fetchedAt: string;
  attribution: string;
  direction: "rtl";
};

export type QuranPageResponse =
  { ok: true; result: QuranPageResult } | { ok: false; error: string };

export type QuranAsbabInput = {
  surah: number;
  verse: number;
};

export type QuranAsbabResult = {
  surah: number;
  verse: number;
  found: boolean;
  text: string;
  reference: string | null;
  sourceUrl: string;
  attribution: string;
  fetchedAt: string;
};

export type QuranAsbabResponse =
  { ok: true; result: QuranAsbabResult } | { ok: false; error: string };

export function parseQuranReference(input: string): QuranReference | null {
  const normalized = input.trim().replace(/\s+/g, " ");
  const match =
    /^(?:(?:quran|qur['’]?an|surah?)\s*)?(\d{1,3})\s*:\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?$/i.exec(
      normalized,
    );
  if (!match) return null;

  const surah = Number(match[1]);
  const verse = Number(match[2]);
  const verseEnd = match[3] ? Number(match[3]) : undefined;
  if (surah < 1 || surah > 114) return null;
  if (verse < 1 || verse > 300) return null;
  if (verseEnd !== undefined && (verseEnd < verse || verseEnd > 300)) return null;

  return {
    surah,
    verse,
    ...(verseEnd !== undefined ? { verseEnd } : {}),
    display: `Quran ${surah}:${verse}${verseEnd && verseEnd !== verse ? `-${verseEnd}` : ""}`,
  };
}

type FreeUseContentPart = string | { noteId?: number; text?: string; wordsOfJesus?: boolean };
type FreeUseNode = { type?: string; number?: number; content?: FreeUseContentPart[] };

function textOf(node: FreeUseNode): string {
  const parts = Array.isArray(node.content) ? node.content : [];
  return parts
    .map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part.text === "string") return part.text;
      return "";
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractFreeUseVerses(
  payload: unknown,
  reference: ScriptureReference,
): ScriptureVerse[] {
  if (!payload || typeof payload !== "object") return [];
  const chapter = (payload as { chapter?: { content?: unknown } }).chapter;
  const content = chapter?.content;
  if (!Array.isArray(content)) return [];

  const start = reference.verse ?? 1;
  const end = reference.verseEnd ?? reference.verse ?? Number.POSITIVE_INFINITY;

  return (content as FreeUseNode[])
    .filter((node) => node?.type === "verse" && typeof node.number === "number")
    .filter((node) => node.number! >= start && node.number! <= end)
    .map((node) => ({ number: node.number!, text: textOf(node) }))
    .filter((verse) => verse.text.length > 0);
}

export function extractFreeUseCommentary(
  payload: unknown,
  reference: ScriptureReference,
): ScriptureVerse[] {
  if (!payload || typeof payload !== "object") return [];
  const chapter = (payload as { chapter?: { content?: unknown } }).chapter;
  const content = chapter?.content;
  if (!Array.isArray(content)) return [];

  const start = reference.verse ?? 1;
  const end = reference.verseEnd ?? reference.verse ?? Number.POSITIVE_INFINITY;

  const nodes = (content as FreeUseNode[])
    .filter((node) => node?.type === "verse" && typeof node.number === "number")
    .sort((a, b) => a.number! - b.number!);

  return nodes
    .filter((node, index) => {
      const nodeStart = node.number!;
      const nodeEnd =
        index + 1 < nodes.length ? nodes[index + 1]!.number! - 1 : Number.POSITIVE_INFINITY;
      return nodeStart <= end && nodeEnd >= start;
    })
    .map((node) => ({ number: node.number!, text: textOf(node) }))
    .filter((verse) => verse.text.length > 0);
}
