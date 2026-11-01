import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { type ReactNode } from "react";

import { DemoBanner } from "@/components/DemoBanner";
import { SiteNav } from "@/components/SiteNav";
import { themeInitScript } from "@/lib/theme";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="max-w-md border border-rule bg-surface px-8 py-10 text-center">
        <p className="font-mono text-[11px] tracking-[0.14em] text-mist">No. 404</p>
        <h1 className="mt-3 font-display text-4xl leading-none font-semibold tracking-[-0.03em] text-ink">
          Not on the docket
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-steel">
          This case or page is not in the record. It may have been moved or withdrawn.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center border border-ink bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90"
          >
            Back to the docket
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="max-w-md border border-rule bg-surface px-8 py-10 text-center">
        <p className="font-mono text-[11px] tracking-[0.14em] text-mist">Record error</p>
        <h1 className="mt-3 font-display text-3xl leading-tight font-semibold tracking-[-0.02em] text-ink">
          The record didn't load
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-steel">
          Something went wrong on our end. Try again, or return to the docket.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center border border-ink bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center border border-rule bg-surface px-4 py-2 text-sm font-medium text-steel transition-colors hover:border-steel/50 hover:text-ink"
          >
            Back to the docket
          </a>
        </div>
      </div>
    </div>
  );
}

const description =
  "A case file for contested claims. Read the source, read the commentary, compare the rebuttals, and see what the citations support.";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Docket — Argument, on the record" },
      { name: "description", content: description },
      { property: "og:title", content: "Docket — Argument, on the record" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/og-docket.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "/og-docket.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=Literata:ital,opsz,wght@0,7..72,200..900;1,7..72,200..900&family=Martian+Mono:wght@100..800&family=Public+Sans:ital,wght@0,100..900;1,100..900&family=Unbounded:wght@400..700&family=Noto+Naskh+Arabic:wght@400..700&family=Amiri:ital,wght@0,400;0,700;1,400&family=Noto+Serif+Hebrew:wght@100..900&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isAdmin = pathname.startsWith("/admin");

  return (
    <QueryClientProvider client={queryClient}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:border focus:border-ink focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-paper"
      >
        Skip to content
      </a>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      {isAdmin ? null : <DemoBanner />}
      {isAdmin ? null : <SiteNav />}
      <div id="main" tabIndex={-1} className="outline-none">
        <Outlet />
      </div>
    </QueryClientProvider>
  );
}
