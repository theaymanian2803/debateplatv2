import { describe, expect, it } from "vitest";
import { dossierBibTeX, dossierMarkdown } from "@/lib/dossier";
import { entries } from "@/lib/corpus";

describe("case-file export", () => {
  const entry = entries[0]!;

  it("builds a markdown case file with headings and authorities", () => {
    const markdown = dossierMarkdown(entry);
    expect(markdown).toContain(`# ${entry.title}`);
    expect(markdown).toContain("## Claim");
    expect(markdown).toContain("## Commentary");
    expect(markdown).toContain("## Rebuttals");
    expect(markdown).toContain("[Verified] Burnet 1931");
  });

  it("includes scripture attribution when present", () => {
    const markdown = dossierMarkdown({
      ...entry,
      scripture: {
        provider: "free-use",
        translationId: "BSB",
        translationLabel: "Berean Standard Bible",
        reference: "John 3:16",
        fetchedAt: "2026-10-23T00:00:00.000Z",
        attribution: "Berean Standard Bible · Public domain",
      },
    });
    expect(markdown).toContain(
      "*Berean Standard Bible, John 3:16 · Berean Standard Bible · Public domain*",
    );
  });

  it("builds BibTeX entries with stable keys and deduplicates", () => {
    const tex = dossierBibTeX(entry);
    expect(tex).toContain("@misc{");
    expect(tex).toContain("Archive:");
    const keys = [...tex.matchAll(/@misc\{([^,]+),/g)].map((match) => match[1]);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
