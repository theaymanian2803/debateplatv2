import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BookOpen, Check, Loader2, RefreshCw } from "lucide-react";
import {
  bibleCommentaryTranslations,
  freeUseTranslations,
  hadithTranslations,
  parseHadithReference,
  parseQuranReference,
  parseReference,
  parseScriptureKey,
  quranTafsirTranslations,
  quranTranslations,
  scriptureKey,
  sefariaTranslations,
  type ScriptureMeta,
  type ScriptureProvider,
  type ScriptureResult,
} from "@/lib/scripture";
import { fetchScripture, listScriptureTranslations } from "@/lib/scripture-api";
import { Button, Select } from "./ui";

type Mode = "verse" | "commentary" | "hadith";

const modeDefaults: Record<Mode, string> = {
  verse: "free-use:BSB",
  commentary: "free-commentary:matthew-henry",
  hadith: "hadith:bukhari",
};

const modeLabels: { id: Mode; label: string; hint: string }[] = [
  { id: "verse", label: "Text", hint: "Primary source text" },
  { id: "commentary", label: "Commentary", hint: "Attach commentary" },
  { id: "hadith", label: "Hadith", hint: "Bukhari and other collections" },
];

function modeForMeta(meta: ScriptureMeta | undefined): Mode {
  if (!meta) return "verse";
  if (meta.provider === "hadith") return "hadith";
  if (meta.provider === "free-commentary" || meta.provider === "quran-tafsir") return "commentary";
  return "verse";
}

