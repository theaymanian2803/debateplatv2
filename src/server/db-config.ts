import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  deleteCookie,
  getCookie,
  getRequestProtocol,
  setCookie,
} from "@tanstack/react-start/server";
import { resolveStoredPassword } from "./auth";
import { getStashedCloudflareEnv, resolveTursoCredentials } from "./env";

export const DB_CONFIG_COOKIE = "docket_db_config";
export const DB_CONFIG_TTL_SECONDS = 7 * 24 * 60 * 60;

export type DbConfig = {
  url: string;
  token: string;
};

export type DbConfigSource = "browser" | "environment" | "none";

export type DbConfigStatus = {
  configured: boolean;
  source: DbConfigSource;
  host: string | null;
};

export function validateDbConfig(url: string, token: string): string | null {
  const trimmedUrl = url.trim();
  const trimmedToken = token.trim();
  if (!trimmedUrl) return "Enter the Turso database URL.";
  if (!trimmedToken) return "Enter the Turso auth token.";
  if (trimmedUrl.length > 2048) return "That database URL is too long.";
  if (trimmedToken.length > 4096) return "That auth token is too long.";

  let parsed: URL;
  try {
    parsed = new URL(trimmedUrl);
  } catch {
    return "That database URL is not valid.";
  }

  if (!["libsql:", "https:", "http:"].includes(parsed.protocol)) {
    return "Use a libsql:// or https:// Turso database URL.";
  }
  if (!parsed.hostname) return "That database URL is missing a host.";

  return null;
}

export function hostOf(url: string): string | null {
  try {
    return new URL(url).host || null;
  } catch {
    return null;
  }
}

function keyFromPassword(password: string): Buffer {
  return createHash("sha256").update(`docket-db-config:${password}`, "utf8").digest();
}

export function encryptDbConfig(config: DbConfig, password: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFromPassword(password), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(config), "utf8"), cipher.final()]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptDbConfig(value: string, password: string): DbConfig | null {
  try {
    const [version, ivValue, tagValue, ciphertextValue] = value.split(".");
    if (version !== "v1" || !ivValue || !tagValue || !ciphertextValue) return null;
    const decipher = createDecipheriv(
      "aes-256-gcm",
      keyFromPassword(password),
      Buffer.from(ivValue, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertextValue, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    const parsed = JSON.parse(plaintext) as Partial<DbConfig>;
    if (typeof parsed.url !== "string" || typeof parsed.token !== "string") return null;
    if (validateDbConfig(parsed.url, parsed.token)) return null;
    return { url: parsed.url, token: parsed.token };
  } catch {
    return null;
  }
}

export function dbConfigKey(config: DbConfig): string {
  return createHash("sha256").update(`${config.url}\0${config.token}`, "utf8").digest("hex");
}

export function resolveEnvironmentDbConfig(): DbConfig | undefined {
  try {
    const { url, token } = resolveTursoCredentials({
      cloudflare: getStashedCloudflareEnv(),
      processEnv: process.env,
      readFile: (path) => {
        try {
          return readFileSync(join(process.cwd(), path), "utf8");
        } catch {
          return undefined;
        }
      },
    });
    return { url, token };
  } catch {
    return undefined;
  }
}

export function readDbConfigFromCookie(): DbConfig | undefined {
  const password = resolveStoredPassword();
  if (!password) return undefined;
  let value: string | undefined;
  try {
    value = getCookie(DB_CONFIG_COOKIE);
  } catch {
    return undefined;
  }
  if (!value) return undefined;
  return decryptDbConfig(value, password) ?? undefined;
}

export function readDbConfig(): DbConfig | undefined {
  return readDbConfigFromCookie() ?? resolveEnvironmentDbConfig();
}

export function dbConfigStatus(): DbConfigStatus {
  const browser = readDbConfigFromCookie();
  if (browser) {
    return { configured: true, source: "browser", host: hostOf(browser.url) };
  }
  const environment = resolveEnvironmentDbConfig();
  if (environment) {
    return { configured: true, source: "environment", host: hostOf(environment.url) };
  }
  return { configured: false, source: "none", host: null };
}

export function setDbConfigCookie(config: DbConfig): void {
  const password = resolveStoredPassword();
  if (!password) throw new Error("Admin access is not configured on this deployment.");
  setCookie(DB_CONFIG_COOKIE, encryptDbConfig(config, password), {
    httpOnly: true,
    sameSite: "strict",
    secure: getRequestProtocol() === "https",
    path: "/",
    maxAge: DB_CONFIG_TTL_SECONDS,
  });
}

export function clearDbConfigCookie(): void {
  deleteCookie(DB_CONFIG_COOKIE, { path: "/" });
}
