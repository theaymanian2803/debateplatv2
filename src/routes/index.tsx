import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, Check, ChevronDown, CircleCheck, Mail, ShieldCheck } from "lucide-react";
import { allCitations, citationCount, entries } from "@/lib/corpus";
import { rulingFor, type Ruling } from "@/lib/rulings";
import { docketNo, recordGroupLabel } from "@/lib/docket";
import { joinWaitlist } from "@/lib/corpus-api";
import { RulingStamp, RulingTag, StatusBadge } from "@/components/StatusBadge";

const title = "Docket — Argument, on the record";
const description =
  "A case file for contested claims. Read the source, read the commentary, compare the rebuttals, and see what the citations actually support.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const previewCases = [
  { id: "genesis-1-1", label: "Genesis" },
  { id: "euthyphro-dilemma", label: "Euthyphro" },
  { id: "discourses-4-1", label: "Epictetus" },
];

const libraries = [
  {
    name: "Bible",
    source: "Free Use Bible API / API.Bible",
    examples: ["John 17:3", "1 Cor 13:4-7"],
    note: "Public-domain translations work immediately; licensed translations unlock with a key.",
  },
  {
    name: "Sefaria",
    source: "Sefaria",
    examples: ["Genesis 1:1", "Berakhot 2a", "Rashi on Genesis 1:1"],
    note: "Tanakh, Talmud, Midrash, and classical commentary with per-version licences.",
  },
  {
    name: "Quran",
    source: "AlQuran Cloud / Quran.com",
    examples: ["17:3", "2:255-257"],
    note: "Uthmani Arabic with translations, plus Ibn Kathir and other tafsir.",
  },
  {
    name: "Hadith",
    source: "Hadith API",
    examples: ["Bukhari 1", "Bukhari 2:1", "Muslim 1"],
    note: "Arabic and English from Bukhari, Muslim, Abu Dawud, Tirmidhi, and more.",
  },
];

const plans = [
  {
    name: "Reader",
    price: "$0",
    period: "forever",
    blurb: "For students and curious readers.",
    features: [
      "The full public docket",
      "Faceted case search and filters",
      "Rebuttals, argument maps, and the citation ledger",
      "Case-file and BibTeX exports",
    ],
    cta: "Open the docket",
    href: "/cases",
    featured: false,
  },
  {
    name: "Scholar",
    price: "$12",
    period: "/ month",
    blurb: "For researchers and independent writers.",
    features: [
      "Everything in Reader",
      "Private reading paths and notes",
      "Unlimited source lookups",
      "Priority editorial requests",
      "Early access to new libraries",
    ],
    cta: "Request early access",
    href: "#access",
    featured: true,
  },
  {
    name: "Institution",
    price: "Custom",
    period: "",
    blurb: "For departments, seminaries, and publishers.",
    features: [
      "Everything in Scholar",
      "Multi-editor desk",
      "Custom taxonomy and review flow",
      "Audit history and export controls",
      "Onboarding and support",
    ],
    cta: "Talk to us",
    href: "#access",
    featured: false,
  },
];

const faqs = [
  {
    q: "What is Docket?",
    a: "A case file for contested claims. It keeps primary texts, commentary, rebuttals, citations, and statuses in one record — and shows where every claim came from.",
  },
  {
    q: "Which sources can I fetch?",
    a: "The Free Use Bible API and API.Bible for the Bible; Sefaria for Tanakh, Talmud, and classical Jewish commentary; AlQuran Cloud and Quran.com for the Quran and tafsir; and the Hadith API for Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasa'i, Ibn Majah, Malik, and Qudsi collections.",
  },
  {
    q: "Do I need API keys?",
    a: "No. Public-domain Bible translations, Sefaria, the Quran, tafsir, and Hadith all work without a key. Add BIBLE_API_KEY only if you want licensed API.Bible translations such as the NIV.",
  },
  {
    q: "How are sources licensed?",
    a: "Every fetched passage stores its translation, reference, attribution, and licence note. Sefaria and API.Bible each expose per-translation licences; the docket displays them rather than hiding them.",
  },
  {
    q: "Is the public docket free?",
    a: "Yes. The public docket is free. Scholar and Institution plans are in early access for private reading paths, multi-editor workflows, and review controls.",
  },
];

const rulingNotes: Record<Exclude<Ruling, "unreviewed">, string> = {
  sustained: "Every citation checks out. The case is verified.",
  contested:
    "At least one citation is disputed. The file shows the disagreement instead of hiding it.",
  unresolved: "A citation is still awaiting collation. The case is open, not settled.",
};

