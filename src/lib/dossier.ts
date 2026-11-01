import type { Entry } from "@/lib/corpus";
import { allCitations } from "@/lib/corpus";
import { verificationLabel } from "@/lib/rulings";

export function dossierMarkdown(entry: Entry): string {
  const lines: string[] = [];
  lines.push(`# ${entry.title}`);
  lines.push(`*${entry.subtitle}*`);
  lines.push("");
  lines.push("## Claim");
  lines.push(entry.primary);
  if (entry.scripture) {
    const attribution = entry.scripture.attribution ? ` · ${entry.scripture.attribution}` : "";
    lines.push("");
    lines.push(
      `*${entry.scripture.translationLabel}${entry.scripture.secondaryLabel ? ` / ${entry.scripture.secondaryLabel}` : ""}, ${entry.scripture.reference}${attribution}*`,
    );
  }
  lines.push("");
  lines.push(`> ${entry.secondary}`);
  for (const translation of entry.translations) {
    lines.push("");
    lines.push(`**${translation.label}:** ${translation.text}`);
  }
  if (entry.sections.length > 0) {
    lines.push("");
    lines.push("## Commentary");
    entry.sections.forEach((section, index) => {
      lines.push(`### Commentary ${String.fromCharCode(65 + index)} — ${section.title}`);
      lines.push(section.body);
      if (section.citations.length > 0) {
        lines.push("");
        for (const citation of section.citations) {
          lines.push(
            `- [${verificationLabel(citation.status)}] ${citation.label} — ${citation.detail} (${citation.archive})`,
          );
        }
      }
    });
  }
  if (entry.rebuttals.length > 0) {
    lines.push("");
    lines.push("## Rebuttals");
    for (const rebuttal of entry.rebuttals) {
      lines.push(`### ${rebuttal.perspective} — ${rebuttal.claim}`);
      if (rebuttal.warrant) lines.push(`- **Ground:** ${rebuttal.warrant}`);
      if (rebuttal.backing) lines.push(`- **Source:** ${rebuttal.backing}`);
      if (rebuttal.qualifier) lines.push(`- **Qualifier:** ${rebuttal.qualifier}`);
      if (rebuttal.counter) {
        lines.push(`- **Reply (${rebuttal.counter.author}):** ${rebuttal.counter.body}`);
      }
      for (const citation of rebuttal.citations) {
        lines.push(
          `- [${verificationLabel(citation.status)}] ${citation.label} — ${citation.detail} (${citation.archive})`,
        );
      }
    }
  }
  return lines.join("\n");
}

export function dossierBibTeX(entry: Entry): string {
  const seen = new Map<string, number>();
  const items: string[] = [];
  for (const citation of allCitations(entry)) {
    const base = citation.label.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "citation";
    const suffix = seen.get(citation.label) ?? 0;
    seen.set(citation.label, suffix + 1);
    const citeKey = suffix > 0 ? `${base}${suffix}` : base;
    items.push(
      `@misc{${citeKey},\n  title = {${citation.detail}},\n  note = {Archive: ${citation.archive}; status: ${citation.status}},\n  related = {${entry.title}}\n}`,
    );
  }
  return items.join("\n\n");
}
