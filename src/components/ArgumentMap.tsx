import { Waypoints, X } from "lucide-react";
import type { Entry } from "@/lib/corpus";
import { statusRing } from "./StatusBadge";

const dotClass = (status: "verified" | "disputed" | "unverified") =>
  status === "verified" ? "bg-verify" : status === "disputed" ? "bg-dispute" : "bg-unv";

const statusLabel = (status: "verified" | "disputed" | "unverified") =>
  status === "verified" ? "verified" : status === "disputed" ? "disputed" : "unverified";

export function ArgumentMap({
  entry,
  focused,
  onFocus,
  className = "",
  hideHeader = false,
}: {
  entry: Entry;
  focused: string | null;
  onFocus: (id: string | null) => void;
  className?: string;
  hideHeader?: boolean;
}) {
  const { nodes, edges } = entry.map;
  const at = (id: string) => nodes.find((node) => node.id === id);
  const focusedNode = focused ? nodes.find((node) => node.id === focused) : undefined;

  return (
    <aside
      aria-label="Argument map"
      className={`flex h-full min-h-0 flex-col bg-surface ${className}`}
    >
      {!hideHeader && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-rule px-4 py-2.5">
          <span className="font-display text-[13px] font-semibold text-ink">Argument map</span>
          <span className="font-mono text-[9.5px] text-mist">{nodes.length} nodes</span>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center border border-dashed border-rule px-4 py-10 text-center">
            <Waypoints className="size-5 text-mist" />
            <p className="mt-2 font-display text-[14px] font-semibold text-ink">
              No argument map yet
            </p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-mist">
              Add claims to this case in the editorial desk to build its argument map.
            </p>
          </div>
        ) : (
          <>
            <div className="chain-grid relative h-[300px] overflow-hidden border border-rule bg-surface-2/40 sm:h-[320px]">
              <svg
                className="absolute inset-0 size-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden
              >
                {edges.map(([from, to]) => {
                  const start = at(from);
                  const end = at(to);
                  if (!start || !end) return null;
                  const active = focused === from || focused === to;
                  return (
                    <line
                      key={`${from}-${to}`}
                      x1={start.x}
                      y1={start.y + 4}
                      x2={end.x}
                      y2={end.y}
                      stroke="currentColor"
                      className={active ? "text-brass/80" : "text-steel/30"}
                      strokeWidth={active ? 0.8 : 0.5}
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}
              </svg>

              {nodes.map((node) => {
                const active = focused === node.id;
                const x = Math.min(90, Math.max(10, node.x));
                const y = Math.min(88, Math.max(10, node.y));
                return (
                  <button
                    key={node.id}
                    onClick={() => onFocus(active ? null : node.id)}
                    onMouseEnter={() => onFocus(node.id)}
                    aria-pressed={active}
                    title={node.label}
                    style={{ left: `${x}%`, top: `${y}%` }}
                    className={`absolute flex max-w-[9rem] -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 border px-2 py-1 text-[10px] leading-tight whitespace-normal shadow-sm transition-all ${
                      node.root
                        ? "border-ink bg-ink font-medium text-paper"
                        : `border-rule bg-surface text-steel ring-1 ${statusRing(node.status)}`
                    } ${active ? "z-10 scale-105 ring-2 shadow-md" : ""}`}
                  >
                    <span
                      aria-hidden
                      className={`size-1.5 shrink-0 rounded-full ${
                        node.root ? "bg-paper/80" : dotClass(node.status)
                      }`}
                    />
                    <span className="text-left">{node.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
              {(["verified", "disputed", "unverified"] as const).map((status) => (
                <span key={status} className="flex items-center gap-1.5">
                  <span aria-hidden className={`size-1.5 rounded-full ${dotClass(status)}`} />
                  <span className="font-mono text-[9.5px] text-mist">{statusLabel(status)}</span>
                </span>
              ))}
            </div>

            {focusedNode ? (
              <div className="mt-3 border border-rule bg-surface p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-display text-[12px] font-semibold text-ink">
                      {focusedNode.label}
                    </span>
                    <p className="mt-0.5 font-mono text-[9px] text-mist">
                      {focusedNode.root ? "root claim · " : ""}
                      {statusLabel(focusedNode.status)}
                    </p>
                  </div>
                  <button
                    onClick={() => onFocus(null)}
                    aria-label="Clear focused node"
                    className="p-1 text-mist transition-colors hover:bg-highlight hover:text-ink"
                  >
                    <X className="size-3" />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {edges
                    .filter(([from, to]) => from === focused || to === focused)
                    .map(([from, to]) => {
                      const other = from === focused ? to : from;
                      const node = at(other);
                      if (!node) return null;
                      return (
                        <button
                          key={other}
                          onClick={() => onFocus(other)}
                          className="border border-rule bg-surface px-2 py-0.5 font-mono text-[9.5px] text-steel transition-colors hover:border-steel/50 hover:text-ink"
                        >
                          {node.label}
                        </button>
                      );
                    })}
                </div>
              </div>
            ) : (
              <p className="mt-3 font-mono text-[9.5px] leading-relaxed text-mist">
                Nodes are claims; edges are counter relations. Select a node to trace its links.
              </p>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
