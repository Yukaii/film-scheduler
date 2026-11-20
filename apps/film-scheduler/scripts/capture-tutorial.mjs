#!/usr/bin/env node
// Captures the onboarding tutorial screenshots from the running app.
//
//   pnpm --filter film-scheduler capture:tutorial [--festival 2026-FF] [--film 片名]
//
// SHARE_ORIGIN (e.g. the production URL) replaces the origin shown in the share
// dialog's link, so the screenshot doesn't read "localhost".
// Uses BASE_URL (default http://localhost:4000). If nothing is listening there
// it starts `next dev` itself and stops it afterwards. Festival data comes from
// GitHub `main` like the app does, so pick a festival whose films still have
// showtimes. Writes public/images/onboarding-<n>.png and onboarding-<n>-dark.png,
// each cropped tightly around the feature it shows (the tutorial card letterboxes
// them). First run on a new machine:
// `pnpm --filter film-scheduler exec playwright install chromium`.

import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(appDir, "public/images");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:4000";
const VIEWPORT = { width: 1440, height: 900 };

const args = process.argv.slice(2);
const argValue = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};

async function isUp(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

/** Starts `next dev` when BASE_URL is not already serving; returns a stop function. */
async function ensureServer() {
  if (await isUp(`${BASE_URL}/api/festivals`)) return () => {};

  const port = new URL(BASE_URL).port || "4000";
  console.log(`No server at ${BASE_URL}, starting next dev on port ${port}…`);
  const child = spawn("pnpm", ["exec", "next", "dev", "--port", port], {
    cwd: appDir,
    stdio: "ignore",
    detached: true,
  });
  const stop = () => {
    try {
      process.kill(-child.pid);
    } catch {
      // already exited
    }
  };
  for (let i = 0; i < 90; i++) {
    if (await isUp(`${BASE_URL}/api/festivals`)) return stop;
    await new Promise((r) => setTimeout(r, 1000));
  }
  stop();
  throw new Error(`next dev did not come up at ${BASE_URL} within 90s`);
}

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

/**
 * Picks two films with showtimes on the same day, the second starting 30min–4h
 * after the first ends, so step 2 can show a picked showtime next to a grey one.
 */
async function pickDemoData() {
  const { festivals } = await getJson(`${BASE_URL}/api/festivals`);
  const festivalId = argValue("festival") ?? festivals[0]?.id;
  if (!festivalId) throw new Error("No festivals available");

  const { films } = await getJson(`${BASE_URL}/api/films/${festivalId}`);
  const withShowtimes = films.filter((f) => f.duration > 0 && f.schedule?.length > 0);
  const wanted = argValue("film");
  const candidates = wanted
    ? withShowtimes.filter((f) => f.filmTitle.includes(wanted))
    : withShowtimes.filter((f) => f.schedule.length >= 2);
  const dayOf = (t) => new Date(t + 8 * 3600_000).toISOString().slice(0, 10); // Asia/Taipei

  for (const first of candidates) {
    for (const showtime of first.schedule) {
      const end = showtime.time + first.duration * 60_000;
      for (const second of withShowtimes) {
        if (second.id === first.id) continue;
        const next = second.schedule.find(
          (s) =>
            dayOf(s.time) === dayOf(showtime.time) &&
            s.time - end >= 30 * 60_000 &&
            s.time - end <= 4 * 3600_000,
        );
        if (next) return { festivalId, first, showtime, second, next };
      }
    }
  }
  throw new Error(
    `No pair of same-day showtimes${wanted ? ` for "${wanted}"` : ""} in ${festivalId}`,
  );
}

/** A clip around `box` with padding, clamped to the viewport. */
function clipAround(box, padX = 16, padY = padX) {
  const x = Math.max(0, Math.floor(box.x - padX));
  const y = Math.max(0, Math.floor(box.y - padY));
  return {
    x,
    y,
    width: Math.min(VIEWPORT.width - x, Math.ceil(box.width + padX * 2)),
    height: Math.min(VIEWPORT.height - y, Math.ceil(box.height + padY * 2)),
  };
}

const union = (a, b) => {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  };
};

/** Saves the clip in light and dark themes. */
async function capture(page, step, clip) {
  await page.mouse.move(VIEWPORT.width - 1, VIEWPORT.height - 1); // no hover states
  for (const scheme of ["light", "dark"]) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.waitForTimeout(350);
    const file = path.join(outDir, `onboarding-${step}${scheme === "dark" ? "-dark" : ""}.png`);
    await page.screenshot({ path: file, clip });
    console.log(`  ${path.relative(appDir, file)}`);
  }
  await page.emulateMedia({ colorScheme: "light" });
}