function LandingPage() {
  return (
    <div className="bg-canvas text-ink">
      <Hero />
      <Mechanism />
      <FeaturedDocket />
      <RulingLedger />
      <Libraries />
      <Registry />
      <Access />
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-rule">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(70% 60% at 12% 0%, color-mix(in oklab, var(--brass) 10%, transparent) 0%, transparent 60%)",
        }}
      />
      <div className="relative mx-auto grid max-w-[1400px] gap-12 px-5 pt-16 pb-20 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-14 lg:pt-20 lg:pb-24">
        <div className="max-w-2xl">
          <h1 className="font-display text-[clamp(2.75rem,5.2vw,4.5rem)] leading-[0.98] font-semibold tracking-[-0.035em] text-balance text-ink">
            Argument, <span className="border-b-2 border-brass pb-1">on the record</span>.
          </h1>
          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-steel sm:text-[16.5px]">
            Docket is a case file for contested claims. Read the source, read the commentary,
            compare the rebuttals, and see what the citations actually support.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/cases"
              className="inline-flex items-center gap-2 border border-ink bg-ink px-4 py-2.5 text-[13px] font-medium text-paper transition-opacity hover:opacity-90"
            >
              Open the docket
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="#mechanism"
              className="inline-flex items-center gap-2 border border-rule bg-surface px-4 py-2.5 text-[13px] font-medium text-steel transition-colors hover:border-steel/50 hover:text-ink"
            >
              See how review works
            </a>
          </div>
          <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[10px] text-mist">
            <span>Free to read</span>
            <span aria-hidden className="h-3 w-px bg-rule" />
            <span>Every citation attributed</span>
            <span aria-hidden className="h-3 w-px bg-rule" />
            <span>Editorial access separated from the public record</span>
          </p>
        </div>

        <CasePreview />
      </div>
    </section>
  );
}

