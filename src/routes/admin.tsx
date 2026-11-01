import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Lock, Menu, Search, ShieldCheck, X } from "lucide-react";
import {
  AdminContext,
  seedData,
  useAdmin,
  type AdminData,
  type AdminStore,
} from "@/lib/admin-store";
import { getCorpus, resetCorpus } from "@/lib/corpus-api";
import { authState, login, logout } from "@/lib/auth-api";
import { Input } from "@/components/admin/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BrandMark } from "@/components/BrandMark";

const title = "Libyano School Editorial — Case management";
const description =
  "Manage cases, commentary, rebuttals, sources, and the taxonomy behind the Libyano School record.";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

const nav = [
  { to: "/admin", label: "Overview", exact: true },
  { to: "/admin/entries", label: "Cases" },
  { to: "/admin/commentaries", label: "Commentary" },
  { to: "/admin/rebuttals", label: "Rebuttals" },
  { to: "/admin/sources", label: "Sources" },
  { to: "/admin/requests", label: "Requests" },
  { to: "/admin/waitlist", label: "Access requests" },
  { to: "/admin/paths", label: "Reading paths" },
  { to: "/admin/taxonomy", label: "Taxonomy" },
  { to: "/admin/database", label: "Database" },
  { to: "/admin/activity", label: "Activity" },
] as const;

function AdminLayout() {
  const { data } = useQuery({ queryKey: ["corpus"], queryFn: getCorpus });
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [navOpen, setNavOpen] = useState(false);

  const { data: auth, isLoading: authLoading } = useQuery({
    queryKey: ["auth"],
    queryFn: authState,
    staleTime: 30_000,
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const mutate = useCallback(
    async (run: () => Promise<AdminData>) => {
      const next = await run();
      queryClient.setQueryData<AdminData>(["corpus"], next);
    },
    [queryClient],
  );

  const store: AdminStore = useMemo(
    () => ({
      data: data ?? seedData(),
      mutate,
      reset: () => mutate(resetCorpus),
    }),
    [data, mutate],
  );

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle || !data) return null;
    const hit = (value: string) => value.toLowerCase().includes(needle);
    return {
      entries: data.entries.filter(
        (entry) => hit(entry.title) || hit(entry.originalText) || hit(entry.reference),
      ),
      commentaries: data.commentaries.filter(
        (commentary) => hit(commentary.scholar) || hit(commentary.text) || hit(commentary.book),
      ),
      sources: data.sources.filter((source) => hit(source.label) || hit(source.detail)),
    };
  }, [q, data]);

  if (authLoading) {
    return <AdminLoading />;
  }

  if (!auth?.authed) {
    return <AdminLogin configured={auth?.configured ?? false} />;
  }

  return (
    <AdminContext.Provider value={store}>
      <div className="min-h-dvh w-full bg-canvas font-sans text-ink">
        {navOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <button
              aria-label="Close menu"
              onClick={() => setNavOpen(false)}
              className="absolute inset-0 bg-ink/30"
            />
            <div className="absolute inset-y-0 left-0 flex w-64 max-w-[85vw] flex-col border-r border-rule bg-surface px-4 py-5 shadow-xl">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2.5">
                  <BrandMark className="size-8 text-[11px]" />
                  <div>
                    <div className="font-sidebar text-[16px] leading-none font-bold tracking-[-0.02em]">
                      Libyano School
                    </div>
                    <div className="mt-1 font-mono text-[8.5px] text-mist">Editorial desk</div>
                  </div>
                </div>
                <button
                  onClick={() => setNavOpen(false)}
                  aria-label="Close menu"
                  className="p-2 text-steel transition-colors hover:bg-highlight hover:text-ink"
                >
                  <X className="size-4" />
                </button>
              </div>
              <AdminNav onNavigate={() => setNavOpen(false)} />
            </div>
          </div>
        )}

        <div className="flex min-h-dvh">
          <aside className="hidden w-60 shrink-0 flex-col border-r border-rule bg-surface md:flex">
            <div className="border-b border-rule px-5 py-5">
              <div className="flex items-center gap-2.5">
                <BrandMark className="size-8 text-[11px]" />
                <div>
                  <div className="font-display text-[16px] leading-none font-semibold">
                    Libyano School
                  </div>
                  <div className="mt-1 font-mono text-[8.5px] text-mist">Editorial desk</div>
                </div>
              </div>
            </div>
            <AdminNav />
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-20 border-b border-rule bg-canvas px-4 py-2.5 sm:px-6">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => setNavOpen(true)}
                  aria-label="Open menu"
                  className="p-2 text-ink transition-colors hover:bg-highlight md:hidden"
                >
                  <Menu className="size-5" />
                </button>

                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-mist" />
                  <Input
                    value={q}
                    onChange={(event) => setQ(event.target.value)}
                    placeholder="Search cases, sources, references…"
                    className="pl-9"
                    aria-label="Search the editorial desk"
                  />
                  {results && (
                    <div className="absolute top-full left-0 z-30 mt-2 max-h-80 w-full overflow-auto border border-rule bg-surface p-2 shadow-lg">
                      {results.entries.length +
                        results.commentaries.length +
                        results.sources.length ===
                      0 ? (
                        <p className="px-2 py-3 text-[12px] text-mist">No matches.</p>
                      ) : (
                        <>
                          <ResultGroup label="Cases" to="/admin/entries">
                            {results.entries.map((entry) => entry.title)}
                          </ResultGroup>
                          <ResultGroup label="Commentary" to="/admin/commentaries">
                            {results.commentaries.map(
                              (commentary) => `${commentary.scholar} — ${commentary.book}`,
                            )}
                          </ResultGroup>
                          <ResultGroup label="Sources" to="/admin/sources">
                            {results.sources.map((source) => source.label)}
                          </ResultGroup>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="ml-auto flex shrink-0 items-center gap-2">
                  <span className="hidden sm:inline-flex">
                    <ThemeToggle />
                  </span>
                  <Link
                    to="/admin/entries"
                    className="border border-ink bg-ink px-3 py-2 text-[12px] font-medium text-paper transition-opacity hover:opacity-90"
                  >
                    + New case
                  </Link>
                  <Link
                    to="/admin/sources"
                    className="hidden border border-rule bg-surface px-3 py-2 text-[12px] font-medium text-steel transition-colors hover:border-steel/50 hover:text-ink lg:inline-block"
                  >
                    + New source
                  </Link>
                </div>
              </div>
            </header>

            <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-7">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </AdminContext.Provider>
  );
}

function AdminLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-4 font-sans text-ink">
      <div className="w-full max-w-sm space-y-3 border border-rule bg-surface p-6">
        <div className="h-3 w-24 animate-pulse bg-surface-2" />
        <div className="h-8 w-full animate-pulse bg-surface-2" />
        <div className="h-8 w-2/3 animate-pulse bg-surface-2" />
      </div>
    </div>
  );
}

