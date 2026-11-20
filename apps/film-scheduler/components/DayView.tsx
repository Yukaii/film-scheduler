import React, { useMemo, useState, useEffect } from "react";
import dayjs from "@/lib/dayjs";
import { Session } from "./types";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const startHour = 10;
const hoursInDay = 14;

// 1px per minute, like the week view
const HOUR_HEIGHT = 60;
// Height of the sticky venue-name row
const VENUE_HEADER_HEIGHT = 48;
// Some festival data has no runtime; draw those sessions as one hour
const FALLBACK_DURATION = 60;
// Narrowest a session block may get: a two-line title plus the 24px button
const MIN_BLOCK_WIDTH = 88;

export interface DayViewProps {
  currentDate: dayjs.Dayjs;
  selectedSessions: Session[];
  previewSessions: Session[];
  onFilmDetailView?: (filmId: string) => void;
}

function useNowIndicator() {
  const [now, setNow] = useState(dayjs());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(dayjs());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return { now, nowHourOffset: now.hour() - startHour };
}

type PlacedSession = { session: Session; lane: number; lanes: number };

/**
 * Splits a venue's sessions into side-by-side lanes so overlapping
 * screenings (or ones with unknown runtimes) don't cover each other.
 */
function placeSessions(sessions: Session[], durationOf: (s: Session) => number): PlacedSession[] {
  const sorted = [...sessions].sort((a, b) => a.time - b.time);
  const placed: PlacedSession[] = [];
  let cluster: PlacedSession[] = [];
  let clusterEnd = -Infinity;
  let laneEnds: number[] = [];

  const closeCluster = () => {
    for (const p of cluster) p.lanes = laneEnds.length;
    cluster = [];
    laneEnds = [];
  };

  for (const session of sorted) {
    const end = session.time + durationOf(session) * 60_000;
    if (session.time >= clusterEnd) {
      closeCluster();
      clusterEnd = -Infinity;
    }
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= session.time);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = end;
    clusterEnd = Math.max(clusterEnd, end);
    const p = { session, lane, lanes: 1 };
    cluster.push(p);
    placed.push(p);
  }
  closeCluster();
  return placed;
}

/**
 * One day: time runs down a sticky left column and every venue is a column,
 * like the week view. Narrow screens scroll sideways across venues.
 */
