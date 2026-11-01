import { useState } from "react";
import { BookOpen, ChevronDown } from "lucide-react";
import { allCitations, type Citation, type Entry } from "@/lib/corpus";
import { docketNo } from "@/lib/docket";
import { containsArabic } from "@/lib/scripture";
import { StatusBadge, StatusDot } from "./StatusBadge";

function AuthorityRow({ citation }: { citation: Citation }) {
  return (
    <div className="grid gap-1 border-b border-rule py-2.5 last:border-b-0 sm:grid-cols-[1fr_auto] sm:gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <StatusDot status={citation.status} />
          <p className="min-w-0 flex-1 truncate font-mono text-[9.5px] text-ink">
            {citation.label}
          </p>
        </div>
        <p className="mt-1 text-[11.5px] leading-relaxed text-steel">{citation.detail}</p>
        <p className="mt-0.5 font-mono text-[9px] text-mist">{citation.archive}</p>
      </div>
      <StatusBadge status={citation.status} className="self-start" />
    </div>
  );
}

function exhibitHealth(citations: Citation[]) {
  if (citations.some((citation) => citation.status === "disputed")) return "dispute" as const;
  if (citations.some((citation) => citation.status === "unverified")) return "unv" as const;
  return "verify" as const;
}

export function PrimaryPane({
  entry,
  onSelectEntry,
  related,
}: {
  entry: Entry;
  onSelectEntry?: (id: string) => void;
  related?: { id: string; title: string }[];
}) {
  const [open, setOpen] = useState<string[]>([entry.sections[0]?.id ?? ""]);
  const [translation, setTranslation] = useState<string | null>(null);
  const toggle = (id: string) =>
    setOpen((previous) =>
      previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id],
    );

  const active = entry.translations.find((item) => item.label === translation) ?? null;
  const citations = allCitations(entry);
  const arabicPrimary = entry.scripture?.language === "ar" || containsArabic(entry.primary);
  const arabicSecondary =
    containsArabic(entry.secondary) || (active ? containsArabic(active.text) : false);
  const tally = (status: "verified" | "disputed" | "unverified") =>
    citations.filter((citation) => citation.status === status).length;

  return (
    <section
      aria-label="Case claim and commentary"
      className="flex min-h-0 w-full flex-col overflow-hidden bg-surface"
    >
      <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-rule px-4 sm:px-5">
        <span className="font-display text-[13px] font-semibold text-ink">Claim</span>
        <span className="truncate font-mono text-[9.5px] text-mist">
          {entry.breadcrumb.split("/").pop()}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <article className="mx-auto w-full max-w-[68ch] px-5 py-6 sm:px-7 sm:py-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="border border-rule bg-surface-2 px-1.5 py-0.5 font-mono text-[9px] text-mist">
              {entry.kind === "verse" ? "Text" : "Claim"}
            </span>
            <span className="font-mono text-[9.5px] text-mist">{docketNo(entry.id)}</span>
            <span className="font-mono text-[9.5px] text-mist">{entry.breadcrumb}</span>
          </div>

          <p
            dir={entry.scripture?.direction ?? "auto"}
            className={`mt-4 font-serif text-[20px] leading-[1.7] font-normal text-pretty text-ink sm:text-[22px] ${
              arabicPrimary ? "font-arabic text-[24px] leading-[1.95]" : ""
            }`}
          >
            {entry.primary}
          </p>

          {entry.scripture && (
            <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <BookOpen className="size-3 text-mist" />
              <span className="font-mono text-[9.5px] text-mist">
                {entry.scripture.translationLabel}
                {entry.scripture.secondaryLabel
                  ? ` · ${entry.scripture.secondaryLabel}`
                  : ""} · {entry.scripture.reference}
              </span>
              {entry.scripture.attribution && (
                <span className="font-mono text-[9.5px] text-mist/80">
                  · {entry.scripture.attribution}
                </span>
              )}
            </div>
          )}

          <div className="mt-6 border-l border-rule pl-4">
            <div className="font-mono text-[9px] text-mist">
              {active ? active.label : "Official translation"}
            </div>
            <p
              dir="auto"
              className={`mt-1.5 font-serif text-[15.5px] leading-[1.75] text-pretty text-steel italic ${
                arabicSecondary ? "font-arabic text-[18px] leading-[1.9]" : ""
              }`}
            >
              {active ? active.text : entry.secondary}
            </p>
          </div>

          {entry.translations.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[10px] text-mist">Translation</span>
              <button
                onClick={() => setTranslation(null)}
                aria-pressed={translation === null}
                className={`border px-2 py-1 font-mono text-[10px] transition-colors ${
                  translation === null
                    ? "border-ink bg-ink text-paper"
                    : "border-rule bg-surface text-steel hover:border-steel/50 hover:text-ink"
                }`}
              >
                Official
              </button>
              {entry.translations.map((item) => (
                <button
                  key={item.label}
                  onClick={() => setTranslation(item.label)}
                  aria-pressed={translation === item.label}
                  className={`border px-2 py-1 font-mono text-[10px] transition-colors ${
                    translation === item.label
                      ? "border-ink bg-ink text-paper"
                      : "border-rule bg-surface text-steel hover:border-steel/50 hover:text-ink"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {entry.sections.length > 0 && (
            <section className="mt-8" aria-label="Commentary">
              <div className="flex items-center justify-between border-b border-rule pb-2">
                <h3 className="font-display text-[15px] font-semibold text-ink">Commentary</h3>
                <span className="font-mono text-[9px] text-mist">{entry.sections.length}</span>
              </div>

              {entry.sections.map((section, index) => {
                const isOpen = open.includes(section.id);
                const health = exhibitHealth(section.citations);
                return (
                  <section
                    key={section.id}
                    id={`exhibit-${section.id}`}
                    className="border-b border-rule"
                  >
                    <button
                      onClick={() => toggle(section.id)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center gap-3 py-3 text-left"
                    >
                      <span
                        aria-hidden
                        className="flex size-6 shrink-0 items-center justify-center border border-brass/50 bg-brass/10 font-mono text-[10px] text-brass"
                      >
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-display text-[13px] font-semibold text-ink">
                          {section.title}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5">
                          <span
                            aria-hidden
                            className={`size-1.5 rounded-full ${
                              health === "verify"
                                ? "bg-verify"
                                : health === "dispute"
                                  ? "bg-dispute"
                                  : "bg-unv"
                            }`}
                          />
                          <span className="font-mono text-[9px] text-mist">
                            {section.citations.length}{" "}
                            {section.citations.length === 1 ? "citation" : "citations"}
                          </span>
                        </span>
                      </span>
                      <ChevronDown
                        className={`size-3.5 shrink-0 text-mist transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div className="pb-4 pl-9">
                        <p
                          dir="auto"
                          className={`text-[13px] leading-[1.75] text-pretty text-steel ${
                            containsArabic(section.body)
                              ? "font-arabic text-[16px] leading-[2]"
                              : ""
                          }`}
                        >
                          {section.body}
                        </p>
                        {section.citations.length > 0 && (
                          <div className="mt-2 border-t border-rule">
                            {section.citations.map((citation) => (
                              <AuthorityRow key={citation.id} citation={citation} />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                );
              })}
            </section>
          )}

          {related && related.length > 0 && (
            <div className="mt-8 border-t border-rule pt-4">
              <h3 className="font-display text-[14px] font-semibold text-ink">Related cases</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {related.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onSelectEntry?.(item.id)}
                    className="border border-rule bg-surface px-2 py-1 font-mono text-[10px] text-steel transition-colors hover:border-steel/50 hover:text-ink"
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-rule pt-3">
            <span className="font-mono text-[9.5px] text-mist">
              {tally("verified")} verified · {tally("disputed")} disputed · {tally("unverified")}{" "}
              unverified
            </span>
            <span className="ml-auto font-mono text-[9.5px] text-mist">
              {entry.rebuttals.length} rebuttals · {entry.map.nodes.length} map nodes
            </span>
          </div>
        </article>
      </div>
    </section>
  );
}
