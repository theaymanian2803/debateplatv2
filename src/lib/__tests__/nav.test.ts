import { describe, expect, it } from "vitest";
import { siteNavItems } from "@/lib/nav";

describe("siteNavItems", () => {
  it("links to the landing page, the case docket, the Quran library, and the guide", () => {
    expect(siteNavItems.map((item) => item.to)).toEqual(["/", "/cases", "/quran", "/welcome"]);
  });

  it("leads with the landing page", () => {
    expect(siteNavItems[0]?.to).toBe("/");
  });

  it("gives every link a label", () => {
    for (const item of siteNavItems) {
      expect(item.label.trim().length).toBeGreaterThan(0);
    }
  });
});