function CasePreview() {
  const [index, setIndex] = useState(0);
  const entry =
    entries.find((candidate) => candidate.id === previewCases[index]?.id) ?? entries[0]!;
  const ruling = rulingFor(entry);
  const commentary = entry.sections[0];
  const rebuttal = entry.rebuttals[0];
  const citation = allCitations(entry)[0];

  return (
    <div className="relative">
      <div aria-hidden className="absolute -inset-3 -z-10 border border-rule/70 bg-surface-2/40" />
      <div className="file-sheet sheet-in overflow-hidden border-t-2 border-t-brass">
        <div className="flex flex-wrap items-center gap-2 border-b border-rule px-3 py-2">
          <span className="font-mono text-[9px] tracking-[0.02em] text-mist">Docket</span>
          <span className="font-mono text-[10px] text-ink">{docketNo(entry.id)}</span>
          <span className="ml-auto font-mono text-[9px] text-mist">
            {recordGroupLabel(entry.collection)}
          </span>
        </div>

        <div
          role="tablist"
          aria-label="Preview cases"
          className="flex flex-wrap gap-0.5 border-b border-rule bg-surface-2/60 px-2 py-1.5"
        >
          {previewCases.map(({ id, label }, i) => {
            const candidate = entries.find((item) => item.id === id);
            if (!candidate) return null;
            const active = i === index;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={active}
                onClick={() => setIndex(i)}
                className={`border px-2 py-1 font-mono text-[9.5px] transition-colors ${
                  active
                    ? "border-ink bg-ink text-paper"
                    : "border-transparent text-steel hover:border-rule hover:bg-surface hover:text-ink"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-[19px] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[21px]">
                {entry.title}
              </h2>
              <p className="mt-1 text-[11.5px] leading-relaxed text-steel">{entry.subtitle}</p>
            </div>
            <RulingStamp
              key={`${entry.id}-${ruling}`}
              ruling={ruling}
              animate
              className="shrink-0 px-2 py-1 text-[8.5px] tracking-[0.1em]"
            />
          </div>

          <p className="mt-4 border-t border-rule pt-3 font-serif text-[14.5px] leading-[1.7] text-pretty text-ink">
            {entry.primary}
          </p>

          {commentary && (
            <div className="mt-4 border-t border-rule pt-3">
              <div className="font-mono text-[9px] tracking-[0.02em] text-mist">
                Commentary A{commentary.title !== "Commentary" ? ` · ${commentary.title}` : ""}
              </div>
              <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-steel">
                {commentary.body}
              </p>
            </div>
          )}

          {rebuttal && (
            <div className="mt-3 border-t border-rule pt-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] tracking-[0.02em] text-mist">
                  Rebuttal · {rebuttal.perspective}
                </span>
                <StatusBadge status={rebuttal.status} className="ml-auto" />
              </div>
              <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-steel">
                {rebuttal.claim}
              </p>
            </div>
          )}

          {citation && (
            <div className="mt-3 flex items-center gap-2 border-t border-rule pt-2">
              <span className="font-mono text-[9px] text-mist">Citation</span>
              <span className="min-w-0 flex-1 truncate font-mono text-[9.5px] text-steel">
                {citation.label}
              </span>
              <StatusBadge status={citation.status} />
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-rule pt-3">
            <a
              href={`/cases?entry=${entry.id}`}
              className="inline-flex items-center gap-1.5 border-b border-brass pb-0.5 text-[12px] font-medium text-ink transition-colors hover:text-brass"
            >
              Open this case
              <ArrowRight className="size-3.5" />
            </a>
            <span className="font-mono text-[9px] text-mist">
              {entry.rebuttals.length} rebuttals · {citationCount(entry)} citations
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Mechanism() {
  const entry = entries.find((candidate) => candidate.id === "genesis-1-1") ?? entries[0]!;
  const commentary = entry.sections[0];
  const rebuttal = entry.rebuttals[0];
  const citation = commentary?.citations[0];
  const steps = [
    {
      n: "01",
      label: "Claim",
      title: entry.title,
      body: entry.primary,
    },
    {
      n: "02",
      label: "Commentary",
      title: commentary?.citations[0]?.label ?? "Commentary",
      body: commentary?.body ?? "Classical commentary attached to the case.",
    },
    {
      n: "03",
      label: "Rebuttals",
      title: rebuttal?.perspective ?? "Perspectives",
      body: rebuttal?.claim ?? "Structured arguments attached to the claim.",
    },
    {
      n: "04",
      label: "Status",
      title: rulingFor(entry) === "contested" ? "The record disagrees" : "The record stands",
      body:
        citation?.detail ??
        "Every citation carries its archive and status, so the case can be inspected.",
    },
  ];

  return (
    <section id="mechanism" className="border-b border-rule bg-surface">
      <div className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 sm:py-24">
        <div className="max-w-2xl">
          <h2 className="font-display text-[clamp(2rem,3.6vw,3rem)] leading-[1.02] font-semibold tracking-[-0.03em] text-balance text-ink">
            A status is not a verdict.
          </h2>
          <p className="mt-4 text-[14.5px] leading-relaxed text-steel">
            Every case moves through the same record. Nothing is asserted without commentary, a
            rebuttal, or a citation that can be checked.
          </p>
        </div>

        <div className="mt-10 grid border-t border-rule sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div
              key={step.n}
              className="border-b border-rule px-4 py-5 sm:border-r sm:last:border-r-0 lg:border-b-0"
            >
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[10px] text-brass">{step.n}</span>
                <span className="font-display text-[16px] font-semibold text-ink">
                  {step.label}
                </span>
              </div>
              <h3 className="mt-3 font-mono text-[10px] leading-relaxed text-steel">
                {step.title}
              </h3>
              <p className="mt-2 line-clamp-4 text-[12px] leading-relaxed text-mist">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedDocket() {
  return (
    <section id="docket" className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 sm:py-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="font-display text-[clamp(2rem,3.6vw,3rem)] leading-[1.02] font-semibold tracking-[-0.03em] text-balance text-ink">
            On the docket.
          </h2>
          <p className="mt-4 text-[14.5px] leading-relaxed text-steel">
            Real cases from the corpus, with their collections, statuses, and citation counts.
          </p>
        </div>
        <Link
          to="/cases"
          className="inline-flex items-center gap-2 border border-rule bg-surface px-3 py-2 text-[12.5px] font-medium text-steel transition-colors hover:border-steel/50 hover:text-ink"
        >
          Browse all cases
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <div className="mt-8 border-t border-rule">
        <div className="hidden grid-cols-[9.5rem_1fr_10rem_9rem_5rem] gap-4 border-b border-rule px-2 py-2 font-mono text-[9px] text-mist sm:grid">
          <span>Docket</span>
          <span>Claim</span>
          <span>Collection</span>
          <span>Status</span>
          <span className="text-right">Citations</span>
        </div>
        {entries.map((entry) => (
          <a
            key={entry.id}
            href={`/cases?entry=${entry.id}`}
            className="group grid gap-2 border-b border-rule px-2 py-4 transition-colors hover:bg-highlight sm:grid-cols-[9.5rem_1fr_10rem_9rem_5rem] sm:items-center sm:gap-4"
          >
            <span className="whitespace-nowrap font-mono text-[10px] text-mist">
              {docketNo(entry.id)}
            </span>
            <span className="min-w-0">
              <span className="block font-display text-[16px] leading-tight font-semibold text-ink transition-colors group-hover:text-brass">
                {entry.title}
              </span>
              <span className="mt-0.5 block truncate text-[11.5px] text-mist">
                {entry.subtitle}
              </span>
            </span>
            <span className="text-[12px] text-steel">{recordGroupLabel(entry.collection)}</span>
            <RulingTag ruling={rulingFor(entry)} />
            <span className="font-mono text-[10px] text-mist sm:text-right">
              {citationCount(entry)}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

function RulingLedger() {
  const contested = entries.find((entry) => rulingFor(entry) === "contested") ?? entries[0]!;
  const citations = allCitations(contested);

  return (
    <section id="rulings" className="border-y border-rule bg-surface">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <h2 className="font-display text-[clamp(2rem,3.6vw,3rem)] leading-[1.02] font-semibold tracking-[-0.03em] text-balance text-ink">
            Three ways a case can stand.
          </h2>
          <p className="mt-4 max-w-xl text-[14.5px] leading-relaxed text-steel">
            A status is not an opinion poll. It is the state of the citations attached to the case,
            shown in the open.
          </p>

          <div className="mt-8 divide-y divide-rule border-y border-rule">
            {(Object.keys(rulingNotes) as Exclude<Ruling, "unreviewed">[]).map((ruling) => (
              <div key={ruling} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start">
                <RulingStamp ruling={ruling} className="shrink-0 self-start" />
                <p className="max-w-md text-[12.5px] leading-relaxed text-steel">
                  {rulingNotes[ruling]}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 font-mono text-[9.5px] leading-relaxed text-mist">
            A case with no citations is marked unreviewed until the first citation is attached.
          </p>
        </div>

        <div className="file-sheet">
          <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3">
            <div>
              <h3 className="font-display text-[16px] leading-none font-semibold text-ink">
                Citation ledger
              </h3>
              <p className="mt-1 font-mono text-[9px] text-mist">{contested.title}</p>
            </div>
            <span className="font-mono text-[10px] text-mist">{citations.length} entries</span>
          </div>
          <div className="divide-y divide-rule">
            {citations.map((citation) => (
              <div key={citation.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] text-ink">{citation.label}</p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-mist">{citation.detail}</p>
                  <p className="mt-0.5 font-mono text-[9px] text-mist">{citation.archive}</p>
                </div>
                <StatusBadge status={citation.status} className="self-start" />
              </div>
            ))}
          </div>
          <p className="border-t border-rule px-4 py-3 font-mono text-[9px] leading-relaxed text-mist">
            Every citation carries its archive and status. Export the case file as Markdown or
            BibTeX.
          </p>
        </div>
      </div>
    </section>
  );
}

function Libraries() {
  return (
    <section id="libraries" className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 sm:py-24">
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <div>
          <h2 className="font-display text-[clamp(2rem,3.6vw,3rem)] leading-[1.02] font-semibold tracking-[-0.03em] text-balance text-ink">
            Four libraries, one record.
          </h2>
          <p className="mt-4 max-w-md text-[14.5px] leading-relaxed text-steel">
            Fetch a reference, choose a translation, and attach it to a case without leaving the
            file. Arabic and Hebrew stay right-to-left.
          </p>
          <Link
            to="/quran"
            className="mt-5 inline-flex items-center gap-2 border-b border-brass pb-0.5 text-[12.5px] font-medium text-ink transition-colors hover:text-brass"
          >
            Open the Quran library
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <div className="border-t border-rule">
          {libraries.map((library) => (
            <div
              key={library.name}
              className="grid gap-3 border-b border-rule py-4 sm:grid-cols-[7rem_1fr_1fr]"
            >
              <div className="font-display text-[17px] font-semibold text-ink">{library.name}</div>
              <div>
                <div className="flex flex-wrap gap-1">
                  {library.examples.map((example) => (
                    <span
                      key={example}
                      className="border border-rule bg-surface px-1.5 py-0.5 font-mono text-[9.5px] text-steel"
                    >
                      {example}
                    </span>
                  ))}
                </div>
                <p className="mt-1.5 font-mono text-[9px] text-mist">{library.source}</p>
              </div>
              <p className="text-[11.5px] leading-relaxed text-mist">{library.note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Registry() {
  const citationTotal = entries.reduce((total, entry) => total + citationCount(entry), 0);
  const awaiting = entries.reduce(
    (total, entry) =>
      total + allCitations(entry).filter((citation) => citation.status !== "verified").length,
    0,
  );

  return (
    <section id="registry" className="border-y border-rule bg-surface">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <h2 className="font-display text-[clamp(2rem,3.6vw,3rem)] leading-[1.02] font-semibold tracking-[-0.03em] text-balance text-ink">
            The editorial desk keeps the record honest.
          </h2>
          <p className="mt-4 max-w-xl text-[14.5px] leading-relaxed text-steel">
            The public docket is one half of the product. The editorial desk is the other: a
            password-protected desk for cases, commentary, rebuttals, sources, reading paths,
            requests, and audit history.
          </p>
          <ul className="mt-6 divide-y divide-rule border-y border-rule">
            {[
              "Password-protected desk",
              "Verified / disputed / unverified statuses",
              "Source requests from readers",
              "Reading paths and cross-references",
              "Taxonomy and source management",
              "Audit history and reset controls",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5 py-2.5 text-[12.5px] text-steel">
                <Check className="size-3.5 shrink-0 text-verify" />
                {item}
              </li>
            ))}
          </ul>
          <a
            href="#access"
            className="mt-6 inline-flex items-center gap-2 border border-rule bg-canvas px-4 py-2 text-[12.5px] font-medium text-steel transition-colors hover:border-steel/50 hover:text-ink"
          >
            Request an editorial seat
            <ArrowRight className="size-3.5" />
          </a>
        </div>

        <div className="file-sheet p-4 sm:p-5">
          <div className="flex items-center justify-between border-b border-rule pb-3">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center border border-ink bg-ink font-display text-[12px] font-semibold text-paper">
                D
              </span>
              <div>
                <div className="font-display text-[15px] leading-none font-semibold">Docket</div>
                <div className="mt-1 font-mono text-[8.5px] text-mist">Editorial desk</div>
              </div>
            </div>
            <span className="border border-rule px-1.5 py-0.5 font-mono text-[8.5px] text-mist">
              restricted
            </span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              ["Cases", String(entries.length)],
              ["Citations", String(citationTotal)],
              ["Awaiting", String(awaiting)],
            ].map(([label, value]) => (
              <div key={label} className="border-t border-brass/60 pt-2">
                <div className="font-mono text-[8.5px] text-mist">{label}</div>
                <div className="mt-1 font-display text-[22px] leading-none font-semibold text-ink">
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 border border-rule bg-surface-2/50 p-3">
            <div className="font-mono text-[8.5px] text-mist">New case</div>
            <div className="mt-1.5 border border-rule bg-surface px-2 py-1.5 font-mono text-[10px] text-steel">
              John 17:3
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="bg-ink px-2 py-1 text-[9px] font-medium text-paper">
                Fetch source
              </span>
              <span className="border border-rule bg-surface px-2 py-1 text-[9px] text-steel">
                Commentary
              </span>
              <span className="border border-rule bg-surface px-2 py-1 text-[9px] text-steel">
                Rebuttal
              </span>
            </div>
          </div>

          <div className="mt-3 space-y-1.5">
            {[
              ["Cases", "cases"],
              ["Commentary", "commentary"],
              ["Rebuttals", "rebuttals"],
              ["Sources", "sources"],
              ["Reading paths", "paths"],
            ].map(([label, key], i) => (
              <div
                key={key}
                className={`flex items-center justify-between border px-2 py-1.5 text-[9.5px] ${
                  i === 0 ? "border-ink bg-ink text-paper" : "border-rule bg-surface text-steel"
                }`}
              >
                <span>{label}</span>
                <span className={i === 0 ? "text-paper/60" : "text-mist"}>{key}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Access() {
  return (
    <section id="access" className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 sm:py-24">
      <div className="max-w-2xl">
        <h2 className="font-display text-[clamp(2rem,3.6vw,3rem)] leading-[1.02] font-semibold tracking-[-0.03em] text-balance text-ink">
          Free to read. Paid when you need a private desk.
        </h2>
        <p className="mt-4 text-[14.5px] leading-relaxed text-steel">
          The public docket stays open. Scholar and Institution plans are in early access; tell us
          what you need and we will invite you in.
        </p>
      </div>

      <div className="mt-10 grid gap-3 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`flex flex-col border bg-surface p-6 ${
              plan.featured ? "border-ink border-t-2 border-t-brass" : "border-rule"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-display text-[20px] leading-none font-semibold text-ink">
                  {plan.name}
                </h3>
                <p className="mt-1.5 text-[12px] text-mist">{plan.blurb}</p>
              </div>
              {plan.featured && (
                <span className="border border-brass/50 px-1.5 py-0.5 font-mono text-[8.5px] text-brass">
                  early access
                </span>
              )}
            </div>
            <div className="mt-5 flex items-baseline gap-1">
              <span className="font-display text-[38px] leading-none font-semibold text-ink">
                {plan.price}
              </span>
              {plan.period && (
                <span className="font-mono text-[10px] text-mist">{plan.period}</span>
              )}
            </div>
            <ul className="mt-5 flex-1 space-y-2">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-[12px] text-steel">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-verify" />
                  {feature}
                </li>
              ))}
            </ul>
            {plan.href.startsWith("/") ? (
              <Link
                to={plan.href}
                className={`mt-6 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[12.5px] font-medium transition-colors ${
                  plan.featured
                    ? "border border-ink bg-ink text-paper hover:opacity-90"
                    : "border border-rule bg-canvas text-steel hover:border-steel/50 hover:text-ink"
                }`}
              >
                {plan.cta}
                <ArrowRight className="size-3.5" />
              </Link>
            ) : (
              <a
                href={plan.href}
                className={`mt-6 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[12.5px] font-medium transition-colors ${
                  plan.featured
                    ? "border border-ink bg-ink text-paper hover:opacity-90"
                    : "border border-rule bg-canvas text-steel hover:border-steel/50 hover:text-ink"
                }`}
              >
                {plan.cta}
                <ArrowRight className="size-3.5" />
              </a>
            )}
          </div>
        ))}
      </div>

      <div className="mt-12 grid gap-10 border-t border-rule pt-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <h3 className="font-display text-[24px] leading-tight font-semibold tracking-[-0.02em] text-ink">
            Request a seat at the table.
          </h3>
          <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-steel">
            Leave an email and tell us how you read. We invite researchers, editors, and
            institutions in small cohorts while the private editorial desk is finished.
          </p>
          <div className="mt-5 space-y-2 border-t border-rule pt-4">
            {[
              ["No spam", "One email when your cohort opens."],
              ["Small cohorts", "We invite in groups, not a blast."],
              ["Institutional enquiries", "Departments, seminaries, and publishers welcome."],
            ].map(([label, note]) => (
              <div key={label} className="flex items-baseline gap-3">
                <CircleCheck className="size-3.5 shrink-0 text-verify" />
                <p className="text-[12px] text-steel">
                  <span className="font-medium text-ink">{label}.</span> {note}
                </p>
              </div>
            ))}
          </div>
        </div>

        <Waitlist />
      </div>

      <Faq />
    </section>
  );
}

