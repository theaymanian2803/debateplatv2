import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getStashedCloudflareEnv, resolveEnvVar, type CredentialSource } from "./env";

const TRUTHY = new Set(["1", "true", "yes", "on"]);

export function parseDemoModeFlag(value: string | undefined): boolean {
  if (!value) return false;
  return TRUTHY.has(value.trim().toLowerCase());
}

export function resolveDemoMode(src?: CredentialSource): boolean {
  const source = src ?? {
    cloudflare: getStashedCloudflareEnv(),
    processEnv: process.env,
    readFile: (path: string) => {
      try {
        return readFileSync(join(process.cwd(), path), "utf8");
      } catch {
        return undefined;
      }
    },
  };
  return parseDemoModeFlag(resolveEnvVar(source, "DEMO_MODE"));
}
