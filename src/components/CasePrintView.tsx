import { allCitations, type Entry } from "@/lib/corpus";
import { docketNo, recordGroupLabel } from "@/lib/docket";
import { rulingFor, rulingLabel, verificationLabel } from "@/lib/rulings";
import { containsArabic } from "@/lib/scripture";

function CitationLine({
  label,
  detail,
  archive,
}: {
  label: string;
  detail: string;
  archive: string;
}) {
  return (
    <li className="font-mono text-[9.5px] leading-relaxed">
      {label} — {detail} ({archive})
    </li>
  );
}

export function CasePrintView({ entry, url }: { entry: Entry; url: string }) {
  const ruling = rulingFor(entry);
  const uniqueCitations = Array.from(
    new Map(allCitations(entry).map((citation) => [citation.detail, citation])).values(),
  );

  return (
    <article className="print-case mx-auto max-w-[70ch] px-8 py-10 text-black">
      <header className="border-b-2 border-black pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-[0.12em]">
          <span>Docket · Case file</span>
          <span>{docketNo(entry.id)}</span>
        </div>
        <h1 className="mt-4 font-display text-[28px] leading-tight font-bold tracking-[-0.03em]">
          {entry.title}
        </h1>
        <p className="mt-1 font-serif text-[14px] italic">{entry.subtitle}</p>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[9px]">
          <span>{recordGroupLabel(entry.collection)}</span>
          <span aria-hidden>·</span>
          <span>{entry.kind === "verse" ? "Text" : "Claim"}</span>
          <span aria-hidden>·</span>
          <span>{rulingLabel(ruling)}</span>
        </div>
      </header>

      <section className="mt-6">
        <h2 className="font-display text-[15px] font-bold">Claim</h2>
        <p
          dir={entry.scripture?.direction ?? "auto"}
          className={`mt-2 font-serif text-[15px] leading-[1.7] ${
            entry.scripture?.language === "ar" || containsArabic(entry.primary)
              ? "font-arabic text-[18px] leading-[1.9]"
              : ""
          }`}
        >
          {entry.primary}
        </p>
        {entry.scripture && (
          <p className="mt-1.5 font-mono text-[8.5px]">
            {entry.scripture.translationLabel}
            {entry.scripture.secondaryLabel ? ` · ${entry.scripture.secondaryLabel}` : ""} ·{" "}
            {entry.scripture.reference}
            {entry.scripture.attribution ? ` · ${entry.scripture.attribution}` : ""}
          </p>
        )}
        <p className="mt-3 border-l border-black pl-3 font-serif text-[13px] leading-[1.7] italic">
          {entry.secondary}
        </p>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-[15px] font-bold">Commentary</h2>
        {entry.sections.length === 0 && (
          <p className="mt-2 font-serif text-[12.5px] italic">No commentary recorded.</p>
        )}
        {entry.sections.map((section, index) => (
          <div key={section.id} className="print-avoid-break mt-4">
            <h3 className="font-display text-[12px] font-bold">
              Commentary {String.fromCharCode(65 + index)}
              {section.title !== "Commentary" ? ` — ${section.title}` : ""}
            </h3>
            <p
              dir="auto"
              className={`mt-1 font-serif text-[12.5px] leading-[1.7] ${
                containsArabic(section.body) ? "font-arabic text-[15px] leading-[1.9]" : ""
              }`}
            >
              {section.body}
            </p>
            {section.citations.length > 0 && (
              <ul className="mt-1.5 space-y-0.5">
                {section.citations.map((citation) => (
                  <CitationLine
                    key={citation.id}
                    label={`[${verificationLabel(citation.status)}] ${citation.label}`}
                    detail={citation.detail}
                    archive={citation.archive}
                  />
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>

      <section className="mt-6">
        <h2 className="font-display text-[15px] font-bold">Rebuttals</h2>
        {entry.rebuttals.length === 0 && (
          <p className="mt-2 font-serif text-[12.5px] italic">No rebuttals recorded.</p>
        )}
        {entry.rebuttals.map((rebuttal) => (
          <div key={rebuttal.id} className="print-avoid-break mt-4">
            <div className="font-mono text-[9px]">
              {rebuttal.perspective} · {verificationLabel(rebuttal.status)}
            </div>
            <p
              dir="auto"
              className={`mt-1 font-serif text-[13px] leading-[1.7] ${
                containsArabic(rebuttal.claim) ? "font-arabic text-[16px] leading-[1.9]" : ""
              }`}
            >
              {rebuttal.qualifier ? <em>{rebuttal.qualifier} </em> : null}
              {rebuttal.claim}
            </p>
            {rebuttal.warrant && (
              <p className="mt-1 text-[11.5px] leading-relaxed">
                <strong>Ground:</strong> {rebuttal.warrant}
              </p>
            )}
            {rebuttal.backing && (
              <p className="mt-0.5 text-[11.5px] leading-relaxed">
                <strong>Source:</strong> {rebuttal.backing}
              </p>
            )}
            {rebuttal.counter && (
              <p className="mt-0.5 text-[11.5px] leading-relaxed">
                <strong>Reply ({rebuttal.counter.author}):</strong> {rebuttal.counter.body}
              </p>
            )}
            {rebuttal.citations.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {rebuttal.citations.map((citation) => (
                  <CitationLine
                    key={citation.id}
                    label={`[${verificationLabel(citation.status)}] ${citation.label}`}
                    detail={citation.detail}
                    archive={citation.archive}
                  />
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>

      <section className="mt-6">
        <h2 className="font-display text-[15px] font-bold">Citations</h2>
        {uniqueCitations.length === 0 && (
          <p className="mt-2 font-serif text-[12.5px] italic">No citations recorded.</p>
        )}
        <ol className="mt-2 space-y-1">
          {uniqueCitations.map((citation) => (
            <li key={citation.detail} className="font-mono text-[9px] leading-relaxed">
              [{verificationLabel(citation.status)}] {citation.label} — {citation.detail} (
              {citation.archive})
            </li>
          ))}
        </ol>
      </section>

      <footer className="mt-8 border-t border-black pt-3 font-mono text-[8.5px] leading-relaxed">
        <p>Docket · {url}</p>
        <p className="mt-1">
          Generated {new Date().toLocaleString()} · Source texts retain their own licences.
        </p>
      </footer>
    </article>
  );
}
