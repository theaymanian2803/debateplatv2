import { useEffect, useState } from "react";
import { Check, Clipboard, Copy, Download, Printer } from "lucide-react";
import {
  citationFormats,
  caseCitation,
  caseShareUrl,
  caseSnapshot,
  type CitationFormat,
} from "@/lib/citations";
import type { Entry } from "@/lib/corpus";
import { docketNo } from "@/lib/docket";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

type ShareTab = "link" | "citation" | "snapshot";

const tabs: { id: ShareTab; label: string }[] = [
  { id: "link", label: "Link" },
  { id: "citation", label: "Citation" },
  { id: "snapshot", label: "Snapshot" },
];

export function ShareCaseDialog({
  entry,
  open,
  onOpenChange,
  onPrint,
}: {
  entry: Entry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrint: () => void;
}) {
  const [tab, setTab] = useState<ShareTab>("link");
  const [format, setFormat] = useState<CitationFormat>("chicago");
  const [copied, setCopied] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!open) return;
    setTab("link");
    setCopied(null);
  }, [open]);

  const url = caseShareUrl(entry, origin) || `/case/${entry.id}`;
  const citation = caseCitation(entry, format, url);
  const snapshot = caseSnapshot(entry, url);
  const snapshotJson = JSON.stringify(snapshot, null, 2);

  const copy = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const downloadSnapshot = () => {
    const blob = new Blob([snapshotJson], { type: "application/json" });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = `${entry.id}-snapshot.json`;
    anchor.click();
    URL.revokeObjectURL(downloadUrl);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-[640px] gap-0 overflow-hidden border-rule bg-surface p-0 sm:rounded-none">
        <div className="border-b border-rule px-5 py-4">
          <DialogTitle className="font-display text-[21px] leading-tight font-semibold tracking-[-0.02em] text-ink">
            Share & cite
          </DialogTitle>
          <DialogDescription className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-mist">
            {entry.title}
          </DialogDescription>
        </div>

        <div className="flex gap-1 border-b border-rule px-4 py-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              aria-pressed={tab === item.id}
              className={`border px-3 py-1.5 font-mono text-[10px] transition-colors ${
                tab === item.id
                  ? "border-ink bg-ink text-paper"
                  : "border-transparent text-steel hover:border-rule hover:bg-highlight hover:text-ink"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="max-h-[58dvh] overflow-y-auto p-5">
          {tab === "link" && (
            <div className="space-y-3">
              <p className="text-[12.5px] leading-relaxed text-steel">
                This is the stable link to the case. It always opens the current version of the
                record.
              </p>
              <div className="border border-rule bg-surface-2/50 p-3">
                <div className="font-mono text-[9px] text-mist">Case link</div>
                <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                  <input
                    readOnly
                    value={url}
                    aria-label="Case link"
                    className="min-w-0 flex-1 border border-rule bg-surface px-2.5 py-2 font-mono text-[10.5px] text-steel outline-none"
                  />
                  <button
                    onClick={() => copy(url, "link")}
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 border border-ink bg-ink px-3 py-2 text-[11px] font-medium text-paper transition-opacity hover:opacity-90"
                  >
                    {copied === "link" ? (
                      <Check className="size-3.5" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                    {copied === "link" ? "Copied" : "Copy link"}
                  </button>
                </div>
              </div>
              <p className="font-mono text-[9.5px] leading-relaxed text-mist">
                Need a frozen record? Download a snapshot from the Snapshot tab.
              </p>
            </div>
          )}

          {tab === "citation" && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1">
                {citationFormats.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setFormat(item.id)}
                    aria-pressed={format === item.id}
                    className={`border px-2.5 py-1 font-mono text-[10px] transition-colors ${
                      format === item.id
                        ? "border-ink bg-ink text-paper"
                        : "border-rule bg-surface text-steel hover:border-steel/50 hover:text-ink"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <pre className="max-h-56 overflow-auto border border-rule bg-surface-2/50 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-steel">
                {citation}
              </pre>
              <button
                onClick={() => copy(citation, "citation")}
                className="inline-flex items-center gap-1.5 border border-ink bg-ink px-3 py-2 text-[11px] font-medium text-paper transition-opacity hover:opacity-90"
              >
                {copied === "citation" ? (
                  <Check className="size-3.5" />
                ) : (
                  <Clipboard className="size-3.5" />
                )}
                {copied === "citation" ? "Copied" : "Copy citation"}
              </button>
            </div>
          )}

          {tab === "snapshot" && (
            <div className="space-y-3">
              <p className="text-[12.5px] leading-relaxed text-steel">
                A snapshot freezes this version of the case, its citations, and the source text.
                Download it as JSON for an archive or a reproducible citation.
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9.5px] text-mist">
                <span>Version {snapshot.version}</span>
                <span aria-hidden>·</span>
                <span>{new Date(snapshot.generatedAt).toLocaleString()}</span>
              </div>
              <pre className="max-h-52 overflow-auto border border-rule bg-surface-2/50 p-3 font-mono text-[10px] leading-relaxed text-steel">
                {snapshotJson}
              </pre>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => copy(snapshotJson, "snapshot")}
                  className="inline-flex items-center gap-1.5 border border-ink bg-ink px-3 py-2 text-[11px] font-medium text-paper transition-opacity hover:opacity-90"
                >
                  {copied === "snapshot" ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  {copied === "snapshot" ? "Copied" : "Copy JSON"}
                </button>
                <button
                  onClick={downloadSnapshot}
                  className="inline-flex items-center gap-1.5 border border-rule bg-surface px-3 py-2 text-[11px] font-medium text-steel transition-colors hover:border-steel/50 hover:text-ink"
                >
                  <Download className="size-3.5" />
                  Download JSON
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rule px-5 py-3">
          <span className="font-mono text-[9px] text-mist">Case file · {docketNo(entry.id)}</span>
          <div className="flex gap-1.5">
            <button
              onClick={onPrint}
              className="inline-flex items-center gap-1.5 border border-rule bg-surface px-3 py-1.5 text-[11px] font-medium text-steel transition-colors hover:border-steel/50 hover:text-ink"
            >
              <Printer className="size-3.5" />
              Print / Save PDF
            </button>
            <DialogClose asChild>
              <button className="border border-ink bg-ink px-3 py-1.5 text-[11px] font-medium text-paper transition-opacity hover:opacity-90">
                Close
              </button>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
