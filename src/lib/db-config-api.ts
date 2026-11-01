import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@libsql/client/web";
import { requireAdmin } from "@/server/auth";
import {
  clearDbConfigCookie,
  dbConfigStatus,
  setDbConfigCookie,
  validateDbConfig,
} from "@/server/db-config";
import { resetDb } from "@/server/db";
import { migrate } from "@/server/schema";

export const getDbConfigStatus = createServerFn({ method: "POST" }).handler(() => {
  requireAdmin();
  return dbConfigStatus();
});

export const saveDbConfig = createServerFn({ method: "POST" })
  .validator((input: { url: string; token: string }) => input)
  .handler(async ({ data }) => {
    requireAdmin();

    const url = data.url.trim();
    const token = data.token.trim();
    const validation = validateDbConfig(url, token);
    if (validation) return { ok: false as const, error: validation };

    const client = createClient({ url, authToken: token });
    try {
      await client.execute("SELECT 1");
      await migrate(client);
    } catch {
      return {
        ok: false as const,
        error: "Could not connect to that database. Check the URL and token.",
      };
    } finally {
      try {
        await client.close();
      } catch {
        /* best effort */
      }
    }

    try {
      setDbConfigCookie({ url, token });
      resetDb();
      return { ok: true as const };
    } catch {
      return { ok: false as const, error: "Could not save the database configuration." };
    }
  });

export const clearDbConfig = createServerFn({ method: "POST" }).handler(() => {
  requireAdmin();
  clearDbConfigCookie();
  resetDb();
  return { ok: true as const };
});
