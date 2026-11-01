import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { FlaskConical, X } from "lucide-react";
import { getDemoMode } from "@/lib/site-status";

const DISMISS_KEY = "docket-demo-banner-dismissed";

export function DemoBanner() {
  const { data } = useQuery({
    queryKey: ["demo-mode"],
    queryFn: getDemoMode,
    staleTime: Infinity,
    retry: false,
  });
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (!data?.demo || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* Storage can be unavailable in private modes. */
    }
  };

  return (
    <div role="region" aria-label="Demo notice" className="border-b border-brass/40 bg-highlight">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-3 gap-y-1 px-4 py-1.5 text-[11.5px] leading-snug sm:px-6">
        <span className="inline-flex items-center gap-1.5 font-mono text-[9px] tracking-[0.12em] text-brass uppercase">
          <FlaskConical aria-hidden className="size-3" />
          Demo data
        </span>
        <span className="text-steel">
          This site runs on a shared demo Turso database. Connect your own to use your own data.
        </span>
        <Link
          to="/welcome"
          className="font-medium text-ink underline underline-offset-2 hover:text-brass"
        >
          How it works
        </Link>
        <Link
          to="/admin/database"
          className="font-medium text-ink underline underline-offset-2 hover:text-brass"
        >
          Connect database
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss demo notice"
          className="ml-auto p-1 text-steel transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <X aria-hidden className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
