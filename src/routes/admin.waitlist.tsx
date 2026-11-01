import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy, Mail, Users } from "lucide-react";
import { useState } from "react";
import { listWaitlist } from "@/lib/corpus-api";
import { EmptyRow, Panel, Stat } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/waitlist")({
  head: () => ({
    meta: [
      { title: "Access requests — Libyano School Editorial" },
      {
        name: "description",
        content: "Early-access requests for Libyano School researcher and institution plans.",
      },
      { property: "og:title", content: "Access requests — Libyano School Editorial" },
      { property: "og:description", content: "Early-access requests for Libyano School." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WaitlistPage,
});

const roleLabel: Record<string, string> = {
  researcher: "Researcher",
  student: "Student",
  editor: "Editor / publisher",
  institution: "Institution",
  other: "Other",
};

function WaitlistPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["waitlist"],
    queryFn: () => listWaitlist({ data: 200 }),
  });
  const [copied, setCopied] = useState(false);

  const entries = data ?? [];
  const institutions = entries.filter((e) => e.role === "institution").length;
  const editors = entries.filter((e) => e.role === "editor").length;

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(entries.map((e) => e.email).join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[24px] leading-tight font-semibold tracking-[-0.02em]">
            Access requests
          </h1>
          <p className="mt-1 text-[12.5px] leading-relaxed text-mist">
            Early-access requests from the landing page. Invite researchers and institutions in
            small cohorts.
          </p>
        </div>
        {entries.length > 0 && (
          <button
            onClick={copyAll}
            className="inline-flex items-center gap-1.5 border border-rule bg-surface px-3 py-1.5 text-[12px] font-medium text-steel transition-colors hover:border-steel/50 hover:text-ink"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy emails"}
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Requests" value={entries.length} note="All time" />
        <Stat label="Institutions" value={institutions} note="Highest-touch cohort" tone="verify" />
        <Stat
          label="Editors"
          value={editors}
          note="Publishers and editorial teams"
          tone="dispute"
        />
      </div>

      <Panel
        title="Access requests"
        subtitle={isLoading ? "Loading…" : `${entries.length} on the list`}
        action={
          <span className="flex items-center gap-1.5 font-mono text-[9.5px] text-mist">
            <Users className="size-3.5" />
            newest first
          </span>
        }
      >
        {entries.length === 0 ? (
          <EmptyRow>No early-access requests yet.</EmptyRow>
        ) : (
          <ul className="divide-y divide-rule">
            {entries.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <span className="flex size-7 shrink-0 items-center justify-center border border-rule bg-surface-2 text-mist">
                  <Mail className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink">
                  {entry.email}
                </span>
                <span className="border border-rule bg-surface-2 px-2 py-0.5 font-mono text-[9.5px] text-steel">
                  {roleLabel[entry.role] ?? entry.role ?? "Reader"}
                </span>
                <span className="font-mono text-[9.5px] text-mist">
                  {new Date(entry.createdAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
