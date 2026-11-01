# Quran Reader Accessibility and Bookmarks Implementation Plan (Phase 2/3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Make the Quran reader keyboard-accessible, configurable, and pleasant to return to with last-read and ayah bookmarks.

**Architecture:** Add a small localStorage module for preferences, last-read, and bookmarks. Wire keyboard shortcuts, live announcements, focus management, and reading controls into `src/routes/quran.tsx`. Add a third Study tab for bookmarks and support `?page=N&verse=S:A` deep links.

**Tech Stack:** TypeScript, React 19, TanStack Router, Tailwind, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-25-quran-reader-reliability-design.md`

## Global Constraints

- Local storage only; no accounts.
- A URL `page` always wins over last-read.
- Never navigate to last-read automatically.
- Bookmarks cap at 200.
- Keyboard shortcuts must not fire while typing in an input, textarea, or select.
- Respect `prefers-reduced-motion`.
- Do not commit unless explicitly asked.

---

### Task 1: Reader storage module

**Files:**
- Create: `src/lib/quran-storage.ts`
- Test: `src/lib/__tests__/quran-storage.test.ts`

**Interfaces:**
- Produces:

```ts
export type QuranTextSize = "sm" | "md" | "lg";
export type QuranArabicFont = "naskh" | "amiri";
export type QuranReaderSettings = {
  textSize: QuranTextSize;
  arabicFont: QuranArabicFont;
  showTranslation: boolean;
};
export type LastRead = {
  page: number;
  translationId: string;
  surah: number;
  verse: number;
  updatedAt: string;
};
export type QuranBookmark = {
  surah: number;
  verse: number;
  page: number;
  surahName: string;
  createdAt: string;
};

export const defaultQuranSettings: QuranReaderSettings;
export function normalizeQuranSettings(value: unknown): QuranReaderSettings;
export function readQuranSettings(): QuranReaderSettings;
export function storeQuranSettings(settings: QuranReaderSettings): void;
export function readLastRead(): LastRead | null;
export function storeLastRead(value: LastRead): void;
export function readBookmarks(): QuranBookmark[];
export function storeBookmarks(bookmarks: QuranBookmark[]): void;
export function toggleBookmark(
  bookmarks: QuranBookmark[],
  bookmark: QuranBookmark,
): QuranBookmark[];
export function isBookmarked(bookmarks: QuranBookmark[], surah: number, verse: number): boolean;
```

- [x] **Step 1: Write failing tests for the pure helpers**

```ts
import { describe, expect, it } from "vitest";
import {
  normalizeQuranSettings,
  toggleBookmark,
  isBookmarked,
  defaultQuranSettings,
  type QuranBookmark,
} from "@/lib/quran-storage";

const bookmark = (surah: number, verse: number): QuranBookmark => ({
  surah,
  verse,
  page: 1,
  surahName: "Al-Fatihah",
  createdAt: "2026-10-25T00:00:00.000Z",
});

describe("normalizeQuranSettings", () => {
  it("falls back to defaults for invalid values", () => {
    expect(normalizeQuranSettings(null)).toEqual(defaultQuranSettings);
    expect(normalizeQuranSettings({ textSize: "huge" })).toEqual(defaultQuranSettings);
  });

  it("keeps valid settings", () => {
    expect(
      normalizeQuranSettings({
        textSize: "lg",
        arabicFont: "amiri",
        showTranslation: false,
      }),
    ).toEqual({ textSize: "lg", arabicFont: "amiri", showTranslation: false });
  });
});

describe("bookmarks", () => {
  it("adds and removes a bookmark", () => {
    const added = toggleBookmark([], bookmark(2, 255));
    expect(added).toHaveLength(1);
    expect(isBookmarked(added, 2, 255)).toBe(true);
    expect(toggleBookmark(added, bookmark(2, 255))).toEqual([]);
  });

  it("keeps at most 200 bookmarks, dropping the oldest", () => {
    const list = Array.from({ length: 200 }, (_, index) => bookmark(1, index + 1));
    const next = toggleBookmark(list, bookmark(2, 1));
    expect(next).toHaveLength(200);
    expect(next[0]).toEqual(bookmark(1, 2));
    expect(next[next.length - 1]).toEqual(bookmark(2, 1));
  });
});
```

- [x] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/__tests__/quran-storage.test.ts`
Expected: FAIL because the module does not exist.

- [x] **Step 3: Implement the module**

Use keys `scholia-quran-settings`, `scholia-quran-last-read`, and `scholia-quran-bookmarks`. Guard every access with `typeof window === "undefined"` and `try/catch`. `toggleBookmark` removes a matching `surah:verse` or appends and slices the oldest entries.

- [x] **Step 4: Run tests and typecheck**

Run: `npx vitest run src/lib/__tests__/quran-storage.test.ts; npm run typecheck`
Expected: PASS.

---

### Task 2: Reading settings UI and Arabic fonts

**Files:**
- Modify: `src/routes/quran.tsx`
- Modify: `src/routes/__root.tsx` (add Amiri to the Google Fonts link)
- Modify: `src/styles.css` (add `.quran-arabic`)

- [x] **Step 1: Add the font and CSS class**

Add `&family=Amiri:wght@400;700` to the existing Google Fonts stylesheet link.

Add:

