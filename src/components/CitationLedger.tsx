import { useState } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { allCitations, type Entry, type Verification } from "@/lib/corpus";
import { aiSuggestSource, createSourceRequest } from "@/lib/corpus-api";
import { StatusBadge } from "./StatusBadge";

const control =
  "w-full border border-rule bg-surface-2 px-2.5 py-1.5 text-[12px] text-ink outline-none transition-colors placeholder:text-mist focus:border-steel/50 focus:bg-surface";

const statusLabel: Record<Verification, string> = {
  verified: "Verified",
  disputed: "Disputed",
  unverified: "Unverified",
};

export function CitationLedger({ entry }: { entry: Entry; onClose?: () => void }) {
  const citations = allCitations(entry);
  const unique = Array.from(
    new Map(citations.map((citation) => [citation.detail, citation])).values(),
  );
  const tally = (status: Verification) =>
    unique.filter((citation) => citation.status === status).length;

  const [filter, setFilter] = useState<"all" | Verification>("all");
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [proposal, setProposal] = useState("");
  const [archive, setArchive] = useState("");
  const [note, setNote] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  const shown = filter === "all" ? unique : unique.filter((citation) => citation.status === filter);

  const reset = () => {
    setOpenFor(null);
    setProposal("");
    setArchive("");
    setNote("");
    setAiHint(null);
  };

  const suggest = async (detail: string) => {
    setAiBusy(true);
    setAiHint(null);
    const result = await aiSuggestSource({ data: detail });
    setAiBusy(false);
    if (result.available && result.suggestion) {
      setAiHint(result.suggestion);
      setArchive(result.suggestion);
    } else if (!result.available) {
      setAiHint("AI verification is not configured on this deployment.");
    } else {
      setAiHint("The model returned no archive suggestion.");
    }
  };

  const submit = async (detail: string) => {
    if (!proposal.trim()) return;
    await createSourceRequest({
      data: { entryId: entry.id, target: detail, proposal, archive, note },
    });
    setSent(detail);
    setOpenFor(null);
    reset();
  };

  const filters: { value: "all" | Verification; label: string; count: number }[] = [
    { value: "all", label: "All", count: unique.length },
    { value: "verified", label: statusLabel.verified, count: tally("verified") },
    { value: "disputed", label: statusLabel.disputed, count: tally("disputed") },
    { value: "unverified", label: statusLabel.unverified, count: tally("unverified") },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-rule px-3 py-2.5">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filter citations by status">
          {filters.map((item) => (
            <button
              key={item.value}
              onClick={() => setFilter(item.value)}
              aria-pressed={filter === item.value}
              className={`border px-2 py-1 font-mono text-[10px] transition-colors ${
                filter === item.value
                  ? "border-ink bg-ink text-paper"
                  : "border-rule bg-surface text-steel hover:border-steel/50 hover:text-ink"
              }`}
            >
              {item.label} <span className="opacity-60">{item.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {shown.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <CheckCircle2 className="mx-auto size-5 text-mist" />
            <p className="mt-2 text-[12px] text-mist">
              No citations with this status for this case.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-rule">
            {shown.map((citation) => (
              <li key={citation.detail} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0 font-mono text-[9.5px] text-steel">
                    {citation.label}
                  </span>
                  <StatusBadge status={citation.status} />
                </div>
                <p className="mt-1 text-[11.5px] leading-relaxed text-steel">{citation.detail}</p>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate font-mono text-[9px] text-mist">
                    {citation.archive}
                  </p>
                  {sent === citation.detail ? (
                    <span className="shrink-0 font-mono text-[9.5px] text-verify">
                      request sent
                    </span>
                  ) : openFor === citation.detail ? null : (
                    <button
                      onClick={() => {
                        reset();
                        setOpenFor(citation.detail);
                      }}
                      className="shrink-0 font-mono text-[9.5px] text-steel underline-offset-2 transition-colors hover:text-ink hover:underline"
                    >
                      {citation.status === "verified" ? "Add note" : "Request source"}
                    </button>
                  )}
                </div>

                {openFor === citation.detail && (
                  <div className="mt-2 space-y-2 border border-rule bg-surface-2/50 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-[11px] font-semibold text-ink">
                        Propose a citation for “{citation.label}”
                      </span>
                      <button
                        onClick={reset}
                        className="font-mono text-[9.5px] text-mist hover:text-ink"
                      >
                        cancel
                      </button>
                    </div>
                    <textarea
                      value={proposal}
                      onChange={(event) => setProposal(event.target.value)}
                      placeholder="Full citation you can verify, e.g. Author, Title. Publisher, year, pages."
                      rows={3}
                      className={`${control} resize-y leading-relaxed`}
                    />
                    <div className="flex gap-1.5">
                      <input
                        value={archive}
                        onChange={(event) => setArchive(event.target.value)}
                        placeholder="Archive or shelfmark"
                        className={control}
                      />
                      <button
                        onClick={() => suggest(citation.detail)}
                        disabled={aiBusy}
                        className="flex shrink-0 items-center gap-1 border border-rule bg-surface px-2 py-1.5 font-mono text-[9.5px] text-steel transition-colors hover:border-steel/50 hover:text-ink disabled:opacity-50"
                      >
                        <Sparkles className="size-3" />
                        {aiBusy ? "…" : "Suggest"}
                      </button>
                    </div>
                    {aiHint && (
                      <p className="font-mono text-[9.5px] leading-relaxed text-mist">{aiHint}</p>
                    )}
                    <textarea
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Optional note to the editorial desk"
                      rows={1}
                      className={`${control} resize-none`}
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={() => submit(citation.detail)}
                        disabled={!proposal.trim()}
                        className="border border-ink bg-ink px-3 py-1.5 text-[11px] font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
                      >
                        Submit request
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