/** Clicks the film in the sidebar list (via search) so its showtimes preview on the calendar. */
async function previewFilm(page, sidebar, film) {
  const search = sidebar.getByPlaceholder(/搜尋片名/);
  await search.fill(film.filmTitle);
  await page.keyboard.press("Escape"); // close the search suggestions
  await sidebar
    .locator("#sidebar-films button[aria-expanded]")
    .filter({ hasText: film.filmTitle })
    .first()
    .click();
  await page.waitForTimeout(800); // calendar scrolls to the first showtime
}

/** Scrolls the calendar to a showtime via the film's expanded row in the sidebar. */
async function revealShowtime(page, sidebar, showtime) {
  const label = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(showtime.time)
    .replace(",", "")
    .replace("-", "/");
  await sidebar.locator("#sidebar-films li li button").filter({ hasText: label }).first().click();
  await page.waitForTimeout(800);
}

/** Clicks a grey (preview) showtime block on the calendar to add it. */
async function addShowtime(page, showtime) {
  const block = page.locator(`[id="${showtime.id}"].session-block`);
  await block.click();
  await page.waitForTimeout(500);
  return block;
}

async function main() {
  const stopServer = await ensureServer();
  const browser = await chromium.launch();
  try {
    const { festivalId, first, showtime, second, next } = await pickDemoData();
    console.log(`Festival ${festivalId}, demo films: ${first.filmTitle} / ${second.filmTitle}`);
    await mkdir(outDir, { recursive: true });

    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 2,
      locale: "zh-TW",
      timezoneId: "Asia/Taipei",
      colorScheme: "light",
    });
    // Start clean and skip the tutorial itself
    await context.addInitScript(() => {
      if (sessionStorage.getItem("capture-init")) return;
      sessionStorage.setItem("capture-init", "1");
      localStorage.clear();
      localStorage.setItem("hasViewedOnboarding", "true");
      localStorage.setItem("viewMode", JSON.stringify("week")); // step 2 shows the week grid
    });

    const page = await context.newPage();
    page.on("console", (msg) => {
      if (msg.type() === "error") console.warn(`  [page error] ${msg.text().slice(0, 200)}`);
    });
    await page.goto(`${BASE_URL}/?festival=${festivalId}`, { waitUntil: "networkidle" });
    // Hide dev-only chrome (Next dev indicator, WeekView debug panel)
    await page.addStyleTag({
      content: "nextjs-portal, [data-dev-overlay] { display: none !important; }",
    });
    const sidebar = page.locator('[data-sidebar="sidebar"]').first();
    await sidebar.locator("#sidebar-films button[aria-expanded]").first().waitFor();

    // 1. Search the film list and open a film to see its showtimes
    await previewFilm(page, sidebar, first);
    const filmTab = await page.getByRole("tab", { name: /影片/ }).boundingBox();
    const filmRow = await sidebar.locator("#sidebar-films li").first().boundingBox();
    await capture(page, 1, clipAround(union(filmTab, filmRow), 12));

    // 2. Click a grey showtime to add it: show the picked one (violet) beside a
    //    grey showtime of another film later that day
    await revealShowtime(page, sidebar, showtime);
    const picked = await addShowtime(page, showtime);
    await previewFilm(page, sidebar, second);
    await revealShowtime(page, sidebar, next);
    const grey = page.locator(`[id="${next.id}"].session-block`);
    await capture(
      page,
      2,
      clipAround(union(await picked.boundingBox(), await grey.boundingBox()), 120, 48),
    );

    // 3. Manage picks in 我的片單
    await addShowtime(page, next);
    await sidebar.getByPlaceholder(/搜尋片名/).fill("");
    await page.getByRole("tab", { name: /我的片單/ }).click();
    await page.waitForTimeout(300);
    const tabs = await page.getByRole("tablist").boundingBox();
    const schedule = await sidebar.locator("#sidebar-schedule").boundingBox();
    await capture(page, 3, clipAround(union(tabs, schedule), 12));

    // 4. Share: link or .ics download
    await page.getByRole("button", { name: /分享片單/ }).click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    if (process.env.SHARE_ORIGIN) {
      await dialog.locator("#share-url").evaluate((input, origin) => {
        input.value = input.value.replace(location.origin, origin.replace(/\/$/, ""));
      }, process.env.SHARE_ORIGIN);
    }
    await page.waitForTimeout(400);
    await capture(page, 4, clipAround(await dialog.boundingBox(), 16));

    await context.close();
    console.log("Done.");
  } finally {
    await browser.close();
    stopServer();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
