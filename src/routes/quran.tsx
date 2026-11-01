import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from "react";
import {
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  PanelRight,
  RefreshCw,
  Settings2,
  X,
} from "lucide-react";
import {
  parseQuranReference,
  quranTafsirTranslations,
  quranTranslations,
  type QuranAsbabResult,
  type QuranPageAyah,
  type QuranPageResult,
  type ScriptureResult,
} from "@/lib/scripture";
import { getQuranAsbab, getQuranPage, getQuranTafsir } from "@/lib/quran-api";
import {
  defaultQuranSettings,
  isBookmarked,
  readBookmarks,
  readLastRead,
  readQuranSettings,
  storeBookmarks,
  storeLastRead,
  storeQuranSettings,
  toggleBookmark,
  type LastRead,
  type QuranBookmark,
  type QuranReaderSettings,
} from "@/lib/quran-storage";
import { useFocusTrap } from "@/hooks/use-focus-trap";

const title = "Quran library � Docket";
const description =
  "Read the Quran page by page in the Madani mushaf order, with Uthmani Arabic, English translations, and tafsir.";

export const Route = createFileRoute("/quran")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QuranReader,
});

const TOTAL_PAGES = 604;
const DEFAULT_TRANSLATION = "en.sahih";
const DEFAULT_TAFSIR = "169";
const BASMALA = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";

const translationLabels: Record<string, string> = {
  "en.sahih": "Saheeh International",
  "en.asad": "Muhammad Asad",
  "en.pickthall": "Pickthall",
  "en.yusufali": "Yusuf Ali",
  none: "Arabic only",
};

type VersePointer = { surah: number; numberInSurah: number };
type SelectedAyah = VersePointer & { arabic: string };
type FocusTarget = { surah: number; verse: number };
type PanelTab = "tafsir" | "asbab" | "bookmarks";

const PANEL_TABS: PanelTab[] = ["tafsir", "asbab", "bookmarks"];

const clampPage = (value: number): number =>
  Number.isFinite(value) ? Math.min(TOTAL_PAGES, Math.max(1, Math.trunc(value))) : 1;

function readPage(): number {
  if (typeof window === "undefined") return 1;
  return clampPage(Number(new URLSearchParams(window.location.search).get("page") ?? 1));
}

function readTranslation(): string {
  if (typeof window === "undefined") return DEFAULT_TRANSLATION;
  const value = new URLSearchParams(window.location.search).get("translation");
  return value && quranTranslations.some((option) => option.id === value)
    ? value
    : DEFAULT_TRANSLATION;
}

function readFocusTarget(): FocusTarget | null {
  if (typeof window === "undefined") return null;
  const parsed = parseQuranReference(
    new URLSearchParams(window.location.search).get("verse") ?? "",
  );
  return parsed ? { surah: parsed.surah, verse: parsed.verse } : null;
}

function readerUrl(page: number, translationId: string, verse?: VersePointer | null): string {
  const search = new URLSearchParams();
  search.set("page", String(page));
  if (translationId !== DEFAULT_TRANSLATION) search.set("translation", translationId);
  if (verse) search.set("verse", `${verse.surah}:${verse.numberInSurah}`);
  return `?${search.toString()}`;
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
}

function arabicTextClass(size: QuranReaderSettings["textSize"]): string {
  if (size === "sm") return "text-[22px] sm:text-[24px]";
  if (size === "lg") return "text-[30px] sm:text-[34px]";
  return "text-[25px] sm:text-[28px]";
}

function translationTextClass(size: QuranReaderSettings["textSize"]): string {
  if (size === "sm") return "text-[12.5px]";
  if (size === "lg") return "text-[15.5px]";
  return "text-[13.5px]";
}

function panelArabicTextClass(size: QuranReaderSettings["textSize"]): string {
  if (size === "sm") return "text-[19px]";
  if (size === "lg") return "text-[24px]";
  return "text-[21px]";
}

