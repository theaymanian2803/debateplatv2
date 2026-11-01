import { createClient, type Client } from "@libsql/client/web";
import { dbConfigKey, readDbConfig } from "./db-config";
import { migrate } from "./schema";

const clients = new Map<string, Promise<Client>>();

export function getDb(): Promise<Client> {
  const config = readDbConfig();
  if (!config) {
    throw new Error(
      "Turso credentials not found (set TURSO_URL and TURSO_AUTH_TOKEN, or configure the database in the Editorial desk)",
    );
  }

  const key = dbConfigKey(config);
  let clientPromise = clients.get(key);
  if (!clientPromise) {
    clientPromise = (async () => {
      const client = createClient({ url: config.url, authToken: config.token });
      await migrate(client);
      return client;
    })();
    clients.set(key, clientPromise);
  }
  return clientPromise;
}

export function resetDb(): void {
  for (const clientPromise of clients.values()) {
    void clientPromise.then((client) => client.close()).catch(() => {});
  }
  clients.clear();
}

export async function getDbIfConfigured(): Promise<Client | undefined> {
  try {
    return await getDb();
  } catch {
    return undefined;
  }
}
