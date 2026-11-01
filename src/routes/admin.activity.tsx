import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getAuditLog } from "@/lib/corpus-api";
import { EmptyRow, Panel } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/activity")({
  head: () => ({
    meta: [
      { title: "Editorial activity — Libyano School Editorial" },
      {
        name: "description",
        content: "A running audit trail of every edit made to the Libyano School record.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ActivityPage,
});

const actionStyle: Record<string, string> = {
  upsert: "bg-verify/10 text-verify ring-verify/25",
  delete: "bg-destructive/10 text-destructive ring-destructive/25",
  approve: "bg-verify/10 text-verify ring-verify/25",
  dismiss: "bg-surface text-unv ring-unv/25",
  create: "bg-dispute/10 text-dispute ring-dispute/25",
  rename: "bg-dispute/10 text-dispute ring-dispute/25",
};

function ActivityPage() {
  const { data } = useQuery({
    queryKey: ["audit-log"],
    queryFn: () => getAuditLog({ data: 200 }),
  });

  const entries = data ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="font-display text-2xl leading-tight font-semibold tracking-[-0.02em]">
          Editorial activity
        </h1>
        <p className="mt-1 text-[13px] text-mist">
          Every mutation to the record is recorded here, newest first.
        </p>
      </div>

      <Panel title="Audit trail" subtitle={`${entries.length} recent events`}>
        {entries.length === 0 ? (
          <EmptyRow>No activity recorded yet.</EmptyRow>
        ) : (
          <ul className="space-y-1.5">
            {entries.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-rule py-2 last:border-b-0"
              >
                <span className="font-mono text-[10px] text-mist">
                  {new Date(e.at).toLocaleString()}
                </span>
                <span
                  className={`border px-2 py-0.5 font-mono text-[9.5px] ${
                    actionStyle[e.action] ?? "bg-surface text-steel ring-rule"
                  }`}
                >
                  {e.action}
                </span>
                <span className="font-mono text-[9px] text-mist">{e.entity}</span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink">{e.summary}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
