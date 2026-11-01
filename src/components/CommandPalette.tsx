import { useMemo } from "react";
import {
  BookOpen,
  FileSearch,
  Focus,
  Home,
  Link2,
  Moon,
  PanelRight,
  Printer,
  Share2,
  ShieldCheck,
  Sun,
  Trash2,
  Waypoints,
} from "lucide-react";
import type { Entry } from "@/lib/corpus";
import { allCitations } from "@/lib/corpus";
import { docketNo, recordGroupLabel } from "@/lib/docket";
import { rulingFor, rulingLabel } from "@/lib/rulings";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: Entry[];
  theme: "light" | "dark";
  onSelectEntry: (id: string) => void;
  onOpenCitations: (id?: string) => void;
  onOpenMap: () => void;
  onShare: () => void;
  onPrint: () => void;
  onCopyLink: () => void;
  onToggleTheme: () => void;
  onClearFilters: () => void;
  onNavigate: (path: "/" | "/cases" | "/quran" | "/admin") => void;
};

const itemClass =
  "rounded-none px-2.5 py-2 text-[12px] data-[selected=true]:bg-highlight data-[selected=true]:text-ink";
const groupClass =
  "p-1.5 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-sidebar [&_[cmdk-group-heading]]:text-[9px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-[-0.02em] [&_[cmdk-group-heading]]:text-mist";

export function CommandPalette({
  open,
  onOpenChange,
  entries,
  theme,
  onSelectEntry,
  onOpenCitations,
  onOpenMap,
  onShare,
  onPrint,
  onCopyLink,
  onToggleTheme,
  onClearFilters,
  onNavigate,
}: CommandPaletteProps) {
  const citations = useMemo(() => {
    const seen = new Set<string>();
    const items: { citation: ReturnType<typeof allCitations>[number]; entry: Entry }[] = [];
    for (const entry of entries) {
      for (const citation of allCitations(entry)) {
        if (seen.has(citation.detail)) continue;
        seen.add(citation.detail);
        items.push({ citation, entry });
      }
    }
    return items;
  }, [entries]);

  const run = (action: () => void) => {
    onOpenChange(false);
    action();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[640px] gap-0 overflow-hidden border-rule bg-surface p-0 sm:rounded-none">
        <DialogTitle className="sr-only">Command menu</DialogTitle>
        <DialogDescription className="sr-only">
          Search cases, citations, and actions.
        </DialogDescription>
        <Command className="rounded-none bg-surface">
          <CommandInput
            autoFocus
            placeholder="Search cases, citations, or actions…"
            className="h-12 rounded-none text-[14px] text-ink placeholder:text-mist"
          />
          <CommandList className="max-h-[60vh]">
            <CommandEmpty className="px-4 py-6 text-[12px] text-mist">
              No cases, citations, or actions match.
            </CommandEmpty>

            <CommandGroup heading="Cases" className={groupClass}>
              {entries.map((entry) => (
                <CommandItem
                  key={entry.id}
                  value={`${entry.title} ${entry.subtitle} ${entry.breadcrumb}`}
                  keywords={[entry.id, entry.collection]}
                  onSelect={() => run(() => onSelectEntry(entry.id))}
                  className={itemClass}
                >
                  <BookOpen className="size-3.5 shrink-0 text-mist" />
                  <span className="min-w-0 flex-1 truncate">{entry.title}</span>
                  <span className="shrink-0 font-mono text-[9px] text-mist">
                    {rulingLabel(rulingFor(entry))}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandGroup heading="Citations" className={groupClass}>
              {citations.map(({ citation, entry }) => (
                <CommandItem
                  key={`${entry.id}-${citation.id}`}
                  value={`${citation.label} ${citation.detail} ${citation.archive}`}
                  keywords={[entry.title, entry.id]}
                  onSelect={() => run(() => onOpenCitations(entry.id))}
                  className={itemClass}
                >
                  <FileSearch className="size-3.5 shrink-0 text-mist" />
                  <span className="min-w-0 flex-1 truncate">
                    {citation.label}
                    <span className="ml-1.5 text-mist">— {citation.detail}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[9px] text-mist">{entry.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandGroup heading="Actions" className={groupClass}>
              <CommandItem
                onSelect={() => run(onShare)}
                className={itemClass}
                value="share cite citation permalink snapshot"
              >
                <Share2 className="size-3.5 shrink-0 text-mist" />
                Share & cite
                <CommandShortcut>Share</CommandShortcut>
              </CommandItem>
              <CommandItem
                onSelect={() => run(onPrint)}
                className={itemClass}
                value="print pdf save paper"
              >
                <Printer className="size-3.5 shrink-0 text-mist" />
                Print / Save PDF
              </CommandItem>
              <CommandItem
                onSelect={() => run(() => onOpenCitations())}
                className={itemClass}
                value="open citations sources authorities"
              >
                <PanelRight className="size-3.5 shrink-0 text-mist" />
                Open citations
              </CommandItem>
              <CommandItem
                onSelect={() => run(onOpenMap)}
                className={itemClass}
                value="open argument map chain"
              >
                <Waypoints className="size-3.5 shrink-0 text-mist" />
                Open argument map
              </CommandItem>
              <CommandItem
                onSelect={() => run(onCopyLink)}
                className={itemClass}
                value="copy link url"
              >
                <Link2 className="size-3.5 shrink-0 text-mist" />
                Copy case link
              </CommandItem>
              <CommandItem
                onSelect={() => run(onToggleTheme)}
                className={itemClass}
                value="toggle theme light dark"
              >
                {theme === "dark" ? (
                  <Sun className="size-3.5 shrink-0 text-mist" />
                ) : (
                  <Moon className="size-3.5 shrink-0 text-mist" />
                )}
                Switch to {theme === "dark" ? "light" : "dark"} theme
              </CommandItem>
              <CommandItem
                onSelect={() => run(onClearFilters)}
                className={itemClass}
                value="clear filters reset search"
              >
                <Trash2 className="size-3.5 shrink-0 text-mist" />
                Clear filters
              </CommandItem>
              <CommandItem
                onSelect={() => run(() => onNavigate("/quran"))}
                className={itemClass}
                value="go to quran library"
              >
                <Home className="size-3.5 shrink-0 text-mist" />
                Go to Quran library
              </CommandItem>
              <CommandItem
                onSelect={() => run(() => onNavigate("/admin"))}
                className={itemClass}
                value="go to editorial desk admin registry"
              >
                <ShieldCheck className="size-3.5 shrink-0 text-mist" />
                Go to Editorial desk
              </CommandItem>
              <CommandItem
                onSelect={() => run(() => onNavigate("/cases"))}
                className={itemClass}
                value="go to cases docket"
              >
                <Focus className="size-3.5 shrink-0 text-mist" />
                Go to cases
              </CommandItem>
              <CommandItem
                onSelect={() => run(() => onNavigate("/"))}
                className={itemClass}
                value="go to home landing"
              >
                <Home className="size-3.5 shrink-0 text-mist" />
                Go to home
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
