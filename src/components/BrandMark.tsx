export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`relative flex shrink-0 items-center justify-center overflow-hidden border border-ink bg-ink font-display font-semibold tracking-[-0.05em] text-paper ${className}`}
    >
      <span className="absolute inset-x-0 top-0 h-[3px] bg-brass" />
      <span className="mt-0.5">LS</span>
    </span>
  );
}
