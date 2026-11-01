import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  Database,
  FileText,
  Library,
  Scale,
  ShieldCheck,
} from "lucide-react";

const title = "Welcome - Libyano School";
const description =
  "A short guide to Libyano School: reading a case, using the Quran library, the Editorial desk, and connecting your own Turso database.";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "article" },
    ],
  }),
  component: WelcomePage,
});

const startHere = [
  {
    to: "/cases",
    icon: Scale,
    title: "Read a case",
    body: "Open the public docket and follow a contested claim from source to ruling.",
  },
  {
    to: "/quran",
    icon: BookOpen,
    title: "Open the Quran library",
    body: "Read the Madani mushaf with translations, tafsir, occasion of revelation, and bookmarks.",
  },
  {
    to: "/admin",
    icon: ShieldCheck,
    title: "Enter the Editorial desk",
    body: "Curate cases, sources, commentary, rebuttals, and the database connection.",
  },
] as const;

const caseParts = [
  {
    title: "The claim",
    body: "Every case starts with one contested claim, stated plainly and tied to its primary text.",
  },
  {
    title: "The commentary",
    body: "Scholars are quoted with book, volume, and page so you can check the citation yourself.",
  },
  {
    title: "The rebuttals",
    body: "Opposing positions sit beside the claim, with counter-references and the editor's response.",
  },
  {
    title: "The citation ledger",
    body: "Each citation records its source, licence, and status so the record stays auditable.",
  },
];

const statuses = [
  {
    label: "Verified",
    className: "bg-verify",
    body: "The source was checked against the cited edition.",
  },
  {
    label: "Disputed",
    className: "bg-dispute",
    body: "Editors disagree, or the attribution is contested.",
  },
  {
    label: "Unverified",
    className: "bg-unv",
    body: "The citation is recorded but has not been confirmed yet.",
  },
];

const quranFeatures = [
  "PageUp / PageDown move between the 604 pages; press g to jump to a page.",
  "Select any ayah to open tafsir and the occasion of revelation (Asbab al-Nuzul).",
  "Open the Aa panel to change text size, switch between Naskh and Amiri, or hide the translation.",
  "Bookmark an ayah, then return to it from the Bookmarks tab. Bookmarks stay on this device.",
];

const editorialFeatures = [
  "Entries, sources, commentaries, rebuttals, paths, and taxonomy are edited from the desk.",
  "The Database page validates Turso credentials and stores them in an encrypted, HttpOnly cookie.",
  "Activity and access requests are visible to editors only.",
];

const connectSteps = [
  {
    title: "Create a Turso database",
    body: "Sign in at turso.tech, create a database, and copy its libsql:// URL.",
  },
  {
    title: "Create an auth token",
    body: "Generate a database token in Turso. Treat it like a password.",
  },
  {
    title: "Open the Database page",
    body: "Sign in to the Editorial desk, then open Database in the sidebar.",
  },
  {
    title: "Test and save",
    body: "Paste the URL and token, choose Test and save, and the app migrates the schema and reloads with your data.",
  },
];

