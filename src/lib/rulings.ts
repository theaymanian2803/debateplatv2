import { allCitations, type Entry, type Verification } from "@/lib/corpus";

export type Ruling = "sustained" | "contested" | "unresolved" | "unreviewed";

const labels: Record<Ruling, string> = {
  sustained: "Verified",
  contested: "Disputed",
  unresolved: "Unverified",
  unreviewed: "Unreviewed",
};

const statusFor: Record<Ruling, Verification | null> = {
  sustained: "verified",
  contested: "disputed",
  unresolved: "unverified",
  unreviewed: null,
};

export function rulingFor(entry: Entry): Ruling {
  const citations = allCitations(entry);
  if (citations.some((citation) => citation.status === "disputed")) return "contested";
  if (citations.some((citation) => citation.status === "unverified")) return "unresolved";
  if (citations.length === 0) return "unreviewed";
  return "sustained";
}

export function rulingLabel(ruling: Ruling): string {
  return labels[ruling];
}

export function rulingStatus(ruling: Ruling): Verification | null {
  return statusFor[ruling];
}

const verificationLabels: Record<Verification, string> = {
  verified: "Verified",
  disputed: "Disputed",
  unverified: "Unverified",
};

export function verificationLabel(status: Verification): string {
  return verificationLabels[status];
}