export function DayView({
  currentDate,
  selectedSessions,
  previewSessions,
  onFilmDetailView,
}: DayViewProps) {
  const {
    films,
    filmsMap,
    addSession,
    removeSession,
    setCurrentDate,
    isLoadingFilms,
  } = useAppContext();

  // First day with screenings on/after the viewed day, else the festival's last day
  const nearestFestivalDay = useMemo(() => {
    const days = films
      .flatMap((film) => film.schedule ?? [])
      .map((session) => dayjs(session.time).startOf("day"))
      .sort((a, b) => a.valueOf() - b.valueOf());
    if (days.length === 0) return null;
    return days.find((d) => !d.isBefore(currentDate, "day")) ?? days[days.length - 1];
  }, [films, currentDate]);
  const { now, nowHourOffset } = useNowIndicator();

  // Sessions of the viewed day, grouped by venue (venues sorted by name)
  const venues = useMemo(() => {
    const byVenue = new Map<string, Session[]>();
    for (const film of films) {
      for (const session of film.schedule ?? []) {
        if (!dayjs(session.time).isSame(currentDate, "day")) continue;
        const list = byVenue.get(session.location);
        if (list) list.push(session);
        else byVenue.set(session.location, [session]);
      }
    }
    return [...byVenue.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [films, currentDate]);

  const durationOf = (session: Session) => {
    const duration = filmsMap.get(session.filmId)?.duration ?? 0;
    return duration > 0 ? duration : FALLBACK_DURATION;
  };

  const showNowLine =
    now.isSame(currentDate, "day") && nowHourOffset >= 0 && nowHourOffset < hoursInDay;
  const gridHeight = hoursInDay * HOUR_HEIGHT;

  if (venues.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        {isLoadingFilms ? (
          <p>載入場次中…</p>
        ) : (
          <>
            <p>{currentDate.format("M 月 D 日")}沒有場次</p>
            {nearestFestivalDay && (
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(nearestFestivalDay.toDate())}>
                前往有場次的日期（{nearestFestivalDay.format("M/D")}）
              </Button>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    // Own scroll container under the h-16 calendar header, so the venue row
    // sticks to the top and the time column to the left
    <div className="h-[calc(100dvh-4rem)] w-full overflow-auto overscroll-contain [--time-w:3rem] [--venue-min:7rem] sm:[--time-w:4rem] sm:[--venue-min:9rem]">
      <div className="flex min-w-fit">
        {/* Time column */}
        <div className="sticky left-0 z-20 w-(--time-w) shrink-0 border-r bg-background">
          <div className="sticky top-0 z-10 border-b bg-background" style={{ height: VENUE_HEADER_HEIGHT }} />
          <div className="relative" style={{ height: gridHeight }}>
            {Array.from({ length: hoursInDay }, (_, hour) => (
              <span
                key={hour}
                className="absolute right-1.5 -translate-y-1/2 text-[10px] text-muted-foreground tabular-nums first:translate-y-0 sm:text-xs"
                style={{ top: hour * HOUR_HEIGHT }}
              >
                {dayjs().hour(startHour + hour).format("h A")}
              </span>
            ))}
          </div>
        </div>

        {/* Venue columns */}
        <div className="relative flex flex-1">
          {showNowLine && (
            <div
              className="pointer-events-none absolute inset-x-0 z-[15] h-px bg-red-500"
              style={{ top: VENUE_HEADER_HEIGHT + nowHourOffset * HOUR_HEIGHT + now.minute() }}
            >
              <span className="absolute left-1 -translate-y-1/2 rounded bg-red-500 px-1 text-xs text-white tabular-nums">
                {now.format("HH:mm")}
              </span>
            </div>
          )}

          {venues.map(([venue, sessions]) => {
            const placed = placeSessions(sessions, durationOf);
            const maxLanes = Math.max(1, ...placed.map((p) => p.lanes));

            return (
            <div
              key={venue}
              className="flex-1 border-r last:border-r-0"
              // Widen venues with side-by-side screenings so every block keeps
              // room for its title next to the +/✓ button
              style={{ minWidth: `max(var(--venue-min), ${maxLanes * MIN_BLOCK_WIDTH}px)` }}
            >
              <div
                className="sticky top-0 z-10 flex items-center justify-center border-b bg-background px-1.5 text-center"
                style={{ height: VENUE_HEADER_HEIGHT }}
                title={venue}
              >
                <span className="line-clamp-2 text-xs leading-tight font-medium">{venue}</span>
              </div>

              <div className="relative" style={{ height: gridHeight }}>
                {Array.from({ length: hoursInDay }, (_, hour) => (
                  <div
                    key={hour}
                    className="absolute inset-x-0 border-t border-border/60"
                    style={{ top: hour * HOUR_HEIGHT }}
                  />
                ))}

                {placed.map(({ session, lane, lanes }) => {
                  const film = filmsMap.get(session.filmId);
                  if (!film) return null;

                  const startTime = dayjs(session.time);
                  const top = (startTime.hour() - startHour) * HOUR_HEIGHT + startTime.minute();
                  const height = Math.max(durationOf(session), 36);
                  const isSelected = selectedSessions.some((s) => s.id === session.id);
                  const isPreview = previewSessions.some((s) => s.id === session.id);

                  const toggleSession = () => {
                    if (isSelected) removeSession(session);
                    else addSession(session);
                  };

                  return (
                    <div
                      key={session.id}
                      // id lets highlightSession flash this block after a jump from the film panel
                      id={session.id}
                      className={cn(
                        "session-block absolute z-10 cursor-pointer overflow-hidden rounded border transition-[background-color,box-shadow] duration-200 hover:z-[11] hover:shadow-md",
                        isSelected
                          ? "border-violet-600 bg-violet-500 text-white hover:bg-violet-600 dark:border-violet-700 dark:bg-violet-900 dark:hover:bg-violet-800"
                          : isPreview
                            ? "border-blue-400 bg-blue-50 text-blue-950 hover:bg-blue-100 dark:border-blue-500 dark:bg-blue-950/70 dark:text-blue-50 dark:hover:bg-blue-900/70"
                            : "border-border bg-card text-card-foreground hover:bg-muted",
                      )}
                      style={{
                        top,
                        height,
                        left: `calc(${(lane / lanes) * 100}% + 2px)`,
                        width: `calc(${100 / lanes}% - 4px)`,
                      }}
                      // Click opens the film details; the +/✓ button (or right-click) toggles the session
                      onClick={() => {
                        if (onFilmDetailView) onFilmDetailView(session.filmId);
                        else toggleSession();
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        toggleSession();
                      }}
                      title={`${film.filmTitle} • ${startTime.format("HH:mm")}${film.duration > 0 ? ` - ${startTime.add(film.duration, "minute").format("HH:mm")}` : ""}`}
                    >
                      <div className="h-full overflow-hidden px-1.5 py-1 pr-7">
                        <div className="line-clamp-2 text-xs leading-tight font-semibold">{film.filmTitle}</div>
                        <div className="mt-0.5 truncate text-[11px] opacity-75 tabular-nums">
                          {startTime.format("HH:mm")}
                          {film.duration > 0 && ` · ${film.duration} 分`}
                        </div>
                      </div>

                      <button
                        type="button"
                        aria-pressed={isSelected}
                        aria-label={isSelected ? `從片單移除 ${film.filmTitle}` : `加入片單 ${film.filmTitle}`}
                        title={isSelected ? "從片單移除" : "加入片單"}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSession();
                        }}
                        className={cn(
                          "absolute top-1 right-1 flex size-6 items-center justify-center rounded-full transition-colors",
                          isSelected
                            ? "bg-white/25 text-white hover:bg-white/40"
                            : "bg-primary text-primary-foreground hover:bg-primary/85",
                        )}
                      >
                        {isSelected ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
