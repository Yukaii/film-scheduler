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
- **Scraped JSON on `main` is the production data.** GitHub fetches revalidate hourly
  (`DATA_REVALIDATE_SECONDS` in `lib/githubDataFetcher.ts`, which also bounds its in-memory
  cache). `/` and `/api/festivals` are prerendered with `revalidate = 3600`; the festival list
  comes from `getFestivals()` in `lib/festivals.ts` on the server. New data on `main` appears
  within an hour, or immediately after a redeploy. Keep these explicit: Next 15+ does not cache
  by default, and without them every request hits GitHub. `revalidate` must stay a literal number.
- Local `pnpm dev` also reads from GitHub `main`, not from your working tree. Local data edits
  will not show up until they are pushed.
- Festival IDs are `<YEAR>-<CATEGORY>` (e.g. `2025-FFF`, `2025-TAIPEIFF`). An ID containing
  `-TAIPEIFF` routes to the taipeiff package path; everything else goes to golden-horse.

### Adding a festival

1. Configure and run the scraper **while the festival is running or about to start**. Both sites
   remove showtimes once a festival ends, and a scrape after that has films but no schedule.
   - Golden Horse: add `{ year, parentId, category }` to `FESTIVALS` in `src/main.ts`. Get
     `parentId` from the `parent_list` that `get_class_list` returns for that year and
     category. Run it with `NODE_ENV=production node dist/main.js 2026-FF`. Without
     `NODE_ENV=production` it fetches only 10 films.
   - TaipeiFF: add the edition's dates to `FESTIVAL_DATES` in `src/main.ts` (from
     taipeiff.taipei/tw/movies/schedule), then run `NODE_ENV=production node dist/main.js 2026`.
   Both write to `dist/data/<ID>/`. Copy that folder into `src/data/`, which is what the app
   fetches, **before rebuilding**: the TaipeiFF build wipes `dist/`. Sanity-check that most
   films have a non-empty `schedule`.
2. Add the ID to `FESTIVALS` in `apps/film-scheduler/lib/config.ts`. Both API routes read it,
   and `/api/films/[id]` returns 404 for IDs not in the list.
3. If it is a new category, add it to `CATEGORIES` in the same file.

## Commands

Run everything from the repo root. Package manager is **pnpm** (version pinned via `packageManager`).

```bash
pnpm install
pnpm dev          # Next dev server on http://localhost:4000
pnpm build        # builds the web app only (what Vercel runs)
pnpm build:all    # also builds the scraper packages
pnpm lint         # oxlint (warnings fail)
pnpm typecheck    # tsc --noEmit for the app
```

Single package: `pnpm --filter film-scheduler <script>` or
`pnpm --filter @film-scheduler/film-source-golden-horse <script>`.

There is no automated test suite. Verify changes with `pnpm lint && pnpm typecheck && pnpm build`,
and for UI changes run `pnpm dev` and check in a browser (both light and dark themes).
`pnpm typecheck` runs `next typegen` first, which generates the global `RouteContext<'/route'>`
and `PageProps` types used in route handlers.

Stack: Next.js 16 (Turbopack, App Router), React 19, TypeScript 6, oxlint
(`apps/film-scheduler/.oxlintrc.json`), Tailwind CSS 4 with shadcn/ui, react-day-picker 10. Next 15+ rules apply: route `params` and
`searchParams` are Promises and must be `await`ed. `next build` does not lint.

## Code conventions (app)

- TypeScript strict mode. Import local modules through the `@/` alias (maps to `apps/film-scheduler/`).
- `components/ui/*` are shadcn/ui primitives (config in `components.json`). Prefer composing them
  over editing them; if you regenerate one, keep the local tweaks.
- Feature components are PascalCase files in `components/` and use default exports. Shared
  domain types live in `components/types.ts` and `lib/types.ts`.
- Global client state lives in `contexts/AppContext.tsx`. Hooks go in `hooks/`, pure helpers in `lib/`.
- Styling is Tailwind v4, configured CSS-first in `app/globals.css`: there is no
  `tailwind.config.*`. Theme tokens are declared in `@theme`, and animations come from
  `tw-animate-css`. Use v4 class names (`shadow-xs`, `rounded-sm`, `outline-hidden`) and v4
  variant order, which applies left to right (`hover:group-data-[x]/name:`). Merge classes with
  `cn()` from `@/lib/utils`.
- React Compiler lint rules (oxlint `react/set-state-in-effect`, `purity`, `immutability`, `refs`) are
  errors. Derive values during render. Read browser APIs (matchMedia, localStorage, navigator)
  with `useSyncExternalStore`. Use the "adjust state during render" pattern instead of syncing
  state in effects.
- Festival data has one owner: the SWR fetch in `components/Main.tsx`. Components read
  `films`/`filmsMap`/`sections` from `AppContext` and change festival with `setCurrentFestivalId`.
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
- Linting is oxlint only; there is no ESLint. `.oxlintrc.json` is JSONC and was migrated from
  `eslint-config-next` (core-web-vitals + typescript), with oxlint's `correctness` category on.
  Several jsx-a11y rules are switched off there as an accessibility backlog. Re-enable them as you
  fix components. Suppress a rule with `// oxlint-disable-next-line <rule>`.
- Layout shares a 64px (`h-16`) top row: the sidebar brand row (`AppSidebar`), the calendar
  header (`CalendarView`) and the film detail panel header (`FilmSidebar`). Their bottom borders
  form one line, and `WeekView` sizes itself as `calc(100dvh - 4rem)`. Change all four together.
  Brand identity lives in `components/BrandMark.tsx`.
- Desktop panel widths are user-resizable (`components/ResizeHandle.tsx`) and persisted in
  localStorage. Sizes live in `lib/panelSizes.ts`. `Main` exposes them as `--sidebar-width` and
  `--film-panel-width`, so style panels with those variables, not fixed `w-*` classes. Below `md`
  the film panel is a draggable bottom sheet. Below `sm` the week view shows 3 days
  (`hooks/useVisibleDays.ts`) and handles touch pans itself.
- `components/ui/calendar.tsx` styles day state through `data-*` attributes on the `<td>`
  (`group/day`). react-day-picker puts modifier attributes on the cell, not on the button.
- pnpm 11 only runs dependency install scripts listed under `allowBuilds` in
  `pnpm-workspace.yaml`.
- Do not reintroduce per-package `pnpm-lock.yaml` files. The root lockfile is the only one.
