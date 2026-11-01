import { describe, expect, it } from "vitest";
import { decryptDbConfig, encryptDbConfig, hostOf, validateDbConfig } from "@/server/db-config";

const config = {
  url: "libsql://docket-test.turso.io",
  token: "test-auth-token",
};

describe("database configuration", () => {
  it("accepts libsql and https URLs and rejects invalid values", () => {
    expect(validateDbConfig(config.url, config.token)).toBeNull();
    expect(validateDbConfig("https://docket-test.turso.io", config.token)).toBeNull();
    expect(validateDbConfig("ftp://example.com", config.token)).toContain("libsql://");
    expect(validateDbConfig("", config.token)).toContain("database URL");
    expect(validateDbConfig(config.url, "")).toContain("auth token");
    expect(validateDbConfig("not a url", config.token)).toContain("not valid");
  });

  it("round-trips encrypted configuration", () => {
    const encrypted = encryptDbConfig(config, "admin-password");
    expect(encrypted.split(".")).toHaveLength(4);
    expect(decryptDbConfig(encrypted, "admin-password")).toEqual(config);
  });

  it("rejects a wrong password or a tampered value", () => {
    const encrypted = encryptDbConfig(config, "admin-password");
    expect(decryptDbConfig(encrypted, "other-password")).toBeNull();
    expect(decryptDbConfig(`${encrypted}x`, "admin-password")).toBeNull();
  });

  it("reads the host without exposing the token", () => {
    expect(hostOf(config.url)).toBe("docket-test.turso.io");
    expect(hostOf("not a url")).toBeNull();
  });
});
