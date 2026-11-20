# AGENTS.md

Guidance for AI coding agents (Claude Code, Codex, OpenCode, Copilot…) working in this repo.

## What this is

A film-festival schedule planner (Golden Horse 金馬 / Taipei Film Festival 台北電影節). Users browse
films, pick sessions, see them on a calendar, and export `.ics`. UI copy is Traditional Chinese.

pnpm monorepo:

| Path | What | Notes |
|---|---|---|
| `apps/film-scheduler` | Next.js App Router web app (deployed on Vercel) | The only thing that ships |
| `packages/film-source-golden-horse` | CLI scraper for goldenhorse.org.tw → JSON | Not imported by the app |
| `packages/film-source-taipeiff` | CLI scraper for Taipei Film Festival → JSON | Not imported by the app |
| `packages/film-source-test`, `film-source-taipeiff-test` | Ad-hoc smoke scripts that print scraped data | No assertions; not a test suite |

## Data flow (read this before touching data or APIs)

The app does **not** import the scraper packages. At request time the API routes fetch JSON from
GitHub raw URLs on the `main` branch:

```
raw.githubusercontent.com/Yukaii/film-scheduler/main/packages/<source>/src/data/<FESTIVAL_ID>/*.json
  → apps/film-scheduler/lib/githubDataFetcher.ts  (in-memory cache, FALLBACK_COMMIT env as fallback ref)
  → app/api/festivals/route.ts, app/api/films/[festivalId]/route.ts
  → client (SWR) in components/Main.tsx, components/AppSidebar.tsx
```

Consequences:
- **Scraped JSON on `main` is the production data.** Fetches use `cache: "force-cache"`, and
  `/api/festivals` is prerendered at build time (`dynamic = 'force-static'`). After merging new
  data, redeploy on Vercel (or purge the data cache) to pick it up. These caching flags are
  explicit because Next 15+ no longer caches by default. Do not remove them unless you want
  every request to hit GitHub.
- Local `pnpm dev` also reads from GitHub `main`, not from your working tree. Local data edits
  will not show up until they are pushed.
- Festival IDs are `<YEAR>-<CATEGORY>` (e.g. `2025-FFF`, `2025-TAIPEIFF`). An ID containing
  `-TAIPEIFF` routes to the taipeiff package path; everything else goes to golden-horse.

### Adding a festival

1. Add it to `FESTIVALS` in the relevant scraper's `src/main.ts`, then build and run:
   `pnpm --filter @film-scheduler/film-source-golden-horse build && pnpm --filter @film-scheduler/film-source-golden-horse start`.
   The scraper writes to `dist/data/`. Copy the new festival folder into `src/data/`, because
   that is the path the app fetches.
2. Add the ID to the `FESTIVALS` list in `apps/film-scheduler/app/api/festivals/route.ts`.
3. If it is a new category, add it to `CATEGORIES` in `apps/film-scheduler/lib/config.ts`.

## Commands

Run everything from the repo root. Package manager is **pnpm** (version pinned via `packageManager`).

```bash
pnpm install
pnpm dev          # Next dev server on http://localhost:4000
pnpm build        # builds the web app only (what Vercel runs)
pnpm build:all    # also builds the scraper packages
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit for the app
```

Single package: `pnpm --filter film-scheduler <script>` or
`pnpm --filter @film-scheduler/film-source-golden-horse <script>`.

There is no automated test suite. Verify changes with `pnpm lint && pnpm typecheck && pnpm build`,
and for UI changes run `pnpm dev` and check in a browser (both light and dark themes).
`pnpm typecheck` runs `next typegen` first, which generates the global `RouteContext<'/route'>`
and `PageProps` types used in route handlers.

Stack: Next.js 16 (Turbopack, App Router), React 19, TypeScript 6, ESLint 9 flat config
(`eslint.config.mjs`), Tailwind CSS 3 with shadcn/ui. Next 15+ rules apply: route `params` and
`searchParams` are Promises and must be `await`ed. `next build` no longer runs ESLint.

## Code conventions (app)

- TypeScript strict mode. Import local modules through the `@/` alias (maps to `apps/film-scheduler/`).
- `components/ui/*` are shadcn/ui primitives (config in `components.json`). Prefer composing them
  over editing them; if you regenerate one, keep the local tweaks.
- Feature components are PascalCase files in `components/` and use default exports. Shared
  domain types live in `components/types.ts` and `lib/types.ts`.
- Global client state lives in `contexts/AppContext.tsx`. Hooks go in `hooks/`, pure helpers in `lib/`.
- Styling is Tailwind with CSS-variable theme tokens (`app/globals.css`, `tailwind.config.ts`).
  Merge classes with `cn()` from `@/lib/utils`.
- Use dayjs for dates, through `@/lib/dayjs` (plugins preconfigured). Session times are stored as
  epoch ms in Asia/Taipei (`+8`).
- The search mini-language (`AND`/`OR`/`NOT`, prefixes) is parsed in `lib/searchParser.ts`.
  `components/SearchInput.tsx` handles its suggestion UX. Keep the two in sync.
- Prefer try/catch with a descriptive `console.error` in API routes and return JSON errors with a
  proper status code.

## Scraper packages

- ESM, Node ≥ 20. Built by `build.mjs` (`tsc` for `.d.ts` files, then esbuild bundle, then copy of
  `src/data` → `dist/data`).
- `src/data/**` JSON is committed and is the production data source (see above). Keep diffs
  reviewable: do not reformat or reorder these files unnecessarily.

## Gotchas

- `.env.local` (`FALLBACK_COMMIT`) is local-only and must never be committed.
- CI (`.github/workflows/build.yml`) runs install → lint → app build (includes type check) →
  scraper package builds on Node 22, caching both the pnpm store and `.next/cache`.
- The `react-hooks/set-state-in-effect`, `immutability` and `purity` lint rules are set to `warn`
  in `eslint.config.mjs` because existing code violates them. Do not add new violations. When you
  touch a flagged component, fix its warning.
- Pinned on purpose: `tailwindcss@3` + `tailwind-merge@2` (v3 needs Tailwind 4) and
  `react-day-picker@8` (`components/ui/calendar.tsx` targets the v8 API). Upgrade each as its own
  change, with visual review.
- pnpm 11 only runs dependency install scripts listed under `allowBuilds` in
  `pnpm-workspace.yaml`.
- Do not reintroduce per-package `pnpm-lock.yaml` files. The root lockfile is the only one.
