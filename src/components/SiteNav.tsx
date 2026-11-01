import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Menu, ShieldCheck, X } from "lucide-react";
import { siteNavItems } from "@/lib/nav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BrandMark } from "@/components/BrandMark";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/brand";

export function SiteNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const close = () => setOpen(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-rule bg-canvas">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
          <Link to="/" className="group flex min-w-0 items-center gap-2.5" onClick={close}>
            <BrandMark className="size-8 text-[11px]" />
            <span className="font-display text-[16px] leading-none font-semibold tracking-[-0.02em] text-ink sm:text-[18px]">
              {SITE_NAME}
            </span>
          </Link>

          <span aria-hidden className="mx-2 hidden h-5 w-px bg-rule sm:block" />

          <nav aria-label="Primary" className="hidden items-center gap-0.5 sm:flex">
            {siteNavItems.slice(1).map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                activeProps={{ className: "bg-surface-2 text-ink", "aria-current": "page" }}
                inactiveProps={{ className: "text-steel hover:bg-highlight hover:text-ink" }}
                className="px-2.5 py-1.5 text-[13px] font-medium transition-colors"
              >
                {item.label}
              </Link>
            ))}
            <a
              href="/#mechanism"
              className="px-2.5 py-1.5 text-[13px] font-medium text-steel transition-colors hover:bg-highlight hover:text-ink"
            >
              How it works
            </a>
            <a
              href="/#access"
              className="px-2.5 py-1.5 text-[13px] font-medium text-steel transition-colors hover:bg-highlight hover:text-ink"
            >
              Access
            </a>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden sm:inline-flex">
              <ThemeToggle />
            </span>
            <Link
              to="/admin"
              className="hidden items-center gap-1.5 border border-rule bg-surface px-2.5 py-1.5 text-[12px] font-medium text-steel transition-colors hover:border-steel/50 hover:text-ink sm:inline-flex"
            >
              <ShieldCheck className="size-3.5" />
              Editorial
            </Link>
            <a
              href="/#access"
              className="hidden items-center gap-1.5 border border-ink bg-ink px-3 py-1.5 text-[12px] font-medium text-paper transition-opacity hover:opacity-90 sm:inline-flex"
            >
              Request access
              <ArrowRight className="size-3.5" />
            </a>
            <button
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              aria-expanded={open}
              className="p-2 text-ink transition-colors hover:bg-highlight sm:hidden"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <button aria-label="Close menu" onClick={close} className="absolute inset-0 bg-ink/30" />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-rule bg-surface px-5 py-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BrandMark className="size-8 text-[11px]" />
                <div>
                  <div className="font-display text-[18px] leading-none font-semibold">
                    {SITE_NAME}
                  </div>
                  <div className="mt-1 font-mono text-[9px] tracking-[0.02em] text-mist">
                    {SITE_TAGLINE}
                  </div>
                </div>
              </div>
              <button
                onClick={close}
                aria-label="Close menu"
                className="p-2 text-steel transition-colors hover:bg-highlight hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </div>

            <nav aria-label="Mobile" className="mt-7 space-y-0.5">
              {siteNavItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={close}
                  activeOptions={{ exact: item.to === "/" }}
                  activeProps={{ className: "bg-surface-2 text-ink", "aria-current": "page" }}
                  inactiveProps={{ className: "text-steel hover:bg-highlight hover:text-ink" }}
                  className="flex min-h-11 items-center px-3 py-2 text-[14px] font-medium transition-colors"
                >
                  {item.label}
                </Link>
              ))}
              <a
                href="/#mechanism"
                onClick={close}
                className="flex min-h-11 items-center px-3 py-2 text-[14px] font-medium text-steel transition-colors hover:bg-highlight hover:text-ink"
              >
                How it works
              </a>
              <a
                href="/#access"
                onClick={close}
                className="flex min-h-11 items-center px-3 py-2 text-[14px] font-medium text-steel transition-colors hover:bg-highlight hover:text-ink"
              >
                Access
              </a>
            </nav>

            <Link
              to="/admin"
              onClick={close}
              className="mt-3 flex min-h-11 items-center justify-between border border-rule px-3 py-2 text-[13px] font-medium text-steel transition-colors hover:border-steel/50 hover:text-ink"
            >
              Editorial
              <ShieldCheck className="size-4" />
            </Link>

            <div className="mt-auto space-y-3 border-t border-rule pt-4">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-mist">Theme</span>
                <ThemeToggle />
              </div>
              <p className="font-mono text-[9px] leading-relaxed text-mist">
                Press <kbd className="border border-rule bg-surface-2 px-1">f</kbd> in a case for
                focus mode.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
