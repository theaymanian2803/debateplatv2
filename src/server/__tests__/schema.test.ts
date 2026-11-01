import { describe, expect, it } from "vitest";
import { SCHEMA_SQL } from "@/server/schema";

describe("scripture cache schema", () => {
  it("defines the persistent cache and rate-limit tables", () => {
    expect(SCHEMA_SQL).toContain("CREATE TABLE IF NOT EXISTS scripture_cache");
    expect(SCHEMA_SQL).toContain("CREATE TABLE IF NOT EXISTS rate_limits");
  });
});
