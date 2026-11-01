import {
  allCitations,
  citationCount,
  searchText,
  type Entry,
  type Verification,
} from "@/lib/corpus";

export type CitationHealth = "fully-verified" | "has-disputed" | "has-unverified" | "no-citations";
export type SortKey = "relevance" | "title" | "citations" | "status";

export type Filters = {
  query: string;
  kinds: Entry["kind"][];
  collections: string[];
  statuses: Verification[];
  perspectives: string[];
  health: CitationHealth[];
  withTranslations: boolean;
  sort: SortKey;
};

export const defaultFilters: Filters = {
  query: "",
  kinds: [],
  collections: [],
  statuses: [],
  perspectives: [],
  health: [],
  withTranslations: false,
  sort: "relevance",
};

export function hasActiveFilters(filters: Filters): boolean {
  return (
    filters.query.trim() !== "" ||
    filters.kinds.length > 0 ||
    filters.collections.length > 0 ||
    filters.statuses.length > 0 ||
    filters.perspectives.length > 0 ||
    filters.health.length > 0 ||
    filters.withTranslations ||
    filters.sort !== "relevance"
  );
}

export function activeFilterCount(filters: Filters): number {
  return (
    (filters.query.trim() ? 1 : 0) +
    filters.kinds.length +
    filters.collections.length +
    filters.statuses.length +
    filters.perspectives.length +
    filters.health.length +
    (filters.withTranslations ? 1 : 0) +
    (filters.sort !== "relevance" ? 1 : 0)
  );
}

export function entryStatuses(entry: Entry): Set<Verification> {
  return new Set(allCitations(entry).map((c) => c.status));
}

export function entryHealth(entry: Entry): CitationHealth[] {
  const citations = allCitations(entry);
  if (citations.length === 0) return ["no-citations"];
  const health: CitationHealth[] = [];
  if (citations.every((c) => c.status === "verified")) health.push("fully-verified");
  if (citations.some((c) => c.status === "disputed")) health.push("has-disputed");
  if (citations.some((c) => c.status === "unverified")) health.push("has-unverified");
  return health;
}

export function entryPerspectives(entry: Entry): string[] {
  return Array.from(new Set(entry.rebuttals.map((r) => r.perspective).filter(Boolean)));
}

function matchesQuery(entry: Entry, query: string): boolean {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = searchText(entry);
  return tokens.every((token) => haystack.includes(token));
}

function matchesFacet(entry: Entry, filters: Filters, skip?: keyof Filters): boolean {
  if (skip !== "query" && !matchesQuery(entry, filters.query)) return false;

  if (skip !== "kinds" && filters.kinds.length > 0 && !filters.kinds.includes(entry.kind)) {
    return false;
  }

  if (
    skip !== "collections" &&
    filters.collections.length > 0 &&
    !filters.collections.includes(entry.collection)
  ) {
    return false;
  }

  if (skip !== "statuses" && filters.statuses.length > 0) {
    const statuses = entryStatuses(entry);
    if (!filters.statuses.some((s) => statuses.has(s))) return false;
  }

  if (skip !== "perspectives" && filters.perspectives.length > 0) {
    const perspectives = entryPerspectives(entry);
    if (!filters.perspectives.some((p) => perspectives.includes(p))) return false;
  }

  if (skip !== "health" && filters.health.length > 0) {
    const health = entryHealth(entry);
    if (!filters.health.some((h) => health.includes(h))) return false;
  }

  if (skip !== "withTranslations" && filters.withTranslations && entry.translations.length === 0) {
    return false;
  }

  return true;
}

function sortEntries(entries: Entry[], sort: SortKey): Entry[] {
  if (sort === "relevance") return entries;
  const copy = entries.slice();
  if (sort === "title") {
    return copy.sort((a, b) => a.title.localeCompare(b.title));
  }
  if (sort === "citations") {
    return copy.sort((a, b) => citationCount(b) - citationCount(a));
  }
  const severity = (entry: Entry) => {
    const health = entryHealth(entry);
    if (health.includes("has-disputed")) return 0;
    if (health.includes("has-unverified")) return 1;
    if (health.includes("fully-verified")) return 2;
    return 3;
  };
  return copy.sort((a, b) => severity(a) - severity(b));
}

export function filterEntries(entries: Entry[], filters: Filters): Entry[] {
  return sortEntries(
    entries.filter((entry) => matchesFacet(entry, filters)),
    filters.sort,
  );
}

export type FacetValue = { value: string; count: number };

export type Facets = {
  kinds: FacetValue[];
  collections: FacetValue[];
  statuses: FacetValue[];
  perspectives: FacetValue[];
  health: FacetValue[];
  translations: number;
};

function countBy(
  entries: Entry[],
  values: (entry: Entry) => string[],
  universe: string[] = [],
): FacetValue[] {
  const counts = new Map<string, number>(universe.map((value) => [value, 0]));
  for (const entry of entries) {
    for (const value of values(entry)) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

export function deriveFacets(entries: Entry[], filters: Filters): Facets {
  const allCollections = Array.from(new Set(entries.map((e) => e.collection)));
  const allPerspectives = Array.from(new Set(entries.flatMap(entryPerspectives)));
  const forKinds = entries.filter((e) => matchesFacet(e, filters, "kinds"));
  const forCollections = entries.filter((e) => matchesFacet(e, filters, "collections"));
  const forStatuses = entries.filter((e) => matchesFacet(e, filters, "statuses"));
  const forPerspectives = entries.filter((e) => matchesFacet(e, filters, "perspectives"));
  const forHealth = entries.filter((e) => matchesFacet(e, filters, "health"));
  const forTranslations = entries.filter((e) => matchesFacet(e, filters, "withTranslations"));

  return {
    kinds: countBy(forKinds, (e) => [e.kind], ["verse", "premise"]),
    collections: countBy(forCollections, (e) => [e.collection], allCollections),
    statuses: countBy(forStatuses, (e) => Array.from(entryStatuses(e)), [
      "verified",
      "disputed",
      "unverified",
    ]),
    perspectives: countBy(forPerspectives, (e) => entryPerspectives(e), allPerspectives),
    health: countBy(forHealth, (e) => entryHealth(e), [
      "fully-verified",
      "has-disputed",
      "has-unverified",
      "no-citations",
    ]),
    translations: forTranslations.filter((e) => e.translations.length > 0).length,
  };
}

export function toggleValue<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}
