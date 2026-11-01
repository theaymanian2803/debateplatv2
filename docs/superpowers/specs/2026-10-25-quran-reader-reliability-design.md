# Quran Reader Reliability and Accessibility Design

Date: 2026-10-25

## Goal

Make the Quran reader dependable across serverless instances, observable when an
upstream provider degrades, resistant to abuse, keyboard-accessible, and pleasant to
return to.

## Non-goals

- User accounts or server-synced bookmarks.
- Full UI internationalization or an RTL application shell.
- Audio recitation, word-by-word study tools, or search.
- Replacing any upstream scripture provider.

## Phases

1. Reliability: persistent cache, provider health endpoint, public-endpoint rate limit.
2. Accessibility: keyboard navigation, focus management, ARIA, reading settings.
3. Return experience: continue-reading prompt and ayah bookmarks.

Each phase is independently shippable and tested.

## Reliability

### Persistent cache

Add a generic `scripture_cache` table:

```sql
CREATE TABLE IF NOT EXISTS scripture_cache (
  key        TEXT PRIMARY KEY,
  payload    TEXT NOT NULL,
  fetched_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
```

- `payload` is JSON. Strings (for example Asbab HTML text) are stored as JSON strings.
- Reads delete expired rows and return a miss.
- Rows larger than 256 KB are not persisted.
- The existing module-level maps stay as an L1 cache with the current 24-hour TTL.
- Turso is the L2 cache. Reads check L1, then L2, then the provider. Writes update L1
  and best-effort L2.
- If Turso credentials are unavailable or a cache query fails, the application falls
  back to L1 without failing the request.
- Identical in-flight requests for the same key share one upstream promise.

Cache keys keep their existing namespaces: `chapter`, `sefaria`, `quran`,
`commentary`, `tafsir`, `hadith`, `quran-page`, `asbab`, `api-bible-list`,
`api-bible-meta`.

### Provider health

Add a public `GET /api/health` JSON endpoint.

Response shape:

```json
{
  "status": "ok",
  "checkedAt": "2026-10-25T00:00:00.000Z",
  "providers": [
    { "id": "quran", "status": "ok", "latencyMs": 183 },
    { "id": "api-bible", "status": "unconfigured" }
  ]
}
```

- Checks bypass the cache and use a short timeout.
- Results are memoized in process for 60 seconds.
- Overall status is `ok`, `degraded`, or `down`; API.Bible is `unconfigured` when no
  key is present.
- Responses must not include keys, stack traces, or upstream response bodies.

### Rate limiting

Apply only to public Quran reader server functions: page, Asbab, and tafsir.

- Limit: 120 requests per 60-second window per client IP.
- Storage: `rate_limits` table with an atomic upsert, plus an in-memory fallback.
- Client IP comes from `x-forwarded-for` (first value), then `x-real-ip`, then
  `unknown`.
- Exceeding the limit returns `429` with `Retry-After`.
- The reader displays a friendly rate-limit message with a retry action.

```sql
CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count        INTEGER NOT NULL
);
```

## Accessibility

- Page navigation: `PageUp` and `PageDown` when focus is not in a form control.
- Page jump: press `g`, type a page number, press Enter.
- `Escape` closes the study panel.
- Page changes announce through a polite live region.
- Study panel on mobile: `role="dialog"`, `aria-modal`, focus trap, focus return to the
  triggering ayah on close.
- Study panel tabs use `role="tablist"`, `role="tab"`, `aria-selected`, and
  `role="tabpanel"`.
- Site navigation marks the active route with `aria-current="page"`.
- Reading settings stored locally: text size, Arabic font (`Naskh` or `Amiri`),
  show/hide translation.
- Respect `prefers-reduced-motion` for smooth scrolling and transitions.

## Last-read and bookmarks

Local storage only.

```ts
type LastRead = {
  page: number;
  translationId: string;
  surah: number;
  verse: number;
  updatedAt: string;
};

type QuranBookmark = {
  surah: number;
  verse: number;
  page: number;
  surahName: string;
  createdAt: string;
};
```

- Last-read updates on page change, debounced.
- A URL `page` parameter always wins.
- When a saved position exists, show “Continue at page N”; never navigate
  automatically.
- Bookmarks are ayah-level, capped at 200, and listed in the study panel.
- Bookmark links use `/quran?page=N&verse=S:A`; the target ayah is selected and scrolled
  into view.
- Bookmark actions announce through the live region.

## Error handling

- Cache failures never break a fetch.
- Health checks report a provider failure without failing the whole endpoint.
- Rate-limit failures fall back to the in-memory limiter.
- Reader errors keep the existing retry affordances.
- No public error reveals credentials, internal paths, or upstream bodies.

## Testing

- Unit: cache TTL, L2 fallback, oversized payload skip, in-flight de-duplication.
- Unit: rate limiter window, key isolation, fallback, and retry-after.
- Unit: health aggregation and unconfigured API.Bible.
- Unit: bookmark store limits, last-read persistence, keyboard mapping.
- Integration: cache reads and writes against Turso when credentials are present.
- Live (opt-in): existing provider suite plus health endpoint.
- Manual: keyboard-only pass, focus trap/restore, screen-reader announcements, reduced
  motion.
- Verification: `npm test`, `npm run typecheck`, `npm run lint`, production build.

## Risks

- Turso latency on cache misses could slow cold requests; L1 and small payloads keep
  this bounded.
- Cross-instance rate limiting adds a database write per public request; a 60-second
  window and generous limit keep cost low.
- QuranX HTML parsing remains the least stable dependency; health checks make breakage
  visible.
- Local bookmarks do not follow the user across devices by design.
