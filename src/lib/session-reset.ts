const SESSION_KEYS = ["scholia-admin-v1", "scholia-client-id", "docket-rail", "docket-inspector"];

export function clearSessionCache(): void {
  try {
    window.sessionStorage.clear();
  } catch {
    /* storage unavailable */
  }
  for (const key of SESSION_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* storage unavailable */
    }
  }
}