```css
.quran-arabic {
  font-family: var(--quran-font, var(--font-arabic));
}
```

- [x] **Step 2: Load settings in the reader**

Initialize settings from `readQuranSettings()` after hydration. Store on change. Add a toolbar “Aa” button that toggles a small panel with:
- Text size: S / M / L.
- Arabic font: Naskh / Amiri.
- Show translation: on/off.

- [x] **Step 3: Apply settings**

Set `--quran-font` on the reader root:

```ts
const arabicFontFamily =
  settings.arabicFont === "amiri"
    ? '"Amiri", "Noto Naskh Arabic", serif'
    : '"Noto Naskh Arabic", "Amiri", serif';
```

Replace `font-arabic` with `quran-arabic` for surah names, the basmala, ayah text, and panel Arabic. Compute text-size classes from `settings.textSize` and pass them to `PageBody` and `TafsirPanel`. Skip the translation paragraph when `showTranslation` is false.

- [x] **Step 4: Verify**

Run: `npm run typecheck; npm run lint`
Expected: no errors.

---

### Task 3: Keyboard, live announcements, focus, and tab semantics

**Files:**
- Modify: `src/routes/quran.tsx`
- Modify: `src/components/SiteNav.tsx` (aria-current)

- [x] **Step 1: Add keyboard navigation**

- `PageUp` → previous page; `PageDown` → next page.
- `g` → focus and select the page-number input.
- Ignore shortcuts when the target is an input, textarea, select, or contenteditable.
- `Escape` closes the study panel (already exists).

- [x] **Step 2: Add a polite live region**

Render a visually hidden `aria-live="polite"` element. Announce:
- “Loading page N.”
- “Page N of 604.”
- “Bookmark added.” / “Bookmark removed.”

- [x] **Step 3: Add focus management**

- Give each ayah button `data-ayah="S:A"`.
- When the study panel opens, focus its close button.
- When the panel closes, focus the last selected ayah button if present.
- On mobile, the panel is `role="dialog"`, `aria-modal="true"`, `aria-label="Study panel"`.
- Trap Tab focus inside the mobile panel while it is visible.
- Add `aria-controls` and `role="tabpanel"` for the Study tabs. Support ArrowLeft/ArrowRight between tabs.

- [x] **Step 4: Add aria-current to site nav**

In `SiteNav`, add `"aria-current": "page"` to `activeProps` for both desktop and mobile links.

- [x] **Step 5: Verify**

Run: `npm run typecheck; npm run lint; npm test`
Expected: PASS.

---

### Task 4: Last-read continue prompt

**Files:**
- Modify: `src/routes/quran.tsx`

- [x] **Step 1: Read last-read after hydration**

```ts
const [lastRead, setLastRead] = useState<LastRead | null>(null);
useEffect(() => setLastRead(readLastRead()), []);
```

- [x] **Step 2: Store the current position**

On page/result changes:

```ts
useEffect(() => {
  if (!result) return;
  const first = result.ayahs[0];
  if (!first) return;
  storeLastRead({
    page,
    translationId,
    surah: first.surah,
    verse: first.numberInSurah,
    updatedAt: new Date().toISOString(),
  });
}, [page, translationId, result]);
```

- [x] **Step 3: Show the continue prompt**

When `lastRead` exists and `lastRead.page !== page`, show a slim banner above the reader:

```
Continue at page 214   [Continue]
```

Clicking it calls `goToPage(lastRead.page)`. Never navigate automatically.

- [x] **Step 4: Verify**

Run: `npm run typecheck; npm test`
Expected: PASS.

---

### Task 5: Ayah bookmarks and verse deep links

**Files:**
- Modify: `src/routes/quran.tsx`

- [x] **Step 1: Parse and apply `verse`**

Read `verse` from the URL as `S:A` with `parseQuranReference`. After the page result loads, find the matching ayah, set `selectedAyah`, and scroll it into view with `block: "center"`.

- [x] **Step 2: Add a Bookmarks tab**

Extend the panel tab type to `"tafsir" | "asbab" | "bookmarks"`.

The bookmarks tab lists saved ayahs:
- `Surah name S:A` and page number.
- Clicking an entry calls `goToPage(page)`, sets a pending verse, and closes the mobile sheet.
- A remove button toggles the bookmark.

- [x] **Step 3: Add the bookmark toggle**

When an ayah is selected, show a bookmark button in the panel header. Use `aria-pressed` and announce the change. Store at most 200.

- [x] **Step 4: Keep the URL shareable**

Include `verse=S:A` in the URL when `selectedAyah` is set. Remove it when the selection clears or the page changes.

- [x] **Step 5: Verify**

Run: `npm test; npm run typecheck; npm run lint; npx vite build`
Expected: PASS.

---

### Task 6: Manual accessibility pass

- [ ] Tab through the toolbar, ayah list, and panel.
- [ ] `PageUp`/`PageDown` move pages.
- [ ] `g` focuses the page input.
- [ ] `Escape` closes the panel and restores focus.
- [ ] The mobile panel traps focus and is announced as a dialog.
- [ ] Live region announces page changes and bookmark actions.
- [ ] Reduced-motion preference disables smooth scrolling.
- [ ] Continue prompt appears but never navigates by itself.
- [ ] Bookmark a verse, reload, follow the bookmark, and verify the ayah is selected.