function WelcomePage() {
  return (
    <main className="bg-canvas">
      <section className="border-b border-rule bg-surface">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="font-mono text-[10px] tracking-[0.16em] text-brass uppercase">
            Getting started
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl leading-[1.05] font-semibold tracking-[-0.03em] text-ink sm:text-5xl">
            A case file for contested claims.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-steel">
            Libyano School keeps the source, the commentary, the rebuttals, and the citations in one
            record, so you can see what a claim actually rests on. This guide covers the public
            docket, the Quran library, the Editorial desk, and how to connect your own database.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              to="/cases"
              className="inline-flex items-center gap-1.5 border border-ink bg-ink px-4 py-2 text-[13px] font-medium text-paper transition-opacity hover:opacity-90"
            >
              Browse cases
              <ArrowRight className="size-3.5" />
            </Link>
            <Link
              to="/quran"
              className="inline-flex items-center gap-1.5 border border-rule bg-surface px-4 py-2 text-[13px] font-medium text-steel transition-colors hover:border-steel/50 hover:text-ink"
            >
              Open the Quran library
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-12 px-4 py-12 sm:px-6">
        <section aria-labelledby="start-here">
          <h2
            id="start-here"
            className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink"
          >
            Start here
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {startHere.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group border border-rule bg-surface p-4 transition-colors hover:border-steel/50"
                >
                  <span className="flex size-8 items-center justify-center border border-rule bg-surface-2 text-steel">
                    <Icon aria-hidden className="size-4" />
                  </span>
                  <h3 className="mt-3 font-display text-[15px] font-semibold text-ink">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-steel">{item.body}</p>
                  <span className="mt-3 inline-flex items-center gap-1 font-mono text-[9px] tracking-[0.08em] text-mist uppercase group-hover:text-brass">
                    Open
                    <ArrowRight className="size-3" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="reading-a-case">
          <h2
            id="reading-a-case"
            className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink"
          >
            Reading a case
          </h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-steel">
            Open a case from the docket. The workspace reads left to right: the claim, then its
            commentary, then the rebuttals, with the citation ledger underneath.
          </p>
          <ol className="mt-4 grid gap-3 sm:grid-cols-2">
            {caseParts.map((part, index) => (
              <li key={part.title} className="border border-rule bg-surface p-4">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center border border-ink bg-ink font-mono text-[10px] text-paper">
                    {index + 1}
                  </span>
                  <h3 className="font-display text-[14px] font-semibold text-ink">{part.title}</h3>
                </div>
                <p className="mt-2 text-[12.5px] leading-relaxed text-steel">{part.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-4 border border-rule bg-surface p-4">
            <h3 className="font-display text-[14px] font-semibold text-ink">
              What the statuses mean
            </h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-3">
              {statuses.map((status) => (
                <li key={status.label} className="flex items-start gap-2">
                  <span aria-hidden className={`mt-1 size-2 shrink-0 ${status.className}`} />
                  <span className="text-[12.5px] leading-relaxed text-steel">
                    <span className="font-medium text-ink">{status.label}.</span> {status.body}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="quran-library">
          <h2
            id="quran-library"
            className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink"
          >
            The Quran library
          </h2>
          <div className="mt-3 border border-rule bg-surface p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <Bookmark aria-hidden className="size-4 text-brass" />
              <h3 className="font-display text-[15px] font-semibold text-ink">
                Read, study, and return
              </h3>
            </div>
            <ul className="mt-3 space-y-2">
              {quranFeatures.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 text-[12.5px] leading-relaxed text-steel"
                >
                  <span aria-hidden className="mt-1.5 size-1.5 shrink-0 bg-brass" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="editorial-desk">
          <h2
            id="editorial-desk"
            className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink"
          >
            The Editorial desk
          </h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-steel">
            Editors sign in at <span className="font-mono text-[12px] text-ink">/admin</span> with
            the admin password. The desk is where the record is maintained.
          </p>
          <div className="mt-3 border border-rule bg-surface p-4">
            <ul className="space-y-2">
              {editorialFeatures.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 text-[12.5px] leading-relaxed text-steel"
                >
                  <FileText aria-hidden className="mt-0.5 size-3.5 shrink-0 text-steel" />
                  {feature}
                </li>
              ))}
            </ul>
            <Link
              to="/admin"
              className="mt-4 inline-flex items-center gap-1.5 border border-rule bg-surface px-3 py-1.5 text-[12px] font-medium text-steel transition-colors hover:border-steel/50 hover:text-ink"
            >
              <ShieldCheck aria-hidden className="size-3.5" />
              Open the Editorial desk
            </Link>
          </div>
        </section>

        <section id="connect" aria-labelledby="connect-database">
          <h2
            id="connect-database"
            className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink"
          >
            Connect your own Turso database
          </h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-steel">
            This deployment may run on a shared demo database. To use your own data, connect a Turso
            database you control. Credentials are validated server-side and stored in an encrypted,
            HttpOnly cookie; they are never written to localStorage.
          </p>
          <ol className="mt-4 grid gap-3 sm:grid-cols-2">
            {connectSteps.map((step, index) => (
              <li key={step.title} className="border border-rule bg-surface p-4">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center border border-ink bg-ink font-mono text-[10px] text-paper">
                    {index + 1}
                  </span>
                  <h3 className="font-display text-[14px] font-semibold text-ink">{step.title}</h3>
                </div>
                <p className="mt-2 text-[12.5px] leading-relaxed text-steel">{step.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap items-center gap-3 border border-rule bg-surface-2/50 p-4">
            <Database aria-hidden className="size-4 text-steel" />
            <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-steel">
              You need the admin password for the Editorial desk. If you do not have it, ask the
              deployment owner.
            </p>
            <Link
              to="/admin/database"
              className="inline-flex items-center gap-1.5 border border-ink bg-ink px-3 py-1.5 text-[12px] font-medium text-paper transition-opacity hover:opacity-90"
            >
              Open Database
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </section>

        <section aria-labelledby="more">
          <h2 id="more" className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink">
            Keep exploring
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Link
              to="/quran"
              className="flex items-center justify-between border border-rule bg-surface p-4 transition-colors hover:border-steel/50"
            >
              <span className="flex items-center gap-2 text-[13px] font-medium text-ink">
                <Library aria-hidden className="size-4 text-steel" />
                Quran library
              </span>
              <ArrowRight aria-hidden className="size-3.5 text-mist" />
            </Link>
            <Link
              to="/cases"
              className="flex items-center justify-between border border-rule bg-surface p-4 transition-colors hover:border-steel/50"
            >
              <span className="flex items-center gap-2 text-[13px] font-medium text-ink">
                <Scale aria-hidden className="size-4 text-steel" />
                The public docket
              </span>
              <ArrowRight aria-hidden className="size-3.5 text-mist" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