function Waitlist() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("researcher");
  const [done, setDone] = useState<"new" | "existing" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: () => joinWaitlist({ data: { email, role } }),
    onSuccess: (res) => {
      if (res.ok) {
        setDone(res.alreadyRegistered ? "existing" : "new");
        setError(null);
        setEmail("");
      } else {
        setError(res.error ?? "Could not join the list. Try again.");
      }
    },
    onError: () => setError("Could not join the list. Try again."),
  });

  return (
    <div className="border border-ink bg-ink p-5 text-paper sm:p-6">
      <div className="flex items-center gap-2">
        <Mail className="size-3.5 text-brass" />
        <span className="font-mono text-[9.5px] text-paper/70">Access request</span>
      </div>

      {done ? (
        <div className="py-6 text-center">
          <CircleCheck className="mx-auto size-7 text-verify" />
          <p className="mt-3 font-display text-[19px] font-semibold text-paper">
            {done === "existing" ? "You are already on the list." : "You are on the list."}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-paper/70">
            We will email you when the next cohort opens. In the meantime, the public docket is
            open.
          </p>
          <Link
            to="/cases"
            className="mt-4 inline-flex items-center gap-2 border border-paper bg-paper px-4 py-2 text-[12px] font-medium text-ink transition-opacity hover:opacity-90"
          >
            Open the docket
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      ) : (
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (email.trim()) submit.mutate();
          }}
        >
          <label className="block">
            <span className="text-[11px] text-paper/70">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 w-full border border-paper/25 bg-paper/10 px-3 py-2 text-[13px] text-paper placeholder:text-paper/40 outline-none focus:border-brass"
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-paper/70">I read as</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 w-full border border-paper/25 bg-paper/10 px-3 py-2 text-[13px] text-paper outline-none focus:border-brass"
            >
              <option value="researcher">Researcher</option>
              <option value="student">Student</option>
              <option value="editor">Editor / publisher</option>
              <option value="institution">Institution</option>
              <option value="other">Other</option>
            </select>
          </label>
          {error && <p className="text-[11px] text-dispute">{error}</p>}
          <button
            type="submit"
            disabled={submit.isPending || !email.trim()}
            className="flex w-full items-center justify-center gap-2 bg-paper px-4 py-2.5 text-[12.5px] font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submit.isPending ? "Requesting…" : "Request access"}
            <ArrowRight className="size-3.5" />
          </button>
          <p className="text-center font-mono text-[8.5px] text-paper/50">
            One email when your cohort opens. No newsletter.
          </p>
        </form>
      )}
    </div>
  );
}

