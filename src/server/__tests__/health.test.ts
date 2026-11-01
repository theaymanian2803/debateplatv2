import { describe, expect, it, vi } from "vitest";
import { checkScriptureProviders } from "@/server/health";

describe("checkScriptureProviders", () => {
  it("marks a failing provider down and keeps the report usable", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("api.alquran.cloud")) throw new Error("offline");
      return new Response("ok", { status: 200 });
    });
    const report = await checkScriptureProviders({ fetchImpl, apiBibleKey: "" });
    expect(report.status).toBe("degraded");
    expect(report.providers.find((p) => p.id === "quran")?.status).toBe("down");
    expect(report.providers.find((p) => p.id === "api-bible")?.status).toBe("unconfigured");
  });

  it("returns ok when every configured provider responds", async () => {
    const fetchImpl = vi.fn(async () => new Response("ok", { status: 200 }));
    const report = await checkScriptureProviders({ fetchImpl, apiBibleKey: "" });
    expect(report.status).toBe("ok");
  });
});
