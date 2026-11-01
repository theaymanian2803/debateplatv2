import { describe, expect, it } from "vitest";
import type { Citation, Entry, Verification } from "@/lib/corpus";
import {
  activeFilterCount,
  defaultFilters,
  deriveFacets,
  filterEntries,
  type Filters,
} from "@/lib/filters";

const cite = (status: Verification): Citation => ({
  id: `c-${status}`,
  label: `${status} source`,
  detail: `A ${status} citation`,
  status,
  archive: "Archive",
});

function entry(overrides: Partial<Entry> & Pick<Entry, "id" | "title">): Entry {
  return {
    kind: "verse",
    collection: "religious",
    breadcrumb: "Sources / Religious texts / Test",
    subtitle: "",
    primary: "",
    secondary: "",
    sections: [],
    rebuttals: [],
    map: { nodes: [], edges: [] },
    translations: [],
    related: [],
    ...overrides,
  };
}

const stoic = entry({
  id: "stoic",
  title: "Epictetus — Discourses",
  subtitle: "On assent",
  collection: "philosophy",
  sections: [
    { id: "s1", title: "Commentary", body: "assent habit", citations: [cite("verified")] },
  ],
  rebuttals: [
    {
      id: "r1",
      perspective: "Stoic",
      claim: "Assent is internal",
      status: "verified",
      citations: [cite("verified")],
    },
  ],
  translations: [{ label: "Oldfather", text: "translation" }],
  map: {
    nodes: [{ id: "n1", label: "Assent", x: 10, y: 10, status: "verified", root: true }],
    edges: [],
  },
});

const disputed = entry({
  id: "disputed",
  title: "Genesis 1:1",
  kind: "premise",
  collection: "religious",
  sections: [{ id: "s1", title: "Commentary", body: "creation", citations: [cite("disputed")] }],
  rebuttals: [
    {
      id: "r1",
      perspective: "Natural law",
      claim: "Creation ex nihilo",
      status: "unverified",
      citations: [cite("unverified")],
    },
  ],
});

const empty = entry({
  id: "empty",
  title: "Bare premise",
  collection: "ethics",
});

const entries = [stoic, disputed, empty];

const filters = (overrides: Partial<Filters> = {}): Filters => ({
  ...defaultFilters,
  ...overrides,
});

describe("filterEntries", () => {
  it("returns everything by default", () => {
    expect(filterEntries(entries, filters())).toHaveLength(3);
  });

  it("requires every query token to match", () => {
    expect(filterEntries(entries, filters({ query: "assent habit" }))).toEqual([stoic]);
    expect(filterEntries(entries, filters({ query: "assent creation" }))).toEqual([]);
  });

  it("filters by kind and collection", () => {
    expect(filterEntries(entries, filters({ kinds: ["premise"] }))).toEqual([disputed]);
    expect(filterEntries(entries, filters({ collections: ["religious"] }))).toEqual([disputed]);
  });

  it("matches entries with any selected citation status", () => {
    expect(filterEntries(entries, filters({ statuses: ["disputed"] }))).toEqual([disputed]);
    expect(filterEntries(entries, filters({ statuses: ["verified", "unverified"] }))).toEqual([
      stoic,
      disputed,
    ]);
  });

  it("filters by citation health", () => {
    expect(filterEntries(entries, filters({ health: ["fully-verified"] }))).toEqual([stoic]);
    expect(filterEntries(entries, filters({ health: ["has-disputed"] }))).toEqual([disputed]);
    expect(filterEntries(entries, filters({ health: ["no-citations"] }))).toEqual([empty]);
  });

  it("filters by perspective", () => {
    expect(filterEntries(entries, filters({ perspectives: ["Stoic"] }))).toEqual([stoic]);
    expect(filterEntries(entries, filters({ perspectives: ["Stoic", "Natural law"] }))).toEqual([
      stoic,
      disputed,
    ]);
  });

  it("filters to entries with translations", () => {
    expect(filterEntries(entries, filters({ withTranslations: true }))).toEqual([stoic]);
  });

  it("sorts by citation count and title", () => {
    expect(filterEntries(entries, filters({ sort: "citations" }))[0]).toBe(stoic);
    expect(filterEntries(entries, filters({ sort: "title" })).map((e) => e.id)).toEqual([
      "empty",
      "stoic",
      "disputed",
    ]);
  });
});

describe("deriveFacets", () => {
  it("counts facet values against the other active filters", () => {
    const facets = deriveFacets(entries, filters({ collections: ["religious"] }));
    expect(facets.kinds).toEqual([
      { value: "premise", count: 1 },
      { value: "verse", count: 0 },
    ]);
    expect(facets.collections).toEqual(
      expect.arrayContaining([
        { value: "religious", count: 1 },
        { value: "philosophy", count: 1 },
        { value: "ethics", count: 1 },
      ]),
    );
  });

  it("counts statuses, perspectives, and health", () => {
    const facets = deriveFacets(entries, filters());
    const status = (value: string) => facets.statuses.find((s) => s.value === value)?.count;
    expect(status("verified")).toBe(1);
    expect(status("disputed")).toBe(1);
    expect(status("unverified")).toBe(1);
    expect(facets.perspectives).toEqual([
      { value: "Natural law", count: 1 },
      { value: "Stoic", count: 1 },
    ]);
    expect(facets.health.find((h) => h.value === "no-citations")).toEqual({
      value: "no-citations",
      count: 1,
    });
    expect(facets.translations).toBe(1);
  });
});

describe("activeFilterCount", () => {
  it("counts only active criteria", () => {
    expect(activeFilterCount(filters())).toBe(0);
    expect(
      activeFilterCount(
        filters({ query: "  ", kinds: ["verse"], collections: ["ethics", "religious"] }),
      ),
    ).toBe(3);
  });
});
