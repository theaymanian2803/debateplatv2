import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Braces,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Link2,
  ListFilter,
  Maximize2,
  Menu,
  Minimize2,
  PanelRight,
  Printer,
  Search,
  Share2,
} from "lucide-react";
import { allCitations, citationCount } from "@/lib/corpus";
import { rulingFor } from "@/lib/rulings";
import { docketNo, recordGroupLabel } from "@/lib/docket";
import { caseShareUrl } from "@/lib/citations";
import { useTheme } from "@/lib/theme";
import { useCorpus } from "@/lib/use-corpus";
import { getClientId } from "@/lib/client-id";
import { dossierBibTeX, dossierMarkdown } from "@/lib/dossier";
import { castVote, getVotesFor, listPaths } from "@/lib/corpus-api";
import {
  defaultFilters,
  deriveFacets,
  filterEntries,
  type CitationHealth,
  type Filters,
  type SortKey,
} from "@/lib/filters";
import { DocketRail } from "@/components/CorpusRail";
import { PrimaryPane } from "@/components/PrimaryPane";
import { RebuttalPane } from "@/components/RebuttalPane";
import { ArgumentMap } from "@/components/ArgumentMap";
import { Inspector, type InspectorTab } from "@/components/Inspector";
import { RulingStamp } from "@/components/StatusBadge";
import { CommandPalette } from "@/components/CommandPalette";
import { ShareCaseDialog } from "@/components/ShareCaseDialog";
import { CasePrintView } from "@/components/CasePrintView";

type Tab = "claim" | "briefs" | "chain";

const tabs: { id: Tab; label: string }[] = [
  { id: "claim", label: "Claim" },
  { id: "briefs", label: "Rebuttals" },
  { id: "chain", label: "Map" },
];

function param(key: string): string {
  return typeof window === "undefined"
    ? ""
    : (new URLSearchParams(window.location.search).get(key) ?? "");
}

