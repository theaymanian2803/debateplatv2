import { useEffect, useRef } from "react";
import { Check, ChevronDown, ListFilter, RotateCcw, Search, Waypoints, X } from "lucide-react";
import { citationCount, type Entry } from "@/lib/corpus";
import { rulingFor, rulingLabel } from "@/lib/rulings";
import { docketNo } from "@/lib/docket";
import {
  type CitationHealth,
  type Facets,
  type Filters,
  type SortKey,
  toggleValue,
} from "@/lib/filters";

export type ReadingPathUI = {
  id: string;
  title: string;
  description: string;
  entryIds: string[];
};

const statusLabel: Record<"verified" | "disputed" | "unverified", string> = {
  verified: "Verified",
  disputed: "Disputed",
  unverified: "Unverified",
};

const healthLabel: Record<CitationHealth, string> = {
  "fully-verified": "Fully verified",
  "has-disputed": "Has disputed",
  "has-unverified": "Has unverified",
  "no-citations": "No citations",
};

const sortLabel: Record<SortKey, string> = {
  relevance: "Curated order",
  title: "Title A–Z",
  citations: "Most citations",
  status: "Needs review",
};

const kindLabel = (kind: Entry["kind"]) => (kind === "verse" ? "Texts" : "Claims");

const rulingDot = (entry: Entry) =>
  rulingFor(entry) === "sustained"
    ? "bg-verify"
    : rulingFor(entry) === "contested"
      ? "bg-dispute"
      : rulingFor(entry) === "unresolved"
        ? "bg-unv"
        : "bg-steel";

function FacetSection({
  label,
  hint,
  children,
  defaultOpen = false,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="group border-b border-rule last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 transition-colors hover:bg-highlight [&::-webkit-details-marker]:hidden">
        <span className="font-sidebar text-[10.5px] font-semibold tracking-[-0.02em] text-steel">
          {label}
        </span>
        {hint && <span className="font-mono text-[9.5px] text-mist">{hint}</span>}
        <ChevronDown className="ml-auto size-3.5 text-mist transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-0.5 px-2 pb-3">{children}</div>
    </details>
  );
}

function CheckRow({
  label,
  count,
  checked,
  onChange,
  dot,
}: {
  label: string;
  count: number;
  checked: boolean;
  onChange: () => void;
  dot?: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2.5 px-2 py-1.5 transition-colors hover:bg-highlight ${
        count === 0 && !checked ? "opacity-45" : ""
      }`}
    >
      <span
        aria-hidden
        className={`flex size-3.5 shrink-0 items-center justify-center border transition-colors ${
          checked ? "border-ink bg-ink text-paper" : "border-rule bg-surface"
        }`}
      >
        {checked && <Check className="size-2.5" strokeWidth={3} />}
      </span>
      {dot && <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${dot}`} />}
      <span className="min-w-0 flex-1 truncate text-[12px] text-steel">{label}</span>
      <span className="font-mono text-[9.5px] tabular-nums text-mist">{count}</span>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
    </label>
  );
}