function AdminLogin({ configured }: { configured: boolean }) {
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: (value: string) => login({ data: value }),
    onSuccess: (result) => {
      if (result.ok) {
        setPassword("");
        setError(null);
        void queryClient.invalidateQueries({ queryKey: ["auth"] });
      } else {
        setError(
          result.reason === "not-configured"
            ? "Editorial access is not configured on this deployment."
            : "Incorrect password.",
        );
      }
    },
    onError: () => setError("Could not reach the server. Try again."),
  });

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-canvas px-4 font-sans text-ink">
      <div className="w-full max-w-sm border border-rule bg-surface p-8">
        <div className="flex items-center gap-3">
          <BrandMark className="size-10 text-[13px]" />
          <div>
            <div className="font-sidebar text-[17px] leading-none font-bold tracking-[-0.02em]">
              Libyano School
            </div>
            <div className="mt-1 font-mono text-[8.5px] text-mist">Editorial desk</div>
          </div>
        </div>

        <p className="mt-6 flex items-start gap-2 text-[13px] leading-relaxed text-steel">
          <Lock className="mt-0.5 size-3.5 shrink-0 text-brass" />
          This area is reserved for the editorial team. Enter the password to continue.
        </p>

        <form
          className="mt-5 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (password.trim()) submit.mutate(password);
          }}
        >
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Editorial password"
            autoFocus
            aria-label="Editorial password"
          />
          {error && <p className="text-[12px] text-dispute">{error}</p>}
          <button
            type="submit"
            disabled={submit.isPending || !password.trim()}
            className="w-full border border-ink bg-ink px-3 py-2.5 text-[13px] font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {submit.isPending ? "Signing in…" : "Enter the editorial desk"}
          </button>
        </form>

        <Link
          to="/cases"
          className="mt-5 flex items-center justify-center gap-1 text-[12px] text-mist transition-colors hover:text-ink"
        >
          Back to the public docket
          <ArrowUpRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}

function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const { reset } = useAdmin();
  const queryClient = useQueryClient();
  const signOut = useMutation({
    mutationFn: () => logout(),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["auth"] }),
  });
  return (
    <>
      <nav aria-label="Editorial sections" className="mt-4 flex-1 space-y-0.5 overflow-y-auto px-3">
        {nav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: "exact" in item ? item.exact : false }}
            activeProps={{ className: "bg-ink text-paper" }}
            inactiveProps={{ className: "text-steel hover:bg-highlight hover:text-ink" }}
            onClick={onNavigate}
            className="block px-3 py-2 font-sidebar text-[11px] font-semibold tracking-[-0.02em] transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto space-y-1.5 border-t border-rule p-3">
        <div className="flex items-center justify-between px-1 pb-2">
          <span className="text-[11px] text-mist">Theme</span>
          <ThemeToggle />
        </div>
        <Link
          to="/cases"
          onClick={onNavigate}
          className="flex items-center justify-between border border-rule bg-surface px-3 py-2 text-[12px] text-steel transition-colors hover:border-steel/50 hover:text-ink"
        >
          Public docket
          <ArrowUpRight className="size-3.5" />
        </Link>
        <button
          onClick={() => signOut.mutate()}
          className="w-full border border-rule bg-surface px-3 py-2 text-left text-[12px] text-steel transition-colors hover:border-steel/50 hover:text-ink"
        >
          Sign out
        </button>
        <button
          onClick={() => reset()}
          className="flex w-full items-center gap-1.5 px-3 py-2 text-left font-mono text-[9.5px] text-mist transition-colors hover:bg-highlight hover:text-ink"
        >
          <ShieldCheck className="size-3.5" />
          Reset to sample docket
        </button>
      </div>
    </>
  );
}

function ResultGroup({
  label,
  to,
  children,
}: {
  label: string;
  to: "/admin/entries" | "/admin/commentaries" | "/admin/sources";
  children: string[];
}) {
  if (children.length === 0) return null;
  return (
    <div className="mb-1">
      <div className="px-2 pt-1.5 pb-1 font-mono text-[9px] text-mist">{label}</div>
      {children.slice(0, 5).map((text, index) => (
        <Link
          key={`${label}-${index}`}
          to={to}
          className="block truncate px-2 py-1.5 text-[12.5px] text-ink transition-colors hover:bg-highlight"
        >
          {text}
        </Link>
      ))}
    </div>
  );
}