function list(search: URLSearchParams, key: string): string[] {
  return (search.get(key) ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function readFilters(): Filters {
  if (typeof window === "undefined") return defaultFilters;
  const search = new URLSearchParams(window.location.search);
  const kinds = list(search, "kind").filter(
    (kind): kind is "verse" | "premise" => kind === "verse" || kind === "premise",
  );
  const statuses = list(search, "status").filter(
    (status): status is "verified" | "disputed" | "unverified" =>
      status === "verified" || status === "disputed" || status === "unverified",
  );
  const health = list(search, "health").filter(
    (value): value is CitationHealth =>
      value === "fully-verified" ||
      value === "has-disputed" ||
      value === "has-unverified" ||
      value === "no-citations",
  );
  const sorts: SortKey[] = ["relevance", "title", "citations", "status"];
  const sort = search.get("sort") as SortKey | null;
  return {
    query: search.get("q") ?? "",
    kinds,
    collections: list(search, "collection"),
    statuses,
    perspectives: list(search, "perspective"),
    health,
    withTranslations: search.get("translations") === "1",
    sort: sort && sorts.includes(sort) ? sort : "relevance",
  };
}

function readFlag(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  const value = window.localStorage.getItem(key);
  return value === null ? fallback : value === "1";
}

function downloadFile(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function IconButton({
  label,
  onClick,
  children,
  active = false,
  disabled = false,
  className = "",
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      className={`flex size-8 items-center justify-center border transition-colors disabled:opacity-30 ${
        active
          ? "border-ink bg-ink text-paper"
          : "border-transparent text-steel hover:border-rule hover:bg-surface-2 hover:text-ink"
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function CaseWorkspace({
  initialEntryId,
}: {
  initialEntryId?: string;
} = {}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { entries, collections } = useCorpus();
  const clientId = useMemo(getClientId, []);
  const { resolved: resolvedTheme, setTheme } = useTheme();

  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [selectedId, setSelectedId] = useState("");
  const [perspective, setPerspective] = useState<string | null>(null);
  const [focusedNode, setFocusedNode] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("claim");
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("chain");
  const [corpusOpen, setCorpusOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [focusTab, setFocusTab] = useState<"claim" | "briefs">("claim");
  const [activePathId, setActivePathId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [railOpen, setRailOpen] = useState(true);
  const [inspectorVisible, setInspectorVisible] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  const { data: paths } = useQuery({ queryKey: ["paths"], queryFn: listPaths });

  useEffect(() => {
    setFilters(readFilters());
    setSelectedId(initialEntryId || param("entry"));
    setFocusedNode(param("node") || null);
    setActivePathId(param("path") || null);
    setRailOpen(readFlag("docket-rail", true));
    setInspectorVisible(readFlag("docket-inspector", true));
    setHydrated(true);
  }, [initialEntryId]);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const activePath = paths?.find((path) => path.id === activePathId) ?? null;

  const baseEntries = useMemo(() => {
    if (!activePath) return entries;
    return activePath.entryIds
      .map((id) => entries.find((entry) => entry.id === id))
      .filter((entry): entry is (typeof entries)[number] => Boolean(entry));
  }, [entries, activePath]);

  const results = useMemo(() => filterEntries(baseEntries, filters), [baseEntries, filters]);
  const facets = useMemo(() => deriveFacets(baseEntries, filters), [baseEntries, filters]);

  const entry = results.find((candidate) => candidate.id === selectedId) ?? results[0] ?? null;

  useEffect(() => {
    if (entry && entry.id !== selectedId) setSelectedId(entry.id);
  }, [entry, selectedId]);

  useEffect(() => {
    if (!entry || typeof document === "undefined") return;
    const url = caseShareUrl(entry, window.location.origin);
    const description = entry.subtitle || entry.primary.slice(0, 160);
    document.title = `${entry.title} — Docket`;

    const setMeta = (key: "name" | "property", name: string, content: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(`meta[${key}="${name}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(key, name);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    setMeta("name", "description", description);
    setMeta("property", "og:title", `${entry.title} — Docket`);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", url);
    setMeta("property", "og:image", `${window.location.origin}/og-docket.png`);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", `${entry.title} — Docket`);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", `${window.location.origin}/og-docket.png`);
  }, [entry]);

  useEffect(() => {
    if (activePathId && paths && !paths.some((path) => path.id === activePathId)) {
      setActivePathId(null);
    }
  }, [activePathId, paths]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    const onCaseRoute = window.location.pathname.startsWith("/case/");
    const basePath = onCaseRoute && entry ? `/case/${entry.id}` : window.location.pathname;
    const search = new URLSearchParams();
    if (entry && !onCaseRoute) search.set("entry", entry.id);
    if (focusedNode) search.set("node", focusedNode);
    if (activePathId) search.set("path", activePathId);
    if (filters.query.trim()) search.set("q", filters.query.trim());
    if (filters.kinds.length) search.set("kind", filters.kinds.join(","));
    if (filters.collections.length) search.set("collection", filters.collections.join(","));
    if (filters.statuses.length) search.set("status", filters.statuses.join(","));
    if (filters.perspectives.length) search.set("perspective", filters.perspectives.join(","));
    if (filters.health.length) search.set("health", filters.health.join(","));
    if (filters.withTranslations) search.set("translations", "1");
    if (filters.sort !== "relevance") search.set("sort", filters.sort);

    const query = search.toString();
    const next = query ? `${basePath}?${query}` : basePath;
    if (`${window.location.pathname}${window.location.search}` !== next) {
      window.history.replaceState(null, "", next);
    }
  }, [entry, focusedNode, activePathId, filters, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem("docket-rail", railOpen ? "1" : "0");
  }, [railOpen, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem("docket-inspector", inspectorVisible ? "1" : "0");
  }, [inspectorVisible, hydrated]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((value) => !value);
        return;
      }

      if (event.key === "Escape") {
        setCorpusOpen(false);
        setInspectorOpen(false);
        setFocusMode(false);
        setShareOpen(false);
        setCommandOpen(false);
        setFocusedNode(null);
      }
      if (
        !typing &&
        event.key.toLowerCase() === "f" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        event.preventDefault();
        setFocusMode((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const activeCalls = entry ? allCitations(entry) : [];
  const tally = (status: "verified" | "disputed" | "unverified") =>
    activeCalls.filter((citation) => citation.status === status).length;

  const pathIndex = activePath && entry ? activePath.entryIds.indexOf(entry.id) : -1;
  const ruling = entry ? rulingFor(entry) : "unreviewed";

  const copyLink = async () => {
    try {
      const url = entry ? caseShareUrl(entry, window.location.origin) : window.location.href;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const rebuttalIds = entry?.rebuttals.map((rebuttal) => rebuttal.id) ?? [];
  const { data: votes } = useQuery({
    queryKey: ["votes", entry?.id],
    queryFn: () =>
      getVotesFor({ data: { targetType: "rebuttal", targetIds: rebuttalIds, clientId } }),
    enabled: rebuttalIds.length > 0,
  });

  const cast = async (id: string, direction: -1 | 0 | 1) => {
    await castVote({ data: { targetType: "rebuttal", targetId: id, clientId, direction } });
    await queryClient.invalidateQueries({ queryKey: ["votes"] });
  };

  const select = (id: string) => {
    setSelectedId(id);
    setPerspective(null);
    setFocusedNode(null);
    setCorpusOpen(false);
  };

  const jumpToEntry = (id: string) => {
    setFilters(defaultFilters);
    setActivePathId(null);
    select(id);
  };

  const enterPath = (id: string | null) => {
    setActivePathId(id);
    if (id) {
      const path = paths?.find((candidate) => candidate.id === id);
      if (path && path.entryIds[0]) select(path.entryIds[0]);
    }
  };

  const step = (direction: -1 | 1) => {
    if (!activePath || !entry) return;
    const index = activePath.entryIds.indexOf(entry.id);
    const next = activePath.entryIds[index + direction];
    if (next) select(next);
  };

  const related = useMemo(
    () =>
      (entry?.related ?? [])
        .map((id) => {
          const candidate = entries.find((item) => item.id === id);
          return candidate ? { id, title: candidate.title } : null;
        })
        .filter((item): item is { id: string; title: string } => Boolean(item)),
    [entry, entries],
  );

  const openInspector = (next: InspectorTab) => {
    setInspectorTab(next);
    setInspectorVisible(true);
    setInspectorOpen(true);
  };

  const openCitations = (id?: string) => {
    if (id) jumpToEntry(id);
    openInspector("authorities");
  };

  const openMap = () => openInspector("chain");

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const printCase = () => {
    setShareOpen(false);
    setCommandOpen(false);
    setTimeout(() => window.print(), 80);
  };

  const collectionLabel =
    (entry && collections.find((collection) => collection.id === entry.collection)?.label) ??
    (entry ? recordGroupLabel(entry.collection) : "");

  if (entries.length === 0) {
    return (
      <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center bg-canvas px-4">
        <div className="max-w-sm border border-rule bg-surface px-6 py-8 text-center">
          <p className="font-display text-[18px] font-semibold text-ink">The docket is empty</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-mist">
            Add cases in the editorial desk to populate the public record.
          </p>
        </div>
      </div>
    );
  }

  const railBody = (
    <DocketRail
      entries={baseEntries}
      results={results}
      collections={collections}
      selectedId={entry?.id ?? null}
      onSelect={select}
      filters={filters}
      onFiltersChange={setFilters}
      facets={facets}
      paths={paths ?? []}
      activePath={activePathId}
      onPathChange={enterPath}
      onClear={() => setFilters(defaultFilters)}
      onClose={() => setCorpusOpen(false)}
    />
  );

  const center = entry ? (
    <>
      <div className="shrink-0 border-b border-rule bg-surface">
        <div className="flex h-11 items-center gap-2 px-3 sm:px-5">
          <button
            onClick={() => setCorpusOpen(true)}
            aria-label="Open docket"
            className="p-1.5 text-ink transition-colors hover:bg-highlight lg:hidden"
          >
            <Menu className="size-5" />
          </button>
          {!railOpen && (
            <IconButton
              label="Show docket rail"
              onClick={() => setRailOpen(true)}
              className="hidden lg:flex"
            >
              <ListFilter className="size-4" />
            </IconButton>
          )}
          <div className="min-w-0 flex-1 truncate font-mono text-[10px] text-mist">
            {entry.breadcrumb}
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <IconButton label="Command menu (Ctrl K)" onClick={() => setCommandOpen(true)}>
              <Search className="size-4" />
            </IconButton>
            <IconButton label={copied ? "Link copied" : "Copy link"} onClick={copyLink}>
              {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
            </IconButton>
            <IconButton label="Share & cite" onClick={() => setShareOpen(true)}>
              <Share2 className="size-4" />
            </IconButton>
            <IconButton label="Print / Save PDF" onClick={printCase} className="hidden md:flex">
              <Printer className="size-4" />
            </IconButton>
            <IconButton
              label="Download case file (Markdown)"
              onClick={() =>
                downloadFile(`${entry.id}.md`, dossierMarkdown(entry), "text/markdown")
              }
              className="hidden sm:flex"
            >
              <Download className="size-4" />
            </IconButton>
            <IconButton
              label="Download citations (BibTeX)"
              onClick={() =>
                downloadFile(`${entry.id}.bib`, dossierBibTeX(entry), "application/x-bibtex")
              }
              className="hidden md:flex"
            >
              <Braces className="size-4" />
            </IconButton>
            <span aria-hidden className="mx-1 hidden h-4 w-px bg-rule sm:block" />
            <IconButton
              label="Focus mode"
              onClick={() => setFocusMode(true)}
              className="hidden sm:flex"
            >
              <Maximize2 className="size-4" />
            </IconButton>
            <IconButton
              label={inspectorVisible ? "Hide citations" : "Show citations"}
              onClick={() => {
                if (window.innerWidth < 1280) {
                  setInspectorOpen(true);
                } else {
                  setInspectorVisible((value) => !value);
                }
              }}
              active={inspectorVisible}
              className="xl:flex"
            >
              <PanelRight className="size-4" />
            </IconButton>
          </div>
        </div>

        <div className="flex items-start gap-4 px-4 pb-4 sm:px-5">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="border border-rule bg-surface-2 px-1.5 py-0.5 font-mono text-[9px] text-mist">
                {entry.kind === "verse" ? "Text" : "Claim"}
              </span>
              <span className="font-mono text-[10px] text-mist">{docketNo(entry.id)}</span>
              <span className="font-mono text-[10px] text-mist">{collectionLabel}</span>
              {activePath && pathIndex >= 0 && (
                <span className="font-mono text-[10px] text-mist">
                  · {activePath.title} {pathIndex + 1}/{activePath.entryIds.length}
                </span>
              )}
            </div>
            <h1 className="font-display text-[24px] leading-tight font-semibold tracking-[-0.025em] text-balance text-ink sm:text-[30px]">
              {entry.title}
            </h1>
            <p className="mt-1 text-[13px] leading-snug text-steel">{entry.subtitle}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <RulingStamp ruling={ruling} animate className="px-2 py-1 text-[9px]" />
              <span className="font-mono text-[10px] text-mist">
                {citationCount(entry)} citations
              </span>
              <span className="font-mono text-[10px] text-mist">
                {tally("verified")} verified · {tally("disputed")} disputed · {tally("unverified")}{" "}
                unverified
              </span>
              <button
                onClick={() => openInspector("authorities")}
                className="font-mono text-[10px] text-steel underline-offset-2 transition-colors hover:text-ink hover:underline"
              >
                Review citations
              </button>
              <span aria-hidden className="text-mist/60">
                ·
              </span>
              <button
                onClick={() => setShareOpen(true)}
                className="font-mono text-[10px] text-steel underline-offset-2 transition-colors hover:text-ink hover:underline"
              >
                Share & cite
              </button>
            </div>
          </div>

          {activePath && pathIndex >= 0 && (
            <div className="flex shrink-0 items-center gap-0.5 pt-1">
              <IconButton
                label="Previous case in reading path"
                onClick={() => step(-1)}
                disabled={pathIndex === 0}
              >
                <ChevronLeft className="size-4" />
              </IconButton>
              <IconButton
                label="Next case in reading path"
                onClick={() => step(1)}
                disabled={pathIndex === activePath.entryIds.length - 1}
              >
                <ChevronRight className="size-4" />
              </IconButton>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-rule bg-surface px-3 py-1.5 lg:hidden">
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            aria-pressed={tab === item.id}
            className={`min-h-9 flex-1 px-2 text-[12px] font-medium transition-colors ${
              tab === item.id ? "bg-ink text-paper" : "text-steel hover:bg-highlight hover:text-ink"
            }`}
          >
            {item.label}
          </button>
        ))}
        <button
          onClick={() => openInspector("authorities")}
          className="flex min-h-9 items-center gap-1.5 border border-rule px-2.5 text-[12px] text-steel transition-colors hover:border-steel/50 hover:text-ink"
        >
          Citations
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className={`min-w-0 ${tab === "claim" ? "flex w-full" : "hidden"} lg:flex lg:w-[47%]`}>
          <PrimaryPane key={entry.id} entry={entry} onSelectEntry={jumpToEntry} related={related} />
        </div>
        <div className={`min-w-0 flex-1 ${tab === "briefs" ? "flex" : "hidden"} lg:flex`}>
          <RebuttalPane
            entry={entry}
            activePerspective={perspective}
            onPerspectiveChange={setPerspective}
            votes={votes ?? {}}
            onVote={cast}
          />
        </div>
        <div className={`min-w-0 flex-1 ${tab === "chain" ? "flex" : "hidden"} lg:hidden`}>
          <ArgumentMap
            entry={entry}
            focused={focusedNode}
            onFocus={setFocusedNode}
            className="w-full"
          />
        </div>
      </div>
    </>
  ) : (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 bg-canvas px-6 text-center">
      <ListFilter className="size-6 text-mist" />
      <div>
        <p className="font-display text-[18px] font-semibold text-ink">
          No cases match these filters
        </p>
        <p className="mt-1 text-[12.5px] text-mist">Try removing a facet or clearing the search.</p>
      </div>
      <button
        onClick={() => setFilters(defaultFilters)}
        className="border border-ink bg-ink px-3 py-1.5 text-[12px] font-medium text-paper transition-opacity hover:opacity-90"
      >
        Clear all filters
      </button>
      <button
        onClick={() => setCorpusOpen(true)}
        className="font-mono text-[10px] text-mist underline-offset-2 hover:text-ink hover:underline lg:hidden"
      >
        open filters
      </button>
    </div>
  );

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] w-full overflow-hidden bg-canvas">
      {railOpen && <div className="hidden w-[320px] shrink-0 lg:block">{railBody}</div>}

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{center}</main>

      {inspectorVisible && entry && (
        <div className="hidden w-[360px] shrink-0 xl:block">
          <Inspector
            entry={entry}
            tab={inspectorTab}
            onTabChange={setInspectorTab}
            focused={focusedNode}
            onFocus={setFocusedNode}
            related={related}
            onSelectEntry={jumpToEntry}
            onClose={() => setInspectorVisible(false)}
          />
        </div>
      )}

      {corpusOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Close docket"
            onClick={() => setCorpusOpen(false)}
            className="absolute inset-0 bg-ink/30"
          />
          <div className="absolute inset-y-0 left-0 w-[320px] max-w-[88vw] shadow-xl">
            {railBody}
          </div>
        </div>
      )}

      {inspectorOpen && entry && (
        <div className="fixed inset-0 z-40 xl:hidden">
          <button
            aria-label="Close citations"
            onClick={() => setInspectorOpen(false)}
            className="absolute inset-0 bg-ink/30"
          />
          <div className="absolute inset-y-0 right-0 w-[360px] max-w-[92vw] shadow-xl">
            <Inspector
              entry={entry}
              tab={inspectorTab}
              onTabChange={setInspectorTab}
              focused={focusedNode}
              onFocus={setFocusedNode}
              related={related}
              onSelectEntry={jumpToEntry}
              onClose={() => setInspectorOpen(false)}
            />
          </div>
        </div>
      )}

      {focusMode && entry && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-surface">
          <div className="flex h-12 shrink-0 items-center gap-3 border-b border-rule px-4">
            <span className="font-mono text-[10px] text-mist">{docketNo(entry.id)}</span>
            <span className="min-w-0 flex-1 truncate font-display text-[15px] font-semibold text-ink">
              {entry.title}
            </span>
            <div className="flex items-center border border-rule bg-surface-2 p-0.5">
              <button
                onClick={() => setFocusTab("claim")}
                aria-pressed={focusTab === "claim"}
                className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  focusTab === "claim" ? "bg-ink text-paper" : "text-steel hover:text-ink"
                }`}
              >
                Claim
              </button>
              <button
                onClick={() => setFocusTab("briefs")}
                aria-pressed={focusTab === "briefs"}
                className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  focusTab === "briefs" ? "bg-ink text-paper" : "text-steel hover:text-ink"
                }`}
              >
                Rebuttals
              </button>
            </div>
            <button
              onClick={() => setFocusMode(false)}
              className="flex items-center gap-1.5 border border-rule bg-surface px-2.5 py-1.5 text-[11.5px] text-steel transition-colors hover:border-steel/50 hover:text-ink"
            >
              <Minimize2 className="size-3.5" />
              Exit
              <kbd className="ml-1 border border-rule bg-surface-2 px-1 font-mono text-[9px] text-mist">
                esc
              </kbd>
            </button>
          </div>
          <div className="flex min-h-0 flex-1">
            {focusTab === "claim" ? (
              <div className="flex min-w-0 flex-1">
                <PrimaryPane entry={entry} onSelectEntry={jumpToEntry} related={related} />
              </div>
            ) : (
              <div className="flex min-w-0 flex-1">
                <RebuttalPane
                  entry={entry}
                  activePerspective={perspective}
                  onPerspectiveChange={setPerspective}
                  votes={votes ?? {}}
                  onVote={cast}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        entries={entries}
        theme={resolvedTheme}
        onSelectEntry={jumpToEntry}
        onOpenCitations={openCitations}
        onOpenMap={openMap}
        onShare={() => setShareOpen(true)}
        onPrint={printCase}
        onCopyLink={copyLink}
        onToggleTheme={toggleTheme}
        onClearFilters={() => setFilters(defaultFilters)}
        onNavigate={(path) => navigate({ to: path })}
      />

      {entry && (
        <ShareCaseDialog
          entry={entry}
          open={shareOpen}
          onOpenChange={setShareOpen}
          onPrint={printCase}
        />
      )}

      {portalReady &&
        entry &&
        createPortal(
          <div className="print-root hidden print:block">
            <CasePrintView
              entry={entry}
              url={caseShareUrl(entry, typeof window === "undefined" ? "" : window.location.origin)}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}