function QuranReader() {
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [translationId, setTranslationId] = useState(DEFAULT_TRANSLATION);
  const [hydrated, setHydrated] = useState(false);
  const [tafsirOpen, setTafsirOpen] = useState(false);
  const [tafsirId, setTafsirId] = useState(DEFAULT_TAFSIR);
  const [selectedAyah, setSelectedAyah] = useState<SelectedAyah | null>(null);
  const [panelTab, setPanelTab] = useState<PanelTab>("tafsir");
  const [settings, setSettings] = useState<QuranReaderSettings>(defaultQuranSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lastRead, setLastRead] = useState<LastRead | null>(null);
  const [continueDismissed, setContinueDismissed] = useState(false);
  const [bookmarks, setBookmarks] = useState<QuranBookmark[]>([]);
  const [focusTarget, setFocusTarget] = useState<FocusTarget | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const pageInputRef = useRef<HTMLInputElement>(null);
  const desktopCloseRef = useRef<HTMLButtonElement>(null);
  const mobileCloseRef = useRef<HTMLButtonElement>(null);
  const studyButtonRef = useRef<HTMLButtonElement>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const initialPageRef = useRef<number | null>(null);

  const reducedMotion = useReducedMotion();
  useFocusTrap(mobilePanelRef, tafsirOpen);

  useEffect(() => {
    setPage(readPage());
    setTranslationId(readTranslation());
    setSettings(readQuranSettings());
    setLastRead(readLastRead());
    setBookmarks(readBookmarks());
    setFocusTarget(readFocusTarget());
    setHydrated(true);
  }, []);

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  const announce = useCallback((message: string) => {
    if (typeof window === "undefined") return;
    setAnnouncement("");
    window.setTimeout(() => setAnnouncement(message), 20);
  }, []);

  const goToPage = useCallback(
    (next: number) => {
      const target = clampPage(next);
      setPage(target);
      setSelectedAyah(null);
      setFocusTarget(null);
      setContinueDismissed(true);
      announce(`Loading page ${target}.`);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
      }
    },
    [announce, reducedMotion],
  );

  const closePanel = useCallback(() => {
    const selected = selectedAyah;
    setTafsirOpen(false);
    requestAnimationFrame(() => {
      if (selected) {
        document
          .querySelector<HTMLButtonElement>(
            `[data-ayah="${selected.surah}:${selected.numberInSurah}"]`,
          )
          ?.focus();
      } else {
        studyButtonRef.current?.focus();
      }
    });
  }, [selectedAyah]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    const urlVerse =
      selectedAyah ??
      (focusTarget ? { surah: focusTarget.surah, numberInSurah: focusTarget.verse } : null);
    const next = readerUrl(page, translationId, urlVerse);
    if (window.location.search !== next) {
      window.history.replaceState(null, "", `${window.location.pathname}${next}`);
    }
  }, [page, translationId, selectedAyah, focusTarget, hydrated]);

  useEffect(() => {
    if (hydrated) storeQuranSettings(settings);
  }, [settings, hydrated]);

  useEffect(() => {
    if (!settingsOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [settingsOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (tafsirOpen) closePanel();
        setSettingsOpen(false);
        return;
      }
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;
      if (typing) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "PageUp") {
        event.preventDefault();
        goToPage(page - 1);
      } else if (event.key === "PageDown") {
        event.preventDefault();
        goToPage(page + 1);
      } else if (event.key.toLowerCase() === "g") {
        event.preventDefault();
        pageInputRef.current?.focus();
        pageInputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closePanel, goToPage, page, tafsirOpen]);

  useEffect(() => {
    if (!tafsirOpen || typeof window === "undefined") return;
    requestAnimationFrame(() => {
      const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
      (isDesktop ? desktopCloseRef : mobileCloseRef).current?.focus();
    });
  }, [tafsirOpen]);

  const pageQuery = useQuery({
    queryKey: ["quran-page", page, translationId],
    queryFn: () => getQuranPage({ data: { page, translationId } }),
    staleTime: 24 * 60 * 60 * 1000,
    enabled: hydrated,
    retry: false,
  });

  const tafsirQuery = useQuery({
    queryKey: ["quran-tafsir", selectedAyah?.surah, selectedAyah?.numberInSurah, tafsirId],
    queryFn: () =>
      getQuranTafsir({
        data: {
          surah: selectedAyah?.surah ?? 1,
          verse: selectedAyah?.numberInSurah ?? 1,
          tafsirId,
        },
      }),
    enabled: Boolean(selectedAyah) && tafsirOpen && panelTab === "tafsir",
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
  });

  const asbabQuery = useQuery({
    queryKey: ["quran-asbab", selectedAyah?.surah, selectedAyah?.numberInSurah],
    queryFn: () =>
      getQuranAsbab({
        data: {
          surah: selectedAyah?.surah ?? 1,
          verse: selectedAyah?.numberInSurah ?? 1,
        },
      }),
    enabled: Boolean(selectedAyah) && tafsirOpen && panelTab === "asbab",
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
  });

  const result = pageQuery.data?.ok ? pageQuery.data.result : null;
  const error = pageQuery.data && !pageQuery.data.ok ? pageQuery.data.error : null;

  useEffect(() => {
    if (pageQuery.isFetching) announce(`Loading page ${page}.`);
  }, [pageQuery.isFetching, page, announce]);

  useEffect(() => {
    if (result) announce(`Page ${page} of ${TOTAL_PAGES}.`);
  }, [result, page, announce]);

  useEffect(() => {
    if (!result) return;
    const first = result.ayahs[0];
    if (!first) return;
    if (initialPageRef.current === null) {
      initialPageRef.current = page;
      if (!lastRead) {
        storeLastRead({
          page,
          translationId,
          surah: first.surah,
          verse: first.numberInSurah,
          updatedAt: new Date().toISOString(),
        });
      }
      return;
    }
    if (initialPageRef.current === page) return;
    initialPageRef.current = page;
    storeLastRead({
      page,
      translationId,
      surah: first.surah,
      verse: first.numberInSurah,
      updatedAt: new Date().toISOString(),
    });
  }, [page, translationId, result, lastRead]);

  useEffect(() => {
    if (!result || !focusTarget) return;
    const ayah = result.ayahs.find(
      (item) => item.surah === focusTarget.surah && item.numberInSurah === focusTarget.verse,
    );
    if (ayah) {
      setSelectedAyah({
        surah: ayah.surah,
        numberInSurah: ayah.numberInSurah,
        arabic: ayah.arabic,
      });
      if (panelTab === "bookmarks") setPanelTab("tafsir");
      requestAnimationFrame(() => {
        const node = document.querySelector<HTMLButtonElement>(
          `[data-ayah="${ayah.surah}:${ayah.numberInSurah}"]`,
        );
        node?.scrollIntoView({
          behavior: reducedMotion ? "auto" : "smooth",
          block: "center",
        });
        node?.focus({ preventScroll: true });
      });
    }
    setFocusTarget(null);
  }, [result, focusTarget, reducedMotion, panelTab]);

  const submitPage = () => {
    const parsed = Number(pageInput);
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= TOTAL_PAGES) {
      goToPage(parsed);
    } else {
      setPageInput(String(page));
    }
  };

  const selectAyah = (ayah: QuranPageAyah) => {
    setSelectedAyah({
      surah: ayah.surah,
      numberInSurah: ayah.numberInSurah,
      arabic: ayah.arabic,
    });
    if (panelTab === "bookmarks") setPanelTab("tafsir");
    setTafsirOpen(true);
    announce(`Selected ayah ${ayah.surah}:${ayah.numberInSurah}.`);
  };

  const handleTabKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    current: PanelTab,
    idPrefix: string,
  ) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const index = PANEL_TABS.indexOf(current);
    const offset = event.key === "ArrowRight" ? 1 : -1;
    const next = PANEL_TABS[(index + offset + PANEL_TABS.length) % PANEL_TABS.length]!;
    setPanelTab(next);
    requestAnimationFrame(() => {
      document.getElementById(`${idPrefix}-study-tab-${next}`)?.focus();
    });
  };

  const updateBookmarks = (next: QuranBookmark[]) => {
    setBookmarks(next);
    storeBookmarks(next);
  };

  const selectedIsBookmarked = selectedAyah
    ? isBookmarked(bookmarks, selectedAyah.surah, selectedAyah.numberInSurah)
    : false;

  const toggleSelectedBookmark = () => {
    if (!selectedAyah || !result) return;
    const surahName =
      result.surahs.find((item) => item.number === selectedAyah.surah)?.englishName ??
      `Surah ${selectedAyah.surah}`;
    const bookmark: QuranBookmark = {
      surah: selectedAyah.surah,
      verse: selectedAyah.numberInSurah,
      page,
      surahName,
      createdAt: new Date().toISOString(),
    };
    const exists = isBookmarked(bookmarks, bookmark.surah, bookmark.verse);
    updateBookmarks(toggleBookmark(bookmarks, bookmark));
    announce(exists ? "Bookmark removed." : "Bookmark added.");
  };

  const removeBookmark = (bookmark: QuranBookmark) => {
    updateBookmarks(toggleBookmark(bookmarks, bookmark));
    announce("Bookmark removed.");
  };

  const openBookmark = (bookmark: QuranBookmark) => {
    setTafsirOpen(false);
    goToPage(bookmark.page);
    setFocusTarget({ surah: bookmark.surah, verse: bookmark.verse });
  };

  const renderTafsirPanel = (
    closeButtonRef: RefObject<HTMLButtonElement | null>,
    idPrefix: string,
  ) => (
    <TafsirPanel
      tab={panelTab}
      onTabChange={setPanelTab}
      onTabKeyDown={(event, current) => handleTabKeyDown(event, current, idPrefix)}
      idPrefix={idPrefix}
      tafsirId={tafsirId}
      onTafsirChange={setTafsirId}
      selectedAyah={selectedAyah}
      result={tafsirQuery.data?.ok ? tafsirQuery.data.result : null}
      error={tafsirQuery.data && !tafsirQuery.data.ok ? tafsirQuery.data.error : null}
      loading={tafsirQuery.isFetching}
      onRetry={() => void tafsirQuery.refetch()}
      asbab={asbabQuery.data?.ok ? asbabQuery.data.result : null}
      asbabError={asbabQuery.data && !asbabQuery.data.ok ? asbabQuery.data.error : null}
      asbabLoading={asbabQuery.isFetching}
      onRetryAsbab={() => void asbabQuery.refetch()}
      bookmarks={bookmarks}
      isBookmarked={selectedIsBookmarked}
      onToggleBookmark={toggleSelectedBookmark}
      onOpenBookmark={openBookmark}
      onRemoveBookmark={removeBookmark}
      closeButtonRef={closeButtonRef}
      onClose={closePanel}
      pageTranslation={translationId}
      arabicTextClass={panelArabicTextClass(settings.textSize)}
    />
  );

  const showContinue = lastRead !== null && lastRead.page !== page && !continueDismissed;

  return (
    <div
      className="min-h-[calc(100dvh-3.5rem)] bg-canvas"
      style={
        {
          "--quran-font":
            settings.arabicFont === "amiri"
              ? '"Amiri", "Noto Naskh Arabic", serif'
              : '"Noto Naskh Arabic", "Amiri", serif',
        } as CSSProperties
      }
    >
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <div className="sticky top-14 z-30 border-b border-rule bg-canvas">
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 sm:px-6">
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] text-mist">Quran library � Madani mushaf</div>
            <div className="mt-0.5 font-display text-[17px] leading-tight text-ink">
              Page {page} <span className="text-mist">of {TOTAL_PAGES}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
              className="flex size-8 items-center justify-center border border-rule bg-surface text-steel transition-colors hover:border-steel/40 hover:text-ink disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
            </button>
            <label className="flex items-center gap-1 border border-rule bg-surface px-2 py-1">
              <span className="sr-only">Page number</span>
              <input
                ref={pageInputRef}
                type="number"
                min={1}
                max={TOTAL_PAGES}
                value={pageInput}
                onChange={(event) => setPageInput(event.target.value)}
                onBlur={submitPage}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submitPage();
                }}
                className="w-12 border-0 bg-transparent text-center font-mono text-[12px] text-ink outline-none"
              />
            </label>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page >= TOTAL_PAGES}
              aria-label="Next page"
              className="flex size-8 items-center justify-center border border-rule bg-surface text-steel transition-colors hover:border-steel/40 hover:text-ink disabled:opacity-30"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <label className="flex items-center gap-1.5 border border-rule bg-surface px-2 py-1.5">
            <span className="font-mono text-[9px] text-mist">Translation</span>
            <select
              value={translationId}
              onChange={(event) => setTranslationId(event.target.value)}
              className="border-0 bg-transparent text-[12px] text-ink outline-none"
            >
              {quranTranslations.map((option) => (
                <option key={option.id} value={option.id}>
                  {translationLabels[option.id] ?? option.label}
                </option>
              ))}
            </select>
          </label>

          <div ref={settingsRef} className="relative">
            <button
              type="button"
              onClick={() => setSettingsOpen((open) => !open)}
              aria-expanded={settingsOpen}
              aria-controls="reader-settings"
              aria-label="Reading settings"
              className={`flex items-center gap-1.5 border px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                settingsOpen
                  ? "border-ink bg-ink text-paper"
                  : "border-rule bg-surface text-steel hover:border-steel/40 hover:text-ink"
              }`}
            >
              <Settings2 className="size-3.5" />
              Aa
            </button>
            {settingsOpen && (
              <div
                id="reader-settings"
                className="absolute right-0 top-full z-40 mt-1 w-60 border border-rule bg-surface p-3 shadow-lg"
              >
                <div className="font-mono text-[9px] text-mist">Text size</div>
                <div className="mt-1 grid grid-cols-3 gap-1">
                  {(["sm", "md", "lg"] as const).map((size) => (
                    <button
                      key={size}
                      type="button"
                      aria-pressed={settings.textSize === size}
                      onClick={() => setSettings({ ...settings, textSize: size })}
                      className={`border px-2 py-1 font-mono text-[11px] transition-colors ${
                        settings.textSize === size
                          ? "border-ink bg-ink text-paper"
                          : "border-rule bg-surface text-steel hover:border-steel/40 hover:text-ink"
                      }`}
                    >
                      {size === "sm" ? "S" : size === "md" ? "M" : "L"}
                    </button>
                  ))}
                </div>

                <div className="mt-3 font-mono text-[9px] text-mist">Arabic font</div>
                <div className="mt-1 grid grid-cols-2 gap-1">
                  {(["naskh", "amiri"] as const).map((font) => (
                    <button
                      key={font}
                      type="button"
                      aria-pressed={settings.arabicFont === font}
                      onClick={() => setSettings({ ...settings, arabicFont: font })}
                      className={`border px-2 py-1 text-[11px] transition-colors ${
                        settings.arabicFont === font
                          ? "border-ink bg-ink text-paper"
                          : "border-rule bg-surface text-steel hover:border-steel/40 hover:text-ink"
                      }`}
                    >
                      {font === "naskh" ? "Naskh" : "Amiri"}
                    </button>
                  ))}
                </div>

                <label className="mt-3 flex items-center justify-between gap-2 text-[12px] text-steel">
                  <span>Show translation</span>
                  <input
                    type="checkbox"
                    checked={settings.showTranslation}
                    onChange={(event) =>
                      setSettings({ ...settings, showTranslation: event.target.checked })
                    }
                    className="size-4 accent-ink"
                  />
                </label>
              </div>
            )}
          </div>

          <button
            ref={studyButtonRef}
            type="button"
            onClick={() => setTafsirOpen((open) => !open)}
            aria-pressed={tafsirOpen}
            className={`flex items-center gap-1.5 border px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
              tafsirOpen
                ? "border-ink bg-ink text-paper"
                : "border-rule bg-surface text-steel hover:border-steel/40 hover:text-ink"
            }`}
          >
            <PanelRight className="size-3.5" />
            Study
          </button>
        </div>
        <div aria-hidden className="h-0.5 w-full bg-rule/60">
          <div
            className="h-0.5 bg-verify transition-[width] duration-300"
            style={{ width: `${(page / TOTAL_PAGES) * 100}%` }}
          />
        </div>
      </div>

      {showContinue && lastRead && (
        <div className="border-b border-rule bg-surface-2">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
            <span className="min-w-0 truncate text-[12px] text-steel">
              Continue at page {lastRead.page}
            </span>
            <button
              type="button"
              onClick={() => goToPage(lastRead.page)}
              className="border border-rule bg-surface px-2.5 py-1 text-[11.5px] font-medium text-ink transition-colors hover:border-steel/40"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      <div className="flex">
        <main className="min-w-0 flex-1 px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-3xl">
            {pageQuery.isLoading ? (
              <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-mist">
                <Loader2 className="size-5 animate-spin" />
                <p className="font-mono text-[10px]">Loading page {page}</p>
              </div>
            ) : error ? (
              <div className="mx-auto max-w-sm border border-rule bg-surface px-6 py-8 text-center">
                <p className="font-display text-[17px] text-ink">This page could not be loaded</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-mist">{error}</p>
                <button
                  type="button"
                  onClick={() => void pageQuery.refetch()}
                  className="mt-4 inline-flex items-center gap-1.5 bg-ink px-3 py-1.5 text-[12px] font-medium text-paper transition-opacity hover:opacity-90"
                >
                  <RefreshCw className="size-3.5" />
                  Try again
                </button>
              </div>
            ) : result ? (
              <PageBody
                result={result}
                selectedAyah={selectedAyah}
                onSelectAyah={selectAyah}
                bookmarks={bookmarks}
                textSize={settings.textSize}
                showTranslation={settings.showTranslation}
              />
            ) : null}

            {result && (
              <div className="mt-10 border-t border-rule pt-4 text-center">
                <p className="font-mono text-[9px] leading-relaxed text-mist">
                  {result.attribution}
                </p>
                <p className="mt-1 font-mono text-[9px] text-mist">
                  Page {result.page} of {result.totalPages}
                </p>
              </div>
            )}
          </div>
        </main>

        {tafsirOpen && (
          <aside
            aria-label="Study panel"
            className="sticky top-[6.6rem] hidden h-[calc(100dvh-6.6rem)] w-[380px] shrink-0 border-l border-rule bg-surface lg:flex lg:flex-col"
          >
            {renderTafsirPanel(desktopCloseRef, "desktop")}
          </aside>
        )}
      </div>

      {tafsirOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Close study panel"
            onClick={closePanel}
            className="absolute inset-0 bg-ink/25"
          />
          <div
            ref={mobilePanelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Study panel"
            className="absolute inset-y-0 right-0 flex w-[380px] max-w-[92vw] flex-col bg-surface shadow-xl"
          >
            {renderTafsirPanel(mobileCloseRef, "mobile")}
          </div>
        </div>
      )}
    </div>
  );
}