function ResultItem({
  entry,
  selected,
  onSelect,
}: {
  entry: Entry;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      aria-label={`${entry.title} — ${rulingLabel(rulingFor(entry))}`}
      className={`group flex w-full items-start gap-2.5 px-2.5 py-2 text-left transition-colors ${
        selected ? "bg-ink text-paper" : "hover:bg-highlight"
      }`}
    >
      <span
        className={`mt-0.5 shrink-0 font-mono text-[8.5px] ${
          selected ? "text-paper/55" : "text-mist"
        }`}
      >
        {docketNo(entry.id).replace("No. ", "")}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block truncate font-sidebar text-[11px] leading-snug font-semibold tracking-[-0.02em] ${
            selected ? "text-paper" : "text-ink"
          }`}
        >
          {entry.title}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5">
          <span
            aria-hidden
            className={`size-1.5 shrink-0 rounded-full ${
              selected ? "bg-paper/70" : rulingDot(entry)
            }`}
          />
          <span className={`truncate text-[10px] ${selected ? "text-paper/65" : "text-mist"}`}>
            {rulingLabel(rulingFor(entry))} · {citationCount(entry)} citations
          </span>
        </span>
      </span>
    </button>
  );
}

export function DocketRail({
  entries,
  results,
  collections,
  selectedId,
  onSelect,
  filters,
  onFiltersChange,
  facets,
  paths = [],
  activePath,
  onPathChange,
  onClear,
  onClose,
  className = "",
}: {
  entries: Entry[];
  results: Entry[];
  collections: { id: string; label: string }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  filters: Filters;
  onFiltersChange: (next: Filters) => void;
  facets: Facets;
  paths?: ReadingPathUI[];
  activePath?: string | null;
  onPathChange?: (id: string | null) => void;
  onClear: () => void;
  onClose?: () => void;
  className?: string;
}) {
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;
      if (event.key === "/" && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onFiltersChange({ ...filters, [key]: value });

  const activeKind = new Set(filters.kinds);
  const activeCollection = new Set(filters.collections);
  const activeStatus = new Set(filters.statuses);
  const activePerspective = new Set(filters.perspectives);
  const activeHealth = new Set(filters.health);
  const labelFor = (id: string) =>
    collections.find((collection) => collection.id === id)?.label ?? id;

  const chips: { key: string; label: string; remove: () => void }[] = [];
  if (filters.query.trim())
    chips.push({
      key: "query",
      label: `“${filters.query.trim()}”`,
      remove: () => set("query", ""),
    });
  for (const value of filters.kinds)
    chips.push({
      key: `kind-${value}`,
      label: kindLabel(value),
      remove: () =>
        set(
          "kinds",
          filters.kinds.filter((kind) => kind !== value),
        ),
    });
  for (const value of filters.collections)
    chips.push({
      key: `collection-${value}`,
      label: labelFor(value),
      remove: () =>
        set(
          "collections",
          filters.collections.filter((id) => id !== value),
        ),
    });
  for (const value of filters.statuses)
    chips.push({
      key: `status-${value}`,
      label: statusLabel[value],
      remove: () =>
        set(
          "statuses",
          filters.statuses.filter((status) => status !== value),
        ),
    });
  for (const value of filters.health)
    chips.push({
      key: `health-${value}`,
      label: healthLabel[value],
      remove: () =>
        set(
          "health",
          filters.health.filter((health) => health !== value),
        ),
    });
  for (const value of filters.perspectives)
    chips.push({
      key: `perspective-${value}`,
      label: value,
      remove: () =>
        set(
          "perspectives",
          filters.perspectives.filter((perspective) => perspective !== value),
        ),
    });
  if (filters.withTranslations)
    chips.push({
      key: "translations",
      label: "Has translations",
      remove: () => set("withTranslations", false),
    });
  if (filters.sort !== "relevance")
    chips.push({
      key: "sort",
      label: sortLabel[filters.sort],
      remove: () => set("sort", "relevance"),
    });

  return (
    <aside
      className={`flex h-full w-full flex-col border-r border-rule bg-surface ${className}`}
      aria-label="Case docket filters"
    >
      <div className="flex items-center gap-2 border-b border-rule px-4 py-3">
        <ListFilter className="size-3.5 text-mist" />
        <span className="font-sidebar text-[14px] font-bold tracking-[-0.02em] text-ink">
          Case docket
        </span>
        <span className="border border-rule bg-surface-2 px-1.5 py-0.5 font-mono text-[9.5px] tabular-nums text-steel">
          {results.length}/{entries.length}
        </span>
        {chips.length > 0 && (
          <button
            onClick={onClear}
            className="ml-auto flex items-center gap-1 font-mono text-[9.5px] text-mist transition-colors hover:text-ink"
          >
            <RotateCcw className="size-3" />
            Reset
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close docket"
            className={`p-1.5 text-steel transition-colors hover:bg-highlight hover:text-ink lg:hidden ${
              chips.length > 0 ? "" : "ml-auto"
            }`}
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="border-b border-rule p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-mist" />
          <input
            ref={searchRef}
            value={filters.query}
            onChange={(event) => set("query", event.target.value)}
            placeholder="Search the docket"
            aria-label="Search the docket"
            className="w-full border border-rule bg-surface-2 py-2 pr-12 pl-8 text-[12.5px] text-ink outline-none transition-colors placeholder:text-mist focus:border-steel/50 focus:bg-surface"
          />
          <kbd className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 border border-rule bg-surface px-1.5 py-0.5 font-mono text-[9px] text-mist">
            /
          </kbd>
        </div>

        {activePath && (
          <div className="mt-2 flex items-center gap-1.5 border border-brass/40 bg-brass/10 px-2 py-1.5">
            <Waypoints className="size-3 text-brass" />
            <span className="min-w-0 flex-1 truncate text-[11px] text-steel">
              Reading path: {paths.find((path) => path.id === activePath)?.title}
            </span>
            <button
              onClick={() => onPathChange?.(null)}
              aria-label="Leave reading path"
              className="p-0.5 text-mist hover:text-ink"
            >
              <X className="size-3" />
            </button>
          </div>
        )}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1 border-b border-rule px-3 py-2">
          {chips.map((chip) => (
            <button
              key={chip.key}
              onClick={chip.remove}
              className="group flex max-w-full items-center gap-1 border border-rule bg-surface-2 px-2 py-0.5 text-[10.5px] text-steel transition-colors hover:border-steel/50 hover:text-ink"
            >
              <span className="truncate">{chip.label}</span>
              <X className="size-2.5 text-mist group-hover:text-ink" />
            </button>
          ))}
          <button
            onClick={onClear}
            className="px-2 py-0.5 font-mono text-[9.5px] text-mist underline-offset-2 hover:text-ink hover:underline"
          >
            clear all
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {paths.length > 0 && (
          <FacetSection label="Reading paths" hint={`${paths.length}`} defaultOpen={false}>
            {paths.map((path) => (
              <button
                key={path.id}
                onClick={() => onPathChange?.(activePath === path.id ? null : path.id)}
                className={`flex w-full items-center gap-2.5 px-2 py-1.5 text-left text-[12px] transition-colors ${
                  activePath === path.id
                    ? "bg-ink text-paper"
                    : "text-steel hover:bg-highlight hover:text-ink"
                }`}
              >
                <span
                  aria-hidden
                  className={`size-1.5 shrink-0 rounded-full ${
                    activePath === path.id ? "bg-paper/70" : "bg-brass"
                  }`}
                />
                <span className="min-w-0 flex-1 truncate">{path.title}</span>
                <span
                  className={`font-mono text-[9.5px] ${
                    activePath === path.id ? "text-paper/60" : "text-mist"
                  }`}
                >
                  {path.entryIds.length}
                </span>
              </button>
            ))}
          </FacetSection>
        )}

        <FacetSection label="Filters" hint={`${chips.length}`} defaultOpen>
          <div className="px-2 pt-1 pb-2">
            <label className="font-sidebar text-[9.5px] font-semibold tracking-[-0.02em] text-mist">
              Sort
            </label>
            <select
              value={filters.sort}
              onChange={(event) => set("sort", event.target.value as SortKey)}
              className="mt-1 w-full border border-rule bg-surface-2 px-2 py-1.5 text-[12px] text-ink outline-none focus:border-steel/50"
            >
              {(Object.keys(sortLabel) as SortKey[]).map((key) => (
                <option key={key} value={key}>
                  {sortLabel[key]}
                </option>
              ))}
            </select>
          </div>

          <div className="px-2 pt-2 pb-1 font-sidebar text-[9.5px] font-semibold tracking-[-0.02em] text-mist">
            Collection
          </div>
          {collections.map((collection) => (
            <CheckRow
              key={collection.id}
              label={collection.label}
              count={facets.collections.find((facet) => facet.value === collection.id)?.count ?? 0}
              checked={activeCollection.has(collection.id)}
              onChange={() => set("collections", toggleValue(filters.collections, collection.id))}
            />
          ))}

          <div className="px-2 pt-3 pb-1 font-sidebar text-[9.5px] font-semibold tracking-[-0.02em] text-mist">
            Type
          </div>
          {(["verse", "premise"] as const).map((kind) => (
            <CheckRow
              key={kind}
              label={kindLabel(kind)}
              count={facets.kinds.find((facet) => facet.value === kind)?.count ?? 0}
              checked={activeKind.has(kind)}
              onChange={() => set("kinds", toggleValue(filters.kinds, kind))}
            />
          ))}

          <div className="px-2 pt-3 pb-1 font-sidebar text-[9.5px] font-semibold tracking-[-0.02em] text-mist">
            Status
          </div>
          {(["verified", "disputed", "unverified"] as const).map((status) => (
            <CheckRow
              key={status}
              label={statusLabel[status]}
              count={facets.statuses.find((facet) => facet.value === status)?.count ?? 0}
              checked={activeStatus.has(status)}
              onChange={() => set("statuses", toggleValue(filters.statuses, status))}
              dot={
                status === "verified"
                  ? "bg-verify"
                  : status === "disputed"
                    ? "bg-dispute"
                    : "bg-unv"
              }
            />
          ))}

          <div className="px-2 pt-3 pb-1 font-sidebar text-[9.5px] font-semibold tracking-[-0.02em] text-mist">
            Citation health
          </div>
          {(Object.keys(healthLabel) as CitationHealth[]).map((health) => (
            <CheckRow
              key={health}
              label={healthLabel[health]}
              count={facets.health.find((facet) => facet.value === health)?.count ?? 0}
              checked={activeHealth.has(health)}
              onChange={() => set("health", toggleValue(filters.health, health))}
            />
          ))}

          <div className="px-2 pt-3 pb-1 font-sidebar text-[9.5px] font-semibold tracking-[-0.02em] text-mist">
            Perspective
          </div>
          {facets.perspectives.length === 0 && (
            <p className="px-2 py-1 text-[11.5px] text-mist">No perspectives match.</p>
          )}
          {facets.perspectives.map((perspective) => (
            <CheckRow
              key={perspective.value}
              label={perspective.value}
              count={perspective.count}
              checked={activePerspective.has(perspective.value)}
              onChange={() =>
                set("perspectives", toggleValue(filters.perspectives, perspective.value))
              }
            />
          ))}

          <div className="px-2 pt-3 pb-1 font-sidebar text-[9.5px] font-semibold tracking-[-0.02em] text-mist">
            Other
          </div>
          <CheckRow
            label="Has alternate translations"
            count={facets.translations}
            checked={filters.withTranslations}
            onChange={() => set("withTranslations", !filters.withTranslations)}
          />
        </FacetSection>

        <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
          <span className="font-sidebar text-[10.5px] font-semibold tracking-[-0.02em] text-steel">
            Cases
          </span>
          <span className="font-mono text-[9.5px] tabular-nums text-mist">{results.length}</span>
        </div>
        <div className="space-y-0.5 px-2 pb-4">
          {results.length === 0 ? (
            <div className="mx-2 border border-dashed border-rule px-3 py-5 text-center">
              <p className="text-[12px] text-mist">No cases match these filters.</p>
              <button
                onClick={onClear}
                className="mt-2 border border-ink bg-ink px-2.5 py-1 text-[11px] font-medium text-paper"
              >
                Clear filters
              </button>
            </div>
          ) : (
            results.map((entry) => (
              <ResultItem
                key={entry.id}
                entry={entry}
                selected={entry.id === selectedId}
                onSelect={() => onSelect(entry.id)}
              />
            ))
          )}
        </div>
      </div>

      <div className="border-t border-rule px-4 py-2.5">
        <p className="font-mono text-[9px] leading-relaxed text-mist">
          <kbd className="border border-rule bg-surface-2 px-1">/</kbd> search ·{" "}
          <kbd className="border border-rule bg-surface-2 px-1">f</kbd> focus
        </p>
      </div>
    </aside>
  );
}
