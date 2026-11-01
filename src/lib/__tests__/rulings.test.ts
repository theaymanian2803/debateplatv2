import { describe, expect, it } from "vitest";
import type { Entry, Verification } from "@/lib/corpus";
import { rulingFor } from "@/lib/rulings";

function entryWith(statuses: Verification[]): Entry {
  return {
    id: "case",
    kind: "premise",
    collection: "philosophy",
    breadcrumb: "Premises / Philosophy",
    title: "A test case",
    subtitle: "",
    primary: "",
    secondary: "",
    sections: [
      {
        id: "exhibit",
        title: "Exhibit",
        body: "",
        citations: statuses.map((status, index) => ({
          id: `authority-${index}`,
          label: `Authority ${index}`,
          detail: "",
          status,
          archive: "",
        })),
      },
    ],
    rebuttals: [],
    map: { nodes: [], edges: [] },
    translations: [],
    related: [],
  };
}

describe("rulingFor", () => {
  it("is sustained when every authority is verified", () => {
    expect(rulingFor(entryWith(["verified", "verified"]))).toBe("sustained");
  });

  it("is contested when any authority is disputed", () => {
    expect(rulingFor(entryWith(["verified", "disputed"]))).toBe("contested");
  });

  it("is unresolved when an unverified authority exists and none are disputed", () => {
    expect(rulingFor(entryWith(["verified", "unverified"]))).toBe("unresolved");
  });

  it("is unreviewed when the case has no authorities", () => {
    expect(rulingFor(entryWith([]))).toBe("unreviewed");
  });
});
