import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, Database, Eye, EyeOff, ShieldCheck, Trash2 } from "lucide-react";
import { clearDbConfig, getDbConfigStatus, saveDbConfig } from "@/lib/db-config-api";
import { clearSessionCache } from "@/lib/session-reset";
import { Button, Field, Input, PageHeader, Panel } from "@/components/admin/ui";

const title = "Database — Libyano School Editorial";
const description =
  "Configure the Turso database used by this Editorial desk. Credentials are encrypted server-side.";

export const Route = createFileRoute("/admin/database")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DatabasePage,
});

function DatabasePage() {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: status, isLoading } = useQuery({
    queryKey: ["db-config"],
    queryFn: getDbConfigStatus,
  });

  const resetAndReload = () => {
    queryClient.clear();
    clearSessionCache();
    window.location.reload();
  };

  const save = useMutation({
    mutationFn: () => saveDbConfig({ data: { url, token } }),
    onSuccess: (result) => {
      if (result.ok) {
        resetAndReload();
      } else {
        setError(result.error ?? "Could not save the configuration.");
      }
    },
    onError: () => setError("Could not reach the server. Try again."),
  });

  const remove = useMutation({
    mutationFn: () => clearDbConfig(),
    onSuccess: () => resetAndReload(),
    onError: () => setError("Could not remove the configuration. Try again."),
  });

  const sourceLabel =
    status?.source === "browser"
      ? "Browser configuration"
      : status?.source === "environment"
        ? "Environment configuration"
        : "Not configured";

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PageHeader
        title="Database connection"
        description="Set the Turso database for this Editorial desk. The token is validated server-side and stored in an encrypted, HttpOnly cookie — never in localStorage."
      />

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Panel title="Current connection" subtitle={isLoading ? "Checking…" : sourceLabel}>
          <div className="space-y-4">
            <div className="flex items-start gap-3 border border-rule bg-surface-2/50 p-4">
              <span className="flex size-9 shrink-0 items-center justify-center border border-rule bg-surface text-steel">
                <Database className="size-4" />
              </span>
              <div className="min-w-0">
                <div className="font-display text-[14px] font-semibold text-ink">
                  {status?.configured ? (status.host ?? "Configured") : "No database configured"}
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-mist">
                  {status?.source === "browser"
                    ? "Using the credentials saved in this browser. Environment values are ignored while this configuration is present."
                    : status?.source === "environment"
                      ? "Using deployment environment variables. Saving here overrides them for this browser."
                      : "No environment credentials found. Add a Turso URL and token below to connect."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 border border-rule bg-surface px-2 py-1 font-mono text-[9px] text-steel">
                <ShieldCheck className="size-3 text-verify" />
                Encrypted cookie
              </span>
              <span className="inline-flex items-center gap-1.5 border border-rule bg-surface px-2 py-1 font-mono text-[9px] text-steel">
                HttpOnly · not readable by scripts
              </span>
            </div>

            {status?.source === "browser" && (
              <div className="border-t border-rule pt-3">
                <Button
                  variant="ghost"
                  onClick={() => remove.mutate()}
                  disabled={remove.isPending}
                  className="text-destructive"
                >
                  <Trash2 className="size-3.5" />
                  {remove.isPending ? "Removing…" : "Remove browser configuration"}
                </Button>
                <p className="mt-1.5 text-[11px] leading-relaxed text-mist">
                  Removes the stored credentials, resets the database client, and falls back to
                  environment variables.
                </p>
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Security notes">
          <ul className="space-y-2.5 text-[12px] leading-relaxed text-steel">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-verify" />
              Credentials are validated with a live database connection before they are saved.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-verify" />
              The token is encrypted with AES-256-GCM and stored in an HttpOnly, SameSite=Strict
              cookie.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-verify" />
              The token is never returned to this page and never written to localStorage.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-verify" />
              Saving clears the cached case data, resets the client, and reloads the app.
            </li>
          </ul>
        </Panel>
      </div>

      <Panel
        title={status?.source === "browser" ? "Replace configuration" : "Connect a database"}
        subtitle="The form is submitted to the server; the credentials are not stored by the browser form."
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            if (url.trim() && token.trim()) save.mutate();
          }}
        >
          <Field label="Turso database URL" hint="For example libsql://your-database.turso.io">
            <Input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="libsql://your-database.turso.io"
              autoComplete="off"
              spellCheck={false}
            />
          </Field>

          <Field
            label="Auth token"
            hint="The token is sent to the server and encrypted immediately."
          >
            <div className="flex gap-1.5">
              <Input
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="Paste the Turso auth token"
                autoComplete="new-password"
                spellCheck={false}
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowToken((value) => !value)}
                aria-label={showToken ? "Hide token" : "Show token"}
                className="shrink-0"
              >
                {showToken ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </Button>
            </div>
          </Field>

          {error && <p className="text-[12px] leading-relaxed text-destructive">{error}</p>}

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={save.isPending || !url.trim() || !token.trim()}>
              {save.isPending ? "Testing connection…" : "Test and save"}
            </Button>
            <span className="text-[11px] text-mist">
              Saving clears cached session data and reloads the app.
            </span>
          </div>
        </form>
      </Panel>
    </div>
  );
}
