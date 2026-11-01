import { describe, expect, it } from "vitest";
import { entries } from "@/lib/corpus";
import { caseCitation, caseShareUrl, caseSnapshot } from "@/lib/citations";

const entry = entries[0]!;
const url = "https://docket.example/case/discourses-4-1";
const accessed = new Date("2026-11-01T12:00:00.000Z");

describe("case citations", () => {
  it("builds the shared case URL from the case id", () => {
    expect(caseShareUrl(entry, "https://docket.example")).toBe(url);
  });

  it("formats Chicago, APA, and MLA with the case title and URL", () => {
    for (const format of ["chicago", "apa", "mla"] as const) {
      const citation = caseCitation(entry, format, url, accessed);
      expect(citation).toContain(entry.title);
      expect(citation).toContain(url);
      expect(citation).toContain("November 1, 2026");
    }
  });

  it("escapes the BibTeX title and uses a stable key", () => {
    const bibtex = caseCitation(entry, "bibtex", url, accessed);
    expect(bibtex).toContain(`@misc{docket-${entry.id}`);
    expect(bibtex).toContain("title = {");
    expect(bibtex).toContain("url = {");
  });

  it("creates a stable snapshot with a version and the case payload", () => {
    const snapshot = caseSnapshot(entry, url, accessed);
    expect(snapshot.format).toBe("docket-case-snapshot/v1");
    expect(snapshot.version).toMatch(/^[A-Z0-9]{6,}$/);
    expect(snapshot.generatedAt).toBe(accessed.toISOString());
    expect(snapshot.case.id).toBe(entry.id);
    expect(caseSnapshot(entry, url, accessed).version).toBe(snapshot.version);
  });
});
