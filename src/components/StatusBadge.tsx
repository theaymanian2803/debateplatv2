import type { Verification } from "@/lib/corpus";
import { rulingLabel, rulingStatus, verificationLabel, type Ruling } from "@/lib/rulings";

const tag: Record<Verification, string> = {
  verified: "border-verify/40 bg-verify/10 text-verify",
  disputed: "border-dispute/40 bg-dispute/10 text-dispute",
  unverified: "border-unv/40 bg-unv/10 text-unv",
};

const stamp: Record<Ruling, string> = {
  sustained: "border-verify text-verify",
  contested: "border-dispute text-dispute",
  unresolved: "border-unv text-unv",
  unreviewed: "border-steel text-steel",
};

const dot: Record<Verification, string> = {
  verified: "bg-verify",
  disputed: "bg-dispute",
  unverified: "bg-unv",
};

export function StatusBadge({
  status,
  label,
  className = "",
}: {
  status: Verification;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 border px-1.5 py-0.5 font-mono text-[10px] tracking-[0.01em] ${tag[status]} ${className}`}
    >
      <span className={`size-1.5 shrink-0 rounded-full ${dot[status]}`} />
      {label ?? verificationLabel(status)}
    </span>
  );
}

export function RulingTag({ ruling, className = "" }: { ruling: Ruling; className?: string }) {
  const status = rulingStatus(ruling);
  if (!status) {
    return (
      <span
        className={`inline-flex shrink-0 items-center gap-1.5 border border-steel/40 bg-steel/10 px-1.5 py-0.5 font-mono text-[10px] tracking-[0.01em] text-steel ${className}`}
      >
        <span className="size-1.5 shrink-0 rounded-full bg-steel" />
        {rulingLabel(ruling)}
      </span>
    );
  }
  return <StatusBadge status={status} label={rulingLabel(ruling)} className={className} />;
}

export function RulingStamp({
  ruling,
  className = "",
  animate = false,
}: {
  ruling: Ruling;
  className?: string;
  animate?: boolean;
}) {
  return (
    <span
      className={`relative inline-flex -rotate-2 items-center gap-2 border-2 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] ring-1 ring-current/30 ${stamp[ruling]} ${
        animate ? "stamp-in" : ""
      } ${className}`}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {rulingLabel(ruling)}
    </span>
  );
}

export function StatusDot({ status }: { status: Verification }) {
  return <span className={`size-1.5 shrink-0 rounded-full ${dot[status]}`} />;
}

export function statusRing(status: Verification) {
  return status === "verified"
    ? "ring-verify/40"
    : status === "disputed"
      ? "ring-dispute/40"
      : "ring-unv/40";
}

export function statusText(status: Verification) {
  return status === "verified"
    ? "text-verify"
    : status === "disputed"
      ? "text-dispute"
      : "text-unv";
}

export function statusBg(status: Verification) {
  return status === "verified" ? "bg-verify" : status === "disputed" ? "bg-dispute" : "bg-unv";
}
