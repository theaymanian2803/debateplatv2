# Docket

A case file for contested claims. Read the source, read the commentary, compare the rebuttals, and see what the citations actually support. Docket brings comparative religion and philosophy into one cited record, with a public docket for readers and a Registry for editors.

## Routes

- `/` — marketing landing page with the case-file preview, featured docket, citation ledger, libraries, pricing, FAQ, and access request.
- `/cases` — the public case workspace. `/read` remains as an alias.
- `/case/$id` — the canonical shareable permalink for a single case.
- `/quran` — the Quran library (Madani mushaf, translations, tafsir, bookmarks).
- `/admin` — the password-protected editorial desk.
- `/admin/database` — configure the Turso database connection.
- `/admin/waitlist` — access requests.

## Case tools

- Press **Ctrl/Cmd+K** anywhere in the case workspace to search cases, citations, and actions.
- **Share & cite** gives you a stable `/case/:id` link, Chicago / APA / MLA / BibTeX
  citations, and a downloadable JSON snapshot of the current case.
- **Print / Save PDF** uses the browser print dialog to produce a complete case file
  with the claim, commentary, rebuttals, citations, and source attributions.

## Vocabulary

The interface uses cases, commentary, rebuttals, sources, and statuses (verified, disputed, unverified). The underlying data model is unchanged.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Source lookup

The editorial desk (`/admin/entries`) can fetch a passage, commentary, or hadith into a case instead of pasting it by hand. Choose a mode, type a reference, press **Fetch**, then apply it.

| Mode       | Source                    | Reference examples                     | Key             |
| ---------- | ------------------------- | -------------------------------------- | --------------- |
| Verse      | Free Use Bible API        | `John 17:3`, `1 Cor 13:4-7`            | none            |
| Verse      | API.Bible (licensed)      | same Bible references                  | `BIBLE_API_KEY` |
| Verse      | Sefaria                   | `Genesis 1:1`, `Berakhot 2a`           | none            |
| Verse      | AlQuran Cloud             | `17:3`, `2:255-257`                    | none            |
| Commentary | Free Use Bible commentary | `Genesis 1:1`, `John 3:16`             | none            |
| Commentary | Quran.com tafsir          | `17:3`, `2:255`                        | none            |
| Commentary | Sefaria commentary        | `Rashi on Genesis 1:1`                 | none            |
| Hadith     | Hadith API                | `Bukhari 1`, `Bukhari 2:1`, `Muslim 1` | none            |

Fetched passages are stored as a snapshot with their translation, reference,
attribution, and licence note, so citations stay stable. Commentary is added as
cited commentary on the case. Arabic and Hebrew are displayed
right-to-left with Arabic-capable type.

## Database configuration

The Editorial desk’s **Database** page can connect a Turso database at runtime:

- The URL and token are validated with a live connection and a schema migration.
- The token is encrypted with AES-256-GCM and stored in an **HttpOnly,
  SameSite=Strict** cookie (`docket_db_config`). It is never written to
  `localStorage` and never returned to the form.
- Saving clears the React Query cache and session-specific localStorage keys,
  resets the server’s Turso client cache, and reloads the app.
- Removing the browser configuration deletes the cookie and falls back to
  `TURSO_URL` / `TURSO_AUTH_TOKEN` from the deployment environment.
- The encryption key is derived from `ADMIN_PASSWORD`. Rotating that password
  invalidates any stored browser configuration, so reconfigure after a rotation.

## Demo mode

Set `DEMO_MODE=1` (also accepts `true`, `yes`, or `on`) to show a slim
"Demo data" banner above the site navigation. The banner links to `/welcome`,
a short guide covering cases, the Quran library, the Editorial desk, and
connecting a Turso database.

Leave `DEMO_MODE` unset on a deployment that uses its own database. The flag is
read at request time (`.dev.vars`, `process.env`, or the Cloudflare env) and
only the boolean is exposed to the browser.

## Deployment

Deploys to Vercel. Pushing to `main` triggers a production deployment.

1. Push the repository to GitHub (`main` branch).
2. Import the repository at [vercel.com/new](https://vercel.com/new). Vercel
   detects TanStack Start and Nitro automatically (`vercel.json` in this repo
   pins the build command and output directory, so no dashboard build settings
   are required).
3. Add the required environment variables (Project Settings → Environment
   Variables) — set them for Production, Preview, and Development:

   | Variable                          | Required | Purpose                                                                                                                                                    |
   | --------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `TURSO_URL`                       | no       | Turso database URL (`libsql://…`). Required unless configured from Editorial desk → Database.                                                              |
   | `TURSO_AUTH_TOKEN`                | no       | Turso auth token. Required unless configured from Editorial desk → Database.                                                                               |
   | `ADMIN_PASSWORD`                  | yes      | Password for the editorial desk at `/admin`; without it the editorial area shows "not configured" and all editorial mutations are blocked                  |
   | `AI_VERIFY_URL` / `AI_VERIFY_KEY` | no       | Enables the AI-assisted source suggestion in the citation ledger                                                                                           |
   | `BIBLE_API_KEY`                   | no       | Adds licensed translations from API.Bible to the editorial desk scripture lookup. Public-domain translations work without a key via the Free Use Bible API |
   | `DEMO_MODE`                       | no       | Set to `1` to show the demo-data banner and link to the `/welcome` guide                                                                                   |

4. Deploy. Every push to `main` ships a new version.

### Deploying from the CLI (alternative)

With the Vercel CLI (`npm i -g vercel`), from the repo root:

```sh
vercel login
vercel link        # links the repo to a Vercel project (creates .vercel/)
vercel env add TURSO_URL
vercel env add TURSO_AUTH_TOKEN
vercel env add ADMIN_PASSWORD
vercel --prod      # builds and deploys .vercel/output
```

Note: `.vercel/` is gitignored, so the CLI link stays local to this machine.
