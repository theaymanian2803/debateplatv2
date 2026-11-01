import { createFileRoute } from "@tanstack/react-router";
import { checkScriptureProviders } from "@/server/health";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const report = await checkScriptureProviders();
        return new Response(JSON.stringify(report), {
          status: report.status === "down" ? 503 : 200,
          headers: {
            "content-type": "application/json",
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});
