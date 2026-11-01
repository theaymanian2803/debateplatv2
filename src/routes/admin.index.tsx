import { createFileRoute, Link } from "@tanstack/react-router";
import { useAdmin } from "@/lib/admin-store";
import { Panel, Stat } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Editorial overview — Libyano School Editorial" },
      {
        name: "description",
        content:
          "Case totals, recent editorial activity, and quick actions for the Libyano School record.",
      },
      { property: "og:title", content: "Editorial overview — Libyano School Editorial" },
      {
        property: "og:description",
        content: "Case totals and quick actions for the Libyano School record.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Overview,
});

function Overview() {
  const { data } = useAdmin();
  const verses = data.entries.filter((e) => e.kind === "verse").length;
  const premises = data.entries.length - verses;
  const pending = data.sources.filter((s) => s.status !== "verified").length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-2xl leading-tight font-semibold tracking-[-0.02em]">
          Editorial overview
        </h1>
        <p className="mt-1 text-[13px] text-mist">
          Everything in the record at a glance. Changes are saved to the editorial database.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Cases"
          value={data.entries.length}
          note={`${verses} texts · ${premises} claims`}
        />
        <Stat label="Commentary" value={data.commentaries.length} note="Across all scholars" />
        <Stat label="Rebuttals" value={data.rebuttals.length} note="Arguments on file" />
        <Stat label="Sources" value={data.sources.length} note={`${pending} awaiting review`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Recent cases" subtitle="Newest first">
          <ul className="divide-y divide-rule">
            {data.entries
              .slice()
              .reverse()
              .slice(0, 5)
              .map((e) => (
                <li key={e.id} className="py-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-display text-[14px] font-semibold text-ink">
                      {e.title}
                    </span>
                    <span className="shrink-0 font-mono text-[9px] text-mist">{e.category}</span>
                  </div>
                  <p className="mt-0.5 truncate text-[12px] text-mist">{e.reference}</p>
                </li>
              ))}
          </ul>
        </Panel>

        <Panel title="Quick actions">
          <div className="grid gap-2">
            <Link
              to="/admin/entries"
              className="border border-ink bg-ink px-3 py-2.5 text-center text-[12.5px] font-medium text-paper hover:opacity-90"
            >
              Add a case
            </Link>
            <Link
              to="/admin/commentaries"
              className="border border-rule bg-surface px-3 py-2.5 text-center text-[12.5px] text-steel hover:border-steel/50 hover:text-ink"
            >
              Attach commentary
            </Link>
            <Link
              to="/admin/rebuttals"
              className="border border-rule bg-surface px-3 py-2.5 text-center text-[12.5px] text-steel hover:border-steel/50 hover:text-ink"
            >
              Record a rebuttal
            </Link>
            <Link
              to="/admin/sources"
              className="border border-rule bg-surface px-3 py-2.5 text-center text-[12.5px] text-steel hover:border-steel/50 hover:text-ink"
            >
              Register a source
            </Link>
            <Link
              to="/admin/taxonomy"
              className="border border-rule bg-surface px-3 py-2.5 text-center text-[12.5px] text-steel hover:border-steel/50 hover:text-ink"
            >
              Organise taxonomy
            </Link>
          </div>
        </Panel>
      </div>
    </div>
  );
}