function Faq() {
  return (
    <div className="mt-16 border-t border-rule pt-8">
      <h3 className="font-display text-[22px] leading-tight font-semibold tracking-[-0.02em] text-ink">
        Questions worth asking.
      </h3>
      <div className="mt-4 divide-y divide-rule border-t border-rule">
        {faqs.map((faq) => (
          <details key={faq.q} className="group py-3">
            <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
              <span className="font-display text-[15px] font-medium text-ink">{faq.q}</span>
              <ChevronDown className="ml-auto size-4 shrink-0 text-mist transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-2 max-w-3xl pr-8 text-[12.5px] leading-relaxed text-steel">{faq.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-rule bg-surface">
      <div className="mx-auto max-w-[1400px] px-5 py-12 sm:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="relative flex size-8 items-center justify-center overflow-hidden border border-ink bg-ink font-display text-[15px] font-semibold text-paper">
                <span className="absolute inset-x-0 top-0 h-[3px] bg-brass" />
                <span className="mt-0.5">D</span>
              </span>
              <div>
                <div className="font-display text-[17px] leading-none font-semibold">Docket</div>
                <div className="mt-1 font-mono text-[8.5px] text-mist">Argument, on the record</div>
              </div>
            </div>
            <p className="mt-3 max-w-xs text-[12px] leading-relaxed text-mist">
              A case file for contested claims. Source texts, commentary, rebuttals, citations, and
              the status behind them.
            </p>
          </div>
          <FooterColumn
            title="Docket"
            links={[
              ["Cases", "/cases"],
              ["Quran library", "/quran"],
              ["How it works", "/#mechanism"],
              ["Access", "/#access"],
            ]}
          />
          <FooterColumn
            title="Editorial"
            links={[
              ["Editorial desk", "/admin"],
              ["Access request", "/#access"],
              ["Questions", "/#access"],
            ]}
          />
          <div>
            <div className="font-mono text-[9px] text-mist">Sources</div>
            <ul className="mt-3 space-y-2 text-[12px] text-steel">
              <li>Free Use Bible API</li>
              <li>API.Bible</li>
              <li>Sefaria</li>
              <li>AlQuran Cloud / Quran.com</li>
              <li>Hadith API</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-5">
          <p className="font-mono text-[9px] text-mist">
            © {new Date().getFullYear()} Docket. Source texts retain their own licences.
          </p>
          <p className="font-mono text-[9px] text-mist">
            Built for careful reading, not hot takes.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="font-mono text-[9px] text-mist">{title}</div>
      <ul className="mt-3 space-y-2">
        {links.map(([label, href]) => (
          <li key={label}>
            {href.startsWith("/") && !href.includes("#") ? (
              <Link to={href} className="text-[12px] text-steel transition-colors hover:text-ink">
                {label}
              </Link>
            ) : (
              <a href={href} className="text-[12px] text-steel transition-colors hover:text-ink">
                {label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