function PageBody({
  result,
  selectedAyah,
  onSelectAyah,
  bookmarks,
  textSize,
  showTranslation,
}: {
  result: QuranPageResult;
  selectedAyah: SelectedAyah | null;
  onSelectAyah: (ayah: QuranPageAyah) => void;
  bookmarks: QuranBookmark[];
  textSize: QuranReaderSettings["textSize"];
  showTranslation: boolean;
}) {
  let previousSurah = 0;
  const arabicClass = arabicTextClass(textSize);
  const translationClass = translationTextClass(textSize);

  return (
    <div className="space-y-4">
      {result.ayahs.map((ayah) => {
        const newSurah = ayah.surah !== previousSurah;
        previousSurah = ayah.surah;
        const surah = result.surahs.find((item) => item.number === ayah.surah);
        const showBasmala =
          newSurah && ayah.numberInSurah === 1 && ayah.surah !== 1 && ayah.surah !== 9;
        const selected =
          selectedAyah?.surah === ayah.surah && selectedAyah.numberInSurah === ayah.numberInSurah;
        const bookmarked = isBookmarked(bookmarks, ayah.surah, ayah.numberInSurah);

        return (
          <div key={ayah.number} className="space-y-4">
            {newSurah && surah && (
              <div className="flex flex-wrap items-end justify-between gap-2 border-b border-rule pb-2 pt-4">
                <div>
                  <div className="font-mono text-[9.5px] text-mist">Surah {surah.number}</div>
                  <h2 className="font-display text-[20px] leading-tight text-ink">
                    {surah.englishName}
                  </h2>
                  <p className="mt-0.5 text-[11.5px] text-steel">
                    {surah.englishNameTranslation} - {surah.revelationType} - {surah.numberOfAyahs}{" "}
                    ayahs
                  </p>
                </div>
                <div dir="rtl" className="quran-arabic text-[22px] leading-tight text-ink">
                  {surah.name}
                </div>
              </div>
            )}

            {showBasmala && (
              <p
                dir="rtl"
                className="quran-arabic border-y border-rule/60 py-3 text-center text-[20px] leading-[2] text-steel"
              >
                {BASMALA}
              </p>
            )}

            <button
              type="button"
              onClick={() => onSelectAyah(ayah)}
              data-ayah={`${ayah.surah}:${ayah.numberInSurah}`}
              aria-label={`Open tafsir for ${ayah.surah}:${ayah.numberInSurah}${
                bookmarked ? " (bookmarked)" : ""
              }`}
              className={`group flex w-full items-start gap-3 border px-3 py-3 text-left transition-colors sm:px-4 ${
                selected
                  ? "border-verify/50 bg-surface-2"
                  : "border-transparent hover:border-rule hover:bg-surface"
              }`}
            >
              <span className="mt-1 flex w-7 shrink-0 flex-col items-center gap-1">
                <span className="flex size-7 items-center justify-center rounded-full border border-rule bg-surface font-mono text-[10px] text-steel transition-colors group-hover:border-verify/50 group-hover:text-verify">
                  {ayah.numberInSurah}
                </span>
                {bookmarked ? <Bookmark className="size-3 text-verify" aria-hidden /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  dir="rtl"
                  className={`block quran-arabic ${arabicClass} leading-[2] text-ink`}
                >
                  {ayah.arabic}
                </span>
                {showTranslation && ayah.translation ? (
                  <span className={`mt-2 block ${translationClass} leading-relaxed text-steel`}>
                    {ayah.translation}
                  </span>
                ) : null}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

function TafsirPanel({
  tab,
  onTabChange,
  onTabKeyDown,
  idPrefix,
  tafsirId,
  onTafsirChange,
  selectedAyah,
  result,
  error,
  loading,
  onRetry,
  asbab,
  asbabError,
  asbabLoading,
  onRetryAsbab,
  bookmarks,
  isBookmarked: selectedIsBookmarked,
  onToggleBookmark,
  onOpenBookmark,
  onRemoveBookmark,
  closeButtonRef,
  onClose,
  pageTranslation,
  arabicTextClass: panelArabicClass,
}: {
  tab: PanelTab;
  onTabChange: (value: PanelTab) => void;
  onTabKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>, tab: PanelTab) => void;
  idPrefix: string;
  tafsirId: string;
  onTafsirChange: (value: string) => void;
  selectedAyah: SelectedAyah | null;
  result: ScriptureResult | null;
  error: string | null;
  loading: boolean;
  onRetry: () => void;
  asbab: QuranAsbabResult | null;
  asbabError: string | null;
  asbabLoading: boolean;
  onRetryAsbab: () => void;
  bookmarks: QuranBookmark[];
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onOpenBookmark: (bookmark: QuranBookmark) => void;
  onRemoveBookmark: (bookmark: QuranBookmark) => void;
  closeButtonRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  pageTranslation: string;
  arabicTextClass: string;
}) {
  const rtl = result?.textDirection === "rtl" || result?.direction === "rtl";

  return (
    <>
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-rule px-3">
        <span className="font-mono text-[10px] text-mist">Study</span>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close study panel"
          className="ml-auto flex size-7 items-center justify-center text-steel transition-colors hover:bg-highlight hover:text-ink"
        >
          <X className="size-4" />
        </button>
      </div>

      <div
        role="tablist"
        aria-label="Study source"
        className="flex shrink-0 gap-1 border-b border-rule px-2 py-1.5"
      >
        {PANEL_TABS.map((item) => (
          <button
            key={item}
            id={`${idPrefix}-study-tab-${item}`}
            type="button"
            role="tab"
            aria-selected={tab === item}
            aria-controls={`${idPrefix}-study-tabpanel`}
            onClick={() => onTabChange(item)}
            onKeyDown={(event) => onTabKeyDown(event, item)}
            className={`flex-1 px-1.5 py-1 text-[11px] font-medium transition-colors ${
              tab === item ? "bg-ink text-paper" : "text-steel hover:bg-highlight hover:text-ink"
            }`}
          >
            {item === "tafsir" ? "Tafsir" : item === "asbab" ? "Occasion" : "Bookmarks"}
          </button>
        ))}
      </div>

      <div
        id={`${idPrefix}-study-tabpanel`}
        role="tabpanel"
        aria-labelledby={`${idPrefix}-study-tab-${tab}`}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
      >
        {tab === "bookmarks" ? (
          <div>
            <p className="font-display text-[16px] text-ink">Saved ayahs</p>
            <p className="mt-1 text-[12px] leading-relaxed text-mist">
              Stored on this device. Select an ayah and tap the bookmark button to add it.
            </p>
            {bookmarks.length === 0 ? (
              <div className="mt-8 border border-dashed border-rule px-4 py-8 text-center">
                <Bookmark className="mx-auto size-5 text-mist" />
                <p className="mt-2 text-[12.5px] text-mist">No bookmarks yet.</p>
              </div>
            ) : (
              <ul className="mt-4 space-y-1">
                {[...bookmarks].reverse().map((bookmark) => (
                  <li
                    key={`${bookmark.surah}:${bookmark.verse}`}
                    className="flex items-center gap-1 border-b border-rule/60 py-1"
                  >
                    <button
                      type="button"
                      onClick={() => onOpenBookmark(bookmark)}
                      className="min-w-0 flex-1 rounded px-1 py-1 text-left transition-colors hover:bg-highlight"
                    >
                      <span className="block truncate font-display text-[13.5px] text-ink">
                        {bookmark.surahName} {bookmark.surah}:{bookmark.verse}
                      </span>
                      <span className="font-mono text-[9px] text-mist">Page {bookmark.page}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveBookmark(bookmark)}
                      aria-label={`Remove bookmark ${bookmark.surah}:${bookmark.verse}`}
                      className="flex size-7 shrink-0 items-center justify-center text-mist transition-colors hover:bg-highlight hover:text-ink"
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : !selectedAyah ? (
          <div className="mt-16 text-center">
            <p className="font-display text-[16px] text-ink">Select an ayah</p>
            <p className="mx-auto mt-1 max-w-[26ch] text-[12.5px] leading-relaxed text-mist">
              Tap any ayah on the page to read its tafsir or occasion of revelation here.
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] text-steel">
                {selectedAyah.surah}:{selectedAyah.numberInSurah}
              </span>
              <div className="flex min-w-0 items-center gap-1">
                {tab === "tafsir" ? (
                  <select
                    value={tafsirId}
                    aria-label="Tafsir source"
                    onChange={(event) => onTafsirChange(event.target.value)}
                    className="max-w-[150px] border-0 bg-transparent text-right text-[11px] text-mist outline-none"
                  >
                    {quranTafsirTranslations.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="font-mono text-[9px] text-mist">Asbab al-Nuzul</span>
                )}
                <button
                  type="button"
                  onClick={onToggleBookmark}
                  aria-pressed={selectedIsBookmarked}
                  aria-label={selectedIsBookmarked ? "Remove bookmark" : "Bookmark this ayah"}
                  className="flex size-7 shrink-0 items-center justify-center text-steel transition-colors hover:bg-highlight hover:text-ink"
                >
                  {selectedIsBookmarked ? (
                    <BookmarkCheck className="size-3.5 text-verify" />
                  ) : (
                    <Bookmark className="size-3.5" />
                  )}
                </button>
              </div>
            </div>
            <p dir="rtl" className={`mt-2 quran-arabic ${panelArabicClass} leading-[2] text-ink`}>
              {selectedAyah.arabic}
            </p>

            <div className="mt-4 border-t border-rule pt-3">
              {tab === "tafsir" ? (
                loading ? (
                  <div className="flex items-center gap-2 text-mist">
                    <Loader2 className="size-3.5 animate-spin" />
                    <span className="font-mono text-[10px]">Loading tafsir</span>
                  </div>
                ) : error ? (
                  <ErrorBlock message={error} onRetry={onRetry} />
                ) : result ? (
                  <>
                    <p
                      dir={rtl ? "rtl" : "ltr"}
                      className={`whitespace-pre-line text-[13px] leading-relaxed text-steel ${
                        rtl ? "quran-arabic text-[16px] leading-[2]" : ""
                      }`}
                    >
                      {result.text}
                    </p>
                    <p className="mt-4 border-t border-rule pt-2 font-mono text-[9px] leading-relaxed text-mist">
                      {result.attribution ?? "Check the source's licence before publishing."}
                    </p>
                  </>
                ) : (
                  <p className="text-[12.5px] text-mist">No tafsir loaded.</p>
                )
              ) : asbabLoading ? (
                <div className="flex items-center gap-2 text-mist">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span className="font-mono text-[10px]">Loading occasion</span>
                </div>
              ) : asbabError ? (
                <ErrorBlock message={asbabError} onRetry={onRetryAsbab} />
              ) : asbab?.found ? (
                <>
                  {asbab.reference ? (
                    <span className="inline-block border border-rule bg-surface-2 px-2 py-0.5 font-mono text-[9px] text-mist">
                      Applies to {asbab.reference}
                    </span>
                  ) : null}
                  <p className="mt-2 text-[13px] leading-relaxed text-steel">{asbab.text}</p>
                  <div className="mt-4 border-t border-rule pt-2">
                    <p className="font-mono text-[9px] leading-relaxed text-mist">
                      {asbab.attribution}
                    </p>
                    <a
                      href={asbab.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 font-mono text-[9px] text-steel underline-offset-2 transition-colors hover:text-ink hover:underline"
                    >
                      Read at QuranX
                      <ExternalLink className="size-2.5" />
                    </a>
                  </div>
                </>
              ) : asbab ? (
                <div>
                  <p className="font-display text-[15px] text-ink">No specific occasion recorded</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-mist">
                    Al-Wahidi does not record a specific occasion for this ayah. Classical asbab
                    works cover many verses, but not all.
                  </p>
                </div>
              ) : (
                <p className="text-[12.5px] text-mist">No occasion loaded.</p>
              )}
            </div>
          </div>
        )}

        <p className="mt-6 border-t border-rule pt-2 font-mono text-[9px] leading-relaxed text-mist">
          {tab === "bookmarks"
            ? "Bookmarks are stored locally on this device."
            : tab === "asbab"
              ? "Classical asbab al-nuzul records occasions for many verses, but not all."
              : `Reading with ${
                  translationLabels[pageTranslation] ??
                  (pageTranslation === "none" ? "Arabic only" : pageTranslation)
                }.`}
        </p>
      </div>
    </>
  );
}

function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div>
      <p className="text-[12.5px] leading-relaxed text-dispute">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 inline-flex items-center gap-1.5 border border-rule bg-surface px-2 py-1 text-[11px] text-steel transition-colors hover:border-steel/40 hover:text-ink"
      >
        <RefreshCw className="size-3" />
        Try again
      </button>
    </div>
  );
}
