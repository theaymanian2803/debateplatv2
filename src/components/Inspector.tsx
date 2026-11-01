import { BookMarked, Info, Waypoints, X } from "lucide-react";
import { allCitations, citationCount, type Entry } from "@/lib/corpus";
import { rulingFor } from "@/lib/rulings";
import { ArgumentMap } from "./ArgumentMap";
import { CitationLedger } from "./CitationLedger";
import { RulingStamp, StatusBadge } from "./StatusBadge";

export type InspectorTab = "authorities" | "chain" | "record";

const tabs: { id: InspectorTab; label: string; icon: typeof Waypoints }[] = [
  { id: "authorities", label: "Citations", icon: BookMarked },
  { id: "chain", label: "Map", icon: Waypoints },
  { id: "record", label: "Record", icon: Info },
];

export function Inspector({
  entry,
  tab,
  onTabChange,
  focused,
  onFocus,
  onClose,
  related = [],
  onSelectEntry,
  className = "",
}: {
  entry: Entry;
  tab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
  focused: string | null;
  onFocus: (id: string | null) => void;
  onClose?: () => void;
  related?: { id: string; title: string }[];
  onSelectEntry?: (id: string) => void;
  className?: string;
}) {
  const citations = allCitations(entry);
  const unique = new Set(citations.map((citation) => citation.detail)).size;
  const tally = (status: "verified" | "disputed" | "unverified") =>
    citations.filter((citation) => citation.status === status).length;

  const rows = [
    { label: "Case type", value: entry.kind === "verse" ? "Text" : "Claim" },
    { label: "Collection", value: entry.collection },
    { label: "Reference", value: entry.breadcrumb.split("/").pop() ?? "—" },
    { label: "Commentary", value: String(entry.sections.length) },
    { label: "Rebuttals", value: String(entry.rebuttals.length) },
    { label: "Map nodes", value: String(entry.map.nodes.length) },
    { label: "Translations", value: String(entry.translations.length) },
    ...(entry.scripture
      ? [
          {
            label: "Source text",
            value: `${entry.scripture.translationLabel} · ${entry.scripture.reference}`,
          },
        ]
      : []),
  ];

  return (
    <aside
      aria-label="Case inspector"
      className={`flex h-full min-h-0 flex-col border-l border-rule bg-surface ${className}`}
    >
      <div className="flex shrink-0 items-center border-b border-rule pr-1.5">
        <div role="tablist" aria-label="Inspector views" className="flex min-w-0 flex-1">
          {tabs.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={active}
                onClick={() => onTabChange(id)}
                className={`flex min-h-10 flex-1 items-center justify-center gap-1.5 border-b-2 px-2 text-[11px] font-medium transition-colors ${
                  active
                    ? "border-b-brass text-ink"
                    : "border-transparent text-mist hover:bg-highlight hover:text-steel"
                }`}
              >
                <Icon className="size-3.5" />
                {label}
                {id === "authorities" && (
                  <span className="border border-rule bg-surface-2 px-1 text-[9px] tabular-nums">
                    {unique}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close inspector"
            className="ml-1 p-1.5 text-mist transition-colors hover:bg-highlight hover:text-ink"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {tab === "chain" && (
        <div className="min-h-0 flex-1 overflow-hidden">
          <ArgumentMap entry={entry} focused={focused} onFocus={onFocus} hideHeader />
        </div>
      )}

      {tab === "authorities" && <CitationLedger entry={entry} />}

      {tab === "record" && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="border-b border-rule p-4">
            <div className="font-mono text-[9px] text-mist">Status</div>
            <div className="mt-2">
              <RulingStamp ruling={rulingFor(entry)} animate />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <StatusBadge status="verified" label={`${tally("verified")} verified`} />
              <StatusBadge status="disputed" label={`${tally("disputed")} disputed`} />
              <StatusBadge status="unverified" label={`${tally("unverified")} unverified`} />
            </div>
            <p className="mt-2 font-mono text-[9px] leading-relaxed text-mist">
              {citationCount(entry)} citation references across commentary and rebuttals.
            </p>
          </div>

          <dl className="divide-y divide-rule">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex items-baseline justify-between gap-3 px-4 py-2.5"
              >
                <dt className="font-mono text-[9px] text-mist">{row.label}</dt>
                <dd className="truncate text-right text-[11.5px] capitalize text-steel">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>

          {related.length > 0 && (
            <div className="border-t border-rule p-4">
              <div className="font-mono text-[9px] text-mist">Related cases</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {related.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onSelectEntry?.(item.id)}
                    className="border border-rule bg-surface px-2 py-0.5 font-mono text-[9.5px] text-steel transition-colors hover:border-steel/50 hover:text-ink"
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-rule p-4">
            <div className="font-mono text-[9px] text-mist">Full reference</div>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-steel">{entry.breadcrumb}</p>
          </div>
        </div>
      )}
    </aside>
  );
}
