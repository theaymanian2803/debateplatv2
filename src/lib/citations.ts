import type { Entry } from "@/lib/corpus";
import { SITE_NAME } from "@/lib/brand";

export type CitationFormat = "chicago" | "apa" | "mla" | "bibtex";

export const citationFormats: { id: CitationFormat; label: string }[] = [
  { id: "chicago", label: "Chicago" },
  { id: "apa", label: "APA" },
  { id: "mla", label: "MLA" },
  { id: "bibtex", label: "BibTeX" },
];

export function caseShareUrl(entry: Entry, origin = ""): string {
  return `${origin}/case/${entry.id}`;
}

function accessedLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function cleanTitle(title: string): string {
  return title.replace(/"/g, "'");
}

function bibTitle(title: string): string {
  return title.replace(/[{}]/g, "");
}

export function caseCitation(
  entry: Entry,
  format: CitationFormat,
  url: string,
  accessed = new Date(),
): string {
  const title = cleanTitle(entry.title);
  const date = accessedLabel(accessed);
  const year = accessed.getFullYear();

  switch (format) {
    case "chicago":
      return `${SITE_NAME}. "${title}." Accessed ${date}. ${url}.`;
    case "apa":
      return `${SITE_NAME}. (n.d.). ${title}. Retrieved ${date}, from ${url}`;
    case "mla":
      return `"${title}." ${SITE_NAME}, ${url}. Accessed ${date}.`;
    case "bibtex":
      return `@misc{docket-${entry.id},\n  author = {{${SITE_NAME}}},\n  title = {${bibTitle(entry.title)}},\n  year = {${year}},\n  note = {Case file. Accessed ${date}.},\n  url = {${url}}\n}`;
  }
}

export type CaseSnapshot = {
  format: "docket-case-snapshot/v1";
  version: string;
  generatedAt: string;
  url: string;
  case: Entry;
};

function stableHash(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36).toUpperCase().padStart(6, "0");
}

export function caseSnapshot(entry: Entry, url: string, generatedAt = new Date()): CaseSnapshot {
  return {
    format: "docket-case-snapshot/v1",
    version: stableHash(JSON.stringify(entry)),
    generatedAt: generatedAt.toISOString(),
    url,
    case: entry,
  };
}