export function ScriptureLookup({
  reference,
  meta,
  onApply,
  onApplyCommentary,
  onReferenceChange,
}: {
  reference: string;
  meta?: ScriptureMeta | undefined;
  onApply: (result: ScriptureResult) => void;
  onApplyCommentary?: (result: ScriptureResult) => void;
  onReferenceChange?: (value: string) => void;
}) {
  const translations = useQuery({
    queryKey: ["scripture-translations"],
    queryFn: listScriptureTranslations,
    staleTime: 30 * 60 * 1000,
    retry: false,
  });

  const [mode, setMode] = useState<Mode>(() => modeForMeta(meta));
  const [translationKey, setTranslationKey] = useState(() =>
    meta ? scriptureKey(meta) : modeDefaults[modeForMeta(meta)],
  );
  const [result, setResult] = useState<ScriptureResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inserted, setInserted] = useState(false);

  useEffect(() => {
    if (!meta) return;
    setMode(modeForMeta(meta));
    setTranslationKey(scriptureKey(meta));
  }, [meta]);

  const options = useMemo(
    () =>
      translations.data?.options ?? [
        ...freeUseTranslations,
        ...sefariaTranslations,
        ...quranTranslations,
        ...bibleCommentaryTranslations,
        ...quranTafsirTranslations,
        ...hadithTranslations,
      ],
    [translations.data?.options],
  );

  const grouped = useMemo(() => {
    const groups: Record<ScriptureProvider, typeof options> = {
      "free-use": [],
      "api-bible": [],
      sefaria: [],
      quran: [],
      "free-commentary": [],
      "quran-tafsir": [],
      hadith: [],
    };
    for (const option of options) groups[option.provider].push(option);
    return groups;
  }, [options]);

  const selected = options.find((option) => scriptureKey(option) === translationKey);
  const apiBible = translations.data?.apiBible ?? false;

  const fetchVerse = useMutation({
    mutationFn: (input: {
      reference: string;
      provider: ScriptureProvider;
      translationId: string;
    }) => fetchScripture({ data: input }),
    onSuccess: (response) => {
      if (response.ok) {
        setResult(response.result);
        setError(null);
        setInserted(false);
      } else {
        setResult(null);
        setError(response.error);
      }
    },
    onError: () => setError("Could not fetch that passage. Try again."),
  });

  const run = () => {
    const parsedKey = parseScriptureKey(translationKey);
    if (!parsedKey) {
      setError("Choose a source first.");
      return;
    }
    if (parsedKey.provider === "quran" || parsedKey.provider === "quran-tafsir") {
      if (!parseQuranReference(reference)) {
        setError("Quran reference not recognised. Try 17:3 or 2:255-257.");
        return;
      }
    } else if (parsedKey.provider === "sefaria") {
      if (!reference.trim()) {
        setError("Enter a Sefaria reference such as Genesis 1:1 or Berakhot 2a.");
        return;
      }
    } else if (parsedKey.provider === "hadith") {
      const parsed = parseHadithReference(reference);
      if (!parsed) {
        setError("Hadith reference not recognised. Try Bukhari 1 or Bukhari 2:1.");
        return;
      }
      if (parsed.collection.id !== parsedKey.id) {
        setError(`That reference belongs to ${parsed.collection.label}. Pick that collection.`);
        return;
      }
    } else if (!parseReference(reference)) {
      setError("Bible reference not recognised. Try John 17:3 or 1 Cor 13:4-7.");
      return;
    }
    setError(null);
    fetchVerse.mutate({
      reference: reference.trim(),
      provider: parsedKey.provider,
      translationId: parsedKey.id,
    });
  };

  const busy = fetchVerse.isPending;

  const changeMode = (next: Mode) => {
    setMode(next);
    setTranslationKey(modeDefaults[next]);
    setResult(null);
    setError(null);
    setInserted(false);
  };

  const pickExample = (example: string, key: string) => {
    setTranslationKey(key);
    onReferenceChange?.(example);
    setResult(null);
    setError(null);
    setInserted(false);
  };

  const isCommentary = mode === "commentary";
  const showMeta = meta && !result && !isCommentary;

  const commentaryReady = Boolean(onApplyCommentary);

  return (
    <div className="border border-rule bg-surface-2/40 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-mono text-[10px] text-steel">Source lookup</span>
        <span className="font-mono text-[9px] text-mist">Optional - uses the reference above</span>
      </div>

      <div
        role="tablist"
        aria-label="Source type"
        className="mt-2 grid grid-cols-3 gap-1 border border-rule bg-surface p-0.5"
      >
        {modeLabels.map((item) => (
          <button
            key={item.id}
            role="tab"
            type="button"
            aria-selected={mode === item.id}
            onClick={() => changeMode(item.id)}
            className={`px-2 py-1.5 text-[11px] font-medium transition-colors ${
              mode === item.id
                ? "bg-ink text-paper"
                : "text-steel hover:bg-highlight hover:text-ink"
            }`}
            title={item.hint}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Source and translation</span>
          <Select
            value={translationKey}
            onChange={(e) => setTranslationKey(e.target.value)}
            disabled={translations.isLoading}
          >
            {mode === "verse" && (
              <>
                <optgroup label="Bible - Free Use (no key)">
                  {grouped["free-use"].map(sourceOption)}
                </optgroup>
                {apiBible && grouped["api-bible"].length > 0 && (
                  <optgroup label="Bible - API.Bible (licensed)">
                    {grouped["api-bible"].map(sourceOption)}
                  </optgroup>
                )}
                <optgroup label="Sefaria - Jewish texts">
                  {grouped.sefaria.map(sourceOption)}
                </optgroup>
                <optgroup label="Quran - AlQuran Cloud">{grouped.quran.map(sourceOption)}</optgroup>
              </>
            )}
            {mode === "commentary" && (
              <>
                <optgroup label="Bible commentary - Free Use">
                  {grouped["free-commentary"].map(sourceOption)}
                </optgroup>
                <optgroup label="Quran tafsir - Quran.com">
                  {grouped["quran-tafsir"].map(sourceOption)}
                </optgroup>
                <optgroup label="Sefaria - classical commentary">
                  {grouped.sefaria.map(sourceOption)}
                </optgroup>
              </>
            )}
            {mode === "hadith" && (
              <optgroup label="Hadith - Arabic + English">
                {grouped.hadith.map(sourceOption)}
              </optgroup>
            )}
            {!selected && (
              <option value={translationKey}>
                {meta?.translationLabel ?? "Saved translation"}
              </option>
            )}
          </Select>
        </label>
        <Button
          onClick={run}
          disabled={busy || !reference.trim() || (isCommentary && !commentaryReady)}
          className="shrink-0"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <BookOpen className="size-3.5" />}
          {busy
            ? "Fetching…"
            : result
              ? "Fetch again"
              : isCommentary
                ? "Fetch commentary"
                : "Fetch text"}
        </Button>
      </div>

      {mode === "verse" && (
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <ExampleGroup
            label="Bible"
            examples={["John 17:3", "1 Cor 13:4-7"]}
            onPick={(example) => pickExample(example, "free-use:BSB")}
          />
          <ExampleGroup
            label="Sefaria"
            examples={["Genesis 1:1", "Berakhot 2a"]}
            onPick={(example) => pickExample(example, "sefaria:bilingual")}
          />
          <ExampleGroup
            label="Quran"
            examples={["17:3", "2:255-257"]}
            onPick={(example) => pickExample(example, "quran:en.sahih")}
          />
        </div>
      )}

      {mode === "commentary" && (
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <ExampleGroup
            label="Bible commentary"
            examples={["Genesis 1:1", "John 3:16"]}
            onPick={(example) => pickExample(example, "free-commentary:matthew-henry")}
          />
          <ExampleGroup
            label="Quran tafsir"
            examples={["17:3", "2:255"]}
            onPick={(example) => pickExample(example, "quran-tafsir:169")}
          />
          <ExampleGroup
            label="Sefaria commentary"
            examples={["Rashi on Genesis 1:1"]}
            onPick={(example) => pickExample(example, "sefaria:bilingual")}
          />
        </div>
      )}

      {mode === "hadith" && (
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <ExampleGroup
            label="Bukhari"
            examples={["Bukhari 1", "Bukhari 2:1"]}
            onPick={(example) => pickExample(example, "hadith:bukhari")}
          />
          <ExampleGroup
            label="Muslim"
            examples={["Muslim 1:1", "Muslim 2:1"]}
            onPick={(example) => pickExample(example, "hadith:muslim")}
          />
          <ExampleGroup
            label="More"
            examples={["Abu Dawud 1", "Abu Dawud 1:1"]}
            onPick={(example) => pickExample(example, "hadith:abudawud")}
          />
        </div>
      )}

      {translations.data?.warning && (
        <p className="mt-2 text-[11px] leading-relaxed text-unv">{translations.data.warning}</p>
      )}
      {translations.isError && (
        <p className="mt-2 text-[11px] leading-relaxed text-dispute">
          Could not load all sources. The built-in list is still available.
        </p>
      )}
      {error && <p className="mt-2 text-[11px] leading-relaxed text-dispute">{error}</p>}

      {showMeta && meta && (
        <p className="mt-2 flex items-center gap-1.5 font-mono text-[9.5px] text-mist">
          <RefreshCw className="size-3" />
          Saved: {meta.reference} · {meta.translationLabel}
          {meta.secondaryLabel ? ` · ${meta.secondaryLabel}` : ""} ·{" "}
          {new Date(meta.fetchedAt).toLocaleDateString()}
        </p>
      )}

      {result && (
        <div className="mt-3 border border-rule bg-surface p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-mono text-[10px] text-steel">{result.reference}</span>
            <span className="font-mono text-[9.5px] text-mist">{result.translationLabel}</span>
          </div>
          <p
            dir={result.textDirection ?? "ltr"}
            className={`mt-1.5 max-h-48 overflow-y-auto font-serif text-[13.5px] leading-relaxed text-pretty text-ink ${
              result.textDirection === "rtl" ? "font-arabic text-[16px] leading-[2]" : ""
            }`}
          >
            {result.text}
          </p>
          {result.secondaryText && (
            <div className="mt-2 border-t border-rule pt-2">
              <div className="font-mono text-[9px] text-mist">{result.secondaryLabel}</div>
              <p
                dir="rtl"
                className={`mt-1 max-h-32 overflow-y-auto font-serif text-[13px] leading-relaxed text-pretty text-steel ${
                  result.language === "ar" ? "font-arabic text-[16px] leading-[2]" : ""
                }`}
              >
                {result.secondaryText}
              </p>
            </div>
          )}
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-rule pt-2">
            <span className="min-w-0 max-w-[70%] truncate font-mono text-[9px] text-mist">
              {result.attribution ?? "Check the source's licence before publishing."}
            </span>
            <Button
              variant={inserted ? "ghost" : "solid"}
              disabled={inserted}
              onClick={() => {
                if (isCommentary) onApplyCommentary?.(result);
                else onApply(result);
                setInserted(true);
              }}
            >
              {inserted ? <Check className="size-3.5" /> : null}
              {inserted
                ? isCommentary
                  ? "Added"
                  : "Inserted"
                : isCommentary
                  ? "Add as commentary"
                  : "Use this text"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function sourceOption(option: {
  provider: ScriptureProvider;
  id: string;
  label: string;
  detail?: string;
}) {
  return (
    <option key={scriptureKey(option)} value={scriptureKey(option)}>
      {option.label}
      {option.detail ? ` — ${option.detail}` : ""}
    </option>
  );
}

function ExampleGroup({
  label,
  examples,
  onPick,
}: {
  label: string;
  examples: string[];
  onPick?: ((value: string) => void) | undefined;
}) {
  return (
    <div className="border border-rule bg-surface px-2.5 py-2">
      <div className="font-mono text-[9px] text-steel">{label}</div>
      <div className="mt-1 flex flex-wrap gap-1">
        {examples.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => onPick?.(example)}
            className="border border-rule bg-surface-2 px-2 py-0.5 font-mono text-[9.5px] text-steel transition-colors hover:border-steel/40 hover:text-ink"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
