import type { ReactNode } from "react";

export function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`overflow-hidden border border-rule bg-surface ${className}`}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 border-b border-rule bg-surface-2/40 px-5 py-3.5">
          <div className="min-w-0">
            {title && (
              <h2 className="font-display text-[15px] leading-tight font-semibold text-ink">
                {title}
              </h2>
            )}
            {subtitle && <p className="mt-0.5 text-[12px] text-mist">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[11px] font-medium text-steel">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-[11px] leading-relaxed text-mist">{hint}</p>}
    </label>
  );
}

const control =
  "w-full border border-rule bg-surface-2 px-3 py-2 text-[13px] text-ink outline-none transition-colors placeholder:text-mist focus:border-steel/50 focus:bg-surface disabled:opacity-50";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${control} ${props.className ?? ""}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${control} leading-relaxed ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${control} ${props.className ?? ""}`} />;
}

export function Button({
  variant = "solid",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "solid" | "ghost" | "danger" }) {
  const styles =
    variant === "solid"
      ? "bg-ink text-paper border border-ink hover:opacity-90"
      : variant === "danger"
        ? "bg-destructive/8 text-destructive border border-destructive/25 hover:bg-destructive/12"
        : "bg-surface text-steel border border-rule hover:border-steel/50 hover:text-ink";
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[12px] font-medium transition-colors disabled:opacity-40 ${styles} ${className}`}
    />
  );
}

export function TagPicker({
  options,
  value,
  onChange,
  onCreate,
}: {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  onCreate?: (tag: string) => void;
}) {
  const toggle = (tag: string) =>
    onChange(value.includes(tag) ? value.filter((item) => item !== tag) : [...value, tag]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {options.map((tag) => {
          const on = value.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              aria-pressed={on}
              className={`border px-2.5 py-1 font-mono text-[10px] transition-colors ${
                on
                  ? "border-ink bg-ink text-paper"
                  : "border-rule bg-surface text-steel hover:border-steel/50 hover:text-ink"
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>
      {onCreate && (
        <input
          placeholder="New tag, then press Enter"
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            const next = event.currentTarget.value.trim();
            if (!next) return;
            onCreate(next);
            if (!value.includes(next)) onChange([...value, next]);
            event.currentTarget.value = "";
          }}
          className={control}
        />
      )}
    </div>
  );
}

export function Stat({
  label,
  value,
  note,
  tone = "neutral",
}: {
  label: string;
  value: number;
  note?: string;
  tone?: "neutral" | "verify" | "dispute" | "unv";
}) {
  const dot =
    tone === "verify"
      ? "bg-verify"
      : tone === "dispute"
        ? "bg-dispute"
        : tone === "unv"
          ? "bg-unv"
          : "bg-ink";
  return (
    <div className="border border-rule bg-surface px-5 py-4">
      <div className="flex items-center gap-2">
        <span aria-hidden className={`size-1.5 rounded-full ${dot}`} />
        <div className="font-mono text-[9px] text-mist">{label}</div>
      </div>
      <div className="mt-1.5 font-display text-[32px] leading-none font-semibold text-ink tabular-nums">
        {value}
      </div>
      {note && <div className="mt-1.5 text-[11px] leading-snug text-mist">{note}</div>}
    </div>
  );
}

export function EmptyRow({ children }: { children: ReactNode }) {
  return (
    <p className="border border-dashed border-rule px-3 py-6 text-center text-[12px] text-mist">
      {children}
    </p>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-rule pb-4">
      <div className="min-w-0">
        <h1 className="font-display text-[24px] leading-tight font-semibold tracking-[-0.02em] text-ink">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-mist">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
