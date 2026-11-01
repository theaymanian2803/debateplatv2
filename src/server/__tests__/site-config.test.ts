import { describe, expect, it } from "vitest";
import { parseDemoModeFlag, resolveDemoMode } from "@/server/site-config";

describe("parseDemoModeFlag", () => {
  it("accepts common truthy values", () => {
    for (const value of ["1", "true", "TRUE", "yes", "on", "  On  "]) {
      expect(parseDemoModeFlag(value), value).toBe(true);
    }
  });

  it("treats missing and falsey values as off", () => {
    for (const value of [undefined, "", "0", "false", "no", "off"]) {
      expect(parseDemoModeFlag(value), String(value)).toBe(false);
    }
  });
});

describe("resolveDemoMode", () => {
  it("reads the process environment", () => {
    expect(resolveDemoMode({ processEnv: { DEMO_MODE: "1" } })).toBe(true);
    expect(resolveDemoMode({ processEnv: { DEMO_MODE: "0" } })).toBe(false);
    expect(resolveDemoMode({ processEnv: {} })).toBe(false);
  });
});
