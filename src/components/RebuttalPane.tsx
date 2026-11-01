import type { Entry } from "@/lib/corpus";
import { containsArabic } from "@/lib/scripture";
import { ArrowDown, ArrowUp, FileText } from "lucide-react";
import { StatusBadge, StatusDot } from "./StatusBadge";

export type VoteTallyUI = { up: number; down: number; mine: number };

export function RebuttalPane({
  entry,
  activePerspective,
  onPerspectiveChange,
  votes,
  onVote,
}: {
  entry: Entry;
  activePerspective: string | null;
  onPerspectiveChange: (perspective: string | null) => void;
  votes?: Record<string, VoteTallyUI>;
  onVote?: (rebuttalId: string, direction: -1 | 0 | 1) => void;
}) {
  const perspectives = Array.from(new Set(entry.rebuttals.map((rebuttal) => rebuttal.perspective)));
  const shown = activePerspective
    ? entry.rebuttals.filter((rebuttal) => rebuttal.perspective === activePerspective)
    : entry.rebuttals;
  const counts = new Map(
    perspectives.map((perspective) => [
      perspective,
      entry.rebuttals.filter((rebuttal) => rebuttal.perspective === perspective).length,
    ]),
  );

  return (
    <section
      aria-label="Rebuttals by perspective"
      className="flex min-h-0 flex-1 flex-col overflow-hidden bg-canvas"
    >
      <div className="shrink-0 border-b border-rule bg-surface px-4 py-2.5 sm:px-5">
        <div className="flex items-center gap-2">
          <span className="font-display text-[13px] font-semibold text-ink">Rebuttals</span>
          <span className="border border-rule bg-surface-2 px-1.5 py-0.5 font-mono text-[9.5px] tabular-nums text-steel">
            {entry.rebuttals.length}
          </span>
        </div>
        {perspectives.length > 0 && (
          <div
            className="mt-2 flex flex-wrap gap-1"
            role="group"
            aria-label="Filter rebuttals by perspective"
          >
            <button
              onClick={() => onPerspectiveChange(null)}
              aria-pressed={activePerspective === null}
              className={`border px-2 py-1 font-mono text-[10px] transition-colors ${
                activePerspective === null
                  ? "border-ink bg-ink text-paper"
                  : "border-rule bg-surface text-steel hover:border-steel/50 hover:text-ink"
              }`}
            >
              All <span className="opacity-60">{entry.rebuttals.length}</span>
            </button>
            {perspectives.map((perspective) => (
              <button
                key={perspective}
                onClick={() =>
                  onPerspectiveChange(activePerspective === perspective ? null : perspective)
                }
                aria-pressed={activePerspective === perspective}
                className={`border px-2 py-1 font-mono text-[10px] transition-colors ${
                  activePerspective === perspective
                    ? "border-ink bg-ink text-paper"
                    : "border-rule bg-surface text-steel hover:border-steel/50 hover:text-ink"
                }`}
              >
                <span className="max-w-[14rem] truncate">{perspective}</span>{" "}
                <span className="opacity-60">{counts.get(perspective)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {shown.length === 0 && (
          <div className="m-4 flex flex-col items-center justify-center border border-dashed border-rule px-6 py-12 text-center">
            <FileText className="size-6 text-mist" />
            <p className="mt-2 font-display text-[15px] font-semibold text-ink">
              No rebuttals recorded
            </p>
            <p className="mt-1 max-w-xs text-[12px] leading-relaxed text-mist">
              Arguments from this perspective have not been entered in the editorial desk.
            </p>
          </div>
        )}

        {shown.map((rebuttal) => {
          const tally = votes?.[rebuttal.id] ?? { up: 0, down: 0, mine: 0 };
          return (
            <article
              key={rebuttal.id}
              className="border-b border-rule bg-surface px-4 py-4 transition-colors hover:bg-surface-2/40 sm:px-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[9px] text-mist">Perspective</span>
                    <span className="font-display text-[12px] font-semibold text-ink">
                      {rebuttal.perspective}
                    </span>
                    <StatusBadge status={rebuttal.status} />
                  </div>
                </div>
                <div className="flex shrink-0 items-center border border-rule bg-surface-2 p-0.5">
                  <button
                    onClick={() => onVote?.(rebuttal.id, tally.mine === 1 ? 0 : 1)}
                    aria-label="Concur with this rebuttal"
                    aria-pressed={tally.mine === 1}
                    className={`flex items-center gap-1 px-1.5 py-1 transition-colors ${
                      tally.mine === 1
                        ? "bg-verify/15 text-verify"
                        : "text-mist hover:bg-highlight hover:text-ink"
                    }`}
                  >
                    <ArrowUp className="size-3" />
                    <span className="font-mono text-[10px] tabular-nums">{tally.up}</span>
                  </button>
                  <span aria-hidden className="h-3 w-px bg-rule" />
                  <button
                    onClick={() => onVote?.(rebuttal.id, tally.mine === -1 ? 0 : -1)}
                    aria-label="Dissent from this rebuttal"
                    aria-pressed={tally.mine === -1}
                    className={`flex items-center gap-1 px-1.5 py-1 transition-colors ${
                      tally.mine === -1
                        ? "bg-dispute/15 text-dispute"
                        : "text-mist hover:bg-highlight hover:text-ink"
                    }`}
                  >
                    <ArrowDown className="size-3" />
                    <span className="font-mono text-[10px] tabular-nums">{tally.down}</span>
                  </button>
                </div>
              </div>

              <p
                dir="auto"
                className={`mt-2 font-serif text-[15px] leading-[1.65] text-pretty text-ink ${
                  containsArabic(rebuttal.claim) ? "font-arabic text-[18px] leading-[1.9]" : ""
                }`}
              >
                {rebuttal.qualifier ? (
                  <em className="mr-1 text-mist">{rebuttal.qualifier}</em>
                ) : null}
                {rebuttal.claim}
              </p>

              {(rebuttal.warrant || rebuttal.backing) && (
                <dl className="mt-3 grid gap-2 border-t border-rule pt-2 sm:grid-cols-[4.5rem_1fr]">
                  {rebuttal.warrant && (
                    <>
                      <dt className="font-mono text-[9px] text-mist">Ground</dt>
                      <dd
                        dir="auto"
                        className={`text-[12px] leading-relaxed text-steel ${
                          containsArabic(rebuttal.warrant)
                            ? "font-arabic text-[15px] leading-[1.9]"
                            : ""
                        }`}
                      >
                        {rebuttal.warrant}
                      </dd>
                    </>
                  )}
                  {rebuttal.backing && (
                    <>
                      <dt className="font-mono text-[9px] text-mist">Source</dt>
                      <dd
                        dir="auto"
                        className={`text-[12px] leading-relaxed text-steel ${
                          containsArabic(rebuttal.backing)
                            ? "font-arabic text-[15px] leading-[1.9]"
                            : ""
                        }`}
                      >
                        {rebuttal.backing}
                      </dd>
                    </>
                  )}
                </dl>
              )}

              {rebuttal.counter && (
                <div className="mt-3 border-t border-rule pt-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] text-mist">
                      Reply · {rebuttal.counter.author}
                    </span>
                    <StatusBadge status={rebuttal.counter.status} className="ml-auto" />
                  </div>
                  <p
                    dir="auto"
                    className={`mt-1 text-[12.5px] leading-relaxed text-steel ${
                      containsArabic(rebuttal.counter.body)
                        ? "font-arabic text-[15px] leading-[1.9]"
                        : ""
                    }`}
                  >
                    {rebuttal.counter.body}
                  </p>
                </div>
              )}

              {rebuttal.citations.length > 0 && (
                <div className="mt-3 border-t border-rule pt-2">
                  <div className="font-mono text-[9px] text-mist">Citations</div>
                  <div className="mt-1 space-y-1">
                    {rebuttal.citations.map((citation) => (
                      <div key={citation.id} className="flex items-start gap-2">
                        <span className="mt-1">
                          <StatusDot status={citation.status} />
                        </span>
                        <p className="min-w-0 font-mono text-[9.5px] leading-relaxed text-mist">
                          <span className="text-steel">{citation.detail}</span>
                          <span aria-hidden> · </span>
                          {citation.archive}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
